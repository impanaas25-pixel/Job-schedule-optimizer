// ═══════════════════════════════════════════════════════════
//  STAR RATING — Client Feedback Component
//  Design: Crisp Warm Cream fill + Terracotta outline when
//  unselected. Solid Terracotta fill with spring bounce when
//  hovered or selected. Matches existing palette exactly.
//  On click: immediately pushes to POST /api/feedback/submit
//  and renders a minimalist "Feedback Submitted" confirmation.
// ═══════════════════════════════════════════════════════════
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { feedbackApi, ApiError } from "@/lib/api";

// ─────────────────────────────────────────────────────────────
//  SINGLE STAR VECTOR — pure SVG, no icon library dependency
// ─────────────────────────────────────────────────────────────
function StarIcon({
  filled,
  hovered,
  size = 22,
}: {
  filled: boolean;
  hovered: boolean;
  size?: number;
}) {
  const active = filled || hovered;
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      animate={{
        scale: active ? 1.18 : 1,
        filter: active
          ? "drop-shadow(0 2px 5px hsl(8 51% 44%/0.35))"
          : "none",
      }}
      transition={{ type: "spring", stiffness: 420, damping: 18 }}
      aria-hidden
    >
      <motion.path
        d="M12 2.5L14.6 9.1H21.7L16.1 13.4L18.2 20.2L12 16.1L5.8 20.2L7.9 13.4L2.3 9.1H9.4L12 2.5Z"
        animate={{
          fill: active
            ? "hsl(12 52% 50%)"
            : "hsl(38 25% 94%)",
          stroke: active
            ? "hsl(8 52% 44%)"
            : "hsl(14 42% 62%)",
        }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

// ─────────────────────────────────────────────────────────────
//  STAR RATING COMPONENT
// ─────────────────────────────────────────────────────────────
interface StarRatingProps {
  projectId: string;
  projectName: string;
  token: string;
  /** Pre-existing rating, if the user already rated */
  initialRating?: number;
}

export default function StarRating({
  projectId,
  projectName,
  token,
  initialRating = 0,
}: StarRatingProps) {
  const [hovered, setHovered]     = useState(0);
  const [selected, setSelected]   = useState(initialRating);
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(initialRating > 0);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);

  const handleClick = useCallback(
    async (star: number) => {
      if (loading) return;
      setSelected(star);
      setLoading(true);
      setErrorMsg(null);
      try {
        await feedbackApi.submit(token, {
          project_id: projectId,
          star_rating: star,
        });
        setSubmitted(true);
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : "Could not save feedback.";
        setErrorMsg(msg);
        // Roll back optimistic selection on error
        setSelected(initialRating);
      } finally {
        setLoading(false);
      }
    },
    [token, projectId, initialRating, loading]
  );

  return (
    <div
      className="flex flex-col gap-1.5 mt-2"
      role="group"
      aria-label={`Rate project: ${projectName}`}
    >
      {/* ── Label ── */}
      <span
        className="font-sans text-[9px] font-semibold tracking-[0.16em] uppercase"
        style={{ color: "hsl(60 4% 52%)" }}
      >
        Client Feedback
      </span>

      {/* ── Stars row ── */}
      <div className="flex items-center gap-0.5" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={loading || submitted}
            onClick={() => handleClick(star)}
            onMouseEnter={() => !submitted && setHovered(star)}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            data-testid={`star-${projectId}-${star}`}
            className="focus:outline-none disabled:cursor-default"
            style={{ cursor: submitted ? "default" : "pointer" }}
          >
            <StarIcon
              filled={star <= selected}
              hovered={!submitted && star <= hovered}
            />
          </button>
        ))}

        {/* ── Loading spinner ── */}
        {loading && (
          <motion.div
            className="ml-2 w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-[hsl(8_51%_47%)]"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }}
          />
        )}
      </div>

      {/* ── Confirmation / Error ── */}
      <AnimatePresence mode="wait">
        {submitted && !errorMsg && (
          <motion.span
            key="confirmed"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="font-sans text-[10px]"
            style={{ color: "hsl(8 51% 47%)" }}
          >
            ✓ Feedback Submitted
          </motion.span>
        )}
        {errorMsg && (
          <motion.span
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="font-sans text-[10px]"
            style={{ color: "hsl(0 65% 50%)" }}
          >
            {errorMsg}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
