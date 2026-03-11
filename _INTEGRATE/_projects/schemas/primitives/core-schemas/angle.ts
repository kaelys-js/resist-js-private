/**
 * ANGLE-DEGREE SCHEMA
 *
 * SUMMARY  
 *   Validates a numeric angle expressed in **degrees** and converts it into a
 *   **complete multi-unit angle representation**, returning *all* supported
 *   angular units simultaneously:
 *
 *   ```
 *   {
 *     turn:    number;
 *     radian:  number;
 *     degree:  number;
 *     gradian: number;
 *     mil:     number;
 *   }
 *   ```
 *
 * PURPOSE  
 *   Provides a **lossless, fully-normalized angle descriptor** suitable for:
 *   - geometry engines  
 *   - graphics pipelines  
 *   - robotics  
 *   - physics simulation  
 *   - surveying  
 *   - analytics & telemetry  
 *   - interoperability across multi-unit systems  
 *
 *   This schema eliminates unit ambiguity by always returning *all* units,
 *   regardless of the input form.
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any finite numeric degree value  
 *   - negative values  
 *   - fractional degrees  
 *
 *   REJECTS:
 *   - non-number values  
 *   - NaN, Infinity, -Infinity  
 *
 * OUTPUT CONTRACT  
 *   - Produces an object containing **every supported angular unit**  
 *   - Does *not* clamp to 0–360° (preserves magnitude)  
 *
 * VALIDATION LOGIC  
 *   - Must be a number  
 *   - Must be finite  
 *   - Converts degrees into:
 *
 *     ```
 *     turn    = degree / 360
 *     radian  = degree * (π / 180)
 *     gradian = degree * (10/9)
 *     mil     = degree * (6400 / 360)   // NATO mils
 *     ```
 *
 * SEMANTIC NOTES  
 *   - Degrees are the most common human-facing unit, but not the safest
 *     computational unit. Multi-unit output provides the best of both worlds:
 *     human readability + machine precision + cross-system compatibility.
 *
 * EXAMPLES  
 *   ```
 *   parse(angleDegree, 180)
 *   // =>
 *   {
 *     turn:    0.5,
 *     radian:  3.141592653589793,
 *     degree:  180,
 *     gradian: 200,
 *     mil:     3200
 *   }
 *   ```
 */
export const angleDegree = v.number("Angle must be a finite degree value.")
    .pipe(
        v.custom(
            (n) => Number.isFinite(n),
            "Angle must not be NaN or Infinity."
        )
    )
    .pipe(
        v.transform((deg) => {
            const turn = deg / 360;
            const rad = deg * (Math.PI / 180);
            const grad = deg * (10 / 9);
            const mil = deg * (6400 / 360);

            return {
                turn,
                radian: rad,
                degree: deg,
                gradian: grad,
                mil
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE DEGREE (MULTI-UNIT)
*
* SUMMARY  
*   Represents the complete multi-unit angle structure produced by the
*   `angleDegree` schema.
*
* CONTRACT GUARANTEES  
*   - Contains *all* angular units  
*   - Fully deterministic normalization  
*   - Safe for downstream geometry, physics, robotics, and analytics  
*
* EXAMPLE  
*   ```
*   const a: AngleDegree = parse(angleDegree, 90);
*   // => { turn: 0.25, radian: 1.5708..., degree: 90, gradian: 100, mil: 1600 }
*   ```
*/
export type AngleDegree = v.InferOutput<typeof angleDegree>;



/**
 * ANGLE-RADIAN SCHEMA
 *
 * SUMMARY  
 *   Validates a numeric angle expressed in **radians** (the SI base unit of
 *   angular measure) and converts it into a **complete multi-unit angle
 *   representation**, returning *all* supported angular units simultaneously:
 *
 *   ```
 *   {
 *     turn:    number;
 *     radian:  number;
 *     degree:  number;
 *     gradian: number;
 *     mil:     number;
 *   }
 *   ```
 *
 * PURPOSE  
 *   Provides a high-precision ingestion pipeline for radians — the canonical
 *   unit used by:
 *   - trigonometry  
 *   - calculus  
 *   - physics simulation  
 *   - robotics  
 *   - control systems  
 *   - 3D engines  
 *   - geometry kernels  
 *
 *   Multi-unit output eliminates unit ambiguity and enables direct downstream
 *   interoperability across computational and UI layers.
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any finite numeric radian value  
 *   - negative radian values  
 *   - fractional radian values  
 *
 *   REJECTS:
 *   - non-number input  
 *   - NaN, Infinity, -Infinity  
 *
 * OUTPUT CONTRACT  
 *   - Produces a structure containing **all angular units** with full
 *     double-precision accuracy.  
 *   - Original radian value is preserved in `radian`.  
 *   - No clamping or wrapping — magnitude is preserved.  
 *
 * VALIDATION LOGIC  
 *   - Must be a number  
 *   - Must be finite  
 *
 *   Conversion formulas:
 *
 *   ```
 *   turn    = rad / (2π)
 *   degree  = rad * (180 / π)
 *   gradian = rad * (200 / π)
 *   mil     = degree * (6400 / 360)       // NATO mils
 *   ```
 *
 * SEMANTIC NOTES  
 *   - Radians are the most precise and mathematically fundamental angular
 *     representation. This multi-unit schema maintains full radian precision
 *     while exposing the angle in every useful domain-specific form.
 *
 * EXAMPLES  
 *   ```
 *   parse(angleRadian, Math.PI)
 *   // =>
 *   {
 *     turn:    0.5,
 *     radian:  3.141592653589793,
 *     degree:  180,
 *     gradian: 200,
 *     mil:     3200
 *   }
 *
 *   parse(angleRadian, Math.PI / 4)
 *   // =>
 *   {
 *     turn:    0.125,
 *     radian:  0.7853981633974483,
 *     degree:  45,
 *     gradian: 50,
 *     mil:     800
 *   }
 *   ```
 */
export const angleRadian = v.number("Angle must be a finite radian value.")
    .pipe(
        v.custom(
            (n) => Number.isFinite(n),
            "Angle must not be NaN or Infinity."
        )
    )
    .pipe(
        v.transform((rad) => {
            const turn = rad / (2 * Math.PI);
            const deg = rad * (180 / Math.PI);
            const grad = rad * (200 / Math.PI);
            const mil = deg * (6400 / 360);

            return {
                turn,
                radian: rad,
                degree: deg,
                gradian: grad,
                mil
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE RADIAN (MULTI-UNIT)
*
* SUMMARY  
*   Represents the complete multi-unit, mathematically normalized angle object
*   returned by `angleRadian`.
*
* CONTRACT GUARANTEES  
*   - Contains **all** angular unit representations  
*   - Fully deterministic and lossless  
*   - Radian accuracy is maintained exactly  
*
* EXAMPLE  
*   ```
*   const a: AngleRadian = parse(angleRadian, Math.PI / 2);
*   // => { turn: 0.25, radian: 1.5708..., degree: 90, gradian: 100, mil: 1600 }
*   ```
*/
export type AngleRadian = v.InferOutput<typeof angleRadian>;

/**
 * ANGLE-GRADIAN (GON) SCHEMA
 *
 * SUMMARY  
 *   Validates a numeric angle expressed in **gradians** (also called *gon* or
 *   *grade*) and converts it into a **complete multi-unit angle representation**,
 *   returning *all* supported angular units:
 *
 *   ```
 *   {
 *     turn:    number;
 *     radian:  number;
 *     degree:  number;
 *     gradian: number;
 *     mil:     number;
 *   }
 *   ```
 *
 * PURPOSE  
 *   Provides precise ingestion for the gradian system, widely used in:
 *   - surveying  
 *   - geodesy  
 *   - civil engineering  
 *   - European trigonometric calculators  
 *
 *   Multi-unit output ensures cross-compatibility with downstream systems
 *   expecting radians, degrees, turns, or mils.
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any finite numeric gradian value  
 *   - negative values  
 *   - fractional grades  
 *
 *   REJECTS:
 *   - non-number input  
 *   - NaN, Infinity, -Infinity  
 *
 * OUTPUT CONTRACT  
 *   - Returns all angular units simultaneously (full precision)  
 *   - Gradian input is preserved in `gradian`  
 *   - No clamping or modular reduction is applied  
 *
 * VALIDATION LOGIC  
 *   - Must be a finite number  
 *
 *   Conversion formulas:
 *
 *   ```
 *   turn    = grad / 400
 *   degree  = grad * (9 / 10)
 *   radian  = degree * (π / 180)
 *   mil     = degree * (6400 / 360)     // NATO mil
 *   ```
 *
 * SEMANTIC NOTES  
 *   - 400 gradians = 360 degrees = 2π radians = 1 turn  
 *   - Gradians divide the right angle into exactly 100 units, making it
 *     convenient for base-10 calculations.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleGradian, 200)
 *   // =>
 *   {
 *     turn:    0.5,
 *     radian:  3.141592653589793,
 *     degree:  180,
 *     gradian: 200,
 *     mil:     3200
 *   }
 *
 *   parse(angleGradian, 50)
 *   // =>
 *   {
 *     turn:    0.125,
 *     radian:  0.78539816339...,
 *     degree:  45,
 *     gradian: 50,
 *     mil:     800
 *   }
 *   ```
 */
export const angleGradian = v.number("Angle must be a finite gradian value.")
    .pipe(
        v.custom(
            (n) => Number.isFinite(n),
            "Angle must not be NaN or Infinity."
        )
    )
    .pipe(
        v.transform((grad) => {
            const turn = grad / 400;
            const degree = grad * (9 / 10);
            const radian = degree * (Math.PI / 180);
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian: grad,
                mil
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE GRADIAN (MULTI-UNIT)
*
* SUMMARY  
*   Represents the complete, multi-unit normalized angle object returned by
*   `angleGradian`.
*
* CONTRACT GUARANTEES  
*   - Contains all angle units  
*   - Preserves full double-precision accuracy  
*
* EXAMPLE  
*   ```
*   const a: AngleGradian = parse(angleGradian, 100);
*   // => turn: 0.25, radian: 1.5708..., degree: 90, gradian: 100, mil: 1600
*   ```
*/
export type AngleGradian = v.InferOutput<typeof angleGradian>;

/**
 * ANGLE-MIL / MRAD SCHEMA
 *
 * SUMMARY  
 *   Validates an angular value expressed in **mils** (or **milliradians**),
 *   supporting all major mil-based angular systems, and converts it into a
 *   **complete multi-unit angle descriptor**, returning *all* units:
 *
 *   ```
 *   {
 *     turn:    number;
 *     radian:  number;
 *     degree:  number;
 *     gradian: number;
 *     mil:     number;
 *   }
 *   ```
 *
 * PURPOSE  
 *   Provides a unified angle conversion gateway for mil-based systems used in:
 *   - artillery & ballistics (NATO mils)  
 *   - surveying (Swedish 6300 mil system)  
 *   - Soviet-era military systems (6000 mil)  
 *   - optics & marksmanship (SI milliradian / mrad)  
 *   - geodesy & targeting instrumentation  
 *
 *   This schema eliminates ambiguity by explicitly tagging the mil system and
 *   returning **all other angular units** simultaneously.
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - input object `{ value: number, system?: "NATO" | "SOVIET" | "SWEDISH" | "MRAD" }`  
 *   - number must be finite  
 *   - negative and fractional mil values allowed  
 *   - system defaults to `"NATO"`  
 *
 *   REJECTS:
 *   - non-number values for `value`  
 *   - NaN, Infinity, -Infinity  
 *   - invalid system identifiers  
 *
 * OUTPUT CONTRACT  
 *   Returns all units fully computed:
 *
 *   ```
 *   turn    = milValue / systemScale
 *   radian  = turn * 2π
 *   degree  = turn * 360
 *   gradian = turn * 400
 *   mil     = degree * (6400 / 360)    // NATO mil output representation
 *   ```
 *
 * VALIDATION LOGIC  
 *   System scale table:
 *
 *   ```
 *   NATO    = 6400
 *   SOVIET  = 6000
 *   SWEDISH = 6300
 *   MRAD    = 2π * 1000
 *   ```
 *
 * SEMANTIC NOTES  
 *   - “mil” is ambiguous globally; this schema formalizes the interpretation.  
 *   - Output “mil” always uses **NATO mils** for consistency unless the upstream
 *     system later demands multi-mil output (can be added).  
 *   - MRAD is technically milliradian, not “mil”, but widely used as such in
 *     optics; therefore supported.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleMil, { value: 3200 })               // NATO -> half turn
 *   parse(angleMil, { value: 3000, system: "SOVIET" })
 *   parse(angleMil, { value: 6300, system: "SWEDISH" })
 *   parse(angleMil, { value: 6283.185..., system: "MRAD" })
 *   ```
 */
export const angleMil = v.object(
    {
        value: v.number("Mil value must be a finite number.")
            .pipe(v.custom((n) => Number.isFinite(n), "Mil value must be finite.")),

        system: v.optional(
            v.enum(["NATO", "SOVIET", "SWEDISH", "MRAD"] as const, "Invalid mil system."),
            "NATO"
        )
    },
    "Angle mil input must be an object { value, system }."
).pipe(
    v.transform((input) => {
        // Determine scale based on system
        const scale =
            input.system === "SOVIET"
                ? 6000
                : input.system === "SWEDISH"
                    ? 6300
                    : input.system === "MRAD"
                        ? 2 * Math.PI * 1000
                        : 6400; // default = NATO

        // Convert mil (system-specific) → turn
        const turn = input.value / scale;

        // Turn → all standard units
        const radian = turn * (2 * Math.PI);
        const degree = turn * 360;
        const gradian = turn * 400;
        const mil = degree * (6400 / 360); // Standard NATO mil output

        return {
            turn,
            radian,
            degree,
            gradian,
            mil
        };
    })
);

/**
* OUTPUT TYPE — ANGLE MIL / MRAD (MULTI-UNIT)
*
* SUMMARY  
*   Represents the complete multi-unit normalized angle output returned by the
*   `angleMil` schema.
*
* CONTRACT GUARANTEES  
*   - Always contains all angular units  
*   - Normalized through the requested mil system  
*   - Fully deterministic and mathematically precise  
*
* EXAMPLE  
*   ```
*   const a: AngleMil =
*       parse(angleMil, { value: 3200, system: "NATO" });
*
*   // => { turn: 0.5, radian: 3.14159..., degree: 180, gradian: 200, mil: 3200 }
*   ```
*/
export type AngleMil = v.InferOutput<typeof angleMil>;

/**
 * ANGLE-REVOLUTION (TURN) SCHEMA
 *
 * SUMMARY  
 *   Validates a numeric angle expressed in **revolutions** (also known as
 *   *turns*, *cycles*, or *rotations*) and converts it into a **complete
 *   multi-unit angle representation**, returning *all* supported units:
 *
 *   ```
 *   {
 *     turn:    number;
 *     radian:  number;
 *     degree:  number;
 *     gradian: number;
 *     mil:     number;
 *   }
 *   ```
 *
 * PURPOSE  
 *   Provides canonical ingestion for rotation values used in:
 *   - animation engines  
 *   - robotics & control systems  
 *   - mathematical rotation models  
 *   - CSS transforms (rotate: Xturn)  
 *   - time-signal systems  
 *   - periodic wave analysis  
 *
 *   “Turn” is the **most mathematically fundamental** rotation unit because it
 *   corresponds directly to cycle-based periodicity.
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any finite numeric turn value  
 *   - negative and fractional rotations  
 *
 *   REJECTS:
 *   - non-number input  
 *   - NaN, Infinity, -Infinity  
 *
 * OUTPUT CONTRACT  
 *   Returns every angular unit in full precision:
 *
 *   ```
 *   radian  = turn * 2π
 *   degree  = turn * 360
 *   gradian = turn * 400
 *   mil     = degree * (6400 / 360)
 *   ```
 *
 * VALIDATION LOGIC  
 *   - Must be a number  
 *   - Must be finite  
 *
 * SEMANTIC NOTES  
 *   - Turns/rotations are often used as “domain-neutral” rotation units, making
 *     them ideal for animation, periodic math, and system normalization.  
 *   - This schema is the **core** of the entire angle pipeline since all other
 *     angle units ultimately convert into turns.
 *
 * EXAMPLES  
 *   ```
 *   parse(angleRevolution, 1)
 *   // => { turn: 1, radian: 6.283..., degree: 360, gradian: 400, mil: 6400 }
 *
 *   parse(angleRevolution, 0.5)
 *   // => { turn: 0.5, radian: 3.14159..., degree: 180, gradian: 200, mil: 3200 }
 *
 *   parse(angleRevolution, -0.25)
 *   // => { turn: -0.25, radian: -1.57079..., degree: -90, gradian: -100, mil: -1600 }
 *   ```
 */
export const angleRevolution = v.number("Angle must be a finite revolution value.")
    .pipe(
        v.custom(
            (n) => Number.isFinite(n),
            "Angle must not be NaN or Infinity."
        )
    )
    .pipe(
        v.transform((turn) => {
            const rad = turn * (2 * Math.PI);
            const deg = turn * 360;
            const grad = turn * 400;
            const mil = deg * (6400 / 360);

            return {
                turn,
                radian: rad,
                degree: deg,
                gradian: grad,
                mil
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE REVOLUTION / TURN (MULTI-UNIT)
*
* SUMMARY  
*   Represents the complete multi-unit normalized output structure returned by
*   `angleRevolution`.
*
* CONTRACT GUARANTEES  
*   - Contains all angular units  
*   - Fully normalized and mathematically precise  
*
* EXAMPLE  
*   ```
*   const a: AngleRevolution = parse(angleRevolution, 2);
*   // => turn: 2, degree: 720, radian: 12.566..., gradian: 800, mil: 12800
*   ```
*/
export type AngleRevolution = v.InferOutput<typeof angleRevolution>;

/**
 * ANGLE–HOUR-ANGLE SCHEMA
 *
 * SUMMARY  
 *   Validates an angle expressed in **hour angle units** (H), the astronomical
 *   angular measure used to represent the hour position of celestial objects
 *   relative to the local meridian. Converts the input into a **complete
 *   multi-unit angle representation**, returning *all* supported angular units:
 *
 *   ```
 *   {
 *     turn:    number;
 *     radian:  number;
 *     degree:  number;
 *     gradian: number;
 *     mil:     number;
 *   }
 *   ```
 *
 *   Conversion identity:
 *   - **1 hour = 15 degrees**
 *   - **24 hours = full rotation**
 *
 * PURPOSE  
 *   Provides canonical ingestion for hour-based astronomical coordinates used
 *   in:
 *   - sidereal time  
 *   - right ascension (RA) → hour angle transformations  
 *   - telescope mount control  
 *   - celestial tracking software  
 *   - planetarium systems  
 *   - orbital mechanics displays  
 *
 *   Normalizing to multi-unit output enables universal downstream logic without
 *   forcing consumers to convert hours → degrees → radians, etc.
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any finite numeric hour-angle value (can exceed 24h or be negative)  
 *   - fractional hours  
 *
 *   REJECTS:
 *   - non-number input  
 *   - NaN, Infinity, -Infinity  
 *
 * OUTPUT CONTRACT  
 *   Returns all angular units:
 *
 *   ```
 *   degree  = hour * 15
 *   turn    = hour / 24
 *   radian  = degree * (π / 180)
 *   gradian = degree * (10 / 9)
 *   mil     = degree * (6400 / 360)
 *   ```
 *
 * VALIDATION LOGIC  
 *   - Ensure numeric finite hour value  
 *
 * SEMANTIC NOTES  
 *   - Hour angle is periodic over 24 hours; this schema **does not clamp** or
 *     wrap the value because wrapping rules depend on astronomical context.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleHourAngle, 1)
 *   // => turn: 1/24, degree: 15, radian: 0.261799..., gradian: 16.666..., mil: 266.666...
 *
 *   parse(angleHourAngle, 6)
 *   // => quarter turn (90°)
 *
 *   parse(angleHourAngle, -3)
 *   // => negative rotation (−45°)
 *   ```
 */
export const angleHourAngle = v.number("Hour angle must be a finite number.")
    .pipe(
        v.custom(
            (n) => Number.isFinite(n),
            "Hour angle must not be NaN or Infinity."
        )
    )
    .pipe(
        v.transform((hour) => {
            const degree = hour * 15;
            const turn = hour / 24;
            const radian = degree * (Math.PI / 180);
            const gradian = degree * (10 / 9);
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE HOUR-ANGLE (MULTI-UNIT)
*
* SUMMARY  
*   Represents the complete, normalized, multi-unit output returned by
*   `angleHourAngle`.
*
* CONTRACT GUARANTEES  
*   - Contains all angular units  
*   - Fully determined by hour-angle input  
*   - Does not wrap, clamp, or alter magnitude  
*
* EXAMPLE  
*   ```
*   const a: AngleHourAngle = parse(angleHourAngle, 2);
*   // => 30°, 0.08333 turn, 0.523598 rad, 33.333 grad, 533.333 mil
*   ```
*/
export type AngleHourAngle = v.InferOutput<typeof angleHourAngle>;

/**
 * ANGLE–COMPASS-BEARING SCHEMA
 *
 * SUMMARY  
 *   Validates an angular value expressed as a **compass bearing** — a
 *   clockwise rotation from geographic North in the range [0°, 360°). Converts
 *   the bearing into a **complete multi-unit angle representation**, returning
 *   all supported angular units:
 *
 *   ```
 *   {
 *     turn:    number;
 *     radian:  number;
 *     degree:  number;
 *     gradian: number;
 *     mil:     number;
 *   }
 *   ```
 *
 * PURPOSE  
 *   Provides canonical handling for navigational bearings used in:
 *   - aviation  
 *   - maritime navigation  
 *   - surveying  
 *   - GIS & geospatial analysis  
 *   - compasses & heading instruments  
 *   - GPS, INS, IMU fusion systems  
 *
 *   Bearings are a **direction**, not a rotation amount**, and are therefore:
 *   - always wrapped to the range [0, 360)  
 *   - always expressed as clockwise-from-North  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any finite numeric value (bearing may exceed 360 or be negative)  
 *   - fractional degrees  
 *
 *   REJECTS:
 *   - non-number values  
 *   - NaN, Infinity, -Infinity  
 *
 * OUTPUT CONTRACT  
 *   Returns all units consistently:
 *
 *   ```
 *   degree  = normalized to [0, 360)
 *   turn    = degree / 360
 *   radian  = degree * (π / 180)
 *   gradian = degree * (10 / 9)
 *   mil     = degree * (6400 / 360)
 *   ```
 *
 * NORMALIZATION  
 *   Bearing input is normalized using modulo arithmetic:
 *
 *   ```
 *   deg = ((raw % 360) + 360) % 360
 *   ```
 *
 * SEMANTIC NOTES  
 *   - Bearings are directional, not mathematical rotations.  
 *   - Bearing normalization is mandatory and domain-correct.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleCompassBearing, 0)    // North
 *   parse(angleCompassBearing, 90)   // East
 *   parse(angleCompassBearing, 180)  // South
 *   parse(angleCompassBearing, 270)  // West
 *
 *   // Wrapping examples
 *   parse(angleCompassBearing, 450)  // => 90 (East)
 *   parse(angleCompassBearing, -45)  // => 315 (NW)
 *   ```
 */
export const angleCompassBearing = v.number("Bearing must be a finite number.")
    .pipe(
        v.custom(
            (n) => Number.isFinite(n),
            "Bearing must not be NaN or Infinity."
        )
    )
    .pipe(
        v.transform((raw) => {
            // Normalize into [0, 360)
            const degree = ((raw % 360) + 360) % 360;

            const turn = degree / 360;
            const radian = degree * (Math.PI / 180);
            const gradian = degree * (10 / 9);
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE COMPASS BEARING (MULTI-UNIT)
*
* SUMMARY  
*   Represents the normalized compass bearing as a fully-expanded angle object
*   containing all angular units.
*
* CONTRACT GUARANTEES  
*   - degree is always within [0, 360)  
*   - all other units follow from normalized degree  
*
* EXAMPLE  
*   ```
*   const b: AngleCompassBearing = parse(angleCompassBearing, -30);
*   // => degree: 330, turn: 0.9166..., radian: 5.759..., gradian: 366.66..., mil: 5866.66...
*   ```
*/
export type AngleCompassBearing = v.InferOutput<typeof angleCompassBearing>;

/**
 * ANGLE–QUADRANT-BEARING SCHEMA
 *
 * SUMMARY  
 *   Validates and parses a **surveyor-style quadrant bearing**, then converts
 *   the result into a **complete multi-unit angle representation**:
 *
 *   Quadrant format:
 *   ```
 *   NθE   NθW   SθE   SθW
 *   ```
 *   where θ ∈ [0°, 90°].
 *
 *   Output (all units):
 *   ```
 *   {
 *     turn:    number;
 *     radian:  number;
 *     degree:  number;   // absolute direction 0–360°
 *     gradian: number;
 *     mil:     number;
 *   }
 *   ```
 *
 * PURPOSE  
 *   Supports classical surveying bearings used in:
 *   - land surveying  
 *   - civil engineering  
 *   - cadastral mapping  
 *   - boundary description documents  
 *   - GIS systems handling quadrant notations  
 *
 * INPUT CONTRACT  
 *   ACCEPTS strings in strict quadrant format:
 *   - `N45E`, `N45.5E`, `S70W`, `N0W`, `S90E`, etc.
 *
 *   VALID FORM:
 *   ```
 *   ^([NS])(\d{1,2}(?:\.\d+)?)([EW])$
 *   ```
 *
 *   REJECTS:
 *   - values outside 0–90°  
 *   - malformed quadrant identifiers  
 *   - lowercase unless enforced separately  
 *
 * OUTPUT CONTRACT  
 *   - `degree` is the normalized **absolute compass bearing** in [0, 360)  
 *   - All other units follow from degree  
 *
 * CONVERSION RULES  
 *   Surveyor quadrant → absolute degrees:
 *
 *   ```
 *   NθE  => θ
 *   NθW  => 360 - θ
 *   SθE  => 180 - θ
 *   SθW  => 180 + θ
 *   ```
 *
 * VALIDATION LOGIC  
 *   - Verify quadrant format  
 *   - Parse cardinal directions  
 *   - Validate θ ∈ [0, 90]  
 *   - Convert to absolute degrees then to all units  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleQuadrantBearing, "N45E")
 *   // => 45°  (NE)
 *
 *   parse(angleQuadrantBearing, "S70W")
 *   // => 250° (WSW)
 *
 *   parse(angleQuadrantBearing, "N0W")
 *   // => 0°
 *
 *   parse(angleQuadrantBearing, "S90E")
 *   // => 90° (east)
 *   ```
 */
export const angleQuadrantBearing = v
    .string("Quadrant bearing must be a string.")
    .pipe(
        v.custom(
            (s) => /^[NS]\d{1,2}(?:\.\d+)?[EW]$/.test(s),
            "Invalid quadrant bearing format. Expected e.g. 'N45E', 'S70.5W'."
        )
    )
    .pipe(
        v.transform((s) => {
            const [, ns, degStr, ew] = s.match(/^([NS])(\d{1,2}(?:\.\d+)?)([EW])$/)!;

            const theta = parseFloat(degStr);

            if (theta < 0 || theta > 90) {
                throw new Error("Quadrant angle must be between 0° and 90°.");
            }

            // Convert to absolute bearing:
            let degree: number;

            if (ns === "N" && ew === "E") degree = theta;
            else if (ns === "N" && ew === "W") degree = 360 - theta;
            else if (ns === "S" && ew === "E") degree = 180 - theta;
            else degree = 180 + theta; // SθW

            // Convert degree -> all units
            const turn = degree / 360;
            const radian = degree * (Math.PI / 180);
            const gradian = degree * (10 / 9);
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE QUADRANT BEARING (MULTI-UNIT)
*
* SUMMARY  
*   Represents the absolute, normalized, multi-unit form of a quadrant-style
*   surveyor bearing (NE/NW/SE/SW).
*
* CONTRACT GUARANTEES  
*   - `degree` always lies within [0, 360)  
*   - All unit conversions are mathematically precise  
*
* EXAMPLE  
*   ```
*   const q: AngleQuadrantBearing =
*       parse(angleQuadrantBearing, "S70W");
*
*   // => { degree: 250, turn: 0.694..., radian: 4.363..., gradian: 277.77..., mil: 4444.44... }
*   ```
*/
export type AngleQuadrantBearing = v.InferOutput<
    typeof angleQuadrantBearing
>;

/**
 * ANGLE–BINARY-DEGREE (BAM / BRAD) SCHEMA
 *
 * SUMMARY  
 *   Validates an angle expressed in **binary angular measure (BAM)**, also
 *   known as **brads** or **binary degrees**, and converts it into a **complete
 *   multi-unit angle representation**, returning: turn, radian, degree, gradian,
 *   and mil.
 *
 *   Binary angular measure expresses a full rotation as:
 *
 *   ```
 *   resolution = 2^n   // e.g. 65536 for 16-bit BAM
 *   ```
 *
 *   Meaning:
 *   - 0         → 0°
 *   - res/4     → 90°
 *   - res/2     → 180°
 *   - 3res/4    → 270°
 *   - res       → 360° (wraps to 0)
 *
 * PURPOSE  
 *   BAM is widely used in:
 *   - embedded systems  
 *   - microcontrollers  
 *   - IMUs and heading sensors  
 *   - ECUs  
 *   - FPGA/ASIC trig lookup pipelines  
 *   - radar targeting  
 *   - fixed-point math  
 *
 *   Multi-unit output provides a unified, lossless representation for all
 *   downstream consumers (analytics, geometry engines, robotics, navigation).
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   ```
 *   {
 *     value: number;         // finite binary angle
 *     resolution?: number;   // optional, default = 65536
 *   }
 *   ```
 *
 *   - `value` may be any finite number  
 *   - resolution must be a positive integer ≥ 1  
 *
 *   REJECTS:
 *   - non-number angle  
 *   - non-finite angle  
 *   - invalid resolution (<= 0, NaN, Infinity)  
 *
 * OUTPUT CONTRACT  
 *   - Converts binary angle → turn  
 *   - Then turn → all units  
 *   - Absolute wrapping is *not* applied unless `value` exceeds resolution  
 *
 * VALIDATION LOGIC  
 *   ```
 *   turn = value / resolution
 *   degree  = turn * 360
 *   radian  = turn * 2π
 *   gradian = turn * 400
 *   mil     = degree * (6400 / 360)
 *   ```
 *
 * SEMANTIC NOTES  
 *   - BAM naturally wraps every `resolution` steps; schema does **not**
 *     auto-normalize unless desired later.  
 *   - This keeps fixed-point behaviors predictable.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleBinaryDegree, { value: 16384 })  // 90° on 65536-BAM
 *   parse(angleBinaryDegree, { value: 32768 })  // 180°
 *   parse(angleBinaryDegree, { value: 49152 })  // 270°
 *   parse(angleBinaryDegree, { value: 65536 })  // 360° (wrap)
 *   ```
 */
export const angleBinaryDegree = v.object(
    {
        value: v.number("Binary angle must be a finite number.")
            .pipe(v.custom((n) => Number.isFinite(n), "Binary angle must be finite.")),

        resolution: v.optional(
            v.number("Resolution must be a positive integer.")
                .pipe(v.custom((n) => Number.isInteger(n) && n > 0, "Resolution must be a positive integer.")),
            65536 // standard BAM-16 resolution
        )
    },
    "Binary degree input must be an object { value, resolution }."
).pipe(
    v.transform((input) => {
        const { value, resolution } = input;

        const turn = value / resolution; // raw turn fraction
        const degree = turn * 360;
        const radian = turn * (2 * Math.PI);
        const gradian = turn * 400;
        const mil = degree * (6400 / 360);

        return {
            turn,
            radian,
            degree,
            gradian,
            mil
        };
    })
);

/**
* OUTPUT TYPE — ANGLE BINARY DEGREE (MULTI-UNIT)
*
* SUMMARY  
*   Represents the complete multi-unit angle derived from a BAM (binary angular
*   measure) input.
*
* CONTRACT GUARANTEES  
*   - Derived from value/resolution  
*   - Includes all angular unit conversions  
*   - Deterministic and lossless  
*
* EXAMPLE  
*   ```
*   const a: AngleBinaryDegree =
*       parse(angleBinaryDegree, { value: 16384 });
*
*   // => 0.25 turn, 1.5708 rad, 90°, 100 grad, 1600 mil
*   ```
*/
export type AngleBinaryDegree = v.InferOutput<typeof angleBinaryDegree>;

/**
 * ANGLE–ARC-MINUTE (′) SCHEMA
 *
 * SUMMARY  
 *   Validates an angle expressed in **arc-minutes**, then converts it into a
 *   **complete multi-unit angle representation**, returning:
 *
 *     - turn  
 *     - radian  
 *     - degree  
 *     - gradian  
 *     - mil  
 *
 *   Arc-minutes are a high-precision sub-unit of degrees:
 *
 *     1 arc-minute = 1/60 degree  
 *                  = 1/21600 turn  
 *
 * PURPOSE  
 *   Used for:
 *   - astronomical coordinate systems (RA/Dec)  
 *   - telescope/camera field-of-view modeling  
 *   - geospatial calculations  
 *   - bearing/heading adjustments  
 *   - precision optical engineering  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - Any finite numeric arc-minute value  
 *     (may be fractional: e.g., 12.75′)
 *
 *   REJECTS:
 *   - non-number input  
 *   - NaN  
 *   - infinite values  
 *
 * OUTPUT CONTRACT  
 *   Produces a multi-unit angle object:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - `degree = arcMinute / 60`  
 *   - `turn = degree / 360`  
 *   - remaining units derived from turn  
 *
 * SEMANTIC NOTES  
 *   - Does not clamp or wrap values (wrapping is handled in a separate schema).  
 *   - Deliberately allows negative arc-minutes, used in astronomy and GIS.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleArcMinute, 60)      // = 1 degree
 *   parse(angleArcMinute, 30)      // = 0.5°
 *   parse(angleArcMinute, 5400)    // = 90°
 *   parse(angleArcMinute, -15)     // = -0.25°
 *   ```
 */
export const angleArcMinute = v.number("Arc-minute value must be a number.")
    .pipe(v.custom((n) => Number.isFinite(n), "Arc-minute value must be finite."))
    .pipe(
        v.transform((arcMinute) => {
            const degree = arcMinute / 60;
            const turn = degree / 360;
            const radian = turn * (2 * Math.PI);
            const gradian = turn * 400;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE ARC-MINUTE (′)
*
* SUMMARY  
*   Represents the full multi-unit angular result derived from an input value
*   expressed in arc-minutes.
*
* CONTRACT GUARANTEES  
*   - Always returns a normalized multi-unit object  
*   - Degree is computed as arcMinute / 60  
*   - No coercion or clamping applied  
*
* EXAMPLE  
*   ```
*   const ang: AngleArcMinute =
*       parse(angleArcMinute, 120);
*
*   // => 2 degrees, 0.005555... turns
*   ```
*/
export type AngleArcMinute = v.InferOutput<typeof angleArcMinute>;

/**
 * ANGLE–ARC-SECOND (″) SCHEMA
 *
 * SUMMARY  
 *   Validates an angle expressed in **arc-seconds**, then converts it into a
 *   **complete multi-unit angle representation**, returning:
 *
 *     - turn  
 *     - radian  
 *     - degree  
 *     - gradian  
 *     - mil  
 *
 *   Arc-seconds are an ultra-precise sub-unit of degrees:
 *
 *     1 arc-second = 1/3600 degree  
 *                  = 1/1296000 turn  
 *
 * PURPOSE  
 *   Supports high-precision domains:
 *   - celestial coordinate systems  
 *   - satellite motion & orbital mechanics  
 *   - geospatial triangulation  
 *   - lens calibration and alignment  
 *   - fine-grained bearing/heading adjustments  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - Any finite numeric arc-second value  
 *   - Fractional arc-seconds (e.g., 12.33″)
 *
 *   REJECTS:
 *   - Non-number input  
 *   - NaN  
 *   - Infinite values  
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - `degree = arcSecond / 3600`  
 *   - `turn = degree / 360`  
 *   - remaining units derived from turn  
 *
 * SEMANTIC NOTES  
 *   - Negative values allowed for celestial / GIS conventions  
 *   - Does NOT wrap or normalize (handled in separate schemas)  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleArcSecond, 3600)   // = 1 degree
 *   parse(angleArcSecond, 1800)   // = 0.5 degrees
 *   parse(angleArcSecond, -15)    // = -0.004166° 
 *   ```
 */
export const angleArcSecond = v.number("Arc-second value must be a number.")
    .pipe(v.custom((n) => Number.isFinite(n), "Arc-second value must be finite."))
    .pipe(
        v.transform((arcSecond) => {
            const degree = arcSecond / 3600;
            const turn = degree / 360;
            const radian = turn * (2 * Math.PI);
            const gradian = turn * 400;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE ARC-SECOND (″)
*
* SUMMARY  
*   Multi-unit angular representation produced from an input expressed in
*   arc-seconds.
*
* CONTRACT GUARANTEES  
*   - Always normalized to turn/radian/degree/gradian/mil  
*   - No coercion  
*   - No clamping or wrapping  
*
* EXAMPLE  
*   ```
*   const ang: AngleArcSecond =
*       parse(angleArcSecond, 7200);
*
*   // => 2 degrees
*   ```
*/
export type AngleArcSecond = v.InferOutput<typeof angleArcSecond>;

/**
 * ANGLE–TURN / REVOLUTION SCHEMA
 *
 * SUMMARY  
 *   Validates an angle expressed in **turns** (full revolutions) and converts
 *   it into the canonical **multi-unit angle representation**, including:
 *
 *     - turn  
 *     - radian  
 *     - degree  
 *     - gradian  
 *     - mil  
 *
 * PURPOSE  
 *   Used extensively in:
 *   - rotation math  
 *   - animation & interpolation  
 *   - servo/robotic control loops  
 *   - orbital angle calculations  
 *   - trigonometric algorithms  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any finite number representing **turns**
 *     (fractional allowed: 0.25 = 90°, 1.5 = 540°)
 *
 *   REJECTS:
 *   - non-number input  
 *   - NaN  
 *   - infinite values  
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - radian  = turn * 2π  
 *   - degree  = turn * 360  
 *   - gradian = turn * 400  
 *   - mil     = degree * (6400 / 360)  
 *
 * SEMANTIC NOTES  
 *   - No range normalization is applied (wrapping is separate).  
 *   - Negative turns allowed (robotics, servo inversions, physics).  
 *   - Turns are best-practice for parametric rotation.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleTurn, 1)      // 360°
 *   parse(angleTurn, 0.5)    // 180°
 *   parse(angleTurn, 0.25)   // 90°
 *   parse(angleTurn, -1.25)  // -450°
 *   ```
 */
export const angleTurn = v.number("Turn value must be a number.")
    .pipe(v.custom((n) => Number.isFinite(n), "Turn value must be finite."))
    .pipe(
        v.transform((turn) => {
            const radian = turn * (2 * Math.PI);
            const degree = turn * 360;
            const gradian = turn * 400;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE TURN / REVOLUTION
*
* SUMMARY  
*   Represents the complete multi-unit angular representation derived from an
*   angle expressed in **turns**.
*
* CONTRACT GUARANTEES  
*   - All units computed precisely from turn  
*   - No coercion, no wrapping  
*
* EXAMPLE  
*   ```
*   const ang: AngleTurn =
*       parse(angleTurn, 0.25);
*   // => 90° 
*   ```
*/
export type AngleTurn = v.InferOutput<typeof angleTurn>;

/**
 * ANGLE–GRADIAN (gon) SCHEMA
 *
 * SUMMARY  
 *   Validates an angle expressed in **gradians** (also called "gon" or "grad")
 *   and converts it into the canonical **multi-unit angle representation**
 *   including:
 *
 *     - turn  
 *     - radian  
 *     - degree  
 *     - gradian  
 *     - mil  
 *
 * PURPOSE  
 *   Gradians are heavily used in:
 *   - surveying and leveling instruments  
 *   - cadastral and civil engineering workflows  
 *   - trigonometric systems that prefer decimal subdivisions  
 *   - educational contexts (Europe, parts of Asia)  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any finite numeric gradian value (fractional allowed)
 *
 *   REJECTS:
 *   - non-number values  
 *   - NaN  
 *   - infinite values  
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - turn   = grad / 400  
 *   - degree = turn * 360  
 *   - radian = turn * 2π  
 *   - mil    = degree * (6400 / 360)  
 *
 * SEMANTIC NOTES  
 *   - Negative values allowed (surveying corrections, GIS projections)  
 *   - No normalizing (handled in separate normalization schemas)  
 *   - gradians are base-10 friendly for certain workflows  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleGradian, 100)     // = 0.25 turns = 90°
 *   parse(angleGradian, 50)      // = 45°
 *   parse(angleGradian, -200)    // = -180°
 *   ```
 */
export const angleGradian = v.number("Gradian value must be a number.")
    .pipe(v.custom((n) => Number.isFinite(n), "Gradian value must be finite."))
    .pipe(
        v.transform((gradian) => {
            const turn = gradian / 400;
            const radian = turn * (2 * Math.PI);
            const degree = turn * 360;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE GRADIAN (gon)
*
* SUMMARY  
*   Represents the full multi-unit angular conversion derived from a gradian
*   input value.
*
* CONTRACT GUARANTEES  
*   - All units derived exactly from the gradian → turn conversion  
*   - No normalization or coercion applied  
*
* EXAMPLE  
*   ```
*   const ang: AngleGradian =
*       parse(angleGradian, 200);
*
*   // => 0.5 turns (180°)
*   ```
*/
export type AngleGradian = v.InferOutput<typeof angleGradian>;

/**
 * ANGLE–MIL (NATO, 6400 PER TURN) SCHEMA
 *
 * SUMMARY  
 *   Validates an angle expressed in **NATO mils**, then converts it into the
 *   canonical **multi-unit angle representation**, including:
 *
 *     - turn  
 *     - radian  
 *     - degree  
 *     - gradian  
 *     - mil  
 *
 *   NATO mils subdivide a full turn into **6400 units**, providing a simple
 *   linear mapping between small angular deflections and real-world targeting.
 *
 * PURPOSE  
 *   Used in:
 *   - ballistic fire-control systems  
 *   - tank & artillery optics  
 *   - precision aiming & deflection calculations  
 *   - military range estimation  
 *   - surveying and azimuth corrections  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any finite numeric mil value (fractional allowed)
 *
 *   REJECTS:
 *   - non-number input  
 *   - NaN  
 *   - infinite values  
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;        // identical to input (NATO mil)
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - `turn   = mil / 6400`  
 *   - `degree = turn * 360`  
 *   - `radian = turn * 2π`  
 *   - `gradian = turn * 400`  
 *
 * SEMANTIC NOTES  
 *   - Negative mil values allowed for corrections and deflection offsets  
 *   - Does NOT normalize or wrap (handled in angleNormalize schema)  
 *   - Uses strictly the 6400/NATO definition  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleMil, 1600)     // = 0.25 turns = 90°
 *   parse(angleMil, 800)      // = 45°
 *   parse(angleMil, -3200)    // = -180°
 *   ```
 */
export const angleMil = v.number("Mil value must be a number.")
    .pipe(v.custom((n) => Number.isFinite(n), "Mil value must be finite."))
    .pipe(
        v.transform((mil) => {
            const turn = mil / 6400;
            const radian = turn * (2 * Math.PI);
            const degree = turn * 360;
            const gradian = turn * 400;

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE MIL (NATO)
*
* SUMMARY  
*   Represents the multi-unit angular conversion derived from an angle
*   expressed in NATO mils (6400 per revolution).
*
* CONTRACT GUARANTEES  
*   - No wrapping or coercion  
*   - Always returns a full multi-unit object  
*
* EXAMPLE  
*   ```
*   const ang: AngleMil =
*       parse(angleMil, 3200);  // half-turn (180°)
*   ```
*/
export type AngleMil = v.InferOutput<typeof angleMil>;

/**
 * ANGLE–BINARY-DEGREE (8-BIT) SCHEMA
 *
 * SUMMARY  
 *   Validates an **8-bit angular value (0–255)** that represents a full
 *   360-degree rotation, then converts it into the canonical **multi-unit angle
 *   representation**:
 *
 *     - turn  
 *     - radian  
 *     - degree  
 *     - gradian  
 *     - mil  
 *
 *   This scheme is found in:
 *   - microcontrollers  
 *   - robotics & heading sensors  
 *   - embedded rangefinders  
 *   - digital compasses  
 *   - FPGA-based trig lookup tables  
 *
 * PURPOSE  
 *   Provides precise interpretation of legacy or ultra-lightweight angular
 *   encodings used in hardware where full floating-point angles are too costly.
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - integer from 0 to 255 inclusive  
 *   - floats allowed but must be finite and within [0,255]
 *
 *   REJECTS:
 *   - values < 0 or > 255  
 *   - non-numeric input  
 *   - NaN or infinite  
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - degree = (binary / 256) * 360  
 *   - turn   = degree / 360  
 *   - radian = turn * 2π  
 *   - gradian = turn * 400  
 *   - mil = degree * (6400 / 360)  
 *
 * SEMANTIC NOTES  
 *   - Value implicitly wraps at 255 → 0, matching 8-bit overflow behavior  
 *   - No normalization beyond range validation  
 *   - Hardware systems often operate with integer steps of 1.40625 degrees  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleBinaryDegree, 0)     // = 0°
 *   parse(angleBinaryDegree, 64)    // = 90°
 *   parse(angleBinaryDegree, 128)   // = 180°
 *   parse(angleBinaryDegree, 255)   // ≈ 358.59375°
 *   ```
 */
export const angleBinaryDegree = v.number("Binary degree must be a number.")
    .pipe(
        v.custom(
            (n) => Number.isFinite(n),
            "Binary degree must be finite."
        )
    )
    .pipe(
        v.custom(
            (n) => n >= 0 && n <= 255,
            "Binary degree must be between 0 and 255."
        )
    )
    .pipe(
        v.transform((binary) => {
            const degree = (binary / 256) * 360;
            const turn = degree / 360;
            const radian = turn * (2 * Math.PI);
            const gradian = turn * 400;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE BINARY DEGREE (8-BIT)
*
* SUMMARY  
*   Represents the full multi-unit angular conversion derived from a binary
*   8-bit angular value in the range [0,255].
*
* CONTRACT GUARANTEES  
*   - Always bounded within a full rotation  
*   - Always returns all units (turn, radian, degree, gradian, mil)  
*
* EXAMPLE  
*   ```
*   const ang: AngleBinaryDegree =
*       parse(angleBinaryDegree, 128);  // 180°
*   ```
*/
export type AngleBinaryDegree = v.InferOutput<typeof angleBinaryDegree>;

/**
 * ANGLE–PERCENT-GRADE SCHEMA
 *
 * SUMMARY  
 *   Validates a **percent grade slope** value and converts it into a full
 *   **multi-unit angle representation**:
 *
 *     - turn  
 *     - radian  
 *     - degree  
 *     - gradian  
 *     - mil  
 *
 *   Percent grade is a real-world slope measure:
 *     10% grade  → ~5.710°  
 *     100% grade → 45°  
 *     200% grade → ~63.435°  
 *
 * PURPOSE  
 *   Used extensively in:
 *   - road engineering & max allowable incline  
 *   - wheelchair-accessible ramp validation  
 *   - railroad grade safety  
 *   - hiking trail difficulty analytics  
 *   - GIS terrain modeling & erosion studies  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any finite numeric percentage  
 *   - positive or negative (downhill grade)  
 *   - fractional (e.g., 12.5%)
 *
 *   REJECTS:
 *   - non-number input  
 *   - NaN  
 *   - infinite values  
 *
 * OUTPUT CONTRACT  
 *   Returns the multi-unit object:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - slope = percent / 100  
 *   - radian = atan(slope)  
 *   - degree = radian * (180 / π)  
 *   - turn = degree / 360  
 *   - gradian = turn * 400  
 *   - mil = degree * (6400 / 360)  
 *
 * SEMANTIC NOTES  
 *   - Very steep grades (e.g., 300–500%) are valid in math/GIS contexts  
 *   - Does NOT clamp or normalize  
 *
 * EXAMPLES  
 *   ```
 *   parse(anglePercentGrade, 0)      // = 0°
 *   parse(anglePercentGrade, 10)     // ≈ 5.71°
 *   parse(anglePercentGrade, 100)    // = 45°
 *   parse(anglePercentGrade, -50)    // ≈ -26.565°
 *   ```
 */
export const anglePercentGrade = v.number("Percent grade must be a number.")
    .pipe(
        v.custom(
            (n) => Number.isFinite(n),
            "Percent grade must be finite."
        )
    )
    .pipe(
        v.transform((percent) => {
            const slope = percent / 100;           // rise/run
            const radian = Math.atan(slope);       // fundamental slope→angle
            const degree = radian * (180 / Math.PI);
            const turn = degree / 360;
            const gradian = turn * 400;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE PERCENT GRADE
*
* SUMMARY  
*   Represents a full multi-unit angular output derived from a slope expressed
*   in percent grade.
*
* CONTRACT GUARANTEES  
*   - Always valid multi-unit angle  
*   - Uses atan(percent/100) for mapping  
*
* EXAMPLE  
*   ```
*   const ang: AnglePercentGrade =
*       parse(anglePercentGrade, 12.5);
*   // ~7.125°
*   ```
*/
export type AnglePercentGrade = v.InferOutput<typeof anglePercentGrade>;

/**
 * ANGLE–SLOPE-RATIO SCHEMA (RISE/RUN)
 *
 * SUMMARY  
 *   Validates a **slope ratio** (rise ÷ run) and converts it into the canonical
 *   **multi-unit angle representation**, including:
 *
 *     - turn  
 *     - radian  
 *     - degree  
 *     - gradian  
 *     - mil  
 *
 *   This is the pure mathematical definition of slope:
 *
 *       slope = rise / run
 *       angle = arctan(slope)
 *
 * PURPOSE  
 *   Used extensively in:
 *   - roof pitch systems (e.g., 4/12 → 18.435°)  
 *   - ramp engineering  
 *   - mechanical incline modeling  
 *   - physics (inclined plane forces)  
 *   - robotics trajectory planning  
 *   - GIS terrain modeling  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any finite number representing slope ratio  
 *     (e.g., 0.25, 1, -0.5, 4/12, etc.)
 *
 *   REJECTS:
 *   - non-number  
 *   - NaN  
 *   - +∞ or -∞  
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - radian = atan(slopeRatio)  
 *   - degree = radian * (180 / π)  
 *   - turn = degree / 360  
 *   - gradian = turn * 400  
 *   - mil = degree * (6400 / 360)  
 *
 * SPECIAL CASES  
 *   - Vertical slope (run → 0) is **infinite**, but disallowed here.  
 *     Vertical angle = 90° is represented separately.  
 *
 * SEMANTIC NOTES  
 *   - Negative ratios allowed, representing downhill slope.  
 *   - Does NOT clamp or wrap.  
 *   - Does NOT validate against specific engineering code limits.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleSlopeRatio, 0)       // = 0°
 *   parse(angleSlopeRatio, 1)       // = 45°
 *   parse(angleSlopeRatio, 0.25)    // ≈ 14.036°
 *   parse(angleSlopeRatio, -0.5)    // ≈ -26.565°
 *   ```
 */
export const angleSlopeRatio = v.number("Slope ratio must be a number.")
    .pipe(
        v.custom(
            (n) => Number.isFinite(n),
            "Slope ratio must be finite (vertical infinite slope is not allowed here)."
        )
    )
    .pipe(
        v.transform((slope) => {
            const radian = Math.atan(slope);
            const degree = radian * (180 / Math.PI);
            const turn = degree / 360;
            const gradian = turn * 400;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE SLOPE RATIO
*
* SUMMARY  
*   Represents the full multi-unit angular representation derived from a slope
*   ratio (rise ÷ run).
*
* EXAMPLE  
*   ```
*   const ang: AngleSlopeRatio =
*       parse(angleSlopeRatio, 1);  // 45°
*   ```
*/
export type AngleSlopeRatio = v.InferOutput<typeof angleSlopeRatio>;

/**
 * ANGLE–ROOF-PITCH SCHEMA (RISE PER 12 UNITS RUN)
 *
 * SUMMARY  
 *   Validates a **roof pitch value**, representing "rise per 12 units of run",
 *   then converts it into the canonical **multi-unit angle representation**:
 *
 *     - turn  
 *     - radian  
 *     - degree  
 *     - gradian  
 *     - mil  
 *
 *   Roof pitch is a universal standard in North American construction,
 *   architectural drawings, roofing tables, and structural engineering.
 *
 * PURPOSE  
 *   Converts roof pitch (rise/12) into full angular form for:
 *   - load calculations  
 *   - drainage modeling  
 *   - truss/rafter layout  
 *   - solar panel mounting  
 *   - ventilation and clearance planning  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any finite numeric rise value (e.g., 4, 7, 12, 0, -4, 18.5)
 *   - fractional rises allowed
 *
 *   REJECTS:
 *   - NaN  
 *   - infinite values  
 *   - non-numeric input  
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - slopeRatio = rise / 12  
 *   - radian = atan(slopeRatio)  
 *   - degree = radian * (180 / π)  
 *   - turn = degree / 360  
 *   - gradian = turn * 400  
 *   - mil = degree * (6400 / 360)  
 *
 * SEMANTIC NOTES  
 *   - Negative rise is allowed (inverted slope for modeling)  
 *   - No normalization or clamping applied  
 *   - Strictly uses 12-unit run (North American standard)
 *
 * EXAMPLES  
 *   ```
 *   parse(angleRoofPitch, 4)     // ≈ 18.435°
 *   parse(angleRoofPitch, 7)     // ≈ 30.256°
 *   parse(angleRoofPitch, 12)    // = 45°
 *   parse(angleRoofPitch, -6)    // ≈ -26.565°
 *   ```
 */
export const angleRoofPitch = v.number("Roof pitch rise value must be a number.")
    .pipe(
        v.custom(
            (n) => Number.isFinite(n),
            "Roof pitch rise value must be finite."
        )
    )
    .pipe(
        v.transform((rise) => {
            const slopeRatio = rise / 12;           // rise per fixed 12-unit run
            const radian = Math.atan(slopeRatio);
            const degree = radian * (180 / Math.PI);
            const turn = degree / 360;
            const gradian = turn * 400;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE ROOF PITCH (RISE PER 12)
*
* SUMMARY  
*   Represents a full multi-unit angle derived from a roof pitch "rise per 12"
*   measurement.
*
* EXAMPLE  
*   ```
*   const ang: AngleRoofPitch =
*       parse(angleRoofPitch, 8);   // ≈ 33.690°
*   ```
*/
export type AngleRoofPitch = v.InferOutput<typeof angleRoofPitch>;

/**
 * ANGLE–SLOPE RISE-PER-UNIT-RUN SCHEMA
 *
 * SUMMARY  
 *   Validates a slope described by a **rise** and a **run**, producing a full
 *   **multi-unit angle representation**:
 *
 *     - turn  
 *     - radian  
 *     - degree  
 *     - gradian  
 *     - mil  
 *
 *   This schema generalizes roof pitch, percent grade, and ratio-based slope
 *   models by accepting any arbitrary rise and run values.
 *
 * PURPOSE  
 *   Used for universal slope → angle conversions in:
 *   - roadway / ramp / bridge design  
 *   - architecture & structural engineering  
 *   - piping & fluid flow incline  
 *   - CNC, machine tooling & robotics  
 *   - GIS & terrain slope analysis  
 *   - geotechnical modeling and soil stability  
 *   - physics (forces on inclined planes)  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - rise: any finite number (positive, negative, or zero)
 *   - run:  any finite **positive** number
 *
 *   REJECTS:
 *   - rise = NaN or ±∞  
 *   - run  = NaN or ±∞  
 *   - run ≤ 0 (vertical or backward run is invalid here)
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - slope = rise / run  
 *   - radian = atan(slope)  
 *   - degree = radian * (180 / π)  
 *   - turn = degree / 360  
 *   - gradian = turn * 400  
 *   - mil = degree * (6400 / 360)  
 *
 * SEMANTIC NOTES  
 *   - Vertical slope (run → 0) is explicitly disallowed for safety, but you may
 *     define a dedicated "vertical angle" schema later.
 *   - Negative rise allowed (downward grade).
 *   - No post-normalization applied.
 *
 * EXAMPLES  
 *   ```
 *   parse(angleSlopeRiseRun, { rise: 4, run: 12 })     // standard 4/12 pitch
 *   parse(angleSlopeRiseRun, { rise: 1, run: 1 })      // 1:1 slope → 45°
 *   parse(angleSlopeRiseRun, { rise: -1, run: 2 })     // downhill slope
 *   parse(angleSlopeRiseRun, { rise: 0, run: 5 })      // 0°
 *   ```
 */
export const angleSlopeRiseRun = v.object(
    {
        rise: v.number("Rise must be a number.")
            .pipe(v.custom((n) => Number.isFinite(n), "Rise must be finite.")),

        run: v.number("Run must be a number.")
            .pipe(v.custom((n) => Number.isFinite(n), "Run must be finite."))
            .pipe(v.custom((n) => n > 0, "Run must be positive.")),
    },
    "Slope must be described by { rise, run }."
).pipe(
    v.transform(({ rise, run }) => {
        const slope = rise / run;
        const radian = Math.atan(slope);
        const degree = radian * (180 / Math.PI);
        const turn = degree / 360;
        const gradian = turn * 400;
        const mil = degree * (6400 / 360);

        return {
            turn,
            radian,
            degree,
            gradian,
            mil,
        };
    })
);

/**
* OUTPUT TYPE — ANGLE SLOPE RISE-PER-UNIT-RUN
*
* SUMMARY  
*   Represents the converted multi-unit angular form of an arbitrary
*   rise/run-defined slope.
*
* EXAMPLE  
*   ```
*   const ang: AngleSlopeRiseRun =
*       parse(angleSlopeRiseRun, { rise: 7, run: 12 });
*   // ≈ 30.256°
*   ```
*/
export type AngleSlopeRiseRun = v.InferOutput<typeof angleSlopeRiseRun>;

/**
 * ANGLE–TANGENT-VALUE SCHEMA (tan θ → angle)
 *
 * SUMMARY  
 *   Validates a **tangent value** (the ratio of opposite/adjacent in a right
 *   triangle) and converts it into the canonical **multi-unit angle
 *   representation**:
 *
 *     - turn  
 *     - radian  
 *     - degree  
 *     - gradian  
 *     - mil  
 *
 *   This schema performs:
 *
 *       angleRadians = atan(tanValue)
 *
 * PURPOSE  
 *   Tangent-based angle derivations appear in:
 *   - trig functions & geometry solvers  
 *   - robotic slope controls  
 *   - physics rotating-coordinate systems  
 *   - force-vector projections  
 *   - optics (incident/refraction models)  
 *   - nav & heading adjustments  
 *   - terrain slope extraction  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any finite number  
 *     (tan θ is unbounded; values may be very large)
 *
 *   REJECTS:
 *   - non-number input  
 *   - NaN  
 *   - infinite values  
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - radian  = atan(tanValue)  
 *   - degree  = radian * (180 / π)  
 *   - turn    = degree / 360  
 *   - gradian = turn * 400  
 *   - mil     = degree * (6400 / 360)  
 *
 * SEMANTIC NOTES  
 *   - Tangent discontinuities (undefined at ±90°) translate into ±∞, which
 *     this schema disallows; we may add a dedicated tangent-infinite schema.  
 *   - Negative tangent values yield negative angles.  
 *   - Does not clamp or normalize angle ranges.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleTangent, 0)        // = 0°
 *   parse(angleTangent, 1)        // ≈ 45°
 *   parse(angleTangent, -1)       // ≈ -45°
 *   parse(angleTangent, 5.671)    // ≈ 80°
 *
 *   // invalid (infinite tangent → undefined)
 *   parse(angleTangent, Infinity)  // rejected
 *   ```
 */
export const angleTangent = v.number("Tangent value must be a number.")
    .pipe(
        v.custom(
            (n) => Number.isFinite(n),
            "Tangent value must be finite."
        )
    )
    .pipe(
        v.transform((tanValue) => {
            const radian = Math.atan(tanValue);
            const degree = radian * (180 / Math.PI);
            const turn = degree / 360;
            const gradian = turn * 400;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE TANGENT VALUE
*
* SUMMARY  
*   Represents the complete multi-unit angle derived from an input tangent
*   value (opposite/adjacent).
*
* EXAMPLE  
*   ```
*   const ang: AngleTangent =
*       parse(angleTangent, Math.sqrt(3));   // 60°
*   ```
*/
export type AngleTangent = v.InferOutput<typeof angleTangent>;

/**
 * ANGLE–COTANGENT-VALUE SCHEMA (cot θ → angle)
 *
 * SUMMARY  
 *   Validates a **cotangent value** (adjacent ÷ opposite) and converts it into
 *   the canonical **multi-unit angle representation**:
 *
 *     - turn  
 *     - radian  
 *     - degree  
 *     - gradian  
 *     - mil  
 *
 *   Cotangent is the reciprocal of tangent:
 *
 *       cot = 1 / tan
 *       θ   = arctan(1 / cot)
 *
 * PURPOSE  
 *   Supports calculations in:
 *   - trig solvers & triangle reconstruction  
 *   - surveying / land measurement  
 *   - mechanical linkage analysis  
 *   - robotics IK algorithms  
 *   - physics (torque/force angle decomposition)  
 *   - navigation & heading adjustments  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any finite number  
 *
 *   REJECTS:
 *   - cot = 0   (undefined angle → ±90° vertical; handled separately)  
 *   - non-number input  
 *   - NaN  
 *   - infinite values  
 *
 * OUTPUT CONTRACT  
 *   Returns a multi-unit angle:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - slope = 1 / cot  
 *   - radian = atan(slope)  
 *   - degree = radian * (180 / π)  
 *   - turn = degree / 360  
 *   - gradian = turn * 400  
 *   - mil = degree * (6400 / 360)  
 *
 * SEMANTIC NOTES  
 *   - cot > 0 → angle in (0°, 90°)  
 *   - cot < 0 → angle in (-90°, 0°)  
 *   - cot = 0 → vertical → undefined here  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleCotangent, 1)      // = 45°
 *   parse(angleCotangent, 0.5)    // ≈ 63.435°
 *   parse(angleCotangent, -1)     // = -45°
 *
 *   // invalid
 *   parse(angleCotangent, 0)      // rejected
 *   ```
 */
export const angleCotangent = v.number("Cotangent value must be a number.")
    .pipe(
        v.custom(
            (n) => Number.isFinite(n),
            "Cotangent value must be finite."
        )
    )
    .pipe(
        v.custom(
            (n) => n !== 0,
            "Cotangent of zero is undefined (vertical angle ±90°)."
        )
    )
    .pipe(
        v.transform((cotValue) => {
            const slope = 1 / cotValue;
            const radian = Math.atan(slope);
            const degree = radian * (180 / Math.PI);
            const turn = degree / 360;
            const gradian = turn * 400;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE COTANGENT VALUE
*
* SUMMARY  
*   Represents the full multi-unit angular representation derived from a
*   cotangent input value.
*
* EXAMPLE  
*   ```
*   const ang: AngleCotangent =
*       parse(angleCotangent, 1);   // 45°
*   ```
*/
export type AngleCotangent = v.InferOutput<typeof angleCotangent>;

/**
 * ANGLE–SECANT-VALUE SCHEMA (sec θ → angle)
 *
 * SUMMARY  
 *   Validates a **secant value** (1/cos θ) and converts it into the canonical
 *   **multi-unit angle representation**:
 *
 *     - turn
 *     - radian
 *     - degree
 *     - gradian
 *     - mil
 *
 *   Secant is defined for:
 *       sec θ ∈ (-∞, -1] ∪ [1, +∞)
 *
 *   since |cos θ| ≤ 1.
 *
 * PURPOSE  
 *   Supports angle derivation in:
 *   - geometric solvers
 *   - wave propagation models
 *   - optics & refraction
 *   - trigonometric analysis
 *   - robotics & mechanical systems
 *   - DSP & signal phase evaluation
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any finite number where |sec| ≥ 1
 *
 *   REJECTS:
 *   - |sec| < 1 (impossible for real angles)
 *   - NaN
 *   - infinite values
 *   - non-number input
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - cosθ = 1 / sec
 *   - radian = arccos(cosθ)
 *   - degree = radian * (180 / π)
 *   - turn   = degree / 360
 *   - gradian = turn * 400
 *   - mil = degree * (6400 / 360)
 *
 * SEMANTIC NOTES  
 *   - sec > 1  → angle in (0°, 90°)
 *   - sec < -1 → angle in (90°, 180°)
 *   - sec = ±1 → angle = 0° or 180°
 *
 * EXAMPLES  
 *   ```
 *   parse(angleSecant, 1)        // 0°
 *   parse(angleSecant, 2)        // ≈ 60°
 *   parse(angleSecant, -2)       // ≈ 120°
 *
 *   // invalid
 *   parse(angleSecant, 0.5)      // rejected (|sec| < 1)
 *   ```
 */
export const angleSecant = v.number("Secant value must be a number.")
    .pipe(
        v.custom(
            (n) => Number.isFinite(n),
            "Secant value must be finite."
        )
    )
    .pipe(
        v.custom(
            (n) => Math.abs(n) >= 1,
            "Secant must satisfy |sec| ≥ 1 (domain restriction)."
        )
    )
    .pipe(
        v.transform((secValue) => {
            // cos = 1/sec
            const cos = 1 / secValue;
            const radian = Math.acos(cos);
            const degree = radian * (180 / Math.PI);
            const turn = degree / 360;
            const gradian = turn * 400;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
 * OUTPUT TYPE — ANGLE SECANT VALUE
 *
 * SUMMARY  
 *   Represents the canonical multi-unit angular representation produced from a
 *   secant (1/cos θ) input value.
 *
 * EXAMPLE  
 *   ```
 *   const ang: AngleSecant =
 *       parse(angleSecant, 2);   // ≈ 60°
 *   ```
 */
export type AngleSecant = v.InferOutput<typeof angleSecant>;

/**
 * ANGLE–COSECANT-VALUE SCHEMA (csc θ → angle)
 *
 * SUMMARY  
 *   Validates a **cosecant value** (1/sin θ) and converts it into the
 *   canonical **multi-unit angle representation**, returning:
 *
 *     - turn
 *     - radian
 *     - degree
 *     - gradian
 *     - mil
 *
 *   Cosecant is the reciprocal of sine and is defined for:
 *
 *       csc θ ∈ (-∞, -1] ∪ [1, +∞)
 *
 * PURPOSE  
 *   This schema is used in:
 *   - trigonometric solvers
 *   - geometry and triangle reconstruction
 *   - wave propagation physics
 *   - optical path calculations
 *   - mechanical systems and lever analysis
 *   - DSP, phasors, and frequency-domain analysis
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any finite number where |csc| ≥ 1
 *
 *   REJECTS:
 *   - |csc| < 1 (impossible for real angles)
 *   - NaN
 *   - infinite values
 *   - non-number input
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - sin = 1 / csc
 *   - radian = arcsin(sin)
 *   - degree = radian * (180 / π)
 *   - turn   = degree / 360
 *   - gradian = turn * 400
 *   - mil = degree * (6400 / 360)
 *
 * SEMANTIC NOTES  
 *   - csc > 1  → angle in (0°, 90°)
 *   - csc < -1 → angle in (-90°, 0°)
 *   - csc = ±1 → ±90°
 *
 * EXAMPLES  
 *   ```
 *   parse(angleCosecant, 1)       // = 90°
 *   parse(angleCosecant, 2)       // ≈ 30°
 *   parse(angleCosecant, -2)      // ≈ -30°
 *
 *   // invalid
 *   parse(angleCosecant, 0.5);    // rejected (|csc| < 1)
 *   ```
 */
export const angleCosecant = v.number("Cosecant value must be a number.")
    .pipe(
        v.custom(
            (n) => Number.isFinite(n),
            "Cosecant value must be finite."
        )
    )
    .pipe(
        v.custom(
            (n) => Math.abs(n) >= 1,
            "Cosecant must satisfy |csc| ≥ 1 (domain restriction)."
        )
    )
    .pipe(
        v.transform((cscValue) => {
            const sin = 1 / cscValue;
            const radian = Math.asin(sin);
            const degree = radian * (180 / Math.PI);
            const turn = degree / 360;
            const gradian = turn * 400;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
 * OUTPUT TYPE — ANGLE COSECANT VALUE
 *
 * SUMMARY  
 *   Represents the canonical multi-unit angular representation computed from a
 *   cosecant (1/sin θ) input value.
 *
 * EXAMPLE  
 *   ```
 *   const ang: AngleCosecant =
 *       parse(angleCosecant, 2);   // ≈ 30°
 *   ```
 */
export type AngleCosecant = v.InferOutput<typeof angleCosecant>;

/**
 * ANGLE–NORMALIZED SCHEMA (0° ≤ θ < 360°)
 *
 * SUMMARY  
 *   Normalizes any input angle (in degrees, radians, or turns depending on
 *   caller convention) into a **canonical 0°–360° interval** and returns the
 *   full multi-unit representation:
 *
 *      - turn
 *      - radian
 *      - degree
 *      - gradian
 *      - mil
 *
 *   This schema ensures consistent downstream behavior for all angular math,
 *   geometry systems, trigonometric models, physics engines, robotics, and
 *   navigation algorithms that require a **wrapped, non-negative angle**.
 *
 * PURPOSE  
 *   Provides normalized angular output for:
 *   - rotation systems  
 *   - robotics & servo control  
 *   - geometry kernels  
 *   - physics simulations  
 *   - astronomical calculations  
 *   - navigation/orientation engines  
 *   - trilateration & triangulation  
 *   - DSP & waveform phase correction  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any finite number (interpreted as **degrees**)  
 *     (You can override later with angle-mode coercers if needed.)
 *
 *   REJECTS:
 *   - NaN  
 *   - infinite values  
 *   - non-number inputs  
 *
 * OUTPUT CONTRACT  
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;   // always 0 ≤ degree < 360
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - degreeRaw = input  
 *   - degreeNorm = ((degreeRaw % 360) + 360) % 360  
 *   - radian = degreeNorm * (π / 180)  
 *   - turn = degreeNorm / 360  
 *   - gradian = turn * 400  
 *   - mil = degreeNorm * (6400 / 360)  
 *
 * SEMANTIC NOTES  
 *   - Guarantees canonical non-negative angular range.  
 *   - Eliminates discontinuities from wrap-around behavior.  
 *   - Essential for algorithms requiring monotonic angle comparison.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleNormalized,   30)   // 30°
 *   parse(angleNormalized, -330)   // 30°
 *   parse(angleNormalized,  390)   // 30°
 *   parse(angleNormalized, 1080)   // 0°
 *
 *   parse(angleNormalized, -45)    // 315°
 *   ```
 */
export const angleNormalized = v.number("Angle must be a number.")
    .pipe(v.custom((n) => Number.isFinite(n), "Angle must be finite."))
    .pipe(
        v.transform((degreeRaw) => {
            // Normalize to 0°–360°
            const degree =
                ((degreeRaw % 360) + 360) % 360;

            const radian = degree * (Math.PI / 180);
            const turn = degree / 360;
            const gradian = turn * 400;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE NORMALIZED (0°–360°)
*
* SUMMARY  
*   Represents the canonical non-negative angular normalization result from
*   the `angleNormalized` schema.
*
* EXAMPLE  
*   ```
*   const a: AngleNormalized =
*       parse(angleNormalized, -45);  // 315°
*   ```
*/
export type AngleNormalized = v.InferOutput<typeof angleNormalized>;

/**
 * ANGLE–BIDIRECTIONAL NORMALIZED SCHEMA (−180° ≤ θ < +180°)
 *
 * SUMMARY  
 *   Normalizes any input angle (interpreted as degrees unless pre-coerced)
 *   into the **signed, symmetric angular range**:
 *
 *       -180° ≤ θ < +180°
 *
 *   This representation is critical in systems requiring *directional*
 *   rotation semantics instead of raw wrap-around degrees.
 *
 *   The output provides the full multi-unit representation:
 *     - turn  
 *     - radian  
 *     - degree (signed, normalized)  
 *     - gradian  
 *     - mil  
 *
 * PURPOSE  
 *   Provides a canonical signed angle for:
 *   - robotics heading control  
 *   - PID steering loops  
 *   - vector orientation math  
 *   - aerospace yaw/pitch/roll normalizing  
 *   - navigation bearing deltas  
 *   - motion interpolation  
 *   - angular error computation (“shortest rotation path”)  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *     - any finite number (default unit = degrees)
 *
 *   REJECTS:
 *     - NaN  
 *     - ±Infinity  
 *     - non-number inputs  
 *
 * OUTPUT CONTRACT  
 *   Returns the normalized multi-unit structure:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;    // always -180 ≤ degree < 180
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * NORMALIZATION LOGIC  
 *   - First normalize to [0°, 360°):
 *       d0 = ((raw % 360) + 360) % 360
 *   - Then fold into signed interval:
 *       d = (d0 >= 180) ? d0 - 360 : d0
 *
 *   Conversions:
 *     radian  = d * (π / 180)
 *     turn    = d / 360
 *     gradian = turn * 400
 *     mil     = d * (6400 / 360)
 *
 * SEMANTIC NOTES  
 *   - Ensures “shortest path” rotation direction semantics.  
 *   - Perfect for steering algorithms that must choose CW vs CCW.  
 *   - Removes discontinuities when crossing the 180°/−180° boundary.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleBidirectionalNormalized,  190)   // -170°
 *   parse(angleBidirectionalNormalized, -200)   // 160°
 *   parse(angleBidirectionalNormalized,  720)   // 0°
 *   parse(angleBidirectionalNormalized, -540)   // 180 → folded to -180°
 *   ```
 */
export const angleBidirectionalNormalized = v
    .number("Angle must be a numeric value.")
    .pipe(v.custom((x) => Number.isFinite(x), "Angle must be a finite number."))
    .pipe(
        v.transform((raw) => {
            // Normalize to 0°–360°
            const d0 = ((raw % 360) + 360) % 360;

            // Convert to signed [-180°, +180°)
            const degree = d0 >= 180 ? d0 - 360 : d0;

            const radian = degree * (Math.PI / 180);
            const turn = degree / 360;
            const gradian = turn * 400;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — BIDIRECTIONAL NORMALIZED ANGLE
*
* SUMMARY  
*   Represents the fully normalized signed angle within the canonical interval
*   −180° ≤ θ < +180°, including multi-unit representations for downstream
*   geometric, navigational, and robotic systems.
*
* EXAMPLE  
*   ```
*   const θ: AngleBidirectionalNormalized =
*     parse(angleBidirectionalNormalized, -200);  // 160°
*   ```
*/
export type AngleBidirectionalNormalized =
    v.InferOutput<typeof angleBidirectionalNormalized>;

/**
 * ANGLE–ABSOLUTE SCHEMA (|θ|, UNLIMITED RANGE)
 *
 * SUMMARY  
 *   Produces the **absolute magnitude** of any input angle (interpreted as
 *   degrees), preserving unlimited range. Unlike the normalized schemas, this
 *   one does **NOT** wrap or fold the angle — it simply returns the absolute
 *   magnitude and converts it into every supported angular unit.
 *
 *   Returned structure includes:
 *     - turn  
 *     - radian  
 *     - degree  
 *     - gradian  
 *     - mil  
 *
 * PURPOSE  
 *   The absolute angle is useful for:
 *   - magnitude comparisons  
 *   - total rotation counts  
 *   - absolute angular deltas  
 *   - cumulative rotation modeling  
 *   - physics torque calculations  
 *   - statistical aggregation (mean absolute deviation of angles)  
 *   - robotics sweep path computation  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *     - any finite number (treated as degrees)
 *
 *   REJECTS:
 *     - NaN  
 *     - Infinity or -Infinity  
 *     - non-number inputs  
 *
 * OUTPUT CONTRACT  
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;     // absolute magnitude
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - degreeAbs = Math.abs(raw)
 *   - radian  = degreeAbs * (π / 180)
 *   - turn    = degreeAbs / 360
 *   - gradian = turn * 400
 *   - mil     = degreeAbs * (6400 / 360)
 *
 * SEMANTIC NOTES  
 *   - Does NOT normalize into any bounded interval.  
 *   - Does NOT preserve sign — this is intentional.  
 *   - Represents “rotational magnitude only” with unlimited domain.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleAbsolute, -30)
 *   // → degree = 30
 *
 *   parse(angleAbsolute, 450)
 *   // → degree = 450 (no wrap)
 *
 *   parse(angleAbsolute, -1080)
 *   // → degree = 1080
 *   ```
 */
export const angleAbsolute = v
    .number("Angle must be a numeric value.")
    .pipe(v.custom((n) => Number.isFinite(n), "Angle must be finite."))
    .pipe(
        v.transform((raw) => {
            const degree = Math.abs(raw);
            const radian = degree * (Math.PI / 180);
            const turn = degree / 360;
            const gradian = turn * 400;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE ABSOLUTE
*
* SUMMARY  
*   Represents the absolute magnitude of an angle in degrees, including
*   canonical conversions into radians, turns, gradians, and mils.
*
* EXAMPLE  
*   ```
*   const a: AngleAbsolute =
*     parse(angleAbsolute, -450);   // → 450°
*   ```
*/
export type AngleAbsolute = v.InferOutput<typeof angleAbsolute>;

/**
 * ANGLE–ABSOLUTE-NORMALIZED SCHEMA (0° ≤ |θ| < 360°)
 *
 * SUMMARY  
 *   Computes the **absolute magnitude** of any input angle (interpreted
 *   as degrees), then **normalizes** that magnitude into the canonical
 *   non-negative interval:
 *
 *       0° ≤ |θ| < 360°
 *
 *   The schema returns a full multi-unit angular representation:
 *     - turn  
 *     - radian  
 *     - degree (absolute & normalized)  
 *     - gradian  
 *     - mil  
 *
 * PURPOSE  
 *   Useful in geometry, physics, and navigation contexts where only the
 *   magnitude of angular displacement matters, *but continuous wrap-around
 *   must be eliminated*, including:
 *   - rotational magnitude comparison  
 *   - motion planning  
 *   - cyclic angular domain normalization  
 *   - periodic oscillation/trigonometry contexts  
 *   - sensor fusion / IMU magnitude constraints  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *     - any finite number representing degrees
 *
 *   REJECTS:
 *     - NaN  
 *     - infinite inputs  
 *     - non-numeric values  
 *
 * OUTPUT CONTRACT  
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;   // normalized |θ| in [0, 360)
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * NORMALIZATION LOGIC  
 *   - absVal = Math.abs(raw)
 *   - degree = ((absVal % 360) + 360) % 360  
 *
 *   Conversions:
 *     radian  = degree * (π / 180)
 *     turn    = degree / 360
 *     gradian = turn * 400
 *     mil     = degree * (6400 / 360)
 *
 * SEMANTIC NOTES  
 *   - Sign is intentionally ignored (absolute magnitude only).  
 *   - Eliminates arbitrary rotation-counts beyond 360°.  
 *   - Produces a canonical magnitude domain for harmonics/trigonometry.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleAbsoluteNormalized, -30)     // → 30°
 *   parse(angleAbsoluteNormalized, 390)     // → 30°
 *   parse(angleAbsoluteNormalized, -1080)   // → 0°
 *   parse(angleAbsoluteNormalized, 720)     // → 0°
 *   ```
 */
export const angleAbsoluteNormalized = v
    .number("Angle must be numeric.")
    .pipe(v.custom((n) => Number.isFinite(n), "Angle must be finite."))
    .pipe(
        v.transform((raw) => {
            const absVal = Math.abs(raw);

            // Normalize absolute angle into [0, 360)
            const degree =
                ((absVal % 360) + 360) % 360;

            const radian = degree * (Math.PI / 180);
            const turn = degree / 360;
            const gradian = turn * 400;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE ABSOLUTE NORMALIZED (0° ≤ |θ| < 360°)
*
* SUMMARY  
*   Represents the fully normalized, non-negative absolute angle magnitude,
*   including canonical multi-unit conversions.
*
* EXAMPLE  
*   ```
*   const a: AngleAbsoluteNormalized =
*       parse(angleAbsoluteNormalized, -390);  // → 30°
*   ```
*/
export type AngleAbsoluteNormalized =
    v.InferOutput<typeof angleAbsoluteNormalized>;

/**
* ANGLE–RADIAN SCHEMA (VALID RADIAN INPUT → CANONICAL MULTI-UNIT ANGLE)
*
* SUMMARY  
*   Validates that a value is a **finite radian measurement**, then converts it
*   into a complete, canonical multi-unit angular descriptor:
*
*     - turn  
*     - radian (original, unchanged except type-checked)  
*     - degree  
*     - gradian  
*     - mil  
*
*   This schema ensures that radian input — typically originating from math
*   libraries, robotics systems, physics engines, and trigonometric pipelines —
*   is safely converted into a unified internal angle representation used
*   across your entire system architecture.
*
* PURPOSE  
*   Required in scenarios where radians are the *native* angle unit:
*   - trigonometric calculations  
*   - robotics inverse kinematics  
*   - physics simulations  
*   - inertial measurement fusion  
*   - DSP & periodic waveform analysis  
*   - rotation matrices & quaternions  
*   - game/engine math pipelines  
*
* INPUT CONTRACT  
*   ACCEPTS:
*     - any finite number representing **radians**
*
*   REJECTS:
*     - NaN  
*     - ±Infinity  
*     - non-number  
*
* OUTPUT CONTRACT  
*   Returns a complete canonical multi-unit structure:
*   ```
*   {
*     turn: number;
*     radian: number;    // identical to input
*     degree: number;
*     gradian: number;
*     mil: number;
*   }
*   ```
*
* VALIDATION LOGIC  
*   - radianRaw = input  
*   - degree   = radianRaw * (180 / π)  
*   - turn     = radianRaw / (2π)  
*   - gradian  = turn * 400  
*   - mil      = degree * (6400 / 360)  
*
* SEMANTIC NOTES  
*   - Does NOT normalize — radians may exceed any range.  
*   - Ensures consistent downstream conversions regardless of input domain.  
*   - Preserves exact radian input (no clamping or coercion).  
*
* EXAMPLES  
*   ```
*   parse(angleRadian, Math.PI)         // → 180°
*   parse(angleRadian, Math.PI * 2)     // → 360°
*   parse(angleRadian, -Math.PI / 2)    // → -90°
*   parse(angleRadian, 10 * Math.PI)    // → 1800°
*   ```
*/
export const angleRadian = v
    .number("Angle (radian) must be a number.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Angle (radian) must be finite."
        )
    )
    .pipe(
        v.transform((radian) => {
            const degree = radian * (180 / Math.PI);
            const turn = radian / (2 * Math.PI);
            const gradian = turn * 400;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
 * OUTPUT TYPE — ANGLE RADIAN
 *
 * SUMMARY  
 *   Represents the complete multi-unit conversion of a radian input, preserving
 *   the raw radian value and supplying canonical equivalents in degrees,
 *   turns, gradians, and mils.
 *
 * EXAMPLE  
 *   ```
 *   const θ: AngleRadian =
 *     parse(angleRadian, Math.PI / 2);  // → 90°
 *   ```
 */
export type AngleRadian = v.InferOutput<typeof angleRadian>;

/**
 * ANGLE–RADIAN-NORMALIZED SCHEMA (0 ≤ θ < 2π)
 *
 * SUMMARY  
 *   Validates a radian input and normalizes it into the canonical non-negative
 *   radian interval:
 *
 *       0 ≤ θ < 2π
 *
 *   The output includes the complete multi-unit angle structure:
 *     - turn
 *     - radian   (normalized)
 *     - degree
 *     - gradian
 *     - mil
 *
 * PURPOSE  
 *   Canonical radian normalization is required for:
 *   - trigonometric phase alignment  
 *   - robotics rotation mod 2π  
 *   - physics simulation cycles  
 *   - waveform/frequency domain analysis  
 *   - quaternion/rotation matrix stabilization  
 *   - orientation normalization in 2D/3D engines  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *     - any finite number (interpreted as radians)
 *
 *   REJECTS:
 *     - NaN  
 *     - ±Infinity  
 *     - non-number inputs  
 *
 * OUTPUT CONTRACT  
 *   ```
 *   {
 *     turn: number;
 *     radian: number;   // normalized into [0, 2π)
 *     degree: number;
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * NORMALIZATION LOGIC  
 *   - raw = input  
 *   - radian = ((raw % (2π)) + (2π)) % (2π)  
 *
 *   Conversions:
 *     degree  = radian * (180 / π)
 *     turn    = radian / (2π)
 *     gradian = turn * 400
 *     mil     = degree * (6400 / 360)
 *
 * SEMANTIC NOTES  
 *   - Produces a canonical representative of the input angle's phase.  
 *   - Does **not** preserve sign — normalization is strictly non-negative.  
 *   - Essential across all orientation/rotation math.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleRadianNormalized, 7)            // → 7 rad wraps into < 2π
 *   parse(angleRadianNormalized, -Math.PI/2)   // → 3π/2
 *   parse(angleRadianNormalized, 10 * Math.PI) // → 0 rad
 *   parse(angleRadianNormalized, 0)            // → 0
 *   ```
 */
export const angleRadianNormalized = v
    .number("Angle (radian) must be numeric.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Angle (radian) must be finite."
        )
    )
    .pipe(
        v.transform((raw) => {
            const tau = 2 * Math.PI;

            // Normalize into [0, 2π)
            const radian = ((raw % tau) + tau) % tau;

            const degree = radian * (180 / Math.PI);
            const turn = radian / tau;
            const gradian = turn * 400;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE RADIAN NORMALIZED (0 ≤ θ < 2π)
*
* SUMMARY  
*   Represents a radian input normalized into the canonical non-negative
*   0–2π range, including all canonical angular units used for physics,
*   math, robotics, and orientation systems.
*
* EXAMPLE  
*   ```
*   const θ: AngleRadianNormalized =
*     parse(angleRadianNormalized, -Math.PI / 2);  // 3π/2
*   ```
*/
export type AngleRadianNormalized =
    v.InferOutput<typeof angleRadianNormalized>;

/**
* ANGLE–RADIAN-BIDIRECTIONAL SCHEMA (−π ≤ θ < +π)
*
* SUMMARY  
*   Accepts any finite radian input and normalizes it into the canonical
*   **bidirectional signed interval**:
*
*       −π ≤ θ < +π
*
*   This is the symmetric 2π domain commonly used in:
*     - robotics steering  
*     - orientation error computation  
*     - shortest-path rotation math  
*     - navigation heading deltas  
*     - pose estimation  
*     - trigonometric correction models  
*
*   The output includes the complete multi-unit angular representation:
*     - radian (normalized)  
*     - degree  
*     - turn  
*     - gradian  
*     - mil  
*
* PURPOSE  
*   Use when the system requires *signed* angle semantics:
*   - clockwise vs counterclockwise decisions  
*   - Δθ computations (“closest rotation direction”)  
*   - robotics steering loops & PID  
*   - SLAM / IMU heading  
*   - 2D/3D orientation math  
*
* INPUT CONTRACT  
*   ACCEPTS:
*     - any finite number (interpreted as radians)
*
*   REJECTS:
*     - NaN  
*     - infinite values  
*     - non-number input  
*
* OUTPUT CONTRACT  
*   ```
*   {
*     turn: number;
*     radian: number;   // normalized into [-π, +π)
*     degree: number;
*     gradian: number;
*     mil: number;
*   }
*   ```
*
* NORMALIZATION LOGIC  
*   - tau = 2π  
*   - r0 = ((raw % tau) + tau) % tau          // → [0, 2π)
*   - radian = r0 >= π ? r0 - tau : r0        // → [-π, +π)
*
*   Conversions:
*     degree  = radian * (180 / π)
*     turn    = radian / tau
*     gradian = turn * 400
*     mil     = degree * (6400 / 360)
*
* SEMANTIC NOTES  
*   - Ensures continuous bidirectional angle behavior.  
*   - Avoids discontinuities at the ±π boundary.  
*   - Enables shortest-rotation calculations by design.  
*
* EXAMPLES  
*   ```
*   parse(angleRadianBidirectional,  4)          // → ~+0.716 rad
*   parse(angleRadianBidirectional, -4)          // → ~−0.716 rad
*   parse(angleRadianBidirectional,  10 * Math.PI)
*   // → 0 rad
*
*   parse(angleRadianBidirectional, -Math.PI/2)
*   // → -1.570796...
*
*   parse(angleRadianBidirectional,  3*Math.PI/2)
*   // → -π/2
*   ```
*/
export const angleRadianBidirectional = v
    .number("Angle (radian) must be numeric.")
    .pipe(
        v.custom(
            (n) => Number.isFinite(n),
            "Angle (radian) must be finite."
        )
    )
    .pipe(
        v.transform((raw) => {
            const tau = 2 * Math.PI;

            // Normalize to [0, 2π)
            const r0 = ((raw % tau) + tau) % tau;

            // Convert to signed [-π, +π)
            const radian = r0 >= Math.PI ? r0 - tau : r0;

            const degree = radian * (180 / Math.PI);
            const turn = radian / tau;
            const gradian = turn * 400;
            const mil = degree * (6400 / 360);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
 * OUTPUT TYPE — ANGLE RADIAN BIDIRECTIONAL
 *
 * SUMMARY  
 *   Represents a radian angle normalized into the canonical signed interval
 *   −π ≤ θ < +π, including canonical conversions to degrees, turns, gradians,
 *   and mils. Ideal for robotics, navigation, motion control, and orientation
 *   math requiring shortest-path rotation semantics.
 *
 * EXAMPLE  
 *   ```
 *   const θ: AngleRadianBidirectional =
 *     parse(angleRadianBidirectional, 4);
 *   ```
 */
export type AngleRadianBidirectional =
    v.InferOutput<typeof angleRadianBidirectional>;

/**
 * ANGLE–TURN SCHEMA (VALID TURN INPUT → CANONICAL MULTI-UNIT ANGLE)
 *
 * SUMMARY  
 *   Validates that the input is a **finite turn measurement**, then converts it
 *   into the complete canonical angle descriptor used throughout the system:
 *
 *     - turn     (preserved exactly)
 *     - radian
 *     - degree
 *     - gradian
 *     - mil
 *
 *   Turns are the most intuitive representation on the modern web and appear
 *   widely in:
 *     - CSS transforms (`rotate(0.25turn)`)
 *     - animation systems
 *     - geospatial circular indexing
 *     - mathematical fractional rotation models
 *     - rotational interpolation (LERP/SERVO)
 *
 * PURPOSE  
 *   Ensures that input expressed as **fractions of a full rotation** is
 *   transformed into a consistent multi-unit angular structure for:
 *     - rendering and UI systems
 *     - CSS/DOM tooling
 *     - animation pipelines
 *     - geometry kernels
 *     - navigation and robotics systems
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *     - any finite number representing *turns*
 *
 *   REJECTS:
 *     - NaN  
 *     - infinite numbers  
 *     - non-numeric values  
 *
 * OUTPUT CONTRACT  
 *   Produces the canonical angular representation:
 *   ```
 *   {
 *     turn: number;     // identical to input
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - rawTurn = input  
 *   - radian  = rawTurn * 2π  
 *   - degree  = rawTurn * 360  
 *   - gradian = rawTurn * 400  
 *   - mil     = rawTurn * 6400  
 *
 * SEMANTIC NOTES  
 *   - Does *not* normalize — turns may be any magnitude or sign.  
 *   - Preserves the original fractional rotation value exactly.  
 *   - Conversions are purely linear and do not wrap.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleTurn, 1)        // → 360°
 *   parse(angleTurn, 0.25)     // → 90°
 *   parse(angleTurn, -0.5)     // → -180°
 *   parse(angleTurn, 3.75)     // → 1350°
 *   ```
 */
export const angleTurn = v
    .number("Angle (turn) must be numeric.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Angle (turn) must be finite."
        )
    )
    .pipe(
        v.transform((turn) => {
            const radian = turn * (2 * Math.PI);
            const degree = turn * 360;
            const gradian = turn * 400;
            const mil = turn * 6400;

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE TURN
*
* SUMMARY  
*   Represents a fractional rotation expressed in turns, along with its
*   canonical conversions into radians, degrees, gradians, and mils. Ensures
*   compatibility across UI, math, robotics, and rendering pipelines.
*
* EXAMPLE  
*   ```
*   const θ: AngleTurn =
*     parse(angleTurn, 0.25);   // 1/4 rotation → 90°
*   ```
*/
export type AngleTurn = v.InferOutput<typeof angleTurn>;

/**
 * ANGLE–TURN-NORMALIZED SCHEMA (0 ≤ turn < 1)
 *
 * SUMMARY  
 *   Accepts any finite turn value and normalizes it into the canonical
 *   **non-negative fractional rotation interval**:
 *
 *       0 ≤ turn < 1
 *
 *   Normalization is done modulo 1 turn (full rotation).  
 *   The resulting structure includes all canonical angle units:
 *
 *     - turn     (normalized)
 *     - radian
 *     - degree
 *     - gradian
 *     - mil
 *
 * PURPOSE  
 *   Ideal for systems that treat rotations as **cyclic fractional progress**  
 *   such as:
 *     - animation progress  
 *     - CSS/web transforms  
 *     - circular timelines  
 *     - oscillator phase modeling  
 *     - trigonometric waveform engines  
 *     - robotics cycle alignment  
 *     - navigation headings mod 360  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *     - any finite number representing *turns*, including negative and >1
 *
 *   REJECTS:
 *     - NaN  
 *     - ±Infinity  
 *     - non-numeric values  
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   {
 *     turn: number;     // normalized into [0, 1)
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * NORMALIZATION LOGIC  
 *   - raw = input  
 *   - turnNorm = ((raw % 1) + 1) % 1  
 *
 *   Conversions:
 *     radian  = turnNorm * 2π  
 *     degree  = turnNorm * 360  
 *     gradian = turnNorm * 400  
 *     mil     = turnNorm * 6400  
 *
 * SEMANTIC NOTES  
 *   - Eliminates wraparound, producing a canonical rotation phase.  
 *   - Guarantees a stable cyclic representation for repeated use.  
 *   - No sign is preserved — purely fractional.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleTurnNormalized, 1.25)     // → 0.25 turn
 *   parse(angleTurnNormalized, -0.1)     // → 0.9 turn
 *   parse(angleTurnNormalized, 5.75)     // → 0.75 turn
 *   parse(angleTurnNormalized, 0)        // → 0
 *   ```
 */
export const angleTurnNormalized = v
    .number("Angle (turn) must be numeric.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Angle (turn) must be finite."
        )
    )
    .pipe(
        v.transform((raw) => {
            // Normalize to [0, 1)
            const turn = ((raw % 1) + 1) % 1;

            const radian = turn * (2 * Math.PI);
            const degree = turn * 360;
            const gradian = turn * 400;
            const mil = turn * 6400;

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE TURN NORMALIZED (0 ≤ turn < 1)
*
* SUMMARY  
*   Represents a fractional rotation normalized into the canonical interval
*   0 ≤ turn < 1, including full multi-unit angular conversions for use in
*   UI, animation, rendering, robotics, and phase-based engines.
*
* EXAMPLE  
*   ```
*   const θ: AngleTurnNormalized =
*     parse(angleTurnNormalized, -0.4);  // → 0.6 turn
*   ```
*/
export type AngleTurnNormalized =
    v.InferOutput<typeof angleTurnNormalized>;

/**
 * ANGLE–TURN-BIDIRECTIONAL SCHEMA (−0.5 ≤ turn < +0.5)
 *
 * SUMMARY  
 *   Accepts any finite turn value and normalizes it into the canonical
 *   **bidirectional fractional rotation range**:
 *
 *       −0.5 ≤ turn < +0.5
 *
 *   This interval represents the **shortest rotational direction** in “turn”
 *   units (where 1 turn = full rotation).  
 *
 *   The output includes the complete canonical multi-unit representation:
 *     - turn      (signed, normalized)
 *     - radian
 *     - degree
 *     - gradian
 *     - mil
 *
 * PURPOSE  
 *   Use this schema for systems requiring signed rotation semantics:
 *     - shortest-path rotation selection  
 *     - robotics steering & PID control  
 *     - orientation error computation  
 *     - navigation heading deltas  
 *     - animation and interpolation of rotations  
 *     - SLAM / IMU heading alignment  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *     - any finite number representing *turns*
 *
 *   REJECTS:
 *     - NaN  
 *     - infinite values  
 *     - non-number inputs  
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   {
 *     turn: number;     // ∈ [-0.5, +0.5)
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;
 *   }
 *   ```
 *
 * NORMALIZATION LOGIC  
 *   Given:
 *     raw = input turn value
 *
 *   Steps:
 *     1. Normalize to [0, 1):
 *        t0 = ((raw % 1) + 1) % 1
 *
 *     2. Convert to symmetric [-0.5, +0.5):
 *        turn = (t0 >= 0.5) ? t0 - 1 : t0
 *
 *   Conversions:
 *     radian  = turn * 2π  
 *     degree  = turn * 360  
 *     gradian = turn * 400  
 *     mil     = turn * 6400  
 *
 * SEMANTIC NOTES  
 *   - Signed range ensures “closest rotation direction.”  
 *   - Perfect for control loops and orientation blending.  
 *   - Sign indicates clockwise (negative) vs counter-clockwise (positive).  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleTurnBidirectional, 0.75)
 *   // → -0.25 turn   (i.e., −90°)
 *
 *   parse(angleTurnBidirectional, -0.6)
 *   // → +0.4 turn    (i.e., +144°)
 *
 *   parse(angleTurnBidirectional, 2.1)
 *   // → +0.1 turn
 *
 *   parse(angleTurnBidirectional, -3.25)
 *   // → -0.25 turn
 *   ```
 */
export const angleTurnBidirectional = v
    .number("Angle (turn) must be numeric.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Angle (turn) must be finite."
        )
    )
    .pipe(
        v.transform((raw) => {
            // Normalize to [0, 1)
            const t0 = ((raw % 1) + 1) % 1;

            // Convert to [-0.5, +0.5)
            const turn = t0 >= 0.5 ? t0 - 1 : t0;

            const radian = turn * (2 * Math.PI);
            const degree = turn * 360;
            const gradian = turn * 400;
            const mil = turn * 6400;

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE TURN BIDIRECTIONAL (−0.5 ≤ turn < +0.5)
*
* SUMMARY  
*   Represents a fractional turn value normalized into the signed half-turn
*   domain, with complete conversions into degrees, radians, gradians, and
*   mils. Ideal for shortest-path rotation logic and bidirectional angle math.
*
* EXAMPLE  
*   ```
*   const θ: AngleTurnBidirectional =
*     parse(angleTurnBidirectional, 0.75); // → -0.25 turn (−90°)
*   ```
*/
export type AngleTurnBidirectional =
    v.InferOutput<typeof angleTurnBidirectional>;

/**
 * ANGLE–GRADIAN SCHEMA (VALID GRAD INPUT → CANONICAL MULTI-UNIT ANGLE)
 *
 * SUMMARY  
 *   Validates that the input is a **finite gradian (gon) measurement**, then
 *   converts it into a complete canonical angular descriptor containing:
 *
 *     - gradian  (preserved exactly)
 *     - degree
 *     - radian
 *     - turn
 *     - mil
 *
 *   Gradians are historically used in:
 *     - surveying  
 *     - civil engineering  
 *     - geodesy  
 *     - specialized navigation systems  
 *     - legacy European angular standards  
 *
 * PURPOSE  
 *   Provides a unified multi-unit representation for systems that still produce
 *   or consume gradians while the rest of the architecture uses degrees,
 *   radians, turns, or mils.
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *     - any finite number representing *gradians*
 *
 *   REJECTS:
 *     - NaN  
 *     - infinite values  
 *     - non-numeric values  
 *
 * OUTPUT CONTRACT  
 *   Returns the canonical full-angle structure:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;   // identical to input
 *     mil: number;
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - gradian = raw input  
 *   - turn    = gradian / 400  
 *   - degree  = gradian * (360 / 400)  
 *   - radian  = degree * (π / 180)  
 *   - mil     = gradian * (6400 / 400)  
 *
 * SEMANTIC NOTES  
 *   - No normalization occurs — raw gradian value may be any real number.  
 *   - Sign is preserved.  
 *   - Perfect for multi-unit conversion pipelines.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleGradian, 100)   // → 90°
 *   parse(angleGradian, 200)   // → 180°
 *   parse(angleGradian, -50)   // → -45°
 *   parse(angleGradian, 800)   // → 720° (2 full turns)
 *   ```
 */
export const angleGradian = v
    .number("Angle (gradian) must be numeric.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Angle (gradian) must be finite."
        )
    )
    .pipe(
        v.transform((gradian) => {
            const turn = gradian / 400;
            const degree = gradian * (360 / 400);
            const radian = degree * (Math.PI / 180);
            const mil = gradian * (6400 / 400);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE GRADIAN
*
* SUMMARY  
*   Represents a gradian (gon) angle along with its canonical conversions into
*   turns, degrees, radians, gradians, and mils. Suitable for surveying,
*   navigation, and geodesy systems that still use gradian-based inputs.
*
* EXAMPLE  
*   ```
*   const θ: AngleGradian =
*     parse(angleGradian, 150); // 150 grad = 135°
*   ```
*/
export type AngleGradian = v.InferOutput<typeof angleGradian>;

/**
 * ANGLE–GRADIAN-NORMALIZED SCHEMA (0 ≤ grad < 400)
 *
 * SUMMARY  
 *   Accepts any finite gradian (gon) value and normalizes it into the canonical
 *   non-negative interval:
 *
 *       0 ≤ gradian < 400
 *
 *   Normalization is modulo 400 grads (1 full turn).
 *
 *   The normalized gradian value is then converted into the complete canonical
 *   multi-unit angle representation:
 *     - turn
 *     - radian
 *     - degree
 *     - gradian (normalized)
 *     - mil
 *
 * PURPOSE  
 *   This schema is ideal when processing angles from surveying, civil
 *   engineering, or geodesy workflows where:
 *     - inputs may include cyclical wraparound  
 *     - angles must be mapped to a canonical 400-grad circle  
 *     - downstream systems rely on non-negative canonical domains  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *     - any finite number representing *gradians*
 *
 *   REJECTS:
 *     - NaN  
 *     - infinite inputs  
 *     - non-numeric values  
 *
 * OUTPUT CONTRACT  
 *   Produces a complete canonical angle object:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;   // ∈ [0, 400)
 *     mil: number;
 *   }
 *   ```
 *
 * NORMALIZATION LOGIC  
 *   - raw = input  
 *   - gradian = ((raw % 400) + 400) % 400  
 *
 *   Conversions:
 *     turn    = gradian / 400  
 *     degree  = gradian * (360 / 400)  
 *     radian  = degree * (π / 180)  
 *     mil     = gradian * (6400 / 400)  
 *
 * SEMANTIC NOTES  
 *   - Produces a canonical non-negative gradian domain.  
 *   - Sign is not preserved; this schema is purely magnitude-normalized.  
 *   - Matches common surveying and instrument normalization rules.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleGradianNormalized, 410)    // → 10 grad
 *   parse(angleGradianNormalized, -50)    // → 350 grad
 *   parse(angleGradianNormalized, 800)    // → 0 grad
 *   parse(angleGradianNormalized, 0)      // → 0
 *   ```
 */
export const angleGradianNormalized = v
    .number("Angle (gradian) must be numeric.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Angle (gradian) must be finite."
        )
    )
    .pipe(
        v.transform((raw) => {
            // Normalize into [0, 400)
            const gradian = ((raw % 400) + 400) % 400;

            const turn = gradian / 400;
            const degree = gradian * (360 / 400);
            const radian = degree * (Math.PI / 180);
            const mil = gradian * (6400 / 400);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE GRADIAN NORMALIZED (0 ≤ grad < 400)
*
* SUMMARY  
*   Represents a gradian-based angle normalized into the canonical
*   non-negative interval, including full conversions into turns, degrees,
*   radians, and mils.
*
* EXAMPLE  
*   ```
*   const θ: AngleGradianNormalized =
*     parse(angleGradianNormalized, -50);  // → 350 grad
*   ```
*/
export type AngleGradianNormalized =
    v.InferOutput<typeof angleGradianNormalized>;

/**
 * ANGLE–GRADIAN-BIDIRECTIONAL SCHEMA (−200 ≤ grad < +200)
 *
 * SUMMARY  
 *   Normalizes any finite gradian (gon) value into the canonical **signed,
 *   bidirectional angular range**:
 *
 *       −200 ≤ gradian < +200
 *
 *   This interval represents the **shortest-path rotation domain** in grads,
 *   equivalent to ±180° or ±π radians.
 *
 *   The schema produces the full canonical multi-unit output:
 *     - turn
 *     - radian
 *     - degree
 *     - gradian    (signed, normalized)
 *     - mil
 *
 * PURPOSE  
 *   Used for signed-angle systems where direction matters:
 *     - robotics orientation control  
 *     - steering/PID loops  
 *     - surveying with directional deltas  
 *     - navigation heading offsets  
 *     - rotation interpolation  
 *     - shortest-path angular math  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *     - any finite number representing *gradians*
 *
 *   REJECTS:
 *     - NaN  
 *     - ±Infinity  
 *     - non-number inputs  
 *
 * OUTPUT CONTRACT  
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;   // ∈ [-200, +200)
 *     mil: number;
 *   }
 *   ```
 *
 * NORMALIZATION LOGIC  
 *   Let raw = input  
 *
 *   1. Normalize to [0, 400):
 *      g0 = ((raw % 400) + 400) % 400
 *
 *   2. Convert into symmetric domain:
 *      gradian = g0 >= 200 ? g0 - 400 : g0
 *
 *   Conversions:
 *     turn    = gradian / 400  
 *     degree  = gradian * (360 / 400)  
 *     radian  = degree * (π / 180)  
 *     mil     = gradian * (6400 / 400)  
 *
 * SEMANTIC NOTES  
 *   - Ensures consistent “closest rotation direction.”  
 *   - Negative values indicate clockwise behavior.  
 *   - Matches surveying & navigation signed-delta conventions.  
 *
 * EXAMPLES  
 *   ```
 *   parse(angleGradianBidirectional, 210)
 *   // → -190 grad
 *
 *   parse(angleGradianBidirectional, -360)
 *   // → +40 grad
 *
 *   parse(angleGradianBidirectional, 600)
 *   // → +200 grad → folded to -200 grad
 *
 *   parse(angleGradianBidirectional, -50)
 *   // → -50 grad
 *   ```
 */
export const angleGradianBidirectional = v
    .number("Angle (gradian) must be numeric.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Angle (gradian) must be finite."
        )
    )
    .pipe(
        v.transform((raw) => {
            // Normalize to [0, 400)
            const g0 = ((raw % 400) + 400) % 400;

            // Normalize to [-200, +200)
            const gradian = g0 >= 200 ? g0 - 400 : g0;

            const turn = gradian / 400;
            const degree = gradian * (360 / 400);
            const radian = degree * (Math.PI / 180);
            const mil = gradian * (6400 / 400);

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE GRADIAN BIDIRECTIONAL (−200 ≤ grad < +200)
*
* SUMMARY  
*   Represents a gradian (gon) angle normalized into the canonical signed
*   interval −200 ≤ grad < +200, with full cross-unit conversions into turns,
*   degrees, radians, and mils. Ideal for directional surveying, navigation,
*   robotics, and shortest-path computations.
*
* EXAMPLE  
*   ```
*   const θ: AngleGradianBidirectional =
*       parse(angleGradianBidirectional, 210);   // → -190 grad
*   ```
*/
export type AngleGradianBidirectional =
    v.InferOutput<typeof angleGradianBidirectional>;

/**
 * ANGLE–MIL SCHEMA (0 ≤ mil < 6400)
 *
 * SUMMARY
 *   Normalizes any finite **mil** (NATO artillery mil) value into the canonical
 *   forward-only angular domain:
 *
 *       0 ≤ mil < 6400
 *
 *   One full revolution = 6400 mil.
 *
 *   Schema returns full canonical multi-unit representation:
 *     - turn
 *     - radian
 *     - degree
 *     - gradian
 *     - mil         (canonical)
 *
 * PURPOSE
 *   Used in:
 *     - artillery and ballistic calculations  
 *     - targeting & bearing control  
 *     - azimuth systems  
 *     - military surveying  
 *     - gunnery computers  
 *     - turret & sensor alignment  
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - any finite number representing mils (NATO standard)
 *
 *   REJECTS:
 *     - NaN  
 *     - ±Infinity  
 *     - non-number inputs  
 *
 * OUTPUT CONTRACT
 *   Returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;       // 0 ≤ mil < 6400
 *   }
 *   ```
 *
 * NORMALIZATION LOGIC
 *   Let raw = input
 *
 *   1. Normalize to canonical domain:
 *        mil = ((raw % 6400) + 6400) % 6400
 *
 *   2. Convert to other units:
 *        turn    = mil / 6400
 *        degree  = turn * 360
 *        radian  = degree * (π / 180)
 *        gradian = turn * 400
 *
 * SEMANTIC NOTES
 *   - This schema provides the standard “forward-only azimuth” mil domain.  
 *   - Later schemas will handle signed mils, artillery deltas, and
 *     symmetric mil-space (±3200).
 *
 * EXAMPLES
 *   ```
 *   parse(angleMil, 50)
 *   // → 50 mil
 *
 *   parse(angleMil, 6500)
 *   // → 100 mil
 *
 *   parse(angleMil, -100)
 *   // → 6300 mil
 *   ```
 */
export const angleMil = v
    .number("Angle (mil) must be numeric.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Angle (mil) must be finite."
        )
    )
    .pipe(
        v.transform((raw) => {
            const mil = ((raw % 6400) + 6400) % 6400;

            const turn = mil / 6400;
            const degree = turn * 360;
            const radian = degree * (Math.PI / 180);
            const gradian = turn * 400;

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE MIL (0 ≤ mil < 6400)
*
* SUMMARY
*   Represents a canonical artillery mil angle normalized to the forward-only
*   domain 0 ≤ mil < 6400, with full multi-unit conversions.
*
* EXAMPLE
*   ```
*   const θ: AngleMil = parse(angleMil, -200);  // → 6200 mil
*   ```
*/
export type AngleMil = v.InferOutput<typeof angleMil>;

/**
 * ANGLE–MIL-BIDIRECTIONAL SCHEMA (−3200 ≤ mil < +3200)
 *
 * SUMMARY
 *   Normalizes any finite **mil** value into the symmetric bidirectional
 *   artillery domain:
 *
 *       -3200 ≤ mil < +3200
 *
 *   This domain represents a full revolution of 6400 mil distributed around
 *   a zero-facing axis, enabling:
 *
 *     - signed azimuth deltas
 *     - clockwise (positive) / counter-clockwise (negative)
 *     - turret & sensor tracking
 *     - gunnery deflection corrections
 *     - relative angle offsets
 *
 *   Schema returns a complete multi-unit payload:
 *     - turn
 *     - radian
 *     - degree
 *     - gradian
 *     - mil         (bidirectional canonical)
 *
 * PURPOSE
 *   This schema is used when **directional deviation matters**, such as:
 *     - gun laying systems  
 *     - turret stabilization  
 *     - differential azimuth corrections  
 *     - sensor alignment (CW vs CCW)  
 *     - heading deltas for inertial measurement  
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - any finite number representing raw mil input
 *
 *   REJECTS:
 *     - NaN  
 *     - ±Infinity  
 *     - non-number values  
 *
 * OUTPUT CONTRACT
 *   Returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;       // -3200 ≤ mil < +3200
 *   }
 *   ```
 *
 * NORMALIZATION LOGIC
 *   1. Normalize into 0–6399 mil:
 *        canonical = ((raw % 6400) + 6400) % 6400
 *
 *   2. Convert to symmetric mil-space:
 *        if canonical >= 3200:
 *            mil = canonical - 6400      // → negative half
 *        else:
 *            mil = canonical             // → positive half
 *
 *   3. Convert units:
 *        turn    = mil / 6400
 *        degree  = turn * 360
 *        radian  = degree * (π / 180)
 *        gradian = turn * 400
 *
 * SEMANTIC NOTES
 *   - The symmetric domain is required for relative offsets:
 *       - gun deflection (“left” or “right”)
 *       - sensor drift angles
 *       - servo error correction
 *       - platform deviation measurement
 *
 *   - Positive = clockwise, Negative = counter-clockwise
 *     (convention used in NATO fire-control systems)
 *
 * EXAMPLES
 *   ```
 *   parse(angleMilBi, 3300)
 *   // → mil = -3100
 *
 *   parse(angleMilBi, -100)
 *   // → mil = -100
 *
 *   parse(angleMilBi, 7000)
 *   // → mil = +600
 *   ```
 */
export const angleMilBi = v
    .number("Angle (mil) must be numeric.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Angle (mil) must be finite."
        )
    )
    .pipe(
        v.transform((raw) => {
            // Step 1: normalize into 0–6399
            const canonical = ((raw % 6400) + 6400) % 6400;

            // Step 2: convert to symmetric mil-space (−3200 to +3199)
            const mil = canonical >= 3200 ? canonical - 6400 : canonical;

            // Step 3: convert units
            const turn = mil / 6400;
            const degree = turn * 360;
            const radian = degree * (Math.PI / 180);
            const gradian = turn * 400;

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE MIL (BIDIRECTIONAL)
*
* SUMMARY
*   Represents a normalized signed artillery mil angle in the canonical
*   symmetric domain −3200 ≤ mil < +3200, with full multi-unit conversions.
*
* EXAMPLE
*   ```
*   const θ: AngleMilBidirectional = parse(angleMilBi, 6500);
*   // θ.mil = +100
*   ```
*/
export type AngleMilBidirectional = v.InferOutput<typeof angleMilBi>;

/**
 * ANGLE–MIL-ABSOLUTE SCHEMA (0 ≤ mil < 6400)
 *
 * SUMMARY
 *   Normalizes any finite mil value into a **non-negative absolute magnitude**
 *   within a full artillery circle:
 *
 *       0 ≤ mil < 6400
 *
 *   This schema intentionally **removes directionality**, producing a
 *   magnitude-only representation. It is fundamental in:
 *
 *     - ballistic deviation magnitude
 *     - error distance (without sign)
 *     - turret/sensor drift magnitude
 *     - raw angular displacement size
 *     - “distance from zero” yaw offsets
 *
 *   Output always contains the full multi-unit conversion:
 *     - turn
 *     - radian
 *     - degree
 *     - gradian
 *     - mil (absolute canonical)
 *
 * PURPOSE
 *   Used when **only the size of the angle matters**, not whether it was
 *   clockwise or counter-clockwise. This is extremely common in:
 *
 *     • fire-control systems  
 *     • stabilization loops  
 *     • IMU correction magnitude  
 *     • threshold-triggered angular alerts  
 *     • ballistic computation engines  
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - any finite number representing mil input
 *
 *   REJECTS:
 *     - NaN
 *     - ±Infinity
 *     - non-number values
 *
 * OUTPUT CONTRACT
 *   Returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;      // absolute, 0 ≤ mil < 6400
 *   }
 *   ```
 *
 * NORMALIZATION LOGIC
 *   Step 1: Normalize into 0–6399 mil range:
 *       canonical = ((raw % 6400) + 6400) % 6400
 *
 *   Step 2: Absolute magnitude (canonical already non-negative):
 *       mil = canonical
 *
 *   Step 3: Convert to units:
 *       turn    = mil / 6400
 *       degree  = turn * 360
 *       radian  = degree * (π / 180)
 *       gradian = turn * 400
 *
 * SEMANTIC NOTES
 *   - No sign information is preserved.
 *   - Purely expresses angular distance.
 *   - Reproducible across platforms/systems.
 *   - Always safe for magnitude-based thresholds.
 *
 * EXAMPLES
 *   ```
 *   parse(angleMilAbs, -3200)    // → mil = 3200
 *   parse(angleMilAbs, 6500)     // → mil = 100
 *   parse(angleMilAbs, 0)        // → mil = 0
 *   ```
 */
export const angleMilAbs = v
    .number("Angle (mil) must be numeric.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Angle (mil) must be finite."
        )
    )
    .pipe(
        v.transform((raw) => {
            // Step 1: normalize into 0–6399
            const mil = ((raw % 6400) + 6400) % 6400;

            // Step 2–3: convert units
            const turn = mil / 6400;
            const degree = turn * 360;
            const radian = degree * (Math.PI / 180);
            const gradian = turn * 400;

            return {
                turn,
                radian,
                degree,
                gradian,
                mil, // absolute
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE MIL (ABSOLUTE)
*
* SUMMARY
*   Represents a normalized **magnitude-only** mil angle strictly in the
*   domain 0 ≤ mil < 6400, along with canonical unit conversions.
*
* EXAMPLE
*   ```
*   const θ: AngleMilAbs = parse(angleMilAbs, -450);
*   // θ.mil = 3950
*   ```
*/
export type AngleMilAbs = v.InferOutput<typeof angleMilAbs>;

/**
 * ANGLE–MIL-SECTOR SCHEMA (64 SECTORS × 100 MIL EACH)
 *
 * SUMMARY
 *   Normalizes any finite mil value and classifies it into **one of 64 sectors**
 *   of width **100 mil** each:
 *
 *       sector = floor( (canonicalMil / 100) )   // 0–63
 *
 *   This is the standard coarse discretization used in:
 *     - artillery fire-control sectors  
 *     - radar search patterns  
 *     - high-speed directional bucketing  
 *     - coarse threat vector classification  
 *     - turret aim-assist and stabilization  
 *
 *   Schema returns:
 *     - canonical unit-converted angle ({ turn, radian, degree, gradian, mil })
 *     - the 0-63 sector index
 *
 * PURPOSE
 *   Provides deterministic and stable **sector-level orientation** for:
 *     - analytics bucketing  
 *     - classification models  
 *     - orientation zoning  
 *     - turret lookup tables  
 *     - engagement decision trees  
 *     - coarse heading filters  
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - any finite number (raw mil)
 *
 *   REJECTS:
 *     - NaN  
 *     - Infinity  
 *     - non-numeric values  
 *
 * OUTPUT CONTRACT
 *   Returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;        // 0–6399
 *     sector: number;     // 0–63
 *   }
 *   ```
 *
 * NORMALIZATION LOGIC
 *   1. Normalize into 0–6399:
 *        mil = ((raw % 6400) + 6400) % 6400
 *
 *   2. Compute sector:
 *        sector = Math.floor(mil / 100)    // 100 mil per sector
 *        // always 0–63 because 6400 mil total
 *
 *   3. Convert units:
 *        turn    = mil / 6400
 *        degree  = turn * 360
 *        radian  = degree * (π / 180)
 *        gradian = turn * 400
 *
 * SEMANTIC NOTES
 *   - Sector boundaries: [0–99], [100–199], … [6300–6399]
 *   - Sector index wraps cleanly with angle normalization.
 *   - No directional sign is retained — this is magnitude + bucket.
 *
 * EXAMPLES
 *   ```
 *   parse(angleMilSector, 0)       // → sector 0
 *   parse(angleMilSector, 450)     // → sector 4
 *   parse(angleMilSector, 6300)    // → sector 63
 *   parse(angleMilSector, 6600)    // → 6600→200 → sector 2
 *   ```
 */
export const angleMilSector = v
    .number("Angle (mil) must be numeric.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Angle (mil) must be finite."
        )
    )
    .pipe(
        v.transform((raw) => {
            // Step 1: normalize to 0–6399
            const mil = ((raw % 6400) + 6400) % 6400;

            // Step 2: compute 0–63 sector
            const sector = Math.floor(mil / 100);

            // Step 3: convert units
            const turn = mil / 6400;
            const degree = turn * 360;
            const radian = degree * (Math.PI / 180);
            const gradian = turn * 400;

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
                sector,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE MIL SECTOR
*
* SUMMARY
*   Represents a normalized mil angle with full unit conversions and a
*   computed sector index in the domain 0–63.
*
* EXAMPLE
*   ```
*   const θ: AngleMilSector = parse(angleMilSector, 250);
*   // θ.sector = 2
*   ```
*/
export type AngleMilSector = v.InferOutput<typeof angleMilSector>;

/**
 * ANGLE–MIL-ZONE SCHEMA (FORWARD / RIGHT / REAR / LEFT)
 *
 * SUMMARY
 *   Normalizes any finite mil value into the canonical **0–6399** range
 *   and classifies it into a **4-zone tactical orientation model**:
 *
 *       • forward  
 *       • right  
 *       • rear  
 *       • left  
 *
 *   These zones correspond to the standard 6400-mil artillery circle:
 *
 *       forward:   6200–6399 and 0–200    (~ ±112.5° window)
 *       right:     1600–3200              (90°–180° clockwise)
 *       rear:      3200–4800              (180°–270°)
 *       left:      4800–6200              (270°–360°)
 *
 *   Schema returns:
 *     - normalized multi-unit angle
 *     - zone classification string
 *
 * PURPOSE
 *   Enables coarse tactical/positional reasoning:
 *
 *     - “target is approaching from the right”
 *     - “turret threat detected from rear zone”
 *     - “vehicle drift towards left zone”
 *     - “sensor offset falls inside forward arc”
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - any finite numeric mil value
 *
 *   REJECTS:
 *     - NaN
 *     - Infinity
 *     - non-numeric values
 *
 * OUTPUT CONTRACT
 *   Returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number;          // canonical, 0–6399
 *     zone: "forward" | "right" | "rear" | "left";
 *   }
 *   ```
 *
 * ZONE LOGIC
 *   Domain is 6400 mil:
 *
 *     ┌────────────┬───────────────────────────┐
 *     │  Zone       │  Mil Range                │
 *     ├────────────┼───────────────────────────┤
 *     │ forward     │ 6200–6399 and 0–200       │
 *     │ right       │ 1600–3199                 │
 *     │ rear        │ 3200–4799                 │
 *     │ left        │ 4800–6199                 │
 *     └────────────┴───────────────────────────┘
 *
 * SEMANTIC NOTES
 *   - forward is a *wrap-around zone*, so its logic must check two ranges.
 *   - This classification is stable, deterministic, and reproducible.
 *   - Frequently used in directional AI, tracking, targeting, and telemetry.
 *
 * EXAMPLES
 *   ```
 *   parse(angleMilZone, 50)       // → "forward"
 *   parse(angleMilZone, 2000)     // → "right"
 *   parse(angleMilZone, 4100)     // → "rear"
 *   parse(angleMilZone, 5500)     // → "left"
 *   parse(angleMilZone, 6500)     // → 6500→100 → "forward"
 *   ```
 */
export const angleMilZone = v
    .number("Angle (mil) must be numeric.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Angle (mil) must be finite."
        )
    )
    .pipe(
        v.transform((raw) => {
            // 1. normalize into 0–6399
            const mil = ((raw % 6400) + 6400) % 6400;

            // 2. determine tactical zone
            let zone: "forward" | "right" | "rear" | "left";

            if (mil >= 6200 || mil <= 200) {
                zone = "forward";
            } else if (mil >= 1600 && mil < 3200) {
                zone = "right";
            } else if (mil >= 3200 && mil < 4800) {
                zone = "rear";
            } else {
                zone = "left";
            }

            // 3. convert units
            const turn = mil / 6400;
            const degree = turn * 360;
            const radian = degree * (Math.PI / 180);
            const gradian = turn * 400;

            return {
                turn,
                radian,
                degree,
                gradian,
                mil,
                zone,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE MIL ZONE
*
* SUMMARY
*   Represents a canonical mil angle with full unit conversion and a
*   coarse tactical orientation zone.
*
* EXAMPLE
*   ```
*   const z: AngleMilZone = parse(angleMilZone, -300);
*   console.log(z.zone)   // "forward"
*   ```
*/
export type AngleMilZone = v.InferOutput<typeof angleMilZone>;

/**
 * ANGLE–DMS SCHEMA (DEGREES–MINUTES–SECONDS)
 *
 * SUMMARY
 *   Validates and normalizes an angle expressed in classical **DMS format**:
 *
 *       degrees ° minutes ' seconds "
 *
 *   This format is used extensively in:
 *     - astronomy (celestial coordinates)
 *     - geodesy and surveying
 *     - GIS and mapping
 *     - navigation systems
 *     - legacy engineering specifications
 *
 *   The schema accepts multiple input shapes:
 *
 *     • String notation:
 *         "12° 34' 56.78\""
 *         "-02° 05' 00\""
 *
 *     • Object notation:
 *         { deg: 12, min: 34, sec: 56.78 }
 *
 *   All forms are parsed and normalized into:
 *
 *     - turn  
 *     - radian  
 *     - degree  
 *     - gradian  
 *     - mil (always null for non-artillery units)
 *
 *   And domain-specific normalized DMS:
 *     dms: { deg, min, sec }
 *
 *
 * PURPOSE
 *   Provides high-precision, canonical handling for DMS-formatted angles.
 *   This schema ensures:
 *
 *     • correct sign propagation  
 *     • correct minutes/seconds rollovers  
 *     • correct normalization beyond 360°  
 *     • consistent internal angle representation  
 *
 *   DMS is widely used where **precision** and **human-readable angular
 *   formatting** are required.
 *
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - string formatted as D°M'S"
 *     - or object: { deg: number; min: number; sec: number }
 *
 *   REJECTS:
 *     - malformed string
 *     - negative minutes or seconds
 *     - non-finite values
 *
 *
 * OUTPUT CONTRACT
 *   Returns canonical units plus normalized DMS:
 *
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: null;
 *
 *     dms: {
 *       deg: number;    // integer
 *       min: number;    // 0–59
 *       sec: number;    // 0–59.999...
 *     }
 *   }
 *   ```
 *
 *
 * NORMALIZATION LOGIC
 *
 *   1. Extract sign from degrees field.
 *   2. Ensure minutes/seconds follow standard ranges:
 *        0 ≤ min < 60
 *        0 ≤ sec < 60
 *   3. Convert to total degrees:
 *        degTotal = sign * (abs(deg) + min/60 + sec/3600)
 *   4. Convert to canonical units:
 *        turn    = degTotal / 360
 *        radian  = degTotal * (π / 180)
 *        gradian = turn * 400
 *        mil     = null
 *
 *
 * EXAMPLES
 *   ```
 *   parse(angleDms, "12° 30' 00\"");
 *   // → degree = 12.5
 *
 *   parse(angleDms, { deg: -2, min: 30, sec: 0 });
 *   // → degree = -2.5
 *   ```
 */
export const angleDms = v.union(
    [
        // STRING INPUT
        v
            .string("DMS string must be a string.")
            .pipe(
                v.transform((str) => {
                    const regex =
                        /^([+-]?\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d*)?)\s*"?$/;
                    const m = regex.exec(str.trim());

                    if (!m) throw new Error("Invalid DMS string format.");

                    return {
                        deg: Number(m[1]),
                        min: Number(m[2]),
                        sec: Number(m[3]),
                    };
                })
            ),

        // OBJECT INPUT
        v.object({
            deg: v.number("deg must be numeric."),
            min: v.number("min must be numeric."),
            sec: v.number("sec must be numeric."),
        }),
    ],
    "Input must be a DMS string or {deg,min,sec} object."
).pipe(
    // Validate structure
    v.custom(
        (o: any) =>
            Number.isFinite(o.deg) &&
            Number.isFinite(o.min) &&
            Number.isFinite(o.sec) &&
            o.min >= 0 &&
            o.min < 60 &&
            o.sec >= 0 &&
            o.sec < 60,
        "Invalid DMS values: minutes must be 0–59, seconds must be 0–59.999."
    )
).pipe(
    // Normalize into canonical units + dms subobject
    v.transform((o) => {
        const sign = o.deg < 0 ? -1 : 0 <= o.deg ? 1 : 1;
        const degAbs = Math.abs(o.deg);
        const degTotal = sign * (degAbs + o.min / 60 + o.sec / 3600);

        const degree = degTotal;
        const turn = degree / 360;
        const radian = degree * (Math.PI / 180);
        const gradian = turn * 400;

        return {
            turn,
            radian,
            degree,
            gradian,
            mil: null,

            dms: {
                deg: Math.trunc(degree),
                min: Math.floor(Math.abs(degree * 60) % 60),
                sec: Math.abs((degree * 3600) % 60),
            },
        };
    })
);

/**
* OUTPUT TYPE — ANGLE DMS
*
* SUMMARY
*   Represents a validated, normalized DMS angle with canonical multi-unit
*   conversions and a domain-specific DMS representation.
*/
export type AngleDms = v.InferOutput<typeof angleDms>;

/**
 * ANGLE–HMS SCHEMA (HOUR–MINUTE–SECOND)
 *
 * SUMMARY
 *   Validates and normalizes an astronomical **Hour–Minute–Second** angle,
 *   the canonical representation of **Right Ascension (RA)** used in:
 *
 *     - celestial coordinate systems (RA/Dec)
 *     - stellar catalogs
 *     - telescope control systems
 *     - orbital mechanics and tracking
 *
 *   24 hours correspond to a full 360° rotation, making HMS a time-derived
 *   angular unit:
 *
 *       1 hour   = 15°
 *       1 minute = 15 arcminutes
 *       1 second = 15 arcseconds
 *
 *   Accepted formats:
 *     • string:  "12h 34m 56.78s"
 *     • object:  { h: number; m: number; s: number }
 *
 *   Produces:
 *     - turn, radian, degree, gradian, mil (null)
 *     - domain-specific HMS block
 *
 *
 * PURPOSE
 *   Provides precise handling and canonical unit conversion for HMS angles
 *   across astronomical, astrometric, and telescope automation systems.
 *
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - string "Hh Mm Ss"
 *     - object { h, m, s }
 *
 *   REJECTS:
 *     - malformed HMS strings
 *     - negative minutes or seconds
 *     - non-finite values
 *     - values outside expected ranges
 *
 *
 * OUTPUT CONTRACT
 *   Returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: null;
 *
 *     hms: {
 *       h: number;   // integer 0–23
 *       m: number;   // 0–59
 *       s: number;   // 0–59.999
 *     }
 *   }
 *   ```
 *
 *
 * NORMALIZATION LOGIC
 *
 *   1. Validate and extract sign (HMS RA is usually unsigned, but we support ±).
 *   2. Validate ranges:
 *        0 ≤ m < 60
 *        0 ≤ s < 60
 *   3. Convert HMS → degrees:
 *        degTotal = hour * 15
 *                + (minute / 60) * 15
 *                + (second / 3600) * 15
 *
 *   4. Convert to canonical:
 *        turn    = degTotal / 360
 *        radian  = degTotal * (π / 180)
 *        gradian = turn * 400
 *
 *
 * EXAMPLES
 *   ```
 *   parse(angleHms, "12h 00m 00s");
 *   // → degree = 180
 *
 *   parse(angleHms, { h: 1, m: 0, s: 0 });
 *   // → degree = 15
 *
 *   parse(angleHms, { h: 23, m: 59, s: 59 });
 *   // → degree ≈ 359.99958
 *   ```
 */
export const angleHms = v.union(
    [
        // STRING INPUT
        v
            .string("HMS string must be a string.")
            .pipe(
                v.transform((str) => {
                    const regex =
                        /^([+-]?\d+)\s*h\s*(\d+)\s*m\s*(\d+(?:\.\d*)?)\s*s$/i;
                    const m = regex.exec(str.trim());

                    if (!m) throw new Error("Invalid HMS string format.");

                    return {
                        h: Number(m[1]),
                        m: Number(m[2]),
                        s: Number(m[3]),
                    };
                })
            ),

        // OBJECT INPUT
        v.object({
            h: v.number("h must be numeric."),
            m: v.number("m must be numeric."),
            s: v.number("s must be numeric."),
        }),
    ],
    "Input must be an HMS string or {h,m,s} object."
).pipe(
    v.custom(
        (o: any) =>
            Number.isFinite(o.h) &&
            Number.isFinite(o.m) &&
            Number.isFinite(o.s) &&
            o.m >= 0 &&
            o.m < 60 &&
            o.s >= 0 &&
            o.s < 60,
        "Invalid HMS values: minutes must be 0–59, seconds must be 0–59.999."
    )
).pipe(
    v.transform((o) => {
        const sign = o.h < 0 ? -1 : 1;
        const hAbs = Math.abs(o.h);

        // HMS → degrees
        const degree =
            sign *
            (hAbs * 15 + (o.m / 60) * 15 + (o.s / 3600) * 15);

        // canonical
        const turn = degree / 360;
        const radian = degree * (Math.PI / 180);
        const gradian = turn * 400;

        return {
            turn,
            radian,
            degree,
            gradian,
            mil: null,

            hms: {
                h: Math.trunc(hAbs) * sign,
                m: o.m,
                s: o.s,
            },
        };
    })
);

/**
* OUTPUT TYPE — ANGLE HMS
*
* SUMMARY
*   Represents a validated Right Ascension angle expressed in the
*   astronomical Hour–Minute–Second format, with canonical unit conversions
*   and a domain-specific HMS representation.
*/
export type AngleHms = v.InferOutput<typeof angleHms>;

/**
 * ANGLE–HOUR SCHEMA (ASTRONOMICAL RIGHT ASCENSION HOUR UNIT)
 *
 * SUMMARY
 *   Validates and normalizes an angular value expressed in **astronomical
 *   hours**, the primary unit for **Right Ascension (RA)**. This is the
 *   numeric version of HMS, where:
 *
 *       24 hours = 360°
 *       1 hour   = 15°
 *
 *   RA-hour values are used extensively in:
 *     • celestial coordinate systems (RA/Dec)
 *     • star catalogs and ephemerides
 *     • telescope slewing and tracking systems
 *     • orbital mechanics & ground station targeting
 *
 *   This schema accepts a **single finite number** representing hours, and
 *   outputs:
 *
 *     - turn
 *     - radian
 *     - degree
 *     - gradian
 *     - mil (null for non-artillery domains)
 *
 *     - domain-specific:
 *         { hour: number }   // normalized modulo 24
 *
 *
 * PURPOSE
 *   Provides a high-precision, standards-compliant converter for RA-hour
 *   angles, suitable for:
 *
 *     - astronomical software
 *     - telescope control (GoTo, tracking loops)
 *     - satellite tracking & ground station alignment
 *     - astronomical dataset ingestion pipelines
 *     - astrophotography pointing automation
 *
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - any finite numeric hour value
 *     - may be outside 0–24 (schema wraps automatically)
 *
 *   REJECTS:
 *     - NaN
 *     - ±Infinity
 *     - non-numeric values
 *
 *
 * OUTPUT CONTRACT
 *   Returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: null;
 *
 *     hour: number;   // normalized, 0 ≤ hour < 24
 *   }
 *   ```
 *
 *
 * NORMALIZATION LOGIC
 *
 *   Step 1: Validate hour is finite.
 *
 *   Step 2: Normalize modulo 24:
 *       hour = ((raw % 24) + 24) % 24
 *
 *   Step 3: Convert to canonical degrees:
 *       degree = hour * 15
 *
 *   Step 4: Convert to canonical units:
 *       turn    = degree / 360
 *       radian  = degree * (π / 180)
 *       gradian = turn * 400
 *       mil     = null
 *
 *
 * EXAMPLES
 *   ```
 *   parse(angleHour, 1)        // → 15 degrees
 *   parse(angleHour, 12)       // → 180 degrees
 *   parse(angleHour, 25)       // → 1 hour → 15 degrees
 *   parse(angleHour, -3)       // → 21 hours → 315 degrees
 *   ```
 */
export const angleHour = v
    .number("Hour angle must be a numeric value.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Hour angle must be finite."
        )
    )
    .pipe(
        v.transform((raw) => {
            // Step 2: Normalize hour into 0–23.999...
            const hour = ((raw % 24) + 24) % 24;

            // Step 3: Convert hour → degrees
            const degree = hour * 15;

            // Step 4: Canonical units
            const turn = degree / 360;
            const radian = degree * (Math.PI / 180);
            const gradian = turn * 400;

            return {
                turn,
                radian,
                degree,
                gradian,
                mil: null,

                hour,
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE HOUR
*
* SUMMARY
*   Represents a validated and normalized astronomical hour-unit angle
*   (Right Ascension), including canonical multi-unit conversions and
*   the domain-specific normalized `hour` field.
*/
export type AngleHour = v.InferOutput<typeof angleHour>;

/**
 * ANGLE–ASTRONOMICAL-ZENITH SCHEMA
 *
 * SUMMARY
 *   Validates and normalizes an **astronomical zenith angle**, the angular
 *   separation between the observer's **zenith** (point directly overhead)
 *   and a celestial object (Sun, Moon, star, satellite).
 *
 *   Zenith angle (Z) is defined by:
 *
 *       Z = 0°      → object directly overhead
 *       Z = 90°     → object on the horizon
 *       Z > 90°     → object below horizon
 *
 *   Physical constraints:
 *
 *       0° ≤ Z ≤ 180°
 *
 *   Accepts any finite number (degrees) and produces:
 *
 *       - turn
 *       - radian
 *       - degree
 *       - gradian
 *       - mil (null)
 *
 *       - plus domain-specific astronomy block:
 *           {
 *             isOverhead: boolean;
 *             isHorizon: boolean;
 *             isBelowHorizon: boolean;
 *             classification: "overhead" | "horizon" | "below-horizon";
 *           }
 *
 *
 * PURPOSE
 *   Provides strict astronomical normalization and classification used in:
 *     - solar engineering (PV efficiency, irradiance models)
 *     - climate modeling
 *     - atmospheric physics
 *     - astronomical observatories
 *     - telescope control systems
 *     - space weather & ionospheric interactions
 *
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - any finite numeric degree value
 *
 *   REJECTS:
 *     - NaN
 *     - ±Infinity
 *     - non-numerics
 *     - values outside physically meaningful range: 0–180°
 *
 *
 * OUTPUT CONTRACT
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: null;
 *
 *     zenith: {
 *       isOverhead: boolean;
 *       isHorizon: boolean;
 *       isBelowHorizon: boolean;
 *       classification: "overhead" | "horizon" | "below-horizon";
 *     };
 *   }
 *   ```
 *
 *
 * NORMALIZATION LOGIC
 *
 *   Step 1 — Validate input is finite.
 *
 *   Step 2 — Clamp to physical bounds:
 *        if (deg < 0) throw;
 *        if (deg > 180) throw;
 *
 *   Step 3 — Classification:
 *        if Z === 0°      → overhead
 *        if Z === 90°     → horizon
 *        if Z < 90°       → above horizon
 *        if Z > 90°       → below horizon
 *
 *   Step 4 — Canonical unit conversions.
 *
 *
 * EXAMPLES
 *   ```
 *   parse(angleZenith, 0);
 *   // → overhead
 *
 *   parse(angleZenith, 90);
 *   // → horizon
 *
 *   parse(angleZenith, 120);
 *   // → below horizon
 *   ```
 */
export const angleZenith = v
    .number("Zenith angle must be numeric.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Zenith angle must be finite."
        )
    )
    .pipe(
        v.custom(
            (x) => x >= 0 && x <= 180,
            "Zenith angle must be between 0° and 180°."
        )
    )
    .pipe(
        v.transform((degree) => {
            // classification
            let classification: "overhead" | "horizon" | "below-horizon";

            if (degree === 0) classification = "overhead";
            else if (degree === 90) classification = "horizon";
            else if (degree < 90) classification = "overhead";
            else classification = "below-horizon";

            const isOverhead = degree < 90 || degree === 0;
            const isHorizon = degree === 90;
            const isBelowHorizon = degree > 90;

            // canonical units
            const turn = degree / 360;
            const radian = degree * (Math.PI / 180);
            const gradian = turn * 400;

            return {
                turn,
                radian,
                degree,
                gradian,
                mil: null,

                zenith: {
                    isOverhead,
                    isHorizon,
                    isBelowHorizon,
                    classification,
                },
            };
        })
    );

/**
* OUTPUT TYPE — ASTRONOMICAL ZENITH ANGLE
*
* SUMMARY
*   Represents a validated zenith angle with canonical multi-unit formats
*   and domain-specific elevation-classification metadata.
*/
export type AngleZenith = v.InferOutput<typeof angleZenith>;

/**
 * ANGLE–EULER SCHEMA (YAW / PITCH / ROLL — 3D ORIENTATION)
 *
 * SUMMARY
 *   Validates and normalizes a 3-axis **Euler angle orientation**, expressed as:
 *
 *       yaw   (Z rotation)
 *       pitch (Y rotation)
 *       roll  (X rotation)
 *
 *   Euler angles describe complete 3D orientation and are used in:
 *     • robotics (ROS TF, IMU fusion)
 *     • aerospace (attitude control, AHRS)
 *     • animation systems
 *     • AR/VR head tracking
 *     • camera & gimbal systems
 *
 *   The schema accepts:
 *
 *     • object:
 *       {
 *         yaw: number;
 *         pitch: number;
 *         roll: number;
 *         order?: "XYZ" | "XZY" | "YXZ" | "YZX" | "ZXY" | "ZYX";
 *       }
 *
 *     yaw/pitch/roll in degrees (common convention)
 *
 *   Outputs canonical multi-unit angle fields computed from **the yaw axis**
 *   plus a domain-specific Euler block.
 *
 *
 * PURPOSE
 *   Provides a precise, platform-agnostic representation of 3D orientation that:
 *     - preserves rotation order
 *     - normalizes angles to canonical units
 *     - avoids inconsistent wrap ranges
 *     - offers consistent orientation metadata
 *
 *   This schema is intended as a safe, standards-compliant format for:
 *     • robotics middleware
 *     • flight-control & drone stabilization
 *     • satellite & spacecraft attitude
 *     • VR/AR head/hand tracking
 *
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - yaw, pitch, roll are finite numbers (degrees)
 *     - order optional; defaults to "ZYX" (aerospace convention)
 *
 *   REJECTS:
 *     - NaN
 *     - Infinity
 *     - bad rotation order strings
 *     - non-numeric angle values
 *
 *
 * OUTPUT CONTRACT
 *   Returns:
 *   ```
 *   {
 *     turn: number;     // based on yaw
 *     radian: number;   // yaw → rad
 *     degree: number;   // yaw normalized
 *     gradian: number;  // yaw normalized
 *     mil: null;
 *
 *     euler: {
 *       yaw: number;      // normalized 0–360
 *       pitch: number;    // normalized -180–180
 *       roll: number;     // normalized -180–180
 *       order: "XYZ"|"XZY"|"YXZ"|"YZX"|"ZXY"|"ZYX";
 *     };
 *   }
 *   ```
 *
 *   NOTE:
 *     - yaw uses full [0–360) normalization  
 *     - pitch/roll use [-180, 180) normalization  
 *
 *
 * NORMALIZATION RULES
 *
 *   1. yaw:
 *        yawNorm = ((yaw % 360) + 360) % 360
 *
 *   2. pitch:
 *        pitchNorm = wrapTo180(pitch)
 *
 *   3. roll:
 *        rollNorm = wrapTo180(roll)
 *
 *   4. canonical units based on yaw:
 *        turn    = yawNorm / 360
 *        radian  = yawNorm * π/180
 *        gradian = turn * 400
 *
 *
 * EXAMPLES
 *   ```
 *   parse(angleEuler, { yaw: 370, pitch: -200, roll: 540 });
 *   // yaw=10°, pitch=160°, roll=180°
 *
 *   parse(angleEuler, { yaw: 45, pitch: 0, roll: 0, order: "XYZ" });
 *   ```
 */
export const angleEuler = v
    .object({
        yaw: v.number("yaw must be numeric."),
        pitch: v.number("pitch must be numeric."),
        roll: v.number("roll must be numeric."),
        order: v
            .optional(
                v.string("order must be a string.").pipe(
                    v.custom(
                        (s) =>
                            ["XYZ", "XZY", "YXZ", "YZX", "ZXY", "ZYX"].includes(s),
                        "Invalid rotation order."
                    )
                )
            )
    })
    .pipe(
        v.custom(
            (o) =>
                Number.isFinite(o.yaw) &&
                Number.isFinite(o.pitch) &&
                Number.isFinite(o.roll),
            "Euler angles must be finite values."
        )
    )
    .pipe(
        v.transform((o) => {
            const { yaw, pitch, roll } = o;

            // yaw normalized to 0–360
            const yawNorm = ((yaw % 360) + 360) % 360;

            // pitch/roll normalized to [-180, 180)
            const wrap180 = (v: number) => {
                const r = ((v + 180) % 360 + 360) % 360 - 180;
                return r === -180 ? 180 : r;
            };

            const pitchNorm = wrap180(pitch);
            const rollNorm = wrap180(roll);

            const degree = yawNorm;
            const turn = degree / 360;
            const radian = degree * (Math.PI / 180);
            const gradian = turn * 400;

            return {
                turn,
                radian,
                degree,
                gradian,
                mil: null,

                euler: {
                    yaw: yawNorm,
                    pitch: pitchNorm,
                    roll: rollNorm,
                    order: o.order ?? "ZYX"
                }
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE EULER
*
* SUMMARY
*   Represents a validated, normalized 3D Euler angle orientation, including
*   canonical multi-unit angle fields (based on yaw) and a detailed Euler
*   rotation block (yaw, pitch, roll, order).
*/
export type AngleEuler = v.InferOutput<typeof angleEuler>;

/**
 * ANGLE–QUATERNION SCHEMA (W/X/Y/Z — NORMALIZED ROTATION)
 *
 * SUMMARY
 *   Validates and normalizes a 4-component quaternion representing 3D
 *   orientation. Quaternions provide singularity-free rotation used widely in:
 *     - aerospace attitude control
 *     - drone navigation
 *     - robotics (ROS TF frames)
 *     - animation engines (Unity, Unreal)
 *     - VR/AR headset & controller tracking
 *
 *   Accepts:
 *     { w, x, y, z }
 *
 *   Computes:
 *     - normalized unit quaternion
 *     - primary rotation angle (degrees/radians/turn/gradian/mil)
 *     - rotation axis
 *
 *
 * PURPOSE
 *   Provide a canonical, stable, rotation-safe orientation schema compatible
 *   with high-precision systems including IMUs, flight control loops, SLAM,
 *   XR motion tracking, PID attitude controllers, and animation pipelines.
 *
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - finite numbers for w/x/y/z
 *     - non-zero quaternion magnitude
 *
 *   REJECTS:
 *     - NaN
 *     - Infinity
 *     - all-zero quaternion
 *     - degenerate magnitude
 *
 *
 * OUTPUT CONTRACT
 *   Always returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number | null;
 *
 *     quaternion: {
 *       w: number;   // normalized
 *       x: number;
 *       y: number;
 *       z: number;
 *       angle: number; // rotation angle in degrees
 *       axis: [number, number, number]; // normalized axis
 *     };
 *   }
 *   ```
 *
 *
 * NORMALIZATION RULES
 *
 *   1. magnitude = √(w² + x² + y² + z²)
 *   2. q_norm = q / magnitude
 *   3. rotation angle = 2 * acos(w)
 *   4. axis = (x, y, z) / sin(angle/2)
 *
 *   Special case:
 *     - If angle → 0, axis = [0, 0, 1]
 *
 *
 * SEMANTIC NOTES
 *   - Output angle (the magnitude of rotation) is used for the primary scalar
 *     angle fields (turn/radian/degree/gradian/mil).
 *
 *
 * EXAMPLES
 *   ```
 *   parse(angleQuaternion, { w: 1, x: 0, y: 0, z: 0 });
 *   // Zero rotation
 *
 *   parse(angleQuaternion, { w: 0.9239, x: 0, y: 0.3827, z: 0 });
 *   // 45° yaw
 *   ```
 */
export const angleQuaternion = v
    .object({
        w: v.number("w must be numeric."),
        x: v.number("x must be numeric."),
        y: v.number("y must be numeric."),
        z: v.number("z must be numeric.")
    })
    .pipe(
        v.custom(
            (o) =>
                Number.isFinite(o.w) &&
                Number.isFinite(o.x) &&
                Number.isFinite(o.y) &&
                Number.isFinite(o.z),
            "Quaternion components must be finite numbers."
        )
    )
    .pipe(
        v.custom(
            (o) => {
                const m = Math.hypot(o.w, o.x, o.y, o.z);
                return m > 0 && Number.isFinite(m);
            },
            "Quaternion magnitude must be non-zero."
        )
    )
    .pipe(
        v.transform((o) => {
            const { w, x, y, z } = o;

            // Normalize
            const mag = Math.hypot(w, x, y, z);
            const nw = w / mag;
            const nx = x / mag;
            const ny = y / mag;
            const nz = z / mag;

            // Angle
            const angleRad = 2 * Math.acos(Math.min(1, Math.max(-1, nw))); // clamp
            const angleDeg = angleRad * (180 / Math.PI);
            const angleTurn = angleDeg / 360;
            const angleGrad = angleTurn * 400;

            // Axis
            const sinHalf = Math.sqrt(1 - nw * nw);
            let axis: [number, number, number];

            if (sinHalf < 1e-12) {
                axis = [0, 0, 1]; // arbitrary axis for zero rotation
            } else {
                axis = [nx / sinHalf, ny / sinHalf, nz / sinHalf];
            }

            return {
                turn: angleTurn,
                radian: angleRad,
                degree: angleDeg,
                gradian: angleGrad,
                mil: null,

                quaternion: {
                    w: nw,
                    x: nx,
                    y: ny,
                    z: nz,
                    angle: angleDeg,
                    axis
                }
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE QUATERNION
*
* SUMMARY
*   Represents a normalized unit quaternion with derived primary rotation
*   magnitude and canonical axis-angle representation.
*/
export type AngleQuaternion = v.InferOutput<typeof angleQuaternion>;

/**
 * ANGLE–POLAR SCHEMA (R, Θ — 2D POLAR COORDINATE)
 *
 * SUMMARY
 *   Validates and normalizes a 2D polar coordinate pair (radius + angular
 *   direction). Polar coordinates are foundational in:
 *     - 2D robotics & navigation
 *     - mapping and geospatial systems
 *     - signal analysis / complex numbers
 *     - mathematical plotting
 *     - radar / sonar / lidar returns
 *     - orbital mechanics (2D approximations)
 *
 *   The schema:
 *     - validates radius and angle
 *     - normalizes all equivalent angle representations
 *     - produces a canonical rotation (turns, radians, degrees, gradians, mils)
 *     - outputs normalized polar coordinate + Cartesian projection
 *
 *
 * PURPOSE
 *   Provide a consistent, canonical polar-angle representation used throughout
 *   mathematical, physics, navigation, and robotics pipelines.
 *
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     {
 *       r: number >= 0
 *       theta: number (finite, any unit assumed degrees unless specified)
 *     }
 *
 *   REJECTS:
 *     - negative radius
 *     - non-finite radius or angle
 *
 *
 * OUTPUT CONTRACT
 *   Always returns:
 *   ```
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;
 *     gradian: number;
 *     mil: number | null;
 *
 *     polar: {
 *       r: number;
 *       theta: number; // degrees, normalized 0–360
 *     };
 *
 *     cartesian: {
 *       x: number;
 *       y: number;
 *     };
 *   }
 *   ```
 *
 *
 * NORMALIZATION RULES
 *
 *   - Negative radii are invalid
 *   - θ normalized to 0–360 degrees
 *   - Cartesian projection computed as:
 *       x = r * cos(θ° * π/180)
 *       y = r * sin(θ° * π/180)
 *
 *
 * SEMANTIC NOTES
 *   - θ is ALWAYS interpreted as **degrees** for input and normalized output
 *   - All other angle fields are derived from this canonical degree value
 *   - Produces full angle suite for downstream math engines
 *
 *
 * EXAMPLES
 *   ```
 *   parse(anglePolar, { r: 10, theta: 45 });
 *   // {
 *   //   turn: 0.125,
 *   //   radian: 0.785398,
 *   //   degree: 45,
 *   //   ...
 *   //   cartesian: { x: 7.07, y: 7.07 }
 *   // }
 *   ```
 */
export const anglePolar = v
    .object({
        r: v.number("Radius must be a number."),
        theta: v.number("Angle θ must be a number.")
    })
    .pipe(
        v.custom(
            (o) =>
                Number.isFinite(o.r) &&
                Number.isFinite(o.theta) &&
                o.r >= 0,
            "Invalid polar coordinate: r must be ≥ 0 and finite; θ must be finite."
        )
    )
    .pipe(
        v.transform((o) => {
            const r = o.r;
            let thetaDeg = ((o.theta % 360) + 360) % 360; // normalize
            const thetaRad = thetaDeg * (Math.PI / 180);
            const thetaTurn = thetaDeg / 360;
            const thetaGrad = thetaTurn * 400;

            return {
                turn: thetaTurn,
                radian: thetaRad,
                degree: thetaDeg,
                gradian: thetaGrad,
                mil: null,

                polar: {
                    r,
                    theta: thetaDeg
                },

                cartesian: {
                    x: r * Math.cos(thetaRad),
                    y: r * Math.sin(thetaRad)
                }
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE–POLAR
*
* SUMMARY
*   Represents a validated polar coordinate and its canonical angular
*   equivalents: turn, radian, degree, gradian, and mil.
*/
export type AnglePolar = v.InferOutput<typeof anglePolar>;

/**
 * ANGLE–AZIMUTH SCHEMA
 *
 * SUMMARY
 *   Validates and normalizes an **azimuth angle**—a directional heading
 *   measured clockwise from true North. This is one of the most widely used
 *   directional primitives across GIS, surveying, aviation, maritime
 *   navigation, robotics, solar engineering, and antenna pointing.
 *
 *   Canonical range:
 *       0° ≤ azimuth < 360°
 *
 *
 * PURPOSE
 *   Provides a consistent, canonical heading value suitable for:
 *     - map/navigation engines
 *     - compass/gyro fusion systems
 *     - drone & robot path planning
 *     - geospatial geometry
 *     - solar-angle calculations
 *     - orientation-based telemetry
 *
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - any finite number representing degrees
 *     - negative angles (normalized)
 *     - values ≥ 360° (normalized)
 *
 *   REJECTS:
 *     - NaN
 *     - ±Infinity
 *     - non-numeric values
 *
 *
 * OUTPUT CONTRACT
 *   Always returns:
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;      // normalized 0–360
 *     gradian: number;
 *     mil: number | null;
 *
 *     azimuth: {
 *       cardinal: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
 *       quadrant: "NE" | "SE" | "SW" | "NW";
 *       sector: number; // 0–7 (45° bins)
 *     };
 *   }
 *
 *
 * NORMALIZATION RULES
 *   - θnorm = ((θ % 360) + 360) % 360
 *   - cardinal mapping every 45°
 *   - quadrant mapping every 90°
 *
 *
 * SEMANTIC NOTES
 *   - Returned angle is canonical & unambiguous
 *   - Avoids floating edge-case drift at 360° → 0°
 *   - This schema does **not** handle magnetic declination; that belongs to a
 *     separate “magnetic azimuth” module.
 *
 *
 * EXAMPLES
 *   ```
 *   parse(angleAzimuth, 450);
 *   // → 90°, E
 *
 *   parse(angleAzimuth, -45);
 *   // → 315°, NW
 *   ```
 */
export const angleAzimuth = v
    .number("Azimuth must be numeric.")
    .pipe(v.custom((x) => Number.isFinite(x), "Azimuth must be finite."))
    .pipe(
        v.transform((inputDeg) => {
            // normalize into [0, 360)
            const degree = ((inputDeg % 360) + 360) % 360;

            const radian = degree * (Math.PI / 180);
            const turn = degree / 360;
            const gradian = turn * 400;

            // sector 0–7 → 45° bins
            const sector = Math.floor(degree / 45);

            const cardinalMap = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
            const cardinal = cardinalMap[sector];

            const quadrant =
                degree < 90
                    ? "NE"
                    : degree < 180
                        ? "SE"
                        : degree < 270
                            ? "SW"
                            : "NW";

            return {
                turn,
                radian,
                degree,
                gradian,
                mil: null,

                azimuth: {
                    cardinal,
                    quadrant,
                    sector
                }
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE–AZIMUTH
*
* SUMMARY
*   Represents a canonical azimuth heading normalized to 0–360° and enriched
*   with navigation-appropriate metadata (cardinal, quadrant, sector).
*/
export type AngleAzimuth = v.InferOutput<typeof angleAzimuth>;

/**
 * ANGLE–BEARING SCHEMA
 *
 * SUMMARY
 *   Validates and normalizes a **compass quadrant bearing**, a directional
 *   system used in land navigation, surveying, civil engineering, and certain
 *   GIS formats. Bearings express orientation as:
 *
 *       {N|S} θ {E|W}
 *
 *   Example:
 *       "N 30° E" → 30°
 *       "S 45° W" → 225°
 *
 *   Canonical absolute azimuth (0–360°) is computed from the quadrant rule.
 *
 *
 * PURPOSE
 *   Provide a precise, canonical, machine-ready representation of a bearing
 *   in absolute angle units suitable for:
 *     - surveying computations
 *     - mapping systems
 *     - navigation engines
 *     - field-instrument ingestion
 *     - robotic movement planning
 *
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - string in any of the formats:
 *         "N 30 E"
 *         "S45W"
 *         "N 10°W"
 *         "N10W"
 *
 *   REQUIREMENTS:
 *     - primary cardinal: N or S
 *     - secondary cardinal: E or W
 *     - angle: finite, > 0, ≤ 90
 *
 *   REJECTS:
 *     - cardinal ordering reversed (e.g., "E 30 N")
 *     - angles ≤ 0 or > 90
 *     - malformed strings
 *
 *
 * OUTPUT CONTRACT
 *   Always returns:
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;   // absolute azimuth
 *     gradian: number;
 *     mil: number | null;
 *
 *     bearing: {
 *       primary: "N" | "S";
 *       secondary: "E" | "W";
 *       angle: number; // 0–90
 *     };
 *   }
 *
 *
 * NORMALIZATION LOGIC
 *   QUADRANT RULES:
 *     N θ E → azimuth = θ
 *     S θ E → azimuth = 180 − θ
 *     S θ W → azimuth = 180 + θ
 *     N θ W → azimuth = 360 − θ
 *
 *
 * SEMANTIC NOTES
 *   Bearings are *not* interchangeable with azimuths; they encode quadrant
 *   information explicitly. The schema preserves both raw and normalized forms.
 *
 *
 * EXAMPLES
 *   ```
 *   parse(angleBearing, "N 30 E")
 *   // degree = 30°
 *
 *   parse(angleBearing, "S45W")
 *   // degree = 225°
 *   ```
 */
export const angleBearing = v
    .string("Bearing must be a string.")
    .pipe(
        v.transform((raw) => {
            const input = raw.replace(/\s+/g, "").toUpperCase();

            // Regex: N/S + angle + E/W
            const match = input.match(/^([NS])(\d+(?:\.\d+)?)[°]?([EW])$/);
            if (!match) {
                throw new Error(
                    "Bearing must be in the form NθE, SθW, etc. (e.g., 'N30E', 'S45W')."
                );
            }

            const [, primary, angleStr, secondary] = match;

            const angle = Number(angleStr);
            if (!Number.isFinite(angle) || angle <= 0 || angle > 90) {
                throw new Error("Bearing angle must be > 0 and ≤ 90 degrees.");
            }

            // Compute absolute azimuth
            let degree: number;
            if (primary === "N" && secondary === "E") degree = angle;
            else if (primary === "S" && secondary === "E") degree = 180 - angle;
            else if (primary === "S" && secondary === "W") degree = 180 + angle;
            else degree = 360 - angle; // N W

            const radian = degree * (Math.PI / 180);
            const turn = degree / 360;
            const gradian = turn * 400;

            return {
                turn,
                radian,
                degree,
                gradian,
                mil: null,

                bearing: {
                    primary: primary as "N" | "S",
                    secondary: secondary as "E" | "W",
                    angle
                }
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE–BEARING
*
* SUMMARY
*   Represents a quadrant bearing and its canonical absolute-angle equivalent.
*/
export type AngleBearing = v.InferOutput<typeof angleBearing>;

/**
 * ANGLE–ELEVATION SCHEMA
 *
 * SUMMARY
 *   Validates and normalizes a **vertical elevation (altitude) angle**, widely
 *   used in astronomy, surveying, satellite acquisition, solar engineering,
 *   aviation approach guidance, and environmental radiance modeling.
 *
 *   Physical domain:
 *
 *       -90°  = nadir (directly downward)
 *         0°  = horizon
 *       +90°  = zenith (directly overhead)
 *
 *
 * PURPOSE
 *   Produces a canonical elevation angle suitable for:
 *     - astronomical coordinate systems
 *     - satellite pointing and tracking
 *     - solar-position calculations (paired with azimuth)
 *     - GNSS / radar / lidar geometry
 *     - atmospheric-scattering models
 *
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - any finite number within [−90, +90]
 *
 *   REJECTS:
 *     - NaN
 *     - ±Infinity
 *     - values outside physical bounds
 *
 *
 * OUTPUT CONTRACT
 *   Always returns:
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;    // preserved & validated
 *     gradian: number;
 *     mil: null;
 *
 *     elevation: {
 *       isZenith: boolean;
 *       isNadir: boolean;
 *       isHorizon: boolean;
 *       classification: "zenith" | "nadir" | "horizon" | "above-horizon" | "below-horizon";
 *     };
 *   }
 *
 *
 * NORMALIZATION RULES
 *   - elevation ∈ [−90, +90]
 *   - classification:
 *       +90 → zenith
 *         0 → horizon
 *       −90 → nadir
 *       >0 → above horizon
 *       <0 → below horizon
 *
 *
 * SEMANTIC NOTES
 *   Elevation pairs with azimuth to form the **horizontal coordinate system**:
 *       (azimuth, elevation)
 *
 *   This schema does *not* compute solar position or atmospheric refraction.
 *
 *
 * EXAMPLES
 *   ```
 *   parse(angleElevation, 45);
 *   // → above-horizon
 *
 *   parse(angleElevation, -10);
 *   // → below-horizon
 *
 *   parse(angleElevation, 90);
 *   // → zenith
 *   ```
 */
export const angleElevation = v
    .number("Elevation must be numeric.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Elevation angle must be finite."
        )
    )
    .pipe(
        v.custom(
            (x) => x >= -90 && x <= 90,
            "Elevation angle must be between −90° and +90°."
        )
    )
    .pipe(
        v.transform((degree) => {
            const radian = degree * (Math.PI / 180);
            const turn = degree / 360;
            const gradian = turn * 400;

            // Classification
            let classification:
                | "zenith"
                | "nadir"
                | "horizon"
                | "above-horizon"
                | "below-horizon";

            if (degree === 90) classification = "zenith";
            else if (degree === -90) classification = "nadir";
            else if (degree === 0) classification = "horizon";
            else if (degree > 0) classification = "above-horizon";
            else classification = "below-horizon";

            return {
                turn,
                radian,
                degree,
                gradian,
                mil: null,

                elevation: {
                    isZenith: degree === 90,
                    isNadir: degree === -90,
                    isHorizon: degree === 0,
                    classification
                }
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE–ELEVATION
*
* SUMMARY
*   Represents a validated elevation (altitude) angle with canonical unit
*   conversions and semantic classifications.
*/
export type AngleElevation = v.InferOutput<typeof angleElevation>;

/**
 * ANGLE–MAP-NORTH SCHEMA
 *
 * SUMMARY
 *   Validates and normalizes a **map-north convergence angle**, the angular
 *   difference between grid north (map projection north) and true geographic
 *   north. This is fundamental in:
 *
 *     - surveying & geodetic fieldwork
 *     - GIS map projections (e.g., UTM, Lambert Conformal Conic)
 *     - aviation & military navigation
 *     - cadastral/parcel mapping
 *     - topographic map interpretation
 *
 *   Convergence angle (γ) typically:
 *       negative → grid north is west of true north
 *       positive → grid north is east of true north
 *
 *
 * PURPOSE
 *   Produces a canonical map-north orientation bundle suitable for:
 *     - projection math
 *     - navigation corrections
 *     - compass-to-map conversion
 *     - GNSS → map grid transformations
 *     - surveying instrument setup
 *
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - any finite numeric angle (degrees)
 *
 *   REJECTS:
 *     - NaN
 *     - ±Infinity
 *
 *
 * OUTPUT CONTRACT
 *   Always returns:
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;     // exact input
 *     gradian: number;
 *     mil: number | null;
 *
 *     mapNorth: {
 *       isZero: boolean;
 *       isEastOfTrue: boolean;
 *       isWestOfTrue: boolean;
 *       classification: "zero" | "east" | "west";
 *     };
 *   }
 *
 *
 * NORMALIZATION RULES
 *   - Degree input is **not** wrapped (unlike azimuth)
 *     because map convergence angle can legitimately exceed ±360° in transformed
 *     calculations.
 *
 *   - Classification:
 *       degree === 0 → zero
 *       degree > 0 → east-of-true
 *       degree < 0 → west-of-true
 *
 *
 * SEMANTIC NOTES
 *   - This schema does *not* compute true north, magnetic north, or grid north.
 *   - It only validates the convergence offset.
 *   - Declination and grid deviation belong in separate modules.
 *
 *
 * EXAMPLES
 *   ```
 *   parse(angleMapNorth, 2.3);
 *   // → east-of-true
 *
 *   parse(angleMapNorth, -1.1);
 *   // → west-of-true
 *   ```
 */
export const angleMapNorth = v
    .number("Map-north convergence must be numeric.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Map-north convergence must be finite."
        )
    )
    .pipe(
        v.transform((degree) => {
            const radian = degree * (Math.PI / 180);
            const turn = degree / 360;
            const gradian = turn * 400;

            let classification: "zero" | "east" | "west";

            if (degree === 0) classification = "zero";
            else if (degree > 0) classification = "east";
            else classification = "west";

            return {
                turn,
                radian,
                degree,
                gradian,
                mil: null,

                mapNorth: {
                    isZero: degree === 0,
                    isEastOfTrue: degree > 0,
                    isWestOfTrue: degree < 0,
                    classification
                }
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE–MAP-NORTH
*
* SUMMARY
*   Represents a validated map-north convergence angle with multi-unit
*   conversion and direction-of-deviation metadata.
*/
export type AngleMapNorth = v.InferOutput<typeof angleMapNorth>;

/**
 * ANGLE–DECLINATION SCHEMA
 *
 * SUMMARY
 *   Validates and normalizes **magnetic declination**, the angular difference
 *   between magnetic north (compass direction) and true geographic north.
 *   
 *   Convention:
 *     - Positive value   → East declination (magnetic north east of true)
 *     - Negative value   → West declination (magnetic north west of true)
 *     - Zero             → No declination
 *
 *
 * PURPOSE
 *   Produces a canonical, machine-ready representation of magnetic declination
 *   for use in:
 *     - compass-to-map conversions
 *     - GNSS correction logic
 *     - field-survey workflows
 *     - GIS coordinate transformations
 *     - aviation/navigation instrumentation
 *
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - any finite numeric angle (degrees), including ±Infinity-range,
 *       though physically declination is typically within ±30°.
 *
 *   REJECTS:
 *     - NaN
 *     - ±Infinity
 *
 *
 * OUTPUT CONTRACT
 *   Returns:
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;       // preserved
 *     gradian: number;
 *     mil: null;
 *
 *     declination: {
 *       isZero: boolean;
 *       isEast: boolean;
 *       isWest: boolean;
 *       classification: "zero" | "east" | "west";
 *     };
 *   }
 *
 *
 * NORMALIZATION LOGIC
 *   - Degree value is not wrapped (unlike azimuth) because declination
 *     mathematically can exceed ±360° during computations.
 *  
 *   - Classification:
 *       0   → "zero"
 *       > 0 → "east"
 *       < 0 → "west"
 *
 *
 * SEMANTIC NOTES
 *   - This schema does not apply geomagnetic models (WMM/IGRF).
 *   - It only validates a provided declination measurement.
 *   - Magnetic deviation (local anomalies) is NOT included.
 *
 *
 * EXAMPLES
 *   ```
 *   parse(angleDeclination, 13.2)
 *   // → classification: "east"
 *
 *   parse(angleDeclination, -7.5)
 *   // → classification: "west"
 *   ```
 */
export const angleDeclination = v
    .number("Magnetic declination must be numeric.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Magnetic declination must be a finite number."
        )
    )
    .pipe(
        v.transform((degree) => {
            const radian = degree * (Math.PI / 180);
            const turn = degree / 360;
            const gradian = turn * 400;

            let classification: "zero" | "east" | "west";
            if (degree === 0) classification = "zero";
            else if (degree > 0) classification = "east";
            else classification = "west";

            return {
                turn,
                radian,
                degree,
                gradian,
                mil: null,

                declination: {
                    isZero: degree === 0,
                    isEast: degree > 0,
                    isWest: degree < 0,
                    classification
                }
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE–DECLINATION
*
* SUMMARY
*   Represents a validated magnetic declination angle with canonical unit
*   conversions and east/west classification semantics.
*/
export type AngleDeclination = v.InferOutput<typeof angleDeclination>;

/**
 * ANGLE–ROTATION-2D SCHEMA
 *
 * SUMMARY
 *   Validates and normalizes a **pure 2D rotation angle**, allowing unlimited
 *   revolutions both clockwise and counterclockwise. This schema forms the
 *   foundational angular primitive for:
 *
 *     - 2D game engines
 *     - robotics & motion planning
 *     - coordinate transforms
 *     - animation systems
 *     - geometry libraries
 *     - signal processing
 *     - physics simulation (rigid body rotation)
 *
 *   Input may be any finite number, including:
 *     - negative angles
 *     - angles exceeding ±360°
 *     - multiple full rotations
 *
 *   Output always includes:
 *     - canonical rotation: 0 <= degree < 360
 *     - original input rotation
 *     - number of full revolutions
 *     - direction (CW/CCW/none)
 *
 *
 * PURPOSE
 *   Provide a consistent, canonical rotation angle along with metadata for
 *   systems that require:
 *     - rotation wrapping
 *     - deterministic normalization
 *     - motion direction inference
 *     - multi-unit angle representations
 *
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - any finite numeric value
 *
 *   REJECTS:
 *     - NaN
 *     - ±Infinity
 *
 *
 * OUTPUT CONTRACT
 *   Returns:
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;        // wrapped 0–360
 *     gradian: number;
 *     mil: number | null;
 *
 *     rotation: {
 *       input: number;       // raw input angle
 *       wrapped: number;     // canonical degree
 *       revolutions: number; // signed full turns
 *       direction: "none" | "cw" | "ccw";
 *     };
 *   }
 *
 *
 * NORMALIZATION RULES
 *   - wrapped = ((input % 360) + 360) % 360
 *   - revolutions = input / 360
 *   - direction:
 *       input === 0     → "none"
 *       input > 0       → "ccw"
 *       input < 0       → "cw"
 *
 *
 * SEMANTIC NOTES
 *   - Canonicalized rotation ensures all systems reference the same baseline
 *     angular domain.
 *   - Signed revolutions preserve how many full turns occurred.
 *   - The schema deliberately does NOT clamp angles to physical bounds.
 *
 *
 * EXAMPLES
 *   ```
 *   parse(angleRotation2D, 1080);
 *   // → wrapped: 0°, revolutions: 3, direction: "ccw"
 *
 *   parse(angleRotation2D, -450);
 *   // → wrapped: 270°, revolutions: -1.25, direction: "cw"
 *   ```
 */
export const angleRotation2D = v
    .number("Rotation angle must be numeric.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Rotation angle must be a finite number."
        )
    )
    .pipe(
        v.transform((input) => {
            const wrapped = ((input % 360) + 360) % 360;

            const revolutions = input / 360;

            const direction =
                input === 0 ? "none" : input > 0 ? "ccw" : "cw";

            const radian = wrapped * (Math.PI / 180);
            const turn = wrapped / 360;
            const gradian = turn * 400;

            return {
                turn,
                radian,
                degree: wrapped,
                gradian,
                mil: null,

                rotation: {
                    input,
                    wrapped,
                    revolutions,
                    direction
                }
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE–ROTATION-2D
*
* SUMMARY
*   Represents a validated pure 2D rotation angle with canonical wrapping,
*   revolution count, and rotation direction metadata.
*/
export type AngleRotation2D = v.InferOutput<typeof angleRotation2D>;

/**
 * ANGLE–HEADING SCHEMA
 *
 * SUMMARY
 *   Validates and normalizes a **heading angle**, representing the direction of
 *   actual motion of an object (velocity vector), measured clockwise from
 *   true North. Heading is conceptually distinct from:
 *
 *     - bearing  (direction object points)
 *     - azimuth  (direction of reference vector)
 *     - course   (intended direction)
 *
 *   Heading is used in:
 *     - aviation & maritime navigation
 *     - autonomous vehicle control
 *     - robotics & SLAM
 *     - GPS track-angle reporting
 *     - physics engines & vector kinematics
 *
 *
 * PURPOSE
 *   Produce a normalized, canonical, machine-ready heading with full unit
 *   conversions and motion-semantic classification.
 *
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - any finite numeric angle
 *
 *   REJECTS:
 *     - NaN
 *     - ±Infinity
 *
 *
 * OUTPUT CONTRACT
 *   Returns:
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;     // normalized 0–360
 *     gradian: number;
 *     mil: number | null;
 *
 *     heading: {
 *       cardinal: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
 *       sector: number;  // 0–7, 45° bins
 *       isCardinal: boolean;
 *       isIntercardinal: boolean;
 *     };
 *   }
 *
 *
 * NORMALIZATION RULES
 *   wrapped = ((input % 360) + 360) % 360
 *
 *   cardinal directions every 45°:
 *     0°   → N
 *     45°  → NE
 *     90°  → E
 *     ...
 *     315° → NW
 *
 *
 * SEMANTIC NOTES
 *   - Heading is an *actual* movement direction, not the facing direction.
 *   - Course-over-ground (COG) typically equals heading if no drift exists.
 *
 *
 * EXAMPLES
 *   ```
 *   parse(angleHeading, 450);
 *   // → 90°, E
 *
 *   parse(angleHeading, -10);
 *   // → 350°, NW
 *   ```
 */
export const angleHeading = v
    .number("Heading must be numeric.")
    .pipe(
        v.custom((x) => Number.isFinite(x), "Heading must be finite.")
    )
    .pipe(
        v.transform((inputDeg) => {
            // normalize into [0, 360)
            const degree = ((inputDeg % 360) + 360) % 360;

            const radian = degree * (Math.PI / 180);
            const turn = degree / 360;
            const gradian = turn * 400;

            // 45° binning → 0..7
            const sector = Math.floor(degree / 45);

            const cardinalMap = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
            const cardinal = cardinalMap[sector];

            const isCardinal =
                degree === 0 ||
                degree === 90 ||
                degree === 180 ||
                degree === 270;

            const isIntercardinal = !isCardinal;

            return {
                turn,
                radian,
                degree,
                gradian,
                mil: null,

                heading: {
                    cardinal,
                    sector,
                    isCardinal,
                    isIntercardinal
                }
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE–HEADING
*
* SUMMARY
*   Represents a validated heading (direction of motion) normalized into the
*   canonical 0–360° range with cardinal-sector metadata.
*/
export type AngleHeading = v.InferOutput<typeof angleHeading>;

/**
 * ANGLE–NORMALIZED SCHEMA
 *
 * SUMMARY
 *   Validates and normalizes an arbitrary rotation angle into the canonical
 *   closed-open interval:
 *
 *        0° ≤ normalized < 360°
 *
 *   This is the universal standard representation of an angle in mathematics,
 *   physics, navigation, robotics, graphics, and computational geometry.
 *
 *
 * PURPOSE
 *   Provide a single authoritative normalization rule for:
 *     - 2D/3D orientation systems
 *     - rotation matrices & quaternions
 *     - navigation headings
 *     - azimuth & bearing computations
 *     - signal phase wrapping (mod 2π)
 *     - animation/easing engines
 *     - SLAM & spatial robotics
 *
 *   This schema exists so all systems share the same angle normalization
 *   semantics with no ambiguity and no drifting edge-cases.
 *
 *
 * INPUT CONTRACT
 *   ACCEPTS:
 *     - any finite number (degrees)
 *     - negative angles
 *     - angles > 360°
 *     - fractional angles
 *     - arbitrarily large magnitude ±N·360°
 *
 *   REJECTS:
 *     - NaN
 *     - Infinity / -Infinity
 *     - non-numerics
 *
 *
 * OUTPUT CONTRACT
 *   Always returns:
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;       // ∈ [0, 360)
 *     gradian: number;
 *     mil: number | null;
 *
 *     normalized: {
 *       input: number;      // raw angle
 *       wrapped: number;    // 0–360
 *       revolutions: number;// input/360 (signed)
 *       isZero: boolean;
 *       isFullRotation: boolean;
 *     };
 *   }
 *
 *
 * NORMALIZATION LOGIC
 *   - wrapped = ((input % 360) + 360) % 360
 *   - revolutions = input / 360
 *   - isZero = wrapped === 0
 *   - isFullRotation = wrapped === 0 && input !== 0
 *
 *
 * SEMANTIC NOTES
 *   - 360° normalizes to 0°, but `isFullRotation = true`
 *   - Negative multiples of full rotations are preserved in `revolutions`
 *   - Produces a “universal canonical form” used for all angle identities
 *
 *
 * EXAMPLES
 *   ```
 *   parse(angleNormalized, -450)
 *   // → degree = 270°, revolutions = -1.25
 *
 *   parse(angleNormalized, 720)
 *   // → degree = 0°, revolutions = 2, isFullRotation = true
 *   ```
 */
export const angleNormalized = v
    .number("Angle must be numeric.")
    .pipe(
        v.custom(
            (x) => Number.isFinite(x),
            "Angle must be a finite number."
        )
    )
    .pipe(
        v.transform((input) => {
            const wrapped = ((input % 360) + 360) % 360;
            const revolutions = input / 360;

            const isZero = wrapped === 0;
            const isFullRotation = isZero && input !== 0;

            const radian = wrapped * (Math.PI / 180);
            const turn = wrapped / 360;
            const gradian = turn * 400;

            return {
                turn,
                radian,
                degree: wrapped,
                gradian,
                mil: null,

                normalized: {
                    input,
                    wrapped,
                    revolutions,
                    isZero,
                    isFullRotation
                }
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE–NORMALIZED
*
* SUMMARY
*   Represents a canonical normalized angle (0–360°) with unit conversions and
*   revolution/direction metadata.
*/
export type AngleNormalized = v.InferOutput<typeof angleNormalized>;

/**
 * ANGLE–SLOPE SCHEMA
 *
 * SUMMARY
 *   Validates and normalizes a **slope/incline angle**, accepting inputs in any
 *   of the three standard engineering formats:
 *
 *      1. ratio        → { ratio: number }         // rise/run
 *      2. percentage   → { percent: number }       // grade %
 *      3. angle (deg)  → { degree: number }        // θ = arctan(rise/run)
 *
 *   The output always includes:
 *
 *      - slope angle (degree, radian, turn, grad, mil)
 *      - equivalent slope ratio
 *      - equivalent slope percentage
 *      - incline metadata
 *
 *
 * PURPOSE
 *   Provide a single canonical slope descriptor suitable for:
 *     - civil/structural engineering
 *     - GIS elevation modeling
 *     - transportation grade analysis
 *     - accessibility (ADA) compliance
 *     - mechanical physics (inclined plane)
 *     - robotics & locomotion planning
 *
 *
 * INPUT CONTRACT
 *   ACCEPTS (one of):
 *     { ratio: number >= 0 }
 *     { percent: number }
 *     { degree: number }
 *
 *   REJECTS:
 *     - missing or multiple keys
 *     - negative ratios
 *     - infinite/NaN values
 *
 *
 * OUTPUT CONTRACT
 *   Always returns:
 *   {
 *     turn: number;
 *     radian: number;
 *     degree: number;     // slope angle
 *     gradian: number;
 *     mil: number | null;
 *
 *     slope: {
 *       ratio: number;    // rise/run
 *       percent: number;  // (ratio * 100)
 *       angle: number;    // degrees
 *       isFlat: boolean;
 *       isSteep: boolean; // angle >= 30°
 *     };
 *   }
 *
 *
 * NORMALIZATION RULES
 *   If input.ratio:
 *       angle = atan(ratio) in degrees
 *
 *   If input.percent:
 *       ratio = percent / 100
 *       angle = atan(ratio)
 *
 *   If input.degree:
 *       ratio = tan(degree)
 *       percent = ratio * 100
 *
 *
 * SEMANTIC NOTES
 *   - Slope angle is always >= 0 (descending grade is handled elsewhere)
 *   - Does not restrict to civil norms (max legal grades etc.)
 *   - Ratio-based input is most fundamental
 *
 *
 * EXAMPLES
 *   ```
 *   parse(angleSlope, { ratio: 0.1 })
 *   // slope ≈ 5.71°
 *
 *   parse(angleSlope, { percent: 12 })
 *   // slope ≈ 6.84°
 *
 *   parse(angleSlope, { degree: 45 })
 *   // slope.ratio = 1.0
 *   ```
 */
export const angleSlope = v
    .object(
        {
            ratio: v.optional(v.number()),
            percent: v.optional(v.number()),
            degree: v.optional(v.number())
        },
        "Slope must be provided as { ratio }, { percent }, or { degree }."
    )
    .pipe(
        v.custom(
            (o) =>
                Number.isFinite(o.ratio ?? 0) &&
                Number.isFinite(o.percent ?? 0) &&
                Number.isFinite(o.degree ?? 0),
            "Slope values must be finite numbers."
        )
    )
    .pipe(
        v.custom(
            (o) => {
                const keys = ["ratio", "percent", "degree"].filter(
                    (k) => o[k] !== undefined
                );
                return keys.length === 1;
            },
            "Provide exactly ONE of: ratio, percent, degree."
        )
    )
    .pipe(
        v.transform((o) => {
            let ratio: number;
            let percent: number;
            let degree: number;

            if (o.ratio !== undefined) {
                if (o.ratio < 0)
                    throw new Error("Slope ratio cannot be negative.");
                ratio = o.ratio;
                degree = Math.atan(ratio) * (180 / Math.PI);
                percent = ratio * 100;
            } else if (o.percent !== undefined) {
                percent = o.percent;
                ratio = percent / 100;
                degree = Math.atan(ratio) * (180 / Math.PI);
            } else {
                // degree mode
                degree = o.degree!;
                ratio = Math.tan((degree * Math.PI) / 180);
                percent = ratio * 100;
            }

            const radian = degree * (Math.PI / 180);
            const turn = degree / 360;
            const gradian = turn * 400;

            return {
                turn,
                radian,
                degree,
                gradian,
                mil: null,

                slope: {
                    ratio,
                    percent,
                    angle: degree,
                    isFlat: degree === 0,
                    isSteep: degree >= 30
                }
            };
        })
    );

/**
* OUTPUT TYPE — ANGLE–SLOPE
*
* SUMMARY
*   Represents a validated slope in three equivalent forms (ratio, percent,
*   angle) along with canonical unit conversions and incline metadata.
*/
export type AngleSlope = v.InferOutput<typeof angleSlope>;

/*
    TODO:

Navigation / GIS
	1.	GridConvergenceAngle
	2.	MagneticDeviationAngle
	3.	CourseOverGroundAngle
	4.	TrackAngleError
	5.	DriftAngle
	6.	CrossTrackAngle
	7.	BearingErrorAngle
	8.	IntersectionAngle
	9.	DeflectionAngle
	10.	TraverseInternalAngle
	11.	TraverseExternalAngle
	12.	ProjectionRotationAngle
	13.	MeridianConvergenceAngle
	14.	BackBearingAngle
	15.	TriangulationAngle

⸻

Astronomy
	16.	SolarHourAngle
	17.	SolarDeclinationAngle
	18.	SolarIncidenceAngle
	19.	SolarAzimuthAngle
	20.	SolarAltitudeAngle
	21.	ParallacticAngle
	22.	GalacticLatitudeAngle
	23.	GalacticLongitudeAngle
	24.	RightAscensionAngle
	25.	DeclinationAstronomyAngle
	26.	EclipticLongitudeAngle
	27.	EclipticLatitudeAngle

⸻

Physics / Engineering
	28.	AngleOfAttack
	29.	AngleOfIncidence
	30.	AngleOfReflection
	31.	AngleOfRefraction
	32.	PhaseAngle
	33.	ScatteringAngle
	34.	JointAngle
	35.	PendulumAngle
	36.	TorqueArmAngle
	37.	AngularDisplacementAngle
	38.	AngularVelocityAngle
	39.	AngularAccelerationAngle
	40.	PrecessionAngle
	41.	NutationAngle
	42.	GearMeshAngle
	43.	CamLobeAngle
	44.	DihedralWingAngle
	45.	LimbArticulationAngle

⸻

3D Orientation
	46.	TiltAngle
	47.	RollAngle
	48.	PitchAngle
	49.	YawAngle
	50.	BankAngle
	51.	VerticalOrientationAngle
	52.	SphericalPolarAngle
	53.	SphericalAzimuthalAngle
	54.	OrbitalInclinationAngle
	55.	LineOfSightAngle

⸻

Computer Graphics / Geometry
	56.	FieldOfViewAngle
	57.	CameraPitchAngle
	58.	CameraYawAngle
	59.	CameraRollAngle
	60.	FrustumTiltAngle
	61.	ConeAngle
	62.	SolidAngle
	63.	BoneJointAngle
	64.	ArcAngle
	65.	SweepAngle
	66.	BevelAngle
	67.	MeshDihedralAngle

⸻

Chemistry
	68.	BondAngle
	69.	TorsionalAngle
	70.	MolecularDihedralAngle
	71.	StericAngle
	72.	SteradianAngle (solid angle)

⸻

Mathematics
	73.	QuaternionRotationAngle
	74.	ComplexArgumentAngle
	75.	HyperbolicAngle
	76.	InteriorAngle
	77.	ExteriorAngle
	78.	SupplementaryAngle
	79.	ComplementaryAngle
	80.	CoterminalAngle
	81.	DirectedAngle
	82.	ReflexAngle
	83.	AcuteAngle
	84.	ObtuseAngle
	85.	StraightAngle
	86.	FullAngle
	87.	MultiTurnAngle
	88.	PhaseOffsetAngle
	89.	PrincipalArgumentAngle
	90.	CentralAngle
	91.	InscribedAngle
*/