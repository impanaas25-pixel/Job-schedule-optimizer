import {
  useState, useRef, useEffect, useCallback,
  useContext, createContext, FormEvent,
} from "react";
import {
  motion, AnimatePresence,
  useMotionValue, useTransform, useSpring, useInView, animate,
} from "framer-motion";
import {
  X, Check, Play, ArrowDown, Zap, BarChart2,
  Clock, Trophy, ChevronRight, Layers, Info,
  Sliders, HelpCircle, LogOut, Save,
} from "lucide-react";
import { projectsApi, scheduleApi, ApiError } from "@/lib/api";
import HistoryModal from "@/components/HistoryModal";

// ═══════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════
type Item = { id: string; name: string; weight: number; value: number };
type AcceptedItem = Item & { fraction: number; takenWeight: number; takenValue: number; scheduledDay?: number };
type DecisionStep = {
  item: Item;
  remainingCapacityBefore: number;
  decision: "pack" | "slice" | "skip" | "ignore";
  takenWeight: number;
  takenValue: number;
  remainingCapacityAfter: number;
};
type KnapsackResult = {
  accepted: AcceptedItem[];
  rejected: Item[];
  totalValue: number;
  totalWeight: number;
  decisionLog: DecisionStep[];
};
type Toast  = { id: string; title: string; sub?: string };
type Spark  = { id: string; x: number; y: number; angle: number; dist: number; color: string };

// ═══════════════════════════════════════════════════════════
//  ALGORITHMS
// ═══════════════════════════════════════════════════════════
function runFractional(items: Item[], capacity: number): KnapsackResult {
  // Sort projects by contract value (value) descending
  const sorted = [...items].sort((a, b) => b.value - a.value);
  if (!sorted.length) return { accepted: [], rejected: [], totalValue: 0, totalWeight: 0, decisionLog: [] };

  const accepted: AcceptedItem[] = [];
  const rejected: Item[] = [];
  const decisionLog: DecisionStep[] = [];
  
  // Slots: index 1 to capacity (1-indexed for days)
  const slots = new Array(capacity + 1).fill(null);
  let totalValue = 0;
  let totalWeight = 0;

  for (const item of sorted) {
    let scheduledDay = -1;
    // Greedy Latest Slot Strategy: search from min(capacity, deadline) down to 1
    const startSlot = Math.min(capacity, item.weight);
    for (let day = startSlot; day >= 1; day--) {
      if (slots[day] === null) {
        slots[day] = item;
        scheduledDay = day;
        break;
      }
    }

    if (scheduledDay !== -1) {
      accepted.push({
        ...item,
        fraction: 1.0,
        takenWeight: 1, // each job takes exactly 1 slot/day
        takenValue: item.value,
      });
      totalValue += item.value;
      totalWeight += 1;
      
      decisionLog.push({
        item,
        remainingCapacityBefore: slots.filter(s => s === null).length + 1,
        decision: "pack",
        takenWeight: 1,
        takenValue: item.value,
        remainingCapacityAfter: slots.filter(s => s === null).length,
      });
    } else {
      rejected.push(item);
      decisionLog.push({
        item,
        remainingCapacityBefore: slots.filter(s => s === null).length,
        decision: "skip",
        takenWeight: 0,
        takenValue: 0,
        remainingCapacityAfter: slots.filter(s => s === null).length,
      });
    }
  }

  // Attach the scheduled day to the accepted item
  const acceptedWithDay = accepted.map(acc => {
    const day = slots.indexOf(slots.find(s => s && s.id === acc.id));
    return { ...acc, scheduledDay: day };
  });

  return { accepted: acceptedWithDay as any, rejected, totalValue, totalWeight, decisionLog };
}

function runGreedyZeroOne(items: Item[], capacity: number): KnapsackResult {
  return runFractional(items, capacity);
}

// ═══════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════

const SECTIONS = ["hero", "algorithm", "optimizer"];
const TC_COLORS = [
  [192, 87,  70 ],  // terracotta
  [196,152,110 ],  // copper
  [218,168,110 ],  // amber
  [240,210,168 ],  // cream
  [172,110, 82 ],  // sienna
  [210,140, 90 ],  // burnt gold
] as const;

const uid   = () => Math.random().toString(36).slice(2, 10);
const fmt   = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const rand  = (min: number, max: number) => Math.random() * (max - min) + min;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

// ═══════════════════════════════════════════════════════════
//  SPARKLE CONTEXT
// ═══════════════════════════════════════════════════════════
const SparkCtx = createContext<(x: number, y: number, count?: number) => void>(() => {});

// ═══════════════════════════════════════════════════════════
//  PARTICLE CANVAS
// ═══════════════════════════════════════════════════════════
function ParticleCanvas() {
  const ref    = useRef<HTMLCanvasElement>(null);
  const mouse  = useRef({ x: -500, y: -500 });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0;
    const resize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouse = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", onMouse);

    type P = {
      x: number; y: number; vx: number; vy: number;
      size: number; col: readonly [number,number,number];
      op: number; opDir: number; maxOp: number;
      phase: number; kind: "mote"|"sparkle"|"bloom";
      spin: number;
    };

    const mkParticle = (spreadY = false): P => {
      const col = TC_COLORS[Math.floor(Math.random() * TC_COLORS.length)];
      const r   = Math.random();
      return {
        x:    Math.random() * W,
        y:    spreadY ? Math.random() * H : H + rand(10, 60),
        vx:   rand(-0.25, 0.25),
        vy:   -rand(0.12, 0.55),
        size: rand(0.8, 3.6),
        col,
        op:    0,
        opDir: rand(0.003, 0.008),
        maxOp: rand(0.06, 0.42),
        phase: rand(0, Math.PI * 2),
        kind:  r < 0.08 ? "bloom" : r < 0.28 ? "sparkle" : "mote",
        spin:  rand(-0.04, 0.04),
      };
    };

    const particles: P[] = Array.from({ length: 110 }, () => mkParticle(true));
    let frame = 0, raf = 0;

    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      frame++;
      const mx = mouse.current.x, my = mouse.current.y;

      for (const p of particles) {
        p.x += p.vx + Math.sin(frame * 0.009 + p.phase) * 0.18;
        p.y += p.vy;
        p.phase += 0.004;

        const dx = mx - p.x, dy = my - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14400) {
          const d = Math.sqrt(d2);
          p.x += (dx / d) * 0.55 * (1 - d / 120);
          p.y += (dy / d) * 0.55 * (1 - d / 120);
        }

        p.op += p.opDir;
        if (p.op > p.maxOp) { p.op = p.maxOp; p.opDir *= -1; }
        else if (p.op < 0)  { p.op = 0; p.opDir *= -1; }

        if (p.y < -30) Object.assign(p, mkParticle(false));

        const [r, g, b] = p.col;
        ctx.save();
        if (p.kind === "bloom") {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 12);
          grad.addColorStop(0, `rgba(${r},${g},${b},${p.op})`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 12, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "sparkle") {
          ctx.translate(p.x, p.y);
          ctx.rotate(frame * p.spin + p.phase);
          ctx.fillStyle = `rgba(${r},${g},${b},${p.op})`;
          const s = p.size * 2.2;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const a1 = (i * Math.PI) / 2, a2 = a1 + Math.PI / 4;
            ctx.lineTo(Math.cos(a1) * s * 2.4, Math.sin(a1) * s * 2.4);
            ctx.lineTo(Math.cos(a2) * s * 0.7, Math.sin(a2) * s * 0.7);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(${r},${g},${b},${p.op})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return <canvas id="particle-canvas" ref={ref} />;
}

// ═══════════════════════════════════════════════════════════
//  MOUSE BLOOM
// ═══════════════════════════════════════════════════════════
// ambient soft light trailing the cursor
function MouseBloom() {
  const bx = useSpring(0, { stiffness: 80, damping: 22 });
  const by = useSpring(0, { stiffness: 80, damping: 22 });
  useEffect(() => {
    const fn = (e: MouseEvent) => { bx.set(e.clientX); by.set(e.clientY); };
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, []);
  return <motion.div id="mouse-bloom" style={{ x: bx, y: by }} />;
}

// ═══════════════════════════════════════════════════════════
//  SPARKLE BURST
// ═══════════════════════════════════════════════════════════
// clicks trigger an burst of colored particles
function SparkleBurst({ sparks, onDone }: { sparks: Spark[]; onDone: (id: string) => void }) {
  return (
    <>
      {sparks.map(s => (
        <div key={s.id} className="spark"
          style={{
            left: s.x, top: s.y,
            background: s.color,
            "--tx": `${Math.cos(s.angle) * s.dist}px`,
            "--ty": `${Math.sin(s.angle) * s.dist}px`,
          } as React.CSSProperties}
          onAnimationEnd={() => onDone(s.id)}
        />
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
//  CUSTOM CURSOR
// ═══════════════════════════════════════════════════════════
function Cursor() {
  const dx = useMotionValue(0), dy = useMotionValue(0);
  const rx  = useSpring(0, { stiffness: 160, damping: 20 });
  const ry  = useSpring(0, { stiffness: 160, damping: 20 });
  useEffect(() => {
    const mv = (e: MouseEvent) => { dx.set(e.clientX); dy.set(e.clientY); rx.set(e.clientX); ry.set(e.clientY); };
    const hv = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      document.body.classList.toggle("cur-hover", !!t.closest("button,a,[role=button],input,label,input[type=range]"));
    };
    const dn = () => document.body.classList.add("cur-click");
    const up = () => document.body.classList.remove("cur-click");
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseover", hv);
    window.addEventListener("mousedown", dn);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mouseover", hv);
      window.removeEventListener("mousedown", dn);
      window.removeEventListener("mouseup", up);
    };
  }, []);
  return (
    <>
      <motion.div id="cursor-dot"  style={{ x: dx, y: dy }} />
      <motion.div id="cursor-ring" style={{ x: rx, y: ry }} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════
//  ENTRY VEIL
// ═══════════════════════════════════════════════════════════
function EntryVeil() {
  return (
    <motion.div id="entry-veil"
      initial={{ scaleY: 1 }}
      animate={{ scaleY: 0 }}
      transition={{ duration: 1.15, delay: 0.2, ease: [0.76, 0, 0.24, 1] }}
    />
  );
}

// ═══════════════════════════════════════════════════════════
//  SIDE NAV
// ═══════════════════════════════════════════════════════════
function SideNav({ active }: { active: string }) {
  const labels: Record<string, string> = {
    "hero": "Home",
    "algorithm": "Algorithms", "optimizer": "Live Optimizer"
  };
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return (
    <div className="fixed right-7 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3.5 items-center">
      {SECTIONS.map(s => (
        <button key={s} title={labels[s]} onClick={() => scrollTo(s)}
          className="group relative w-2.5 h-2.5 rounded-full transition-all duration-300 focus:outline-none"
          style={{
            background: active === s ? "hsl(8 51% 51%)" : "hsl(38 18% 72%)",
            transform: active === s ? "scale(1.7)" : "scale(1)",
            boxShadow: active === s ? "0 0 8px hsl(8 51% 51% / 0.5)" : "none",
          }}
          data-testid={`nav-dot-${s}`}>
          <span className="absolute right-5 top-1/2 -translate-y-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 font-sans text-[10px] font-semibold tracking-widest uppercase transition-opacity duration-200 pr-1"
            style={{ color: "hsl(60 4% 44%)" }}>{labels[s]}</span>
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MARQUEE
// ═══════════════════════════════════════════════════════════
function Marquee({ reverse = false }: { reverse?: boolean }) {
  const items = [
    "Knapsack Suite", "Fractional Greedy", "0/1 Greedy Heuristic", "₹ Value Density",
    "Greedy Trace Log", "Dynamic Weights", "Value-to-Weight Ratio", "Resource Capacity",
  ];
  const doubled = [...items, ...items];
  return (
    <div className="marquee-wrap py-4 overflow-hidden"
      style={{ borderTop: "1px solid hsl(38 22% 87%)", borderBottom: "1px solid hsl(38 22% 87%)", background: "hsl(30 22% 97%)" }}>
      <div className={`marquee-track${reverse ? " marquee-track-r" : ""}`}>
        {[...doubled, ...doubled].map((item, i) => (
          <span key={i} className="flex items-center gap-5 px-6">
            <span className="font-sans text-xs font-semibold tracking-[0.18em] uppercase whitespace-nowrap"
              style={{ color: "hsl(60 4% 52%)" }}>{item}</span>
            <span style={{ color: "hsl(8 51% 58%)", fontSize: 9 }}>◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAGNETIC BUTTON
// ═══════════════════════════════════════════════════════════
function MagneticButton({
  children, className, style, onClick, disabled, "data-testid": dtid, type, tabIndex,
}: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void; disabled?: boolean;
  "data-testid"?: string; type?: "button" | "submit"; tabIndex?: number;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const mx  = useMotionValue(0), my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 220, damping: 18 });
  const smy = useSpring(my, { stiffness: 220, damping: 18 });

  const onMove = (e: React.MouseEvent) => {
    if (!ref.current || disabled) return;
    const r  = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    mx.set((e.clientX - cx) * 0.28);
    my.set((e.clientY - cy) * 0.28);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.button
      ref={ref}
      style={{ x: smx, y: smy, ...style }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileTap={{ scale: 0.965, transition: { duration: 0.08 } }}
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid={dtid}
      type={type}
      tabIndex={tabIndex}
    >
      {children}
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════
//  TILT CARD
// ═══════════════════════════════════════════════════════════
function TiltCard({
  children, className, style, shimmer,
}: {
  children: React.ReactNode; className?: string;
  style?: React.CSSProperties; shimmer?: boolean;
}) {
  const ref   = useRef<HTMLDivElement>(null);
  const mx    = useMotionValue(0), my = useMotionValue(0);
  const rX    = useTransform(my, [-0.5, 0.5], [ 7, -7]);
  const rY    = useTransform(mx, [-0.5, 0.5], [-7,  7]);
  const srX   = useSpring(rX, { stiffness: 280, damping: 28 });
  const srY   = useSpring(rY, { stiffness: 280, damping: 28 });
  const shineX = useMotionValue(50);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width  - 0.5);
    my.set((e.clientY - r.top)  / r.height - 0.5);
    shineX.set(((e.clientX - r.left) / r.width) * 100);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: srX, rotateY: srY, transformPerspective: 900, ...style }}
      className={`relative overflow-hidden ${shimmer ? "shimmer-sweep" : ""} ${className ?? ""}`}
    >
      <motion.div className="absolute inset-0 pointer-events-none z-20"
        style={{
          background: useTransform(shineX, v =>
            `radial-gradient(ellipse 55% 45% at ${v}% 28%, rgba(255,255,255,0.13), transparent)`),
        }}
      />
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
//  REVEAL
// ═══════════════════════════════════════════════════════════
function Reveal({
  children, delay = 0, className, y = 30,
}: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
//  DEBOSSED INPUT
// ═══════════════════════════════════════════════════════════
function DebossedInput({
  label, type, placeholder, value, onChange, tabIndex, min, max,
}: {
  label: string; type: string; placeholder: string; value: string;
  onChange: (v: string) => void; tabIndex: number; min?: string; max?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className="text-[10px] font-sans font-semibold tracking-[0.18em] uppercase block truncate overflow-hidden"
        style={{ color: "hsl(14 40% 78%)" }} title={label}>{label}</label>
      <div className="relative rounded-sm overflow-hidden transition-all duration-300"
        style={{
          background: focused ? "hsl(30 22% 94%)" : "hsl(38 18% 91%)",
          boxShadow: focused
            ? "inset 0 3px 9px hsl(35 28% 60%/.24),inset 0 1px 3px hsl(35 28% 60%/.16),inset 0 -1px 0 hsl(0 0% 100%/.65)"
            : "inset 0 2px 6px hsl(35 28% 60%/.18),inset 0 1px 2px hsl(35 28% 60%/.12),inset 0 -1px 0 hsl(0 0% 100%/.55)",
        }}>
        <input
          type={type} placeholder={placeholder} value={value} min={min} max={max}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          tabIndex={tabIndex}
          className="w-full bg-transparent py-3 px-3 font-sans text-sm focus:outline-none placeholder:text-[hsl(60_4%_60%)]"
          style={{ color: "hsl(120 2% 17%)" }}
          data-testid={`input-${label.toLowerCase().replace(/\s+/g, "-")}`}
        />
        <div className="absolute bottom-0 left-0 right-0 transition-all duration-300"
          style={{ height: focused ? "2px" : "1.5px", background: focused ? "hsl(8 51% 51%)" : "hsl(38 25% 76%)" }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  COUNT-UP NUMBER
// ═══════════════════════════════════════════════════════════
function CountUp({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  const ref    = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const ctrl = animate(0, to, {
      duration: 1.8, ease: "easeOut",
      onUpdate: v => { node.textContent = prefix + Math.floor(v).toLocaleString("en-IN") + suffix; },
    });
    return () => ctrl.stop();
  }, [inView, to, prefix, suffix]);
  return <span ref={ref}>{prefix}0{suffix}</span>;
}

// ═══════════════════════════════════════════════════════════
//  NAVBAR
// ═══════════════════════════════════════════════════════════
function Navbar({
  onScrollTo,
  onLogout,
}: {
  onScrollTo: (id: string) => void;
  onLogout?: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 1.1 }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? "hsl(30 25% 98%/0.9)" : "transparent",
        backdropFilter: scrolled ? "blur(24px) saturate(1.6)" : "none",
        borderBottom: scrolled ? "1px solid hsl(38 25% 87%/.7)" : "1px solid transparent",
        boxShadow: scrolled ? "0 2px 24px hsl(35 22% 60%/.07)" : "none",
      }}>
      <div className="max-w-7xl mx-auto px-8 h-[68px] flex items-center justify-between">
        <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.02 }}>
          <div className="w-8 h-8 rounded-sm tc-block flex items-center justify-center flex-shrink-0">
            <Layers size={15} style={{ color: "hsl(30 40% 97%)" }} strokeWidth={2} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-serif font-bold text-lg" style={{ color: "hsl(120 2% 17%)" }}>StudioYield</span>
            <span className="font-sans text-[9px] tracking-widest uppercase" style={{ color: "hsl(60 4% 56%)" }}>Schedule Optimizer</span>
          </div>
        </motion.div>
        <nav className="hidden md:flex items-center gap-8">
          {["Algorithms", "Optimizer"].map((item, i) => {
            const id = ["algorithm", "optimizer"][i];
            return (
              <button key={item} onClick={() => onScrollTo(id)}
                className="font-sans text-sm font-medium relative group transition-opacity hover:opacity-80"
                style={{ color: "hsl(60 4% 44%)" }}>
                {item}
                <span className="absolute -bottom-0.5 left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
                  style={{ background: "hsl(8 51% 51%)" }} />
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <MagneticButton
            onClick={() => onScrollTo("optimizer")}
            className="tc-block px-5 py-2.5 rounded-sm font-sans text-sm font-semibold"
            style={{ color: "hsl(30 40% 97%)", letterSpacing: "0.025em" }}
            data-testid="button-nav-cta">
            Open Visualizer
          </MagneticButton>
          {onLogout && (
            <MagneticButton
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-sm font-sans text-xs font-medium hover:bg-white/60 transition-all border"
              style={{ color: "hsl(60 4% 50%)", borderColor: "hsl(38 22% 82%)" }}
              data-testid="button-sign-out">
              <LogOut size={13} />
              Sign Out
            </MagneticButton>
          )}
        </div>
      </div>
    </motion.nav>
  );
}

// ═══════════════════════════════════════════════════════════
//  HERO
// ═══════════════════════════════════════════════════════════
function Hero({ onScrollTo }: { onScrollTo: (id: string) => void }) {
  const burst = useContext(SparkCtx);
  const sectionRef = useRef<HTMLElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!sectionRef.current) return;
      const r = sectionRef.current.getBoundingClientRect();
      mouseX.set((e.clientX - r.width  / 2) / r.width);
      mouseY.set((e.clientY - r.height / 2) / r.height);
    };
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, []);

  const floaters = [
    { name: "E-commerce Website",     value: 25000, weight: 4, left: "68%", top: "16%", depth: 22 },
    { name: "Brand Identity",         value: 15000, weight: 2, left: "76%", top: "52%", depth: 14 },
    { name: "Social Media Campaign",   value: 10000, weight: 1, left: "60%", top: "74%", depth: 30 },
    { name: "Product Promo Video",     value: 20000, weight: 2, left: "84%", top: "34%", depth: 18 },
  ];

  return (
    <section id="hero" ref={sectionRef} className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { w: 700, h: 700, t: "-15%", r: "-8%",  c: "hsl(8 51% 51%/0.07)", dur: "16s"  },
          { w: 450, h: 450, b: "0%",   l: "8%",   c: "hsl(38 30% 72%/0.1)", dur: "20s"  },
          { w: 300, h: 300, t: "44%",  l: "32%",  c: "hsl(14 42% 60%/0.05)", dur: "13s" },
        ].map((o, i) => (
          <motion.div key={i} className="absolute rounded-full pointer-events-none"
            style={{ width: o.w, height: o.h, top: o.t, right: "r" in o ? o.r : undefined,
              bottom: "b" in o ? o.b : undefined, left: "l" in o ? o.l : undefined,
              background: `radial-gradient(circle, ${o.c} 0%, transparent 70%)`,
              filter: "blur(40px)" }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: parseFloat(o.dur), ease: "easeInOut" }}
          />
        ))}
      </div>

      <div className="absolute inset-0 pointer-events-none hidden lg:block">
        {floaters.map((f, i) => {
          const px = useTransform(mouseX, [-0.5, 0.5], [-f.depth, f.depth]);
          const py = useTransform(mouseY, [-0.5, 0.5], [-f.depth * 0.6, f.depth * 0.6]);
          const spx = useSpring(px, { stiffness: 60, damping: 18 });
          const spy = useSpring(py, { stiffness: 60, damping: 18 });
          return (
            <motion.div key={i}
              className="absolute ceramic rounded-sm p-4 w-48"
              style={{ left: f.left, top: f.top, x: spx, y: spy }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 0.9 }}
              transition={{ opacity: { duration: 0.5, delay: i * 0.2 + 1.5 } }}>
              <motion.div
                animate={{ y: [0, -9, 0] }}
                transition={{ duration: 4 + i, delay: i * 0.3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}>
                <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-sm"
                  style={{ background: "linear-gradient(180deg,hsl(10 50% 56%),hsl(8 52% 44%))" }} />
                <p className="font-serif font-semibold text-sm pl-2 mb-1.5" style={{ color: "hsl(120 2% 17%)" }}>{f.name}</p>
                <div className="flex justify-between pl-2 font-sans text-xs">
                  <span style={{ color: "hsl(60 4% 55%)" }}>Day {f.weight}</span>
                  <span className="font-bold" style={{ color: "hsl(8 51% 50%)" }}>{fmt(f.value)}</span>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-28 pb-24 w-full">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-9"
            style={{ background: "hsl(8 51% 51%/0.09)", border: "1px solid hsl(8 51% 51%/0.2)" }}>
            <Zap size={11} style={{ color: "hsl(8 51% 51%)" }} />
            <span className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: "hsl(8 44% 44%)" }}>
              Greedy Latest Slot Strategy · ₹ Indian Rupees
            </span>
          </motion.div>
 
          <div className="overflow-hidden mb-8">
            <motion.h1
              initial={{ y: "102%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.88, delay: 1.3, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif font-bold italic leading-[1.02] text-gradient"
              style={{ fontSize: "clamp(3rem,7.5vw,5.6rem)" }}>
              Job Scheduling<br />Optimization.
            </motion.h1>
          </div>
 
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 1.65 }}
            className="font-sans text-lg font-light leading-relaxed mb-12 max-w-xl"
            style={{ color: "hsl(60 4% 44%)" }}>
            Maximize your studio's weekly earnings. Our algorithm strategically places high-value client contracts into your limited work week to ensure you never miss a deadline.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.8 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <MagneticButton
              onClick={(e: React.MouseEvent) => {
                burst((e as React.MouseEvent<HTMLButtonElement>).clientX,
                      (e as React.MouseEvent<HTMLButtonElement>).clientY, 14);
                onScrollTo("optimizer");
              }}
              className="tc-block flex items-center gap-3 px-8 py-4 rounded-sm font-serif font-semibold text-base"
              style={{ color: "hsl(30 40% 97%)", letterSpacing: "0.025em" }}
              data-testid="button-hero-cta">
              <Play size={15} fill="currentColor" />
              Try the Visualizer
            </MagneticButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.05 }}
            className="grid grid-cols-3 gap-0 mt-20 pt-10"
            style={{ borderTop: "1px solid hsl(38 22% 86%)" }}>
            {[
              { label: "Methodology", val: "Latest Slot Strategy" },
              { label: "Complexity",  val: "O(n log n)" },
              { label: "Currency",    val: "₹ INR" },
            ].map(s => (
              <div key={s.label} className="flex flex-col gap-1 pr-8">
                <span className="font-serif font-bold text-2xl" style={{ color: "hsl(120 2% 17%)" }}>{s.val}</span>
                <span className="font-sans text-xs tracking-wider uppercase" style={{ color: "hsl(60 4% 58%)" }}>{s.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <motion.div
        className="absolute bottom-10 left-8 flex flex-col items-center gap-2 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}>
        <span className="font-sans text-[10px] tracking-[0.2em] uppercase" style={{ color: "hsl(60 4% 58%)" }}>Scroll</span>
        <motion.div animate={{ y: [0, 7, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}>
          <ArrowDown size={14} style={{ color: "hsl(60 4% 58%)" }} />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  HOW IT WORKS
// ═══════════════════════════════════════════════════════════
function HowItWorks() {
  const steps = [
    {
      n: "01", icon: <Layers size={22} strokeWidth={1.5} />,
      title: "Queue Projects",
      body: "Enter creative projects with deadlines (Day 1 to 10) and contract values in ₹. Adjust the work week capacity slider to set your available days.",
      tip: "We prioritize your highest-paying client contracts first to guarantee maximum revenue.",
    },
    {
      n: "02", icon: <Sliders size={22} strokeWidth={1.5} />,
      title: "Latest Slot Allocation",
      body: "Our strategic scheduler targets the latest possible day for each project, keeping early slots free for tight deadlines.",
      tip: "This greedy approach optimally balances deadlines and client values.",
    },
    {
      n: "03", icon: <BarChart2 size={22} strokeWidth={1.5} />,
      title: "Review & Sign Schedule",
      body: "Examine the generated production schedule, inspect the decision log, and print a signed project schedule receipt.",
      tip: "Print a PDF version of the Weekly Production Schedule for client review.",
    },
  ];
  return (
    <section id="how-it-works" className="py-32 px-8">
      <div className="max-w-7xl mx-auto">
        <Reveal className="mb-6"><hr className="section-rule" /></Reveal>
        <Reveal className="flex items-end justify-between mb-20 mt-8 gap-6 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
              style={{ background: "hsl(8 51% 51%/0.08)", border: "1px solid hsl(8 51% 51%/0.2)" }}>
              <Info size={11} style={{ color: "hsl(8 51% 51%)" }} />
              <span className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: "hsl(8 44% 44%)" }}>How it works</span>
            </div>
            <h2 className="font-serif font-bold italic leading-[1.02] text-gradient" style={{ fontSize: "clamp(2.5rem,5.5vw,4.2rem)" }}>
              Three steps to the<br />optimal greedy selection
            </h2>
          </div>
          <p className="font-sans text-sm max-w-xs text-right hidden md:block" style={{ color: "hsl(60 4% 52%)" }}>
            Compare greedy fractional density cutting with greedy atomic skip-and-continue heuristics.
          </p>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
          <div className="hidden md:block absolute pointer-events-none"
            style={{ top: 52, left: "calc(16.67% + 20px)", right: "calc(16.67% + 20px)", height: 1,
              background: "linear-gradient(90deg,transparent,hsl(38 25% 80%),hsl(38 22% 78%),transparent)" }} />
          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.1}>
              <TiltCard className="ceramic rounded-sm h-full">
                <div className="p-8">
                  <div className="absolute top-2 right-4 font-serif font-bold select-none pointer-events-none"
                    style={{ fontSize: 80, lineHeight: 1, color: "hsl(8 51% 51%/0.07)" }}>{step.n}</div>
                  <div className="w-11 h-11 rounded-sm flex items-center justify-center mb-7 relative z-10"
                    style={{ background: "hsl(8 51% 51%/0.1)", border: "1px solid hsl(8 51% 51%/0.2)", color: "hsl(8 51% 48%)" }}>
                    {step.icon}
                  </div>
                  <h3 className="font-serif text-xl font-bold mb-3 relative z-10" style={{ color: "hsl(120 2% 17%)" }}>{step.title}</h3>
                  <p className="font-sans text-sm leading-relaxed mb-5 relative z-10" style={{ color: "hsl(60 4% 46%)" }}>{step.body}</p>
                  <div className="px-3 py-2.5 rounded-sm relative z-10"
                    style={{ background: "hsl(38 16% 93%)", border: "1px solid hsl(38 16% 87%)" }}>
                    <p className="font-sans text-xs leading-relaxed" style={{ color: "hsl(60 4% 54%)" }}>{step.tip}</p>
                  </div>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  ALGORITHM SECTION
// ═══════════════════════════════════════════════════════════
function AlgorithmSection({
  algorithm, setAlgorithm
}: {
  algorithm: "fractional" | "dp";
  setAlgorithm: (a: "fractional" | "dp") => void;
}) {
  const greedySequencingPseudo = [
    { n: 1, code: "Sort projects by Contract Value desc",            comment: "Prioritise high-paying clients first" },
    { n: 2, code: "Initialize schedule slots [1..Capacity] as Empty",comment: "Create work week timeline" },
    { n: 3, code: "For each project in sortedProjects:",              comment: "Process in priority order" },
    { n: 4, code: "  For slot = min(Capacity, project.deadline) down to 1:", comment: "Latest Slot Strategy search" },
    { n: 5, code: "    If slot is Empty:",                           comment: "Found an open work slot" },
    { n: 6, code: "      Schedule project in slot",                  comment: "Allocate task to this day" },
    { n: 7, code: "      Mark slot as Filled; break",                comment: "Secure contract and stop search" },
    { n: 8, code: "  If project is not scheduled after search:",     comment: "No slots available before deadline" },
    { n: 9, code: "    Reject project",                              comment: "Skip project to prevent missing deadlines" },
  ];

  return (
    <section id="algorithm" className="py-32 px-8 relative overflow-hidden">
      <div className="absolute right-0 top-0 w-[600px] h-[600px] pointer-events-none"
        style={{ background: "radial-gradient(circle at 80% 30%, hsl(8 51% 51%/0.05) 0%,transparent 65%)" }} />
      <div className="max-w-7xl mx-auto">
        <Reveal className="mb-6"><hr className="section-rule" /></Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mt-8">
          <div>
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
                style={{ background: "hsl(8 51% 51%/0.08)", border: "1px solid hsl(8 51% 51%/0.2)" }}>
                <Clock size={11} style={{ color: "hsl(8 51% 51%)" }} />
                <span className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: "hsl(8 44% 44%)" }}>The Technique</span>
              </div>
              <h2 className="font-serif font-bold italic leading-[1.02] text-gradient mb-6" style={{ fontSize: "clamp(2.5rem,5.5vw,4.2rem)" }}>
                The Technique: Greedy by Profit<br />with Latest Slot Allocation
              </h2>
              
              <div className="space-y-4">
                <p className="font-sans text-sm leading-loose" style={{ color: "hsl(60 4% 46%)" }}>
                  To achieve the maximum possible revenue, the system executes two distinct greedy steps:
                </p>
                <ol className="list-decimal pl-5 space-y-3 font-sans text-sm leading-relaxed" style={{ color: "hsl(60 4% 46%)" }}>
                  <li>
                    <strong style={{ color: "hsl(8 51% 48%)" }}>Greedy Selection:</strong> All incoming projects are sorted by Contract Value. We prioritize the highest-paying clients first.
                  </li>
                  <li>
                    <strong style={{ color: "hsl(8 51% 48%)" }}>Latest Slot Strategy:</strong> Each selected project is greedily scheduled into the latest possible open slot on or before its deadline. This keeps early slots open for urgent, tight-deadline tasks that may appear later in the queue.
                  </li>
                </ol>
              </div>
            </Reveal>
            <Reveal delay={0.1} className="mt-8">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Time Complexity",  val: "O(n log n)", accent: false },
                  { label: "Space Complexity", val: "O(n)",       accent: false },
                  { label: "Guarantees Optimal?", val: "Yes",     accent: true  },
                  { label: "Allocation Rule",  val: "Latest Slot", accent: false },
                ].map(s => (
                  <TiltCard key={s.label} className="ceramic rounded-sm p-5">
                    <p className="font-sans text-[10px] font-semibold tracking-widest uppercase mb-1.5"
                      style={{ color: "hsl(60 4% 58%)" }}>{s.label}</p>
                    <p className="font-serif text-xl font-bold"
                      style={{ color: s.accent ? "hsl(8 51% 47%)" : "hsl(120 2% 17%)" }}>{s.val}</p>
                  </TiltCard>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <div className="rounded-sm overflow-hidden"
              style={{ background: "hsl(120 2% 15%)", border: "1px solid hsl(120 2% 22%)", boxShadow: "0 20px 50px hsl(120 2% 10%/0.3)" }}>
              <div className="flex items-center gap-2.5 px-5 py-3.5"
                style={{ borderBottom: "1px solid hsl(120 2% 22%)", background: "hsl(120 2% 13%)" }}>
                {["hsl(0 70% 60%)", "hsl(40 80% 60%)", "hsl(120 50% 55%)"].map((c, i) => (
                  <div key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />
                ))}
                <span className="ml-3 font-sans text-xs" style={{ color: "hsl(60 4% 45%)" }}>
                  greedy-latest-slot-scheduler.ts
                </span>
              </div>
              <div className="p-6 space-y-1.5">
                {greedySequencingPseudo.map((s, i) => (
                  <motion.div key={s.n}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.4 }}
                    className="flex items-start gap-4">
                    <span className="font-sans text-[11px] w-4 flex-shrink-0 mt-0.5 select-none"
                      style={{ color: "hsl(60 4% 36%)" }}>{s.n}</span>
                    <div className="flex-1 flex items-start justify-between gap-4">
                      <span className="font-sans text-[13px] font-medium"
                        style={{ color: s.code.startsWith(" ") ? "hsl(38 60% 70%)" : "hsl(30 30% 85%)", fontFamily: "'Courier New',monospace" }}>
                        {s.code}
                      </span>
                      {s.comment && (
                        <span className="font-sans text-[11px] flex-shrink-0 italic"
                          style={{ color: "hsl(60 4% 38%)", fontFamily: "'Courier New',monospace" }}>
                          // {s.comment}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  OPTIMIZER APP
// ═══════════════════════════════════════════════════════════
function OptimizerApp({
  algorithm, setAlgorithm, token,
}: {
  algorithm: "fractional" | "dp";
  setAlgorithm: (a: "fractional" | "dp") => void;
  token: string;
}) {
  const burst = useContext(SparkCtx);

  const [items,      setItems     ] = useState<Item[]>([]);
  const [capacity,   setCapacity  ] = useState<number>(10);
  const [state,      setState     ] = useState<"idle"|"running"|"done">("idle");
  const [result,     setResult    ] = useState<KnapsackResult|null>(null);
  const [toasts,     setToasts    ] = useState<Toast[]>([]);
  const [shimmerIds, setShimmerIds] = useState<Set<string>>(new Set());
  const [committing, setCommitting] = useState(false);
  
  const [itemName,   setItemName  ] = useState("");
  const [itemWeight, setItemWeight] = useState("");
  const [itemValue,  setItemValue ] = useState("");

  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);
  const [showReceipt,    setShowReceipt   ] = useState(false);
  const [showHistory,    setShowHistory   ] = useState(false);

  const addItemBtnRef = useRef<HTMLDivElement>(null);
  const runBtnRef     = useRef<HTMLDivElement>(null);

  const toast = useCallback((title: string, sub?: string) => {
    const id = uid();
    setToasts(p => [...p, { id, title, sub }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3600);
  }, []);

  // ── Load projects from API on mount ──────────────────────
  useEffect(() => {
    if (!token) return;
    projectsApi.list(token)
      .then(({ projects }) => {
        setItems(projects.map(p => ({
          id: String(p.id),
          name: p.name,
          weight: p.weight,
          value: p.value,
        })));
      })
      .catch(err => {
        console.error("Failed to load projects:", err.message);
        toast("Could not load projects", "Check your connection and refresh.");
      });
  }, [token]);

  // ── Add project → POST /api/projects ────────────────────
  const addItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemWeight || !itemValue) return;
    const w = parseInt(itemWeight), v = parseInt(itemValue);
    if (isNaN(w) || isNaN(v) || w < 1 || w > capacity || v < 0) {
      toast("Invalid bounds", `Deadline must be between Day 1 and Day ${capacity}. Contract Value must be positive.`);
      return;
    }
    try {
      const { project } = await projectsApi.add(token, { name: itemName.trim(), weight: w, value: v });
      const newItem: Item = { id: String(project.id), name: project.name, weight: project.weight, value: project.value };
      setItems(prev => [...prev, newItem]);
      setState("idle"); setResult(null);
      setItemName(""); setItemWeight(""); setItemValue("");
      toast("Project added", `${project.name} (Deadline: Day ${w}, Value: ₹${v.toLocaleString("en-IN")})`);
      if (addItemBtnRef.current) {
        const r = addItemBtnRef.current.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2, 12);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to add project.";
      toast("Error", msg);
    }
  };

  // ── Delete project → DELETE /api/projects/:id ───────────
  const deleteItem = async (id: string) => {
    try {
      await projectsApi.remove(token, id);
      setItems(p => p.filter(item => item.id !== id));
      setState("idle");
      setResult(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to delete project.";
      toast("Error", msg);
    }
  };


  const handleCapacityChange = (newCap: number) => {
    setCapacity(newCap);
    setState("idle");
    setResult(null);
  };

  // ── Run optimization → POST /api/schedule/optimize ──────
  const optimize = async (e: React.MouseEvent) => {
    if (!items.length) return;
    setState("running");
    burst(e.clientX, e.clientY, 18);
    try {
      const res = await scheduleApi.optimize(token, { capacity });
      // Map API response to local KnapsackResult shape
      const mapped: KnapsackResult = {
        accepted: res.accepted.map((a: any) => ({ ...a, id: String(a.id ?? a.id) })),
        rejected: res.rejected.map((r: any) => ({ ...r, id: String(r.id ?? r.id) })),
        totalValue: res.totalValue,
        totalWeight: res.totalWeight,
        decisionLog: res.decisionLog,
      };
      setResult(mapped); setState("done");
      toast("Optimization complete", `${fmt(res.totalValue)} total value · ${res.rejected.length} waitlisted`);
      setTimeout(() => {
        const ids = new Set(mapped.accepted.map(item => item.id));
        setShimmerIds(ids);
        setTimeout(() => setShimmerIds(new Set()), 1200);
      }, 400);
    } catch (err) {
      setState("idle");
      const msg = err instanceof ApiError ? err.message : "Optimization failed. Please try again.";
      toast("Error", msg);
    }
  };

  // ── Commit to history → POST /api/schedule/commit ───────
  const commitSchedule = async () => {
    if (!result) return;
    setCommitting(true);
    try {
      const res = await scheduleApi.commit(token, {
        capacity,
        totalValue: result.totalValue,
        totalWeight: result.totalWeight,
        accepted: result.accepted,
        rejected: result.rejected,
      });
      toast("Schedule committed", `History record #${res.historyId} saved.`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Commit failed. Please try again.";
      toast("Error", msg);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <section id="optimizer" className="py-32 px-8">
      <div className="max-w-7xl mx-auto">
        <Reveal className="mb-6"><hr className="section-rule" /></Reveal>

        <Reveal className="text-center mb-16 mt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
            style={{ background: "hsl(8 51% 51%/0.08)", border: "1px solid hsl(8 51% 51%/0.2)" }}>
            <Trophy size={11} style={{ color: "hsl(8 51% 51%)" }} />
            <span className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: "hsl(8 44% 44%)" }}>Live Optimizer</span>
          </div>
          <div className="mb-4">
            <h2 className="font-serif font-bold italic leading-[1.02] text-gradient" style={{ fontSize: "clamp(2.5rem,5.5vw,4.2rem)" }}>
              Job Scheduling Optimization.
            </h2>
          </div>
          <p className="font-sans text-sm max-w-sm mx-auto" style={{ color: "hsl(60 4% 52%)" }}>
            Add creative projects, set deadlines, and run greedy scheduling to optimize your weekly production.
          </p>
        </Reveal>

        <Reveal>
          <div className="rounded-sm overflow-hidden flex flex-col md:flex-row"
            style={{ boxShadow: "0 8px 28px hsl(35 22% 58%/.14), 0 24px 56px hsl(35 20% 58%/.08)", border: "1px solid hsl(38 22% 86%)" }}>

            {/* ── Left terracotta pane ── */}
            <div className="w-full md:w-[32%] flex flex-col relative overflow-hidden"
              style={{ background: "linear-gradient(165deg,hsl(14 38% 56%) 0%,hsl(10 44% 48%) 60%,hsl(8 50% 43%) 100%)", boxShadow: "4px 0 28px hsl(8 51% 28%/.16)" }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0.25'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23g)' opacity='0.065'/%3E%3C/svg%3E")`, backgroundSize: "200px 200px", mixBlendMode: "overlay" as React.CSSProperties["mixBlendMode"] }} />
              <div className="absolute top-0 left-0 right-0 h-[1.5px] pointer-events-none"
                style={{ background: "linear-gradient(90deg,transparent,hsl(14 60% 72%/0.5),transparent)" }} />

              <div className="p-8 flex-shrink-0 relative z-10">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers size={14} style={{ color: "hsl(14 55% 82%)" }} strokeWidth={1.5} />
                    <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: "hsl(14 40% 78%)" }}>Input Settings</span>
                  </div>
                  <h3 className="font-serif text-3xl font-bold leading-none" style={{ color: "hsl(30 40% 97%)", textShadow: "0 2px 8px hsl(8 51% 25%/.3)" }}>
                    Project Queuing
                  </h3>
                </div>

                {/* Capacity Slider */}
                <div className="mb-6 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 text-[10px] font-sans font-semibold tracking-[0.18em] uppercase" style={{ color: "hsl(14 40% 78%)" }}>
                    <span className="whitespace-nowrap">Work Week Capacity</span>
                    <span className="text-sm font-bold text-white font-serif flex-shrink-0">{capacity} Days</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="10"
                    value={capacity}
                    onChange={e => handleCapacityChange(parseInt(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-amber-100/30 accent-[hsl(30,40%,97%)]"
                    style={{ outline: "none" }}
                  />
                  <div className="flex justify-between text-[9px] font-sans text-amber-200/60 uppercase">
                    <span>5 Days</span>
                    <span>10 Days</span>
                  </div>
                </div>

                <form onSubmit={addItem} className="space-y-4">
                  <DebossedInput label="Client Project (e.g., Logo Design, Video Edit)" type="text" placeholder="e.g. Logo Design" value={itemName} onChange={setItemName} tabIndex={1} />
                  <div className="grid grid-cols-2 gap-3">
                    <DebossedInput label={`Delivery Deadline (Day 1 to 10)`} type="number" placeholder="Day 1-10" value={itemWeight} onChange={setItemWeight} tabIndex={2} min="1" max={String(capacity)} />
                    <DebossedInput label="Contract Value (₹)" type="number" placeholder="₹ Value" value={itemValue} onChange={setItemValue} tabIndex={3} min="1" />
                  </div>
                  <div ref={addItemBtnRef}>
                    <MagneticButton type="submit" tabIndex={4}
                      data-testid="button-add-item"
                      className="w-full py-4 mt-1 font-serif text-base font-semibold tracking-wide rounded-sm"
                      style={{
                        background: "linear-gradient(180deg,hsl(30 40% 97%) 0%,hsl(30 25% 93%) 100%)",
                        color: "hsl(8 51% 44%)",
                        boxShadow: "0 3px 8px hsl(8 51% 22%/.35),0 6px 16px hsl(8 51% 22%/.2),0 1px 0 hsl(0 0%100%/.9) inset,0 -2px 0 hsl(8 40% 38%/.28) inset",
                        letterSpacing: "0.04em",
                      }}>
                      Add Project
                    </MagneticButton>
                  </div>
                </form>
              </div>

              {/* Item List */}
              <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-2 relative z-10 max-h-[300px]">
                {items.length > 0 && (
                  <p className="text-[10px] font-sans font-semibold tracking-[0.15em] uppercase mb-3"
                    style={{ color: "hsl(14 40% 76%)" }}>
                    {items.length} project{items.length !== 1 ? "s" : ""} queued
                  </p>
                )}
                <AnimatePresence>
                  {items.map(item => (
                    <motion.div key={item.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.14 } }}
                      className="flex items-center justify-between px-3 py-2.5 rounded-sm"
                      style={{ background: "hsl(14 35% 52%/.32)", boxShadow: "inset 0 1px 0 hsl(14 55% 70%/.2),inset 0 -1px 0 hsl(8 45% 28%/.18)" }}
                      data-testid={`card-item-${item.id}`}>
                      <div className="flex flex-col min-w-0 mr-2">
                        <span className="font-serif font-semibold text-sm truncate" style={{ color: "hsl(30 35% 96%)" }}>{item.name}</span>
                        <div className="flex gap-3 text-[11px] font-sans mt-0.5" style={{ color: "hsl(14 35% 80%)" }}>
                          <span>Deadline: Day {item.weight}</span>
                          <span>{fmt(item.value)}</span>
                        </div>
                      </div>
                      <button onClick={() => deleteItem(item.id)} className="flex-shrink-0 p-1 hover:opacity-60 transition-opacity"
                        style={{ color: "hsl(14 40% 82%)" }} data-testid={`button-delete-${item.id}`}>
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Right glass pane ── */}
            <div className="w-full md:w-[68%] flex flex-col glass">
              
              {/* Action Bar */}
              <div className="flex items-center flex-wrap gap-4 px-8 py-5 flex-shrink-0"
                style={{ borderBottom: "1px solid hsl(38 22% 88%/.8)" }}>
                <div ref={runBtnRef}>
                  <MagneticButton
                    onClick={optimize}
                    disabled={!items.length || state === "running"}
                    data-testid="button-run-optimization"
                    className="flex items-center gap-2.5 px-6 py-3 rounded-sm font-serif font-semibold text-sm disabled:opacity-35 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(180deg,hsl(10 50% 54%) 0%,hsl(8 52% 47%) 100%)",
                      color: "hsl(30 40% 97%)",
                      boxShadow: "0 2px 6px hsl(8 51% 22%/.32),0 5px 14px hsl(8 51% 22%/.16),0 1px 0 hsl(14 60% 68%/.4) inset,0 -2px 0 hsl(8 50% 28%/.3) inset",
                    }}>
                    <Play size={13} fill="currentColor" /> Run Optimization
                  </MagneticButton>
                </div>

                <div className="px-3 py-2 rounded-sm font-sans font-semibold text-xs border border-neutral-300/40 bg-white/80 text-neutral-700 shadow-sm ml-auto select-none">
                  Latest Slot Strategy Active
                </div>

                {state === "done" && (
                  <>
                    <MagneticButton
                      onClick={commitSchedule}
                      disabled={committing}
                      data-testid="button-commit-schedule"
                      className="flex items-center gap-1.5 px-4 py-2 font-sans text-xs font-medium rounded-sm transition-all disabled:opacity-40"
                      style={{
                        color: "hsl(8 51% 47%)",
                        border: "1px solid hsl(8 51% 51% / 0.35)",
                        background: "hsl(8 51% 51% / 0.06)",
                      }}>
                      <Save size={12} />
                      {committing ? "Saving..." : "Commit to History"}
                    </MagneticButton>
                    <button onClick={() => { setState("idle"); setResult(null); }}
                      className="px-4 py-2 font-sans text-xs font-medium rounded-sm hover:bg-white/50 transition-all"
                      style={{ color: "hsl(60 4% 60%)", border: "1px solid hsl(38 20% 88%)" }}>
                      Reset
                    </button>
                  </>
                )}
                
                <MagneticButton
                  onClick={() => setShowHistory(true)}
                  data-testid="button-view-history"
                  className="px-4 py-2 font-sans text-xs font-medium rounded-sm transition-all border border-neutral-300 hover:bg-neutral-100"
                  style={{ color: "hsl(60 4% 40%)" }}
                >
                  View History
                </MagneticButton>
              </div>

              {/* Main Content Pane */}
              <div className="flex-1 px-8 py-8 overflow-y-auto min-h-[440px] relative">
                
                {/* Empty State */}
                {!items.length && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
                      className="w-16 h-16 rounded-sm flex items-center justify-center"
                      style={{ background: "hsl(40 16% 92%)", boxShadow: "inset 0 2px 6px hsl(35 22% 60%/.14),inset 0 -1px 0 hsl(0 0% 100%/.8)" }}>
                      <BarChart2 size={26} strokeWidth={1.2} style={{ color: "hsl(60 4% 64%)" }} />
                    </motion.div>
                    <p className="font-serif text-xl" style={{ color: "hsl(120 2% 17%/.3)" }}>Add items to begin</p>
                    <p className="font-sans text-xs" style={{ color: "hsl(60 4% 58%/.65)" }}>or click Load Sample Relics for a demonstration</p>
                  </div>
                )}

                {/* Idle Grid (Preview of all items in tray) */}
                {!!items.length && state === "idle" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {items.map(item => (
                        <motion.div key={item.id}
                          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                          className="ceramic rounded-sm p-5" data-testid={`card-preview-${item.id}`}>
                          <h3 className="font-serif text-base font-semibold mb-3 text-neutral-800">{item.name}</h3>
                          <div className="flex justify-between items-center font-sans text-xs">
                            <span className="text-neutral-500">Deadline: <strong className="text-neutral-700">Day {item.weight}</strong></span>
                            <span className="font-bold text-sm" style={{ color: "hsl(8 51% 50%)" }}>{fmt(item.value)}</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Skeleton Loader during Run */}
                {state === "running" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {[...Array(Math.min(items.length, 6))].map((_, i) => (
                        <motion.div key={i}
                          animate={{ opacity: [0.3, 0.65, 0.3] }}
                          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut", delay: i * 0.11 }}
                          className="rounded-sm overflow-hidden p-4 flex flex-col justify-between"
                          style={{ height: 90, background: "hsl(38 18% 92%)", border: "1px solid hsl(38 18% 87%)", boxShadow: "inset 0 1px 0 hsl(0 0% 100%/.65)" }}>
                          <div className="h-3 w-3/4 rounded-sm" style={{ background: "hsl(38 15% 84%)" }} />
                          <div className="flex justify-between">
                            <div className="h-2.5 w-1/4 rounded-sm" style={{ background: "hsl(38 14% 82%)" }} />
                            <div className="h-2.5 w-1/5 rounded-sm" style={{ background: "hsl(8 28% 78%)" }} />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2.5 mt-2">
                      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                        className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(8 51% 51%)" }} />
                      <span className="font-sans text-xs" style={{ color: "hsl(60 4% 56%)" }}>
                        Sorting items by value density and selecting greedily...
                      </span>
                    </div>
                  </div>
                )}

                {/* Results Screen */}
                {state === "done" && result && (
                  <div className="flex flex-col gap-8">
                    
                    {/* Metrics Dashboard */}
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Total Optimized Revenue", value: fmt(result.totalValue), accent: true },
                        { label: "Allocated Projects", value: `${result.totalWeight} / ${capacity} Days`, accent: false },
                        { label: "Schedule Density", value: `${((result.totalWeight / capacity) * 100).toFixed(0)}%`, accent: false },
                      ].map((s, idx) => (
                        <TiltCard key={s.label} className="ceramic rounded-sm p-4">
                          <p className="font-sans text-[10px] font-semibold tracking-[0.14em] uppercase mb-1.5" style={{ color: "hsl(60 4% 58%)" }}>{s.label}</p>
                          <p className="font-serif text-xl font-bold" style={{ color: s.accent ? "hsl(8 51% 47%)" : "hsl(120 2% 17%)" }}>{s.value}</p>
                          {idx === 2 && (
                            <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden mt-2">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(result.totalWeight / capacity) * 100}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full"
                                style={{ background: "linear-gradient(90deg,hsl(14 42% 56%),hsl(8 52% 44%))" }}
                              />
                            </div>
                          )}
                        </TiltCard>
                      ))}
                    </motion.div>

                    {/* Timeline and Tray Visualizer Container */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      
                      {/* ══ Left: Schedule Timeline ══ */}
                      <div className="lg:col-span-7 flex flex-col items-center">

                        {/* Header */}
                        <div className="w-full flex justify-between items-center mb-4 font-sans text-xs font-semibold" style={{ color: "hsl(60 4% 40%)" }}>
                          <span>Weekly Production Calendar</span>
                          <span>Work Week: {capacity} Days</span>
                        </div>

                        <div className="relative" style={{ width: 368, height: 360 }}>

                          {/* ── Left: Day labels ── */}
                          {Array.from({ length: capacity }).map((_, i) => {
                            const day = i + 1;
                            return (
                              <div key={day}
                                className="absolute flex items-center justify-end pointer-events-none select-none font-sans text-[10px] font-semibold"
                                style={{
                                  top: `${((day - 0.5) / capacity) * 100}%`,
                                  left: 0,
                                  width: 38,
                                  transform: "translateY(-50%)",
                                  color: "hsl(60 4% 42%)"
                                }}>
                                Day {day}
                              </div>
                            );
                          })}

                          {/* ── Right: Project values or Open indicators ── */}
                          {Array.from({ length: capacity }).map((_, i) => {
                            const day = i + 1;
                            const item = result.accepted.find((acc: any) => acc.scheduledDay === day);
                            return (
                              <div key={day}
                                className="absolute flex items-center pointer-events-none select-none font-sans text-[10px] font-semibold"
                                style={{
                                  top: `${((day - 0.5) / capacity) * 100}%`,
                                  left: 46 + 260 + 8,
                                  width: 54,
                                  transform: "translateY(-50%)",
                                  color: item ? "hsl(8 51% 50%)" : "hsl(60 4% 60%)"
                                }}>
                                {item ? `₹${item.value / 1000}k` : "Open"}
                              </div>
                            );
                          })}

                          {/* ── Horizontal dashed division lines between slots ── */}
                          {Array.from({ length: capacity + 1 }).map((_, i) => {
                            const pct = (i / capacity) * 100;
                            return (
                              <div key={i}
                                className="absolute pointer-events-none"
                                style={{
                                  top: `${pct}%`,
                                  left: 46,
                                  width: 260,
                                  height: 1,
                                  background: i === 0 || i === capacity
                                    ? "transparent"
                                    : "hsl(38 22% 72% / 0.4)",
                                  borderTop: i === 0 || i === capacity ? "none" : "1px dashed hsl(38 22% 72% / 0.4)",
                                  zIndex: 1,
                                }}
                              />
                            );
                          })}

                          {/* ── Visual Timeline slots container ── */}
                          <div
                            className="absolute overflow-hidden"
                            style={{
                              top: 0,
                              left: 46,
                              width: 260,
                              height: 360,
                              borderLeft: "4px solid hsl(38 20% 58%)",
                              borderRight: "4px solid hsl(38 20% 58%)",
                              borderBottom: "4px solid hsl(38 20% 58%)",
                              borderTop: "4px solid hsl(38 20% 58%)",
                              borderRadius: "12px",
                              background: "hsl(38 14% 97%)",
                              boxShadow: "inset 0 6px 20px hsl(35 18% 60%/0.08)",
                              display: "flex",
                              flexDirection: "column",
                            }}
                          >
                            <AnimatePresence>
                              {Array.from({ length: capacity }).map((_, i) => {
                                const day = i + 1;
                                const item = result.accepted.find((acc: any) => acc.scheduledDay === day);
                                const pctHeight = 100 / capacity;
                                
                                if (item) {
                                  const isHighlighted = hoveredStepId === item.id;
                                  const lightness1 = Math.max(34, 56 - i * 3);
                                  const lightness2 = Math.max(24, 43 - i * 3);
                                  return (
                                    <motion.div
                                      key={item.id}
                                      initial={{ scaleY: 0, opacity: 0 }}
                                      animate={{ scaleY: 1, opacity: 1 }}
                                      exit={{ scaleY: 0, opacity: 0 }}
                                      style={{
                                        height: `${pctHeight}%`,
                                        minHeight: 0,
                                        flexShrink: 0,
                                        originY: "top",
                                        background: isHighlighted
                                          ? "linear-gradient(180deg, hsl(8 62% 58%) 0%, hsl(8 66% 44%) 100%)"
                                          : `linear-gradient(180deg, hsl(14 44% ${lightness1}%) 0%, hsl(8 54% ${lightness2}%) 100%)`,
                                        color: "hsl(30 40% 97%)",
                                        position: "relative",
                                        outline: isHighlighted ? "2px solid hsl(8 55% 76%)" : "none",
                                        outlineOffset: -2,
                                        zIndex: 2,
                                      }}
                                      transition={{ type: "spring", stiffness: 220, damping: 24, delay: i * 0.04 }}
                                      className={`w-full border-t border-white/20 flex flex-col justify-center items-center overflow-hidden ${shimmerIds.has(item.id) ? "shimmer-sweep" : ""}`}
                                      data-testid={`card-accepted-${item.id}`}
                                    >
                                      <div className="absolute inset-0 pointer-events-none"
                                        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)" }} />
                                      <div className="relative z-10 text-center w-full px-2">
                                        <p className="font-serif font-bold text-xs leading-tight truncate">
                                          {item.name}
                                        </p>
                                        <p className="font-sans text-[10px] mt-0.5 opacity-80 truncate">
                                          Value: {fmt(item.value)}
                                        </p>
                                      </div>
                                    </motion.div>
                                  );
                                } else {
                                  return (
                                    <div
                                      key={`empty-${day}`}
                                      style={{
                                        height: `${pctHeight}%`,
                                        minHeight: 0,
                                        flexShrink: 0,
                                        background: "hsl(38 14% 97%)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                      className="w-full border-t border-dashed border-neutral-300/60"
                                    >
                                      <span className="font-sans text-[9px] uppercase tracking-wider text-neutral-400">
                                        Open Slot
                                      </span>
                                    </div>
                                  );
                                }
                              })}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Summary info and Print Schedule CTA */}
                        <div className="mt-5 w-full flex flex-col gap-4" style={{ maxWidth: 368 }}>
                          <div className="flex justify-between text-[11px] font-sans px-1" style={{ color: "hsl(60 4% 44%)" }}>
                            <span>Slots Filled: <strong>{result.totalWeight} / {capacity} Days</strong></span>
                            <span>Remaining: <strong>{capacity - result.totalWeight} Days</strong></span>
                          </div>
                          
                          <MagneticButton
                            onClick={() => setShowReceipt(true)}
                            className="w-full py-3 text-xs font-sans font-semibold tracking-wider uppercase rounded-sm border border-neutral-300 bg-white hover:bg-neutral-50 shadow-sm transition-all"
                            style={{ color: "hsl(60 4% 36%)" }}
                          >
                            Generate Printable Schedule
                          </MagneticButton>
                        </div>
                      </div>

                      {/* Right: Unscheduled Projects Tray (5 cols) */}
                      <div className="lg:col-span-5">
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
                          <span className="font-sans text-[11px] font-semibold tracking-[0.18em] uppercase text-neutral-500">
                            Unscheduled Projects ({result.rejected.length})
                          </span>
                        </div>
                        
                        <div className="ceramic rounded-sm p-6 min-h-[360px] bg-neutral-50/50 border border-neutral-300/40 shadow-inner flex flex-col gap-3">
                          <AnimatePresence>
                            {result.rejected.map((item, i) => {
                              const isHighlighted = hoveredStepId === item.id;
                              return (
                                <motion.div
                                  key={item.id}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ 
                                    opacity: isHighlighted ? 1.0 : 0.65, 
                                    x: 0,
                                    borderColor: isHighlighted ? "hsl(8 51% 51% / 0.6)" : "hsl(38 10% 84%)",
                                    scale: isHighlighted ? 1.02 : 1.0,
                                  }}
                                  exit={{ opacity: 0, x: 20 }}
                                  transition={{ type: "spring", stiffness: 220, damping: 20, delay: i * 0.05 }}
                                  className="rounded-sm p-4 bg-neutral-200/50 border shadow-sm flex items-center justify-between text-neutral-600 hover:opacity-100 transition-all duration-200"
                                  data-testid={`card-rejected-${item.id}`}
                                >
                                  <div>
                                    <h4 className="font-serif font-bold text-sm text-neutral-700">{item.name}</h4>
                                    <p className="font-sans text-xs text-neutral-500 mt-0.5">
                                      Deadline: Day {item.weight} | Value: {fmt(item.value)}
                                    </p>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>

                          {result.rejected.length === 0 && (
                            <div className="flex-1 flex flex-col justify-center items-center text-center p-8 text-neutral-400/80">
                              <Check size={28} className="text-emerald-500 mb-2 opacity-70" />
                              <p className="font-serif italic text-sm">Optimal Allocation</p>
                              <p className="font-sans text-[10px] mt-1">All contracts scheduled successfully!</p>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>


                    {/* Greedy Decision Log Section */}
                    {result.decisionLog && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="ceramic rounded-sm p-6 bg-white border border-neutral-300/40 shadow-sm mt-4"
                      >
                        <div className="mb-4">
                          <h3 className="font-serif text-lg font-bold text-neutral-800 flex items-center gap-2">
                            <Sliders size={16} className="text-[hsl(8,51%,51%)]" />
                            Greedy Decision Log (Step-by-Step Selection)
                          </h3>
                          <p className="font-sans text-xs text-neutral-500 mt-1">
                            This log details how the greedy algorithm evaluates projects sequentially by contract value. Hover over rows to highlight allocated slots above.
                          </p>
                        </div>

                        <div className="overflow-x-auto border border-neutral-200 rounded-sm">
                          <table className="min-w-full divide-y divide-neutral-200">
                            <thead className="bg-neutral-50 font-sans text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                              <tr>
                                <th className="px-4 py-3 text-left border-r border-neutral-200">Order</th>
                                <th className="px-4 py-3 text-left border-r border-neutral-200">Client Project Details</th>
                                <th className="px-3 py-3 text-center border-r border-neutral-200">Contract Value</th>
                                <th className="px-3 py-3 text-center border-r border-neutral-200">Free Days Before</th>
                                <th className="px-4 py-3 text-left border-r border-neutral-200">Latest Slot Allocation Check</th>
                                <th className="px-3 py-3 text-center border-r border-neutral-200">Allocation Status</th>
                                <th className="px-3 py-3 text-center border-r border-neutral-200">Free Days After</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-neutral-200 font-sans text-xs text-neutral-700">
                              {result.decisionLog.map((step, idx) => {
                                const isHovered = hoveredStepId === step.item.id;
                                
                                return (
                                  <tr 
                                    key={step.item.id}
                                    onMouseEnter={() => setHoveredStepId(step.item.id)}
                                    onMouseLeave={() => setHoveredStepId(null)}
                                    className={`transition-colors duration-150 ${isHovered ? "bg-[hsl(8,51%,51%)/0.04]" : "hover:bg-neutral-50/50"}`}
                                  >
                                    <td className="px-4 py-3 border-r border-neutral-200 font-bold text-neutral-400 select-none">
                                      #{idx + 1}
                                    </td>
                                    <td className="px-4 py-3 border-r border-neutral-200">
                                      <div className="flex flex-col leading-tight">
                                        <span className="font-serif font-bold text-neutral-800">{step.item.name}</span>
                                        <span className="text-[10px] text-neutral-400 mt-0.5">
                                          Deadline: Day {step.item.weight} | Value: {fmt(step.item.value)}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-3 border-r border-neutral-200 text-center font-mono text-neutral-600 font-medium">
                                      {fmt(step.item.value)}
                                    </td>
                                    <td className="px-3 py-3 border-r border-neutral-200 text-center font-serif text-neutral-500">
                                      {step.remainingCapacityBefore} Days
                                    </td>
                                    <td className="px-4 py-3 border-r border-neutral-200 font-mono text-[11px] text-neutral-500">
                                      {step.decision === "pack" ? (
                                        <span>Slot found on or before Day {step.item.weight}</span>
                                      ) : (
                                        <span className="text-rose-600 font-semibold">No slot available on or before Day {step.item.weight}</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-3 border-r border-neutral-200 text-center">
                                      {step.decision === "pack" ? (
                                        <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded uppercase">
                                          Scheduled
                                        </span>
                                      ) : (
                                        <span className="px-2 py-1 bg-rose-100 text-rose-800 text-[10px] font-bold rounded uppercase">
                                          Unscheduled
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-3 border-r border-neutral-200 text-center font-serif font-bold text-neutral-800">
                                      {step.remainingCapacityAfter} Days
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Scheduling Note */}
                        <div className="mt-4 p-4 rounded-sm border border-neutral-300/60 bg-amber-50/50 text-xs font-sans leading-relaxed text-neutral-600">
                          <p className="flex items-center gap-1.5 font-bold text-neutral-800 mb-1">
                            <Info size={14} className="text-amber-600 flex-shrink-0" />
                            Strategic Scheduling Note: Latest Slot Strategy
                          </p>
                          <p>
                            The **Greedy Latest Slot** allocation strategy ensures that earliest slots remain open as long as possible. By placing each accepted project on the latest possible day on or before its delivery deadline, the scheduler maintains maximum operational flexibility. This is essential for accommodating tight-deadline, high-value contracts that may arrive later.
                          </p>
                        </div>
                      </motion.div>
                    )}

                  </div>
                )}

              </div>
            </div>

          </div>
        </Reveal>
      </div>

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceipt && (
          <motion.div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReceipt(false)}
          >
            <motion.div 
              className="relative w-full max-w-lg bg-[hsl(30,22%,97%)] rounded-sm p-8 shadow-2xl border border-[hsl(38,22%,86%)] text-neutral-800"
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button 
                onClick={() => setShowReceipt(false)}
                className="absolute top-4 right-4 p-1 hover:opacity-60 transition-opacity print:hidden"
                style={{ color: "hsl(60 4% 44%)" }}
              >
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div className="text-center border-b border-[hsl(38,22%,84%)] pb-6 mb-6">
                <h3 className="font-serif text-2xl font-bold text-neutral-800 uppercase tracking-wide">
                  Weekly Production Schedule
                </h3>
                <p className="font-sans text-[10px] uppercase tracking-widest text-neutral-400 mt-1">
                  Freelance Creative Studio
                </p>
              </div>

              {/* Modal Content */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-sans font-semibold text-neutral-400 uppercase tracking-widest mb-2 border-b border-neutral-200 pb-1">
                  <span>Accepted Projects</span>
                  <span>Delivery / Revenue</span>
                </div>
                
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {result?.accepted.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-[hsl(38,22%,90%)]">
                      <div>
                        <p className="font-serif font-bold text-sm text-neutral-800">{item.name}</p>
                        <p className="font-sans text-[10px] text-neutral-400">Scheduled for Day {item.scheduledDay}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-serif font-bold text-sm" style={{ color: "hsl(8 51% 47%)" }}>{fmt(item.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 mt-6 border-t border-[hsl(38,22%,84%)] flex justify-between items-center">
                  <span className="font-serif font-bold text-base text-neutral-800">Total Optimized Revenue</span>
                  <span className="font-serif font-bold text-xl" style={{ color: "hsl(8 51% 47%)" }}>
                    {result ? fmt(result.totalValue) : "₹0"}
                  </span>
                </div>

                {/* Project Manager Signature Line */}
                <div className="pt-12 mt-8 flex justify-between items-end">
                  <div className="text-left font-sans text-xs text-neutral-400 leading-tight">
                    <p>Date: {new Date().toLocaleDateString('en-IN')}</p>
                    <p>Status: Approved</p>
                  </div>
                  <div className="text-right w-44">
                    <div className="border-b border-neutral-400 h-6 mb-1"></div>
                    <p className="font-sans text-[9px] uppercase tracking-widest text-neutral-500">
                      Project Manager Signature
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 text-xs font-sans font-medium rounded-sm border border-[hsl(38,22%,80%)] hover:bg-neutral-100 transition-colors"
                  style={{ color: "hsl(60,4%,44%)" }}
                >
                  Print Schedule
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="tc-block px-5 py-2 rounded-sm font-sans text-xs font-semibold text-white"
                >
                  Close
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <HistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        token={token}
      />

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 pointer-events-none print:hidden">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: 28, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.94, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="flex items-start gap-3 px-4 py-3.5 rounded-sm pointer-events-auto"
              style={{
                background: "hsl(30 25% 98%)", minWidth: 220, maxWidth: 300,
                border: "1px solid hsl(38 22% 87%)",
                boxShadow: "0 4px 14px hsl(35 22% 55%/.16),0 14px 30px hsl(35 20% 55%/.1),0 1px 0 hsl(0 0% 100%/.95) inset",
              }}
              data-testid="toast-notification">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "hsl(140 32% 92%)", border: "1px solid hsl(140 28% 82%)" }}>
                <Check size={11} strokeWidth={3} style={{ color: "hsl(140 38% 40%)" }} />
              </div>
              <div className="flex flex-col min-w-0">
                <p className="font-sans text-sm font-medium" style={{ color: "hsl(120 2% 17%)" }}>{t.title}</p>
                {t.sub && <p className="font-sans text-xs mt-0.5" style={{ color: "hsl(60 4% 54%)" }}>{t.sub}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  FOOTER
// ═══════════════════════════════════════════════════════════
function Footer() {
  return (
    <footer className="py-16 px-8" style={{ borderTop: "1px solid hsl(38 22% 87%)", background: "hsl(30 20% 97%)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-sm tc-block flex items-center justify-center">
                <Layers size={13} style={{ color: "hsl(30 40% 97%)" }} strokeWidth={2} />
              </div>
              <span className="font-serif font-bold text-lg" style={{ color: "hsl(120 2% 17%)" }}>Job Scheduling Optimization</span>
            </div>
            <p className="font-sans text-xs leading-relaxed" style={{ color: "hsl(60 4% 54%)" }}>
              A premium Greedy Job Scheduling Optimization tool for Freelance Studios. Runs entirely in your browser — no server, no data sent anywhere.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-16 gap-y-3">
            {[
              { label: "Algorithm",   val: "Greedy Latest Slot Allocation" },
              { label: "Complexity",  val: "O(n log n)" },
              { label: "Currency",    val: "₹ Indian Rupees" },
              { label: "Execution",   val: "Client-side JS" },
            ].map(s => (
              <div key={s.label} className="flex flex-col">
                <span className="font-sans text-[10px] tracking-widest uppercase font-semibold mb-0.5" style={{ color: "hsl(60 4% 58%)" }}>{s.label}</span>
                <span className="font-sans text-sm font-medium" style={{ color: "hsl(120 2% 22%)" }}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between mt-12 pt-6" style={{ borderTop: "1px solid hsl(38 18% 89%)" }}>
          <p className="font-sans text-xs" style={{ color: "hsl(60 4% 60%)" }}>Built with React · Framer Motion · Tailwind CSS</p>
          <p className="font-sans text-xs" style={{ color: "hsl(60 4% 60%)" }}>Crafted Alabaster & Terracotta</p>
        </div>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════
//  ROOT
// ═══════════════════════════════════════════════════════════
export default function Optimizer({
  token,
  onLogout,
}: {
  token: string;
  onLogout?: () => void;
}) {
  const [activeSection, setActiveSection] = useState("hero");
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [algorithm, setAlgorithm] = useState<"fractional" | "dp">("fractional");

  const burst = useCallback((x: number, y: number, count = 10) => {
    const SPARK_COLORS = ["hsl(8,55%,55%)", "hsl(35,70%,62%)", "hsl(14,55%,65%)", "hsl(25,65%,72%)", "hsl(38,60%,70%)"];
    const newSparks: Spark[] = Array.from({ length: count }, () => ({
      id: uid(),
      x, y,
      angle: rand(0, Math.PI * 2),
      dist: rand(35, 100),
      color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
    }));
    setSparks(p => [...p, ...newSparks]);
  }, []);

  const removeSpark = useCallback((id: string) => {
    setSparks(p => p.filter(s => s.id !== id));
  }, []);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  useEffect(() => {
    const obs: IntersectionObserver[] = [];
    SECTIONS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const o = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActiveSection(id); },
        { threshold: 0.35 }
      );
      o.observe(el);
      obs.push(o);
      obs.push(o);
    });
    return () => obs.forEach(o => o.disconnect());
  }, []);

  return (
    <SparkCtx.Provider value={burst}>
      <ParticleCanvas />
      <MouseBloom />
      <SparkleBurst sparks={sparks} onDone={removeSpark} />
      <Cursor />
      <EntryVeil />
      <SideNav active={activeSection} />

      <div className="relative z-10">
        <Navbar onScrollTo={scrollTo} onLogout={onLogout} />
        <Hero onScrollTo={scrollTo} />
        <AlgorithmSection algorithm={algorithm} setAlgorithm={setAlgorithm} />
        <OptimizerApp algorithm={algorithm} setAlgorithm={setAlgorithm} token={token} />
        <Footer />
      </div>
    </SparkCtx.Provider>
  );
}
