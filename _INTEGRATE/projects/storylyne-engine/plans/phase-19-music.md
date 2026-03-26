# Phase 19: Music Composer + Mixer + Spatial Audio

**Status:** Not started
**Dependencies:** Phase 2 (Editor Shell -- component hosting, tool panel infrastructure, and canvas rendering)
**Estimated weeks:** 2 (Weeks 39-40)

## Goal

In-editor music composition with piano roll sequencer, multi-channel mixer, spatial audio placement on maps, and runtime playback with crossfading, layer-based adaptive music, and 3D positioned sound.

---

## Sub-phase 19.1: Music Composer + Instrument Library

- Piano roll sequencer for note entry
- Quantization grid (quarter, eighth, sixteenth, triplet)
- Built-in instrument library with preview
- Pattern-based composition with copy/paste

### Files

```
packages/products/webforge/editor/src/lib/components/audio/MusicComposer.svelte
packages/products/webforge/editor/src/lib/components/audio/InstrumentLibrary.svelte
```

### Acceptance Criteria

- Piano roll displays a grid with time on the x-axis and pitch on the y-axis
- Notes are placed, moved, resized, and deleted via mouse interaction
- Quantization snaps note start and end to the selected grid division
- Instrument library lists available built-in instruments with categories
- Instrument preview plays a sample tone when selected
- Patterns can be copied, pasted, and duplicated across the timeline
- Composed music data exports in a format the runtime consumes

---

## Sub-phase 19.2: Mixer Panel + Waveform Editor

- 8-channel mixer with volume, pan, mute, and solo per channel
- Master channel with output level
- Waveform editor for setting loop points on audio assets
- Visual waveform display with zoom and scroll

### Files

```
packages/products/webforge/editor/src/lib/components/audio/MixerPanel.svelte
packages/products/webforge/editor/src/lib/components/audio/WaveformEditor.svelte
```

### Acceptance Criteria

- Mixer displays 8 channels plus a master channel
- Each channel has volume fader, pan knob, mute button, and solo button
- Master channel shows combined output level
- Channel level meters respond in real-time during playback
- Waveform editor renders audio waveform with zoom and horizontal scroll
- Loop start and end markers are draggable on the waveform
- Loop playback respects set loop points accurately

---

## Sub-phase 19.3: Spatial Audio Placer

- Place sound sources on the map editor canvas
- Configure radius, falloff curve, and volume per source
- Visual representation of audio range on map
- Preview spatial audio positioning in editor

### Files

```
packages/products/webforge/editor/src/lib/components/audio/SpatialAudioPlacer.svelte
```

### Acceptance Criteria

- Sound sources are placed on the map via click/drag
- Each source has configurable radius, falloff curve, and base volume
- Visual overlay shows audio range as a circle/gradient on the map
- Preview plays the sound with spatial attenuation based on camera/listener position
- Multiple sound sources render simultaneously without visual overlap issues
- Sound source data saves with the map and loads correctly

---

## Sub-phase 19.4: Runtime Audio Systems

- Audio manager with crossfade between tracks
- Music player renders composed music data to audio output
- Spatial audio engine with 3D positioned sound and distance attenuation
- Interactive music manager with layer-based adaptive music (combat layers, exploration layers)

### Files

```
packages/products/webforge/runtime/src/core/audio-manager.ts
packages/products/webforge/runtime/src/core/music-player.ts
packages/products/webforge/runtime/src/core/spatial-audio.ts
packages/products/webforge/runtime/src/core/interactive-music-manager.ts
```

### Acceptance Criteria

- Audio manager crossfades between BGM tracks with configurable duration
- Audio manager supports simultaneous BGM, BGS, ME, and SE channels
- Music player loads composed music data and plays it back accurately
- Spatial audio positions sounds in 3D space relative to the listener/camera
- Distance attenuation follows configured falloff curve per sound source
- Interactive music manager layers tracks (e.g., adds combat percussion layer during battle)
- Layer transitions crossfade smoothly with configurable timing
- All audio systems pause, resume, and stop on demand

---

## Test Plan (Skeleton)

### Schema Tests

- NoteSchema validates pitch, start time, duration, velocity, and instrument reference
- PatternSchema validates note array, time signature, and tempo
- MixerChannelSchema validates volume level, pan position, mute flag, and solo flag
- LoopPointSchema validates start sample, end sample, and crossfade duration
- SpatialSourceSchema validates map position, radius, falloff curve type, and volume
- InteractiveMusicLayerSchema validates layer name, track reference, trigger condition, and crossfade duration

### Logic Tests

- Note timing quantization: notes snap to correct grid positions for all division types
- Mixer channel levels: per-channel volume and pan produce correct combined output
- Spatial audio distance attenuation: volume reduces correctly with distance using linear, logarithmic, and custom curves
- Crossfade timing: BGM transitions blend over the exact configured duration
- Loop point accuracy: audio loops at the exact sample positions without audible gap or click
- Interactive music layer activation: layer enables/disables based on trigger conditions
- Pattern copy/paste: duplicated pattern contains identical note data at the new timeline position

### Integration Tests

- Composer to runtime: compose music in editor, export data, play in runtime, verify note timing and instrument selection
- Mixer to runtime: set channel levels in editor, verify runtime playback matches configured mix
- Spatial audio placement to runtime: place sound on map in editor, move player in runtime, verify volume changes with distance
- Interactive music during gameplay: enter combat, verify combat layer fades in; exit combat, verify layer fades out
- Save/load with audio state: save while BGM is playing, load, verify BGM resumes from correct position

### Visual Verification

- Piano roll note display and grid alignment
- Mixer panel fader positions and level meter animation
- Waveform editor rendering with loop point markers
- Spatial audio range overlay on map editor
- Spatial audio placer with multiple sources visible
