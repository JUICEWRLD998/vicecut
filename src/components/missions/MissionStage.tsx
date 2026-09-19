"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MissionBrief } from "@/components/missions/MissionBrief";
import { DirectorEditor, type CapturedFrame } from "@/components/editor/DirectorEditor";
import { GameShell } from "@/components/shell/Shell";
import type { Mission } from "@/data/missions";

/**
 * Mission flow: brief -> director -> (Phase 6: cinematic -> result).
 *
 * Held as one route with stages rather than separate pages, because §17 is
 * explicit that LOCK FRAME must not read as routing away. Routing between the
 * brief and the editor would also throw away the editor instance on every
 * experiment with the transition.
 */

type Stage = "brief" | "direct";

export function MissionStage({ mission }: { mission: Mission }) {
  const [stage, setStage] = useState<Stage>("brief");
  const [directing, setDirecting] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  /** §15: brief sits, the scene dims, then the editor enters. */
  const direct = useCallback(() => {
    if (directing) return;
    setDirecting(true);
    timer.current = window.setTimeout(() => setStage("direct"), 380);
  }, [directing]);

  const exit = useCallback(() => {
    setDirecting(false);
    setStage("brief");
  }, []);

  /**
   * Phase 5/6 hand-off. The frame is captured and logged for now; Phase 6
   * replaces this with the cinematic.
   */
  const lock = useCallback((frame: CapturedFrame) => {
    console.info(
      `[VICE CUT] frame locked from ${frame.source}${frame.degraded ? " (canvas fallback, no editor save)" : ""}`,
      frame.dataUrl.slice(0, 32),
    );
  }, []);

  if (stage === "direct") {
    return (
      <GameShell intensity="light" vignette={false} grain={false}>
        <DirectorEditor mission={mission} onLock={lock} onExit={exit} />
      </GameShell>
    );
  }

  return (
    <GameShell intensity="light">
      <MissionBrief
        mission={mission}
        directLabel={directing ? "Opening" : "Direct scene"}
        onDirect={direct}
        directing={directing}
      />
    </GameShell>
  );
}
