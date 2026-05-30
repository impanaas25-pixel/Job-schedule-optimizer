import React, { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, BarChart2, Play } from "lucide-react";

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
    totalProfit: accepted.reduce((s, j) => s + j.profit, 0) 
  };
}

// --- Sample Data ---
const SAMPLE_DATA: Omit<Job, 'id'>[] = [
  { name: "Lighthouse", deadline: 2, profit: 100 },
  { name: "Harbor Bridge", deadline: 1, profit: 19 },
  { name: "City Hall Facade", deadline: 2, profit: 27 },
  { name: "Museum Wing", deadline: 1, profit: 25 },
  { name: "Park Pavilion", deadline: 3, profit: 15 },
  { name: "Observatory", deadline: 3, profit: 110 },
  { name: "Waterfront Plaza", deadline: 2, profit: 90 },
  { name: "Grand Library", deadline: 4, profit: 200 },
];

export default function Optimizer() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [optimizationState, setOptimizationState] = useState<'idle' | 'running' | 'done'>('idle');
  const [result, setResult] = useState<Result | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  
  const [jobName, setJobName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [profit, setProfit] = useState("");

  const showToast = (message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
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
      profit: p
    };
    
    setJobs(prev => [...prev, newJob]);
    setOptimizationState('idle');
    setResult(null);
    setJobName("");
    setDeadline("");
    setProfit("");
    
    showToast(`Job added — ${newJob.name}`);
  };

  const handleDeleteJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
    setOptimizationState('idle');
    setResult(null);
  };

  const handleLoadSample = () => {
    const samples = SAMPLE_DATA.map(j => ({ ...j, id: Math.random().toString(36).substr(2, 9) }));
    setJobs(samples);
    setOptimizationState('idle');
    setResult(null);
  };

  const handleOptimize = () => {
    if (jobs.length === 0) return;
    setOptimizationState('running');
    
    setTimeout(() => {
      const res = runGreedyScheduler(jobs);
      setResult(res);
      setOptimizationState('done');
      showToast(`Optimization complete — $${res.totalProfit} profit`);
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row overflow-hidden bg-background">
      {/* Left Pane - The Input Sculpt */}
      <div className="w-full md:w-[30%] min-h-screen bg-[#FDFBF9] shadow-warm-md z-10 flex flex-col border-r border-border relative">
        <div className="absolute inset-0 bg-[#C05746] opacity-[0.03] pointer-events-none"></div>
        <div className="p-8 md:p-10 flex-shrink-0 relative z-10">
          <h1 className="text-4xl font-bold text-foreground mb-1 tracking-tight">Job Optimizer</h1>
          <p className="text-muted-foreground font-sans tracking-wide text-sm font-medium mb-12 uppercase">Greedy Scheduler</p>

          <form onSubmit={handleAddJob} className="space-y-6">
            <div className="relative group">
              <input
                type="text"
                placeholder="Job Name"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                className="w-full bg-transparent border-0 border-b border-border py-3 px-2 text-foreground font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-0 peer shadow-warm-inner rounded-t-sm"
                tabIndex={1}
              />
              <div className="absolute bottom-0 left-0 w-full h-[1px] bg-secondary origin-left transition-transform duration-300 peer-focus:h-[2px] peer-focus:bg-primary scale-x-100"></div>
            </div>

            <div className="relative group">
              <input
                type="number"
                min="1"
                max="10"
                placeholder="Deadline (1-10)"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-transparent border-0 border-b border-border py-3 px-2 text-foreground font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-0 peer shadow-warm-inner rounded-t-sm"
                tabIndex={2}
              />
              <div className="absolute bottom-0 left-0 w-full h-[1px] bg-secondary origin-left transition-transform duration-300 peer-focus:h-[2px] peer-focus:bg-primary scale-x-100"></div>
            </div>

            <div className="relative group">
              <input
                type="number"
                min="0"
                placeholder="Profit ($)"
                value={profit}
                onChange={(e) => setProfit(e.target.value)}
                className="w-full bg-transparent border-0 border-b border-border py-3 px-2 text-foreground font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-0 peer shadow-warm-inner rounded-t-sm"
                tabIndex={3}
              />
              <div className="absolute bottom-0 left-0 w-full h-[1px] bg-secondary origin-left transition-transform duration-300 peer-focus:h-[2px] peer-focus:bg-primary scale-x-100"></div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97, y: 2, boxShadow: "0px 1px 2px rgba(196,184,164,0.3)" }}
              type="submit"
              className="w-full py-4 mt-8 bg-primary text-primary-foreground font-serif text-lg font-semibold rounded-sm shadow-warm-md hover:opacity-95 transition-opacity"
              tabIndex={4}
            >
              Add Job
            </motion.button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto px-8 md:px-10 pb-8 space-y-3 relative z-10">
          <AnimatePresence>
            {jobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-between p-3 bg-card border border-border shadow-warm-sm rounded-sm"
              >
                <div className="flex flex-col">
                  <span className="font-serif font-semibold text-foreground">{job.name}</span>
                  <div className="flex space-x-3 text-xs text-muted-foreground font-sans mt-1">
                    <span>DL: {job.deadline}</span>
                    <span>Profit: ${job.profit}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteJob(job.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <X size={16} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Pane - The Timeline & Data Visualization */}
      <div className="w-full md:w-[70%] min-h-screen bg-white/40 backdrop-blur-md relative flex flex-col">
        <div className="flex items-center justify-between p-6 md:p-10 border-b border-border/50">
          <div className="flex items-center space-x-4">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleOptimize}
              disabled={jobs.length === 0 || optimizationState === 'running'}
              className="flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground font-serif font-semibold rounded-sm shadow-warm-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={18} fill="currentColor" />
              <span>Run Optimization</span>
            </motion.button>
            <button
              onClick={handleLoadSample}
              className="px-6 py-3 bg-transparent border border-border text-muted-foreground font-sans font-medium rounded-sm hover:bg-card/50 transition-colors shadow-sm"
            >
              Load Sample Data
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 md:p-10 overflow-y-auto relative">
          {jobs.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <BarChart2 size={48} className="mb-4 opacity-20" strokeWidth={1} />
              <p className="font-serif text-xl text-foreground/50">Add jobs to begin</p>
            </div>
          ) : optimizationState === 'idle' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {jobs.map((job) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-card rounded-sm shadow-warm-sm border border-border"
                  >
                    <h3 className="font-serif text-xl font-semibold mb-3">{job.name}</h3>
                    <div className="flex justify-between items-center font-sans text-sm">
                      <span className="text-muted-foreground">Deadline: <span className="text-foreground font-medium">{job.deadline}</span></span>
                      <span className="text-primary font-semibold">${job.profit}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : optimizationState === 'running' ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="h-28 bg-[#E5E2DC] rounded-sm"
                  />
                ))}
              </div>
            </div>
          ) : result ? (
            <div className="h-full flex flex-col">
              <div className="mb-12">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="font-serif text-2xl font-bold">Optimization Results</h2>
                  <div className="flex space-x-6 text-sm font-sans font-medium text-muted-foreground border border-border px-4 py-2 rounded-full bg-card/50">
                    <span>Total Profit: <span className="text-foreground">${result.totalProfit}</span></span>
                    <span>Jobs Accepted: <span className="text-foreground">{result.accepted.length} / {jobs.length}</span></span>
                  </div>
                </div>

                <div className="relative pt-12 pb-20">
                  <div className="absolute top-[80px] left-0 w-full h-[3px] bg-secondary rounded-full" />
                  
                  <h3 className="text-sm font-sans font-semibold text-muted-foreground uppercase tracking-widest mb-6">Accepted</h3>
                  <div className="flex flex-wrap gap-4 relative z-10">
                    {result.accepted.map((job, i) => (
                      <motion.div
                        key={job.id}
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 20 }}
                        className="p-5 bg-card shadow-warm-md border border-border rounded-sm min-w-[140px]"
                      >
                        <h4 className="font-serif font-bold text-lg mb-2">{job.name}</h4>
                        <div className="flex flex-col space-y-1 font-sans text-xs">
                          <span className="text-muted-foreground bg-muted/30 w-fit px-2 py-0.5 rounded-sm">DL: {job.deadline}</span>
                          <span className="text-primary font-bold text-sm mt-1">${job.profit}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <h3 className="text-sm font-sans font-semibold text-muted-foreground uppercase tracking-widest mt-16 mb-6">Rejected</h3>
                  <div className="flex flex-wrap gap-4">
                    {result.rejected.map((job, i) => (
                      <motion.div
                        key={job.id}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 0.55 }}
                        transition={{ delay: (result.accepted.length + i) * 0.08, type: "spring" }}
                        className="p-4 bg-muted border border-border/50 rounded-sm min-w-[140px]"
                      >
                        <h4 className="font-serif font-semibold text-foreground/70 mb-2">{job.name}</h4>
                        <div className="flex flex-col space-y-1 font-sans text-xs">
                          <span className="text-muted-foreground">DL: {job.deadline}</span>
                          <span className="text-foreground/70 font-medium">${job.profit}</span>
                        </div>
                      </motion.div>
                    ))}
                    {result.rejected.length === 0 && (
                      <span className="text-sm text-muted-foreground font-sans italic">None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="bg-card border border-border shadow-warm-md p-4 rounded-sm flex items-center space-x-3 pointer-events-auto"
            >
              <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                <Check size={14} strokeWidth={3} />
              </div>
              <p className="font-sans text-sm font-medium text-foreground">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}