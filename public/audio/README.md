# The soundtrack

`theme.mp3` — **"Neon Laser Horizon"** by **Kevin MacLeod** (incompetech.com), 2020,
album *Project 80s*, ISRC `USUAN2000023`. About 66 seconds, looped.

## Licence — CC BY 4.0, attribution REQUIRED

Licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
The source site's FAQ states the required credit as three lines:

```
Neon Laser Horizon Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/
```

CC BY asks for credit "reasonable to the medium". For a web app the deployed page
**is** the medium, so a line in this file does not discharge the obligation — the
credit ships on screen, at the foot of the mission result, rendered by
`src/components/ui/MusicCredit.tsx`. Do not delete it while this track is in use.

## Swapping the track

`MUSIC` in `src/lib/audio.ts` is the single source of truth — `src`, `title`,
`artist`, `artistUrl`, `license`, `licenseUrl`. Change it there and drop the file
in this folder; nothing else reads it.

`musicCredit()` returns `null` when there is no artist or no licence, and
`MusicCredit` renders nothing in that case. So switching to a **CC0** track
removes the on-screen credit automatically — CC0 waives attribution entirely, and
that is the only honest way to lose the line. Clearing the fields while still
using a CC BY track would leave the obligation unmet.

## How it is played

Streamed, not decoded into memory: an `<audio>` element routed through
`createMediaElementSource` into a low-pass filter and a gain node, so a
multi-megabyte file plays progressively and the mix can be opened up as a mission
tightens (`setTension`). It is fetched once, and only after the player's first
gesture — browsers block audio before one, so the engine arms on the title screen
and starts on the first click.

A missing or unreadable file degrades to silence with no error state: nothing in
the app awaits the soundtrack.
