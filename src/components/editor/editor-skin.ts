/**
 * THE EDITOR'S SKIN — the director's bay, not an embedded widget.
 *
 * The single biggest difference between this editor and the one it replaced is
 * that it no longer reads as somebody else's component. Out of the box the rail
 * says FILTER / CROP / DRAW / TEXT / SHAPES / STICKERS / FRAME in plain English
 * with stock glyphs, which is what a judge sees for the entire second half of
 * the game — the half the whole product is built around.
 *
 * Everything here is the library's SUPPORTED surface: `translations` renames
 * every string it renders, and `features.imageEditor.tools[tool].icon` replaces
 * each rail glyph with ours. Nothing reaches into its internals, nothing is
 * overridden with CSS, and no class name is depended on. That matters for more
 * than tidiness: the editor ships as a CDN bundle on its own release cadence, so
 * anything that reaches inside it breaks on a version bump with no warning.
 *
 * Two constraints the glyphs have to respect, both learned the hard way:
 *
 *   FIXED COLOUR. An icon is delivered as an image, so it cannot inherit the
 *     rail's hover or active tint the way a stock glyph can. Every one is drawn
 *     in a light neutral close to --c-paper so it sits correctly in the dark
 *     theme in every state; selection is still signalled by the rail's own label
 *     and background treatment, which the library owns.
 *
 *   LEGIBLE AT 18px. These render small. Thick strokes, few marks, and nothing
 *     that only survives at 24px.
 *
 * The rail labels are FIVE CHARACTERS AT MOST, and that is a measured
 * constraint, not a style choice: the rail truncates by pixel width, and
 * uppercase is wide, so a seven-character label renders as "DEGRA…". The full,
 * evocative verb lives in our own legend beside the editor — see
 * `film-tools.ts` — and the rail carries the short form.
 */

import type { ImageEditorOptions } from "@unlayer/react-image-editor";
import type { ImageEditorToolConfig } from "@unlayer/types";
import type { EditorTools } from "@/data/missions";

/**
 * The rail's five-character labels.
 *
 * Exported as constants because each is ALSO a handle: the editor renders them
 * as the text of its own tool buttons and panel headings, and our legend has to
 * describe the rail beside the editor by the same names. Keeping one source of
 * truth means the legend cannot drift out of step with the rail, which a player
 * would read as the legend describing the wrong button.
 *
 * The fiction is the point: a director does not filter a frame, they grade it;
 * they do not crop, they choose what is in frame; they do not add stickers, they
 * bring props into the shot.
 */
export const RAIL = {
  filter: "GRADE",
  crop: "FRAME",
  resize: "RATIO",
  draw: "MARK",
  text: "SLATE",
  shapes: "SHAPE",
  stickers: "PROP",
  frame: "MATTE",
} as const satisfies Record<keyof EditorTools, string>;

/**
 * The editor's own save control's label.
 *
 * Exported because it is ALSO a handle, not just copy. `lockFrame` in
 * DirectorEditor drives the editor's save to capture the frame, and it finds
 * that control by the text the editor renders — so renaming the control here
 * without renaming the finder would break the capture. That is not hypothetical:
 * re-skinning the toolbar to "LOCK FRAME" left the finder looking for "Save",
 * it stopped matching, and LOCK FRAME silently fell back to `getImage()`, which
 * does not include a filter (see `handleSave` in DirectorEditor). A graded frame
 * was captured as ungraded, and the only sign was a small "canvas capture"
 * notice. Changing this string changes both ends, which is the point.
 *
 * The match must stay CASE-SENSITIVE and exact. Our own footer button reads
 * "Lock frame" and the editor's toolbar button reads "LOCK FRAME"; a
 * case-insensitive or substring match would press ours from inside the handler
 * ours is already running, which reads as LOCK FRAME doing nothing.
 */
export const SAVE_LABEL = "LOCK FRAME";

/** Near --c-paper. Hardcoded because this is baked into an image. */
const INK = "#e6e0d4";

/** Shared attributes, so every glyph has the same weight and optical size. */
const A =
  `xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ` +
  `stroke="${INK}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;

/**
 * One glyph per tool, named by what the tool does *in the fiction* rather than
 * by the library's name for it.
 */
const GLYPHS: Record<keyof EditorTools, string> = {
  /** GRADE — set the mood. An iris, half open. */
  filter: `<svg ${A}><circle cx="12" cy="12" r="8.4"/><path d="M12 3.6a8.4 8.4 0 0 1 0 16.8z" fill="${INK}" stroke="none"/></svg>`,

  /** FRAME — choose what the audience sees. Crop marks. */
  crop: `<svg ${A}><path d="M6.5 2.8v14.7h14.7"/><path d="M2.8 6.5h14.7v14.7"/></svg>`,

  /** RATIO — reformat the print. A frame with a ratio arrow. */
  resize: `<svg ${A}><rect x="3" y="5.4" width="18" height="13.2" rx="1.3"/><path d="M8.4 12h7.2M13 9.4 15.6 12 13 14.6"/></svg>`,

  /** MARK — put your hand on the frame. A nib. */
  draw: `<svg ${A}><path d="M4.2 19.8l1-3.9 9.3-9.3 2.9 2.9-9.3 9.3z"/><path d="M14.6 6.6l2-2a1.5 1.5 0 0 1 2.2 0l.7.7a1.5 1.5 0 0 1 0 2.2l-2 2"/></svg>`,

  /** SLATE — the clapperboard. A card with a hinged lid. */
  text: `<svg ${A}><rect x="3" y="9.6" width="18" height="10.4" rx="1.2"/><path d="M3.6 9.6 5 5.4l15 3.3-1 1.1z" fill="${INK}" stroke="none"/><path d="M8.4 6.2 7.9 9.4M13.2 7.2l-.5 3.1"/></svg>`,

  /** SHAPE — build the frame's furniture. Two overlapping solids. */
  shapes: `<svg ${A}><rect x="3" y="3.4" width="10.6" height="10.6" rx="1.2"/><rect x="10.4" y="10" width="10.6" height="10.6" rx="1.2" fill="#111316"/></svg>`,

  /** PROP — bring something into shot that was not there. */
  stickers: `<svg ${A}><path d="M12 3.4l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.6l5.9-.9z"/></svg>`,

  /** MATTE — the border the print is mounted in. */
  frame: `<svg ${A}><rect x="2.8" y="2.8" width="18.4" height="18.4" rx="1.4"/><rect x="7" y="7" width="10" height="10" rx="1" opacity="0.65"/></svg>`,
};

/** `icon` is typed only as `string`, so the value is a data URI, not a name. */
function dataUri(svg: string): string {
  // `encodeURIComponent` rather than base64: it keeps the markup readable when
  // someone inspects the rail, and it costs nothing at this size.
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}

/** Every rail glyph, ready to hand to the editor. */
export function toolIcons(): Record<keyof EditorTools, string> {
  const out = {} as Record<keyof EditorTools, string>;
  for (const key of Object.keys(GLYPHS) as (keyof EditorTools)[]) {
    out[key] = dataUri(GLYPHS[key]);
  }
  return out;
}

/**
 * Every string the editor shows, rewritten into the fiction.
 *
 * SCOPE IS AUTHORITATIVE, not copied. This covers the keys the running editor
 * actually defines — taken from the shipping bundle the app loads, which is
 * version 2.10.0 of `cdn.unlayer.com/image-editor/<version>/editor.js`, resolved
 * through `embed.js`'s `latestVersion`. That is deliberately not the type
 * package: `ImageEditorTranslationKey` in `@unlayer/types` lags the bundle by
 * whole panels, and the bundle silently ignores a key it does not know, so a
 * list taken from the types would look correct here and leave plain English on
 * screen. To re-check after an upgrade:
 *
 *   fetch('https://cdn.unlayer.com/image-editor/<version>/editor.js')
 *     .then(r => r.text())
 *     .then(t => [...new Set(
 *       [...t.matchAll(/["'`](image_editor\.[a-zA-Z0-9_.]+)["'`]/g)].map(m => m[1])
 *     )].sort())
 *
 * The AI assistant keys are deliberately absent. AI is switched off below and
 * that panel never renders, so translating it would be copy for a screen no one
 * can reach — and it would quietly imply the feature exists in this product.
 */
const EN: Record<string, string> = {
  // --- the rail ------------------------------------------------------------
  // Five characters, per the note at the top of the file.
  "image_editor.tools.filter": RAIL.filter,
  "image_editor.tools.crop": RAIL.crop,
  "image_editor.tools.resize": RAIL.resize,
  "image_editor.tools.draw": RAIL.draw,
  "image_editor.tools.text": RAIL.text,
  "image_editor.tools.shapes": RAIL.shapes,
  "image_editor.tools.stickers": RAIL.stickers,
  "image_editor.tools.frame": RAIL.frame,
  "image_editor.tools.corners": "CORNER",

  // --- the toolbar ---------------------------------------------------------
  // LOCK FRAME is our own button in the footer; the editor's own save is named
  // to match it rather than offering a second, differently named way to commit.
  // SAVE_LABEL is a handle as well as copy — see its doc comment.
  "image_editor.toolbar.save": SAVE_LABEL,
  "image_editor.toolbar.cancel": "DISCARD",
  "image_editor.toolbar.close": "CLOSE",
  "image_editor.toolbar.undo": "UNDO",
  "image_editor.toolbar.redo": "REDO",
  "image_editor.toolbar.zoom_in": "PUSH IN",
  "image_editor.toolbar.zoom_out": "PULL OUT",
  "image_editor.toolbar.fit_to_screen": "FIT FRAME",
  "image_editor.toolbar.flatten": "FLATTEN",
  "image_editor.toolbar.show_chat": "SHOW PANEL",
  "image_editor.toolbar.hide_chat": "HIDE PANEL",
  "image_editor.actions.reset": "RESTORE DEFAULTS",

  // --- objects, as a director would log them -------------------------------
  "image_editor.labels.image": "THE FRAME",
  "image_editor.labels.drawing": "MARK",
  "image_editor.labels.shape": "SHAPE",
  "image_editor.labels.sticker": "PROP",
  "image_editor.labels.text": "SLATE",

  // Layer ordering, on the toolbar that floats over a placed object.
  "image_editor.arrange.bring_to_front": "TO FRONT",
  "image_editor.arrange.bring_forward": "FORWARD",
  "image_editor.arrange.send_backward": "BACKWARD",
  "image_editor.arrange.send_to_back": "TO BACK",

  // --- GRADE ---------------------------------------------------------------
  // Groups and the preset strip. The stock names are film stocks and phone-app
  // looks, which read as a camera roll rather than as a grade.
  "image_editor.filters.presets": "LOOKS",
  "image_editor.filters.adjust": "ADJUST",
  "image_editor.filters.group.light": "LIGHT",
  "image_editor.filters.group.color": "COLOUR",
  "image_editor.filters.group.effects": "TEXTURE",
  "image_editor.filters.none": "NONE",
  "image_editor.filters.black_white": "MONOCHROME",
  "image_editor.filters.sepia": "AGED STOCK",
  "image_editor.filters.vintage": "ARCHIVE",
  "image_editor.filters.polaroid": "INSTANT",
  "image_editor.filters.kodachrome": "COLOUR NEG",
  "image_editor.filters.technicolor": "BROADCAST",
  "image_editor.filters.brownie": "LOW GRADE",
  "image_editor.filters.invert": "NEGATIVE",
  "image_editor.filters.emboss": "RELIEF",

  // The grade sliders, in the language of a grade.
  "image_editor.filters.blur": "SOFTEN",
  "image_editor.filters.pixelate": "COARSEN",
  "image_editor.filters.brightness": "EXPOSURE",
  "image_editor.filters.contrast": "CONTRAST",
  "image_editor.filters.gamma": "MIDTONES",
  "image_editor.filters.saturation": "SATURATION",
  "image_editor.filters.vibrance": "VIBRANCE",
  "image_editor.filters.hue": "COLOUR CAST",
  "image_editor.filters.grayscale": "DESATURATE",
  "image_editor.filters.noise": "GRAIN",
  "image_editor.filters.sharpen": "SHARPEN",

  // --- FRAME (crop) --------------------------------------------------------
  "image_editor.crop.aspect_ratio": "ASPECT",
  "image_editor.crop.aspect_free": "FREE",
  "image_editor.crop.aspect_original": "AS SHOT",
  "image_editor.crop.aspect_square": "SQUARE",
  "image_editor.crop.rotate_flip": "ROTATE / FLIP",
  "image_editor.crop.straighten": "LEVEL",
  "image_editor.rotate.rotate_left": "ROTATE LEFT",
  "image_editor.rotate.rotate_right": "ROTATE RIGHT",
  "image_editor.rotate.flip_horizontal": "MIRROR",
  "image_editor.rotate.flip_vertical": "FLIP",
  "image_editor.corners.radius": "RADIUS",

  // --- RATIO (resize) ------------------------------------------------------
  "image_editor.resize.width": "WIDTH",
  "image_editor.resize.height": "HEIGHT",
  "image_editor.resize.lock_aspect": "LOCK RATIO",

  // --- MARK (draw) ---------------------------------------------------------
  "image_editor.draw.brush": "TOOL",
  "image_editor.draw.type": "TYPE",
  "image_editor.draw.size": "WIDTH",
  "image_editor.draw.color": "COLOUR",
  "image_editor.draw.custom_color": "CUSTOM",
  "image_editor.draw.brush_pencil": "PENCIL",
  "image_editor.draw.brush_circle": "ROUND",
  "image_editor.draw.brush_square": "SQUARE",
  "image_editor.draw.brush_diamond": "DIAMOND",
  "image_editor.draw.brush_spray": "SPRAY",
  "image_editor.draw.brush_eraser": "ERASE",
  "image_editor.draw.brush_hline": "H-LINE",
  "image_editor.draw.brush_vline": "V-LINE",

  // --- SLATE (text) --------------------------------------------------------
  // The stock preset names are a social-caption menu — "Meme", "Bubbles",
  // "Neon" — which is the loudest break in the fiction, because SLATE is the
  // tool that writes a director's own words onto the frame.
  "image_editor.text.new": "NEW TITLE",
  // What the editor stamps onto the frame when a title is added. Stock, it was
  // "Double click to edit" — printed across the shot. Worded as the overlay a
  // director would actually type, so the default already plays.
  "image_editor.text.default_text": "DAY 1 · SCENE 01",
  "image_editor.text.font": "TYPEFACE",
  "image_editor.text.size": "SIZE",
  "image_editor.text.style": "STYLE",
  "image_editor.text.bold": "HEAVY",
  "image_editor.text.italic": "SLANT",
  "image_editor.text.underline": "UNDERLINE",
  "image_editor.text.strikethrough": "STRIKE",
  "image_editor.text.align": "ALIGN",
  "image_editor.text.align_left": "LEFT",
  "image_editor.text.align_center": "CENTRE",
  "image_editor.text.align_right": "RIGHT",
  "image_editor.text.background": "BACKING",
  "image_editor.text.more": "MORE ({count})",
  "image_editor.text.less": "LESS",
  "image_editor.text.group.basic": "OVERLAY",
  "image_editor.text.group.handwriting": "HANDWRITTEN",
  "image_editor.text.group.effects": "TREATED",
  "image_editor.text.preset.heading": "HEADER",
  "image_editor.text.preset.subheading": "SUBHEADER",
  "image_editor.text.preset.body": "CAPTION",
  "image_editor.text.preset.marker": "MARKER",
  "image_editor.text.preset.script": "SIGNATURE",
  "image_editor.text.preset.bubbles": "GRAFFITI",
  "image_editor.text.preset.sketch": "PENCIL",
  "image_editor.text.preset.meme": "TABLOID",
  "image_editor.text.preset.outline": "OUTLINE",
  "image_editor.text.preset.highlight": "TAPE",
  "image_editor.text.preset.shadow": "SHADOW",
  "image_editor.text.preset.neon": "NEON",
  "image_editor.text.preset.typewriter": "TELETYPE",

  // --- SHAPE ---------------------------------------------------------------
  "image_editor.shapes.rectangle": "BAR",
  "image_editor.shapes.circle": "DISC",
  "image_editor.shapes.ellipse": "OVAL",
  "image_editor.shapes.triangle": "WEDGE",
  "image_editor.shapes.line": "RULE",
  "image_editor.shapes.arrow": "ARROW",
  "image_editor.shapes.curved_arrow": "CURVED ARROW",
  "image_editor.shapes.star": "STAR",
  "image_editor.shapes.shield": "SHIELD",
  "image_editor.shapes.decagon": "DECAGON",
  "image_editor.shapes.fill": "FILL",
  "image_editor.shapes.filled": "SOLID",
  "image_editor.shapes.empty": "NONE",
  "image_editor.shapes.transparent": "CLEAR",
  "image_editor.shapes.gradient": "GRADIENT",
  "image_editor.shapes.color": "COLOUR",
  "image_editor.shapes.opacity": "OPACITY",
  "image_editor.shapes.outline": "OUTLINE",
  "image_editor.shapes.outline_width": "WIDTH",
  "image_editor.shapes.shadow": "SHADOW",
  "image_editor.shapes.shadow_blur": "SOFTNESS",
  "image_editor.shapes.shadow_offset_x": "OFFSET X",
  "image_editor.shapes.shadow_offset_y": "OFFSET Y",
  "image_editor.shapes.duplicate": "DUPLICATE",
  "image_editor.shapes.delete": "DELETE",
  "image_editor.shapes.search": "SEARCH",
  "image_editor.shapes.more": "MORE",
  "image_editor.shapes.less": "LESS",

  // --- PROP (stickers) -----------------------------------------------------
  "image_editor.stickers.search": "SEARCH",
  "image_editor.stickers.empty": "NO MATCHES",
  "image_editor.stickers.more": "MORE",
  "image_editor.stickers.less": "LESS",
  "image_editor.stickers.category.emoticons": "FACES",
  "image_editor.stickers.category.doodles": "MARKINGS",
  "image_editor.stickers.category.transportation": "VEHICLES",
  "image_editor.stickers.category.landmarks": "LANDMARKS",
  "image_editor.stickers.category.beach": "COASTAL",
  "image_editor.stickers.category.clouds": "WEATHER",
  "image_editor.stickers.category.bubbles": "OBSCURA",
  "image_editor.stickers.category.stars": "SHAPES",

  // --- MATTE (frame) -------------------------------------------------------
  // The stock names are picture-frame timbers, which read as a print shop.
  "image_editor.frame.presets": "MATTES",
  "image_editor.frame.adjust": "ADJUST",
  "image_editor.frame.color": "COLOUR",
  "image_editor.frame.size": "WIDTH",
  "image_editor.frame.basic": "PLAIN",
  "image_editor.frame.ebony": "BLACKOUT",
  "image_editor.frame.oak": "WARM",
  "image_editor.frame.pine": "PALE",
  "image_editor.frame.rainbow": "SPECTRUM",
  "image_editor.frame.grunge1": "DEGRADED A",
  "image_editor.frame.grunge2": "DEGRADED B",
  "image_editor.frame.art1": "MASK A",
  "image_editor.frame.art2": "MASK B",
};

/**
 * The options object, built once per toolset.
 *
 * MEMOISE THE RESULT. Only theme, locale and translations are update-tier in
 * this editor; every other key is remount-tier, so a new object identity on a
 * re-render destroys the editor and silently discards the player's work. The
 * callers hold it in a `useMemo` keyed on the mission's toolset for exactly that
 * reason, and that is the single most dangerous detail in the whole integration.
 *
 * `ai: false` for two reasons: the panel is not part of this game, and with it
 * off the editor makes no API calls of its own.
 */
export function buildEditorOptions(tools: EditorTools): ImageEditorOptions {
  const icons = toolIcons();

  const config: Record<string, ImageEditorToolConfig> = {};
  for (const key of Object.keys(tools) as (keyof EditorTools)[]) {
    // `enabled` is stated explicitly even when false. An omitted key is not
    // "off" — the editor falls back to its own default, which is enabled — and
    // the per-mission toolset is an art-direction decision that has to be
    // readable at this line.
    config[key] = { enabled: tools[key], icon: icons[key] };
  }

  return {
    theme: "dark",
    locale: "en",
    translations: { en: EN },
    features: {
      imageEditor: { enabled: true, tools: config },
      ai: false,
    },
  };
}
