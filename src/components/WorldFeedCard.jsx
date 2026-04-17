import React from "react";

export default function WorldFeedCard({ feed, compact = false, onAction = null }) {
  if (!Array.isArray(feed) || feed.length === 0) {
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
        gap: compact ? 6 : 4,
      }}
    >
      <div style={{ color: "#f0c060", fontSize: compact ? 10 : 8, fontWeight: 800, letterSpacing: 1 }}>
        WORLD FEED
      </div>
      {feed.slice(0, compact ? 4 : 5).map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onAction?.(item)}
          disabled={!item.action || !onAction}
          style={{
            background: "rgba(0,0,0,0.16)",
            border: `1px solid ${(item.accent || "#c8a84e")}33`,
            borderRadius: 4,
            padding: compact ? "6px 7px" : "4px 5px",
            cursor: item.action && onAction ? "pointer" : "default",
            textAlign: "left",
            width: "100%",
            opacity: item.action || !onAction ? 1 : 0.86,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
            <span style={{ color: item.accent || "#c8a84e", fontSize: compact ? 8 : 7, fontWeight: 800 }}>{item.title}</span>
            <span style={{ color: "#6f5f4d", fontSize: compact ? 7 : 6, textTransform: "uppercase" }}>{item.kind}</span>
          </div>
          <div style={{ color: compact ? "#9f8a73" : "#8f7d68", fontSize: compact ? 8 : 7, lineHeight: 1.4, marginTop: 2 }}>
            {item.detail}
          </div>
          {item.action?.label && (
            <div style={{ color: item.accent || "#c8a84e", fontSize: compact ? 7 : 6, fontWeight: 800, marginTop: 3 }}>
              {item.action.label}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
