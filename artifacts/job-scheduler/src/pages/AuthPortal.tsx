import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Eye, EyeOff, AlertCircle, ArrowRight, Zap } from "lucide-react";
import { authApi, ApiError } from "@/lib/api";

// ─────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────
interface AuthPortalProps {
  onAuthenticated: (token: string, user: { id: number; email: string }) => void;
}

type AuthMode = "login" | "register";

// ─────────────────────────────────────────────────────────────
//  LOCAL STORAGE KEY for Remember Me
// ─────────────────────────────────────────────────────────────
const LS_REMEMBER_EMAIL = "sy_remember_email";

// ─────────────────────────────────────────────────────────────
//  PARTICLE DOTS — subtle ambient background for left panel
// ─────────────────────────────────────────────────────────────
function AmbientDots() {
  const dots = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 4,
    top: `${5 + Math.random() * 90}%`,
    left: `${3 + Math.random() * 94}%`,
    delay: Math.random() * 4,
    dur: 3 + Math.random() * 4,
    opacity: 0.08 + Math.random() * 0.18,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {dots.map((d) => (
        <motion.div
          key={d.id}
          className="absolute rounded-full"
          style={{
            width: d.size,
            height: d.size,
            top: d.top,
            left: d.left,
            background: `hsl(30 40% 97% / ${d.opacity})`,
          }}
          animate={{ y: [0, -10, 0], opacity: [d.opacity, d.opacity * 2.2, d.opacity] }}
          transition={{ repeat: Infinity, duration: d.dur, delay: d.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  INPUT COMPONENT — matches existing DebossedInput palette
// ─────────────────────────────────────────────────────────────
interface FormInputProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  rightSlot?: React.ReactNode;
  pattern?: string;
}

function FormInput({
  id, label, type, value, onChange, placeholder,
  autoComplete, required, rightSlot, pattern,
}: FormInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-sans text-[10px] font-semibold tracking-[0.18em] uppercase"
        style={{ color: "hsl(60 4% 44%)" }}
      >
        {label}
      </label>
      <div
        className="relative rounded-sm transition-all duration-300"
        style={{
          background: focused ? "hsl(30 22% 97%)" : "hsl(38 18% 93%)",
          boxShadow: focused
            ? "inset 0 2px 7px hsl(35 28% 60%/.18), inset 0 -1px 0 hsl(0 0% 100%/.7)"
            : "inset 0 2px 5px hsl(35 28% 60%/.12), inset 0 -1px 0 hsl(0 0% 100%/.55)",
        }}
      >
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          pattern={pattern}
          className="w-full bg-transparent py-3 px-3.5 pr-10 font-sans text-sm focus:outline-none placeholder:text-[hsl(60_4%_62%)]"
          style={{ color: "hsl(120 2% 17%)" }}
          data-testid={`auth-input-${id}`}
        />
        {/* Terracotta focus underline */}
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-300 rounded-b-sm"
          style={{
            height: focused ? "2px" : "1.5px",
            background: focused
              ? "linear-gradient(90deg, hsl(14 42% 56%), hsl(8 52% 44%))"
              : "hsl(38 22% 82%)",
          }}
        />
        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  AUTH PORTAL — Main Component
// ─────────────────────────────────────────────────────────────
export default function AuthPortal({ onAuthenticated }: AuthPortalProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Restore remembered email on mount ──────────────────
  useEffect(() => {
    const saved = localStorage.getItem(LS_REMEMBER_EMAIL);
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  // ── Clear error when mode or fields change ──────────────
  useEffect(() => {
    setErrorMsg(null);
  }, [mode, email, password]);

  // ── Toggle mode (Login ↔ Sign Up) ──────────────────────
  const switchMode = useCallback((m: AuthMode) => {
    setMode(m);
    setPassword("");
    setConfirmPassword("");
    setErrorMsg(null);
    setShowPassword(false);
  }, []);

  // ── Form submit handler ────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Client-side validations
    if (!email.trim() || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (mode === "register" && password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      let data;
      if (mode === "login") {
        data = await authApi.login(email.trim(), password, rememberMe);
      } else {
        data = await authApi.register(email.trim(), password);
      }

      // Remember Me — persist or clear email in localStorage
      if (rememberMe) {
        localStorage.setItem(LS_REMEMBER_EMAIL, email.trim());
      } else {
        localStorage.removeItem(LS_REMEMBER_EMAIL);
      }

      onAuthenticated(data.token, data.user);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message || "Authentication failed. Please try again.");
      } else {
        setErrorMsg("Unable to connect to the server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row"
      style={{ fontFamily: "'Inter', sans-serif" }}
      role="main"
    >
      {/* ════════════════════════════════════════════════════
          LEFT PANEL — Terracotta Brand Panel
      ════════════════════════════════════════════════════ */}
      <div
        className="relative flex flex-col justify-between lg:w-[48%] overflow-hidden"
        style={{
          background: "linear-gradient(168deg, hsl(14 42% 54%) 0%, hsl(10 46% 48%) 52%, hsl(8 52% 43%) 100%)",
          minHeight: "280px",
        }}
      >
        {/* Grain texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0.2'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23g)' opacity='0.055'/%3E%3C/svg%3E")`,
            backgroundSize: "220px 220px",
            mixBlendMode: "overlay",
          }}
        />

        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 30% 25%, hsl(14 60% 66% / 0.22) 0%, transparent 65%)",
          }}
        />

        {/* Ambient particle dots */}
        <AmbientDots />

        {/* Top edge shimmer */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, hsl(14 60% 74% / 0.45), transparent)" }}
        />

        {/* Content */}
        <div className="relative z-10 p-10 lg:p-14 flex flex-col h-full justify-between">
          {/* Logo block */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3"
          >
            <div
              className="w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0"
              style={{
                background: "hsl(30 40% 97% / 0.18)",
                border: "1px solid hsl(30 40% 97% / 0.28)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Layers size={18} style={{ color: "hsl(30 40% 97%)" }} strokeWidth={1.8} />
            </div>
            <span
              className="font-serif font-bold text-2xl tracking-tight"
              style={{ color: "hsl(30 40% 97%)", fontFamily: "'Playfair Display', serif" }}
            >
              StudioYield
            </span>
          </motion.div>

          {/* Hero copy — center of panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="py-10 lg:py-0"
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
              style={{
                background: "hsl(30 40% 97% / 0.12)",
                border: "1px solid hsl(30 40% 97% / 0.22)",
              }}
            >
              <Zap size={11} style={{ color: "hsl(30 40% 97% / 0.9)" }} />
              <span
                className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase"
                style={{ color: "hsl(30 40% 97% / 0.85)" }}
              >
                Greedy Latest Slot · Revenue First
              </span>
            </div>

            <h1
              className="font-serif font-bold italic leading-[1.05] mb-6"
              style={{
                fontSize: "clamp(2.4rem, 4.5vw, 3.8rem)",
                color: "hsl(30 40% 97%)",
                textShadow: "0 2px 16px hsl(8 51% 22% / 0.25)",
                fontFamily: "'Playfair Display', serif",
              }}
            >
              Optimize your time.{" "}
              <br />
              Maximize your yield.
            </h1>

            <p
              className="font-sans text-base leading-relaxed max-w-sm"
              style={{ color: "hsl(30 40% 97% / 0.72)" }}
            >
              Algorithmically schedule your freelance projects for peak weekly revenue — backed by a persistent, secure engine.
            </p>
          </motion.div>

          {/* Bottom stats strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="grid grid-cols-3 gap-4 pt-8"
            style={{ borderTop: "1px solid hsl(30 40% 97% / 0.18)" }}
          >
            {[
              { label: "Algorithm", val: "Greedy O(n log n)" },
              { label: "Isolation", val: "Per-User DB" },
              { label: "Auth", val: "JWT · bcrypt" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-0.5">
                <span
                  className="font-serif font-bold text-lg"
                  style={{ color: "hsl(30 40% 97%)" }}
                >
                  {s.val}
                </span>
                <span
                  className="font-sans text-[10px] tracking-widest uppercase"
                  style={{ color: "hsl(30 40% 97% / 0.6)" }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          RIGHT PANEL — Alabaster Form Control
      ════════════════════════════════════════════════════ */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16 relative overflow-hidden"
        style={{ background: "hsl(40 20% 95%)" }}
      >
        {/* Subtle noise texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0.12'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
            backgroundSize: "300px 300px",
          }}
        />

        <div className="relative z-10 w-full max-w-sm">
          {/* Tab switcher */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="flex rounded-sm overflow-hidden mb-10"
            style={{ background: "hsl(38 18% 89%)", border: "1px solid hsl(38 22% 84%)" }}
            role="tablist"
            aria-label="Authentication mode"
          >
            {(["login", "register"] as AuthMode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className="flex-1 py-2.5 font-sans text-sm font-semibold transition-all duration-300 focus:outline-none relative"
                style={{
                  color:
                    mode === m
                      ? "hsl(30 40% 97%)"
                      : "hsl(60 4% 52%)",
                  zIndex: 1,
                }}
                data-testid={`auth-tab-${m}`}
              >
                {/* Active pill */}
                {mode === m && (
                  <motion.div
                    layoutId="auth-tab-pill"
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(168deg, hsl(14 42% 54%) 0%, hsl(8 52% 44%) 100%)",
                      borderRadius: 3,
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {m === "login" ? "Log In" : "Sign Up"}
                </span>
              </button>
            ))}
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <h2
              className="font-serif font-bold text-3xl leading-tight mb-1"
              style={{ color: "hsl(120 2% 17%)", fontFamily: "'Playfair Display', serif" }}
            >
              {mode === "login" ? "Welcome back." : "Create account."}
            </h2>
            <p className="font-sans text-sm" style={{ color: "hsl(60 4% 52%)" }}>
              {mode === "login"
                ? "Sign in to your StudioYield dashboard."
                : "Start optimizing your revenue today."}
            </p>
          </motion.div>

          {/* ── Error Banner ── */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                key="error-banner"
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="overflow-hidden mb-5"
              >
                <div
                  className="flex items-start gap-2.5 px-4 py-3 rounded-sm"
                  style={{
                    background: "#FAEBE6",
                    border: "1px solid hsl(14 60% 84%)",
                    color: "#9A3412",
                  }}
                  role="alert"
                  aria-live="polite"
                >
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <p className="font-sans text-sm leading-snug">{errorMsg}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Sliding Form Panel ── */}
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.form
                key={mode}
                initial={{ x: mode === "login" ? -40 : 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: mode === "login" ? 40 : -40, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onSubmit={handleSubmit}
                className="space-y-4"
                noValidate
                aria-label={mode === "login" ? "Login form" : "Registration form"}
              >
                {/* Email */}
                <FormInput
                  id="email"
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  pattern="[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$"
                />

                {/* Password */}
                <FormInput
                  id="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
                  placeholder={mode === "register" ? "Min. 6 characters" : "••••••••"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="p-0.5 transition-opacity hover:opacity-70 focus:outline-none"
                      style={{ color: "hsl(60 4% 52%)", cursor: "pointer" }}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />

                {/* Confirm Password — register only */}
                {mode === "register" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <FormInput
                      id="confirm-password"
                      label="Confirm Password"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      required
                    />
                  </motion.div>
                )}

                {/* Remember Me — login only */}
                {mode === "login" && (
                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={rememberMe}
                      onClick={() => setRememberMe((p) => !p)}
                      className="w-4 h-4 rounded-sm flex items-center justify-center flex-shrink-0 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1"
                      style={{
                        background: rememberMe
                          ? "linear-gradient(168deg, hsl(14 42% 54%), hsl(8 52% 44%))"
                          : "hsl(38 18% 89%)",
                        border: rememberMe
                          ? "1px solid hsl(10 46% 42%)"
                          : "1px solid hsl(38 22% 78%)",
                        cursor: "pointer",
                      }}
                      data-testid="auth-remember-me"
                    >
                      {rememberMe && (
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          width="10" height="10" viewBox="0 0 10 10" fill="none"
                        >
                          <path
                            d="M1.5 5L3.8 7.5L8.5 2.5"
                            stroke="hsl(30 40% 97%)"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </motion.svg>
                      )}
                    </button>
                    <span className="font-sans text-sm" style={{ color: "hsl(60 4% 44%)" }}>
                      Remember my email
                    </span>
                  </div>
                )}

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.978 }}
                  whileHover={{ filter: "brightness(1.05)" }}
                  className="w-full mt-2 flex items-center justify-center gap-2.5 py-3.5 rounded-sm font-sans font-semibold text-sm transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(168deg, hsl(14 42% 54%) 0%, hsl(10 46% 48%) 52%, hsl(8 52% 43%) 100%)",
                    color: "hsl(30 40% 97%)",
                    boxShadow:
                      "0 3px 8px hsl(8 51% 22%/.32), 0 6px 16px hsl(8 51% 22%/.18), 0 1px 0 hsl(14 60% 68%/.4) inset, 0 -2px 0 hsl(8 50% 28%/.3) inset",
                    letterSpacing: "0.03em",
                  }}
                  data-testid="auth-submit"
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                      className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                    />
                  ) : (
                    <>
                      {mode === "login" ? "Sign In" : "Create Account"}
                      <ArrowRight size={15} />
                    </>
                  )}
                </motion.button>
              </motion.form>
            </AnimatePresence>
          </div>

          {/* Switch mode link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="font-sans text-xs text-center mt-7"
            style={{ color: "hsl(60 4% 52%)" }}
          >
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="font-semibold transition-opacity hover:opacity-70 focus:outline-none underline underline-offset-2"
                  style={{ color: "hsl(8 51% 47%)", cursor: "pointer" }}
                  data-testid="auth-switch-to-register"
                >
                  Sign up free
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-semibold transition-opacity hover:opacity-70 focus:outline-none underline underline-offset-2"
                  style={{ color: "hsl(8 51% 47%)", cursor: "pointer" }}
                  data-testid="auth-switch-to-login"
                >
                  Log in
                </button>
              </>
            )}
          </motion.p>

          {/* Bottom tagline */}
          <p
            className="font-sans text-[10px] text-center mt-10 tracking-wide"
            style={{ color: "hsl(60 4% 62%)" }}
          >
            Secured with JWT & bcrypt · Data isolated per user
          </p>
        </div>
      </div>
    </div>
  );
}
