# Phase 20: Localization + Accessibility

**Status:** Not started
**Dependencies:** Phase 5 (Event Interpreter -- localized dialogue and event text), Phase 12 (Menu System -- localized menu labels, accessible menu navigation)
**Estimated weeks:** 1 (Week 41)

## Goal

Full localization pipeline with string table management, locale detection, RTL support, and import/export for translators. Accessibility features including screen reader support, colorblind filters, font scaling, and reduced motion mode.

---

## Sub-phase 20.1: Localization Manager (Runtime)

- String table lookup by locale and key
- Runtime language switching without restart
- Template interpolation with named variables
- RTL text direction support
- Fallback chain (selected locale -> default locale -> key name)

### Files

```
packages/products/webforge/runtime/src/systems/localization-manager.ts
```

### Acceptance Criteria

- String table loads locale data and resolves keys to translated strings
- Runtime language switch updates all visible text without requiring scene reload
- Template interpolation replaces named variables in localized strings (e.g., `{playerName}`)
- RTL text direction applies when an RTL locale is active
- Fallback chain resolves missing keys: selected locale, then default locale, then raw key name
- Locale detection identifies browser/system locale on startup

---

## Sub-phase 20.2: Accessibility Manager (Runtime)

- Screen reader announcements for UI changes
- Colorblind filter modes (protanopia, deuteranopia, tritanopia)
- Font scaling with configurable size multiplier
- Reduced motion mode disables non-essential animations
- High contrast mode for improved readability

### Files

```
packages/products/webforge/runtime/src/systems/accessibility-manager.ts
```

### Acceptance Criteria

- Screen reader receives announcements when UI focus changes or important events occur
- Colorblind filters apply post-processing for protanopia, deuteranopia, and tritanopia simulation
- Font scaling multiplier applies to all game text and UI elements
- Reduced motion mode disables transition animations, particle effects, and screen shakes
- High contrast mode increases text/background contrast ratios
- All accessibility settings persist across save/load

---

## Sub-phase 20.3: Locale Editor (Editor)

- Edit string tables per locale in a spreadsheet-style grid
- Add/remove locales and string keys
- Mark untranslated strings with visual indicator
- Search and filter across all keys and translations
- Preview interpolated string output

### Files

```
packages/products/webforge/editor/src/lib/components/database/tabs/LocaleEditor.svelte
```

### Acceptance Criteria

- Spreadsheet grid displays keys as rows and locales as columns
- Inline editing modifies string values with immediate preview
- New locales and string keys can be added and removed
- Untranslated strings display a visual indicator (highlight, icon, or badge)
- Search filters keys and values across all locales
- Interpolated preview shows final string output with sample variable values

---

## Sub-phase 20.4: Locale Import/Export

- Export string tables to CSV and JSON for external translators
- Import translated CSV/JSON files back into the project
- Merge imported translations without overwriting existing keys
- Validation on import to detect missing keys and format errors

### Files

```
packages/products/webforge/editor/src/lib/io/locale-exporter.ts
packages/products/webforge/editor/src/lib/io/locale-importer.ts
```

### Acceptance Criteria

- CSV export produces a file with key column and one column per locale
- JSON export produces a nested object structure grouped by locale
- CSV import parses and loads translated strings into the project
- JSON import parses and loads translated strings into the project
- Import merges new translations without overwriting unmodified existing keys
- Import validation reports missing keys, extra keys, and malformed entries
- Round-trip: export then import produces identical string table data

---

## Test Plan (Skeleton)

### Schema Tests

- StringTableSchema validates locale code, key-value pairs, and fallback locale reference
- LocaleConfigSchema validates supported locales array, default locale, and detection strategy
- AccessibilityConfigSchema validates colorblind mode enum, font scale range, reduced motion flag, and high contrast flag
- LocaleExportFormatSchema validates CSV column structure and JSON nesting format
- InterpolationVariableSchema validates variable name, type, and default value

### Logic Tests

- String template interpolation: named variables replace correctly in localized strings
- Locale detection: browser language maps to the correct supported locale
- RTL direction: RTL flag activates for Arabic, Hebrew, and other RTL locale codes
- Font scaling: scale multiplier applies correctly to computed text sizes
- Colorblind filters: filter matrices produce correct color transformations for each mode
- Reduced motion: animation disable flag propagates to all animation systems
- CSV import/export round-trip: export then import produces identical data
- JSON import/export round-trip: export then import produces identical data
- Fallback chain: missing key in selected locale falls back to default locale, then to raw key

### Integration Tests

- Runtime language switch: change locale during gameplay, verify all visible menu labels and dialogue update
- Accessibility during gameplay: enable colorblind filter, verify post-processing shader activates; enable font scaling, verify UI text resizes
- Editor locale workflow: add locale in editor, enter translations, export CSV, modify externally, import back, verify merged data
- Localized dialogue: trigger event dialogue, verify localized string displays with interpolated variables
- Save/load accessibility state: configure accessibility settings, save, load, verify settings restored

### Visual Verification

- Locale editor spreadsheet grid with multiple locales and untranslated indicators
- RTL text rendering in message windows and menus
- Font scaling at various multipliers (0.75x, 1.0x, 1.5x, 2.0x)
- Colorblind filter modes applied to a gameplay scene
- High contrast mode applied to menu screens
- Reduced motion mode with animations disabled
