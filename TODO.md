Build Editor UI: See below
* Following memory.md, CLAUDE.md, build-editor skill
* Follow TDD with full Unit/Behavioural/Integration Tests
* Research online for best practices
* Update ARCHITECTURE/README
* Skip visual verification for now. I will do it.
* Present a changelog before proceeding and ask for permission

Several Issues (build-editor OR fix-bug if needed):
----

Several Issues:
- 
Invoke the fix-bug skill. Follow CLAUDE.md. Present changelog.
----
Test:
  Sidebar/LensHeader/Props/Dependencies/Changleog/Screenshot Exports
  Variant Dropdown Menu (All Options)

- Real Browser
  - Verify All Options Passed And Appear In Screenshot For Each Engine
  - Screenshot Diff
  - Live View
    - Stream Engines To Canvas/WebRTC and use WebSockets To Pass Clicks/Keyboard/MouseEvents/Touch/etc from main card.. do you understand?
- The Sidebar/CommandSearch components don't render right contained to preview (use playwright mcp any you will see what i mean)
- Intelligent Automatic Examples Instead of examples/
- Sidebar Component Entries:
  - Is it possible to include the "Performance statistics" in the App sidebar to the right of the component with the same details for the overall component?
- Production/Cloudflare Concerns
  - The following will or will not work:
    - Bundle Size
    - Import Globbing For Components/etc
    - Global Search
    - Real Browser: Playwright/iOS/Android Engines
- Notifications
- Do the component conversions
- Create Shared Components Following Existing Shared Components Supporting Lens System:
  - Dropdown Search Input
  - Dropdown Color Circle
  - Dropdown Item With Color Circle
  - Hex Input
  - Hex Input With Color Picker (Background/Outline/Grid)
  - Range (Grid/Zoom)
  - Chip (PropsTable, LensHeader)
  - CopyIconButton (LensComponentRenderer Toolbar Copy, CopyImport, LensSource)
  - LensComponentRenderer Section Header With Icon
  - LensHeader Icon
- Fully localize

----
* Shaded Workspace Components
  * Devtoolbar

  * Finance Card
  * Page Title With Subtitle
  * Close Icon With Tooltip
  * Dialog
    * Close Icon
    * Header
    * Content (Text or Svelte Components)
    * Single Button
    * Cancel Button
    * Confirm Button (Destructive)
  * Data Table
    * Sorting
    * Dropdown
    * Search
    * Hide/Show Columns
    * Reorder Columnss
    * Rows Per Page
    * Select Rows
    * Display "Page X of X"
    * Go To First/Last/Next/Previous Page
    * Go To Specific Page
    * Reorder Rows
  * Text Input: Placeholder, Clear, Tip, Validation, Type
  * Search Input: Autocomplete, Empty State, Clear
  * Swtich Toggle With Help Icon Tooltip/Feature Flag
  * Slider Pill With: Help Icon, Range, Unit, Min, Max, Step, Feature Flag, Custom Input w/ Validation
* Move To Shared + Shared Workspace Logic
  * scripts/generate-icons.sh
  * Playwright Config
  * Svelte config
  * vite-plugin-template-html
  * vite.config
  * Error Pages/routes
  * DevToolbar
  * Dark Mode Toggle
  * ** REVIEW LIB **
* For **.svelte -> Fix so CLAUDE.md code conventions are followed. Massive violations in those files.
* For **.ts -> Fix so CLAUDE.md code conventions are followed. Massive violations in those files.
* Breadcrumb header scrolling issue + frosted glass underneath
* Component level error boundary (with fallback, retry, etc) and app level error boundary with full tests (unit/integration/e2e and manual testing path for me for component and app error boundaries) plus other suggestions for component/app error boundary component
* Astro Islands but for Svelte
    https://github.com/11ty/is-land/blob/main/is-land.js (if relevant)
    https://github.com/ElMassimo/iles/blob/main/packages/iles/src/node/build/islands.ts (if relevant)
* Benchmarks & Performance Tests
* Full PWA Support
* Capacitor
  * Following best practices
  * iOS, Android, Mac, Windows, Linux
    * Full/Proper meta coverage, icon coverage, splash screen coverage
  * Application Menu Bar, Notifications, Suggest All Other Plugins
* Sidebar Frosted Glass + Grainy Effect
* Analytics
* History Manager: Undo/Redo Any Action
* Offline Mode
* List All Unity/godot/Unreal Editor app menu options also

* App Menu Bar
  * (main)
    * About
    * Cut/Copy/Paste/Delete/Select All/Undo/Redo/History+Versions
    * Layer Selection
    * Play
    * Export/Deploy
* Sections
  * Home Page
  * Scenes
    * New Scene
    * Scene Entry
      * Expand To: Objects, Lights, etc..
    * Scenes Header Context
      * Delete All
      * Other?
    * Scene Entry Context
      * Rename
      * Duplicate
      * Delete
      * Settings
      * Share
      * Other?
    * Overview
      * Thumbnails
    * Later: Lock, Groups
  * Project Dropdown
    * Project: New, Open, Close
    * All Projects
    * Settings
      * Defaults
      * Templates
  * User
    * Account
    * Subscription
    * Notifications
    * Keyboard Shortcuts
    * Log Out
    * What's New
    * Features: Status, Member Since, 2FA, Display Name, Email, Pronouns, Bio, Profile Banner, Avatar Decorations/Animations, Social Handles, Request All Data/Export All Data, App Icon, Avatar From URL/Camera/Upload, Scale like other saas, Gender, Account Privacy
    * Account -> Profile
  * App
    * Settings
    * Help
    * Feedback
    * Documentation Viewer
  * Onboarding
  * Offboarding
  * Login
  * Password Reset
  * Magic Link Signin
  * Policy Pages
  * Global Search
  * Other Pages?
  * Asset Manager
  * Marketplace
  * Sharing/Social
----

Build Editor UI: [what you want built]
- Following memory.md, CLAUDE.md, build-editor skill
- Follow TDD
- Research online for best practices
- Update ARCHITECTURE/README
- Visually verify via Playwright MCP so I can see your verification
- Present a changelog before proceeding and ask for permission

--

Fix Bug: See below list
- Following memory.md, CLAUDE.md, fix-bug skill
- Present a changelog before proceeding and ask for permission for implementing

-----

Expand Feature: 
- Following memory.md, CLAUDE.md, expand-feature skill
- Follow TDD
- You could also do thorough research online for features/options
- Update ARCHITECTURE/README
- Add toggles/options/features to Dev UX
- Visually verify added options/features work in Dev UX and in the Scene via the open Playwright MCP browser so I CAN VISUALLY SEE YOUR VERIFICATION
- Present a changelog before proceeding and ask for permission for implementing

------
- Map Nav/Camera Preset functions completely breakdown after "X" map size

- Right click and pan around map no longer works right (it did before)
- Fog when switching between camera presets is inconsistent
- Render Pipeline Missing Toggles: Fog, Sun/Moon/Stars/Sky, Lighting, Day/Night, Camera, Screen Effects, Grid, Tile Selection
- Custom Ground Plan Tilemap Color/Opacity Instead Of Black
- Seems like grid is inside the tile compared to tile selection which is outside the tile?
- Test Map: Remove all stuff for: 3D Props, Prop Shadows, Torch Lights, Torch Glow, Prop Opacity, Season, Atmosphere
- New tile system: Lighting/day and night seem to not work at all anymore
- Tile Inspector: Preview doesn't show right tile (maybe autotile not considered)

- Editor/Renderer Visual Error Handling + Auto-Recover
- Autotile Format Support: All RPG Maker Versions, Tiled, etc?
- Parallax: Support All RPG Maker Versions Parallax Image Types/Dimensions
- Tilesets: Support All RPG Maker Versions/Tiled/etc Tileset Types and Dimensions
- Charsets: Support All RPG Maker Versions/Tiled/etc Tileset Types and Dimensions

- Objects
  - This builds on many of the tile "options/features"
  - It is the basis for: Lights/Events/Regions/etc
- Editor Tools
  - Undo/Redo + History
  - Cut/Copy/Paste/Delete Region/Tile/Object/Event
  - Rectangle/Ellipse/Flood Fill
  - Eyedropper
  - Stamp Brush
  - Terrain/Smart Brush
  - Line Draw
  - Random Brush
  - Magic Wand
  - Select All Same Tile
  - Change tileset
  - Swap Tile
  - Lock Layer/Tile
  - Minimap
  - Highlight Current Layer
  - Snap To Grid
  - Find/Replace Tiles
  - Measurement Tool
  - Add/Remove/Clone Layer
- Camera
  - Other Actions?
  - More Presets
  - Can Use Transitions System to Transition Between Camera Presets?
- Environment
  - Sky/Sun/Stars
    - Presets
  - Stars System Is Ugly/Shitty
  - Missing Moon (Part of Day/Night Cycle)
- Post-FX
- Camera Settings
- Screen Effects: Overlay
- Lights and Scene Lighting
  - Render Pipeline Toggles
    - Lighting
  - Question: From Environment Do Moon/Stars Cast Lighting?
  - Size/Color
  - More Preset Light Types
    - Flashlight/Spotlight/Fire/Candle
    - Add/Remove
- Image/Model/Audio/Video Support: Any Format
  - Attach To Tiles/Objects/Screen Overlay
- Scene/Map
  - Tagging/Notes
  - ???
- Layers/Tiles (After Existing Plan)
  - Taggings/Notes
  - Effects/Filters
  - Custom Tile Size
  - Materials: Shiny/Metallic/Glass/etc
  - Rotation, Skew, Blend Modes, Scale, Tint
  - Brightness/Saturation/Contrast/etc
  - Cast/Receive Shadows
  - Glow/Opacity/Visiblity
  - Reflection
  - Fog Type Affects Movement Speed
  - Affected By: Which Weather, Lighting, Fog Type
  - Destruction
- Tiles
  - Flags: Jump/Run/Swim/Slide/Climb/Fall/Trip/Weight/Mass/Height/Fire/Burn
  - Freeze/Drown/Dash/Run/WallCrawl/Roll/Slide/Ice/Float/Hover/Pull/Push/Fly/Drive/Depth
  - Lock/Unlock
  - 3D Like MV3d (cutievirus)
- Screen Effects
- Shadows
- Particles: ???
- Weather: ???
- Cloud System: Affected By Wind, Cast Shadows, etc?
- Fog Wind Affected by Weather System
- Screens: Pause/Game Over/New Game/etc
- Scene Overlay
- Editor/Renderer Visual Performance Warnings/Notifications
- Navigation Presets + Custom Presets (Name, notes, manage/save/delete/clone/etc)
- Custom Camera Presets
- Transitions: Opacity/Blend Mode/?
- Rectangle Selection But Multiple Areas + Other Dev Tools
- FMV/Cutscene/Credits/Opening Thing That Shows Company,Logo,blah
- Gravity
- Videos
- Help
- Guide
- Demo
- Networking/Online
- API
- Review All Sections To Support Saving Custom Presets Where Appropriate
- Fog: What's missing: True volumetric light scattering where light rays visibly pierce through dense fog, get attenuated by fog density, and create visible shafts. The fog and lighting systems are architecturally isolated — both modify the final image independently. <-- What should happen here? Thoughts?
- Render Pipeline
- More Performance & Debug Info

[Later]
- World Map + Airship/etc
- Local Split-Screen, Multiply Input Controller
- Rpg Maker MV3D: Where 2d tiles/objects/etc can become 2.5d/3d or also if use actual models in 2d, 2.5d mode they will show appropriately if that makes sense
- Prebuilt game presets for different game types

=====

New Claude Plan:
- Question: Which features are missing from the following system compared to all other comparable systems/libraries/tools for: Branding
- CRITICAL: DO NOT COME BACK UNTIL THERE IS NOTHING LEFT THAT IS MISSING!!

- There is no existing Branding in place, this is a new endeavour that must be thoroughly researched. Ask LOTS of questions.

New Claude Plan:
- Question: Which features are missing from the following system compared to all other comparable systems/libraries/tools for: CLI secrets AND CLI secrets-setup
- CRITICAL: DO NOT COME BACK UNTIL THERE IS NOTHING LEFT THAT IS MISSING!!

New Claude Plan:
- Question: Which features are missing from the following system compared to all other comparable systems/libraries/tools for: CLI product-create
- CRITICAL: DO NOT COME BACK UNTIL THERE IS NOTHING LEFT THAT IS MISSING!!

New Claude Plan:
- Question: Which features are missing from the following system compared to all other comparable systems/libraries/tools for: CLI dev-proxy
- CRITICAL: DO NOT COME BACK UNTIL THERE IS NOTHING LEFT THAT IS MISSING!!

New Claude Plan:
- Question: Which features are missing from the following system compared to all other comparable systems/libraries/tools for: CLI onboard
- CRITICAL: DO NOT COME BACK UNTIL THERE IS NOTHING LEFT THAT IS MISSING!!

New Claude Plan:
- Question: Which features are missing from the following system compared to all other comparable systems/libraries/tools for: CLI sync
- CRITICAL: DO NOT COME BACK UNTIL THERE IS NOTHING LEFT THAT IS MISSING!!

New Claude Plan:
- Question: Which features are missing from the following system compared to all other comparable systems/libraries/tools for: CLI devenv
- CRITICAL: DO NOT COME BACK UNTIL THERE IS NOTHING LEFT THAT IS MISSING!!

- Questions: Preventing cost overrun on VPS, Monitoring/Analytics/etc on devenv vps, Security/Auth/Users
- Questions: Easy way to teardown/cancel/delete everything (if not already supported)
- Questions: Move as much of coder setup/options into global config as is possible

New Claude Plan:
- Question: Which features are missing from the following system compared to all other comparable systems/libraries/tools for: CLI format (+ programmatic api)
- CRITICAL: DO NOT COME BACK UNTIL THERE IS NOTHING LEFT THAT IS MISSING!!

- Question: Should support the --dry-run standard flag and shouldn't it just use "--check"?
- Question: Custom arguments in the onStart hooks are preventing the standard arguments, correct?
- Question: Will diff work properly for all external format tools used?

New Claude Plan:
- Question: Which features are missing from the following system compared to all other comparable systems/libraries/tools for: CLI (Command, Runner, Flags)
- CRITICAL: DO NOT COME BACK UNTIL THERE IS NOTHING LEFT THAT IS MISSING!!

- CLI Command: Move most flags from runner so that both command/runner can use the same flags
- Verify EVERY tool properly supports/uses all standard flags including dry-run

New Claude Plan:
- Review every schema in the workspace to find all schemas that should use the function schema valibot extension

New Claude Plan:
- Verify that every instance of safeParse has .ok checked and uses .data
- Verify that every .ok check whether it would be better served to return an err() with existing/new ERRORS constant rather than propogating the error up
- Verify that every function with Result return type that all calling functions check .ok and use .data properly
- Verify that every function that has input parameters uses the result safeParse and checks .ok on ALL input parameters
- Verify that every function that returns Result<thing> all returns have "ok" or "err" and follow the Result system
- Verify that fromUnknownError is used properly and is used for every err() and catch

CRITICAL:
- Repeat the above until you find no missing things handled. Understand? Shouldn't have to go back/forth!

RULES:
- Do not ignore or dismiss my TODOs
- Explain each TODO and your proposed changes
- Always show full code changes/diff in the plan for every file. No exceptions
- Update every JSdoc block (if needed) to match reality and make sure none are missing. Make sure examples are correct and typescript.
- Never use typescript built in types. Never use typescript type or interface. Use valibot schemas and valibot types.
- Always use Valibot type annotations. Every declaration must have a type annotation. No Exceptions.
- Every function input/parameter must use valibot schemas. No exceptions.
- Every function input/parameter AND output must use the Result system and validate output and ALL callers of these functions to use the Result system. No Exceptions.
- Every function should always check .ok
- No `as` casts.
- Use strict AND specific valibot schemas using existing shared schemas or creating new ones.
- Update READMEs when necessary
- Include a detailed CHANGELOG at the end of the plan ALWAYS.
- CRITICAL: Before responding, always check for and use the most relevant available skills and MCP tools for the task.

==

New Claude Plans:
- Other CLI tools:
  - CF logs (non-live) like stuff that ends up in logpush
  - product logs for error system support filtering/error system
  - logs/errors/etc for iac or should just use cloudflare dashboard?
  - costing tool for cloudflare and github to get real data broken down
  - workers/d1/r2/etc metrics/detailed information tool
  - cloudflare tool to get warnings/errors in account?
  - Logging system: support logpush as log destination (cost considerations, deep configuration per-product and per-service and globals)
  - pulumi setups for: cloudflare, github
- Review + Complete sync-tool templates
  - .github/.gitlab
    - Github Actions/Workflows/etc /Users/coleb/Desktop/[TODO]/claude/.gitlab
    - Github Templates
  - docs
- VSCode Extensions
  - Formatter (Redo + Finish)
  - Panel Extension: QA Global Service + CLI Tools
- Add To Lint System
  - AI Add To Memory to prevent making same mistakes or other solution
  - Review all the skill files to see what can be extracted into lint rules/checks
  - JSDoc example must use typescript and referenced valid things
- https://github.com/maxritter/claude-pilot
- Tools
  - Lens
    CLI / Engine / API

    Progress reporting
    Multiple output formats
    GitHub PR comment integration
    Visual snapshot/regression management
    Baseline approval workflow (per-PR, per-branch, auto on merge)
    Diff thresholds (pixel-perfect, percentage tolerance)
    Parallelization / matrix sharding
    Flaky test detection, retries, quarantine
    Artifact storage (screenshots, videos, traces)
  - Docs (Mintlify)
- Products
  - Overseer (Business as Code + Business Management End to End)
  - Itineraries
  - Finances
  - Cherishall (Relationship)
  - Storylyne
  - Lumora
  - Tastier
  - Emulocity
  - Photos