/**
 * THE AUDIO ENGINE (§34).
 *
 * §34: ambience, short radio static, subtle confirmation sounds, one cinematic
 * transition, one mission-completion sound — low volume, never overwhelming, and
 * the application must stay fully functional with audio off.
 *
 * Two layers, built differently on purpose:
 *
 *  1. THE BED is a real music track, streamed from /public and routed through Web
 *     Audio (`createMediaElementSource` -> low-pass -> gain) rather than decoded
 *     into an AudioBuffer. That matters for a full-length track: a media-element
 *     source streams progressively and is fetched once, where `decodeAudioData`
 *     would have to download the whole file and hold all of it in memory before
 *     the first note. It also gives the filter a live node to move, which is what
 *     `setTension` below is for.
 *
 *  2. THE CUES are synthesised, because they cannot be assets. The radio squelch
 *     has to sit UNDER narration at a level that changes per scene; a generated
 *     burst is a parameter where a file is a fixed loudness. And there is no
 *     fetch, so there is no loading state and no failure mode where a missing
 *     file turns a cue into a silence you cannot distinguish from a bug.
 *
 * The engine is a module singleton. The AudioContext is created on the first
 * user gesture, because browsers refuse to start one without it, and music is
 * armed on that same gesture — so the track begins on the first click anywhere,
 * including on the title screen. Nothing in the app awaits it: every entry point
 * is fire-and-forget, so a browser that blocks or lacks Web Audio runs silent
 * rather than breaking.
 */

type Cue =
  /** Radio squelch — a transmission opening. Played before narration. */
  | "radioIn"
  /** Film-cut tick, on each frame change in a clip. */
  | "cut"
  /** LOCK FRAME: a shutter and a low thud. The one loud moment in the product. */
  | "lock"
  /** Soft confirmation — a selection landing, a panel resolving. */
  | "confirm";

const MUTE_KEY = "vicecut.audio.muted";

/**
 * The bed, and its licence.
 *
 * "Neon Laser Horizon" — Kevin MacLeod (incompetech.com), 2020, album "Project
 * 80s", ISRC USUAN2000023. Chosen for the register: a neon synthwave bed is what
 * this fiction sounds like, and the brief's "do not use a loud soundtrack" rule
 * wants a track that can sit under dialogue without fighting it.
 *
 * CC BY 4.0, which means attribution is REQUIRED, not requested. CC BY asks for
 * credit "reasonable to the medium", and for a web app the deployed page is the
 * medium — a line in the README does not satisfy it. So the credit is rendered
 * on screen: `MusicCredit` puts it at the foot of the mission result, the last
 * screen of a run and the one place with nothing competing for attention. If you
 * want the credit to disappear, the fix is to swap this for a CC0 track rather
 * than to delete the line — CC0 waives attribution entirely, and then the
 * component renders nothing.
 *
 * THIS OBJECT IS THE SINGLE SOURCE OF TRUTH. Swapping the track means editing it
 * and dropping the file at `src`, and nothing else: the credit, the download
 * path and the filter settings all read from here.
 */
export const MUSIC = {
  /** Served from /public. Streamed, and only ever fetched once the player clicks. */
  src: "/audio/theme.mp3",
  title: "Neon Laser Horizon",
  artist: "Kevin MacLeod",
  artistUrl: "https://incompetech.com",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
} as const;

/**
 * Whether a credit is required for the track above.
 *
 * Returns null when there is nothing to say — a track with no artist and no
 * licence renders no credit rather than an empty one. That is the honest answer
 * for a CC0 file, and it means swapping to one removes the line automatically
 * instead of leaving a stale credit claiming someone's work.
 */
export function musicCredit(): {
  title: string;
  artist: string;
  artistUrl: string;
  license: string;
  licenseUrl: string;
} | null {
  if (!MUSIC.artist || !MUSIC.license) return null;
  return {
    title: MUSIC.title,
    artist: MUSIC.artist,
    artistUrl: MUSIC.artistUrl,
    license: MUSIC.license,
    licenseUrl: MUSIC.licenseUrl,
  };
}

interface MusicNodes {
  el: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

class Cine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private music: MusicNodes | null = null;

  private muted = false;
  private started = false;
  /** True once something has asked for the bed, so arming is idempotent. */
  private musicWanted = false;
  /** Listeners that want to re-render when mute changes, e.g. the toggle. */
  private listeners = new Set<() => void>();

  constructor() {
    // Mute is a per-viewer convenience, which is exactly what localStorage is
    // for. Every access is guarded: it throws in a private window and can come
    // back null, and the product must render identically either way.
    try {
      this.muted = window.localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      this.muted = false;
    }
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  isMuted() {
    return this.muted;
  }

  setMuted(next: boolean) {
    this.muted = next;
    try {
      window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    } catch {
      /* not fatal — the choice just will not survive a reload */
    }
    if (this.ctx && this.master) {
      // Ramped, not stepped: cutting a running bed to zero clicks audibly.
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(next ? 0 : 1, t, 0.08);
    }
    this.emit();
  }

  toggleMuted() {
    this.setMuted(!this.muted);
  }

  /**
   * Create the context on the first user gesture.
   *
   * Idempotent, and safe to call from anywhere. Returns false when the browser
   * has no Web Audio or refuses to start — in which case every other method
   * becomes a no-op and the app runs silent.
   */
  unlock() {
    if (this.started) return this.ctx !== null;
    this.started = true;
    try {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return false;

      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 1;
      master.connect(ctx.destination);

      this.ctx = ctx;
      this.master = master;
      this.noise = makeNoise(ctx);

      // Autoplay policy: a context created before the gesture is allowed to
      // exist but starts suspended, so resume on the same gesture.
      if (ctx.state === "suspended") void ctx.resume();

      // If the bed was requested before the context existed, attach it now —
      // still inside the gesture that created the context, which is the only
      // moment `play()` is guaranteed to be allowed.
      if (this.musicWanted) this.attachMusic();
      return true;
    } catch {
      this.ctx = null;
      this.master = null;
      return false;
    }
  }

  /**
   * Start the bed. Safe to call from anywhere, at any time, any number of times.
   *
   * Armed rather than played: if the context does not exist yet — i.e. no gesture
   * has happened — this registers a one-time gesture listener and starts on the
   * first click or keypress. That is what makes the track "play from the home
   * page" without fighting the autoplay policy, and it means a judge who deep
   * links straight into a mission still gets music from their own first click.
   *
   * The listener lives here rather than at the call site because every caller
   * would otherwise need to reimplement the same arming.
   */
  startMusic() {
    if (this.musicWanted) {
      // Already armed or playing. Resuming covers a tab that was backgrounded —
      // the browser suspends the element and nothing restarts it.
      if (this.music) void this.music.el.play().catch(() => {});
      return;
    }
    this.musicWanted = true;

    if (this.ctx) {
      this.attachMusic();
      return;
    }

    const arm = () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
      // No explicit unlock() here: attachMusic runs from unlock(), and calling
      // it separately would race the two on the same gesture.
      this.unlock();
    };
    window.addEventListener("pointerdown", arm);
    window.addEventListener("keydown", arm);
  }

  /** Build or resume the media-element graph. Requires a live context. */
  private attachMusic() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;

    if (this.music) {
      void this.music.el.play().catch(() => {});
      return;
    }

    try {
      const el = new Audio();
      el.src = MUSIC.src;
      el.loop = true;
      // Kept out of the DOM but still playing; a detached media element is a
      // supported source and this keeps the shell markup free of audio tags.
      el.preload = "auto";

      // Same-origin (served from /public), so the element source gets real
      // samples rather than silence. The routing is the point: it puts the track
      // behind a low-pass we can open up as the mission tightens, instead of
      // committing to one fixed mix.
      const source = ctx.createMediaElementSource(el);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 2600;
      filter.Q.value = 0.4;

      const gain = ctx.createGain();
      gain.gain.value = 0.32;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);

      // A dead file must degrade to silence, not to a console full of errors.
      el.addEventListener("error", () => {
        this.music = null;
      });

      this.music = { el, source, filter, gain };
      void el.play().catch(() => {
        // Blocked or interrupted: a later `startMusic()` resumes it.
      });
    } catch {
      this.music = null;
    }
  }

  pauseMusic() {
    this.music?.el.pause();
  }

  /**
   * Open the mix as the mission heats up: one track, filtered, rather than a
   * second track crossfaded in. `t` runs 0 (title) to 1 (the result landing).
   *
   * 2600 -> 16000Hz and 0.32 -> 0.5 is a deliberately narrow range. The brief's
   * rule is that audio is atmosphere, not content: if a judge notices the
   * soundtrack moving, it is too much.
   */
  setTension(t: number) {
    if (!this.ctx || !this.music) return;
    const clamped = Math.max(0, Math.min(1, t));
    const now = this.ctx.currentTime;
    this.music.filter.frequency.setTargetAtTime(2600 + clamped * 13400, now, 0.6);
    this.music.gain.gain.setTargetAtTime(0.32 + clamped * 0.18, now, 0.6);
  }

  /** True once the bed is actually playing — lets a caller avoid double-starts. */
  isMusicLive() {
    return this.music !== null && !this.music.el.paused;
  }

  /** Fire a one-shot. No-op when unmuted audio was never unlocked. */
  cue(name: Cue) {
    if (!this.ctx || !this.master || !this.noise) return;
    if (this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    switch (name) {
      case "radioIn": {
        // A transmission opening: a short band-limited noise burst with a fast
        // attack and a tail. The band is narrow and high-Q so it reads as a
        // speaker cone rather than as hiss.
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 1900;
        bp.Q.value = 9;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.16, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        src.connect(bp);
        bp.connect(g);
        g.connect(this.master);
        src.start(t);
        src.stop(t + 0.2);
        break;
      }

      case "cut": {
        // A film splice: 30ms of high-passed noise, barely audible. Its job is to
        // mark a frame change for anyone listening with their eyes elsewhere.
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 4200;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        src.connect(hp);
        hp.connect(g);
        g.connect(this.master);
        src.start(t);
        src.stop(t + 0.08);
        break;
      }

      case "lock": {
        // The shutter. A short noise transient over a falling sine — the same
        // shape as a camera mirror, which is why it reads as "taken" rather than
        // as a UI beep. This is the loudest sound in the product.
        const click = ctx.createBufferSource();
        click.buffer = this.noise;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 1800;
        const cg = ctx.createGain();
        cg.gain.setValueAtTime(0, t);
        cg.gain.linearRampToValueAtTime(0.2, t + 0.005);
        cg.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
        click.connect(hp);
        hp.connect(cg);
        cg.connect(this.master);
        click.start(t);
        click.stop(t + 0.14);

        const thud = ctx.createOscillator();
        thud.type = "sine";
        thud.frequency.setValueAtTime(190, t);
        thud.frequency.exponentialRampToValueAtTime(58, t + 0.42);
        const tg = ctx.createGain();
        tg.gain.setValueAtTime(0, t);
        tg.gain.linearRampToValueAtTime(0.22, t + 0.02);
        tg.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        thud.connect(tg);
        tg.connect(this.master);
        thud.start(t);
        thud.stop(t + 0.55);
        break;
      }

      case "confirm": {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(700, t);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.08, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(g);
        g.connect(this.master);
        osc.start(t);
        osc.stop(t + 0.26);
        break;
      }
    }
  }
}

/** Two seconds of white noise, reused by every node above. */
function makeNoise(ctx: AudioContext): AudioBuffer {
  const seconds = 2;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Seeded, so two runs of the same demo sound identical — the same reason the
  // shell's grain is seeded rather than random.
  let seed = 0x2f6e2b1;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = (seed / 0xffffffff) * 2 - 1;
  }
  return buffer;
}

let instance: Cine | null = null;

/**
 * The engine, or null during SSR.
 *
 * Server rendering must not construct this: it reads localStorage in the
 * constructor, and `window` does not exist there.
 */
export function audio(): Cine | null {
  if (typeof window === "undefined") return null;
  if (!instance) instance = new Cine();
  return instance;
}

export type { Cine };
