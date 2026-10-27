// Synced from the backend repo (remotion/) by scripts/sync-remotion.mjs. Edit it there.
import React from "react";
import { AbsoluteFill, Easing, Freeze, OffthreadVideo, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { DemoShot, DemoSource, Visual } from "../types";
import type { Theme } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * Product demo scene: a stretch of the user's recording inside a browser or phone
 * frame, zooming onto the feature being narrated, with a callout and the scene's
 * heading and bullets beside it. Intro scenes ("title") show the frame tilted, hero-style.
 */
export const DemoLayout: React.FC<{
  visual: Visual; shot: DemoShot; source: DemoSource; theme: Theme; index: number; portrait: boolean; reserveBottom: number;
}> = ({ visual, shot, source, theme, index, portrait, reserveBottom }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 1080;
  const hero = visual.type === "title";
  const square = !portrait && width === height;
  const stacked = portrait || square;

  // Room for the device: beside the text (landscape) or under it (vertical/square).
  const padX = (stacked ? 64 : 110) * unit;
  const top = (stacked ? (portrait ? 150 : 90) : 110) * unit;
  const textBlock = stacked ? (portrait ? 520 : 300) * unit : 0;
  const boxW = stacked ? width - padX * 2 : width * (hero ? 0.56 : 0.58) - padX;
  const boxH = height - top - reserveBottom - textBlock - (stacked ? 40 * unit : 0);

  const enter = spring({ frame: frame - 2, fps, config: { damping: 200, mass: 0.9 } });
  const device = (
    <Device source={source} shot={shot} theme={theme} unit={unit} maxW={boxW} maxH={boxH} hero={hero} enter={enter} />
  );
  const text = <DemoText visual={visual} theme={theme} unit={unit} index={index} hero={hero} compact={stacked} />;

  if (stacked) {
    return (
      <AbsoluteFill style={{ padding: `${top}px ${padX}px ${reserveBottom}px`, alignItems: "center", gap: 40 * unit }}>
        <div style={{ width: "100%", height: textBlock, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>{text}</div>
        <div style={{ flex: 1, minHeight: 0, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>{device}</div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ padding: `${top}px ${padX}px ${reserveBottom}px`, flexDirection: "row", alignItems: "center", gap: 70 * unit }}>
      <div style={{ flex: 1, minWidth: 0 }}>{text}</div>
      <div style={{ width: boxW, height: boxH, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{device}</div>
    </AbsoluteFill>
  );
};

/** Heading, subheading and ticked bullets, staggered in. */
const DemoText: React.FC<{ visual: Visual; theme: Theme; unit: number; index: number; hero: boolean; compact: boolean }> = ({ visual, theme, unit, index, hero, compact }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = (delay: number) => {
    const p = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.6 } });
    return { opacity: p, transform: `translateY(${(1 - p) * 30 * unit}px)` };
  };
  const size = hero ? (compact ? 92 : 104) : compact ? 64 : 72;
  return (
    <div style={{ textAlign: compact ? "center" : "left" }}>
      <div style={{ ...rise(0), display: "inline-flex", alignItems: "center", gap: 12 * unit, padding: `${8 * unit}px ${18 * unit}px`, borderRadius: 999,
        background: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.accent2, fontSize: 24 * unit, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
        <span style={{ width: 10 * unit, height: 10 * unit, borderRadius: "50%", background: theme.accent2 }} />
        {hero ? "Product tour" : `Feature ${String(index).padStart(2, "0")}`}
      </div>
      <h1 className="rr-heading" style={{ ...rise(5), margin: `${22 * unit}px 0 0`, fontSize: size * unit, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5 * unit, color: theme.text }}>
        {visual.heading}
      </h1>
      {visual.subheading && (
        <p style={{ ...rise(10), margin: `${18 * unit}px 0 0`, fontSize: (hero ? 40 : 34) * unit, lineHeight: 1.3, color: theme.muted, fontWeight: 500 }}>{visual.subheading}</p>
      )}
      {!hero && visual.bullets && (
        <div style={{ marginTop: 30 * unit, display: "flex", flexDirection: "column", gap: 18 * unit, alignItems: compact ? "center" : "flex-start" }}>
          {visual.bullets.slice(0, compact ? 2 : 3).map((b, i) => (
            <div key={i} style={{ ...rise(14 + i * 6), display: "flex", alignItems: "center", gap: 16 * unit, fontSize: 34 * unit, fontWeight: 600, color: theme.text }}>
              <span style={{ display: "grid", placeItems: "center", width: 40 * unit, height: 40 * unit, borderRadius: "50%", background: theme.accent, color: "#fff", fontSize: 24 * unit, flexShrink: 0 }}>✓</span>
              {b}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Browser window (landscape recordings) or phone (portrait ones) playing the shot, with zoom and callout. */
const Device: React.FC<{ source: DemoSource; shot: DemoShot; theme: Theme; unit: number; maxW: number; maxH: number; hero: boolean; enter: number }> = ({
  source, shot, theme, unit, maxW, maxH, hero, enter,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames: len, fps } = useVideoConfig();
  const ratio = source.width / Math.max(1, source.height);
  const phone = ratio < 0.9;
  const bezel = phone ? 16 * unit : 0;
  const bar = phone ? 0 : Math.max(34, 46 * unit);
  // Fit the screen (plus chrome) inside the available box.
  let w = Math.min(maxW - bezel * 2, (maxH - bar - bezel * 2) * ratio);
  w = Math.max(100, w);
  const h = w / ratio;

  // Zoom in on the focus point a third of the way through, ease back out before the cut.
  const zIn = interpolate(frame, [len * 0.12, len * 0.34], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const zOut = len > 90 ? interpolate(frame, [len - 20, len - 4], [1, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) }) : 1;
  const zoom = 1 + (shot.zoom - 1) * Math.min(zIn, zOut);
  const calloutIn = spring({ frame: frame - Math.round(len * 0.32), fps, config: { damping: 14, mass: 0.6 } });
  const calloutOut = interpolate(frame, [len - 22, len - 10], [1, 0], clamp);

  // Hero shots float tilted; feature shots settle flat.
  const drift = interpolate(frame, [0, len], [0, 1], clamp);
  const tilt = hero ? `rotateY(${-16 + 6 * drift}deg) rotateX(${7 - 2 * drift}deg)` : `rotateX(${(1 - enter) * 14}deg)`;

  const radius = phone ? 58 * unit : 18 * unit;
  return (
    <div style={{ perspective: 2400 * unit, opacity: enter }}>
      <div style={{ position: "relative", transform: `${tilt} translateY(${(1 - enter) * 70 * unit}px)`, transformStyle: "preserve-3d" }}>
        {/* Glow behind the device */}
        <div style={{ position: "absolute", inset: "-12%", background: `radial-gradient(closest-side, ${theme.accent}55, transparent)`, filter: `blur(${40 * unit}px)` }} />
        <div style={{
          position: "relative", width: w + bezel * 2, borderRadius: radius, overflow: "hidden",
          background: phone ? "#0b0b10" : "#1b1b24", padding: bezel,
          boxShadow: `0 ${50 * unit}px ${120 * unit}px rgba(0,0,0,0.45), 0 0 0 ${1.5 * unit}px rgba(255,255,255,0.10)`,
        }}>
          {!phone && (
            <div style={{ height: bar, display: "flex", alignItems: "center", gap: 10 * unit, padding: `0 ${18 * unit}px` }}>
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 14 * unit, height: 14 * unit, borderRadius: "50%", background: c }} />)}
              <div style={{ margin: "0 auto", minWidth: "36%", maxWidth: "60%", padding: `${6 * unit}px ${20 * unit}px`, borderRadius: 999, background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.7)", fontSize: 18 * unit, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {source.product}
              </div>
              <span style={{ width: 62 * unit }} />
            </div>
          )}
          <div style={{ position: "relative", width: w, height: h, overflow: "hidden", borderRadius: phone ? radius - bezel : 0, background: "#000" }}>
            <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: `${shot.focusX * 100}% ${shot.focusY * 100}%` }}>
              <ShotVideo source={source} shot={shot} />
            </div>
            {phone && <div style={{ position: "absolute", top: 12 * unit, left: "50%", transform: "translateX(-50%)", width: w * 0.3, height: 28 * unit, borderRadius: 999, background: "#0b0b10" }} />}
            {shot.callout && (
              <Callout text={shot.callout} x={shot.focusX * w} y={shot.focusY * h} w={w} h={h} unit={unit} theme={theme} p={calloutIn * calloutOut} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Plays the shot's stretch of the recording, sped up or slowed (0.5–2×) to fit the scene, then holds the last frame. */
const ShotVideo: React.FC<{ source: DemoSource; shot: DemoShot }> = ({ source, shot }) => {
  const { durationInFrames: len, fps } = useVideoConfig();
  const clip = Math.max(0.5, Math.min(shot.end, source.duration) - shot.start);
  const rate = Math.min(2, Math.max(0.5, clip / (len / fps)));
  const play = Math.max(1, Math.min(len, Math.floor((clip * fps) / rate) - 1));
  const video = <OffthreadVideo src={source.src} muted trimBefore={Math.round(shot.start * fps)} playbackRate={rate} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  return (
    <>
      <Sequence durationInFrames={play} layout="none">{video}</Sequence>
      {play < len && <Sequence from={play} layout="none"><Freeze frame={play - 1}>{video}</Freeze></Sequence>}
    </>
  );
};

/** Pulsing dot at the focus point with a label pill beside it, kept inside the screen. */
const Callout: React.FC<{ text: string; x: number; y: number; w: number; h: number; unit: number; theme: Theme; p: number }> = ({ text, x, y, w, h, unit, theme, p }) => {
  const frame = useCurrentFrame();
  if (p <= 0.01) return null;
  const pulse = (frame % 40) / 40;
  const right = x < w * 0.6;
  const below = y < h * 0.3;
  const dot = 18 * unit;
  return (
    <>
      <div style={{ position: "absolute", left: x - dot, top: y - dot, width: dot * 2, height: dot * 2, borderRadius: "50%", border: `${3 * unit}px solid ${theme.accent}`,
        transform: `scale(${(1 + pulse * 1.4) * p})`, opacity: (1 - pulse) * p }} />
      <div style={{ position: "absolute", left: x - dot / 2, top: y - dot / 2, width: dot, height: dot, borderRadius: "50%", background: theme.accent, transform: `scale(${p})`, boxShadow: `0 0 0 ${4 * unit}px rgba(255,255,255,0.9)` }} />
      <div className="rr-heading" style={{
        position: "absolute", top: below ? y + dot * 1.6 : undefined, bottom: below ? undefined : h - y + dot * 1.6,
        left: right ? Math.max(8 * unit, x - dot) : undefined, right: right ? undefined : Math.max(8 * unit, w - x - dot),
        maxWidth: w * 0.6, padding: `${10 * unit}px ${20 * unit}px`, borderRadius: 14 * unit, background: theme.accent, color: "#fff",
        fontSize: Math.max(18, 26 * unit), fontWeight: 800, whiteSpace: "nowrap", boxShadow: `0 ${14 * unit}px ${34 * unit}px rgba(0,0,0,0.35)`,
        transform: `scale(${0.6 + 0.4 * p})`, transformOrigin: `${right ? "left" : "right"} ${below ? "top" : "bottom"}`, opacity: p,
      }}>
        {text}
      </div>
    </>
  );
};
