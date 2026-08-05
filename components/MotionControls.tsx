"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  Pause,
  Play,
  Repeat,
} from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n";
import {
  getMotion,
  motionFrameAt,
  motionSteps,
  motionTotalDuration,
} from "@/lib/motion";
import type { DiagramDocument } from "@/lib/diagram-schema";

export function MotionControls({
  diagram,
  progress,
  onProgress,
  playing,
  onPlayingChange,
}: {
  diagram: DiagramDocument;
  progress: number;
  onProgress: (value: number) => void;
  playing: boolean;
  onPlayingChange: (value: boolean) => void;
}) {
  const { t } = useI18n();
  const frame = useMemo(() => motionFrameAt(diagram, progress), [diagram, progress]);
  const hasMotion = motionSteps(diagram).length > 0;
  const motion = getMotion(diagram);
  const caption = frame.entry?.caption || t("motionTraceReady");

  return (
    <div className="motion-control-bar" aria-label={t("motionControls")}>
      <button
        type="button"
        className="motion-play-button"
        onClick={() => {
          if (!hasMotion) return;
          if (playing) {
            onPlayingChange(false);
          } else {
            if (progress >= 1) onProgress(0);
            onPlayingChange(true);
          }
        }}
        disabled={!hasMotion}
        aria-label={playing ? t("pauseMotion") : t("playMotion")}
      >
        {playing ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
        {playing ? t("pauseMotion") : t("playMotion")}
      </button>
      <button
        type="button"
        className="motion-icon-button"
        onClick={() => {
          onProgress(0);
          onPlayingChange(false);
        }}
        disabled={!hasMotion}
        aria-label={t("replayMotion")}
        title={t("replayMotion")}
      >
        <ArrowCounterClockwise size={14} />
      </button>
      <div className="motion-progress-wrap">
        <div className="motion-progress-meta">
          <span className={playing ? "is-live" : ""}>
            <i /> {playing ? t("motionLive") : t("motionStill")}
          </span>
          <small>{caption}</small>
        </div>
        <input
          type="range"
          min="0"
          max="1000"
          step="1"
          value={Math.round(progress * 1000)}
          onChange={(event) => {
            onProgress(Number(event.target.value) / 1000);
            onPlayingChange(false);
          }}
          disabled={!hasMotion}
          aria-label={t("motionTimeline")}
        />
      </div>
      <span className="motion-duration" title={t("motionDuration")}>
        {Math.round(motionTotalDuration(diagram) / 100) / 10}s
        {motion.loop ? <Repeat size={12} /> : null}
      </span>
    </div>
  );
}

export function useMotionPlayback(diagram: DiagramDocument) {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const frameRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setProgress(0);
      setPlaying(false);
    }, 0);
    return () => window.clearTimeout(resetTimer);
  }, [diagram.id, diagram.revision]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (!playing) {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      return;
    }
    if (reducedMotion) {
      const reducedTimer = window.setTimeout(() => {
        setProgress(1);
        setPlaying(false);
      }, 0);
      return () => window.clearTimeout(reducedTimer);
    }
    const total = Math.max(1, motionTotalDuration(diagram));
    startedAtRef.current = performance.now() - progressRef.current * total;
    const tick = (now: number) => {
      const next = Math.max(0, Math.min(1, (now - startedAtRef.current) / total));
      setProgress(next);
      if (next >= 1) {
        if (getMotion(diagram).loop) {
          startedAtRef.current = now;
          frameRef.current = requestAnimationFrame(tick);
        } else {
          setPlaying(false);
          frameRef.current = null;
        }
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [diagram, playing, reducedMotion]);

  return { progress, setProgress, playing, setPlaying };
}
