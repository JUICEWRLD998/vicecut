"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Display, Metadata } from "@/components/ui/Typography";
import { CornerBrackets } from "@/components/ui/CornerBracket";
import { RuleLine } from "@/components/ui/RuleLine";
import { GameShell } from "@/components/shell/Shell";
import { MISSIONS, type Mission } from "@/data/missions";
import { T_SCENE_SLOW, fadeIn, riseIn, staggerContainer } from "@/lib/motion";
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
 */

export function MissionSelect() {
  const router = useRouter();
  const [focused, setFocused] = useState(0);
  const [entering, setEntering] = useState<string | null>(null);
  const navigated = useRef(false);
  const tiles = useRef<Array<HTMLButtonElement | null>>([]);

  const open = useCallback(
    (mission: Mission) => {
      if (navigated.current) return;
      navigated.current = true;
      setEntering(mission.id);
      window.setTimeout(() => router.push(`/mission/${mission.id}`), 420);
    },
    [router],
  );

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
              data-entering={entering === m.id}
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

        {entering ? <motion.div className={styles.wipe} transition={T_SCENE_SLOW} initial={{ opacity: 0 }} animate={{ opacity: 1 }} /> : null}
      </motion.main>
    </GameShell>
  );
}
