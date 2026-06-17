import { useEffect } from "react";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";

// ─────────────────────────────────────────────────────────────
//  SPLASH SCREEN
//  Full-screen terracotta overlay with animated logo.
//  Rendered on first load, then unmounted by the parent via
//  AnimatePresence once the 2.5 s timer fires.
//
//  Exit: slides the entire panel upward off-screen so the
//  AuthPortal beneath is revealed naturally.
// ─────────────────────────────────────────────────────────────
export default function SplashScreen() {
  // Lock body scroll while splash is visible
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <motion.div
      key="splash"
      // ── Entry ──────────────────────────────────────────────
      initial={{ y: 0, opacity: 1 }}
      animate={{ y: 0, opacity: 1 }}
      // ── Exit — panel slides upward off the viewport ───────
      exit={{ y: "-100%", transition: { duration: 0.72, ease: [0.76, 0, 0.24, 1] } }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(168deg, hsl(14 44% 52%) 0%, hsl(10 48% 46%) 50%, hsl(8 54% 41%) 100%)",
        overflow: "hidden",
      }}
    >
      {/* ── Grain texture overlay ──────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0.18'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23g)' opacity='0.06'/%3E%3C/svg%3E")`,
          backgroundSize: "220px 220px",
          mixBlendMode: "overlay",
        }}
      />

      {/* ── Radial glow ───────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 60% 50% at 50% 38%, hsl(14 60% 68% / 0.28) 0%, transparent 70%)",
        }}
      />

      {/* ── Ambient floating dots ────────────────────────── */}
      <AmbientRing />

      {/* ── Centred logo lockup ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "28px",
        }}
      >
        {/* Icon badge */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "hsl(30 40% 97% / 0.16)",
            border: "1.5px solid hsl(30 40% 97% / 0.32)",
            backdropFilter: "blur(10px)",
            boxShadow:
              "0 8px 32px hsl(8 52% 18% / 0.28), inset 0 1px 0 hsl(30 40% 97% / 0.25)",
          }}
        >
          <Layers
            size={30}
            style={{ color: "hsl(30 40% 97%)", strokeWidth: 1.6 }}
          />
        </div>

        {/* Wordmark */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700,
              fontSize: "clamp(2.2rem, 6vw, 3.2rem)",
              letterSpacing: "-0.02em",
              color: "hsl(30 40% 97%)",
              textShadow: "0 2px 20px hsl(8 52% 18% / 0.3)",
              lineHeight: 1,
            }}
          >
            StudioYield
          </span>
          <span
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 500,
              fontSize: "0.78rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "hsl(30 40% 97% / 0.62)",
            }}
          >
            Revenue Optimizer
          </span>
        </div>

        {/* Subtle pulsing underline */}
        <motion.div
          animate={{ scaleX: [0.4, 1, 0.4], opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          style={{
            width: 48,
            height: 2,
            borderRadius: 2,
            background: "hsl(30 40% 97% / 0.55)",
          }}
        />
      </motion.div>

      {/* ── Bottom tagline ───────────────────────────────── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.8 }}
        style={{
          position: "absolute",
          bottom: "2.5rem",
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: "0.72rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "hsl(30 40% 97% / 0.42)",
        }}
      >
        Initializing workspace…
      </motion.p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
//  AMBIENT RING — subtle orbiting dots around the logo
// ─────────────────────────────────────────────────────────────
function AmbientRing() {
  const dots = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i / 12) * 360,
    radius: 180 + Math.random() * 80,
    size: 2 + Math.random() * 3,
    delay: Math.random() * 4,
    duration: 4 + Math.random() * 4,
    opacity: 0.06 + Math.random() * 0.14,
  }));

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {dots.map((d) => {
        const rad = (d.angle * Math.PI) / 180;
        const cx = 50 + (d.radius / window.innerWidth) * 50 * Math.cos(rad);
        const cy = 50 + (d.radius / window.innerHeight) * 50 * Math.sin(rad);
        return (
          <motion.div
            key={d.id}
            animate={{
              y: [0, -12, 0],
              opacity: [d.opacity, d.opacity * 2.5, d.opacity],
            }}
            transition={{
              repeat: Infinity,
              duration: d.duration,
              delay: d.delay,
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              width: d.size,
              height: d.size,
              borderRadius: "50%",
              background: "hsl(30 40% 97%)",
              top: `${cy}%`,
              left: `${cx}%`,
            }}
          />
        );
      })}
    </div>
  );
}
