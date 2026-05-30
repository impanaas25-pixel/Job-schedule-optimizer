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
} from "lucide-react";

// ═══════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════
type Job    = { id: string; name: string; deadline: number; profit: number };
type Result = { accepted: Job[]; rejected: Job[]; totalProfit: number };
type Toast  = { id: string; title: string; sub?: string };
type Spark  = { id: string; x: number; y: number; angle: number; dist: number; color: string };

// ═══════════════════════════════════════════════════════════
//  ALGORITHM
// ═══════════════════════════════════════════════════════════
function runGreedy(jobs: Job[]): Result {
  const sorted = [...jobs].sort((a, b) => b.profit - a.profit);
  if (!sorted.length) return { accepted: [], rejected: [], totalProfit: 0 };
  const max   = Math.max(...sorted.map(j => j.deadline));
  const slots = new Array(max + 1).fill(null) as (Job | null)[];
  const accepted: Job[] = [], rejected: Job[] = [];
  for (const job of sorted) {
    let placed = false;
    for (let s = job.deadline; s >= 1; s--) {
      if (!slots[s]) { slots[s] = job; accepted.push(job); placed = true; break; }
    }
    if (!placed) rejected.push(job);
  }
  return { accepted, rejected, totalProfit: accepted.reduce((s, j) => s + j.profit, 0) };
}

// ═══════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════
const SAMPLE: Omit<Job, "id">[] = [
  { name: "Lighthouse",       deadline: 2, profit: 10000 },
  { name: "Harbor Bridge",    deadline: 1, profit: 1900  },
  { name: "City Hall",        deadline: 2, profit: 2700  },
  { name: "Museum Wing",      deadline: 1, profit: 2500  },
  { name: "Park Pavilion",    deadline: 3, profit: 1500  },
  { name: "Observatory",      deadline: 3, profit: 11000 },
  { name: "Waterfront Plaza", deadline: 2, profit: 9000  },
  { name: "Grand Library",    deadline: 4, profit: 20000 },
];
const SECTIONS = ["hero", "how-it-works", "algorithm", "optimizer"];
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
//  PARTICLE CANVAS  ─ the beating heart of the "alive" feel
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

    // ── particle definition
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
        // drift + wobble
        p.x += p.vx + Math.sin(frame * 0.009 + p.phase) * 0.18;
        p.y += p.vy;
        p.phase += 0.004;

        // gentle mouse attraction (warm, not repulsion)
        const dx = mx - p.x, dy = my - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14400) { // 120px
          const d = Math.sqrt(d2);
          p.x += (dx / d) * 0.55 * (1 - d / 120);
          p.y += (dy / d) * 0.55 * (1 - d / 120);
        }

        // twinkle
        p.op += p.opDir;
        if (p.op > p.maxOp) { p.op = p.maxOp; p.opDir *= -1; }
        else if (p.op < 0)  { p.op = 0; p.opDir *= -1; }

        // respawn at bottom when above screen
        if (p.y < -30) Object.assign(p, mkParticle(false));

        // ── draw
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
//  MOUSE BLOOM  ─ warm ambient light following cursor
// ═══════════════════════════════════════════════════════════
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
//  SPARKLE BURST  ─ exploding sparks on actions
// ═══════════════════════════════════════════════════════════
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
      document.body.classList.toggle("cur-hover", !!t.closest("button,a,[role=button],input,label"));
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
    "hero": "Home", "how-it-works": "How It Works",
    "algorithm": "Algorithm", "optimizer": "Optimizer",
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
    "Greedy Algorithm", "O(n log n)", "Profit Maximisation", "₹ Rupees",
    "Job Scheduling", "Deadline Assignment", "Optimal Sequence", "Unit Jobs",
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
//  MAGNETIC BUTTON  ─ leans toward cursor like a living thing
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
//  TILT CARD  ─ 3D perspective + moving shine
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
      {/* moving shine layer */}
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
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-sans font-semibold tracking-[0.18em] uppercase"
        style={{ color: "hsl(14 40% 78%)" }}>{label}</label>
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
function CountUp({ to, prefix = "" }: { to: number; prefix?: string }) {
  const ref    = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const ctrl = animate(0, to, {
      duration: 1.8, ease: "easeOut",
      onUpdate: v => { node.textContent = prefix + Math.floor(v).toLocaleString("en-IN"); },
    });
    return () => ctrl.stop();
  }, [inView, to, prefix]);
  return <span ref={ref}>{prefix}0</span>;
}

// ═══════════════════════════════════════════════════════════
//  NAVBAR
// ═══════════════════════════════════════════════════════════
function Navbar({ onScrollTo }: { onScrollTo: (id: string) => void }) {
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
            <span className="font-serif font-bold text-lg" style={{ color: "hsl(120 2% 17%)" }}>JobOptimizer</span>
            <span className="font-sans text-[9px] tracking-widest uppercase" style={{ color: "hsl(60 4% 56%)" }}>Greedy Scheduler</span>
          </div>
        </motion.div>
        <nav className="hidden md:flex items-center gap-8">
          {["How it Works", "Algorithm", "Optimizer"].map((item, i) => {
            const id = ["how-it-works", "algorithm", "optimizer"][i];
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
        <MagneticButton
          onClick={() => onScrollTo("optimizer")}
          className="tc-block px-5 py-2.5 rounded-sm font-sans text-sm font-semibold"
          style={{ color: "hsl(30 40% 97%)", letterSpacing: "0.025em" }}
          data-testid="button-nav-cta">
          Open Tool
        </MagneticButton>
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

  // Mouse-parallax for floating cards
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
    { name: "Grand Library",    profit: 20000, deadline: 4, left: "68%", top: "16%", depth: 22 },
    { name: "Observatory",      profit: 11000, deadline: 3, left: "76%", top: "52%", depth: 14 },
    { name: "Lighthouse",       profit: 10000, deadline: 2, left: "60%", top: "74%", depth: 30 },
    { name: "Waterfront Plaza", profit: 9000,  deadline: 2, left: "84%", top: "34%", depth: 18 },
  ];

  return (
    <section id="hero" ref={sectionRef} className="relative min-h-screen flex items-center overflow-hidden">
      {/* Ambient orbs */}
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

      {/* Parallax floating cards */}
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
                <div className="flex justify-between pl-2">
                  <span className="font-sans text-[11px]" style={{ color: "hsl(60 4% 55%)" }}>DL {f.deadline}</span>
                  <span className="font-sans text-xs font-bold" style={{ color: "hsl(8 51% 50%)" }}>{fmt(f.profit)}</span>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Hero copy */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-28 pb-24 w-full">
        <div className="max-w-3xl">

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-9"
            style={{ background: "hsl(8 51% 51%/0.09)", border: "1px solid hsl(8 51% 51%/0.22)" }}>
            <Zap size={11} style={{ color: "hsl(8 51% 51%)" }} />
            <span className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: "hsl(8 44% 44%)" }}>
              Greedy Algorithm · O(n log n) · ₹ Rupees
            </span>
          </motion.div>

          <div className="overflow-hidden mb-2">
            <motion.h1
              initial={{ y: "102%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.88, delay: 1.3, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif font-bold leading-[1.02]"
              style={{ fontSize: "clamp(3rem,7.5vw,5.6rem)", color: "hsl(120 2% 17%)" }}>
              Schedule Jobs.
            </motion.h1>
          </div>
          <div className="overflow-hidden mb-8">
            <motion.h1
              initial={{ y: "102%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.88, delay: 1.48, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif font-bold italic leading-[1.02] text-gradient"
              style={{ fontSize: "clamp(3rem,7.5vw,5.6rem)" }}>
              Maximise Profit.
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 1.65 }}
            className="font-sans text-lg font-light leading-relaxed mb-12 max-w-xl"
            style={{ color: "hsl(60 4% 44%)" }}>
            Enter your jobs with deadlines and profit values in ₹. The Greedy Scheduler
            finds the mathematically optimal assignment — instantly, right in your browser.
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
              Try the Optimizer
            </MagneticButton>
            <button onClick={() => onScrollTo("how-it-works")}
              className="flex items-center gap-2 font-sans text-sm font-medium group"
              style={{ color: "hsl(60 4% 50%)" }}>
              See how it works
              <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}>
                <ChevronRight size={15} />
              </motion.span>
            </button>
          </motion.div>

          {/* Stat strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.05 }}
            className="grid grid-cols-3 gap-0 mt-20 pt-10"
            style={{ borderTop: "1px solid hsl(38 22% 86%)" }}>
            {[
              { label: "Algorithm",   val: "Greedy"    },
              { label: "Complexity",  val: "O(n log n)" },
              { label: "Currency",    val: "₹ INR"     },
            ].map(s => (
              <div key={s.label} className="flex flex-col gap-1 pr-8">
                <span className="font-serif font-bold text-2xl" style={{ color: "hsl(120 2% 17%)" }}>{s.val}</span>
                <span className="font-sans text-xs tracking-wider uppercase" style={{ color: "hsl(60 4% 58%)" }}>{s.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll hint */}
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
      title: "Add Your Jobs",
      body: "Enter each job with a name, a deadline (1–10 time slots), and its profit in ₹ Rupees. Each job takes exactly one unit of time.",
      tip: "Higher-profit jobs are always prioritised by the algorithm.",
    },
    {
      n: "02", icon: <Zap size={22} strokeWidth={1.5} />,
      title: "Run the Scheduler",
      body: "Click Run Optimization. The algorithm sorts all jobs by profit descending, then greedily assigns each to the latest available slot at or before its deadline.",
      tip: "Runs in O(n log n) time — fast for any realistic input size.",
    },
    {
      n: "03", icon: <BarChart2 size={22} strokeWidth={1.5} />,
      title: "Read the Timeline",
      body: "Accepted jobs appear raised above the copper axis — the provably optimal set. Rejected jobs sit flat below — they couldn't fit without displacing a higher-profit job.",
      tip: "The total ₹ shown is the mathematical maximum achievable.",
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
            <h2 className="font-serif font-bold" style={{ fontSize: "clamp(2rem,4.5vw,3.2rem)", color: "hsl(120 2% 17%)" }}>
              Three steps to the<br /><em>optimal schedule</em>
            </h2>
          </div>
          <p className="font-sans text-sm max-w-xs text-right hidden md:block" style={{ color: "hsl(60 4% 52%)" }}>
            Greedy guarantees maximum profit when each job occupies exactly one time slot.
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
function AlgorithmSection() {
  const pseudoSteps = [
    { n: 1, code: "Sort jobs by profit (descending)",     comment: "Highest value first"        },
    { n: 2, code: "Find maxDeadline across all jobs",     comment: "Determines total slots"      },
    { n: 3, code: "Initialise slots[1..maxDeadline]",     comment: "Empty schedule"              },
    { n: 4, code: "For each job j (sorted):",             comment: ""                            },
    { n: 5, code: "  Find latest free slot s ≤ deadline", comment: "Keeps early slots free"      },
    { n: 6, code: "  If s found → accept, slots[s] = j", comment: "Greedy assignment"           },
    { n: 7, code: "  Else → reject j",                   comment: "No slot available"           },
    { n: 8, code: "Return accepted + total profit",       comment: "Optimal solution"            },
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
                <span className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: "hsl(8 44% 44%)" }}>The Algorithm</span>
              </div>
              <h2 className="font-serif font-bold mb-6" style={{ fontSize: "clamp(2rem,4vw,3rem)", color: "hsl(120 2% 17%)" }}>
                Why Greedy<br /><em>is optimal here</em>
              </h2>
              <p className="font-sans text-sm leading-loose mb-6" style={{ color: "hsl(60 4% 46%)" }}>
                The greedy rule — always pick the highest-profit remaining job and assign it to the
                <strong style={{ color: "hsl(8 51% 48%)" }}> latest available slot</strong> — is provably correct.
                Delaying assignments keeps early slots free for tight-deadline jobs.
              </p>
              <p className="font-sans text-sm leading-loose mb-8" style={{ color: "hsl(60 4% 46%)" }}>
                Any schedule that differs from the greedy result has equal or lower profit — we always
                process jobs in decreasing profit order, so no swap can improve the total.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Time Complexity",  val: "O(n log n)", accent: false },
                  { label: "Space Complexity", val: "O(n)",       accent: false },
                  { label: "Optimal?",         val: "Yes",        accent: true  },
                  { label: "Works for",        val: "Unit jobs",  accent: false },
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

          {/* Pseudo-code terminal */}
          <Reveal delay={0.15}>
            <div className="rounded-sm overflow-hidden"
              style={{ background: "hsl(120 2% 15%)", border: "1px solid hsl(120 2% 22%)", boxShadow: "0 20px 50px hsl(120 2% 10%/0.3)" }}>
              <div className="flex items-center gap-2.5 px-5 py-3.5"
                style={{ borderBottom: "1px solid hsl(120 2% 22%)", background: "hsl(120 2% 13%)" }}>
                {["hsl(0 70% 60%)", "hsl(40 80% 60%)", "hsl(120 50% 55%)"].map((c, i) => (
                  <div key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />
                ))}
                <span className="ml-3 font-sans text-xs" style={{ color: "hsl(60 4% 45%)" }}>greedy-scheduler.ts</span>
              </div>
              <div className="p-6 space-y-1.5">
                {pseudoSteps.map((s, i) => (
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
function OptimizerApp() {
  const burst = useContext(SparkCtx);

  const [jobs,     setJobs    ] = useState<Job[]>([]);
  const [state,    setState   ] = useState<"idle"|"running"|"done">("idle");
  const [result,   setResult  ] = useState<Result|null>(null);
  const [toasts,   setToasts  ] = useState<Toast[]>([]);
  const [shimmerIds, setShimmerIds] = useState<Set<string>>(new Set());
  const [jobName,  setJobName ] = useState("");
  const [deadline, setDeadline] = useState("");
  const [profit,   setProfit  ] = useState("");

  const addJobBtnRef = useRef<HTMLDivElement>(null);
  const runBtnRef    = useRef<HTMLDivElement>(null);

  const toast = useCallback((title: string, sub?: string) => {
    const id = uid();
    setToasts(p => [...p, { id, title, sub }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3600);
  }, []);

  const addJob = (e: FormEvent) => {
    e.preventDefault();
    if (!jobName.trim() || !deadline || !profit) return;
    const d = parseInt(deadline), p = parseInt(profit);
    if (isNaN(d) || isNaN(p) || d < 1 || d > 10 || p < 0) return;
    const job: Job = { id: uid(), name: jobName.trim(), deadline: d, profit: p };
    setJobs(prev => [...prev, job]);
    setState("idle"); setResult(null);
    setJobName(""); setDeadline(""); setProfit("");
    toast("Job added", job.name);
    // burst sparks from button
    if (addJobBtnRef.current) {
      const r = addJobBtnRef.current.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 12);
    }
  };

  const deleteJob = (id: string) => { setJobs(p => p.filter(j => j.id !== id)); setState("idle"); setResult(null); };

  const loadSample = () => {
    setJobs(SAMPLE.map(j => ({ ...j, id: uid() })));
    setState("idle"); setResult(null);
    toast("Sample data loaded", "8 architecture projects");
  };

  const optimize = (e: React.MouseEvent) => {
    if (!jobs.length) return;
    setState("running");
    burst(e.clientX, e.clientY, 18);
    setTimeout(() => {
      const res = runGreedy(jobs);
      setResult(res); setState("done");
      toast("Optimization complete", `${fmt(res.totalProfit)} total profit`);
      // shimmer sweep on accepted cards after short delay
      setTimeout(() => {
        const ids = new Set(res.accepted.map(j => j.id));
        setShimmerIds(ids);
        setTimeout(() => setShimmerIds(new Set()), 1200);
      }, 400);
    }, 950);
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
          <h2 className="font-serif font-bold mb-4" style={{ fontSize: "clamp(2rem,4.5vw,3.2rem)", color: "hsl(120 2% 17%)" }}>
            Build your schedule
          </h2>
          <p className="font-sans text-sm max-w-sm mx-auto" style={{ color: "hsl(60 4% 52%)" }}>
            Add jobs, hit Run, and see the maximum-profit schedule instantly.
          </p>
        </Reveal>

        <Reveal>
          <div className="rounded-sm overflow-hidden flex flex-col md:flex-row"
            style={{ boxShadow: "0 8px 28px hsl(35 22% 58%/.14), 0 24px 56px hsl(35 20% 58%/.08)", border: "1px solid hsl(38 22% 86%)" }}>

            {/* ── Left terracotta pane ── */}
            <div className="w-full md:w-[32%] flex flex-col relative"
              style={{ background: "linear-gradient(165deg,hsl(14 38% 56%) 0%,hsl(10 44% 48%) 60%,hsl(8 50% 43%) 100%)", boxShadow: "4px 0 28px hsl(8 51% 28%/.16)" }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0.25'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23g)' opacity='0.065'/%3E%3C/svg%3E")`, backgroundSize: "200px 200px", mixBlendMode: "overlay" as React.CSSProperties["mixBlendMode"] }} />
              <div className="absolute top-0 left-0 right-0 h-[1.5px] pointer-events-none"
                style={{ background: "linear-gradient(90deg,transparent,hsl(14 60% 72%/0.5),transparent)" }} />

              <div className="p-8 flex-shrink-0 relative z-10">
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers size={14} style={{ color: "hsl(14 55% 82%)" }} strokeWidth={1.5} />
                    <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: "hsl(14 40% 78%)" }}>Input</span>
                  </div>
                  <h3 className="font-serif text-3xl font-bold leading-none" style={{ color: "hsl(30 40% 97%)", textShadow: "0 2px 8px hsl(8 51% 25%/.3)" }}>
                    Add a Job
                  </h3>
                </div>

                <form onSubmit={addJob} className="space-y-4">
                  <DebossedInput label="Job Name"  type="text"   placeholder="e.g. Grand Library" value={jobName}  onChange={setJobName}  tabIndex={1} />
                  <div className="grid grid-cols-2 gap-3">
                    <DebossedInput label="Deadline" type="number" placeholder="1–10"               value={deadline} onChange={setDeadline} tabIndex={2} min="1" max="10" />
                    <DebossedInput label="Profit (₹)" type="number" placeholder="0"               value={profit}   onChange={setProfit}   tabIndex={3} min="0" />
                  </div>
                  <div ref={addJobBtnRef}>
                    <MagneticButton type="submit" tabIndex={4}
                      data-testid="button-add-job"
                      className="w-full py-4 mt-1 font-serif text-base font-semibold tracking-wide rounded-sm"
                      style={{
                        background: "linear-gradient(180deg,hsl(30 40% 97%) 0%,hsl(30 25% 93%) 100%)",
                        color: "hsl(8 51% 44%)",
                        boxShadow: "0 3px 8px hsl(8 51% 22%/.35),0 6px 16px hsl(8 51% 22%/.2),0 1px 0 hsl(0 0%100%/.9) inset,0 -2px 0 hsl(8 40% 38%/.28) inset",
                        letterSpacing: "0.04em",
                      }}>
                      Add Job
                    </MagneticButton>
                  </div>
                </form>
              </div>

              {/* Job list */}
              <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-2 relative z-10">
                {jobs.length > 0 && (
                  <p className="text-[10px] font-sans font-semibold tracking-[0.15em] uppercase mb-3"
                    style={{ color: "hsl(14 40% 76%)" }}>
                    {jobs.length} job{jobs.length !== 1 ? "s" : ""} queued
                  </p>
                )}
                <AnimatePresence>
                  {jobs.map(job => (
                    <motion.div key={job.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.14 } }}
                      className="flex items-center justify-between px-3 py-2.5 rounded-sm"
                      style={{ background: "hsl(14 35% 52%/.32)", boxShadow: "inset 0 1px 0 hsl(14 55% 70%/.2),inset 0 -1px 0 hsl(8 45% 28%/.18)" }}
                      data-testid={`card-job-${job.id}`}>
                      <div className="flex flex-col min-w-0 mr-2">
                        <span className="font-serif font-semibold text-sm truncate" style={{ color: "hsl(30 35% 96%)" }}>{job.name}</span>
                        <div className="flex gap-3 text-[11px] font-sans mt-0.5" style={{ color: "hsl(14 35% 80%)" }}>
                          <span>DL {job.deadline}</span>
                          <span>{fmt(job.profit)}</span>
                        </div>
                      </div>
                      <button onClick={() => deleteJob(job.id)} className="flex-shrink-0 p-1 hover:opacity-60 transition-opacity"
                        style={{ color: "hsl(14 40% 82%)" }} data-testid={`button-delete-${job.id}`}>
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Right glass pane ── */}
            <div className="w-full md:w-[68%] flex flex-col glass">
              {/* Action bar */}
              <div className="flex items-center flex-wrap gap-3 px-8 py-5 flex-shrink-0"
                style={{ borderBottom: "1px solid hsl(38 22% 88%/.8)" }}>
                <div ref={runBtnRef}>
                  <MagneticButton
                    onClick={optimize}
                    disabled={!jobs.length || state === "running"}
                    data-testid="button-run-optimization"
                    className="flex items-center gap-2.5 px-6 py-3 rounded-sm font-serif font-semibold text-sm disabled:opacity-35 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(180deg,hsl(10 50% 54%) 0%,hsl(8 52% 47%) 100%)",
                      color: "hsl(30 40% 97%)",
                      boxShadow: "0 2px 6px hsl(8 51% 22%/.32),0 5px 14px hsl(8 51% 22%/.16),0 1px 0 hsl(14 60% 68%/.4) inset,0 -2px 0 hsl(8 50% 28%/.3) inset",
                    }}>
                    <Play size={13} fill="currentColor" />Run Optimization
                  </MagneticButton>
                </div>

                <MagneticButton onClick={loadSample} data-testid="button-load-sample"
                  className="px-5 py-3 font-sans text-sm font-medium rounded-sm hover:bg-white/60 transition-all"
                  style={{ color: "hsl(60 4% 53%)", border: "1px solid hsl(38 22% 84%)" }}>
                  Load Sample Data
                </MagneticButton>

                {state === "done" && (
                  <button onClick={() => { setState("idle"); setResult(null); }}
                    className="ml-auto px-4 py-2 font-sans text-xs font-medium rounded-sm hover:bg-white/50 transition-all"
                    style={{ color: "hsl(60 4% 60%)", border: "1px solid hsl(38 20% 88%)" }}>
                    Reset
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 px-8 py-8 overflow-y-auto min-h-[440px] relative">

                {/* Empty */}
                {!jobs.length && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
                      className="w-16 h-16 rounded-sm flex items-center justify-center"
                      style={{ background: "hsl(40 16% 92%)", boxShadow: "inset 0 2px 6px hsl(35 22% 60%/.14),inset 0 -1px 0 hsl(0 0% 100%/.8)" }}>
                      <BarChart2 size={26} strokeWidth={1.2} style={{ color: "hsl(60 4% 64%)" }} />
                    </motion.div>
                    <p className="font-serif text-xl" style={{ color: "hsl(120 2% 17%/.3)" }}>Add jobs to begin</p>
                    <p className="font-sans text-xs" style={{ color: "hsl(60 4% 58%/.65)" }}>or click Load Sample Data for a quick demo</p>
                  </div>
                )}

                {/* Idle grid */}
                {!!jobs.length && state === "idle" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {jobs.map(job => (
                        <motion.div key={job.id}
                          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                          className="ceramic rounded-sm p-5" data-testid={`card-preview-${job.id}`}>
                          <h3 className="font-serif text-base font-semibold mb-3" style={{ color: "hsl(120 2% 17%)" }}>{job.name}</h3>
                          <div className="flex justify-between items-center font-sans text-xs">
                            <span style={{ color: "hsl(60 4% 54%)" }}>Deadline <strong style={{ color: "hsl(120 2% 22%)" }}>{job.deadline}</strong></span>
                            <span className="font-bold text-sm" style={{ color: "hsl(8 51% 50%)" }}>{fmt(job.profit)}</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Skeleton */}
                {state === "running" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {[...Array(Math.min(jobs.length, 6))].map((_, i) => (
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
                      <span className="font-sans text-xs" style={{ color: "hsl(60 4% 56%)" }}>Computing optimal schedule…</span>
                    </div>
                  </div>
                )}

                {/* Results */}
                {state === "done" && result && (
                  <div className="flex flex-col gap-8">

                    {/* Stats */}
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Total Profit",  value: fmt(result.totalProfit),                      accent: true  },
                        { label: "Jobs Accepted", value: `${result.accepted.length} / ${jobs.length}`, accent: false },
                        { label: "Jobs Rejected", value: String(result.rejected.length),               accent: false },
                      ].map(s => (
                        <TiltCard key={s.label} className="ceramic rounded-sm p-4">
                          <p className="font-sans text-[10px] font-semibold tracking-[0.14em] uppercase mb-1.5" style={{ color: "hsl(60 4% 58%)" }}>{s.label}</p>
                          <p className="font-serif text-xl font-bold" style={{ color: s.accent ? "hsl(8 51% 47%)" : "hsl(120 2% 17%)" }}>{s.value}</p>
                        </TiltCard>
                      ))}
                    </motion.div>

                    {/* Accepted */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <motion.div className="w-2 h-2 rounded-full"
                          style={{ background: "hsl(8 51% 51%)" }}
                          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.7, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }} />
                        <span className="font-sans text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: "hsl(8 40% 55%)" }}>
                          Accepted — {result.accepted.length} job{result.accepted.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-3 pb-8">
                        {result.accepted.map((job, i) => (
                          <motion.div key={job.id}
                            initial={{ y: -22, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: i * 0.07, type: "spring", stiffness: 280, damping: 22 }}
                            className={`rounded-sm overflow-hidden min-w-[148px] relative ${shimmerIds.has(job.id) ? "shimmer-sweep" : ""}`}
                            style={{
                              background: "linear-gradient(165deg,hsl(30 28% 99%) 0%,hsl(30 22% 96%) 100%)",
                              border: "1px solid hsl(38 22% 87%)",
                              boxShadow: "0 4px 8px hsl(35 25% 58%/.22),0 10px 24px hsl(35 22% 55%/.14),0 20px 38px hsl(35 20% 55%/.07),0 1px 0 hsl(0 0% 100%/.95) inset",
                            }}
                            data-testid={`card-accepted-${job.id}`}>
                            <div className="absolute left-0 top-0 bottom-0 w-[3px]"
                              style={{ background: "linear-gradient(180deg,hsl(10 50% 56%),hsl(8 52% 44%))" }} />
                            <div className="absolute top-0 left-[3px] right-0 h-[1px]" style={{ background: "hsl(38 30% 82%)" }} />
                            <div className="p-4 pl-5">
                              <h4 className="font-serif font-bold text-sm leading-tight mb-2.5" style={{ color: "hsl(120 2% 17%)" }}>{job.name}</h4>
                              <div className="flex items-center justify-between font-sans text-xs">
                                <span className="px-1.5 py-0.5 rounded-sm font-medium"
                                  style={{ background: "hsl(38 16% 92%)", color: "hsl(60 4% 48%)", border: "1px solid hsl(38 16% 86%)" }}>
                                  DL {job.deadline}
                                </span>
                                <span className="font-bold text-sm" style={{ color: "hsl(8 51% 49%)" }}>{fmt(job.profit)}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Copper axis */}
                      <div className="relative mb-7" style={{ height: 18 }}>
                        <motion.div className="absolute left-0 right-0"
                          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          style={{
                            top: 7, height: 3, borderRadius: 2, transformOrigin: "left",
                            background: "linear-gradient(90deg,hsl(38 25% 80%) 0%,hsl(38 28% 74%) 50%,hsl(38 25% 82%) 100%)",
                            boxShadow: "0 1px 0 hsl(0 0% 100%/.6) inset,0 1px 4px hsl(35 22% 55%/.18)",
                          }} />
                        {[...Array(9)].map((_, i) => (
                          <div key={i} className="absolute" style={{
                            left: `${(i / 8) * 100}%`, top: 2, width: 1.5, height: 14,
                            background: "hsl(38 22% 72%)", borderRadius: 1, transform: "translateX(-50%)",
                          }} />
                        ))}
                      </div>

                      {/* Rejected */}
                      {result.rejected.length > 0 && (
                        <>
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full" style={{ background: "hsl(60 4% 66%)" }} />
                            <span className="font-sans text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: "hsl(60 4% 60%)" }}>
                              Rejected — {result.rejected.length} job{result.rejected.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {result.rejected.map((job, i) => (
                              <motion.div key={job.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 0.5, y: 0 }}
                                transition={{ delay: result.accepted.length * 0.07 + i * 0.06, type: "spring" }}
                                className="rounded-sm min-w-[148px] p-4"
                                style={{ background: "hsl(40 10% 90%)", border: "1px solid hsl(38 10% 84%)" }}
                                data-testid={`card-rejected-${job.id}`}>
                                <h4 className="font-serif font-semibold text-sm leading-tight mb-2" style={{ color: "hsl(60 4% 42%)" }}>{job.name}</h4>
                                <div className="flex items-center justify-between font-sans text-xs">
                                  <span style={{ color: "hsl(60 4% 56%)" }}>DL {job.deadline}</span>
                                  <span style={{ color: "hsl(60 4% 48%)", fontWeight: 500 }}>{fmt(job.profit)}</span>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </>
                      )}
                      {result.rejected.length === 0 && (
                        <p className="font-sans text-xs italic" style={{ color: "hsl(60 4% 62%)" }}>All jobs were accepted — perfect schedule.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 pointer-events-none">
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
              <span className="font-serif font-bold text-lg" style={{ color: "hsl(120 2% 17%)" }}>JobOptimizer</span>
            </div>
            <p className="font-sans text-xs leading-relaxed" style={{ color: "hsl(60 4% 54%)" }}>
              A premium Greedy Job Scheduling tool. All profits in ₹ Indian Rupees. Runs entirely in your browser — no server, no data sent anywhere.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-16 gap-y-3">
            {[
              { label: "Algorithm",   val: "Greedy"            },
              { label: "Complexity",  val: "O(n log n)"        },
              { label: "Currency",    val: "₹ Indian Rupees"  },
              { label: "Runs in",     val: "Your browser"     },
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
export default function Optimizer() {
  const [activeSection, setActiveSection] = useState("hero");
  const [sparks, setSparks] = useState<Spark[]>([]);

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

  // Section observer for side nav
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
        <Navbar onScrollTo={scrollTo} />
        <Hero onScrollTo={scrollTo} />
        <Marquee />
        <HowItWorks />
        <Marquee reverse />
        <AlgorithmSection />
        <OptimizerApp />
        <Footer />
      </div>
    </SparkCtx.Provider>
  );
}
