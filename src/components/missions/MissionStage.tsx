"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MissionBrief } from "@/components/missions/MissionBrief";
import { BriefingClip } from "@/components/missions/BriefingClip";
import { MissionCinematic } from "@/components/missions/MissionCinematic";
import { DirectorEditor, type CapturedFrame } from "@/components/editor/DirectorEditor";
import { GameShell } from "@/components/shell/Shell";
import { getNextMission, editableFrame, type Mission } from "@/data/missions";

/**
 * Mission flow: brief -> briefing clip -> director -> cinematic.
 *
 * Held as one route with stages rather than separate pages, because §17 is
 * explicit that LOCK FRAME must not read as routing away. Routing between the
 * brief and the editor would also throw away the editor instance on every
 * experiment with the transition, and routing on lock would throw away the
 * captured frame.
 *
 * The clip stage exists so the instruction is earned. Mission 01 asks the player
 * to "mark the moment the plan goes wrong", and without seeing the plan they
 * have nothing to mark against — the editor becomes a decoration tool. The clip
 * shows the beat, freezes on it, and hands THAT FRAME to the editor.
 *
 * The `locked` stage is the cinematic (Phase 6). It was previously a static
 * "Director's Cut" slate; the slate's content is unchanged in substance and now
 * plays as the §18 beat sheet, which is what §18 asks for and what a still
 * screen could not be.
 */

type Stage = "brief" | "clip" | "direct" | "locked";

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

  /** §15: brief sits, the scene dims, then the briefing clip takes over. */
  const direct = useCallback(() => {
    if (directing) return;
    setDirecting(true);
    timer.current = window.setTimeout(() => {
      // A mission with no clip goes straight to the editor rather than showing
      // a playing-state with nothing in it.
      setStage(mission.briefing ? "clip" : "direct");
    }, 380);
  }, [directing, mission.briefing]);

  const exit = useCallback(() => {
    setDirecting(false);
    setStage("brief");
  }, []);

  /** The clip finished (or was skipped) — open the editor on the frozen frame. */
  const openEditor = useCallback(() => {
    setDirecting(false);
    setStage("direct");
  }, []);

  /**
   * LOCK FRAME (§17). Captures the frame and hands it to the cinematic.
   *
   * This used to `console.info` the frame and stop — Phase 5's checkpoint was
   * satisfied on paper ("edited image visible") while the player saw nothing at
   * all, which is why the editor read as a basic submission. The captured frame
   * is now held in state and handed to the Phase 6 sequence, which is what makes
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
        <MissionCinematic
          mission={mission}
          frame={locked}
          onRollAgain={rollAgain}
          onNextMission={next ? nextMission : undefined}
          nextMissionName={next?.name}
        />
      </GameShell>
    );
  }

  if (stage === "clip" && mission.briefing) {
    return (
      <GameShell intensity="light" vignette={false} grain={false}>
        <BriefingClip
          briefing={mission.briefing}
          missionName={mission.name}
          missionCode={mission.code}
          onMark={openEditor}
          onSkip={openEditor}
        />
      </GameShell>
    );
  }

  if (stage === "direct") {
    return (
      <GameShell intensity="light" vignette={false} grain={false}>
        <DirectorEditor
          mission={mission}
          image={editableFrame(mission)}
          onLock={lock}
          onExit={exit}
        />
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
