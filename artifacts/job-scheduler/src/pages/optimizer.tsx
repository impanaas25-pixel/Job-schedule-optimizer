import { useState, FormEvent, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, BarChart2, Play, Layers } from "lucide-react";

// --- Types ---
type Job = {
  id: string;
  name: string;
  deadline: number;
  profit: number;
};

type Result = {
  accepted: Job[];
  rejected: Job[];
  totalProfit: number;
};

type ToastMsg = {
  id: string;
  message: string;
  sub?: string;
};

// --- Algorithm ---
function runGreedyScheduler(jobs: Job[]): Result {
  const sorted = [...jobs].sort((a, b) => b.profit - a.profit);
  if (sorted.length === 0) return { accepted: [], rejected: [], totalProfit: 0 };

  const maxDeadline = Math.max(...sorted.map(j => j.deadline));
  const slots: (Job | null)[] = new Array(maxDeadline + 1).fill(null);
  const accepted: Job[] = [];
  const rejected: Job[] = [];

  for (const job of sorted) {
    let placed = false;
    for (let slot = job.deadline; slot >= 1; slot--) {
      if (!slots[slot]) {
        slots[slot] = job;
        accepted.push(job);
        placed = true;
        break;
      }
    }
    if (!placed) rejected.push(job);
  }

  return {
    accepted,
    rejected,
    totalProfit: accepted.reduce((s, j) => s + j.profit, 0),
  };
}

// --- Sample Data ---
const SAMPLE_DATA: Omit<Job, "id">[] = [
  { name: "Lighthouse", deadline: 2, profit: 100 },
  { name: "Harbor Bridge", deadline: 1, profit: 19 },
  { name: "City Hall Facade", deadline: 2, profit: 27 },
  { name: "Museum Wing", deadline: 1, profit: 25 },
  { name: "Park Pavilion", deadline: 3, profit: 15 },
  { name: "Observatory", deadline: 3, profit: 110 },
  { name: "Waterfront Plaza", deadline: 2, profit: 90 },
  { name: "Grand Library", deadline: 4, profit: 200 },
];

// --- Debossed Input ---
function DebossedInput({
  label,
  type,
  placeholder,
  value,
  onChange,
  tabIndex,
  min,
  max,
}: {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  tabIndex: number;
  min?: string;
  max?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-[10px] font-sans font-semibold tracking-[0.15em] uppercase"
        style={{ color: "hsl(60 4% 53% / 0.7)" }}
      >
        {label}
      </label>
      <div
        className="relative rounded-sm overflow-hidden transition-all duration-300"
        style={{
          background: focused
            ? "hsl(30 22% 94%)"
            : "hsl(38 18% 91%)",
          boxShadow: focused
            ? "inset 0 3px 8px hsl(35 28% 60% / 0.22), inset 0 1px 3px hsl(35 28% 60% / 0.15), inset 0 -1px 0 hsl(0 0% 100% / 0.65)"
            : "inset 0 2px 6px hsl(35 28% 60% / 0.18), inset 0 1px 2px hsl(35 28% 60% / 0.12), inset 0 -1px 0 hsl(0 0% 100% / 0.55)",
        }}
      >
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          min={min}
          max={max}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          tabIndex={tabIndex}
          className="w-full bg-transparent py-3 px-3 font-sans text-sm focus:outline-none placeholder:text-[hsl(60_4%_60%)]"
          style={{ color: "hsl(120 2% 17%)" }}
          data-testid={`input-${label.toLowerCase().replace(/\s+/g, "-")}`}
        />
        {/* Copper bottom line */}
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-300"
          style={{
            height: focused ? "2px" : "1.5px",
            background: focused
              ? "hsl(8 51% 51%)"
              : "hsl(38 25% 76%)",
          }}
        />
      </div>
    </div>
  );
}

// --- Main Component ---
export default function Optimizer() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [optimizationState, setOptimizationState] = useState<"idle" | "running" | "done">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const [jobName, setJobName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [profit, setProfit] = useState("");

  const nameRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, sub?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, sub }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const handleAddJob = (e: FormEvent) => {
    e.preventDefault();
    if (!jobName.trim() || !deadline || !profit) return;
    const d = parseInt(deadline);
    const p = parseInt(profit);
    if (isNaN(d) || isNaN(p) || d < 1 || d > 10 || p < 0) return;

    const newJob: Job = {
      id: Math.random().toString(36).substr(2, 9),
      name: jobName.trim(),
      deadline: d,
      profit: p,
    };
    setJobs(prev => [...prev, newJob]);
    setOptimizationState("idle");
    setResult(null);
    setJobName("");
    setDeadline("");
    setProfit("");
    showToast(`Job added`, newJob.name);
  };

  const handleDeleteJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
    setOptimizationState("idle");
    setResult(null);
  };

  const handleLoadSample = () => {
    const samples = SAMPLE_DATA.map(j => ({
      ...j,
      id: Math.random().toString(36).substr(2, 9),
    }));
    setJobs(samples);
    setOptimizationState("idle");
    setResult(null);
    showToast("Sample data loaded", "8 architecture projects");
  };

  const handleOptimize = () => {
    if (jobs.length === 0) return;
    setOptimizationState("running");
    setTimeout(() => {
      const res = runGreedyScheduler(jobs);
      setResult(res);
      setOptimizationState("done");
      showToast("Optimization complete", `$${res.totalProfit} total profit`);
    }, 900);
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col md:flex-row overflow-hidden"
      style={{ background: "hsl(40 20% 95%)" }}
    >
      {/* ─── LEFT PANE — The Terracotta Input Sculpt ─── */}
      <div
        className="w-full md:w-[30%] min-h-screen flex flex-col z-10 relative"
        style={{
          background: "linear-gradient(160deg, hsl(14 38% 56%) 0%, hsl(10 44% 48%) 60%, hsl(8 50% 43%) 100%)",
          boxShadow: "4px 0 32px hsl(8 51% 30% / 0.22), 8px 0 48px hsl(8 51% 30% / 0.1)",
        }}
      >
        {/* Terracotta grain texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0.3'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23grain)' opacity='0.07'/%3E%3C/svg%3E")`,
            backgroundSize: "200px 200px",
            mixBlendMode: "overlay",
          }}
        />
        {/* Top highlight line — simulates fired edge */}
        <div
          className="absolute top-0 left-0 right-0 h-[1.5px] pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, hsl(14 60% 72% / 0.6), transparent)" }}
        />

        <div className="p-8 md:p-10 flex-shrink-0 relative z-10">
          {/* App identity */}
          <div className="mb-10">
            <div className="flex items-center gap-2.5 mb-2">
              <Layers size={18} style={{ color: "hsl(14 60% 82%)" }} strokeWidth={1.5} />
              <span
                className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase"
                style={{ color: "hsl(14 40% 78%)" }}
              >
                Greedy Scheduler
              </span>
            </div>
            <h1
              className="text-[2.4rem] font-serif font-bold leading-none"
              style={{
                color: "hsl(30 40% 97%)",
                textShadow: "0 2px 8px hsl(8 51% 25% / 0.4)",
              }}
            >
              Job
              <br />
              Optimizer
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleAddJob} className="space-y-5">
            <DebossedInput
              label="Job Name"
              type="text"
              placeholder="e.g. Grand Library"
              value={jobName}
              onChange={setJobName}
              tabIndex={1}
            />
            <div className="grid grid-cols-2 gap-3">
              <DebossedInput
                label="Deadline"
                type="number"
                placeholder="1 – 10"
                value={deadline}
                onChange={setDeadline}
                tabIndex={2}
                min="1"
                max="10"
              />
              <DebossedInput
                label="Profit ($)"
                type="number"
                placeholder="0"
                value={profit}
                onChange={setProfit}
                tabIndex={3}
                min="0"
              />
            </div>

            {/* Sculpted "Add Job" button */}
            <motion.button
              whileTap={{
                scale: 0.965,
                y: 2,
                boxShadow: "0px 1px 2px hsl(8 51% 22% / 0.4), 0px 1px 0 hsl(14 55% 66% / 0.35) inset",
              }}
              type="submit"
              tabIndex={4}
              data-testid="button-add-job"
              className="w-full py-4 mt-2 font-serif text-base font-semibold tracking-wide rounded-sm cursor-pointer transition-opacity"
              style={{
                background: "linear-gradient(180deg, hsl(30 40% 97%) 0%, hsl(30 25% 93%) 100%)",
                color: "hsl(8 51% 44%)",
                boxShadow:
                  "0px 3px 8px hsl(8 51% 22% / 0.35), 0px 6px 16px hsl(8 51% 22% / 0.2), 0px 1px 0 hsl(0 0% 100% / 0.9) inset, 0px -2px 0 hsl(8 40% 40% / 0.25) inset",
                letterSpacing: "0.04em",
              }}
            >
              Add Job
            </motion.button>
          </form>
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-y-auto px-8 md:px-10 pb-8 space-y-2 relative z-10">
          {jobs.length > 0 && (
            <p
              className="text-[10px] font-sans font-semibold tracking-[0.15em] uppercase mb-3"
              style={{ color: "hsl(14 40% 78%)" }}
            >
              {jobs.length} job{jobs.length !== 1 ? "s" : ""} queued
            </p>
          )}
          <AnimatePresence>
            {jobs.map(job => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                className="flex items-center justify-between px-3 py-2.5 rounded-sm"
                style={{
                  background: "hsl(14 35% 52% / 0.35)",
                  boxShadow: "inset 0 1px 0 hsl(14 55% 70% / 0.25), inset 0 -1px 0 hsl(8 45% 30% / 0.2)",
                  backdropFilter: "blur(4px)",
                }}
                data-testid={`card-job-${job.id}`}
              >
                <div className="flex flex-col min-w-0 mr-2">
                  <span
                    className="font-serif font-semibold text-sm truncate"
                    style={{ color: "hsl(30 35% 96%)" }}
                  >
                    {job.name}
                  </span>
                  <div
                    className="flex gap-3 text-[11px] font-sans mt-0.5"
                    style={{ color: "hsl(14 35% 80%)" }}
                  >
                    <span>DL {job.deadline}</span>
                    <span>${job.profit}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteJob(job.id)}
                  className="flex-shrink-0 p-1 rounded-sm transition-opacity hover:opacity-70"
                  style={{ color: "hsl(14 40% 82%)" }}
                  data-testid={`button-delete-${job.id}`}
                >
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── RIGHT PANE — Frosted Opal Glass Timeline ─── */}
      <div
        className="w-full md:w-[70%] min-h-screen flex flex-col relative"
        style={{
          background: "hsl(30 25% 98% / 0.72)",
          backdropFilter: "blur(20px) saturate(1.4)",
          borderLeft: "1px solid hsl(38 30% 84% / 0.7)",
          boxShadow: "inset 1px 0 0 hsl(0 0% 100% / 0.6)",
        }}
      >
        {/* Opal shimmer top border */}
        <div
          className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
          style={{
            background: "linear-gradient(90deg, transparent 0%, hsl(38 30% 85%) 30%, hsl(38 25% 90%) 60%, transparent 100%)",
          }}
        />

        {/* Top action bar */}
        <div
          className="flex items-center gap-3 px-8 md:px-10 py-6 flex-shrink-0"
          style={{ borderBottom: "1px solid hsl(38 25% 87% / 0.8)" }}
        >
          {/* Run Optimization — sculpted terracotta */}
          <motion.button
            whileTap={{
              scale: 0.967,
              y: 1,
              boxShadow: "0px 1px 2px hsl(8 51% 22% / 0.4)",
            }}
            onClick={handleOptimize}
            disabled={jobs.length === 0 || optimizationState === "running"}
            data-testid="button-run-optimization"
            className="flex items-center gap-2.5 px-6 py-3 font-serif font-semibold text-sm rounded-sm cursor-pointer transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(180deg, hsl(10 50% 54%) 0%, hsl(8 52% 48%) 100%)",
              color: "hsl(30 40% 97%)",
              boxShadow:
                "0px 2px 6px hsl(8 51% 22% / 0.35), 0px 5px 14px hsl(8 51% 22% / 0.18), 0px 1px 0 hsl(14 60% 68% / 0.45) inset, 0px -2px 0 hsl(8 50% 28% / 0.35) inset",
              letterSpacing: "0.025em",
            }}
          >
            <Play size={14} fill="currentColor" />
            Run Optimization
          </motion.button>

          {/* Load Sample Data — ghost */}
          <button
            onClick={handleLoadSample}
            data-testid="button-load-sample"
            className="px-5 py-3 font-sans text-sm font-medium rounded-sm cursor-pointer transition-all hover:bg-white/50"
            style={{
              color: "hsl(60 4% 53%)",
              border: "1px solid hsl(38 25% 83%)",
              background: "transparent",
              letterSpacing: "0.01em",
            }}
          >
            Load Sample Data
          </button>

          {optimizationState === "done" && result && (
            <button
              onClick={() => { setOptimizationState("idle"); setResult(null); }}
              className="ml-auto px-4 py-2 font-sans text-xs font-medium rounded-sm cursor-pointer transition-all hover:bg-white/50"
              style={{ color: "hsl(60 4% 62%)", border: "1px solid hsl(38 20% 87%)" }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 px-8 md:px-10 py-8 overflow-y-auto relative">

          {/* ── EMPTY STATE ── */}
          {jobs.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div
                className="w-16 h-16 rounded-sm flex items-center justify-center"
                style={{
                  background: "hsl(40 18% 92%)",
                  boxShadow: "inset 0 2px 6px hsl(35 22% 60% / 0.15), inset 0 -1px 0 hsl(0 0% 100% / 0.8)",
                }}
              >
                <BarChart2 size={28} strokeWidth={1.2} style={{ color: "hsl(60 4% 68%)" }} />
              </div>
              <p className="font-serif text-xl" style={{ color: "hsl(120 2% 17% / 0.35)" }}>
                Add jobs to begin
              </p>
              <p className="font-sans text-xs" style={{ color: "hsl(60 4% 60% / 0.7)" }}>
                or load sample architecture projects
              </p>
            </div>
          )}

          {/* ── IDLE — job grid ── */}
          {jobs.length > 0 && optimizationState === "idle" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {jobs.map(job => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    className="rounded-sm p-5"
                    style={{
                      background: "hsl(30 25% 98%)",
                      border: "1px solid hsl(38 22% 88%)",
                      boxShadow:
                        "0px 1px 2px hsl(35 25% 65% / 0.18), 0px 3px 8px hsl(35 22% 65% / 0.1), 0px 1px 0 hsl(0 0% 100% / 0.9) inset",
                    }}
                    data-testid={`card-preview-${job.id}`}
                  >
                    <h3 className="font-serif text-lg font-semibold mb-3" style={{ color: "hsl(120 2% 17%)" }}>
                      {job.name}
                    </h3>
                    <div className="flex justify-between items-center font-sans text-xs">
                      <span style={{ color: "hsl(60 4% 53%)" }}>
                        Deadline <span style={{ color: "hsl(120 2% 22%)", fontWeight: 600 }}>{job.deadline}</span>
                      </span>
                      <span className="font-semibold text-sm" style={{ color: "hsl(8 51% 51%)" }}>
                        ${job.profit}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* ── RUNNING — Wireframe clay skeleton ── */}
          {optimizationState === "running" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(Math.min(jobs.length, 6))].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.35, 0.7, 0.35] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.6,
                      ease: "easeInOut",
                      delay: i * 0.12,
                    }}
                    className="rounded-sm overflow-hidden"
                    style={{
                      height: 96,
                      background: "hsl(38 18% 92%)",
                      border: "1px solid hsl(38 22% 86%)",
                      boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.7)",
                    }}
                  >
                    {/* Wireframe inner lines */}
                    <div className="h-full w-full p-4 flex flex-col justify-between">
                      <div
                        className="h-3 w-3/4 rounded-sm"
                        style={{ background: "hsl(38 18% 85%)", opacity: 0.7 }}
                      />
                      <div className="flex justify-between items-end">
                        <div
                          className="h-2.5 w-1/3 rounded-sm"
                          style={{ background: "hsl(38 15% 83%)", opacity: 0.6 }}
                        />
                        <div
                          className="h-3 w-1/5 rounded-sm"
                          style={{ background: "hsl(8 30% 78%)", opacity: 0.5 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "hsl(8 51% 51%)" }}
                />
                <span className="font-sans text-xs font-medium" style={{ color: "hsl(60 4% 58%)" }}>
                  Calculating optimal schedule…
                </span>
              </div>
            </div>
          )}

          {/* ── DONE — 3D Timeline ── */}
          {optimizationState === "done" && result && (
            <div className="flex flex-col gap-10">

              {/* Stats bar */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center justify-between px-6 py-4 rounded-sm"
                style={{
                  background: "hsl(30 25% 98%)",
                  border: "1px solid hsl(38 22% 87%)",
                  boxShadow: "0px 2px 8px hsl(35 22% 65% / 0.12), 0px 1px 0 hsl(0 0% 100% / 0.9) inset",
                }}
              >
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase" style={{ color: "hsl(60 4% 60%)" }}>
                    Total Profit
                  </span>
                  <span className="font-serif text-3xl font-bold" style={{ color: "hsl(8 51% 48%)" }}>
                    ${result.totalProfit}
                  </span>
                </div>
                <div
                  className="w-px self-stretch"
                  style={{ background: "hsl(38 22% 88%)" }}
                />
                <div className="flex flex-col items-end">
                  <span className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase" style={{ color: "hsl(60 4% 60%)" }}>
                    Jobs Scheduled
                  </span>
                  <span className="font-serif text-3xl font-bold" style={{ color: "hsl(120 2% 17%)" }}>
                    {result.accepted.length}
                    <span className="text-lg font-normal" style={{ color: "hsl(60 4% 58%)" }}>
                      {" "}/ {jobs.length}
                    </span>
                  </span>
                </div>
              </motion.div>

              {/* Timeline */}
              <div className="relative">

                {/* Accepted section */}
                <div className="mb-4">
                  <span
                    className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase"
                    style={{ color: "hsl(8 40% 58%)" }}
                  >
                    Accepted — {result.accepted.length} job{result.accepted.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Accepted cards — raised ceramic blocks above axis */}
                <div className="flex flex-wrap gap-3 pb-8 relative z-10">
                  {result.accepted.map((job, i) => (
                    <motion.div
                      key={job.id}
                      initial={{ y: -18, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{
                        delay: i * 0.08,
                        type: "spring",
                        stiffness: 280,
                        damping: 22,
                      }}
                      className="rounded-sm overflow-hidden min-w-[148px] relative"
                      style={{
                        background: "linear-gradient(170deg, hsl(30 28% 99%) 0%, hsl(30 22% 96%) 100%)",
                        border: "1px solid hsl(38 22% 87%)",
                        boxShadow:
                          "0px 3px 6px hsl(35 25% 58% / 0.2), 0px 8px 18px hsl(35 22% 58% / 0.14), 0px 16px 32px hsl(35 20% 58% / 0.07), 0px 1px 0 hsl(0 0% 100% / 0.95) inset, 0px -1px 0 hsl(35 22% 72% / 0.3) inset",
                      }}
                      data-testid={`card-accepted-${job.id}`}
                    >
                      {/* Terracotta left accent stripe */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-[3px]"
                        style={{
                          background: "linear-gradient(180deg, hsl(10 50% 56%) 0%, hsl(8 52% 46%) 100%)",
                        }}
                      />
                      {/* Copper top inlay */}
                      <div
                        className="absolute top-0 left-[3px] right-0 h-[1px]"
                        style={{ background: "hsl(38 30% 82%)" }}
                      />
                      <div className="p-4 pl-5">
                        <h4 className="font-serif font-bold text-base leading-tight mb-2.5" style={{ color: "hsl(120 2% 17%)" }}>
                          {job.name}
                        </h4>
                        <div className="flex items-center justify-between font-sans text-xs">
                          <span
                            className="px-1.5 py-0.5 rounded-sm font-medium"
                            style={{
                              background: "hsl(38 18% 92%)",
                              color: "hsl(60 4% 48%)",
                              border: "1px solid hsl(38 18% 86%)",
                            }}
                          >
                            DL {job.deadline}
                          </span>
                          <span className="font-bold text-sm" style={{ color: "hsl(8 51% 50%)" }}>
                            ${job.profit}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Copper axis line with ticks */}
                <div className="relative mb-8" style={{ height: 16 }}>
                  <div
                    className="absolute left-0 right-0"
                    style={{
                      top: 7,
                      height: 3,
                      borderRadius: 2,
                      background: "linear-gradient(90deg, hsl(38 25% 80%) 0%, hsl(38 28% 76%) 50%, hsl(38 25% 82%) 100%)",
                      boxShadow: "0px 1px 0 hsl(0 0% 100% / 0.6) inset, 0px 1px 3px hsl(35 22% 55% / 0.2)",
                    }}
                  />
                  {/* Axis tick marks */}
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute"
                      style={{
                        left: `${(i / 7) * 100}%`,
                        top: 2,
                        width: 1.5,
                        height: 12,
                        background: "hsl(38 22% 72%)",
                        borderRadius: 1,
                        transform: "translateX(-50%)",
                      }}
                    />
                  ))}
                </div>

                {/* Rejected section */}
                {result.rejected.length > 0 && (
                  <>
                    <div className="mb-4">
                      <span
                        className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase"
                        style={{ color: "hsl(60 4% 62%)" }}
                      >
                        Rejected — {result.rejected.length} job{result.rejected.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {result.rejected.map((job, i) => (
                        <motion.div
                          key={job.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 0.52, y: 0 }}
                          transition={{
                            delay: result.accepted.length * 0.08 + i * 0.06,
                            type: "spring",
                            stiffness: 200,
                            damping: 24,
                          }}
                          className="rounded-sm min-w-[148px]"
                          style={{
                            background: "hsl(40 10% 90%)",
                            border: "1px solid hsl(38 12% 84%)",
                          }}
                          data-testid={`card-rejected-${job.id}`}
                        >
                          <div className="p-4">
                            <h4
                              className="font-serif font-semibold text-sm leading-tight mb-2"
                              style={{ color: "hsl(60 4% 42%)" }}
                            >
                              {job.name}
                            </h4>
                            <div className="flex items-center justify-between font-sans text-xs">
                              <span style={{ color: "hsl(60 4% 56%)" }}>DL {job.deadline}</span>
                              <span style={{ color: "hsl(60 4% 48%)", fontWeight: 500 }}>${job.profit}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}

                {result.rejected.length === 0 && optimizationState === "done" && (
                  <p className="font-sans text-xs italic" style={{ color: "hsl(60 4% 64%)" }}>
                    All jobs were accepted.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── TOASTS ─── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 28, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="flex items-start gap-3 px-4 py-3.5 rounded-sm pointer-events-auto"
              style={{
                background: "hsl(30 25% 98%)",
                border: "1px solid hsl(38 22% 87%)",
                boxShadow:
                  "0px 4px 12px hsl(35 22% 55% / 0.16), 0px 12px 28px hsl(35 20% 55% / 0.1), 0px 1px 0 hsl(0 0% 100% / 0.95) inset",
                minWidth: 220,
                maxWidth: 300,
              }}
              data-testid="toast-notification"
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  background: "hsl(140 35% 92%)",
                  border: "1px solid hsl(140 30% 82%)",
                }}
              >
                <Check size={11} strokeWidth={3} style={{ color: "hsl(140 40% 42%)" }} />
              </div>
              <div className="flex flex-col min-w-0">
                <p className="font-sans text-sm font-medium" style={{ color: "hsl(120 2% 17%)" }}>
                  {toast.message}
                </p>
                {toast.sub && (
                  <p className="font-sans text-xs mt-0.5" style={{ color: "hsl(60 4% 55%)" }}>
                    {toast.sub}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
