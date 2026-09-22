"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ImageEditor, {
  type ImageEditorInstance,
  type ImageEditorOptions,
  type ImageEditorRef,
  type ImageEditorSaveResult,
} from "@unlayer/react-image-editor";
import { Button } from "@/components/ui/Button";
import { CornerBracket } from "@/components/ui/CornerBracket";
import { Metadata } from "@/components/ui/Typography";
import type { Mission } from "@/data/missions";
import { audio } from "@/lib/audio";
import { T_SCENE } from "@/lib/motion";
import { motion } from "motion/react";
import { buildEditorOptions, SAVE_LABEL } from "./editor-skin";
import { toolsFor } from "./film-tools";
import styles from "./DirectorEditor.module.css";

/**
 * The Unlayer editor, configured for one mission (§15, §16).
 *
 * Two things here are load-bearing and easy to break:
 *
 * 1. `options` must keep a stable identity. Only theme/locale/translations are
 *    update-tier in the editor; every other key is remount-tier, so a fresh
 *    object each render destroys and recreates the editor and silently discards
 *    the user's edit. It is memoised on the mission id for that reason — this is
 *    the single most dangerous detail in the integration.
 *
 * 2. `features` is remount-tier too, so the curated toolset is fixed before
 *    mount and never changes while the editor is live.
 *
 * The tool rail is curated per mission (§16): the editor should feel directed,
 * not like a box of everything that exists.
 */

export type CapturedFrame = {
  dataUrl: string;
  /** Which editor path produced it. */
  source: "onSave" | "getImage()";
  /** True when onSave failed and the frame came from the live canvas instead. */
  degraded: boolean;
  /**
   * Whether the editor reported unsaved changes at lock time.
   *
   * Asked of the editor rather than inferred from the captured pixels. A single
   * thin stroke on a 4K frame covers about 0.03% of it, which disappears below
   * the resolution a pixel comparison can reasonably sample — so a diff-based
   * answer misreports "you drew nothing" for a frame the player can see is
   * marked. The editor knows, so this carries its answer through to the slate.
   */
  edited: boolean;
};

/**
 * How long an Escape on a dirty canvas waits for a second press. One source of
 * truth: the arming effect and the expiry timer must not drift apart, or the
 * warning can outlive its own confirmation window.
 */
const ESC_ARM_MS = 4000;

export function DirectorEditor({
  mission,
  image,
  onLock,
  onExit,
}: {
  mission: Mission;
  /**
   * The frame to edit. Passed in rather than read from `mission.scene`, because
   * the briefing clip freezes on a different picture than the mission tile uses —
   * mission 01's tile is the night-city aerial, its freeze is the burning car.
   * The editor must open on the frame the player was just asked to mark, and the
   * Cut's analysis measures against this same image.
   */
  image: string;
  onLock: (frame: CapturedFrame) => void;
  onExit: () => void;
}) {
  const editorRef = useRef<ImageEditorRef>(null);
  const instanceRef = useRef<ImageEditorInstance | null>(null);

  const [mounted, setMounted] = useState(false);
  /** Held until LOCK FRAME, so the exposed 40% still feels like a growing room. */
  const [staged, setStaged] = useState<CapturedFrame | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** True while a first Escape on a dirty canvas is waiting on a confirmation. */
  const [escArmed, setEscArmed] = useState(false);

  /**
   * §16: only the tools that make sense for this mission.
   * Built from the mission's `tools` map so the data owns the decision.
   *
   * The map is spread directly and NOT filtered. It used to hardcode
   * `stickers: false, frame: false` on top of the spread, which silently
   * overrode the data for two of the eight tools — they could never appear, no
   * matter what a mission declared. The per-mission map is now the only thing
   * that decides, and every key in `EditorTools` is required, so a mission
   * cannot leave one to the editor's enabled-by-default fallback by accident.
   *
   * Depends on `mission.tools` alone (a stable reference from the missions
   * array), NOT on the whole mission object — a new object identity here would
   * remount the editor and discard the user's edit.
   *
   * The skin — rail labels, rail glyphs, every string the editor renders — comes
   * from `editor-skin.ts`. It is pulled in here rather than at the call site so
   * that the toolset and the words describing it are built from the same map and
   * cannot disagree about which tools this mission has.
   */
  const options = useMemo<ImageEditorOptions>(
    () => buildEditorOptions(mission.tools),
    [mission.tools],
  );

  /** The legend: exactly the tools in this mission's rail, in the rail's order. */
  const filmTools = useMemo(() => toolsFor(mission.tools), [mission.tools]);

  const canvasRef = useRef<HTMLDivElement>(null);
  /** Latest onLock, so the save callback never fires a stale closure. */
  const onLockRef = useRef(onLock);
  useEffect(() => {
    onLockRef.current = onLock;
  }, [onLock]);

  /** True while LOCK FRAME is waiting on the editor's save to come back. */
  const pendingLock = useRef(false);
  const fallbackTimer = useRef<number | null>(null);
  const [developing, setDeveloping] = useState(false);

  useEffect(() => {
    return () => {
      if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current);
    };
  }, []);

  /**
   * Whether the editor had unsaved changes at the moment LOCK FRAME was pressed.
   *
   * Captured before the save is triggered, not inside the save callback: the
   * editor clears its dirty flag as part of saving, so reading `hasChanges()`
   * from inside `onSave` would report false for an edit that is right there in
   * the payload.
   */
  const editedAtLock = useRef(false);

  /**
   * The editor's save payload — the only capture path that reflects the edit.
   *
   * `getImage()` is NOT equivalent, and this is the one place in the
   * integration where using the obvious method silently loses work. Measured on
   * a frame with the Grayscale filter applied: `onSave` returned a fully
   * desaturated frame (channel spread 0), while `getImage()` returned a COLOURED
   * 3840x2160 image — the un-graded base — with spread 16.14. A player who only
   * filtered their scene was therefore captured as having done nothing at all,
   * and the slate honestly reported "Unmarked" for an edit they could see.
   * Missions 02 and 03 both lean on grading, so this was load-bearing.
   */
  const handleSave = useCallback((result: ImageEditorSaveResult) => {
    const frame: CapturedFrame = {
      dataUrl: result.dataUrl,
      source: "onSave",
      degraded: false,
      edited: editedAtLock.current,
    };
    setStaged(frame);
    setSaveFailed(false);
    setDeveloping(false);

    if (fallbackTimer.current !== null) {
      window.clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }
    // LOCK FRAME is waiting on this save, so hand the frame straight over.
    if (pendingLock.current) {
      pendingLock.current = false;
      onLockRef.current(frame);
    }
  }, []);

  const handleLoad = useCallback((editor: ImageEditorInstance) => {
    instanceRef.current = editor;
    setMounted(true);
  }, []);

  /**
   * LOCK FRAME (§17).
   *
   * Drives the editor's own save and locks what comes back, rather than lifting
   * the canvas. Always, even if the player already pressed Save — an earlier
   * version reused that earlier save, which meant an edit made AFTER pressing
   * Save was silently discarded at lock time. Saving again costs a moment and
   * guarantees the locked frame is the frame on screen.
   *
   * `getImage()` is the fallback only, and it is flagged as degraded, because it
   * does not include a filter (see handleSave). Falling back is still better
   * than failing the demo, but the Cut screen is told, so it never presents a
   * half-captured frame as a real export.
   */
  const lockFrame = useCallback(() => {
    if (developing) return;

    // Read the dirty flag BEFORE triggering the save: saving clears it.
    const editor = instanceRef.current ?? editorRef.current?.editor ?? null;
    editedAtLock.current = editor?.hasChanges() ?? false;

    const saveButton = canvasRef.current
      ? [...canvasRef.current.querySelectorAll("button")].find(
          (b) => b.textContent?.trim() === SAVE_LABEL,
        )
      : undefined;

    const liftCanvas = () => {
      const dataUrl = editor?.getImage() ?? null;
      if (!dataUrl) {
        setDeveloping(false);
        setSaveFailed(true);
        return;
      }
      setDeveloping(false);
      onLock({
        dataUrl,
        source: "getImage()",
        degraded: true,
        edited: editedAtLock.current,
      });
    };

    if (!saveButton) {
      liftCanvas();
      return;
    }

    pendingLock.current = true;
    setDeveloping(true);
    // The shutter, fired on the PRESS rather than when the frame comes back.
    //
    // Two reasons. The save takes seconds on a 4K frame, and the button label
    // changing to "Developing" is thin feedback for that long — the shutter
    // closes the loop immediately. And it is the honest sound: the player has
    // taken the shot, whatever the encoder is doing about it.
    audio()?.cue("lock");
    saveButton.click();

    // Do not strand the player on a button that does nothing if the save never
    // comes back. This is a guard against a HUNG save, not against a slow one,
    // and the number matters more than it looks:
    //
    // Measured on a production build, LOCK FRAME with a filter applied takes
    // ~4.9s from click to the frame being ready — the editor encodes a 3840x2160
    // frame to a ~13MB data URL, and that is simply how long it takes. The
    // original 4000ms guard was therefore SHORTER THAN THE SAVE IT WAS RACING, so
    // on a slower machine, a larger edit, or a busier main thread it would fire
    // first, fall back to `getImage()`, and silently drop the player's filter —
    // reintroducing the exact Phase 5 bug this whole path exists to prevent.
    //
    // 15s is deliberately far above any observed save: the failure it guards
    // against is a promise that never settles, and the cost of waiting that long
    // is a clearly-labelled "Developing" button, not a frozen screen.
    fallbackTimer.current = window.setTimeout(() => {
      fallbackTimer.current = null;
      if (!pendingLock.current) return;
      pendingLock.current = false;
      liftCanvas();
    }, 15000);
  }, [developing, onLock]);

  /**
   * §24 — Escape leaves the editor.
   *
   * The bar has offered an "Esc" affordance since Phase 4, but nothing listened
   * for the key: it was a label on a button, so the only real way out was to
   * click it. This is the missing half.
   *
   * Escape discards the edit, so on a dirty canvas it arms instead of exiting —
   * first press warns, second confirms. The arm expires on its own so a stray
   * keypress does not leave the editor in a state where the next one silently
   * throws the work away. A native confirm() would break the frame this screen
   * is built to hold.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      // The editor owns Escape while one of its own fields or dialogs has
      // focus — the text tool is contenteditable, and cancelling a text box
      // must not close the whole screen.
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[contenteditable="true"], input, textarea, [role="dialog"]')) {
        return;
      }

      const dirty = instanceRef.current?.hasChanges() ?? false;
      if (dirty && !escArmed) {
        e.preventDefault();
        setEscArmed(true);
        return;
      }
      onExit();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [escArmed, onExit]);

  useEffect(() => {
    if (!escArmed) return;
    const expiry = window.setTimeout(() => setEscArmed(false), ESC_ARM_MS);
    return () => window.clearTimeout(expiry);
  }, [escArmed]);

  return (
    <motion.section
      className={styles.editor}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={T_SCENE}
      aria-label={`Direct scene — ${mission.name}`}
    >
      <header className={styles.bar}>
        <div className={styles.barLeft}>
          <Metadata tone="accent">Director mode</Metadata>
          <Metadata>
            Scene {mission.code} / 03
          </Metadata>
        </div>
        <div className={styles.barRight}>
          {/* The editor's own Save stages a frame but, until now, said nothing —
              the player pressed Save and the screen was unchanged, which is why
              the flow read as a stub. The bar now reports what Save did and what
              is left to do, so the two-step (Save, then Lock Frame) is legible
              instead of looking like the button failed. */}
          <Metadata tone={staged ? "accent" : mounted ? "paper" : "muted"}>
            {loadError
              ? "Scene unavailable"
              : staged
                ? "Frame staged — lock to develop"
                : mounted
                  ? "Editor live"
                  : "Loading editor"}
          </Metadata>
          <Button variant="quiet" onClick={onExit}>
            Esc
          </Button>
        </div>
      </header>

      {(loadError || error) && (
        <div className={styles.alert} role="alert">
          {loadError
            ? "The scene never reached the canvas."
            : `Editor error: ${error}`}
        </div>
      )}

      <div className={styles.body}>
        {/* THE TOOL LEGEND.
            Sits beside the frame rather than over it, because it is read BEFORE
            a tool is chosen: it names what each of the buttons in the rail does
            to the shot, which is the one thing the rail itself has no room for
            (five characters, see editor-skin.ts). It lists exactly the tools
            this mission enabled, in the rail's own order, so reading down one
            describes reading down the other. */}
        <aside className={styles.legend} aria-label="Tools for this scene">
          <Metadata className={styles.legendHead} tone="accent">
            Your tools
          </Metadata>
          <ul className={styles.legendList}>
            {filmTools.map((t) => (
              <li key={t.key} className={styles.legendItem}>
                <span className={styles.legendVerb}>{t.verb}</span>
                {/* The rail label is only shown when it DIFFERS from the verb.
                    Four of the eight tools carry the same word in both places —
                    MARK, SLATE, PROP, MATTE — and printing it twice reads as a
                    rendering fault rather than as a cross-reference. Where they
                    differ the mapping is the useful part: the player is looking
                    for INSERT in the rail and the button says SHAPE. */}
                {t.rail !== t.verb ? (
                  <span className={styles.legendRail}>{`Rail: ${t.rail}`}</span>
                ) : null}
                <span className={styles.legendEffect}>{t.effect}</span>
              </li>
            ))}
          </ul>
        </aside>

        <div className={styles.canvas} ref={canvasRef}>
          <CornerBracket corner="tl" size="14px" />
          <CornerBracket corner="br" size="14px" />
          <ImageEditor
            ref={editorRef}
            image={image}
            options={options}
            minHeight="100%"
            onLoad={handleLoad}
            onSave={handleSave}
            /* The editor's own Cancel button routes to the same place as Esc. It
               was unhandled, so pressing it discarded the edit and left the screen
               exactly as it was — the editor sat there with a cleared canvas and
               no way to tell that anything had happened. */
            onCancel={onExit}
            onLoadError={() => setLoadError(true)}
            onError={(e) => setError(e.message)}
          />
        </div>
      </div>

      <footer className={styles.foot}>
        <Metadata className={styles.footHint}>
          {escArmed ? "Press esc again to discard this edit" : mission.instruction}
        </Metadata>
        {/* WHAT the player is marking, in the fiction's words, while they are
            choosing where to mark. The region itself is a hidden rect in the
            mission data and the result grades against it, so withholding it here
            meant a player was scored on a target they had never been shown — and
            a miss read as a scoring bug rather than as a miss. It sits beside
            the instruction rather than replacing it: the instruction is the job,
            this is the answer key.

            The label is the mission's own (`targetLabel`), because "the moment"
            is mission 01's word. Hardcoding it here told Southbound, whose brief
            says "frame the escape", that it was grading a moment. */}
        {mission.briefing ? (
          <Metadata className={styles.footMoment}>
            {`${mission.briefing.targetLabel}: ${mission.briefing.momentHint}`}
          </Metadata>
        ) : null}
        {saveFailed ? (
          <Metadata tone="accent">
            Nothing to lock — the canvas could not be read
          </Metadata>
        ) : null}
        <Button
          variant="solid"
          hint="Lock"
          onClick={lockFrame}
          disabled={loadError || developing}
        >
          {developing ? "Developing" : "Lock frame"}
        </Button>
      </footer>
    </motion.section>
  );
}
