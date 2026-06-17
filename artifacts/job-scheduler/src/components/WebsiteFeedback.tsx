// ═══════════════════════════════════════════════════════════
//  WEBSITE FEEDBACK WIDGET
//  A floating, fixed-position panel (bottom-right) that lets
//  any logged-in user rate their overall experience with the
//  Freelance Revenue & Schedule Optimizer platform.
//
//  Design rules (strictly followed):
//  • Background:  Alabaster / Crisp Warm Cream
//  • Typography:  Dark Espresso Brown / Deep Stone
//  • Accent:      Terracotta / Rust  hsl(8 51% 51%)
//  • Animations:  Framer Motion spring / ease transitions
// ═══════════════════════════════════════════════════════════
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { feedbackApi, ApiError } from "@/lib/api";

// ── Label copy for each rating level ────────────────────────
const RATING_LABELS: Record<number, string> = {
  1: "Needs Improvement",
  2: "Below Expectations",
  3: "Meets Expectations",
  4: "Really Helpful",
  5: "Absolutely Excellent",
};

// ── Single animated star ─────────────────────────────────────
function Star({
  index,
  hovered,
  selected,
  locked,
  onHover,
  onClick,
}: {
  index: number;
  hovered: number;
  selected: number;
  locked: boolean;
  onHover: (n: number) => void;
  onClick: (n: number) => void;
}) {
  const active = locked ? index <= selected : index <= hovered;

  return (
    <motion.button
      type="button"
      disabled={locked}
      onMouseEnter={() => !locked && onHover(index)}
      onClick={() => onClick(index)}
      whileTap={locked ? {} : { scale: 0.88 }}
      animate={{ scale: active ? 1.22 : 1 }}
      transition={{ type: "spring", stiffness: 480, damping: 20 }}
      aria-label={`Rate ${index} star${index > 1 ? "s" : ""}`}
      data-testid={`website-star-${index}`}
      style={{ background: "none", border: "none", padding: 0, cursor: locked ? "default" : "pointer", lineHeight: 0 }}
    >
      <motion.svg
        width={28}
        height={28}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{
          filter: active
            ? "drop-shadow(0 2px 6px hsl(8 51% 44%/0.42))"
            : "none",
        }}
        transition={{ duration: 0.15 }}
      >
        <motion.path
          d="M12 2.5L14.6 9.1H21.7L16.1 13.4L18.2 20.2L12 16.1L5.8 20.2L7.9 13.4L2.3 9.1H9.4L12 2.5Z"
          animate={{
            fill: active ? "hsl(12 52% 50%)" : "hsl(38 28% 93%)",
            stroke: active ? "hsl(8 52% 42%)" : "hsl(14 38% 64%)",
          }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </motion.svg>
    </motion.button>
  );
}

// ── Main widget ──────────────────────────────────────────────
interface WebsiteFeedbackProps {
  token: string;
}

export default function WebsiteFeedback({ token }: WebsiteFeedbackProps) {
  const [open, setOpen]           = useState(false);
  const [hovered, setHovered]     = useState(0);
  const [selected, setSelected]   = useState(0);
  const [note, setNote]           = useState("");
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleStarClick = useCallback(async (star: number) => {
    if (loading || submitted) return;
    setSelected(star);
    setLoading(true);
    setError(null);
    try {
      await feedbackApi.submit(token, {
        project_id: "website",
        star_rating: star,
        note: note.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not save. Please try again.";
      setError(msg);
      setSelected(0);
    } finally {
      setLoading(false);
    }
  }, [token, note, loading, submitted]);

  const handleSubmitWithNote = useCallback(async () => {
    if (!selected || loading || submitted) return;
    await handleStarClick(selected);
  }, [selected, loading, submitted, handleStarClick]);

  const reset = () => {
    setOpen(false);
    setTimeout(() => {
      setHovered(0); setSelected(0); setNote("");
      setLoading(false); setSubmitted(false); setError(null);
    }, 400);
  };

  return (
    <>
      {/* ── Floating trigger button ─────────────────────── */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        aria-label="Rate your experience"
        data-testid="website-feedback-trigger"
        whileHover={{ scale: 1.08, boxShadow: "0 8px 28px hsl(8 51% 44%/0.35)" }}
        whileTap={{ scale: 0.94 }}
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          borderRadius: 999,
          background: "linear-gradient(135deg, hsl(14 52% 54%) 0%, hsl(8 56% 44%) 100%)",
          border: "1.5px solid hsl(8 44% 38%)",
          color: "hsl(30 50% 97%)",
          fontFamily: "inherit",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.04em",
          cursor: "pointer",
          boxShadow: "0 4px 18px hsl(8 51% 44%/0.28)",
          userSelect: "none",
        }}
      >
        <motion.span
          animate={{ rotate: open ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 20 }}
          style={{ fontSize: 16, lineHeight: 1 }}
        >
          ★
        </motion.span>
        Rate Experience
      </motion.button>

      {/* ── Slide-up feedback panel ──────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={reset}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9998,
                background: "hsl(30 12% 10% / 0.18)",
                backdropFilter: "blur(2px)",
              }}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 32, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              data-testid="website-feedback-panel"
              style={{
                position: "fixed",
                bottom: 88,
                right: 28,
                zIndex: 9999,
                width: 340,
                borderRadius: 16,
                background: "hsl(38 28% 97%)",
                border: "1.5px solid hsl(38 22% 86%)",
                boxShadow: "0 20px 60px hsl(30 18% 20%/0.18), 0 2px 8px hsl(30 12% 20%/0.08)",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div style={{
                padding: "20px 22px 16px",
                borderBottom: "1px solid hsl(38 20% 90%)",
                background: "hsl(38 24% 94%)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}>
                <div>
                  <p style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: 17,
                    fontWeight: 700,
                    color: "hsl(120 2% 16%)",
                    margin: 0,
                    lineHeight: 1.2,
                  }}>
                    How was your experience?
                  </p>
                  <p style={{
                    fontFamily: "Inter, system-ui, sans-serif",
                    fontSize: 11.5,
                    color: "hsl(60 4% 50%)",
                    marginTop: 5,
                    lineHeight: 1.45,
                  }}>
                    Tell us how well this platform supported your freelance scheduling workflow.
                  </p>
                </div>

                {/* Close */}
                <button
                  onClick={reset}
                  aria-label="Close feedback"
                  style={{
                    background: "none", border: "none",
                    cursor: "pointer", padding: 2, flexShrink: 0,
                    color: "hsl(60 4% 52%)", fontSize: 18, lineHeight: 1,
                  }}
                >×</button>
              </div>

              {/* Body */}
              <div style={{ padding: "20px 22px 22px" }}>
                <AnimatePresence mode="wait">
                  {!submitted ? (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {/* Stars */}
                      <div
                        onMouseLeave={() => !submitted && setHovered(0)}
                        style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 10 }}
                      >
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star
                            key={i}
                            index={i}
                            hovered={hovered}
                            selected={selected}
                            locked={submitted || loading}
                            onHover={setHovered}
                            onClick={handleStarClick}
                          />
                        ))}
                      </div>

                      {/* Rating label */}
                      <div style={{ minHeight: 20, textAlign: "center", marginBottom: 16 }}>
                        <AnimatePresence mode="wait">
                          {(hovered > 0 || selected > 0) && (
                            <motion.p
                              key={hovered || selected}
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.18 }}
                              style={{
                                fontFamily: "Inter, system-ui, sans-serif",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "hsl(8 51% 47%)",
                                margin: 0,
                              }}
                            >
                              {RATING_LABELS[hovered || selected]}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Optional note */}
                      <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Share a thought (optional)…"
                        maxLength={280}
                        rows={3}
                        style={{
                          width: "100%",
                          resize: "none",
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1.5px solid hsl(38 20% 84%)",
                          background: "hsl(38 20% 99%)",
                          fontFamily: "Inter, system-ui, sans-serif",
                          fontSize: 12.5,
                          color: "hsl(120 2% 18%)",
                          outline: "none",
                          boxSizing: "border-box",
                          transition: "border-color 0.18s",
                        }}
                        onFocus={e => (e.target.style.borderColor = "hsl(14 42% 58%)")}
                        onBlur={e => (e.target.style.borderColor = "hsl(38 20% 84%)")}
                      />

                      {/* Character counter */}
                      <p style={{
                        fontFamily: "Inter, system-ui, sans-serif",
                        fontSize: 10,
                        color: "hsl(60 4% 58%)",
                        textAlign: "right",
                        marginTop: 4,
                        marginBottom: 14,
                      }}>
                        {note.length}/280
                      </p>

                      {/* Submit button */}
                      <motion.button
                        onClick={handleSubmitWithNote}
                        disabled={!selected || loading}
                        whileHover={selected && !loading ? { scale: 1.03 } : {}}
                        whileTap={selected && !loading ? { scale: 0.97 } : {}}
                        style={{
                          width: "100%",
                          padding: "11px 0",
                          borderRadius: 8,
                          border: "none",
                          background: selected
                            ? "linear-gradient(135deg, hsl(14 52% 54%) 0%, hsl(8 56% 44%) 100%)"
                            : "hsl(38 16% 88%)",
                          color: selected ? "hsl(30 50% 97%)" : "hsl(60 4% 60%)",
                          fontFamily: "Inter, system-ui, sans-serif",
                          fontSize: 13,
                          fontWeight: 600,
                          letterSpacing: "0.04em",
                          cursor: selected && !loading ? "pointer" : "not-allowed",
                          transition: "background 0.22s, color 0.22s",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        {loading ? (
                          <>
                            <motion.span
                              style={{
                                display: "inline-block",
                                width: 13, height: 13,
                                borderRadius: "50%",
                                border: "2px solid hsl(30 50% 90%/0.4)",
                                borderTop: "2px solid hsl(30 50% 97%)",
                              }}
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                            />
                            Submitting…
                          </>
                        ) : (
                          <>★ Submit Feedback</>
                        )}
                      </motion.button>

                      {/* Error */}
                      {error && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          style={{
                            fontFamily: "Inter, system-ui, sans-serif",
                            fontSize: 11.5,
                            color: "hsl(0 60% 48%)",
                            textAlign: "center",
                            marginTop: 10,
                          }}
                        >
                          {error}
                        </motion.p>
                      )}
                    </motion.div>
                  ) : (
                    /* ── Thank-you state ── */
                    <motion.div
                      key="thanks"
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 340, damping: 24 }}
                      style={{ textAlign: "center", padding: "12px 0 6px" }}
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.06 }}
                        style={{
                          width: 52, height: 52, borderRadius: "50%",
                          background: "linear-gradient(135deg, hsl(14 52% 56%) 0%, hsl(8 56% 44%) 100%)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          margin: "0 auto 14px",
                          boxShadow: "0 6px 22px hsl(8 51% 44%/0.32)",
                        }}
                      >
                        <span style={{ fontSize: 22, color: "white" }}>★</span>
                      </motion.div>

                      <p style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: 17,
                        fontWeight: 700,
                        color: "hsl(120 2% 16%)",
                        marginBottom: 6,
                      }}>
                        Thank you!
                      </p>
                      <p style={{
                        fontFamily: "Inter, system-ui, sans-serif",
                        fontSize: 12,
                        color: "hsl(60 4% 50%)",
                        lineHeight: 1.55,
                        marginBottom: 18,
                      }}>
                        Your {RATING_LABELS[selected].toLowerCase()} rating has been saved.<br />
                        We're grateful for your feedback.
                      </p>

                      {/* Star recap */}
                      <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 18 }}>
                        {[1,2,3,4,5].map(i => (
                          <span key={i} style={{
                            fontSize: 20,
                            color: i <= selected ? "hsl(12 52% 50%)" : "hsl(38 20% 82%)",
                          }}>★</span>
                        ))}
                      </div>

                      <button
                        onClick={reset}
                        style={{
                          fontFamily: "Inter, system-ui, sans-serif",
                          fontSize: 12,
                          color: "hsl(8 51% 47%)",
                          background: "none", border: "none",
                          cursor: "pointer", textDecoration: "underline",
                          textDecorationColor: "hsl(8 51% 47%/0.4)",
                        }}
                      >
                        Close
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
