"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Display, Metadata } from "@/components/ui/Typography";
import { CornerBrackets } from "@/components/ui/CornerBracket";
import { RuleLine } from "@/components/ui/RuleLine";
import { GameShell } from "@/components/shell/Shell";
import { SceneSequence } from "@/components/transition/SceneSequence";
import { MISSIONS, SEQUENCE_SCENES, type Mission } from "@/data/missions";
import { fadeIn, riseIn, staggerContainer } from "@/lib/motion";
import styles from "./MissionSelect.module.css";

/**
 * SCREEN 02 — MISSION SELECT (§9).
 *
 * Large visual tiles, not dashboard cards. Keyboard is a first-class path:
 * left/right move the selection, Enter confirms, and the numbers 1-3 jump
 * directly — a presenter rehearsing the demo should never have to aim a mouse.
 *
 * The three missions are peers in layout and each carries its own scene, so the
 * screen also does the work of proving the product scales past one scene.
 *
 * Confirming a tile runs a short scene sequence rather than a wipe — see
 * `entryFrames` below.
 */

/**
 * The three stills shown when a mission is confirmed, ending on the mission's
 * own scene so the sequence reads as travelling there rather than as a
 * screensaver.
 *
 * This replaced a white exposure wipe, which was the one moment in the flow that
 * flashed the screen to paper white between two dark, neon frames — the least
 * filmic thing a "cinematic" demo can do, and the same mistake the title
 * transition had already been fixed for. Reusing the sequence keeps one motion
 * language across both entries into the fiction.
 *
 * Three frames at 300ms, against the title's six at 520ms: long enough to read
 * as a transition, short enough that a judge reselecting a mission is not made
 * to wait through it. Deterministic per mission, so the same tile always plays
 * the same run (§6).
 */
function entryFrames(missionIndex: number, scene: string): string[] {
  const total = SEQUENCE_SCENES.length;
  return [
    SEQUENCE_SCENES[(missionIndex * 2) % total],
    SEQUENCE_SCENES[(missionIndex * 2 + 3) % total],
    scene,
  ];
}

const ENTRY_HOLD_MS = 300;

export function MissionSelect() {
  const router = useRouter();
  const [focused, setFocused] = useState(0);
  const [entering, setEntering] = useState<Mission | null>(null);
  const navigated = useRef(false);
  const tiles = useRef<Array<HTMLButtonElement | null>>([]);

  /**
   * Confirming a tile hands navigation to the sequence, which owns its own
   * timing (including its shorter reduced-motion path). Scheduling a second
   * timer here would race it.
   */
  const open = useCallback((mission: Mission) => {
    if (navigated.current) return;
    navigated.current = true;
    setEntering(mission);
  }, []);

  const enterMission = useCallback(() => {
    if (entering) router.push(`/mission/${entering.id}`);
  }, [entering, router]);

  /**
   * Warm the mission route as soon as a tile takes focus.
   *
   * Same problem the title screen had: the sequence's own timer is not what the
   * player waits on. Measured on dev, the entry sequence runs ~1.3s but the
   * route took ~1.9s more to become ready, so the overlay held its last still
   * for over a second after its beats had finished — which reads as a stall
   * exactly when the player has committed.
   *
   * Prefetching on focus rather than on mount is deliberate: it is the moment
   * intent is expressed, so the work happens while the player is still reading
   * the tile, and it covers the keyboard path too (`move()` focuses the tile).
   */
  useEffect(() => {
    router.prefetch(`/mission/${MISSIONS[focused].id}`);
  }, [focused, router]);

  const move = useCallback((delta: number) => {
    setFocused((i) => {
      const next = (i + delta + MISSIONS.length) % MISSIONS.length;
      tiles.current[next]?.focus();
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          move(1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          move(-1);
          break;
        case "Enter":
          e.preventDefault();
          open(MISSIONS[focused]);
          break;
        case "1":
        case "2":
        case "3": {
          const i = Number(e.key) - 1;
          const mission = MISSIONS[i];
          if (mission) {
            e.preventDefault();
            tiles.current[i]?.focus();
            setFocused(i);
            open(mission);
          }
          break;
        }
        case "Escape":
          e.preventDefault();
          router.push("/");
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused, move, open, router]);

  return (
    <GameShell intensity="light">
      {/* The world behind the selector. Siblings of <main>, not children: they
          are fixed page grading, and the stage is a max-width column that would
          letterbox them on a wide desktop. Both are decorative. */}
      <div className={styles.ground} aria-hidden="true" />
      <div className={styles.groundScrim} aria-hidden="true" />

      <motion.main
        className={styles.stage}
        initial="hidden"
        animate="visible"
        variants={staggerContainer(0.09, 0.05)}
      >
        <motion.header className={styles.head} variants={riseIn}>
          <div>
            <Metadata>Operation select</Metadata>
            <Display as="h1" scale="title" className={styles.headTitle}>
              Select Operation
            </Display>
          </div>
          <Metadata className={styles.headMeta}>
            {MISSIONS.length} available · use ← → and enter
          </Metadata>
        </motion.header>

        <motion.div variants={fadeIn}>
          <RuleLine />
        </motion.div>

        <div className={styles.tiles}>
          {MISSIONS.map((m, i) => (
            <motion.button
              key={m.id}
              ref={(el: HTMLButtonElement | null) => {
                tiles.current[i] = el;
              }}
              type="button"
              className={styles.tile}
              data-focused={focused === i}
              data-entering={entering?.id === m.id}
              variants={riseIn}
              onClick={() => open(m)}
              onMouseEnter={() => setFocused(i)}
              onFocus={() => setFocused(i)}
              aria-label={`Operation ${m.code}, ${m.name}, ${m.location}. ${m.mood}.`}
            >
              {/* Photographic scenes, but still a plain <img>: these are 3840px
                  sources shown at tile size, so optimisation would add a build
                  step without changing what the player sees. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.tileImg}
                style={{ objectPosition: m.sceneFocus }}
                src={m.scene}
                alt=""
                aria-hidden="true"
              />
              <div className={styles.tileScrim} />
              {focused === i ? (
                <CornerBrackets size="14px" tone="accent" />
              ) : null}

              <div className={styles.tileBody}>
                <Metadata tone={focused === i ? "accent" : "muted"}>
                  Operation {m.code}
                </Metadata>
                <Display as="h2" scale="section" className={styles.tileName}>
                  {m.name}
                </Display>
                <Metadata className={styles.tileMeta}>{m.location}</Metadata>
                <Metadata className={styles.tileMeta}>{m.mood}</Metadata>
              </div>

              <div className={styles.tileFoot}>
                <Metadata>Press enter</Metadata>
                <Metadata tone={focused === i ? "accent" : "muted"}>
                  {String(i + 1)}
                </Metadata>
              </div>
            </motion.button>
          ))}
        </div>

        {/* §22 scene transition into the mission. Replaces the paper-white
            exposure flash that used to sit here — same overlay the title screen
            uses, so both entrances into the fiction share one motion language.
            Rendered as a sibling of <main> rather than inside it, for the reason
            SceneSequence documents: `position: fixed` degrades to the nearest
            transformed containing block. */}
        {entering ? (
          <SceneSequence
            scenes={entryFrames(entering.index - 1, entering.scene)}
            holdMs={ENTRY_HOLD_MS}
            onComplete={enterMission}
            label={entering.name}
          />
        ) : null}
      </motion.main>
    </GameShell>
  );
}
