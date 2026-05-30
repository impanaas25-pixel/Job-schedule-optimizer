import { useState, useRef, useEffect, useCallback, FormEvent } from "react";
import {
  motion, AnimatePresence, useMotionValue, useTransform,
  useSpring, useInView, animate,
} from "framer-motion";
import {
  X, Check, Play, ArrowDown, Zap, BarChart2, Clock,
  Trophy, ChevronRight, Layers, Info, Minus,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Job    = { id: string; name: string; deadline: number; profit: number };
type Result = { accepted: Job[]; rejected: Job[]; totalProfit: number };
type Toast  = { id: string; title: string; sub?: string };

// ─── Algorithm ────────────────────────────────────────────────────────────────
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

// ─── Sample ───────────────────────────────────────────────────────────────────
const SAMPLE: Omit<Job, "id">[] = [
  { name: "Lighthouse",      deadline: 2, profit: 10000 },
  { name: "Harbor Bridge",   deadline: 1, profit: 1900  },
  { name: "City Hall",       deadline: 2, profit: 2700  },
  { name: "Museum Wing",     deadline: 1, profit: 2500  },
  { name: "Park Pavilion",   deadline: 3, profit: 1500  },
  { name: "Observatory",     deadline: 3, profit: 11000 },
  { name: "Waterfront Plaza",deadline: 2, profit: 9000  },
  { name: "Grand Library",   deadline: 4, profit: 20000 },
];

const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const SECTIONS = ["hero", "how-it-works", "algorithm", "optimizer"];

// ─── Custom Cursor ────────────────────────────────────────────────────────────
function Cursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const dot  = { x: useMotionValue(0), y: useMotionValue(0) };
  const ring = { x: useSpring(0, { stiffness: 180, damping: 22 }),
                 y: useSpring(0, { stiffness: 180, damping: 22 }) };

  useEffect(() => {
    const move = (e: MouseEvent) => {
      dot.x.set(e.clientX);  dot.y.set(e.clientY);
      ring.x.set(e.clientX); ring.y.set(e.clientY);
    };
    const hover = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      const isHover = el.closest("button,a,[role=button],input,label");
      document.body.classList.toggle("cursor-hover", !!isHover);
    };
    const down = () => document.body.classList.add("cursor-click");
    const up   = () => document.body.classList.remove("cursor-click");
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", hover);
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", hover);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  return (
    <>
      <motion.div id="cursor-dot"  style={{ x: dot.x,  y: dot.y }} />
      <motion.div id="cursor-ring" style={{ x: ring.x, y: ring.y }} />
    </>
  );
}

// ─── Entry Veil ───────────────────────────────────────────────────────────────
function EntryVeil() {
  return (
    <motion.div
      id="entry-veil"
      initial={{ scaleY: 1 }}
      animate={{ scaleY: 0 }}
      transition={{ duration: 1.1, delay: 0.25, ease: [0.76, 0, 0.24, 1] }}
    />
  );
}

// ─── Side Navigation ──────────────────────────────────────────────────────────
function SideNav({ active }: { active: string }) {
  const labels: Record<string, string> = {
    "hero":         "Home",
    "how-it-works": "How It Works",
    "algorithm":    "Algorithm",
    "optimizer":    "Optimizer",
  };
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return (
    <div className="fixed right-7 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4 items-center">
      {SECTIONS.map(s => (
        <button
          key={s}
          title={labels[s]}
          onClick={() => scrollTo(s)}
          className="side-dot w-2 h-2 rounded-full transition-all duration-200 group relative"
          style={{
            background: active === s ? "hsl(8 51% 51%)" : "hsl(38 20% 72%)",
            transform: active === s ? "scale(1.6)" : "scale(1)",
          }}
          data-testid={`nav-dot-${s}`}
        >
          <span className="absolute right-6 top-1/2 -translate-y-1/2 whitespace-nowrap font-sans text-[10px] font-semibold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity pr-1"
            style={{ color: "hsl(60 4% 44%)" }}>
            {labels[s]}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Marquee ──────────────────────────────────────────────────────────────────
function Marquee({ reverse = false }: { reverse?: boolean }) {
  const items = ["Greedy Algorithm", "O(n log n)", "Profit Maximisation", "₹ Rupees", "Job Scheduling", "Deadline Assignment", "Optimal Sequence", "Greedy Algorithm", "O(n log n)", "Profit Maximisation", "₹ Rupees", "Job Scheduling", "Deadline Assignment", "Optimal Sequence"];
  return (
    <div className="marquee-wrap py-4 overflow-hidden" style={{
      borderTop: "1px solid hsl(38 22% 87%)",
      borderBottom: "1px solid hsl(38 22% 87%)",
      background: "hsl(30 22% 97%)",
    }}>
      <div className={`marquee-track${reverse ? " marquee-track-rev" : ""}`}>
        {items.concat(items).map((item, i) => (
          <span key={i} className="flex items-center gap-5 px-5">
            <span className="font-sans text-xs font-semibold tracking-[0.18em] uppercase"
              style={{ color: "hsl(60 4% 52%)", whiteSpace: "nowrap" }}>
              {item}
            </span>
            <span style={{ color: "hsl(8 51% 58%)", fontSize: 10 }}>◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Count-up Number ──────────────────────────────────────────────────────────
function CountUp({ to, prefix = "", suffix = "", decimals = 0 }: { to: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref   = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const ctrl = animate(0, to, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate(v) {
        node.textContent = prefix + (decimals ? v.toFixed(decimals) : Math.floor(v).toLocaleString("en-IN")) + suffix;
      },
    });
    return () => ctrl.stop();
  }, [inView, to, prefix, suffix, decimals]);
  return <span ref={ref}>{prefix}0{suffix}</span>;
}

// ─── 3D Tilt Card ─────────────────────────────────────────────────────────────
function TiltCard({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref   = useRef<HTMLDivElement>(null);
  const mx    = useMotionValue(0), my = useMotionValue(0);
  const rX    = useTransform(my, [-0.5, 0.5], [ 7, -7]);
  const rY    = useTransform(mx, [-0.5, 0.5], [-7,  7]);
  const srX   = useSpring(rX, { stiffness: 280, damping: 28 });
  const srY   = useSpring(rY, { stiffness: 280, damping: 28 });
  const shine = useMotionValue(0);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width  - 0.5);
    my.set((e.clientY - r.top)  / r.height - 0.5);
    shine.set((e.clientX - r.left) / r.width * 100);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: srX, rotateY: srY, transformPerspective: 900, ...style }}
      className={`relative overflow-hidden ${className ?? ""}`}
    >
      {/* Shine */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: useTransform(shine, v =>
            `radial-gradient(ellipse 60% 50% at ${v}% 30%, hsl(0 0% 100%/0.12), transparent)`),
        }}
      />
      {children}
    </motion.div>
  );
}

// ─── Reveal wrapper ───────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className, y = 32 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Debossed Input ───────────────────────────────────────────────────────────
function DebossedInput({ label, type, placeholder, value, onChange, tabIndex, min, max }: {
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
            ? "inset 0 3px 9px hsl(35 28%60%/0.24),inset 0 1px 3px hsl(35 28%60%/0.16),inset 0 -1px 0 hsl(0 0%100%/0.65)"
            : "inset 0 2px 6px hsl(35 28%60%/0.18),inset 0 1px 2px hsl(35 28%60%/0.12),inset 0 -1px 0 hsl(0 0%100%/0.55)",
        }}>
        <input
          type={type} placeholder={placeholder} value={value} min={min} max={max}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          tabIndex={tabIndex}
          className="w-full bg-transparent py-3 px-3 font-sans text-sm focus:outline-none placeholder:text-[hsl(60_4%_60%)]"
          style={{ color: "hsl(120 2% 17%)" }}
          data-testid={`input-${label.toLowerCase().replace(/\s+/g,"-")}`}
        />
        <div className="absolute bottom-0 left-0 right-0 transition-all duration-300"
          style={{ height: focused ? "2px" : "1.5px", background: focused ? "hsl(8 51% 51%)" : "hsl(38 25% 76%)" }} />
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
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
        background: scrolled ? "hsl(30 25%98%/0.9)" : "transparent",
        backdropFilter: scrolled ? "blur(24px) saturate(1.6)" : "none",
        borderBottom: scrolled ? "1px solid hsl(38 25%87%/0.7)" : "1px solid transparent",
        boxShadow: scrolled ? "0 2px 24px hsl(35 22%60%/0.07)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-8 h-[68px] flex items-center justify-between">
        <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.02 }}>
          <div className="w-8 h-8 rounded-sm tc-block flex items-center justify-center flex-shrink-0">
            <Layers size={15} style={{ color: "hsl(30 40%97%)" }} strokeWidth={2} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-serif font-bold text-lg" style={{ color: "hsl(120 2%17%)" }}>JobOptimizer</span>
            <span className="font-sans text-[9px] tracking-widest uppercase" style={{ color: "hsl(60 4%56%)" }}>Greedy Scheduler</span>
          </div>
        </motion.div>

        <nav className="hidden md:flex items-center gap-8">
          {["How it Works", "Algorithm", "Optimizer"].map((item, i) => {
            const id = ["how-it-works", "algorithm", "optimizer"][i];
            return (
              <button key={item} onClick={() => onScrollTo(id)}
                className="font-sans text-sm font-medium transition-all hover:opacity-100 relative group"
                style={{ color: "hsl(60 4%46%)" }}>
                {item}
                <span className="absolute -bottom-0.5 left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
                  style={{ background: "hsl(8 51%51%)" }} />
              </button>
            );
          })}
        </nav>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96, y: 1 }}
          onClick={() => onScrollTo("optimizer")}
          className="tc-block px-5 py-2.5 rounded-sm font-sans text-sm font-semibold"
          style={{ color: "hsl(30 40%97%)", letterSpacing: "0.025em" }}
          data-testid="button-nav-cta">
          Open Tool
        </motion.button>
      </div>
    </motion.nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ onScrollTo }: { onScrollTo: (id: string) => void }) {
  const floaters = [
    { name:"Grand Library",    profit:20000, deadline:4, x:"68%", y:"16%", d:0   },
    { name:"Observatory",      profit:11000, deadline:3, x:"76%", y:"52%", d:0.3 },
    { name:"Lighthouse",       profit:10000, deadline:2, x:"60%", y:"74%", d:0.6 },
    { name:"Waterfront Plaza", profit:9000,  deadline:2, x:"84%", y:"34%", d:0.9 },
  ];

  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="orb" style={{ width:700, height:700, top:"-15%", right:"-8%", background:"radial-gradient(circle, hsl(8 51%51%/0.07) 0%,transparent 70%)", animationDuration:"16s" }} />
        <div className="orb" style={{ width:450, height:450, bottom:"0%", left:"8%",  background:"radial-gradient(circle, hsl(38 30%72%/0.1) 0%,transparent 70%)",  animationDuration:"20s", animationDelay:"4s" }} />
        <div className="orb" style={{ width:320, height:320, top:"42%", left:"32%",  background:"radial-gradient(circle, hsl(14 42%60%/0.05) 0%,transparent 70%)", animationDuration:"13s", animationDelay:"2s" }} />
      </div>

      {/* Floating sample cards (desktop) */}
      <div className="absolute inset-0 pointer-events-none hidden lg:block">
        {floaters.map((f, i) => (
          <motion.div key={i}
            className="absolute ceramic rounded-sm p-4 w-48"
            style={{ left: f.x, top: f.y }}
            initial={{ opacity:0, y:24 }}
            animate={{ opacity:0.88, y:[0,-12,0] }}
            transition={{
              opacity:{ duration:0.5, delay:f.d+1.3 },
              y:{ duration:4+i, delay:f.d+1.3, repeat:Infinity, repeatType:"reverse", ease:"easeInOut" },
            }}>
            <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-sm"
              style={{ background:"linear-gradient(180deg,hsl(10 50%56%),hsl(8 52%44%))" }} />
            <p className="font-serif font-semibold text-sm pl-2 mb-1.5" style={{ color:"hsl(120 2%17%)" }}>{f.name}</p>
            <div className="flex justify-between pl-2">
              <span className="font-sans text-[11px]" style={{ color:"hsl(60 4%55%)" }}>DL {f.deadline}</span>
              <span className="font-sans text-xs font-bold" style={{ color:"hsl(8 51%50%)" }}>{fmt(f.profit)}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Hero copy */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-28 pb-24 w-full">
        <div className="max-w-3xl">

          <motion.div
            initial={{ opacity:0, y:14 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.5, delay:1.2 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-9"
            style={{ background:"hsl(8 51%51%/0.09)", border:"1px solid hsl(8 51%51%/0.22)" }}>
            <Zap size={11} style={{ color:"hsl(8 51%51%)" }} />
            <span className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color:"hsl(8 44%44%)" }}>
              Greedy Algorithm · O(n log n) · ₹ Rupees
            </span>
          </motion.div>

          <div className="overflow-hidden mb-3">
            <motion.h1
              initial={{ y:"100%" }}
              animate={{ y:0 }}
              transition={{ duration:0.85, delay:1.3, ease:[0.22,1,0.36,1] }}
              className="font-serif font-bold leading-[1.0]"
              style={{ fontSize:"clamp(3rem,7.5vw,5.4rem)", color:"hsl(120 2%17%)" }}>
              Schedule Jobs.
            </motion.h1>
          </div>
          <div className="overflow-hidden mb-8">
            <motion.h1
              initial={{ y:"100%" }}
              animate={{ y:0 }}
              transition={{ duration:0.85, delay:1.45, ease:[0.22,1,0.36,1] }}
              className="font-serif font-bold italic leading-[1.0] text-gradient"
              style={{ fontSize:"clamp(3rem,7.5vw,5.4rem)" }}>
              Maximise Profit.
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity:0, y:16 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.65, delay:1.6 }}
            className="font-sans text-lg font-light leading-relaxed mb-12 max-w-xl"
            style={{ color:"hsl(60 4%44%)" }}>
            Enter your jobs with deadlines and profit values in ₹. The Greedy Scheduler
            finds the mathematically optimal assignment that maximises total revenue — instantly,
            right in your browser.
          </motion.p>

          <motion.div
            initial={{ opacity:0, y:12 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.5, delay:1.75 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <motion.button
              whileHover={{ scale:1.02, y:-1 }}
              whileTap={{ scale:0.97, y:1 }}
              onClick={() => onScrollTo("optimizer")}
              className="tc-block flex items-center gap-3 px-8 py-4 rounded-sm font-serif font-semibold text-base"
              style={{ color:"hsl(30 40%97%)", letterSpacing:"0.025em" }}
              data-testid="button-hero-cta">
              <Play size={15} fill="currentColor" />
              Try the Optimizer
            </motion.button>
            <button onClick={() => onScrollTo("how-it-works")}
              className="flex items-center gap-2 font-sans text-sm font-medium group"
              style={{ color:"hsl(60 4%50%)" }}>
              See how it works
              <motion.span animate={{ x:[0,3,0] }} transition={{ repeat:Infinity, duration:1.6, ease:"easeInOut" }}>
                <ChevronRight size={15} />
              </motion.span>
            </button>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            transition={{ delay:2.0 }}
            className="grid grid-cols-3 gap-0 mt-20 pt-10"
            style={{ borderTop:"1px solid hsl(38 22%86%)" }}>
            {[
              { label:"Algorithm",        val:"Greedy",     isString:true  },
              { label:"Complexity",       val:"O(n log n)", isString:true  },
              { label:"Currency",         val:"₹ INR",      isString:true  },
            ].map(s => (
              <div key={s.label} className="flex flex-col gap-1 pr-8">
                <span className="font-serif font-bold text-2xl" style={{ color:"hsl(120 2%17%)" }}>{s.val}</span>
                <span className="font-sans text-xs tracking-wider uppercase" style={{ color:"hsl(60 4%58%)" }}>{s.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-10 left-8 flex flex-col items-center gap-2 z-10"
        initial={{ opacity:0 }}
        animate={{ opacity:1 }}
        transition={{ delay:2.2 }}>
        <span className="font-sans text-[10px] tracking-[0.2em] uppercase" style={{ color:"hsl(60 4%58%)" }}>Scroll</span>
        <motion.div animate={{ y:[0,7,0] }} transition={{ repeat:Infinity, duration:1.8, ease:"easeInOut" }}>
          <ArrowDown size={14} style={{ color:"hsl(60 4%58%)" }} />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      n:"01", icon:<Layers size={22} strokeWidth={1.5} />,
      title:"Add Your Jobs",
      body:"Enter each job with a name, a deadline (1–10 time slots), and its profit in ₹ Rupees. You can add any number of jobs. Each job takes exactly one unit of time.",
      tip:"Higher-profit jobs are always prioritised by the algorithm.",
    },
    {
      n:"02", icon:<Zap size={22} strokeWidth={1.5} />,
      title:"Run the Scheduler",
      body:"Click Run Optimization. The algorithm sorts all jobs by profit descending, then greedily assigns each to the latest available slot at or before its deadline.",
      tip:"Runs in O(n log n) time — fast for any realistic input size.",
    },
    {
      n:"03", icon:<BarChart2 size={22} strokeWidth={1.5} />,
      title:"Read the Timeline",
      body:"Accepted jobs appear raised above the copper axis — the provably optimal set. Rejected jobs sit below, flat and muted: they couldn't fit without displacing a higher-profit job.",
      tip:"The total ₹ shown is the mathematical maximum achievable.",
    },
  ];
  return (
    <section id="how-it-works" className="py-32 px-8">
      <div className="max-w-7xl mx-auto">

        <Reveal className="mb-6">
          <hr className="section-rule" />
        </Reveal>

        <Reveal className="flex items-end justify-between mb-20 mt-8 gap-6 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
              style={{ background:"hsl(8 51%51%/0.08)", border:"1px solid hsl(8 51%51%/0.2)" }}>
              <Info size={11} style={{ color:"hsl(8 51%51%)" }} />
              <span className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color:"hsl(8 44%44%)" }}>How it works</span>
            </div>
            <h2 className="font-serif font-bold" style={{ fontSize:"clamp(2rem,4.5vw,3.2rem)", color:"hsl(120 2%17%)" }}>
              Three steps to the<br /><em>optimal schedule</em>
            </h2>
          </div>
          <p className="font-sans text-sm max-w-xs text-right hidden md:block" style={{ color:"hsl(60 4%52%)" }}>
            The Greedy approach guarantees maximum profit when each job occupies exactly one time slot.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
          {/* Connector */}
          <div className="hidden md:block absolute" style={{ top:52, left:"calc(16.67% + 20px)", right:"calc(16.67% + 20px)", height:1,
            background:"linear-gradient(90deg,transparent,hsl(38 25%80%),hsl(38 22%78%),transparent)", pointerEvents:"none" }} />

          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.1}>
              <TiltCard className="ceramic rounded-sm h-full">
                <div className="p-8">
                  {/* Large watermark number */}
                  <div className="absolute top-2 right-4 font-serif font-bold select-none pointer-events-none"
                    style={{ fontSize:80, lineHeight:1, color:"hsl(8 51%51%/0.07)" }}>
                    {step.n}
                  </div>
                  <div className="w-11 h-11 rounded-sm flex items-center justify-center mb-7 relative z-10"
                    style={{ background:"hsl(8 51%51%/0.1)", border:"1px solid hsl(8 51%51%/0.2)", color:"hsl(8 51%48%)" }}>
                    {step.icon}
                  </div>
                  <h3 className="font-serif text-xl font-bold mb-3 relative z-10" style={{ color:"hsl(120 2%17%)" }}>{step.title}</h3>
                  <p className="font-sans text-sm leading-relaxed mb-5 relative z-10" style={{ color:"hsl(60 4%46%)" }}>{step.body}</p>
                  <div className="px-3 py-2.5 rounded-sm relative z-10"
                    style={{ background:"hsl(38 16%93%)", border:"1px solid hsl(38 16%87%)" }}>
                    <p className="font-sans text-xs leading-relaxed" style={{ color:"hsl(60 4%54%)" }}>{step.tip}</p>
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

// ─── Algorithm Section ────────────────────────────────────────────────────────
function AlgorithmSection() {
  const pseudoSteps = [
    { n:1, code:"Sort jobs by profit (descending)", comment:"Highest value first" },
    { n:2, code:"Find maxDeadline across all jobs", comment:"Determines total slots" },
    { n:3, code:"Initialise slots[1..maxDeadline] = null", comment:"Empty schedule" },
    { n:4, code:"For each job j (sorted):", comment:"" },
    { n:5, code:"  Find latest free slot s ≤ j.deadline", comment:"Latest = keeps early slots free" },
    { n:6, code:"  If s found → accept j, slots[s] = j", comment:"Greedy assignment" },
    { n:7, code:"  Else → reject j", comment:"No slot available" },
    { n:8, code:"Return accepted jobs & total profit", comment:"Optimal solution" },
  ];
  return (
    <section id="algorithm" className="py-32 px-8 relative overflow-hidden">
      {/* Background orb */}
      <div className="absolute right-0 top-0 w-[600px] h-[600px] pointer-events-none"
        style={{ background:"radial-gradient(circle at 80% 30%, hsl(8 51%51%/0.05) 0%,transparent 65%)" }} />

      <div className="max-w-7xl mx-auto">
        <Reveal className="mb-6"><hr className="section-rule" /></Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mt-8">
          {/* Left: copy */}
          <div>
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
                style={{ background:"hsl(8 51%51%/0.08)", border:"1px solid hsl(8 51%51%/0.2)" }}>
                <Clock size={11} style={{ color:"hsl(8 51%51%)" }} />
                <span className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color:"hsl(8 44%44%)" }}>The Algorithm</span>
              </div>
              <h2 className="font-serif font-bold mb-6" style={{ fontSize:"clamp(2rem,4vw,3rem)", color:"hsl(120 2%17%)" }}>
                Why Greedy<br /><em>is optimal here</em>
              </h2>
              <p className="font-sans text-sm leading-loose mb-6" style={{ color:"hsl(60 4%46%)" }}>
                The greedy rule — always pick the highest-profit remaining job and assign it to the
                <strong style={{ color:"hsl(8 51%48%)" }}> latest available slot</strong> — is provably correct
                for this problem. Delaying assignments keeps early slots free for tight-deadline jobs
                that cannot use a later slot.
              </p>
              <p className="font-sans text-sm leading-loose mb-8" style={{ color:"hsl(60 4%46%)" }}>
                This is a classic exchange argument: any valid schedule that differs from the greedy
                result can only have equal or lower profit, because we always process jobs in
                decreasing profit order.
              </p>
            </Reveal>

            {/* Stat cards */}
            <Reveal delay={0.1}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label:"Time Complexity",  val:"O(n log n)", accent:false },
                  { label:"Space Complexity", val:"O(n)",       accent:false },
                  { label:"Optimal?",         val:"Yes",        accent:true  },
                  { label:"Works for",        val:"Unit jobs",  accent:false },
                ].map(s => (
                  <TiltCard key={s.label} className="ceramic rounded-sm p-5">
                    <p className="font-sans text-[10px] font-semibold tracking-widest uppercase mb-1.5"
                      style={{ color:"hsl(60 4%58%)" }}>{s.label}</p>
                    <p className="font-serif text-xl font-bold"
                      style={{ color: s.accent ? "hsl(8 51%47%)" : "hsl(120 2%17%)" }}>{s.val}</p>
                  </TiltCard>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Right: pseudocode */}
          <Reveal delay={0.15}>
            <div className="rounded-sm overflow-hidden"
              style={{ background:"hsl(120 2%15%)", border:"1px solid hsl(120 2%22%)", boxShadow:"0 20px 50px hsl(120 2%10%/0.3)" }}>
              {/* Terminal header */}
              <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ borderBottom:"1px solid hsl(120 2%22%)", background:"hsl(120 2%13%)" }}>
                {["hsl(0 70%60%)", "hsl(40 80%60%)", "hsl(120 50%55%)"].map((c, i) => (
                  <div key={i} className="w-3 h-3 rounded-full" style={{ background:c }} />
                ))}
                <span className="ml-3 font-sans text-xs" style={{ color:"hsl(60 4%45%)" }}>greedy-scheduler.ts</span>
              </div>
              {/* Code */}
              <div className="p-6 space-y-1.5">
                {pseudoSteps.map((s, i) => (
                  <motion.div
                    key={s.n}
                    initial={{ opacity:0, x:-10 }}
                    whileInView={{ opacity:1, x:0 }}
                    viewport={{ once:true }}
                    transition={{ delay: i * 0.06, duration:0.4 }}
                    className="flex items-start gap-4 group">
                    <span className="font-sans text-[11px] w-4 flex-shrink-0 mt-0.5 select-none"
                      style={{ color:"hsl(60 4%36%)" }}>{s.n}</span>
                    <div className="flex-1 flex items-start justify-between gap-4">
                      <span className="font-sans text-[13px] font-medium"
                        style={{ color: s.code.startsWith(" ") ? "hsl(38 60%70%)" : "hsl(30 30%85%)", fontFamily:"'Courier New',monospace" }}>
                        {s.code}
                      </span>
                      {s.comment && (
                        <span className="font-sans text-[11px] flex-shrink-0" style={{ color:"hsl(60 4%38%)", fontFamily:"'Courier New',monospace" }}>
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

// ─── Optimizer App ────────────────────────────────────────────────────────────
function OptimizerApp() {
  const [jobs,    setJobs]    = useState<Job[]>([]);
  const [state,   setState]   = useState<"idle"|"running"|"done">("idle");
  const [result,  setResult]  = useState<Result|null>(null);
  const [toasts,  setToasts]  = useState<Toast[]>([]);
  const [jobName, setJobName] = useState("");
  const [deadline,setDeadline]= useState("");
  const [profit,  setProfit]  = useState("");

  const toast = useCallback((title: string, sub?: string) => {
    const id = uid();
    setToasts(p => [...p, { id, title, sub }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  const addJob = (e: FormEvent) => {
    e.preventDefault();
    if (!jobName.trim() || !deadline || !profit) return;
    const d = parseInt(deadline), p = parseInt(profit);
    if (isNaN(d)||isNaN(p)||d<1||d>10||p<0) return;
    const job: Job = { id:uid(), name:jobName.trim(), deadline:d, profit:p };
    setJobs(prev => [...prev, job]);
    setState("idle"); setResult(null);
    setJobName(""); setDeadline(""); setProfit("");
    toast("Job added", job.name);
  };

  const deleteJob = (id: string) => {
    setJobs(p => p.filter(j => j.id !== id));
    setState("idle"); setResult(null);
  };

  const loadSample = () => {
    setJobs(SAMPLE.map(j => ({ ...j, id:uid() })));
    setState("idle"); setResult(null);
    toast("Sample data loaded", "8 architecture projects");
  };

  const optimize = () => {
    if (!jobs.length) return;
    setState("running");
    setTimeout(() => {
      const res = runGreedy(jobs);
      setResult(res); setState("done");
      toast("Optimization complete", `${fmt(res.totalProfit)} total profit`);
    }, 950);
  };

  return (
    <section id="optimizer" className="py-32 px-8">
      <div className="max-w-7xl mx-auto">
        <Reveal className="mb-6"><hr className="section-rule" /></Reveal>

        <Reveal className="text-center mb-16 mt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
            style={{ background:"hsl(8 51%51%/0.08)", border:"1px solid hsl(8 51%51%/0.2)" }}>
            <Trophy size={11} style={{ color:"hsl(8 51%51%)" }} />
            <span className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color:"hsl(8 44%44%)" }}>Live Optimizer</span>
          </div>
          <h2 className="font-serif font-bold mb-4" style={{ fontSize:"clamp(2rem,4.5vw,3.2rem)", color:"hsl(120 2%17%)" }}>
            Build your schedule
          </h2>
          <p className="font-sans text-sm max-w-sm mx-auto" style={{ color:"hsl(60 4%52%)" }}>
            Add jobs, hit Run, and see the maximum-profit schedule — with every step explained.
          </p>
        </Reveal>

        <Reveal>
          <div className="rounded-sm overflow-hidden flex flex-col md:flex-row"
            style={{ boxShadow:"0 8px 28px hsl(35 22%58%/0.14),0 24px 56px hsl(35 20%58%/0.08)", border:"1px solid hsl(38 22%86%)" }}>

            {/* Left terracotta pane */}
            <div className="w-full md:w-[32%] flex flex-col relative"
              style={{ background:"linear-gradient(165deg,hsl(14 38%56%) 0%,hsl(10 44%48%) 60%,hsl(8 50%43%) 100%)",
                boxShadow:"4px 0 28px hsl(8 51%28%/0.16)" }}>
              {/* Grain overlay */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0.25'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23g)' opacity='0.065'/%3E%3C/svg%3E")`, backgroundSize:"200px 200px", mixBlendMode:"overlay" as React.CSSProperties["mixBlendMode"] }} />
              <div className="absolute top-0 left-0 right-0 h-[1.5px] pointer-events-none"
                style={{ background:"linear-gradient(90deg,transparent,hsl(14 60%72%/0.5),transparent)" }} />

              <div className="p-8 flex-shrink-0 relative z-10">
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers size={14} style={{ color:"hsl(14 55%82%)" }} strokeWidth={1.5} />
                    <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color:"hsl(14 40%78%)" }}>Input</span>
                  </div>
                  <h3 className="font-serif text-3xl font-bold leading-none" style={{ color:"hsl(30 40%97%)", textShadow:"0 2px 8px hsl(8 51%25%/0.3)" }}>Add a Job</h3>
                </div>

                <form onSubmit={addJob} className="space-y-4">
                  <DebossedInput label="Job Name" type="text" placeholder="e.g. Grand Library" value={jobName} onChange={setJobName} tabIndex={1} />
                  <div className="grid grid-cols-2 gap-3">
                    <DebossedInput label="Deadline" type="number" placeholder="1–10" value={deadline} onChange={setDeadline} tabIndex={2} min="1" max="10" />
                    <DebossedInput label="Profit (₹)" type="number" placeholder="0" value={profit} onChange={setProfit} tabIndex={3} min="0" />
                  </div>
                  <motion.button
                    whileTap={{ scale:0.965, y:2, boxShadow:"0 1px 2px hsl(8 51%20%/0.4)" }}
                    type="submit" tabIndex={4}
                    data-testid="button-add-job"
                    className="w-full py-4 mt-1 font-serif text-base font-semibold tracking-wide rounded-sm"
                    style={{ background:"linear-gradient(180deg,hsl(30 40%97%) 0%,hsl(30 25%93%) 100%)", color:"hsl(8 51%44%)",
                      boxShadow:"0 3px 8px hsl(8 51%22%/0.35),0 6px 16px hsl(8 51%22%/0.2),0 1px 0 hsl(0 0%100%/0.9) inset,0 -2px 0 hsl(8 40%38%/0.28) inset",
                      letterSpacing:"0.04em" }}>
                    Add Job
                  </motion.button>
                </form>
              </div>

              {/* Job list */}
              <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-2 relative z-10">
                {jobs.length > 0 && (
                  <p className="text-[10px] font-sans font-semibold tracking-[0.15em] uppercase mb-3" style={{ color:"hsl(14 40%76%)" }}>
                    {jobs.length} job{jobs.length!==1?"s":""} queued
                  </p>
                )}
                <AnimatePresence>
                  {jobs.map(job => (
                    <motion.div key={job.id}
                      initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                      exit={{ opacity:0, scale:0.94, transition:{ duration:0.14 } }}
                      className="flex items-center justify-between px-3 py-2.5 rounded-sm"
                      style={{ background:"hsl(14 35%52%/0.32)",
                        boxShadow:"inset 0 1px 0 hsl(14 55%70%/0.2),inset 0 -1px 0 hsl(8 45%28%/0.18)" }}
                      data-testid={`card-job-${job.id}`}>
                      <div className="flex flex-col min-w-0 mr-2">
                        <span className="font-serif font-semibold text-sm truncate" style={{ color:"hsl(30 35%96%)" }}>{job.name}</span>
                        <div className="flex gap-3 text-[11px] font-sans mt-0.5" style={{ color:"hsl(14 35%80%)" }}>
                          <span>DL {job.deadline}</span><span>{fmt(job.profit)}</span>
                        </div>
                      </div>
                      <button onClick={() => deleteJob(job.id)}
                        className="flex-shrink-0 p-1 rounded-sm hover:opacity-60 transition-opacity"
                        style={{ color:"hsl(14 40%82%)" }} data-testid={`button-delete-${job.id}`}>
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Right pane */}
            <div className="w-full md:w-[68%] flex flex-col glass">
              {/* Action bar */}
              <div className="flex items-center flex-wrap gap-3 px-8 py-5 flex-shrink-0"
                style={{ borderBottom:"1px solid hsl(38 22%88%/0.8)" }}>
                <motion.button
                  whileHover={{ scale:1.02 }}
                  whileTap={{ scale:0.966, y:1 }}
                  onClick={optimize}
                  disabled={!jobs.length||state==="running"}
                  data-testid="button-run-optimization"
                  className="flex items-center gap-2.5 px-6 py-3 rounded-sm font-serif font-semibold text-sm disabled:opacity-35 disabled:cursor-not-allowed"
                  style={{ background:"linear-gradient(180deg,hsl(10 50%54%) 0%,hsl(8 52%47%) 100%)", color:"hsl(30 40%97%)",
                    boxShadow:"0 2px 6px hsl(8 51%22%/0.32),0 5px 14px hsl(8 51%22%/0.16),0 1px 0 hsl(14 60%68%/0.4) inset,0 -2px 0 hsl(8 50%28%/0.3) inset" }}>
                  <Play size={13} fill="currentColor" />Run Optimization
                </motion.button>

                <button onClick={loadSample} data-testid="button-load-sample"
                  className="px-5 py-3 font-sans text-sm font-medium rounded-sm hover:bg-white/60 transition-all"
                  style={{ color:"hsl(60 4%53%)", border:"1px solid hsl(38 22%84%)" }}>
                  Load Sample Data
                </button>

                {state==="done" && (
                  <button onClick={() => { setState("idle"); setResult(null); }}
                    className="ml-auto px-4 py-2 font-sans text-xs font-medium rounded-sm hover:bg-white/50 transition-all"
                    style={{ color:"hsl(60 4%60%)", border:"1px solid hsl(38 20%88%)" }}>
                    Reset
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 px-8 py-8 overflow-y-auto min-h-[440px] relative">

                {/* Empty state */}
                {!jobs.length && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <motion.div
                      animate={{ y:[0,-6,0] }}
                      transition={{ repeat:Infinity, duration:3, ease:"easeInOut" }}
                      className="w-16 h-16 rounded-sm flex items-center justify-center"
                      style={{ background:"hsl(40 16%92%)", boxShadow:"inset 0 2px 6px hsl(35 22%60%/0.14),inset 0 -1px 0 hsl(0 0%100%/0.8)" }}>
                      <BarChart2 size={26} strokeWidth={1.2} style={{ color:"hsl(60 4%64%)" }} />
                    </motion.div>
                    <p className="font-serif text-xl" style={{ color:"hsl(120 2%17%/0.3)" }}>Add jobs to begin</p>
                    <p className="font-sans text-xs" style={{ color:"hsl(60 4%58%/0.65)" }}>or click Load Sample Data for a quick demo</p>
                  </div>
                )}

                {/* Idle grid */}
                {!!jobs.length && state==="idle" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {jobs.map(job => (
                        <motion.div key={job.id}
                          initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
                          className="ceramic rounded-sm p-5" data-testid={`card-preview-${job.id}`}>
                          <h3 className="font-serif text-base font-semibold mb-3" style={{ color:"hsl(120 2%17%)" }}>{job.name}</h3>
                          <div className="flex justify-between items-center font-sans text-xs">
                            <span style={{ color:"hsl(60 4%54%)" }}>Deadline <strong style={{ color:"hsl(120 2%22%)" }}>{job.deadline}</strong></span>
                            <span className="font-bold text-sm" style={{ color:"hsl(8 51%50%)" }}>{fmt(job.profit)}</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Skeleton */}
                {state==="running" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {[...Array(Math.min(jobs.length,6))].map((_,i) => (
                        <motion.div key={i}
                          animate={{ opacity:[0.3,0.65,0.3] }}
                          transition={{ repeat:Infinity, duration:1.6, ease:"easeInOut", delay:i*0.11 }}
                          className="rounded-sm overflow-hidden p-4 flex flex-col justify-between"
                          style={{ height:90, background:"hsl(38 18%92%)", border:"1px solid hsl(38 18%87%)", boxShadow:"inset 0 1px 0 hsl(0 0%100%/0.65)" }}>
                          <div className="h-3 w-3/4 rounded-sm" style={{ background:"hsl(38 15%84%)" }} />
                          <div className="flex justify-between">
                            <div className="h-2.5 w-1/4 rounded-sm" style={{ background:"hsl(38 14%82%)" }} />
                            <div className="h-2.5 w-1/5 rounded-sm" style={{ background:"hsl(8 28%78%)" }} />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2.5 mt-2">
                      <motion.div animate={{ opacity:[0.4,1,0.4] }} transition={{ repeat:Infinity, duration:1, ease:"easeInOut" }}
                        className="w-1.5 h-1.5 rounded-full" style={{ background:"hsl(8 51%51%)" }} />
                      <span className="font-sans text-xs" style={{ color:"hsl(60 4%56%)" }}>Computing optimal schedule…</span>
                    </div>
                  </div>
                )}

                {/* Results */}
                {state==="done" && result && (
                  <div className="flex flex-col gap-8">

                    {/* Stats row */}
                    <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
                      className="grid grid-cols-3 gap-3">
                      {[
                        { label:"Total Profit",    value:fmt(result.totalProfit),          accent:true  },
                        { label:"Jobs Accepted",   value:`${result.accepted.length} / ${jobs.length}`, accent:false },
                        { label:"Jobs Rejected",   value:String(result.rejected.length),   accent:false },
                      ].map(s => (
                        <TiltCard key={s.label} className="ceramic rounded-sm p-4">
                          <p className="font-sans text-[10px] font-semibold tracking-[0.14em] uppercase mb-1.5" style={{ color:"hsl(60 4%58%)" }}>{s.label}</p>
                          <p className="font-serif text-xl font-bold" style={{ color:s.accent?"hsl(8 51%47%)":"hsl(120 2%17%)" }}>{s.value}</p>
                        </TiltCard>
                      ))}
                    </motion.div>

                    {/* Accepted */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full" style={{ background:"hsl(8 51%51%)" }} />
                        <span className="font-sans text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color:"hsl(8 40%55%)" }}>
                          Accepted — {result.accepted.length} job{result.accepted.length!==1?"s":""}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 pb-8">
                        {result.accepted.map((job, i) => (
                          <motion.div key={job.id}
                            initial={{ y:-22, opacity:0 }}
                            animate={{ y:0, opacity:1 }}
                            transition={{ delay:i*0.07, type:"spring", stiffness:280, damping:22 }}
                            className="rounded-sm overflow-hidden min-w-[148px] relative"
                            style={{ background:"linear-gradient(165deg,hsl(30 28%99%) 0%,hsl(30 22%96%) 100%)",
                              border:"1px solid hsl(38 22%87%)",
                              boxShadow:"0 4px 8px hsl(35 25%58%/0.22),0 10px 24px hsl(35 22%55%/0.14),0 20px 38px hsl(35 20%55%/0.07),0 1px 0 hsl(0 0%100%/0.95) inset" }}
                            data-testid={`card-accepted-${job.id}`}>
                            <div className="absolute left-0 top-0 bottom-0 w-[3px]"
                              style={{ background:"linear-gradient(180deg,hsl(10 50%56%),hsl(8 52%44%))" }} />
                            <div className="absolute top-0 left-[3px] right-0 h-[1px]" style={{ background:"hsl(38 30%82%)" }} />
                            <div className="p-4 pl-5">
                              <h4 className="font-serif font-bold text-sm leading-tight mb-2.5" style={{ color:"hsl(120 2%17%)" }}>{job.name}</h4>
                              <div className="flex items-center justify-between font-sans text-xs">
                                <span className="px-1.5 py-0.5 rounded-sm font-medium"
                                  style={{ background:"hsl(38 16%92%)", color:"hsl(60 4%48%)", border:"1px solid hsl(38 16%86%)" }}>
                                  DL {job.deadline}
                                </span>
                                <span className="font-bold text-sm" style={{ color:"hsl(8 51%49%)" }}>{fmt(job.profit)}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Copper axis */}
                      <div className="relative mb-7" style={{ height:18 }}>
                        <div className="absolute left-0 right-0" style={{
                          top:7, height:3, borderRadius:2,
                          background:"linear-gradient(90deg,hsl(38 25%80%) 0%,hsl(38 28%74%) 50%,hsl(38 25%82%) 100%)",
                          boxShadow:"0 1px 0 hsl(0 0%100%/0.6) inset,0 1px 4px hsl(35 22%55%/0.18)" }} />
                        {[...Array(9)].map((_,i) => (
                          <div key={i} className="absolute" style={{
                            left:`${(i/8)*100}%`, top:2, width:1.5, height:14,
                            background:"hsl(38 22%72%)", borderRadius:1, transform:"translateX(-50%)" }} />
                        ))}
                      </div>

                      {/* Rejected */}
                      {result.rejected.length > 0 && (
                        <>
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full" style={{ background:"hsl(60 4%66%)" }} />
                            <span className="font-sans text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color:"hsl(60 4%60%)" }}>
                              Rejected — {result.rejected.length} job{result.rejected.length!==1?"s":""}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {result.rejected.map((job, i) => (
                              <motion.div key={job.id}
                                initial={{ opacity:0, y:10 }}
                                animate={{ opacity:0.5, y:0 }}
                                transition={{ delay:result.accepted.length*0.07+i*0.06, type:"spring" }}
                                className="rounded-sm min-w-[148px] p-4"
                                style={{ background:"hsl(40 10%90%)", border:"1px solid hsl(38 10%84%)" }}
                                data-testid={`card-rejected-${job.id}`}>
                                <h4 className="font-serif font-semibold text-sm leading-tight mb-2" style={{ color:"hsl(60 4%42%)" }}>{job.name}</h4>
                                <div className="flex items-center justify-between font-sans text-xs">
                                  <span style={{ color:"hsl(60 4%56%)" }}>DL {job.deadline}</span>
                                  <span style={{ color:"hsl(60 4%48%)", fontWeight:500 }}>{fmt(job.profit)}</span>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </>
                      )}
                      {result.rejected.length===0 && (
                        <p className="font-sans text-xs italic" style={{ color:"hsl(60 4%62%)" }}>All jobs were accepted — perfect schedule.</p>
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
              initial={{ opacity:0, y:28, scale:0.9 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:4, scale:0.94, transition:{ duration:0.18 } }}
              transition={{ type:"spring", stiffness:340, damping:28 }}
              className="flex items-start gap-3 px-4 py-3.5 rounded-sm pointer-events-auto"
              style={{ background:"hsl(30 25%98%)", minWidth:220, maxWidth:300,
                border:"1px solid hsl(38 22%87%)",
                boxShadow:"0 4px 14px hsl(35 22%55%/0.16),0 14px 30px hsl(35 20%55%/0.1),0 1px 0 hsl(0 0%100%/0.95) inset" }}
              data-testid="toast-notification">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background:"hsl(140 32%92%)", border:"1px solid hsl(140 28%82%)" }}>
                <Check size={11} strokeWidth={3} style={{ color:"hsl(140 38%40%)" }} />
              </div>
              <div className="flex flex-col min-w-0">
                <p className="font-sans text-sm font-medium" style={{ color:"hsl(120 2%17%)" }}>{t.title}</p>
                {t.sub && <p className="font-sans text-xs mt-0.5" style={{ color:"hsl(60 4%54%)" }}>{t.sub}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-16 px-8" style={{ borderTop:"1px solid hsl(38 22%87%)", background:"hsl(30 20%97%)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-sm tc-block flex items-center justify-center">
                <Layers size={13} style={{ color:"hsl(30 40%97%)" }} strokeWidth={2} />
              </div>
              <span className="font-serif font-bold text-lg" style={{ color:"hsl(120 2%17%)" }}>JobOptimizer</span>
            </div>
            <p className="font-sans text-xs leading-relaxed" style={{ color:"hsl(60 4%54%)" }}>
              A premium Greedy Job Scheduling tool. All profits in ₹ Indian Rupees. Runs entirely in your browser — no server, no data sent anywhere.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-16 gap-y-3">
            {[
              { label:"Algorithm", val:"Greedy" },
              { label:"Time Complexity", val:"O(n log n)" },
              { label:"Currency", val:"₹ Indian Rupees" },
              { label:"Runs in", val:"Your browser" },
            ].map(s => (
              <div key={s.label} className="flex flex-col">
                <span className="font-sans text-[10px] tracking-widest uppercase font-semibold mb-0.5" style={{ color:"hsl(60 4%58%)" }}>{s.label}</span>
                <span className="font-sans text-sm font-medium" style={{ color:"hsl(120 2%22%)" }}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-12 pt-6" style={{ borderTop:"1px solid hsl(38 18%89%)" }}>
          <p className="font-sans text-xs" style={{ color:"hsl(60 4%60%)" }}>
            Built with React · Framer Motion · Tailwind CSS
          </p>
          <p className="font-sans text-xs" style={{ color:"hsl(60 4%60%)" }}>Crafted Alabaster & Terracotta</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Optimizer() {
  const [activeSection, setActiveSection] = useState("hero");

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });

  // Intersection observer for side nav
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold:0.4 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  return (
    <>
      <Cursor />
      <EntryVeil />
      <SideNav active={activeSection} />
      <Navbar onScrollTo={scrollTo} />
      <Hero onScrollTo={scrollTo} />
      <Marquee />
      <HowItWorks />
      <Marquee reverse />
      <AlgorithmSection />
      <OptimizerApp />
      <Footer />
    </>
  );
}
