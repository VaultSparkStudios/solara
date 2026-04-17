import React from "react";

export default function SessionDeltaCard({ delta, compact = false }) {
  if (!delta) {
    return null;
  }

  return (
    <div
      style={{
        background: compact ? "rgba(0,0,0,0.18)" : "rgba(12,6,5,0.55)",
        border: "1px solid rgba(200,168,78,0.1)",
        borderRadius: compact ? 8 : 4,
        padding: compact ? 10 : 6,
        display: "grid",
        gap: compact ? 7 : 4,
      }}
    >
      <div>
        <div style={{ color: "#f0c060", fontSize: compact ? 10 : 8, fontWeight: 800, letterSpacing: 1 }}>
          {delta.title}
        </div>
        <div style={{ color: compact ? "#bca78d" : "#8f7d68", fontSize: compact ? 9 : 7, lineHeight: 1.45, marginTop: 2 }}>
          {delta.summary}
        </div>
      </div>
      <div style={{ display: "grid", gap: 4 }}>
        {delta.cards.map((card) => (
          <div
            key={card.id}
            style={{
              background: "rgba(0,0,0,0.16)",
              border: "1px solid rgba(200,168,78,0.06)",
              borderRadius: 4,
              padding: compact ? "6px 7px" : "4px 5px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
              <span style={{ color: card.accent, fontSize: compact ? 8 : 7, fontWeight: 800 }}>{card.label}</span>
              <span style={{ color: "#ddd", fontSize: compact ? 8 : 7, fontWeight: 700, textAlign: "right" }}>{card.value}</span>
            </div>
            <div style={{ color: compact ? "#9f8a73" : "#8f7d68", fontSize: compact ? 8 : 7, lineHeight: 1.4, marginTop: 2 }}>
              {card.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
