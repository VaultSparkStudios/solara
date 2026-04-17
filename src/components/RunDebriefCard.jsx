import React from "react";

export default function RunDebriefCard({ debrief }) {
  if (!debrief) {
    return null;
  }

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.16)",
        border: `1px solid ${debrief.accent}44`,
        borderRadius: 4,
        padding: 6,
        marginBottom: 4,
      }}
    >
      <div style={{ color: debrief.accent, fontSize: 8, fontWeight: 700, letterSpacing: 0.4 }}>RUN DEBRIEF</div>
      <div style={{ color: "#ddd", fontSize: 10, fontWeight: 700, marginTop: 2 }}>{debrief.result}</div>
      <div style={{ color: "#8f7d68", fontSize: 7, lineHeight: 1.45, marginTop: 3 }}>{debrief.impact}</div>
      {Array.isArray(debrief.highlights) && debrief.highlights.length > 0 && (
        <div style={{ display: "grid", gap: 2, marginTop: 4 }}>
          {debrief.highlights.slice(0, 4).map((item, index) => (
            <div key={index} style={{ color: index === 0 ? debrief.accent : "#8f7d68", fontSize: 7, lineHeight: 1.35 }}>
              {item}
            </div>
          ))}
        </div>
      )}
      <div style={{ color: "#c8a84e", fontSize: 7, lineHeight: 1.45, marginTop: 4 }}>{debrief.nextStep}</div>
      {Array.isArray(debrief.nextActions) && debrief.nextActions.length > 0 && (
        <div style={{ display: "grid", gap: 3, marginTop: 4 }}>
          {debrief.nextActions.slice(0, 3).map((action) => (
            <div
              key={action.label}
              style={{
                background: "rgba(0,0,0,0.14)",
                border: `1px solid ${action.accent || debrief.accent}33`,
                borderRadius: 4,
                padding: "4px 5px",
              }}
            >
              <div style={{ color: action.accent || debrief.accent, fontSize: 7, fontWeight: 800 }}>{action.label}</div>
              <div style={{ color: "#8f7d68", fontSize: 7, lineHeight: 1.35, marginTop: 1 }}>{action.detail}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ color: "#777", fontSize: 7, lineHeight: 1.4, marginTop: 3 }}>{debrief.followup}</div>
      {debrief.socialPrompt && (
        <div style={{ color: "#6f8fb0", fontSize: 7, lineHeight: 1.35, marginTop: 3 }}>{debrief.socialPrompt}</div>
      )}
    </div>
  );
}
