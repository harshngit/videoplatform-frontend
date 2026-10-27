// Synced from the backend repo (remotion/) by scripts/sync-remotion.mjs. Edit it there.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderBrand, RenderProps, RenderScene, TextOverlay, Transition } from "./types";
import { THEMES, FONT, brandTheme, type Theme } from "./theme";
import { PRESETS, type Preset } from "./presets";
import { SceneVisual } from "./scenes/Visuals";
import { Background, Captions, KineticWords, Presenter } from "./scenes/Chrome";
import { ImageLayout, VisualLayout } from "./scenes/Media";
import { DemoLayout } from "./scenes/Demo";

export const FPS = 30;

export const sizeFor = (aspect: RenderProps["aspect"]) =>
  aspect === "9:16" ? { width: 1080, height: 1920 } : aspect === "1:1" ? { width: 1080, height: 1080 } : { width: 1920, height: 1080 };

/** Loads Google Fonts (brand kit or style preset) and holds the render until they're ready. */
function useFonts(families: string[]) {
  const [handle] = useState(() => (families.length ? delayRender("Loading fonts") : null));
  useEffect(() => {
    if (handle === null) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${encodeURIComponent(f)}:wght@400;600;700;800;900`).join("&")}&display=block`;
    const done = () => continueRender(handle);
    link.onload = () => {
      Promise.all(families.flatMap((f) => [document.fonts.load(`400 1em "${f}"`), document.fonts.load(`800 1em "${f}"`)])).then(done, done);
    };
    link.onerror = done; // render with fallback fonts rather than fail
    document.head.appendChild(link);
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps
}

export const Report: React.FC<RenderProps> = (props) => {
  const preset: Preset | null = props.preset ? PRESETS[props.preset] ?? null : null;
  // Brand kit colours win over the preset palette; the preset still sets shape and captions.
  const base = props.brand ? brandTheme(props.brand) : preset ? preset.theme : THEMES[props.theme] ?? THEMES.midnight;
  const theme: Theme = { ...base, radius: preset?.radius ?? base.radius ?? 28 };
  const headingFont = props.brand?.headingFont ?? preset?.headingFont ?? null;
  const bodyFont = props.brand?.bodyFont ?? preset?.bodyFont ?? null;
  useFonts([...new Set([headingFont, bodyFont].filter((f): f is string => !!f))]);
  const { durationInFrames, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const body = bodyFont ? `'${bodyFont}', ${FONT}` : FONT;
  const heading = headingFont ? `'${headingFont}', ${FONT}` : FONT;
  const unit = Math.min(width, height) / 1080;
  let from = 0;

  return (
    <AbsoluteFill style={{ fontFamily: body, color: theme.text, background: theme.bg[0] }}>
      <style>{`h1, .rr-heading { font-family: ${heading}; }`}</style>
      {props.scenes.map((sc, i) => {
        const len = Math.round(sc.durationSec * FPS);
        const start = from;
        from += len;
        return (
          <Sequence key={sc.id} from={start} durationInFrames={len} name={`${i + 1}. ${sc.visual.type}`}>
            <SceneShell scene={sc} theme={theme} props={props} preset={preset} index={i} />
          </Sequence>
        );
      })}
      <div style={{ position: "absolute", left: 0, top: 0, height: 6, width: `${(frame / durationInFrames) * 100}%`, background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})` }} />
      {props.music && <Audio src={props.music.url} loop volume={(f) => musicVolume(props, f)} />}
      {(props.overlays ?? []).map((o) => <Overlay key={o.id} o={o} unit={unit} />)}
      {props.brand && <BrandMarks brand={props.brand} unit={unit} />}
      {props.watermark && (
        <div style={{ position: "absolute", left: 36, bottom: 30, fontSize: 26, fontWeight: 700, opacity: 0.6, letterSpacing: 0.5, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
          Made with Reel Reports
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Background music, lowered while someone is speaking when ducking is on. */
function musicVolume(props: RenderProps, frame: number) {
  const m = props.music!;
  if (!m.duck) return m.volume;
  let t = 0;
  for (const sc of props.scenes) {
    const len = Math.round(sc.durationSec * FPS);
    if (frame < t + len) return sc.audioUrl && !sc.muted ? m.volume * 0.3 : m.volume;
    t += len;
  }
  return m.volume;
}

/** Editor text layer, shown between its start and end time. */
const Overlay: React.FC<{ o: TextOverlay; unit: number }> = ({ o, unit }) => {
  const frame = useCurrentFrame();
  const start = Math.round(o.startSec * FPS);
  const end = Math.round(o.endSec * FPS);
  if (frame < start || frame >= end) return null;
  const local = frame - start;
  const inP = o.animation === "none" ? 1 : interpolate(local, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const outP = o.animation === "none" ? 1 : interpolate(frame, [end - 8, end], [1, 0], { extrapolateLeft: "clamp" });
  const p = Math.min(inP, outP);
  const shift = o.animation === "slide" ? `translateY(${(1 - inP) * 40}px)` : o.animation === "pop" ? `scale(${0.7 + 0.3 * inP})` : "";
  const anchor = o.align === "left" ? "0%" : o.align === "right" ? "-100%" : "-50%";
  return (
    <div className="rr-heading" style={{
      position: "absolute", left: `${o.x}%`, top: `${o.y}%`, transform: `translate(${anchor}, -50%) ${shift}`, opacity: p,
      fontSize: o.fontSize * unit, fontWeight: o.weight, color: o.color, textAlign: o.align, lineHeight: 1.15, maxWidth: "90%",
      whiteSpace: "pre-wrap", padding: o.background ? `${0.25 * o.fontSize * unit}px ${0.5 * o.fontSize * unit}px` : 0,
      background: o.background ?? "transparent", borderRadius: o.background ? 12 * unit : 0,
      textShadow: o.background ? "none" : "0 2px 12px rgba(0,0,0,0.45)",
    }}>
      {o.text}
    </div>
  );
};

/** Scene entrance (and fade exit) for each transition type. */
function transitionStyle(t: Transition, frame: number, duration: number, width: number): React.CSSProperties {
  const inP = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const outFade = interpolate(frame, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp" });
  switch (t) {
    case "none": return {};
    case "slide": return { transform: `translateX(${(1 - inP) * width * 0.6}px)`, opacity: Math.min(1, inP * 2) };
    case "zoom": return { transform: `scale(${1.15 - 0.15 * inP})`, opacity: Math.min(inP, outFade) };
    case "wipe": return { clipPath: `inset(0 ${(1 - inP) * 100}% 0 0)` };
    default: return { opacity: Math.min(inP, outFade) };
  }
}

/** Fixed brand logo (chosen corner) and watermark (bottom-right) on every frame. */
const BrandMarks: React.FC<{ brand: RenderBrand; unit: number }> = ({ brand, unit }) => {
  const pad = 44 * unit;
  const [v, h] = brand.logoPosition.split("-") as ["top" | "bottom", "left" | "right"];
  return (
    <>
      {brand.logoUrl && (
        <Img src={brand.logoUrl} style={{ position: "absolute", [v]: pad + (v === "top" ? 6 : 0), [h]: pad, height: 72 * unit, maxWidth: 320 * unit, objectFit: "contain" }} />
      )}
      {(brand.watermarkUrl || brand.watermarkText) && (
        <div style={{ position: "absolute", right: pad, bottom: pad * 0.7, opacity: brand.watermarkOpacity, display: "flex", alignItems: "center" }}>
          {brand.watermarkUrl
            ? <Img src={brand.watermarkUrl} style={{ height: 54 * unit, maxWidth: 260 * unit, objectFit: "contain" }} />
            : <span className="rr-heading" style={{ fontSize: 28 * unit, fontWeight: 700, letterSpacing: 1 }}>{brand.watermarkText}</span>}
        </div>
      )}
    </>
  );
};

const SceneShell: React.FC<{ scene: RenderScene; theme: Theme; props: RenderProps; preset: Preset | null; index: number }> = ({ scene, theme, props, preset, index }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const portrait = height > width;
  const showPresenter = props.style === "avatar" || (props.style === "hybrid" && !scene.brollUrl);
  // Footage (AI or stock) wins over a still photo.
  const media = scene.brollUrl ? { src: scene.brollUrl, isVideo: true } : scene.imageUrl ? { src: scene.imageUrl, isVideo: false } : null;
  // A scene's own layout (editor) wins; older projects: cinematic footage rendered full-screen.
  const look = scene.layout && scene.layout !== "auto" ? scene.layout
    : props.look ?? (props.style === "cinematic" ? "visual" : props.style === "hybrid" ? "images" : "text");
  const captionStyle = props.captionStyle ?? preset?.captions ?? "bar";
  // Space kept clear above the captions (word-by-word captions are much taller).
  const reserveBottom = !props.captions ? (portrait ? 200 : 110)
    : captionStyle === "karaoke" ? (portrait ? 620 : 300) : portrait ? 420 : 190;

  let content: React.ReactNode;
  if (scene.demo && props.demo) {
    content = <DemoLayout visual={scene.visual} shot={scene.demo} source={props.demo} theme={theme} index={index} portrait={portrait} reserveBottom={reserveBottom} />;
  } else if (props.style === "voiceover") {
    content = <KineticWords text={scene.narration} eyebrow={scene.visual.type === "title" ? null : scene.visual.heading} theme={theme} portrait={portrait} />;
  } else if (media && look === "visual") {
    content = <VisualLayout visual={scene.visual} theme={theme} src={media.src} isVideo={media.isVideo} index={index} portrait={portrait} reserveBottom={reserveBottom} />;
  } else if (media && look === "images" && !showPresenter) {
    content = <ImageLayout visual={scene.visual} theme={theme} src={media.src} gallery={media.isVideo ? undefined : scene.gallery} isVideo={media.isVideo} index={index} portrait={portrait} reserveBottom={reserveBottom} />;
  } else {
    content = (
      <AbsoluteFill
        style={{
          // Portrait stacks the presenter card under the content, so reserve its height.
          padding: portrait ? (showPresenter ? "140px 70px 880px" : `160px 70px ${reserveBottom}px`) : showPresenter ? "90px 760px 170px 110px" : `110px 140px ${reserveBottom}px`,
          justifyContent: "center",
        }}
      >
        <SceneVisual visual={scene.visual} theme={theme} />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={transitionStyle(scene.transition ?? props.transition ?? "fade", frame, durationInFrames, width)}>
      <Background theme={theme} seed={index} variant={preset?.background ?? "grid"} />
      {content}
      {showPresenter && <Presenter theme={theme} avatarUrl={scene.avatarUrl} portrait={portrait} />}
      {props.captions && props.style !== "voiceover" && <Captions text={scene.narration} theme={theme} portrait={portrait} variant={captionStyle} />}
      {scene.audioUrl && !scene.muted && <Audio src={scene.audioUrl} volume={props.narrationVolume ?? 1} />}
    </AbsoluteFill>
  );
};
