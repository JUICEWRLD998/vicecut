import { Button } from "@/components/ui/Button";
import { CornerBracket, CornerBrackets } from "@/components/ui/CornerBracket";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RuleLine } from "@/components/ui/RuleLine";
import { Display, Metadata, Prose } from "@/components/ui/Typography";
import { FilmGrain, GameShell, Scanlines, Vignette } from "@/components/shell/Shell";
import styles from "./design.module.css";

/**
 * Phase 2 playground.
 *
 * The checkpoint is "the UI already looks premium before mission logic exists",
 * so this is not a swatch board — the last two blocks are real composed
 * fragments (a title-screen overlay and a mission tile) built only from the
 * primitives. If those two look like a template, the design system has failed
 * and should be reworked before any mission logic is written.
 */

const SWATCHES = [
  { token: "--c-base", value: "#090A0C", use: "asphalt / page" },
  { token: "--c-surface-1", value: "#111316", use: "raised panel" },
  { token: "--c-surface-2", value: "#16181C", use: "control on panel" },
  { token: "--c-surface-3", value: "#1D2025", use: "hover / active" },
  { token: "--c-paper", value: "#EDE8DD", use: "primary text" },
  { token: "--c-muted", value: "#8C8C88", use: "secondary text" },
  { token: "--c-muted-hi", value: "#A8A8A3", use: "small text" },
  { token: "--c-accent", value: "#FF5A72", use: "the one accent" },
  { token: "--c-accent-hi", value: "#FF7085", use: "accent hover" },
  { token: "--c-accent-lo", value: "#E84E63", use: "accent active" },
  { token: "--c-amber", value: "#FFB35C", use: "support only" },
  { token: "--c-cyan", value: "#55D8E8", use: "support only" },
];

const RATIOS = [
  ["paper on base", "16.21:1", "AA"],
  ["paper on surface-1", "15.23:1", "AA"],
  ["muted on base", "5.87:1", "AA"],
  ["muted-hi on base", "8.29:1", "AA"],
  ["base on coral", "6.56:1", "AA"],
  ["coral on base", "6.56:1", "AA"],
];

export const metadata = { title: "Design system — VICE CUT" };

export default function DesignPlayground() {
  return (
    <GameShell>
      <main className={styles.page}>
        <header className={styles.head}>
          <Metadata className={styles.kicker}>Phase 2 — design system</Metadata>
          <Display as="h1" scale="title">
            Primitives
          </Display>
          <Prose tone="muted" size="small" className={styles.headNote}>
            Archivo at width 118 for display, Instrument Sans for narrative
            text, Geist Mono for machine metadata. One accent, coral, reserved
            for the primary action and the current step.
          </Prose>
        </header>

        {/* ---------- colour ---------- */}
        <section className={styles.block}>
          <Metadata className={styles.blockKicker}>01 / Colour</Metadata>
          <div className={styles.swatches}>
            {SWATCHES.map((s) => (
              <div key={s.token} className={styles.swatch}>
                <div
                  className={styles.chip}
                  style={{ background: `var(${s.token})` }}
                />
                <Metadata tone="paper">{s.token}</Metadata>
                <Metadata>{s.value}</Metadata>
                <Metadata>{s.use}</Metadata>
              </div>
            ))}
          </div>
          <RuleLine label="measured, not eyeballed — scripts/contrast.mjs" />
          <ul className={styles.ratios}>
            {RATIOS.map(([pair, ratio, grade]) => (
              <li key={pair}>
                <Metadata tone="paper">{pair}</Metadata>
                <Metadata tone="accent">{ratio}</Metadata>
                <Metadata>{grade}</Metadata>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- type ---------- */}
        <section className={styles.block}>
          <Metadata className={styles.blockKicker}>02 / Type scale</Metadata>
          <div className={styles.typeRow}>
            <Display scale="hero">Vice Cut</Display>
            <Metadata>hero · clamp 64–164px · wdth 76</Metadata>
          </div>
          <div className={styles.typeRow}>
            <Display scale="display">The Night Shift</Display>
            <Metadata>display · clamp 40–68px</Metadata>
          </div>
          <div className={styles.typeRow}>
            <Display scale="title">Select Operation</Display>
            <Metadata>title · clamp 28–44px</Metadata>
          </div>
          <div className={styles.typeRow}>
            <Prose size="lead">The meet is compromised.</Prose>
            <Metadata>lead prose · 21px</Metadata>
          </div>
          <div className={styles.typeRow}>
            <Prose tone="muted">Mark the moment the plan goes wrong.</Prose>
            <Metadata>base prose, muted · 16px</Metadata>
          </div>
          <div className={styles.typeRow}>
            <Metadata tone="accent">
              CAM 01 · REC · 01:42 · FRAME 07
            </Metadata>
            <Metadata>mono metadata · 10px, tracked</Metadata>
          </div>
        </section>

        {/* ---------- controls ---------- */}
        <section className={styles.block}>
          <Metadata className={styles.blockKicker}>03 / Controls</Metadata>
          <div className={styles.controls}>
            <Button variant="solid" hint="ENTER">
              Lock frame
            </Button>
            <Button variant="ghost">Next operation</Button>
            <Button variant="quiet">Roll again</Button>
            <Button variant="solid" disabled>
              Saving
            </Button>
          </div>
          <div className={styles.controls}>
            <ProgressBar total={3} current={1} />
            <ProgressBar total={3} current={2} />
            <ProgressBar total={3} current={3} />
          </div>
        </section>

        {/* ---------- HUD motifs ---------- */}
        <section className={styles.block}>
          <Metadata className={styles.blockKicker}>04 / HUD motifs</Metadata>
          <div className={styles.hudGrid}>
            <div className={styles.frameBox}>
              <CornerBrackets />
              <Metadata>all four corners</Metadata>
            </div>
            <div className={styles.frameBox}>
              <CornerBracket corner="tl" tone="accent" />
              <Metadata tone="accent">accent bracket</Metadata>
            </div>
            <div className={styles.frameBox}>
              <Scanlines />
              <Metadata>scanlines · CCTV only</Metadata>
            </div>
          </div>
        </section>

        {/* ---------- COMPOSED: title-screen overlay ---------- */}
        <section className={styles.block}>
          <Metadata className={styles.blockKicker}>
            05 / Composed — title screen
          </Metadata>
          <p className={styles.gateNote}>
            This is the checkpoint. If this reads as a template, stop.
          </p>
          <div className={styles.titlePlate}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.plateImg}
              src="/scenes/title-cover.jpg"
              alt=""
            />
            <div className={styles.plateScrim} />
            <Vignette />
            <FilmGrain />
            <CornerBracket corner="tl" tone="accent" size="26px" />
            <CornerBracket corner="br" size="26px" />
            <div className={styles.plateContent}>
              <Metadata>a cinematic experiment</Metadata>
              <Display scale="hero" className={styles.plateWordmark}>
                Vice Cut
              </Display>
              <Metadata className={styles.plateSub}>
                The Mission Director
              </Metadata>
              <Prose size="lead" className={styles.plateTagline}>
                Edit the world.
                <br />
                Lock the frame.
                <br />
                Roll the mission.
              </Prose>
              <div className={styles.plateBottom}>
                <RuleLine />
                <Metadata tone="accent">Press enter to start</Metadata>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- COMPOSED: mission tile ---------- */}
        <section className={styles.block}>
          <Metadata className={styles.blockKicker}>
            06 / Composed — mission tile
          </Metadata>
          <div className={styles.tiles}>
            {[
              {
                n: "01",
                name: "The Night Shift",
                loc: "Vice City Marina",
                mood: "Night / Rain / Neon",
                scene: "/scenes/night-shift.jpg",
                state: "active",
              },
              {
                n: "02",
                name: "Southbound",
                loc: "Leonida Keys",
                mood: "Sunset / Highway / Heat",
                scene: "/scenes/southbound.jpg",
                state: "idle",
              },
              {
                n: "03",
                name: "No Signal",
                loc: "Port Gellhorn",
                mood: "Night / Industrial",
                scene: "/scenes/no-signal.jpg",
                state: "idle",
              },
            ].map((t) => (
              <article key={t.n} className={styles.tile} data-state={t.state}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.tileImg} src={t.scene} alt="" />
                <div className={styles.tileScrim} />
                {t.state === "active" ? (
                  <CornerBrackets size="14px" tone="accent" />
                ) : null}
                <div className={styles.tileBody}>
                  <Metadata
                    tone={t.state === "active" ? "accent" : "muted"}
                  >
                    Operation {t.n}
                  </Metadata>
                  <Display scale="section" className={styles.tileName}>
                    {t.name}
                  </Display>
                  <Metadata>{t.loc}</Metadata>
                  <Metadata>{t.mood}</Metadata>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </GameShell>
  );
}
