"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
import { T_SCENE } from "@/lib/motion";
import { motion } from "motion/react";
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
};

export function DirectorEditor({
  mission,
  onLock,
  onExit,
}: {
  mission: Mission;
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

  /**
   * §16: only the tools that make sense for this mission.
   * Built from the mission's `tools` map so the data owns the decision.
   *
   * Depends on `mission.tools` alone (a stable reference from the missions
   * array), NOT on the whole mission object — a new object identity here would
   * remount the editor and discard the user's edit.
   */
  const options = useMemo<ImageEditorOptions>(
    () => ({
      theme: "dark",
      features: {
        imageEditor: {
          enabled: true,
          tools: { ...mission.tools, stickers: false, frame: false },
        },
      },
    }),
    [mission.tools],
  );

  const handleSave = useCallback((result: ImageEditorSaveResult) => {
    const { dataUrl } = result;
    setStaged({ dataUrl, source: "onSave", degraded: false });
    setSaveFailed(false);
  }, []);

  const handleLoad = useCallback((editor: ImageEditorInstance) => {
    instanceRef.current = editor;
    setMounted(true);
  }, []);

  /**
   * LOCK FRAME (§17).
   *
   * Prefers the onSave payload. If the user never pressed the editor's own
   * save, this lifts the live canvas instead — but it records that the frame
   * came from the canvas, so the UI can stay honest about it rather than
   * claiming a save happened.
   */
  const lockFrame = useCallback(() => {
    if (staged) {
      onLock(staged);
      return;
    }
    const editor = instanceRef.current ?? editorRef.current?.editor ?? null;
    const dataUrl = editor?.getImage() ?? null;
    if (!dataUrl) {
      setSaveFailed(true);
      return;
    }
    onLock({ dataUrl, source: "getImage()", degraded: true });
  }, [onLock, staged]);

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
          <Metadata tone={mounted ? "paper" : "muted"}>
            {mounted ? "Editor live" : "Loading editor"}
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

      <div className={styles.canvas}>
        <CornerBracket corner="tl" size="14px" />
        <CornerBracket corner="br" size="14px" />
        <ImageEditor
          ref={editorRef}
          image={mission.scene}
          options={options}
          minHeight="100%"
          onLoad={handleLoad}
          onSave={handleSave}
          onLoadError={() => setLoadError(true)}
          onError={(e) => setError(e.message)}
        />
      </div>

      <footer className={styles.foot}>
        <Metadata className={styles.footHint}>{mission.instruction}</Metadata>
        {saveFailed ? (
          <Metadata tone="accent">
            Nothing to lock — the canvas could not be read
          </Metadata>
        ) : null}
        <Button variant="solid" hint="Lock" onClick={lockFrame} disabled={loadError}>
          Lock frame
        </Button>
      </footer>
    </motion.section>
  );
}
