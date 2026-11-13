# Hologram and hex: a briefing for the Play lane

November 13, 2026. Written for whoever continues CrankMagic's game screen.

Rob wants CrankMagic's Play to use the hologram and hex design worked out in a design session on November 10 to 12. This page says what that design is, what was proven, what was not, and where the working files are. It is a briefing, not an approved build plan: the Play lane's own Linear issues decide what gets built and when.

## The design in one paragraph

The battlefield is a map of hexes, not rows of cards. Each permanent stands on a hex. From far away a permanent is a **hologram**: the card's own art, cut out from its background, standing upright and glowing. As the camera comes closer the hologram fades and a **figure** takes its place: a three-dimensional model that moves. The **whole card** stands behind the figure, so the name, the rules text and the artist credit are always one glance away. Nothing about the rules changes. The engine decides every outcome and the screen only stages what the engine reports.

## The rules Rob set

These are his decisions. Do not reopen them without him.

1. **Rules-true.** The engine is the only authority. Attacks aim at a player or planeswalker and the defender chooses blocks. The map hides nothing an opponent has played.
2. **The card stays whole.** The full, unaltered card image stands behind its figure at 70 to 80 degrees from the ground, in the 2.5 by 3.5 ratio, 60 percent of the figure's height, centred so 20 percent of the figure shows above it and 20 percent below.
3. **A playable card pulses neon green** around its rim.
4. **Playing a card is one motion.** The card travels from the hand to its hex, lands flat, then tilts up and slides back to its resting place while the figure rises out of it, as if peeled off the card.
5. **The hologram stays.** It is the far-zoom view and the figure is the near-zoom view. One dissolves into the other with distance.
6. **Hexes are laid edge to edge with gaps between them.** The gaps are wanted: the ground shows through. The board sits on scenery (continuous terrain, brush, hills, small buildings, a horizon) and the camera pans and zooms across it.
7. **Flying is a stance, not a badge.** A flying figure hovers above its hex with a shadow beneath. At most two other keywords are animated on a figure at once.

## What a figure is made of

Every card gets a **figure record**, a short description from which its figure is built:

| Part | Meaning | Example |
|---|---|---|
| Frame | card type, body kind, creature type | creature, two-legged, angel |
| Stance | how it holds the ground | hover |
| Personality | how it carries itself when idle | stoic |
| Held objects | what is in its hands | sword, shield |
| Nine moments | enter, idle, move, attack, defend, hit, boost, penalty, exit, each with a style | attack: slash |
| Keywords | which ones are animated | flying, vigilance |
| Source | where the model came from | generated from a text prompt |

Written as one line: `creature-angel-hover-stoic-sword-shield-slash`. Cards of the same type and subtype share a skeleton, so one set of animations serves many cards.

## What was proven

- **Card name in, standing figure out, in a browser.** `ui-prototypes/hologram-hex/figures/` looks a card up on Scryfall, cuts the art from its background in the browser, and stands it on a hex with its keywords animated. About 18 seconds for a card's first cut-out, then cached.
- **A three-dimensional scene with the full sequence.** `ui-prototypes/hologram-hex/godot/` is a Godot 4.7 project in three text files. It draws flat-top hexes with gaps, a forest that grows, the whole card standing behind a figure, the green pulse, the play-from-hand sequence, and the dissolve from figure to hologram as the camera pulls back.
- **A generated, rigged, animated model loads and plays.** A two-legged angel made with Meshy (rigged, with idle, walk, run, stance and landing animations) was dropped into the scene's `models/` folder and it fitted, hovered and animated with no code change.

## What was not proven

- **It was judged from still screenshots only.** Nobody has watched the play sequence or the dissolve in motion and signed it off.
- **Wings that flap.** The generated angel's wings are part of its body and do not move on their own. Separate wings bent by a shader are an idea, not a result.
- **Bodies that are not two-legged.** Dragons, beasts, artifacts and vehicles have no rig yet. The plan is to move them by code.
- **A crowded board.** One figure on one hex was shown. Forty permanents were not.
- **The scenery.** The test scene is hexes on a plain surface with no sky.
- **CrankMagic's own screen.** The game screen is HTML in a browser; the test scene is Godot. How the design reaches the browser is the Play lane's decision. The browser proof shows the hologram half works in HTML and CSS today. The three-dimensional half needs WebGL (three.js or Babylon, which `ui-prototypes/babylon/` already explores) or a Godot web export.

## Art and rights

- The whole card is shown **unaltered**, which keeps its artist credit and copyright line on screen.
- **No card art is uploaded to any generation service.** The model in the test was made from a text prompt, not from the card's picture. Hosted services' terms require rights to anything uploaded.
- **No card image and no cut-out is committed here.** They are fetched from Scryfall when the proof runs and kept in a local cache that git ignores.
- The cut-out hologram alters the art. Whether that is acceptable for anything beyond Rob's private use is Rob's call, and it has not been made.

## Running the proofs

The browser proof needs only Node:

```bash
node ui-prototypes/hologram-hex/figures/server.mjs
```

Then open `http://localhost:4517` and type a card name.

The Godot scene needs Godot 4.7 and reads the browser proof's cache, so run the browser proof once for Serra Angel first. It also needs the whole-card image, which the proof does not fetch:

```bash
curl -L "https://api.scryfall.com/cards/b8c5e74c-96e7-4a1f-93b7-14d776fe4b2d?format=image&version=png" --create-dirs -o ui-prototypes/hologram-hex/figures/cache/full/b8c5e74c-96e7-4a1f-93b7-14d776fe4b2d.png
```

Then, from `ui-prototypes/hologram-hex/godot/`:

```bash
godot --path . -- --shot
```

That saves five screenshots to `shots/` and quits. Without `--shot` it opens a window: scroll to zoom, right-drag to orbit, P or double-click to replay the card being played, G to toggle the green pulse, Space for the next animation.

With no model present the scene draws a simple placeholder figure. To see a real one, put any rigged `.glb` in `godot/models/`. The angel used in the test is 54 MB and is not in the repository; it is on Rob's PC and can be downloaded again from his Meshy account.

## Files

| Path | What it is |
|---|---|
| `ui-prototypes/hologram-hex/figures/server.mjs` | Scryfall lookup, art cache, cut-out store. No dependencies. |
| `ui-prototypes/hologram-hex/figures/public/index.html` | The hex scene, the cut-out step, keyword effects, tap and untap. |
| `ui-prototypes/hologram-hex/godot/main.gd` | The whole three-dimensional scene, built in code. |
| `ui-prototypes/hologram-hex/godot/project.godot`, `main.tscn` | The Godot project around it. |

The constants at the top of `main.gd` carry Rob's numbers: `FIG_H` (figure height), `HOVER` (how high a flier floats), `CARD_TILT` (75 degrees).
