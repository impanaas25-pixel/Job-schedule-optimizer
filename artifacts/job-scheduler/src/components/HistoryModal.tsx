import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Calendar } from "lucide-react";
import { scheduleApi, HistoryEntry, ApiError } from "@/lib/api";

export default function HistoryModal({
  open,
  onClose,
  token,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
}) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && token) {
      setLoading(true);
      setError(null);
      scheduleApi.history(token)
        .then(res => setHistory(res.history))
        .catch(err => {
          setError(err instanceof ApiError ? err.message : "Failed to load history.");
        })
        .finally(() => setLoading(false));
    }
  }, [open, token]);

  if (!open) return null;

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal Panel */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "780px",
          maxHeight: "85vh",
          overflowY: "auto",
          background: "white",
          borderRadius: "8px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
          border: "1px solid #e5e7eb",
          zIndex: 1,
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid #f3f4f6",
            padding: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 2,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#fff7ed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#c2410c",
              }}
            >
              <Calendar size={20} />
            </div>
            <div>
              <h2 style={{ fontFamily: "serif", fontSize: "1.4rem", fontWeight: "bold", color: "#1c1917", margin: 0 }}>
                Schedule History
              </h2>
              <p style={{ fontFamily: "sans-serif", fontSize: "0.75rem", color: "#6b7280", margin: "2px 0 0" }}>
                Your past committed optimizations.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "8px",
              borderRadius: "50%",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#6b7280",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "4px solid #fed7aa",
                  borderTopColor: "#f97316",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#ef4444", fontFamily: "sans-serif" }}>
              {error}
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0", color: "#9ca3af" }}>
              <Calendar size={48} style={{ margin: "0 auto 16px", opacity: 0.2 }} />
              <p style={{ fontFamily: "serif", fontSize: "1.1rem", color: "#6b7280", margin: "0 0 4px" }}>No history found</p>
              <p style={{ fontFamily: "sans-serif", fontSize: "0.75rem", margin: 0 }}>Commit a schedule to see it here.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {history.map((entry) => {
                const accepted = Array.isArray(entry.accepted_json) ? entry.accepted_json : [];
                const rejected = Array.isArray(entry.rejected_json) ? entry.rejected_json : [];

                return (
                  <div
                    key={entry.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "20px",
                      background: "#f9fafb",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                      <div>
                        <p style={{ fontFamily: "sans-serif", fontSize: "0.7rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>
                          Committed {new Date(entry.committed_at).toLocaleDateString()}
                        </p>
                        <h3 style={{ fontFamily: "serif", fontSize: "1.2rem", fontWeight: "bold", color: "#1c1917", margin: 0 }}>
                          Total Value: ₹{((entry.total_value || 0) / 1000).toFixed(1)}k
                        </h3>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontFamily: "sans-serif", fontSize: "0.875rem", color: "#374151", margin: "0 0 4px" }}>
                          <strong>{entry.total_weight || 0} / {entry.week_capacity || 0}</strong> Days Filled
                        </p>
                        <p style={{ fontFamily: "sans-serif", fontSize: "0.75rem", color: "#9ca3af", margin: 0 }}>
                          Density: {Number(entry.schedule_density || 0).toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "12px" }}>
                        <p style={{ fontFamily: "sans-serif", fontSize: "0.625rem", fontWeight: 600, color: "#059669", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
                          Accepted ({accepted.length})
                        </p>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                          {accepted.map((p: any) => (
                            <li key={p.id} style={{ fontFamily: "sans-serif", fontSize: "0.75rem", color: "#374151", display: "flex", justifyContent: "space-between" }}>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "8px" }}>{p.name}</span>
                              <span style={{ color: "#9ca3af", flexShrink: 0 }}>Day {p.scheduledDay || p.weight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "12px" }}>
                        <p style={{ fontFamily: "sans-serif", fontSize: "0.625rem", fontWeight: 600, color: "#c2410c", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
                          Waitlisted ({rejected.length})
                        </p>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                          {rejected.map((p: any) => (
                            <li key={p.id} style={{ fontFamily: "sans-serif", fontSize: "0.75rem", color: "#6b7280", display: "flex", justifyContent: "space-between", opacity: 0.8 }}>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "8px" }}>{p.name}</span>
                              <span style={{ color: "#9ca3af", flexShrink: 0 }}>Day {p.weight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
