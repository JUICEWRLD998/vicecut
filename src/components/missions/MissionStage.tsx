"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MissionBrief } from "@/components/missions/MissionBrief";
import { DirectorCut } from "@/components/missions/DirectorCut";
import { DirectorEditor, type CapturedFrame } from "@/components/editor/DirectorEditor";
import { GameShell } from "@/components/shell/Shell";
import { getNextMission, type Mission } from "@/data/missions";

/**
 * Mission flow: brief -> director -> locked (Phase 6: -> cinematic).
 *
 * Held as one route with stages rather than separate pages, because §17 is
 * explicit that LOCK FRAME must not read as routing away. Routing between the
 * brief and the editor would also throw away the editor instance on every
 * experiment with the transition, and routing on lock would throw away the
 * captured frame.
 */

type Stage = "brief" | "direct" | "locked";

export function MissionStage({ mission }: { mission: Mission }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("brief");
  const [directing, setDirecting] = useState(false);
  /** Phase 5's "store the edited image", held in component state. */
  const [locked, setLocked] = useState<CapturedFrame | null>(null);
  const timer = useRef<number | null>(null);

  const next = getNextMission(mission.id);

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
   * LOCK FRAME (§17). Captures the frame and moves to the cut.
   *
   * This used to `console.info` the frame and stop — Phase 5's checkpoint was
   * satisfied on paper ("edited image visible") while the player saw nothing at
   * all, which is why the editor read as a basic submission. The captured frame
   * is now held in state and handed to the Director's Cut, which is what makes
   * the eight tools have a visible consequence.
   */
  const lock = useCallback((frame: CapturedFrame) => {
    setLocked(frame);
    setStage("locked");
  }, []);

  /** Back to the same scene with a fresh editor, keeping the mission selected. */
  const rollAgain = useCallback(() => {
    setLocked(null);
    setDirecting(false);
    setStage("brief");
  }, []);

  /**
   * Advance to the next mission. `router.push` rather than component state
   * because `MissionStage` is keyed on the route param — the editor and its
   * captured frame must be torn down between scenes, and a route change is what
   * guarantees that.
   */
  const nextMission = useCallback(() => {
    if (next) router.push(`/mission/${next.id}`);
  }, [next, router]);

  if (stage === "locked" && locked) {
    return (
      <GameShell intensity="light" vignette={false} grain={false}>
        <DirectorCut
          mission={mission}
          frame={locked}
          onRollAgain={rollAgain}
          onNextMission={next ? nextMission : undefined}
          nextMissionName={next?.name}
        />
      </GameShell>
    );
  }

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
