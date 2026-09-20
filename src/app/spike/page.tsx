"use client";

import { useCallback, useRef, useState } from "react";
import ImageEditor, {
  type ImageEditorInstance,
  type ImageEditorOptions,
  type ImageEditorRef,
  type ImageEditorSaveResult,
} from "@unlayer/react-image-editor";
import styles from "./spike.module.css";

/**
 * Phase 1 technical spike.
 *
 * Proves, against the real @unlayer/react-image-editor and nothing faked:
 *   scene asset -> ImageEditor -> user edit -> onSave / getImage()
 *   -> edited payload held in state -> rendered back into the page.
 *
 * The payload captured here is exactly what the cinematic layer consumes later,
 * so the shape (dataUrl) is the contract, not a local detail.
 */

const SCENE_SRC = "/scenes/title-cover.jpg";

/**
 * Module-level so object identity is stable across renders.
 *
 * `options` other than theme/locale/translations are remount-tier: a fresh
 * object each render would destroy and recreate the editor, throwing away the
 * user's edits. Keep this frozen.
 */
const EDITOR_OPTIONS: ImageEditorOptions = {
  theme: "dark",
  features: {
    imageEditor: {
      enabled: true,
      tools: {
        crop: true,
        resize: true,
        filter: true,
        draw: true,
        text: true,
        shapes: true,
        stickers: { enabled: false },
        frame: { enabled: false },
      },
    },
  },
};

type CapturedFrame = {
  /** The payload handed to the cinematic layer. */
  dataUrl: string;
  /** Which editor path produced it. */
  source: "onSave" | "getImage()";
  byteSize: number | null;
  /**
   * Blob detail, only ever populated by onSave. Held inside the frame rather
   * than alongside it so a getImage() capture cannot display the previous
   * save's blob as if it belonged to the current frame.
   */
  blob: string | null;
};

function dataUrlBytes(dataUrl: string): number | null {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return null;
  const body = dataUrl.slice(comma + 1);
  return Math.floor((body.length * 3) / 4);
}

export default function SpikePage() {
  const editorRef = useRef<ImageEditorRef>(null);
  const instanceRef = useRef<ImageEditorInstance | null>(null);

  const [mounted, setMounted] = useState(false);
  const [frame, setFrame] = useState<CapturedFrame | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [wrapperError, setWrapperError] = useState<string | null>(null);

  const handleSave = useCallback((result: ImageEditorSaveResult) => {
    const { dataUrl, blob } = result;
    setFrame({
      dataUrl,
      source: "onSave",
      byteSize: dataUrlBytes(dataUrl),
      blob:
        blob instanceof Blob
          ? `${blob.type || "no type"} / ${blob.size} bytes`
          : "onSave did not deliver a Blob",
    });
    setDirty(false);
  }, []);

  const handleLoad = useCallback((editor: ImageEditorInstance) => {
    instanceRef.current = editor;
    setMounted(true);
  }, []);

  const captureViaGetImage = useCallback(() => {
    const editor = instanceRef.current ?? editorRef.current?.editor ?? null;
    if (!editor) {
      setWrapperError("capture: editor instance not available");
      return;
    }
    const dataUrl = editor.getImage();
    if (!dataUrl) {
      setWrapperError("capture: getImage() returned null — nothing to flatten");
      return;
    }
    setWrapperError(null);
    setFrame({
      dataUrl,
      source: "getImage()",
      byteSize: dataUrlBytes(dataUrl),
      blob: null,
    });
  }, []);

  const probeHasChanges = useCallback(() => {
    const editor = instanceRef.current ?? editorRef.current?.editor ?? null;
    if (!editor) {
      setWrapperError("hasChanges: editor instance not available");
      return;
    }
    setDirty(editor.hasChanges());
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.kicker}>Phase 1 — technical spike</p>
          <h1 className={styles.title}>Unlayer save → render</h1>
        </div>
        <dl className={styles.status}>
          <div>
            <dt>editor</dt>
            <dd data-state={mounted ? "ok" : "pending"}>
              {mounted ? "mounted" : "mounting…"}
            </dd>
          </div>
          <div>
            <dt>hasChanges</dt>
            <dd data-state={dirty ? "ok" : "idle"}>{String(dirty)}</dd>
          </div>
          <div>
            <dt>frame</dt>
            <dd data-state={frame ? "ok" : "idle"}>
              {frame ? frame.source : "none"}
            </dd>
          </div>
        </dl>
      </header>

      {(loadError || wrapperError) && (
        <div className={styles.alert} role="alert">
          {loadError && <p>onLoadError — the scene never reached the canvas.</p>}
          {wrapperError && <p>onError — {wrapperError}</p>}
        </div>
      )}

      <div className={styles.grid}>
        <section className={styles.pane}>
          <div className={styles.paneHead}>
            <h2>Source scene</h2>
            <span className={styles.meta}>1920×1080 · 16:9</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.img} src={SCENE_SRC} alt="Source mission scene" />
        </section>

        <section className={styles.pane}>
          <div className={styles.paneHead}>
            <h2>Edit — the real Unlayer editor</h2>
            <span className={styles.meta}>
              {mounted ? "live" : "booting from cdn.unlayer.com"}
            </span>
          </div>
          {/* `ariaLabel` is documented in the package README but is not in the
              shipped ImageEditorProps, so the region carries the label instead. */}
          <section className={styles.editor} aria-label="Vice Cut scene editor">
            <ImageEditor
              ref={editorRef}
              image={SCENE_SRC}
              options={EDITOR_OPTIONS}
              minHeight="64vh"
              onLoad={handleLoad}
              onSave={handleSave}
              onLoadError={() => setLoadError(true)}
              onError={(error) => setWrapperError(error.message)}
            />
          </section>
          <div className={styles.actions}>
            <button type="button" onClick={captureViaGetImage}>
              Capture via getImage()
            </button>
            <button type="button" onClick={probeHasChanges}>
              Probe hasChanges()
            </button>
          </div>
        </section>

        <section className={styles.pane}>
          <div className={styles.paneHead}>
            <h2>Edited frame</h2>
            <span className={styles.meta}>
              {frame && frame.byteSize
                ? `${Math.round(frame.byteSize / 1024)} KB`
                : "awaiting save"}
            </span>
          </div>
          {frame ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.img}
                src={frame.dataUrl}
                alt="Edited frame captured from the Unlayer editor"
              />
              <dl className={`${styles.status} ${styles.statusStack}`}>
                <div>
                  <dt>source</dt>
                  <dd data-state="ok">{frame.source}</dd>
                </div>
                <div>
                  <dt>blob</dt>
                  <dd data-state={frame.blob ? "ok" : "idle"}>
                    {frame.blob ?? "no blob — getImage() returns a data URL only"}
                  </dd>
                </div>
                <div>
                  <dt>dataUrl</dt>
                  <dd data-state="ok">{frame.dataUrl.slice(0, 32)}…</dd>
                </div>
              </dl>
            </>
          ) : (
            <div className={styles.empty}>
              Edit the scene, then save in the editor — or use Capture via
              getImage().
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
