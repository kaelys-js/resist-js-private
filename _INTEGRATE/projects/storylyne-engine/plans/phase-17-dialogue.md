# Phase 17: Dialogue -- Busts, Expressions, VN Mode

**Status:** Not started
**Dependencies:** Phase 5 (Event Interpreter -- dialogue triggered by event commands), Phase 12 (Menu System -- window base classes, text rendering, scrollable lists)
**Estimated weeks:** 1 (Week 36)

## Goal

Full dialogue system with character bust sprites, expression switching, text sound effects, dialogue history log, and a dedicated visual novel mode with backgrounds, transitions, auto-advance, and CG gallery tracking.

---

## Sub-phase 17.1: Enhanced Message Window

- Name box display above message window
- Bust sprite slot (left/right positioning)
- Text sound effects per character typed
- Dialogue history recording
- Formatting code support (color, size, icon, wait, speed)

### Files

```
packages/products/webforge/runtime/src/windows/window-message.ts
packages/products/webforge/runtime/src/windows/window-choice-list.ts
```

### Acceptance Criteria

- Message window displays speaker name in a name box
- Bust sprite renders beside the message window at configurable position (left/right)
- Text typing plays per-character sound effects with configurable pitch variation
- All formatting codes parse and render correctly (color, size, icon, variable, wait, speed)
- Choice list supports 10+ choices with scrolling and tooltips

---

## Sub-phase 17.2: Bust Sprites + Expressions

- Character bust display with expression switching
- Bust positioning (left, center, right, mirror)
- Enter/exit animations (slide, fade, bounce)
- Multiple busts on screen simultaneously

### Files

```
packages/products/webforge/runtime/src/sprites/sprite-bust.ts
```

### Acceptance Criteria

- Bust sprites load and display at specified screen positions
- Expression changes swap the bust image without repositioning
- Enter/exit animations play smoothly (slide, fade, bounce)
- Multiple busts render simultaneously without z-order conflicts
- Bust mirroring flips the sprite horizontally

---

## Sub-phase 17.3: Dialogue History

- Scrollable log of all dialogue text
- Includes speaker name, message text, and chosen choices
- Accessible from menu or hotkey during gameplay
- Serializable for save/load

### Files

```
packages/products/webforge/runtime/src/systems/dialogue-history.ts
```

### Acceptance Criteria

- Dialogue history records every message with speaker name and text
- Chosen choices are recorded in history with visual distinction
- History scrolls smoothly through all recorded entries
- History serializes and deserializes for save/load without data loss
- History accessible via menu or hotkey during active gameplay

---

## Sub-phase 17.4: Text Sound Manager

- Per-character typing sound playback
- Configurable sound per speaker (voice blips)
- Pitch variation for natural feel
- Silence on punctuation pauses

### Files

```
packages/products/webforge/runtime/src/systems/text-sound-manager.ts
```

### Acceptance Criteria

- Typing sounds play for each character displayed
- Different speakers use different configured sound samples
- Pitch varies within configurable range for natural feel
- Punctuation characters (period, comma, ellipsis) trigger silence/pause instead of sound
- Sound timing stays synchronized with text display speed

---

## Sub-phase 17.5: Visual Novel Mode + CG Gallery

- Dedicated VN scene with full-screen backgrounds
- Background transitions (crossfade, wipe, dissolve)
- Auto-advance with configurable timing
- CG gallery manager tracks unlocked CG images

### Files

```
packages/products/webforge/runtime/src/scenes/scene-visual-novel.ts
packages/products/webforge/runtime/src/systems/cg-gallery-manager.ts
```

### Acceptance Criteria

- VN scene renders full-screen background with character busts overlaid
- Background transitions work (crossfade, wipe, dissolve) with configurable duration
- Auto-advance proceeds after configurable delay per message length
- Auto-advance pauses at choices and waits for player input
- CG gallery tracks which images have been unlocked
- CG gallery state persists across save/load

---

## Test Plan (Skeleton)

### Schema Tests

- MessageConfigSchema validates name box text, bust reference, sound ID, and formatting codes
- ChoiceListSchema validates choice entries with text, tooltip, conditions, and scroll configuration
- BustSpriteSchema validates position enum, expression reference, and animation type
- DialogueHistoryEntrySchema validates speaker name, message text, timestamp, and choice flag
- TextSoundConfigSchema validates sound asset reference, pitch range, and punctuation pause settings
- VNSceneSchema validates background reference, transition type, and auto-advance timing
- CGGalleryEntrySchema validates CG image reference and unlock flag

### Logic Tests

- Text formatting codes: parse color, size, icon, variable, wait, and speed codes from message strings
- Choice scrolling: list scrolls to keep selection visible when choices exceed visible area
- Bust positioning: left/right/center positions calculate correct screen coordinates
- Dialogue history serialization: entries round-trip through serialize/deserialize without data loss
- Text sound timing: sounds fire at correct intervals matching text display speed
- VN auto-advance pacing: advance delay scales with message character count
- CG unlock tracking: unlocking a CG persists and duplicate unlocks are idempotent

### Integration Tests

- Full dialogue flow: event triggers message -> bust appears -> text types with sound -> choice displayed -> choice recorded in history
- VN scene flow: background loads -> transition plays -> bust enters -> dialogue plays -> auto-advance proceeds -> choice pauses
- Save/load with dialogue state: save mid-conversation, load, verify dialogue history and CG gallery intact
- Multiple bust management: show two busts, switch expressions on one, dismiss the other, verify correct rendering

### Visual Verification

- Message window with name box and bust sprite renders correctly
- Bust expression switching animates smoothly
- Bust enter/exit animations (slide, fade, bounce) look correct
- Choice list with 10+ items scrolls and highlights properly
- Dialogue history log displays with speaker names and formatted text
- VN mode full-screen background with bust overlay renders correctly
- Background transitions (crossfade, wipe, dissolve) render smoothly
- CG gallery displays unlocked images with locked placeholders
