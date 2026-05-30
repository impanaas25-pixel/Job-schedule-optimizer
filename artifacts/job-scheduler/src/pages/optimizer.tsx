import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useInView } from "framer-motion";
import { X, Check, Play, ArrowDown, Zap, BarChart2, Clock, Trophy, ChevronRight, Layers, Info } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Job = { id: string; name: string; deadline: number; profit: number };
type Result = { accepted: Job[]; rejected: Job[]; totalProfit: number };
type Toast = { id: string; title: string; sub?: string; type?: "success" | "info" };

// ─── Greedy Algorithm ─────────────────────────────────────────────────────────
function runGreedyScheduler(jobs: Job[]): Result {
  const sorted = [...jobs].sort((a, b) => b.profit - a.profit);
  if (!sorted.length) return { accepted: [], rejected: [], totalProfit: 0 };
  const maxDeadline = Math.max(...sorted.map(j => j.deadline));
  const slots: (Job | null)[] = new Array(maxDeadline + 1).fill(null);
  const accepted: Job[] = [];
  const rejected: Job[] = [];
  for (const job of sorted) {
    let placed = false;
    for (let s = job.deadline; s >= 1; s--) {
      if (!slots[s]) { slots[s] = job; accepted.push(job); placed = true; break; }
    }
    if (!placed) rejected.push(job);
  }
  return { accepted, rejected, totalProfit: accepted.reduce((s, j) => s + j.profit, 0) };
}

// ─── Sample data ──────────────────────────────────────────────────────────────
const SAMPLE: Omit<Job, "id">[] = [
  { name: "Lighthouse", deadline: 2, profit: 10000 },
  { name: "Harbor Bridge", deadline: 1, profit: 1900 },
  { name: "City Hall Facade", deadline: 2, profit: 2700 },
  { name: "Museum Wing", deadline: 1, profit: 2500 },
  { name: "Park Pavilion", deadline: 3, profit: 1500 },
  { name: "Observatory", deadline: 3, profit: 11000 },
  { name: "Waterfront Plaza", deadline: 2, profit: 9000 },
  { name: "Grand Library", deadline: 4, profit: 20000 },
];

const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// ─── 3D Tilt Card wrapper ─────────────────────────────────────────────────────
function TiltCard({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-6, 6]);
  const sRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const sRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX: sRotateX, rotateY: sRotateY, transformPerspective: 800, ...style }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Section reveal wrapper ───────────────────────────────────────────────────
function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
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
      <label className="text-[10px] font-sans font-semibold tracking-[0.18em] uppercase" style={{ color: "hsl(14 40% 78%)" }}>{label}</label>
      <div className="relative rounded-sm overflow-hidden transition-all duration-300" style={{
        background: focused ? "hsl(30 22% 94%)" : "hsl(38 18% 91%)",
        boxShadow: focused
          ? "inset 0 3px 8px hsl(35 28% 60% / 0.24), inset 0 1px 3px hsl(35 28% 60% / 0.16), inset 0 -1px 0 hsl(0 0% 100% / 0.65)"
          : "inset 0 2px 6px hsl(35 28% 60% / 0.18), inset 0 1px 2px hsl(35 28% 60% / 0.12), inset 0 -1px 0 hsl(0 0% 100% / 0.55)",
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
        <div className="absolute bottom-0 left-0 right-0 transition-all duration-300" style={{
          height: focused ? "2px" : "1.5px",
          background: focused ? "hsl(8 51% 51%)" : "hsl(38 25% 76%)",
        }} />
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ onScrollToApp }: { onScrollToApp: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? "hsl(30 25% 98% / 0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(1.5)" : "none",
        borderBottom: scrolled ? "1px solid hsl(38 25% 87% / 0.7)" : "1px solid transparent",
        boxShadow: scrolled ? "0 2px 20px hsl(35 22% 60% / 0.08)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-sm terracotta-block flex items-center justify-center">
            <Layers size={14} style={{ color: "hsl(30 40% 96%)" }} strokeWidth={2} />
          </div>
          <span className="font-serif font-bold text-lg" style={{ color: "hsl(120 2% 17%)" }}>JobOptimizer</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {["How it works", "Algorithm", "Try it"].map(item => (
            <button key={item} onClick={item === "Try it" ? onScrollToApp : undefined}
              className="font-sans text-sm font-medium transition-colors cursor-pointer hover:opacity-70"
              style={{ color: "hsl(60 4% 42%)" }}>
              {item}
            </button>
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onScrollToApp}
          className="terracotta-block px-5 py-2.5 rounded-sm font-sans text-sm font-semibold cursor-pointer"
          style={{ color: "hsl(30 40% 97%)", letterSpacing: "0.02em" }}
          data-testid="button-nav-cta"
        >
          Open Tool
        </motion.button>
      </div>
    </motion.nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ onScrollToApp }: { onScrollToApp: () => void }) {
  const floatingJobs = [
    { name: "Grand Library", profit: 20000, deadline: 4, x: "72%", y: "18%", delay: 0 },
    { name: "Observatory", profit: 11000, deadline: 3, x: "78%", y: "58%", delay: 0.3 },
    { name: "Lighthouse", profit: 10000, deadline: 2, x: "62%", y: "76%", delay: 0.6 },
    { name: "Waterfront Plaza", profit: 9000, deadline: 2, x: "85%", y: "36%", delay: 0.9 },
  ];
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full" style={{
          width: 600, height: 600, top: "-10%", right: "-5%",
          background: "radial-gradient(circle, hsl(8 51% 51% / 0.07) 0%, transparent 70%)",
        }} />
        <div className="absolute rounded-full" style={{
          width: 400, height: 400, bottom: "5%", left: "5%",
          background: "radial-gradient(circle, hsl(38 30% 72% / 0.1) 0%, transparent 70%)",
        }} />
        <div className="absolute rounded-full" style={{
          width: 300, height: 300, top: "40%", left: "35%",
          background: "radial-gradient(circle, hsl(14 42% 60% / 0.05) 0%, transparent 70%)",
        }} />
      </div>

      {/* Floating job cards (desktop only) */}
      <div className="absolute inset-0 pointer-events-none hidden lg:block">
        {floatingJobs.map((job, i) => (
          <motion.div
            key={i}
            className="absolute ceramic-card rounded-sm p-4 w-44"
            style={{ left: job.x, top: job.y, transformOrigin: "center" }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 0.85, y: [0, -10, 0] }}
            transition={{ delay: job.delay + 0.8, duration: 4 + i, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", opacity: { duration: 0.6, delay: job.delay + 0.8, repeat: 0 } }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-sm" style={{ background: "linear-gradient(180deg, hsl(10 50% 56%), hsl(8 52% 44%))" }} />
            <p className="font-serif font-semibold text-sm pl-2" style={{ color: "hsl(120 2% 17%)" }}>{job.name}</p>
            <div className="flex justify-between items-center mt-2 pl-2">
              <span className="font-sans text-[11px]" style={{ color: "hsl(60 4% 55%)" }}>DL {job.deadline}</span>
              <span className="font-sans text-xs font-bold" style={{ color: "hsl(8 51% 50%)" }}>{fmt(job.profit)}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Hero content */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-24 pb-20 w-full">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
            style={{ background: "hsl(8 51% 51% / 0.1)", border: "1px solid hsl(8 51% 51% / 0.2)" }}
          >
            <Zap size={12} style={{ color: "hsl(8 51% 51%)" }} />
            <span className="font-sans text-xs font-semibold tracking-wide" style={{ color: "hsl(8 51% 44%)" }}>
              Greedy Algorithm · O(n log n)
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif leading-[1.05] mb-6"
            style={{ fontSize: "clamp(2.6rem, 6vw, 4.2rem)" }}
          >
            <span style={{ color: "hsl(120 2% 17%)" }}>Schedule Jobs.</span>
            <br />
            <span className="text-gradient">Maximize Profit.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="font-sans text-lg font-light leading-relaxed mb-10 max-w-lg"
            style={{ color: "hsl(60 4% 42%)" }}
          >
            Enter your jobs with deadlines and profits. The Greedy Scheduler finds the optimal
            assignment that maximises total revenue — instantly, in your browser.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.48 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onScrollToApp}
              className="terracotta-block flex items-center gap-2.5 px-7 py-4 rounded-sm font-serif font-semibold text-base cursor-pointer"
              style={{ color: "hsl(30 40% 97%)", letterSpacing: "0.02em" }}
              data-testid="button-hero-cta"
            >
              <Play size={15} fill="currentColor" />
              Try the Optimizer
            </motion.button>
            <button
              onClick={onScrollToApp}
              className="flex items-center gap-2 font-sans text-sm font-medium cursor-pointer group"
              style={{ color: "hsl(60 4% 48%)" }}
            >
              See how it works
              <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75 }}
            className="flex gap-8 mt-16 pt-8"
            style={{ borderTop: "1px solid hsl(38 22% 86%)" }}
          >
            {[
              { label: "Algorithm", value: "Greedy" },
              { label: "Time Complexity", value: "O(n log n)" },
              { label: "Currency", value: "₹ Rupees" },
            ].map(stat => (
              <div key={stat.label} className="flex flex-col gap-0.5">
                <span className="font-serif font-semibold text-lg" style={{ color: "hsl(120 2% 17%)" }}>{stat.value}</span>
                <span className="font-sans text-xs" style={{ color: "hsl(60 4% 56%)" }}>{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        onClick={onScrollToApp}
      >
        <span className="font-sans text-xs" style={{ color: "hsl(60 4% 60%)" }}>Scroll to explore</span>
        <ArrowDown size={16} style={{ color: "hsl(60 4% 60%)" }} />
      </motion.div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      n: "01",
      icon: <Layers size={22} strokeWidth={1.5} />,
      title: "Add Your Jobs",
      body: "Enter each job with a name, a deadline (the latest time slot by which it must start), and the profit it earns. Use ₹ rupees for all values. You can add as many jobs as needed.",
      tip: "Tip: Jobs with higher profit should be considered first by the algorithm.",
    },
    {
      n: "02",
      icon: <Zap size={22} strokeWidth={1.5} />,
      title: "Run the Algorithm",
      body: "Click Run Optimization. The Greedy Scheduler sorts jobs by profit (highest first), then assigns each one to the latest available time slot at or before its deadline.",
      tip: "The algorithm runs in O(n log n) time — fast even for hundreds of jobs.",
    },
    {
      n: "03",
      icon: <BarChart2 size={22} strokeWidth={1.5} />,
      title: "Read the Timeline",
      body: "Accepted jobs appear raised above the copper axis — these are the ones that maximise your profit. Rejected jobs are shown below — they couldn't fit without displacing a more profitable job.",
      tip: "The total profit shown is the mathematical maximum achievable.",
    },
  ];

  return (
    <section className="py-28 px-8" id="how-it-works">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
            style={{ background: "hsl(8 51% 51% / 0.08)", border: "1px solid hsl(8 51% 51% / 0.18)" }}>
            <Info size={11} style={{ color: "hsl(8 51% 51%)" }} />
            <span className="font-sans text-xs font-semibold tracking-wide" style={{ color: "hsl(8 44% 44%)" }}>How it works</span>
          </div>
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4" style={{ color: "hsl(120 2% 17%)" }}>
            Three steps to the<br /><em>optimal schedule</em>
          </h2>
          <p className="font-sans text-base max-w-md mx-auto" style={{ color: "hsl(60 4% 50%)" }}>
            The Greedy Algorithm guarantees maximum profit when each job takes exactly one time unit.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-[3.5rem] left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, hsl(38 25% 80%), hsl(38 22% 78%), transparent)" }} />

          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.12}>
              <TiltCard className="ceramic-card rounded-sm p-8 h-full relative overflow-hidden cursor-default">
                <span className="step-number absolute top-3 right-4">{step.n}</span>
                <div className="w-11 h-11 rounded-sm flex items-center justify-center mb-6 relative z-10"
                  style={{ background: "hsl(8 51% 51% / 0.1)", border: "1px solid hsl(8 51% 51% / 0.2)", color: "hsl(8 51% 48%)" }}>
                  {step.icon}
                </div>
                <h3 className="font-serif text-xl font-bold mb-3 relative z-10" style={{ color: "hsl(120 2% 17%)" }}>{step.title}</h3>
                <p className="font-sans text-sm leading-relaxed mb-5 relative z-10" style={{ color: "hsl(60 4% 44%)" }}>{step.body}</p>
                <div className="px-3 py-2.5 rounded-sm relative z-10"
                  style={{ background: "hsl(38 18% 93%)", border: "1px solid hsl(38 18% 87%)" }}>
                  <p className="font-sans text-xs leading-relaxed" style={{ color: "hsl(60 4% 52%)" }}>{step.tip}</p>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        {/* Algorithm explainer */}
        <Reveal delay={0.3} className="mt-8">
          <div className="rounded-sm p-6 md:p-8 flex flex-col md:flex-row items-start gap-6" style={{
            background: "linear-gradient(135deg, hsl(14 42% 56% / 0.08) 0%, hsl(38 28% 88% / 0.3) 100%)",
            border: "1px solid hsl(38 25% 86%)",
          }}>
            <div className="flex-shrink-0 w-10 h-10 rounded-sm terracotta-block flex items-center justify-center">
              <Clock size={18} style={{ color: "hsl(30 40% 96%)" }} strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-serif font-bold text-lg mb-2" style={{ color: "hsl(120 2% 17%)" }}>The Greedy Rule</h4>
              <p className="font-sans text-sm leading-relaxed" style={{ color: "hsl(60 4% 44%)" }}>
                Sort all jobs by profit descending. For each job, find the <strong style={{ color: "hsl(8 51% 48%)" }}>latest available slot</strong> at or before
                its deadline. If a slot exists, assign it — otherwise reject the job. This greedy choice is provably optimal
                because we always prioritise maximum profit and delay assignment as late as possible, keeping early
                slots free for future jobs with tight deadlines.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Optimizer App ────────────────────────────────────────────────────────────
function OptimizerApp() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [jobName, setJobName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [profit, setProfit] = useState("");

  const toast = (title: string, sub?: string, type: Toast["type"] = "success") => {
    const id = uid();
    setToasts(p => [...p, { id, title, sub, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };

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
  };

  const deleteJob = (id: string) => { setJobs(p => p.filter(j => j.id !== id)); setState("idle"); setResult(null); };

  const loadSample = () => {
    setJobs(SAMPLE.map(j => ({ ...j, id: uid() })));
    setState("idle"); setResult(null);
    toast("Sample data loaded", "8 architecture projects", "info");
  };

  const optimize = () => {
    if (!jobs.length) return;
    setState("running");
    setTimeout(() => {
      const res = runGreedyScheduler(jobs);
      setResult(res); setState("done");
      toast("Optimization complete", `${fmt(res.totalProfit)} total profit`);
    }, 950);
  };

  return (
    <section id="optimizer" className="py-24 px-8">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
            style={{ background: "hsl(8 51% 51% / 0.08)", border: "1px solid hsl(8 51% 51% / 0.18)" }}>
            <Trophy size={11} style={{ color: "hsl(8 51% 51%)" }} />
            <span className="font-sans text-xs font-semibold tracking-wide" style={{ color: "hsl(8 44% 44%)" }}>Live Optimizer</span>
          </div>
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4" style={{ color: "hsl(120 2% 17%)" }}>
            Build your schedule
          </h2>
          <p className="font-sans text-base max-w-sm mx-auto" style={{ color: "hsl(60 4% 50%)" }}>
            Add jobs, run the algorithm, and see the optimal profit-maximising assignment.
          </p>
        </Reveal>

        <Reveal>
          <div className="rounded-sm overflow-hidden flex flex-col md:flex-row" style={{
            boxShadow: "0px 8px 24px hsl(35 22% 58% / 0.14), 0px 24px 52px hsl(35 20% 58% / 0.08)",
            border: "1px solid hsl(38 22% 86%)",
          }}>

            {/* ── Left pane ── */}
            <div className="w-full md:w-[32%] flex flex-col relative" style={{
              background: "linear-gradient(165deg, hsl(14 38% 56%) 0%, hsl(10 44% 48%) 60%, hsl(8 50% 43%) 100%)",
              boxShadow: "4px 0 28px hsl(8 51% 28% / 0.18)",
            }}>
              {/* grain overlay */}
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0.25'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23g)' opacity='0.065'/%3E%3C/svg%3E")`,
                backgroundSize: "200px 200px", mixBlendMode: "overlay",
              }} />
              <div className="absolute top-0 left-0 right-0 h-[1.5px] pointer-events-none"
                style={{ background: "linear-gradient(90deg, transparent, hsl(14 60% 72% / 0.5), transparent)" }} />

              <div className="p-8 flex-shrink-0 relative z-10">
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers size={16} style={{ color: "hsl(14 55% 82%)" }} strokeWidth={1.5} />
                    <span className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: "hsl(14 40% 78%)" }}>Input Sculpt</span>
                  </div>
                  <h3 className="font-serif text-3xl font-bold leading-none" style={{
                    color: "hsl(30 40% 97%)", textShadow: "0 2px 8px hsl(8 51% 25% / 0.35)",
                  }}>Add a Job</h3>
                </div>

                <form onSubmit={addJob} className="space-y-4">
                  <DebossedInput label="Job Name" type="text" placeholder="e.g. Grand Library" value={jobName} onChange={setJobName} tabIndex={1} />
                  <div className="grid grid-cols-2 gap-3">
                    <DebossedInput label="Deadline" type="number" placeholder="1–10" value={deadline} onChange={setDeadline} tabIndex={2} min="1" max="10" />
                    <DebossedInput label="Profit (₹)" type="number" placeholder="0" value={profit} onChange={setProfit} tabIndex={3} min="0" />
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.965, y: 2, boxShadow: "0px 1px 2px hsl(8 51% 20% / 0.4)" }}
                    type="submit" tabIndex={4}
                    data-testid="button-add-job"
                    className="w-full py-4 mt-1 font-serif text-base font-semibold tracking-wide rounded-sm cursor-pointer"
                    style={{
                      background: "linear-gradient(180deg, hsl(30 40% 97%) 0%, hsl(30 25% 93%) 100%)",
                      color: "hsl(8 51% 44%)",
                      boxShadow: "0px 3px 8px hsl(8 51% 22% / 0.35), 0px 6px 16px hsl(8 51% 22% / 0.2), 0px 1px 0 hsl(0 0% 100% / 0.9) inset, 0px -2px 0 hsl(8 40% 38% / 0.28) inset",
                      letterSpacing: "0.04em",
                    }}
                  >Add Job</motion.button>
                </form>
              </div>

              {/* Job list */}
              <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-2 relative z-10">
                {jobs.length > 0 && (
                  <p className="text-[10px] font-sans font-semibold tracking-[0.15em] uppercase mb-3" style={{ color: "hsl(14 40% 76%)" }}>
                    {jobs.length} job{jobs.length !== 1 ? "s" : ""} queued
                  </p>
                )}
                <AnimatePresence>
                  {jobs.map(job => (
                    <motion.div key={job.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.14 } }}
                      className="flex items-center justify-between px-3 py-2.5 rounded-sm"
                      style={{
                        background: "hsl(14 35% 52% / 0.32)",
                        boxShadow: "inset 0 1px 0 hsl(14 55% 70% / 0.2), inset 0 -1px 0 hsl(8 45% 28% / 0.18)",
                      }}
                      data-testid={`card-job-${job.id}`}
                    >
                      <div className="flex flex-col min-w-0 mr-2">
                        <span className="font-serif font-semibold text-sm truncate" style={{ color: "hsl(30 35% 96%)" }}>{job.name}</span>
                        <div className="flex gap-3 text-[11px] font-sans mt-0.5" style={{ color: "hsl(14 35% 80%)" }}>
                          <span>DL {job.deadline}</span>
                          <span>{fmt(job.profit)}</span>
                        </div>
                      </div>
                      <button onClick={() => deleteJob(job.id)} className="flex-shrink-0 p-1 rounded-sm cursor-pointer hover:opacity-60 transition-opacity"
                        style={{ color: "hsl(14 40% 82%)" }} data-testid={`button-delete-${job.id}`}>
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Right pane ── */}
            <div className="w-full md:w-[68%] flex flex-col" style={{
              background: "hsl(30 25% 98% / 0.75)",
              backdropFilter: "blur(20px) saturate(1.4)",
              borderLeft: "1px solid hsl(38 25% 87% / 0.6)",
            }}>
              {/* Action bar */}
              <div className="flex items-center gap-3 px-8 py-5 flex-shrink-0"
                style={{ borderBottom: "1px solid hsl(38 22% 88% / 0.8)" }}>
                <motion.button
                  whileTap={{ scale: 0.966, y: 1 }}
                  onClick={optimize}
                  disabled={!jobs.length || state === "running"}
                  data-testid="button-run-optimization"
                  className="flex items-center gap-2.5 px-6 py-3 rounded-sm font-serif font-semibold text-sm cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(180deg, hsl(10 50% 54%) 0%, hsl(8 52% 47%) 100%)",
                    color: "hsl(30 40% 97%)",
                    boxShadow: "0px 2px 6px hsl(8 51% 22% / 0.32), 0px 5px 14px hsl(8 51% 22% / 0.16), 0px 1px 0 hsl(14 60% 68% / 0.4) inset, 0px -2px 0 hsl(8 50% 28% / 0.3) inset",
                  }}
                ><Play size={13} fill="currentColor" />Run Optimization</motion.button>

                <button onClick={loadSample} data-testid="button-load-sample"
                  className="px-5 py-3 font-sans text-sm font-medium rounded-sm cursor-pointer transition-all hover:bg-white/60"
                  style={{ color: "hsl(60 4% 53%)", border: "1px solid hsl(38 22% 84%)" }}>
                  Load Sample Data
                </button>

                {state === "done" && (
                  <button onClick={() => { setState("idle"); setResult(null); }}
                    className="ml-auto px-4 py-2 font-sans text-xs font-medium rounded-sm cursor-pointer hover:bg-white/50 transition-all"
                    style={{ color: "hsl(60 4% 60%)", border: "1px solid hsl(38 20% 88%)" }}>
                    Reset
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 px-8 py-8 overflow-y-auto min-h-[420px] relative">

                {/* Empty */}
                {!jobs.length && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-sm flex items-center justify-center" style={{
                      background: "hsl(40 16% 92%)",
                      boxShadow: "inset 0 2px 6px hsl(35 22% 60% / 0.14), inset 0 -1px 0 hsl(0 0% 100% / 0.8)",
                    }}>
                      <BarChart2 size={26} strokeWidth={1.2} style={{ color: "hsl(60 4% 66%)" }} />
                    </div>
                    <p className="font-serif text-xl" style={{ color: "hsl(120 2% 17% / 0.32)" }}>Add jobs to begin</p>
                    <p className="font-sans text-xs" style={{ color: "hsl(60 4% 58% / 0.7)" }}>or click Load Sample Data to see a demo</p>
                  </div>
                )}

                {/* Idle grid */}
                {!!jobs.length && state === "idle" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {jobs.map(job => (
                        <motion.div key={job.id}
                          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                          className="ceramic-card rounded-sm p-5"
                          data-testid={`card-preview-${job.id}`}>
                          <h3 className="font-serif text-base font-semibold mb-3" style={{ color: "hsl(120 2% 17%)" }}>{job.name}</h3>
                          <div className="flex justify-between items-center font-sans text-xs">
                            <span style={{ color: "hsl(60 4% 53%)" }}>Deadline <strong style={{ color: "hsl(120 2% 20%)" }}>{job.deadline}</strong></span>
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
                          style={{ height: 90, background: "hsl(38 18% 92%)", border: "1px solid hsl(38 18% 87%)", boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.65)" }}>
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
                      className="grid grid-cols-3 gap-4">
                      {[
                        { label: "Total Profit", value: fmt(result.totalProfit), accent: true },
                        { label: "Jobs Accepted", value: `${result.accepted.length} / ${jobs.length}`, accent: false },
                        { label: "Jobs Rejected", value: String(result.rejected.length), accent: false },
                      ].map(s => (
                        <div key={s.label} className="ceramic-card rounded-sm p-4 flex flex-col gap-1">
                          <span className="font-sans text-[10px] font-semibold tracking-[0.14em] uppercase" style={{ color: "hsl(60 4% 58%)" }}>{s.label}</span>
                          <span className="font-serif text-2xl font-bold" style={{ color: s.accent ? "hsl(8 51% 47%)" : "hsl(120 2% 17%)" }}>{s.value}</span>
                        </div>
                      ))}
                    </motion.div>

                    {/* Accepted label */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full" style={{ background: "hsl(8 51% 51%)" }} />
                        <span className="font-sans text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: "hsl(8 40% 55%)" }}>
                          Accepted — {result.accepted.length} job{result.accepted.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Accepted cards */}
                      <div className="flex flex-wrap gap-3 pb-8 relative z-10">
                        {result.accepted.map((job, i) => (
                          <motion.div key={job.id}
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: i * 0.07, type: "spring", stiffness: 280, damping: 22 }}
                            className="rounded-sm overflow-hidden min-w-[148px] relative"
                            style={{
                              background: "linear-gradient(165deg, hsl(30 28% 99%) 0%, hsl(30 22% 96%) 100%)",
                              border: "1px solid hsl(38 22% 87%)",
                              boxShadow: "0px 4px 8px hsl(35 25% 58% / 0.22), 0px 10px 22px hsl(35 22% 55% / 0.14), 0px 20px 36px hsl(35 20% 55% / 0.07), 0px 1px 0 hsl(0 0% 100% / 0.95) inset",
                            }}
                            data-testid={`card-accepted-${job.id}`}>
                            <div className="absolute left-0 top-0 bottom-0 w-[3px]"
                              style={{ background: "linear-gradient(180deg, hsl(10 50% 56%), hsl(8 52% 44%))" }} />
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

                      {/* Axis */}
                      <div className="relative mb-7" style={{ height: 18 }}>
                        <div className="absolute left-0 right-0" style={{
                          top: 7, height: 3, borderRadius: 2,
                          background: "linear-gradient(90deg, hsl(38 25% 80%) 0%, hsl(38 28% 75%) 50%, hsl(38 25% 82%) 100%)",
                          boxShadow: "0px 1px 0 hsl(0 0% 100% / 0.6) inset, 0px 1px 4px hsl(35 22% 55% / 0.18)",
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
                boxShadow: "0px 4px 14px hsl(35 22% 55% / 0.16), 0px 14px 30px hsl(35 20% 55% / 0.1), 0px 1px 0 hsl(0 0% 100% / 0.95) inset",
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

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-14 px-8" style={{ borderTop: "1px solid hsl(38 22% 87%)" }}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-sm terracotta-block flex items-center justify-center">
            <Layers size={12} style={{ color: "hsl(30 40% 96%)" }} strokeWidth={2} />
          </div>
          <span className="font-serif font-bold" style={{ color: "hsl(120 2% 17%)" }}>JobOptimizer</span>
        </div>
        <p className="font-sans text-xs text-center" style={{ color: "hsl(60 4% 58%)" }}>
          Greedy Job Scheduling Algorithm · All profits in ₹ Indian Rupees · Runs entirely in your browser
        </p>
        <div className="flex items-center gap-2" style={{ color: "hsl(60 4% 62%)" }}>
          <span className="font-sans text-xs">Built with</span>
          <span className="font-sans text-xs font-medium" style={{ color: "hsl(8 44% 52%)" }}>React · Framer Motion</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Optimizer() {
  const appRef = useRef<HTMLElement>(null);
  const scrollToApp = () => appRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen" style={{ background: "hsl(40 20% 95%)" }}>
      <Navbar onScrollToApp={scrollToApp} />
      <Hero onScrollToApp={scrollToApp} />
      <HowItWorks />
      <div ref={appRef as React.RefObject<HTMLDivElement>}>
        <OptimizerApp />
      </div>
      <Footer />
    </div>
  );
}
