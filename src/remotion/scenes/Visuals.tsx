// Synced from the backend repo (remotion/) by scripts/sync-remotion.mjs. Edit it there.
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import type { Visual } from "../types";
import { formatNumber, type Theme } from "../theme";

type P = { visual: Visual; theme: Theme };

const useIn = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.6 } });
};

const useScale = () => {
  const { width, height } = useVideoConfig();
  return Math.min(width, height) / 1080;
};

const Rise: React.FC<{ delay?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ delay = 0, children, style }) => {
  const p = useIn(delay);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 40}px)`, ...style }}>{children}</div>;
};

const Eyebrow: React.FC<{ theme: Theme; children: React.ReactNode }> = ({ theme, children }) => {
  const s = useScale();
  return (
    <Rise>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 14, fontSize: 30 * s, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: theme.accent2 }}>
        <span style={{ width: 44 * s, height: 4, background: theme.accent2, borderRadius: 2 }} />
        {children}
      </div>
    </Rise>
  );
};

const Heading: React.FC<{ text: string; size?: number; theme: Theme }> = ({ text, size = 84, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = useScale();
  return (
    <h1 style={{ margin: 0, fontSize: size * s, lineHeight: 1.05, fontWeight: 800, letterSpacing: -1.5, color: theme.text }}>
      {text.split(" ").map((w, i) => {
        const p = spring({ frame: frame - 4 - i * 3, fps, config: { damping: 18, mass: 0.5 } });
        return (
          <span key={i} style={{ display: "inline-block", marginRight: "0.25em", opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * 50}px)` }}>{w}</span>
        );
      })}
    </h1>
  );
};

const Card: React.FC<{ theme: Theme; children: React.ReactNode; style?: React.CSSProperties }> = ({ theme, children, style }) => (
  <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: theme.radius ?? 28, padding: 36, backdropFilter: "blur(20px)", ...style }}>{children}</div>
);

const TitleScene: React.FC<P> = ({ visual, theme }) => {
  const s = useScale();
  const line = useIn(18);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 34 * s }}>
      <Eyebrow theme={theme}>Briefing</Eyebrow>
      <Heading text={visual.heading} size={118} theme={theme} />
      <div style={{ height: 8, width: `${line * 40}%`, borderRadius: 4, background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})` }} />
      {visual.subheading && <Rise delay={22}><p style={{ margin: 0, fontSize: 44 * s, color: theme.muted, maxWidth: 1300, lineHeight: 1.35 }}>{visual.subheading}</p></Rise>}
    </div>
  );
};

const BulletsScene: React.FC<P> = ({ visual, theme }) => {
  const s = useScale();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 44 * s }}>
      <Heading text={visual.heading} theme={theme} />
      <div style={{ display: "flex", flexDirection: "column", gap: 22 * s }}>
        {(visual.bullets ?? []).map((b, i) => (
          <Rise key={i} delay={14 + i * 10}>
            <Card theme={theme} style={{ display: "flex", alignItems: "center", gap: 28 * s, padding: `${26 * s}px ${34 * s}px` }}>
              <div style={{ minWidth: 56 * s, height: 56 * s, borderRadius: 16, background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 28 * s, color: "#fff" }}>{i + 1}</div>
              <div style={{ fontSize: 42 * s, fontWeight: 600, lineHeight: 1.25 }}>{b}</div>
            </Card>
          </Rise>
        ))}
      </div>
    </div>
  );
};

const StatScene: React.FC<P> = ({ visual, theme }) => {
  const frame = useCurrentFrame();
  const s = useScale();
  const st = visual.stat!;
  const v = interpolate(frame, [8, 50], [0, st.value], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 * s }}>
      <Eyebrow theme={theme}>{visual.heading}</Eyebrow>
      <div
        className="rr-heading"
        style={{
          fontSize: 260 * s, fontWeight: 900, letterSpacing: -6, lineHeight: 1,
          background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})`, WebkitBackgroundClip: "text", color: "transparent",
        }}
      >
        {st.prefix}{formatNumber(v)}{st.suffix && /^[%kKMB]$/.test(st.suffix) ? st.suffix : st.suffix ? ` ${st.suffix}` : ""}
      </div>
      <Rise delay={20}><p style={{ margin: 0, fontSize: 52 * s, fontWeight: 600, maxWidth: 1300, lineHeight: 1.25 }}>{st.label}</p></Rise>
      {visual.subheading && <Rise delay={28}><p style={{ margin: 0, fontSize: 36 * s, color: theme.muted }}>{visual.subheading}</p></Rise>}
    </div>
  );
};

const BarChartScene: React.FC<P> = ({ visual, theme }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const s = useScale();
  const ch = visual.chart!;
  const max = Math.max(...ch.values.map(Math.abs), 1);
  const chartH = (height > width ? 900 : 480) * s;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 50 * s }}>
      <Heading text={visual.heading} size={72} theme={theme} />
      <Card theme={theme} style={{ padding: 44 * s }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 36 * s, height: chartH }}>
          {ch.values.map((v, i) => {
            const grow = interpolate(frame, [10 + i * 6, 40 + i * 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
            const top = v === max;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 16 }}>
                <div style={{ fontSize: 40 * s, fontWeight: 800, opacity: grow }}>{formatNumber(v * grow)}{ch.unit}</div>
                <div style={{ width: "100%", height: `${(Math.abs(v) / max) * 78 * grow}%`, borderRadius: 18, background: top ? `linear-gradient(180deg, ${theme.accent2}, ${theme.accent})` : theme.cardBorder, boxShadow: top ? `0 0 60px ${theme.accent}66` : "none" }} />
                <div style={{ fontSize: 30 * s, color: theme.muted, fontWeight: 600, textAlign: "center" }}>{ch.labels[i] ?? ""}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

const QuoteScene: React.FC<P> = ({ visual, theme }) => {
  const s = useScale();
  const q = visual.quote!;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 * s, maxWidth: 1500 }}>
      <Rise><div style={{ fontSize: 220 * s, lineHeight: 0.6, color: theme.accent, fontWeight: 900 }}>“</div></Rise>
      <Rise delay={8}><p style={{ margin: 0, fontSize: 70 * s, fontWeight: 700, lineHeight: 1.2, letterSpacing: -1 }}>{q.text}</p></Rise>
      {q.author && <Rise delay={20}><p style={{ margin: 0, fontSize: 38 * s, color: theme.accent2, fontWeight: 600 }}>— {q.author}</p></Rise>}
    </div>
  );
};

const TimelineScene: React.FC<P> = ({ visual, theme }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const s = useScale();
  const items = visual.items ?? [];
  const vertical = height >= width;
  const prog = interpolate(frame, [8, 20 + items.length * 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 60 * s }}>
      <Heading text={visual.heading} size={72} theme={theme} />
      <div style={{ position: "relative", display: "flex", flexDirection: vertical ? "column" : "row", gap: 30 * s }}>
        <div style={{ position: "absolute", background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})`, borderRadius: 3, ...(vertical ? { left: 22 * s, top: 0, width: 6, height: `${prog * 100}%` } : { top: 22 * s, left: 0, height: 6, width: `${prog * 100}%` }) }} />
        {items.map((it, i) => (
          <Rise key={i} delay={12 + i * 12} style={{ flex: 1, display: "flex", flexDirection: vertical ? "row" : "column", gap: 24 * s }}>
            <div style={{ width: 50 * s, height: 50 * s, minWidth: 50 * s, borderRadius: "50%", background: theme.bg[0], border: `6px solid ${theme.accent}`, zIndex: 1 }} />
            <div>
              <div style={{ fontSize: 40 * s, fontWeight: 800, color: theme.accent2 }}>{it.label}</div>
              <div style={{ fontSize: 32 * s, color: theme.muted, lineHeight: 1.3, marginTop: 8 }}>{it.detail}</div>
            </div>
          </Rise>
        ))}
      </div>
    </div>
  );
};

const ComparisonScene: React.FC<P> = ({ visual, theme }) => {
  const { width, height } = useVideoConfig();
  const s = useScale();
  const c = visual.comparison!;
  const col = (title: string, rows: string[], color: string, delay: number) => (
    <Rise delay={delay} style={{ flex: 1 }}>
      <Card theme={theme} style={{ height: "100%", borderTop: `6px solid ${color}` }}>
        <div style={{ fontSize: 46 * s, fontWeight: 800, marginBottom: 26 * s, color }}>{title}</div>
        {rows.map((r, i) => (
          <div key={i} style={{ fontSize: 34 * s, lineHeight: 1.35, padding: `${12 * s}px 0`, borderTop: i ? `1px solid ${theme.cardBorder}` : "none" }}>{r}</div>
        ))}
      </Card>
    </Rise>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 50 * s }}>
      <Heading text={visual.heading} size={72} theme={theme} />
      <div style={{ display: "flex", flexDirection: height > width ? "column" : "row", gap: 36 * s }}>
        {col(c.leftTitle, c.left, theme.accent, 12)}
        {col(c.rightTitle, c.right, theme.accent2, 22)}
      </div>
    </div>
  );
};

const ClosingScene: React.FC<P> = ({ visual, theme }) => {
  const s = useScale();
  const glow = useIn(10);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 36 * s }}>
      <Eyebrow theme={theme}>Key takeaway</Eyebrow>
      <Heading text={visual.heading} size={100} theme={theme} />
      {visual.subheading && <Rise delay={16}><p style={{ margin: 0, fontSize: 46 * s, color: theme.muted, maxWidth: 1400, lineHeight: 1.35 }}>{visual.subheading}</p></Rise>}
      <div style={{ width: 200 * s * glow, height: 8, borderRadius: 4, background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})` }} />
    </div>
  );
};

export const SceneVisual: React.FC<P> = (p) => {
  switch (p.visual.type) {
    case "title": return <TitleScene {...p} />;
    case "stat": return p.visual.stat ? <StatScene {...p} /> : <BulletsScene {...p} />;
    case "bar_chart": return p.visual.chart ? <BarChartScene {...p} /> : <BulletsScene {...p} />;
    case "quote": return p.visual.quote ? <QuoteScene {...p} /> : <BulletsScene {...p} />;
    case "timeline": return <TimelineScene {...p} />;
    case "comparison": return p.visual.comparison ? <ComparisonScene {...p} /> : <BulletsScene {...p} />;
    case "closing": return <ClosingScene {...p} />;
    default: return <BulletsScene {...p} />;
  }
};
