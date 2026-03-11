# Branding System — Complete Feature Gap Analysis & Implementation Plan

## Context

The resist.js monorepo has **zero branding infrastructure**. No CSS framework, no design tokens, no component library (`shared/ui/` is empty), no favicon/manifest generation, no image processing pipeline, no icon library, no email templates — complete blank slate. This plan defines every feature needed to build a comprehensive branding system comparable to industry-standard tools (Style Dictionary, Radix Colors, Open Props, RealFaviconGenerator, Satori, MJML, Frontify, Brandfolder, @capacitor/assets, PWA Builder, etc.).

**User decisions captured:**
- Scope: Full system (config + tokens + CLI tool + asset generation + guidelines + brand book)
- Config location: `company.branding` in resist.config.ts, per-product overrides in `products[].branding`
- Color system: OKLCH with 3 brand colors → auto-generate everything
- Typography: Font families + auto modular type scale from ratio
- Logo variants: 12 SVGs (6 types × light/dark)
- Dark mode: Auto-generated from light palette
- Token output: CSS custom properties
- Asset output: Centralized in `packages/shared/brand/`
- Font loading: Self-hosted WOFF2
- OG images: Dynamic per-page via Satori
- Email: MJML or Svelte templates (NOT React Email)
- Icons: Full icon library system
- Voice/tone: Full brand book (comprehensive)
- Brand kit: Complete ZIP export
- CLI tool: `pnpm tool brand` with actions + onboarding wizard
- Per-product overrides: Colors + logo + name + tagline (inherit everything else)
- Design tokens: Full set (spacing, radius, shadows, motion, breakpoints, z-index, opacity)
- Guidelines: Markdown + self-contained HTML portal

---

## A. Complete Feature Gap Analysis

Every feature below is **MISSING** (baseline is zero). Organized by category with comparable tool references.

### A1. Configuration & Schema

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 1 | Company-level branding config in resist.config.ts | Style Dictionary | P0 |
| 2 | Per-product brand overrides (colors, logo, name, tagline) | Style Dictionary themes | P0 |
| 3 | Valibot schema validation for all brand values | — | P0 |
| 4 | Sensible defaults for all optional config | Open Props | P0 |
| 5 | Config migration when schema changes between versions | Style Dictionary | P2 |
| 6 | Config diff detection (changed since last generate) | Turborepo inputs | P1 |

### A2. Color System

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 7 | OKLCH as primary color input format | Radix Colors, Tailwind v4 | P0 |
| 8 | Hex, RGB, HSL conversion utilities | culori, chroma-js | P0 |
| 9 | 12-step shade scale generation (50–950) per color | Radix Colors (12-step) | P0 |
| 10 | Semantic color mapping (primary, secondary, accent) | Radix Colors | P0 |
| 11 | Status semantic colors (success, warning, error, info) | Radix Colors | P0 |
| 12 | Neutral/gray scale generation | Radix Colors | P0 |
| 13 | Surface colors (background, card, popover, overlay) | shadcn/ui | P0 |
| 14 | Text colors (primary, secondary, muted, inverted) | shadcn/ui | P0 |
| 15 | Border colors (default, strong, subtle) | shadcn/ui | P0 |
| 16 | Auto dark mode palette (lightness inversion in OKLCH) | Radix Colors | P0 |
| 17 | P3 wide gamut support with sRGB fallbacks | Radix Colors | P1 |
| 18 | WCAG AA contrast validation (4.5:1 normal, 3:1 large) | Radix Colors | P0 |
| 19 | WCAG AAA contrast validation (7:1 normal, 4.5:1 large) | axe-core | P1 |
| 20 | Contrast matrix (all foreground/background pairs) | Stark | P1 |
| 21 | Color-blind simulation (protanopia, deuteranopia, tritanopia) | Stark, Sim Daltonism | P2 |
| 22 | Alpha/opacity variants for each color | Radix Colors (alpha scales) | P1 |
| 23 | Color format conversion utilities (OKLCH ↔ Hex ↔ RGB ↔ HSL) | culori | P0 |
| 24 | Gradient tokens (linear, radial, conic from brand colors) | Open Props | P1 |

### A3. Typography

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 25 | Font family config (heading, body, mono) | Style Dictionary | P0 |
| 26 | Font weight specification per family | Style Dictionary | P0 |
| 27 | Font source config (google, local, variable, system) | — | P0 |
| 28 | Modular type scale generation (base + ratio) | type-scale.com, utopia.fyi | P0 |
| 29 | Fluid/responsive type scale with clamp() | utopia.fyi | P1 |
| 30 | Line height scale (tight, normal, relaxed) | Tailwind | P0 |
| 31 | Letter spacing guidelines | Tailwind | P1 |
| 32 | Self-hosted WOFF2 font files | — | P0 |
| 33 | @font-face CSS generation with font-display: swap | — | P0 |
| 34 | Font subset optimization (latin, latin-ext) | subfont, glyphhanger | P2 |
| 35 | Font fallback stack generation | fontaine, capsize | P1 |
| 36 | Variable font support (single file, weight axis range) | — | P1 |
| 37 | Font metrics extraction (ascender, descender, cap height) | capsize | P2 |

### A4. Spacing & Layout

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 38 | Base spacing unit config (4px default) | Tailwind, Open Props | P0 |
| 39 | Spacing scale generation (1–24+ steps) | Tailwind | P0 |
| 40 | Container max-widths | Tailwind | P1 |
| 41 | Breakpoint definitions (sm, md, lg, xl, 2xl) | Tailwind | P0 |
| 42 | Grid system tokens (columns, gaps) | Tailwind | P2 |

### A5. Visual Properties

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 43 | Border radius scale (sm, md, lg, xl, full) | Tailwind, Open Props | P0 |
| 44 | Shadow scale (xs, sm, md, lg, xl, 2xl) | Tailwind, Open Props | P0 |
| 45 | Shadow color derived from brand palette | shadcn/ui | P1 |
| 46 | Z-index scale | Tailwind | P0 |
| 47 | Opacity scale | Tailwind | P1 |
| 48 | Line/border width scale | Tailwind | P1 |
| 49 | Blur scale (for glassmorphism effects) | Open Props | P2 |
| 50 | Aspect ratio tokens | Open Props | P2 |

### A6. Motion & Animation

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 51 | Duration scale (fast, normal, slow) | Open Props | P0 |
| 52 | Easing functions (default, in, out, in-out) | Open Props | P0 |
| 53 | Spring presets (bouncy, gentle, snappy) | Framer Motion | P2 |
| 54 | Reduced motion support (@prefers-reduced-motion) | — | P1 |
| 55 | Transition presets for common interactions | Open Props | P1 |
| 56 | Animation keyframe tokens | Open Props | P2 |

### A7. Design Token Generation

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 57 | CSS custom properties output (:root + .dark) | Style Dictionary | P0 |
| 58 | JSON token output (machine-readable) | Style Dictionary | P1 |
| 59 | TypeScript constants output (optional) | Style Dictionary | P2 |
| 60 | Token reference/alias resolution ($primary → value) | Style Dictionary | P1 |
| 61 | Composite tokens (e.g., shadow referencing color tokens) | Tokens Studio | P1 |
| 62 | Per-product token override files | Style Dictionary themes | P0 |
| 63 | Token documentation (description per token) | Style Dictionary | P1 |
| 64 | Token changelog/diff between versions | Tokens Studio | P2 |
| 65 | Multi-platform output: iOS Swift color assets | Style Dictionary | P2 |
| 66 | Multi-platform output: Android XML color resources | Style Dictionary | P2 |

### A8. Logo System

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 67 | 12 SVG variant support (6 types × light/dark) | — | P0 |
| 68 | SVG normalization (viewBox cleanup) | SVGO | P0 |
| 69 | SVG optimization | SVGO | P0 |
| 70 | Raster generation at 72 DPI (web) | Sharp | P0 |
| 71 | Raster generation at 300 DPI (print) | Sharp | P0 |
| 72 | Raster generation at 600 DPI (high-detail print) | Sharp | P1 |
| 73 | PNG with transparency | Sharp | P0 |
| 74 | JPG for email/social (no transparency) | Sharp | P1 |
| 75 | WebP for modern web | Sharp | P1 |
| 76 | Logo safety zone calculation & visualization | Frontify | P1 |
| 77 | Minimum size guidelines | Frontify | P1 |

### A9. Favicon Generation

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 78 | favicon.ico (multi-size: 16, 32, 48) | RealFaviconGenerator | P0 |
| 79 | favicon.svg (modern browsers) | RealFaviconGenerator | P0 |
| 80 | Apple Touch Icons (57–180px, 10 sizes) | RealFaviconGenerator | P0 |
| 81 | Android Chrome icons (36–512px, 7 sizes) | RealFaviconGenerator | P0 |
| 82 | Microsoft Tiles (70, 150, 310, 310x150) | RealFaviconGenerator | P1 |
| 83 | Safari Pinned Tab SVG (monochrome + color) | RealFaviconGenerator | P1 |
| 84 | Maskable icons for PWA (192, 512) | RealFaviconGenerator | P0 |
| 85 | Monochrome icons for PWA (192, 512) | RealFaviconGenerator | P1 |
| 86 | Dark mode favicon variants | — | P2 |
| 87 | Meta tag HTML snippet generation (for `<head>`) | RealFaviconGenerator | P0 |
| 88 | browserconfig.xml generation | RealFaviconGenerator | P1 |

### A10. PWA Support

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 89 | manifest.webmanifest generation | PWA Builder | P0 |
| 90 | All required manifest fields (name, short_name, start_url, display, etc.) | PWA Builder | P0 |
| 91 | Icon array with sizes and purposes (any, maskable, monochrome) | PWA Builder | P0 |
| 92 | Screenshots for install prompt | PWA Builder | P2 |
| 93 | Shortcuts definition | PWA Builder | P2 |
| 94 | Categories | PWA Builder | P2 |
| 95 | Theme color + background color from brand | PWA Builder | P0 |
| 96 | Related applications (native app store links) | PWA Builder | P2 |
| 97 | Per-product manifest variants | — | P0 |

### A11. Mobile Asset Generation (Capacitor)

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 98 | iOS App Store icon (1024x1024) | @capacitor/assets | P0 |
| 99 | iOS app icons (@1x, @2x, @3x — iPhone, iPad, Spotlight, Settings) | @capacitor/assets | P0 |
| 100 | iOS splash screens (all device sizes, portrait + landscape) | @capacitor/assets | P0 |
| 101 | iOS dark mode splash screens | @capacitor/assets | P1 |
| 102 | Android adaptive icons (foreground + background layers) | @capacitor/assets | P0 |
| 103 | Android legacy icons (ldpi–xxxhdpi) | @capacitor/assets | P0 |
| 104 | Android splash screens | @capacitor/assets | P1 |
| 105 | Android 12+ splash (icon + background color) | @capacitor/assets | P1 |

### A12. OG / Social Media Images

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 106 | Dynamic OG image generation via Satori (JSX→SVG→PNG) | Satori (Vercel) | P0 |
| 107 | Template system (default, blogPost, product, etc.) | Satori | P0 |
| 108 | Facebook/generic: 1200x630 | — | P0 |
| 109 | Twitter/X: 1200x630 | — | P0 |
| 110 | LinkedIn: 1200x627 | — | P1 |
| 111 | Pinterest: 1000x1500 | — | P2 |
| 112 | Instagram: 1080x1080, 1080x1350 | — | P2 |
| 113 | WhatsApp/Telegram: 1080x1080 | — | P2 |
| 114 | Custom font embedding in Satori | Satori | P0 |
| 115 | Logo overlay in OG images | — | P0 |
| 116 | Gradient backgrounds from brand colors | — | P1 |
| 117 | Per-product OG variants | — | P0 |
| 118 | Build-time + on-demand Worker endpoint modes | — | P1 |

### A13. Email Templates

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 119 | MJML-based email templates (responsive, email-client safe) | MJML | P0 |
| 120 | Svelte wrapper for template data/logic injection | svelte-email | P1 |
| 121 | Branded components: header, footer, button, layout | React Email, MJML | P0 |
| 122 | Template: welcome/onboarding | — | P0 |
| 123 | Template: password reset | — | P0 |
| 124 | Template: email verification | — | P0 |
| 125 | Template: invoice/receipt | — | P1 |
| 126 | Template: notification | — | P0 |
| 127 | Template: trial expiry | — | P1 |
| 128 | Template: newsletter | — | P2 |
| 129 | Brand color/logo injection into templates | — | P0 |
| 130 | Email-safe font stacks | — | P0 |
| 131 | Dark mode email support (where client supports) | — | P2 |
| 132 | Per-product email variants | — | P1 |
| 133 | Preview/test system (render MJML → HTML) | MJML | P0 |
| 134 | Responsive layout (600px max width) | MJML | P0 |

### A14. Icon Library System

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 135 | Icon set selection config (lucide, phosphor, heroicons, custom) | — | P0 |
| 136 | SVG sprite sheet generation | svgstore, svg-sprite | P0 |
| 137 | Individual SVG export | — | P0 |
| 138 | Icon size grid config (16, 20, 24, 32, 48) | Lucide | P0 |
| 139 | Stroke width configuration | Lucide | P1 |
| 140 | Icon color from brand tokens | — | P0 |
| 141 | Custom icon addition workflow | — | P2 |
| 142 | Tree-shaking support (import only used icons) | Lucide, unplugin-icons | P1 |
| 143 | Svelte icon component wrapper generation | lucide-svelte | P1 |

### A15. App Store Assets

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 144 | iOS App Store icon (1024x1024 no transparency) | — | P0 |
| 145 | iOS screenshot templates (6.7", 6.5", 5.5") | — | P1 |
| 146 | iOS app preview video guidelines | — | P2 |
| 147 | Android Play Store icon (512x512) | — | P0 |
| 148 | Android feature graphic (1024x500) | — | P1 |
| 149 | Android screenshot templates | — | P1 |
| 150 | App metadata templates (name, subtitle, keywords, description) | — | P1 |

### A16. Brand Guidelines Documentation

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 151 | Markdown brand guidelines document | Frontify | P0 |
| 152 | Self-contained HTML brand portal | Frontify, Brandfolder | P0 |
| 153 | Live color swatches with all format values | Frontify | P0 |
| 154 | Typography specimen | Frontify | P0 |
| 155 | Logo usage guidelines (do's and don'ts) | Frontify | P1 |
| 156 | Safety zone visualization | Frontify | P1 |
| 157 | Minimum size guidelines | Frontify | P1 |
| 158 | Contrast ratio matrix visualization | Stark | P1 |
| 159 | Icon usage guidelines | Frontify | P1 |
| 160 | Spacing reference | Frontify | P1 |

### A17. Brand Voice & Copy

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 161 | Brand personality traits config | Frontify | P0 |
| 162 | Tone guidelines | Frontify | P0 |
| 163 | Tagline | — | P0 |
| 164 | Elevator pitch | — | P0 |
| 165 | Mission/vision statements | Frontify | P1 |
| 166 | Terminology preferences (preferred terms / avoid terms) | Frontify | P0 |
| 167 | Writing style guidelines | Frontify | P1 |
| 168 | Audience personas | — | P2 |
| 169 | Competitive positioning | — | P2 |
| 170 | Brand story/narrative | — | P2 |

### A18. Brand Kit Export

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 171 | ZIP archive generation | Brandfolder | P0 |
| 172 | All logos (SVG + PNG at 3 DPIs) in export | Brandfolder | P0 |
| 173 | Color palette reference (PDF + JSON + CSS) | Brandfolder | P0 |
| 174 | Font files (WOFF2) in export | Brandfolder | P0 |
| 175 | Icon library in export | — | P1 |
| 176 | Brand guidelines (PDF + HTML) in export | Brandfolder | P0 |
| 177 | Social media templates in export | Canva Brand Kit | P1 |
| 178 | OG image templates in export | — | P1 |
| 179 | Versioned exports (semver naming) | Brandfolder | P1 |
| 180 | README with usage instructions in export | — | P0 |

### A19. CLI Tool

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 181 | `setup` action — Interactive wizard (7+ steps) | — | P0 |
| 182 | `generate` action — Generate all assets | Style Dictionary | P0 |
| 183 | `generate tokens` — CSS custom properties only | Style Dictionary | P0 |
| 184 | `generate favicons` — Favicon suite only | RealFaviconGenerator | P0 |
| 185 | `generate og` — OG images only | Satori | P0 |
| 186 | `generate mobile` — Capacitor assets only | @capacitor/assets | P0 |
| 187 | `generate manifest` — PWA manifest only | — | P0 |
| 188 | `generate email` — Email templates only | MJML | P0 |
| 189 | `generate logos` — Logo raster variants only | — | P0 |
| 190 | `generate icons` — Icon sprite + individuals | — | P0 |
| 191 | `generate guidelines` — Brand docs only | — | P0 |
| 192 | `generate app-store` — App store assets only | — | P1 |
| 193 | `generate export` — ZIP brand kit | — | P0 |
| 194 | `validate` — WCAG + completeness + format checks | axe-core, Stark | P0 |
| 195 | `show` — Display current brand config summary | — | P0 |
| 196 | `doctor` — Health check (missing, outdated, issues) | — | P1 |

### A20. Validation & Quality

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 197 | WCAG AA contrast validation | axe-core | P0 |
| 198 | WCAG AAA contrast validation | axe-core | P1 |
| 199 | Asset completeness check (all required sizes present) | RealFaviconGenerator | P0 |
| 200 | Asset format validation (dimensions, format) | — | P0 |
| 201 | SVG syntax validation | — | P1 |
| 202 | Font file validation | — | P2 |
| 203 | Color format validation (valid OKLCH values) | — | P0 |
| 204 | Config schema validation | Valibot | P0 |
| 205 | Missing asset detection | — | P0 |
| 206 | Stale asset detection (config changed since generate) | Turborepo | P1 |
| 207 | Brand compliance scoring (% complete) | Brandfolder | P2 |

### A21. Integration Points

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 208 | Config access via getConfig() singleton | — | P0 |
| 209 | Product-create scaffolds brand overrides | — | P1 |
| 210 | Onboard wizard includes brand setup step | — | P2 |
| 211 | Overseer admin brand viewer/manager | Frontify | P2 |
| 212 | CI/CD brand validation step | — | P1 |

### A22. Accessibility

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 213 | WCAG 2.2 contrast requirements | axe-core | P0 |
| 214 | Color-blind safe palette validation | Stark | P2 |
| 215 | Focus indicator token generation | — | P1 |
| 216 | Reduced motion preferences (token support) | — | P1 |
| 217 | High contrast mode token set | — | P2 |

### A23. Performance

| # | Feature | Comparable Tool | Priority |
|---|---------|----------------|----------|
| 218 | Font subsetting (latin, latin-ext) | subfont | P2 |
| 219 | Image optimization (lossy + lossless) | Sharp | P0 |
| 220 | SVG optimization (SVGO) | SVGO | P0 |
| 221 | Font preloading hints generation (`<link rel="preload">`) | — | P1 |
| 222 | Critical CSS extraction for above-fold tokens | — | P2 |

---

**TOTAL: 222 features across 23 categories. ALL missing.**

---

## B. Proposed Config Schema

```typescript
// In resist.config.ts → company.branding
branding: {
  // === COLORS (P0) ===
  colors: {
    primary: 'oklch(55% 0.2 250)',      // Brand color
    secondary: 'oklch(50% 0.15 180)',   // Supporting color
    accent: 'oklch(65% 0.25 30)',       // Highlight/CTA
    // Auto-generated from above: shade scales (50-950), semantic (success/warning/error/info),
    // neutral, surface, text, border, dark mode variants, alpha variants
    overrides: {                         // Optional manual overrides
      success: 'oklch(55% 0.18 145)',
      // ...any auto-generated color can be overridden
    },
  },

  // === TYPOGRAPHY (P0) ===
  typography: {
    heading: {
      family: 'Inter',
      weights: [400, 500, 600, 700],
      source: 'google',                  // 'google' | 'local' | 'variable' | 'system'
    },
    body: {
      family: 'Inter',
      weights: [400, 500],
      source: 'google',
    },
    mono: {
      family: 'JetBrains Mono',
      weights: [400, 500],
      source: 'google',
    },
    scale: {
      base: 16,                          // px
      ratio: 1.25,                       // perfect fourth
      // Auto: xs, sm, base, lg, xl, 2xl, 3xl, 4xl
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // === LOGOS (P0) ===
  logos: {
    horizontal:      'assets/brand/logo-horizontal.svg',
    horizontalDark:  'assets/brand/logo-horizontal-dark.svg',
    vertical:        'assets/brand/logo-vertical.svg',
    verticalDark:    'assets/brand/logo-vertical-dark.svg',
    icon:            'assets/brand/logo-icon.svg',
    iconDark:        'assets/brand/logo-icon-dark.svg',
    wordmark:        'assets/brand/logo-wordmark.svg',
    wordmarkDark:    'assets/brand/logo-wordmark-dark.svg',
    monochrome:      'assets/brand/logo-monochrome.svg',
    monochromeDark:  'assets/brand/logo-monochrome-dark.svg',
    favicon:         'assets/brand/logo-favicon.svg',
    faviconDark:     'assets/brand/logo-favicon-dark.svg',
  },

  // === SPACING (P0) ===
  spacing: {
    base: 4,                             // px
    scale: [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24],
  },

  // === VISUAL (P0) ===
  radius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  shadows: {
    xs:  '0 1px 2px oklch(0% 0 0 / 5%)',
    sm:  '0 1px 3px oklch(0% 0 0 / 10%)',
    md:  '0 4px 6px oklch(0% 0 0 / 10%)',
    lg:  '0 10px 15px oklch(0% 0 0 / 10%)',
    xl:  '0 20px 25px oklch(0% 0 0 / 10%)',
    '2xl': '0 25px 50px oklch(0% 0 0 / 25%)',
  },
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    overlay: 1040,
    modal: 1050,
    popover: 1060,
    toast: 1070,
    tooltip: 1080,
  },

  // === MOTION (P0) ===
  motion: {
    duration: { fast: '100ms', normal: '200ms', slow: '400ms' },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in:      'cubic-bezier(0.4, 0, 1, 1)',
      out:     'cubic-bezier(0, 0, 0.2, 1)',
      inOut:   'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  // === BREAKPOINTS (P0) ===
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },

  // === ICONS (P0) ===
  icons: {
    library: 'lucide',                    // 'lucide' | 'phosphor' | 'heroicons' | 'custom'
    sizes: [16, 20, 24, 32, 48],
    strokeWidth: 2,
    customDir: 'assets/brand/icons/',     // For custom icons
  },

  // === OG IMAGES (P0) ===
  ogImages: {
    templates: {
      default:  { layout: 'centered',     showLogo: true, gradient: ['primary-600', 'secondary-800'] },
      blogPost: { layout: 'left-aligned', showAuthor: true, showDate: true },
      product:  { layout: 'hero',         showTagline: true },
    },
  },

  // === EMAIL (P0) ===
  email: {
    engine: 'mjml',                       // 'mjml' | 'svelte'
    templates: ['welcome', 'password-reset', 'email-verify', 'invoice', 'notification', 'trial-expiry', 'newsletter'],
    sender: { name: 'Company', email: 'hello@example.com' },
  },

  // === VOICE & COPY (P0) ===
  voice: {
    personality: ['professional', 'approachable', 'innovative'],
    tone: 'We speak directly and clearly. We avoid jargon unless our audience expects it.',
    tagline: 'Build better, faster.',
    elevatorPitch: 'resist.js is a...',
    mission: '',
    vision: '',
    terminology: {
      preferred: ['workspace', 'product', 'team member'],
      avoid: ['project', 'app', 'user'],
    },
    writingGuidelines: '',
  },

  // === EXPORT (P1) ===
  export: {
    formats: ['zip'],
    includeFonts: true,
    includeIcons: true,
    includeTemplates: true,
  },
}
```

**Per-product overrides:**
```typescript
products: [
  {
    id: 'overseer',
    name: 'Overseer',
    branding: {                          // Optional — inherits from company.branding
      colors: { primary: 'oklch(55% 0.2 280)' },
      logos: { icon: 'assets/brand/products/overseer/icon.svg' },
      tagline: 'Business operations, simplified.',
    },
  },
]
```

---

## C. Package & Output Structure

```
packages/shared/brand/
├── assets/                              # User-provided source files
│   ├── logo-horizontal.svg              # 12 logo SVGs
│   ├── logo-horizontal-dark.svg
│   ├── logo-vertical.svg
│   ├── logo-vertical-dark.svg
│   ├── logo-icon.svg
│   ├── logo-icon-dark.svg
│   ├── logo-wordmark.svg
│   ├── logo-wordmark-dark.svg
│   ├── logo-monochrome.svg
│   ├── logo-monochrome-dark.svg
│   ├── logo-favicon.svg
│   ├── logo-favicon-dark.svg
│   ├── icons/                           # Custom icons (optional)
│   └── products/                        # Per-product overrides
│       └── <product>/
│           └── icon.svg
├── fonts/                               # Self-hosted WOFF2
│   ├── inter-400.woff2
│   ├── inter-500.woff2
│   ├── inter-600.woff2
│   ├── inter-700.woff2
│   ├── jetbrains-mono-400.woff2
│   └── jetbrains-mono-500.woff2
├── generated/                           # ALL generated outputs (gitignored)
│   ├── tokens/
│   │   ├── tokens.css                   # CSS custom properties (:root + .dark)
│   │   ├── tokens.json                  # Machine-readable
│   │   └── fonts.css                    # @font-face declarations
│   ├── favicons/
│   │   ├── favicon.ico                  # Multi-size (16, 32, 48)
│   │   ├── favicon.svg
│   │   ├── apple-touch-icon-180.png
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   ├── icon-192-maskable.png
│   │   ├── icon-512-maskable.png
│   │   ├── mstile-150x150.png
│   │   ├── safari-pinned-tab.svg
│   │   ├── browserconfig.xml
│   │   └── meta-tags.html               # Copy-paste <head> snippet
│   ├── pwa/
│   │   └── manifest.webmanifest
│   ├── mobile/
│   │   ├── ios/                          # All iOS icons + splash screens
│   │   └── android/                      # Adaptive + legacy icons + splash
│   ├── og/
│   │   ├── default.png                   # 1200x630 fallback
│   │   └── templates/                    # Satori template definitions
│   ├── email/
│   │   ├── components/                   # MJML branded components
│   │   ├── templates/                    # MJML email templates
│   │   └── preview/                      # Rendered HTML previews
│   ├── logos/
│   │   ├── svg/                          # Optimized SVGs (SVGO)
│   │   ├── png-72dpi/                    # Web rasters
│   │   ├── png-300dpi/                   # Print rasters
│   │   └── png-600dpi/                   # High-detail print
│   ├── icons/
│   │   ├── sprite.svg                    # SVG sprite sheet
│   │   └── individual/                   # Per-icon SVGs
│   ├── app-store/
│   │   ├── ios/                          # 1024x1024, screenshot templates
│   │   └── android/                      # 512x512, feature graphic
│   ├── social/
│   │   ├── facebook-1200x630.png
│   │   ├── twitter-1200x630.png
│   │   ├── linkedin-1200x627.png
│   │   └── ...
│   ├── guidelines/
│   │   ├── brand-guidelines.md
│   │   ├── brand-portal.html             # Self-contained HTML page
│   │   ├── color-palette.svg
│   │   └── contrast-matrix.md
│   └── export/
│       └── brand-kit-v1.0.0.zip
├── src/                                  # Brand utilities (importable)
│   ├── index.ts                          # Public API
│   ├── colors.ts                         # OKLCH palette generation
│   ├── typography.ts                     # Type scale calculation
│   ├── tokens.ts                         # Token generation engine
│   └── contrast.ts                       # WCAG validation
├── package.json
└── README.md
```

---

## D. CLI Tool Architecture

```
packages/shared/utils/cli/src/tools/brand/
├── index.ts                              # createCommand() + action dispatch
├── flags/
│   ├── index.ts                          # Auto-discovery
│   ├── format.ts                         # --format (css|json|ts)
│   ├── output.ts                         # --output <dir>
│   ├── product.ts                        # --product <name>
│   ├── dry-run.ts                        # --dry-run
│   └── target.ts                         # --target (tokens|favicons|og|mobile|...)
├── locales/
│   ├── schema.ts                         # Valibot schema
│   └── locales/
│       └── en.ts                         # English strings
├── utils/
│   ├── generate/
│   │   ├── tokens.ts                     # CSS custom properties generation
│   │   ├── favicons.ts                   # Favicon suite (Sharp)
│   │   ├── og-images.ts                  # OG images (Satori + Sharp)
│   │   ├── mobile.ts                     # Capacitor icons + splash
│   │   ├── manifest.ts                   # PWA manifest.webmanifest
│   │   ├── email.ts                      # MJML email templates
│   │   ├── logos.ts                      # Logo raster variants
│   │   ├── icons.ts                      # Icon sprite + individuals
│   │   ├── guidelines.ts                 # Brand docs (md + html)
│   │   ├── app-store.ts                  # App store assets
│   │   ├── social.ts                     # Social media cards
│   │   └── export.ts                     # ZIP brand kit
│   ├── validate/
│   │   ├── contrast.ts                   # WCAG AA/AAA checking
│   │   ├── assets.ts                     # Size/format validation
│   │   └── completeness.ts              # Missing asset detection
│   ├── setup/
│   │   ├── wizard.ts                     # Interactive setup wizard
│   │   ├── colors.ts                     # Color picker step
│   │   ├── typography.ts                 # Font selection step
│   │   ├── logos.ts                      # Logo file selection step
│   │   └── preview.ts                    # Palette preview step
│   ├── colors/
│   │   ├── oklch.ts                      # OKLCH utilities + conversion
│   │   ├── palette.ts                    # Shade scale generation
│   │   ├── semantic.ts                   # Semantic color mapping
│   │   └── dark-mode.ts                  # Auto dark mode generation
│   ├── doctor.ts                         # Health check
│   └── show.ts                           # Display config
└── README.md
```

**Actions:**
```
pnpm tool brand setup                    # Interactive wizard
pnpm tool brand generate                 # Generate ALL assets
pnpm tool brand generate --target tokens # Just CSS tokens
pnpm tool brand generate --target favicons
pnpm tool brand generate --target og
pnpm tool brand generate --target mobile
pnpm tool brand generate --target manifest
pnpm tool brand generate --target email
pnpm tool brand generate --target logos
pnpm tool brand generate --target icons
pnpm tool brand generate --target guidelines
pnpm tool brand generate --target app-store
pnpm tool brand generate --target social
pnpm tool brand generate --target export
pnpm tool brand validate                 # WCAG + completeness + format
pnpm tool brand show                     # Display brand config summary
pnpm tool brand doctor                   # Health check
pnpm tool brand generate --product overseer  # Per-product generation
pnpm tool brand generate --dry-run       # Preview without writing
```

---

## E. Dependencies

| Package | Purpose | Used By |
|---------|---------|---------|
| `sharp` | Image processing (resize, convert, optimize) | favicons, logos, mobile, og, social, app-store |
| `@resvg/resvg-js` | SVG→PNG rendering (for Satori output) | og-images |
| `satori` | JSX→SVG for dynamic OG images | og-images |
| `svgo` | SVG optimization | logos, icons |
| `culori` | OKLCH color conversions + manipulation | colors, tokens, validate |
| `mjml` | Email template engine | email |
| `archiver` | ZIP file creation | export |
| `to-ico` | Create multi-size .ico files | favicons |
| `lucide-static` (or similar) | Icon SVG source files | icons |

---

## F. Implementation Phases

### Phase 1: Foundation (Config Schema + Package Skeleton)
- Create `packages/shared/brand/` package structure
- Create `packages/shared/schemas/core-config/src/branding.ts` — Valibot schemas
- Add `company.branding` and `products[].branding` to config schema
- Set up sensible defaults for all config values
- **Files**: branding.ts schema, brand/package.json, brand/src/index.ts

### Phase 2: Color Engine
- OKLCH palette generation (12-step shade scale from single color)
- Semantic color derivation (success/warning/error/info from hue presets)
- Dark mode auto-generation (OKLCH lightness inversion)
- Surface/text/border semantic mappings
- WCAG contrast calculation
- **Files**: brand/src/colors.ts, oklch.ts, palette.ts, semantic.ts, dark-mode.ts

### Phase 3: Typography + Spacing + Visual Tokens
- Modular type scale from base + ratio
- Spacing scale from base unit
- Radius, shadow, z-index, motion, breakpoint tokens
- @font-face CSS generation
- **Files**: brand/src/typography.ts, brand/src/tokens.ts

### Phase 4: Token Generation (CSS Custom Properties)
- Generate tokens.css with :root and .dark
- Generate tokens.json (machine-readable)
- Generate fonts.css (@font-face)
- Per-product token variants
- **Files**: generate/tokens.ts

### Phase 5: Logo Processing
- SVG normalization + SVGO optimization
- Raster generation via Sharp (72, 300, 600 DPI)
- PNG, JPG, WebP output
- **Files**: generate/logos.ts

### Phase 6: Favicon Generation
- Multi-size favicon.ico via to-ico
- Apple touch icons, Android Chrome, Microsoft tiles
- Safari pinned tab, maskable/monochrome PWA icons
- Meta tag HTML snippet, browserconfig.xml
- **Files**: generate/favicons.ts

### Phase 7: PWA Manifest
- manifest.webmanifest generation from config
- Icon array with purposes
- Per-product manifests
- **Files**: generate/manifest.ts

### Phase 8: Mobile Assets (Capacitor)
- iOS icons (all sizes, @1x/@2x/@3x)
- Android adaptive + legacy icons
- Splash screens (portrait + landscape, dark variants)
- **Files**: generate/mobile.ts

### Phase 9: OG Image Generation
- Satori template system
- Platform-specific sizes (Facebook, Twitter, LinkedIn, etc.)
- Custom font embedding
- Build-time generation
- **Files**: generate/og-images.ts, generate/social.ts

### Phase 10: Email Templates
- MJML branded components (header, footer, button, layout)
- Template suite (welcome, reset, verify, invoice, notification, trial, newsletter)
- HTML preview generation
- Per-product variants
- **Files**: generate/email.ts

### Phase 11: Icon Library
- Icon set download/configuration
- SVG sprite sheet generation
- Individual SVG export
- **Files**: generate/icons.ts

### Phase 12: Brand Guidelines
- Markdown document generation
- Self-contained HTML portal
- Color palette SVG visualization
- Contrast matrix
- **Files**: generate/guidelines.ts

### Phase 13: App Store Assets + Brand Kit Export
- iOS/Android store assets
- ZIP brand kit with all assets
- **Files**: generate/app-store.ts, generate/export.ts

### Phase 14: Validation System
- WCAG contrast validation
- Asset completeness checking
- Format/dimension validation
- Stale detection
- **Files**: validate/contrast.ts, validate/assets.ts, validate/completeness.ts

### Phase 15: CLI Tool (Actions + Wizard)
- createCommand() with action dispatch
- All generate/validate/show/doctor actions
- Interactive setup wizard (7 steps)
- Flags, locales, README
- **Files**: brand/index.ts, flags/*, locales/*, setup/wizard.ts

### Phase 16: Voice & Copy + Integration
- Brand voice config in schema
- Integration with product-create, onboard
- CI/CD validation hook
- **Files**: schema additions, integration points

---

## G. Verification Strategy

1. **Schema validation**: `pnpm tool config validate` confirms branding schema is valid
2. **Token generation**: Verify tokens.css has all expected custom properties for light + dark
3. **Favicon suite**: Verify all expected sizes/formats exist in generated/favicons/
4. **WCAG validation**: `pnpm tool brand validate` passes all contrast checks
5. **PWA manifest**: Validate manifest.webmanifest against W3C spec
6. **Mobile assets**: Verify Capacitor asset sizes match platform requirements
7. **OG images**: Verify Satori renders correct 1200x630 PNGs
8. **Email templates**: Verify MJML compiles to valid HTML
9. **Brand kit**: Verify ZIP contains all expected files with correct structure
10. **Unit tests**: Colocated .test.ts for color engine, type scale, token generation
11. **Dry run**: `pnpm tool brand generate --dry-run` lists all files without writing

---

## H. CHANGELOG

### Plan Created
- **Added**: Complete 222-feature gap analysis across 23 categories
- **Added**: Proposed config schema for `company.branding` with full structure
- **Added**: Per-product brand override system (colors + logo + name + tagline)
- **Added**: Package structure for `packages/shared/brand/`
- **Added**: CLI tool architecture for `pnpm tool brand` with 16 actions
- **Added**: 16-phase implementation plan
- **Added**: Dependency list (sharp, satori, svgo, culori, mjml, archiver, etc.)
- **Added**: Verification strategy (11 validation methods)
- **Decided**: OKLCH color space with auto palette generation
- **Decided**: Self-hosted WOFF2 fonts with @font-face generation
- **Decided**: MJML for email templates (not React Email — project uses Svelte)
- **Decided**: Dynamic OG images via Satori
- **Decided**: Centralized output in `packages/shared/brand/generated/`
- **Decided**: 12 SVG logo variants (6 types × light/dark)
- **Decided**: Full design token set (colors, typography, spacing, radius, shadows, motion, breakpoints, z-index)
- **Decided**: Markdown + HTML brand portal for guidelines documentation
- **Decided**: Full brand book including voice/tone/terminology
- **Decided**: Complete brand kit ZIP export
