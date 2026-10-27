// Synced from the backend repo (remotion/) by scripts/sync-remotion.mjs. Edit it there.
import React from "react";
import { AbsoluteFill, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Theme } from "../theme";

export const Background: React.FC<{ theme: Theme; seed: number; variant?: "blobs" | "grid" | "soft" | "plain" }> = ({ theme, seed, variant = "grid" }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = (frame + seed * 90) / 30;
  const size = Math.max(width, height) * 0.55;
  // Colour blobs read as glow on dark backgrounds but wash out light ones.
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(theme.bg[0].slice(i, i + 2), 16) || 0);
  const light = 0.299 * r + 0.587 * g + 0.114 * b > 160;
  const blobOpacity = (light ? 0.14 : 0.32) * (variant === "soft" ? 0.6 : variant === "plain" ? 0 : 1);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(${135 + seed * 20}deg, ${theme.bg[0]}, ${theme.bg[1]})`, overflow: "hidden" }}>
      {theme.blobs.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute", width: size, height: size, borderRadius: "50%", background: c, opacity: blobOpacity, filter: `blur(${size / 4}px)`,
            left: width * (0.15 + 0.35 * i) + Math.sin(t * 0.4 + i * 2) * width * 0.08 - size / 2,
            top: height * (0.3 + 0.25 * ((i + seed) % 2)) + Math.cos(t * 0.35 + i) * height * 0.1 - size / 2,
          }}
        />
      ))}
      {variant === "grid" && (
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${theme.cardBorder} 1px, transparent 1px), linear-gradient(90deg, ${theme.cardBorder} 1px, transparent 1px)`,
          backgroundSize: "80px 80px", opacity: 0.35,
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
        }}
      />
      )}
    </AbsoluteFill>
  );
};

/** Subtitles: narration split into short chunks, paced evenly across the scene. */
export const Captions: React.FC<{ text: string; theme: Theme; portrait: boolean; variant?: "bar" | "karaoke" | "minimal" }> = ({ text, theme, portrait, variant = "bar" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  if (variant === "karaoke") return <KaraokeCaptions words={words} theme={theme} portrait={portrait} />;
  const per = portrait ? 5 : 9;
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += per) chunks.push(words.slice(i, i + per).join(" "));
  const usable = Math.max(1, durationInFrames - 18);
  const idx = Math.min(chunks.length - 1, Math.floor((frame / usable) * chunks.length));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: portrait ? 200 : 60, display: "flex", justifyContent: "center", padding: "0 80px" }}>
      <div
        style={variant === "minimal" ? {
          color: "#fff", fontSize: portrait ? 44 : 36, fontWeight: 600, lineHeight: 1.3, textAlign: "center", maxWidth: 1500,
          textShadow: "0 2px 4px rgba(0,0,0,0.9), 0 0 24px rgba(0,0,0,0.6)",
        } : {
          background: "rgba(0,0,0,0.55)", color: "#fff", padding: "14px 28px", borderRadius: Math.min(theme.radius ?? 16, 16),
          fontSize: portrait ? 46 : 38, fontWeight: 600, lineHeight: 1.3, textAlign: "center", maxWidth: 1500,
          border: `1px solid ${theme.cardBorder}`,
        }}
      >
        {chunks[idx]}
      </div>
    </div>
  );
};

/** Social-style captions: a few big words at a time, the spoken word highlighted. */
const KaraokeCaptions: React.FC<{ words: string[]; theme: Theme; portrait: boolean }> = ({ words, theme, portrait }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 1080;
  const per = portrait ? 3 : 4;
  const usable = Math.max(1, durationInFrames - 15);
  const at = Math.min(words.length - 1, Math.floor((frame / usable) * words.length));
  const start = Math.floor(at / per) * per;
  const startF = (at / words.length) * usable;
  const pop = interpolate(frame, [startF, startF + 5], [1.18, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: portrait ? 330 : 90, display: "flex", justifyContent: "center", padding: "0 60px" }}>
      <div className="rr-heading" style={{ fontSize: (portrait ? 84 : 64) * unit, fontWeight: 900, textTransform: "uppercase", textAlign: "center", lineHeight: 1.1, letterSpacing: 0.5 }}>
        {words.slice(start, start + per).map((w, i) => {
          const on = start + i === at;
          return (
            <span key={start + i} style={{
              display: "inline-block", margin: "0 0.16em", color: on ? theme.accent : "#fff", transform: on ? `scale(${pop})` : undefined,
              textShadow: "0 0 2px #000, 0 4px 0 rgba(0,0,0,0.85), 0 8px 30px rgba(0,0,0,0.6)", WebkitTextStroke: `${3 * unit}px rgba(0,0,0,0.85)`, paintOrder: "stroke fill",
            }}>{w}</span>
          );
        })}
      </div>
    </div>
  );
};

/** AI presenter: HeyGen clip when available, otherwise an animated speaking card. */
export const Presenter: React.FC<{ theme: Theme; avatarUrl: string | null; portrait: boolean }> = ({ theme, avatarUrl, portrait }) => {
  const frame = useCurrentFrame();
  const w = portrait ? 520 : 560;
  const h = portrait ? 520 : 760;
  const enter = interpolate(frame, [0, 18], [60, 0], { extrapolateRight: "clamp" });
  const box: React.CSSProperties = portrait
    ? { left: "50%", bottom: 330, marginLeft: -w / 2 }
    : { right: 110, top: "50%", marginTop: -h / 2 - 30 };
  return (
    <div
      style={{
        position: "absolute", width: w, height: h, borderRadius: 36, overflow: "hidden", ...box,
        transform: `translateY(${enter}px)`, border: `2px solid ${theme.cardBorder}`, background: theme.card,
        boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
      }}
    >
      {avatarUrl ? (
        <Video src={avatarUrl} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40 }}>
          <div style={{ position: "relative", width: 240, height: 240 }}>
            {[0, 1, 2].map((i) => {
              const s = 1 + ((frame / 30 + i * 0.33) % 1) * 0.6;
              return (
                <div key={i} style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `3px solid ${theme.accent}`, transform: `scale(${s})`, opacity: 1.6 - s }} />
              );
            })}
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 96 }}>
              🎙️
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", height: 80 }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} style={{ width: 12, borderRadius: 6, background: theme.accent2, height: 20 + Math.abs(Math.sin(frame / 4 + i * 0.9)) * 60 }} />
            ))}
          </div>
          <div style={{ fontSize: 30, color: theme.muted, fontWeight: 600 }}>Your presenter</div>
        </AbsoluteFill>
      )}
    </div>
  );
};

/**
 * Voice-over style: the narration itself is the visual. Words land in time
 * with the voice (paced evenly), a few at a time, the current word highlighted.
 */
export const KineticWords: React.FC<{ text: string; eyebrow: string | null; theme: Theme; portrait: boolean }> = ({ text, eyebrow, theme, portrait }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 1080;
  const words = text.split(/\s+/).filter(Boolean);
  const per = portrait ? 5 : 7;
  const usable = Math.max(1, durationInFrames - 15);
  const at = Math.min(words.length - 1, Math.floor((frame / usable) * words.length));
  const groupStart = Math.floor(at / per) * per;
  const group = words.slice(groupStart, groupStart + per);
  return (
    <AbsoluteFill style={{ padding: portrait ? "220px 80px 300px" : "120px 160px", justifyContent: "center" }}>
      {eyebrow && (
        <div className="rr-heading" style={{ fontSize: 30 * unit, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: theme.accent2, marginBottom: 40 * unit }}>
          {eyebrow}
        </div>
      )}
      <div className="rr-heading" style={{ fontSize: (portrait ? 104 : 112) * unit, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2 }}>
        {group.map((w, i) => {
          const idx = groupStart + i;
          const shown = idx <= at;
          const startF = (idx / words.length) * usable;
          const p = interpolate(frame, [startF - 2, startF + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <span key={idx} style={{
              display: "inline-block", marginRight: "0.24em", opacity: shown ? p : 0.12,
              transform: `translateY(${(1 - p) * 30}px)`, color: idx === at ? theme.accent : theme.text,
            }}>{w}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
