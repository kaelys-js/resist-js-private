import * as v from "valibot";

/* ========================================================================== *
 *  SHARED ERROR MESSAGES
 * ========================================================================== */

const ERR = {
    color: "Invalid color format.",
    hex: "Expected a valid hex color (#RGB, #RRGGBB, #RGBA, #RRGGBBAA).",
    hexStrict: "Expected a strict 6-digit hex color (#RRGGBB).",
    rgb: "Expected an rgb() color (e.g., rgb(255, 0, 0)).",
    rgba: "Expected an rgba() color (e.g., rgba(255, 0, 0, 0.5)).",
    hsl: "Expected an hsl() color (e.g., hsl(120, 50%, 50%)).",
    hsla: "Expected an hsla() color (e.g., hsla(120, 50%, 50%, 0.5)).",
    oklch: "Expected an oklch() color (e.g., oklch(0.7 0.17 264)).",
    oklab: "Expected an oklab() color (e.g., oklab(0.5 -0.1 0.2)).",
    namedColor: "Expected a valid CSS named color.",
    coerce: "Expected a color or a convertable color value.",
};


/* ========================================================================== *
 *  REGEX PATTERNS (CSS4-compliant)
 * ========================================================================== */

const HEX_PATTERN =
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const HEX_STRICT_PATTERN = /^#[0-9a-fA-F]{6}$/;

const RGB_PATTERN =
    /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;

const RGBA_PATTERN =
    /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|0?\.\d+|1)\s*\)$/;

const HSL_PATTERN =
    /^hsl\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)$/;

const HSLA_PATTERN =
    /^hsla\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*,\s*(0|0?\.\d+|1)\s*\)$/;

const OKLCH_PATTERN =
    /^oklch\(\s*([0-9]*\.?[0-9]+)\s+([0-9]*\.?[0-9]+)\s+([0-9]*\.?[0-9]+)\s*\)$/;

const OKLAB_PATTERN =
    /^oklab\(\s*([0-9]*\.?[0-9]+)\s+([-+]?[0-9]*\.?[0-9]+)\s+([-+]?[0-9]*\.?[0-9]+)\s*\)$/;


/* ========================================================================== *
 *  CSS NAMED COLORS — W3C (140)
 * ========================================================================== */

const CSS_NAMED_COLORS = new Set(
    [
        "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque",
        "black", "blanchedalmond", "blue", "blueviolet", "brown", "burlywood", "cadetblue",
        "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk", "crimson", "cyan",
        "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkgreen", "darkgrey",
        "darkkhaki", "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred",
        "darksalmon", "darkseagreen", "darkslateblue", "darkslategray", "darkslategrey",
        "darkturquoise", "darkviolet", "deeppink", "deepskyblue", "dimgray", "dimgrey",
        "dodgerblue", "firebrick", "floralwhite", "forestgreen", "fuchsia", "gainsboro",
        "ghostwhite", "gold", "goldenrod", "gray", "green", "greenyellow", "grey", "honeydew",
        "hotpink", "indianred", "indigo", "ivory", "khaki", "lavender", "lavenderblush",
        "lawngreen", "lemonchiffon", "lightblue", "lightcoral", "lightcyan", "lightgoldenrodyellow",
        "lightgray", "lightgreen", "lightgrey", "lightpink", "lightsalmon", "lightseagreen",
        "lightskyblue", "lightslategray", "lightslategrey", "lightsteelblue", "lightyellow",
        "lime", "limegreen", "linen", "magenta", "maroon", "mediumaquamarine", "mediumblue",
        "mediumorchid", "mediumpurple", "mediumseagreen", "mediumslateblue", "mediumspringgreen",
        "mediumturquoise", "mediumvioletred", "midnightblue", "mintcream", "mistyrose", "moccasin",
        "navajowhite", "navy", "oldlace", "olive", "olivedrab", "orange", "orangered", "orchid",
        "palegoldenrod", "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff",
        "peru", "pink", "plum", "powderblue", "purple", "rebeccapurple", "red", "rosybrown",
        "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell", "sienna",
        "silver", "skyblue", "slateblue", "slategray", "slategrey", "snow", "springgreen",
        "steelblue", "tan", "teal", "thistle", "tomato", "turquoise", "violet", "wheat", "white",
        "whitesmoke", "yellow", "yellowgreen", "transparent"
    ]
);


/* ========================================================================== *
 *  STRICT COLOR SCHEMAS
 * ========================================================================== */

/** Strict hex color (#RGB, #RGBA, #RRGGBB, #RRGGBBAA). */
const colorHex = v.string(ERR.hex).pipe(
    v.regex(HEX_PATTERN, ERR.hex)
);

/** Output: string */
type ColorHex = v.InferOutput<typeof colorHex>;


/** Strict 6-digit hex (#RRGGBB). */
const colorHexStrict = v.string(ERR.hexStrict).pipe(
    v.regex(HEX_STRICT_PATTERN, ERR.hexStrict)
);

/** Output: string */
type ColorHexStrict = v.InferOutput<typeof colorHexStrict>;


/** rgb() pattern */
const colorRgb = v.string(ERR.rgb).pipe(v.regex(RGB_PATTERN, ERR.rgb));

/** Output: string */
type ColorRgb = v.InferOutput<typeof colorRgb>;


/** rgba() pattern */
const colorRgba = v.string(ERR.rgba).pipe(v.regex(RGBA_PATTERN, ERR.rgba));

/** Output: string */
type ColorRgba = v.InferOutput<typeof colorRgba>;


/** hsl() pattern */
const colorHsl = v.string(ERR.hsl).pipe(v.regex(HSL_PATTERN, ERR.hsl));

/** Output: string */
type ColorHsl = v.InferOutput<typeof colorHsl>;


/** hsla() pattern */
const colorHsla = v.string(ERR.hsla).pipe(v.regex(HSLA_PATTERN, ERR.hsla));

/** Output: string */
type ColorHsla = v.InferOutput<typeof colorHsla>;


/** oklch() pattern */
const colorOklch = v.string(ERR.oklch).pipe(
    v.regex(OKLCH_PATTERN, ERR.oklch)
);

/** Output: string */
type ColorOklch = v.InferOutput<typeof colorOklch>;


/** oklab() pattern */
const colorOklab = v.string(ERR.oklab).pipe(
    v.regex(OKLAB_PATTERN, ERR.oklab)
);

/** Output: string */
type ColorOklab = v.InferOutput<typeof colorOklab>;


/** CSS named colors */
const colorNamed = v.string(ERR.namedColor).pipe(
    v.check((c) => CSS_NAMED_COLORS.has(c.toLowerCase()), ERR.namedColor)
);

/** Output: string */
type ColorNamed = v.InferOutput<typeof colorNamed>;


/* ========================================================================== *
 *  UNIVERSAL COLOR COERCION (ANY → HEX LOWERCASE)
 * ========================================================================== */

/**
 * Coercion rules:
 *   - hex → normalized lowercase
 *   - rgb/rgba → unchanged string
 *   - hsl/hsla → unchanged string
 *   - oklab/oklch → unchanged string
 *   - named → lowercase
 */
const colorCoerce = v.coerce(
    v.string(ERR.color),
    (input: any) => {
        if (typeof input !== "string") {
            throw new Error(ERR.coerce);
        }

        const s = input.trim();

        // Normalize hex
        if (HEX_PATTERN.test(s)) return s.toLowerCase();

        // rgb/rgba
        if (RGB_PATTERN.test(s) || RGBA_PATTERN.test(s)) return s;

        // hsl/hsla
        if (HSL_PATTERN.test(s) || HSLA_PATTERN.test(s)) return s;

        // oklab/oklch
        if (OKLAB_PATTERN.test(s) || OKLCH_PATTERN.test(s)) return s;

        // named colors
        if (CSS_NAMED_COLORS.has(s.toLowerCase())) return s.toLowerCase();

        throw new Error(ERR.color);
    }
);

/** Output: canonical string color */
type ColorCoerce = v.InferOutput<typeof colorCoerce>;


/* ========================================================================== *
 *  COLOR SETS: ARRAY / MAP
 * ========================================================================== */

/** Array of valid color strings */
const colorArray = v.array(colorCoerce);

/** Output: string[] */
type ColorArray = v.InferOutput<typeof colorArray>;


/** Map of string keys to colors */
const colorMap = v.record(colorCoerce);

/** Output: Record<string, string> */
type ColorMap = v.InferOutput<typeof colorMap>;


/* ========================================================================== *
 *  COLLECTOR-STYLE COLOR FIELD
 * ========================================================================== */

const createColorField = (description: string) =>
    v
        .object(
            {
                description: v.string("Description must be a string."),
                value: colorCoerce,
            },
            "Color field must be an object with { description, value }."
        )
        .pipe(
            v.transform((i) => ({
                description,
                value: i.value,
            }))
        );

/** Output type for collector-style color field */
type ColorField<T extends string = string> = {
    description: T;
    value: string;
};


/* ========================================================================== *
 *  EXPORTS — ALWAYS AT THE END
 * ========================================================================== */

export {
    colorHex,
    colorHexStrict,
    colorRgb,
    colorRgba,
    colorHsl,
    colorHsla,
    colorOklch,
    colorOklab,
    colorNamed,
    colorCoerce,

    colorArray,
    colorMap,
    createColorField,

    type ColorHex,
    type ColorHexStrict,
    type ColorRgb,
    type ColorRgba,
    type ColorHsl,
    type ColorHsla,
    type ColorOklch,
    type ColorOklab,
    type ColorNamed,
    type ColorCoerce,
    type ColorArray,
    type ColorMap,
    type ColorField,
};

/*
Missing core ones:
	•	ColorHwb
	•	ColorLab
	•	ColorLch
	•	ColorSrgb
	•	ColorSrgbLinear
	•	ColorDisplayP3
	•	ColorProPhotoRgb
	•	ColorRec2020
	•	ColorA98Rgb
	•	ColorXYZ
	•	ColorXYZD50
	•	ColorXYZD65
	•	ColorDeviceCmyk (from CSS Color 5 draft)

⸻

2. Hardware / Rendering / Graphics Color Spaces

Required for game engines, GL/WebGL/WebGPU, video pipelines, ML image processing:
	•	ColorYPbPr
	•	ColorYCbCr
	•	ColorYUV
	•	ColorYIQ
	•	ColorHSV
	•	ColorHSB (alias of HSV)
	•	ColorHSI
	•	ColorCMYK
	•	ColorCMY
	•	ColorAdobeRgb
	•	ColorLinearRgb (not the same as sRGB linear)
	•	ColorGammaEncodedRgb

⸻

3. Perceptual & Advanced Color Science

For accessibility, perceptual uniformity, L*a*b*-based transforms, brand-systems:
	•	ColorJzAzBz
	•	ColorJzCzHz
	•	ColorICtCp
	•	ColorCAM16
	•	ColorCAM16UCS
	•	ColorDInucs
	•	ColorContrastRatio (WCAG)
	•	ColorDeltaE (accept numeric ΔE values)
	•	ColorContrastAA (boolean AA pass/fail)
	•	ColorContrastAAA (boolean AAA pass/fail)

⸻

4. CSS System Colors / UI Colors

These are “logical system colors” used in CSS for UI themes:
	•	ColorSystemUi
	•	ColorSystemButtonText
	•	ColorSystemButtonFace
	•	ColorSystemCanvas
	•	ColorSystemCanvasText
	•	ColorSystemField
	•	ColorSystemFieldText
	•	ColorSystemLinkText
	•	ColorSystemVisitedText
	•	ColorSystemActiveText
	•	ColorSystemGrayText
	•	ColorSystemHighlight
	•	ColorSystemHighlightText

⸻

5. Gradients & Patterns

These are NOT color spaces but are color-bearing constructs requiring schemas:
	•	ColorGradientLinear
	•	ColorGradientRadial
	•	ColorGradientConic
	•	ColorGradientRepeatingLinear
	•	ColorGradientRepeatingRadial
	•	ColorPatternUrl (SVG pattern refs)
	•	ColorPaintServer (CSS/SVG paint server: gradients, patterns, etc.)

⸻

6. Color Tokens / Semantic Colors

For design systems:
	•	ColorTokenName (semantic key: “primary.500”, “brand.accent”)
	•	ColorTokenReference (references another token)
	•	ColorSemantic (semantic category: success, warning, error, info)
	•	ColorSemanticExtended (expanded semantic categories)

⸻

7. Color Notation Variants

These are important because input formats vary:
	•	ColorHexShort (#abc)
	•	ColorHexLong (#aabbcc)
	•	ColorHexAlphaShort (#abcd)
	•	ColorHexAlphaLong (#aabbccdd)
	•	ColorFunction (rgb(), hsl(), hwb(), lab(), lch(), etc)
	•	ColorSpaceFunction (color(space r g b / a))

⸻

8. Color Blending / Composition

These can be schemas because they validate legal modes:
	•	ColorBlendMode (normal, multiply, screen, overlay, etc.)
	•	ColorInterpolationMethod (srgb, linearRGB, oklab, perceptual)
	•	ColorMixFunction (CSS color-mix syntax)

⸻

9. Coercion / Fallback / Optionality

Additional schema variants:
	•	ColorOptional
	•	ColorNullable
	•	ColorDefault (default color)
	•	ColorPresent
	•	ColorStrict
	•	ColorLoose
	•	ColorParseOnly (no normalization)

⸻

10. Metadata / Utility Color Schemas

Often needed:
	•	ColorAlphaOnly (0–1)
	•	ColorChannel0To255
	•	ColorChannel0To1
	•	ColorHueDeg (0–360)
	•	ColorLightnessPercent
	•	ColorSaturationPercent

*/