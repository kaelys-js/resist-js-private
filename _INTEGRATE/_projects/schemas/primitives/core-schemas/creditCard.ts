s// ============================================================================
// CARD-NUMBER-RAW SCHEMA
// ============================================================================

/**
 * CARD-NUMBER-RAW SCHEMA
 *
 * SUMMARY  
 *   Accepts any raw user-supplied payment card number input **as-is**, without
 *   normalization, formatting, or syntactic validation. Used as the first
 *   ingestion step prior to cleaning, normalization, tokenization, masking, or
 *   security-stage evaluation.
 *
 * PURPOSE  
 *   - Safely ingest raw end-user input (web/mobile/POS) before applying Luhn or
 *     brand/network validation.
 *   - Capture unformatted digits, spaced digits, dashed digits, and mixed
 *     formats (e.g., “4111 1111 1111 1111”, “4111-1111-1111-1111”, “4111111111111111”).
 *   - Serve as a source-of-truth input snapshot for audit logging, fraud
 *     scoring, heuristics, and sanitization pipelines.
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *     - Any non-empty string of characters.
 *     - Spaced, dashed, or raw digit sequences.
 *     - Full-width digits, Unicode numeric classes, and localized input.
 *
 *   REJECTS:
 *     - Empty strings
 *     - Non-string input types
 *
 * OUTPUT CONTRACT  
 *   - Returns the input string unchanged.
 *   - No normalization or whitespace trimming.
 *
 * SEMANTIC NOTES  
 *   - This schema deliberately performs **zero validation**.  
 *   - Do NOT use this schema alone for PCI-compliant authorization.  
 *   - The next pipeline stage MUST apply normalization + Luhn + brand rules.  
 *
 * EXAMPLES  
 *   ```
 *   parse(cardNumberRaw, "4111 1111 1111 1111")   // OK
 *   parse(cardNumberRaw, "４１１１−１１１１−１１１１−１１１１") // OK full-width
 *   parse(cardNumberRaw, "")                      // ❌ (empty)
 *   ```
 */
export const cardNumberRaw = v.string("Card number must be a non-empty string.")
    .pipe(v.minLength(1, "Card number cannot be empty."));


export type CardNumberRaw = v.InferOutput<typeof cardNumberRaw>;

// ============================================================================
// CARD-NUMBER-NORMALIZED SCHEMA
// ============================================================================

/**
 * CARD-NUMBER-NORMALIZED SCHEMA
 *
 * SUMMARY  
 *   Produces a **canonical, digit-only, ASCII-normalized Primary Account
 *   Number (PAN)** suitable for all downstream card-processing stages
 *   (Luhn validation, brand/network detection, BIN/IIN lookup, tokenization,
 *   PCI redaction, fraud heuristics).
 *
 *   This schema converts arbitrary raw user input into a **clean, uniform,
 *   interoperable** PAN representation:
 *
 *   - strips spaces, hyphens, dots, slashes  
 *   - removes Unicode separators  
 *   - converts full-width or locale digits → ASCII digits  
 *   - rejects any non-numeric residue  
 *   - ensures non-empty output  
 *
 * PURPOSE  
 *   Ensures all card-processing layers operate on a **consistent and
 *   canonical** representation, eliminating input-format variability across:
 *
 *   - browsers, mobile keyboards, POS devices  
 *   - iOS/Android autofill  
 *   - OCR systems  
 *   - scanned cards  
 *   - pasted values (with Unicode artifacts)  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any non-empty string containing at least one decimal digit  
 *   - raw CC inputs containing spaces, hyphens, or Unicode formatting  
 *   - mixed full-width + ASCII digits  
 *   - digits with zero-width separators  
 *
 *   REJECTS:
 *   - empty strings  
 *   - strings that contain non-digit characters after normalization  
 *   - card numbers consisting exclusively of formatting symbols  
 *
 * OUTPUT CONTRACT  
 *   Returns a **strict, digit-only, ASCII-only PAN string**.
 *
 *   Examples:
 *     "4111 1111 1111 1111"     → "4111111111111111"  
 *     "４１１１−１１１１−１１１１−１１１１" → "4111111111111111"  
 *     "4111-1111-1111-1111"     → "4111111111111111"  
 *
 * NORMALIZATION PIPELINE  
 *   1. Convert full-width digits → ASCII  
 *   2. Remove Unicode separators (zero-width, dashes, spaces)  
 *   3. Remove punctuation (‐, -, —, –, /, \, .)  
 *   4. Validate remaining string contains ONLY digits [0-9]  
 *   5. Reject if empty  
 *
 * SEMANTIC NOTES  
 *   - This schema **does not** validate the Luhn checksum. That is done in
 *     `cardNumberLuhn`.  
 *   - Does not validate card-brand (Visa/Mastercard/Amex).  
 *   - Used BEFORE security redaction, PCI tokenization, or BIN lookup.  
 *
 * EXAMPLES  
 *   ```
 *   parse(cardNumberNormalized, "4111 1111 1111 1111")
 *   → "4111111111111111"
 *
 *   parse(cardNumberNormalized, "４１１１−１１１１−１１１１−１１１１")
 *   → "4111111111111111"
 *
 *   parse(cardNumberNormalized, "  ")  // ❌
 *   parse(cardNumberNormalized, "abcd") // ❌
 *   ```
 */
export const cardNumberNormalized = v
    .string("Card number must be a string.")
    .pipe(
        v.transform((value) => {
            // Step 1: convert full-width digits to ASCII
            const fw = value.replace(
                /[０-９]/g,
                (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0)
            );

            // Step 2: remove formatting symbols
            const stripped = fw.replace(/[^\d]/g, "");

            if (stripped.length === 0) {
                throw new Error("Normalized card number contains no digits.");
            }

            // Step 3: ensure only digits remain
            if (!/^\d+$/.test(stripped)) {
                throw new Error("Card number contains invalid characters.");
            }

            return stripped;
        })
    );

/** 
 * OUTPUT TYPE — NORMALIZED CARD NUMBER
 *
 * SUMMARY  
 *   Represents a fully sanitized, digit-only PAN suitable for:
 *   - Luhn validation  
 *   - BIN/IIN extraction  
 *   - brand classification  
 *   - tokenization  
 *   - hashing / fingerprinting  
 *
 * CONTRACT GUARANTEES  
 *   - ASCII digits only  
 *   - formatting removed  
 *   - Unicode artifacts normalized  
 *   - non-empty string  
 *
 * EXAMPLE  
 *   ```
 *   const pan: CardNumberNormalized =
 *       parse(cardNumberNormalized, "4111 1111 1111 1111");
 *   ```
 */
export type CardNumberNormalized = v.InferOutput<typeof cardNumberNormalized>;

// ============================================================================
// CARD-NUMBER-LUHN SCHEMA
// ============================================================================

/**
 * CARD-NUMBER-LUHN SCHEMA
 *
 * SUMMARY  
 *   Validates that a **normalized, digit-only PAN** passes the **Luhn checksum**
 *   algorithm used by all major card networks (Visa, Mastercard, Amex,
 *   Discover, JCB, UnionPay, Diners, Maestro, etc.). This schema is applied
 *   *after* normalization and ensures the card number is mathematically valid.
 *
 * PURPOSE  
 *   Confirms that a payment card number is a legitimate PAN candidate before:
 *   - brand recognition  
 *   - BIN/IIN metadata lookup  
 *   - payment gateway submission  
 *   - tokenization  
 *   - PCI-compliant masking  
 *   - fraud detection  
 *
 * INPUT CONTRACT  
 *   - Accepts a **digit-only, ASCII-only** PAN previously produced by
 *     `cardNumberNormalized`.  
 *   - Does not accept raw user input.  
 *   - Length must be ≥ 12 and ≤ 19 digits.  
 *
 * OUTPUT CONTRACT  
 *   - Returns the same input string unchanged.  
 *   - Guarantees the PAN passes Luhn modulo-10 verification.  
 *
 * LUHN CHECK LOGIC  
 *   1. Starting from the rightmost digit, double every second digit.  
 *   2. If doubling produces a value > 9, subtract 9.  
 *   3. Sum all digits.  
 *   4. PAN is valid if `sum % 10 == 0`.  
 *
 * SEMANTIC NOTES  
 *   - Some corporate/virtual cards use odd ranges, but still pass Luhn.  
 *   - Test numbers (e.g., Stripe’s 4242…4242) also pass Luhn.  
 *   - Luhn does NOT guarantee card authenticity, only structural correctness.  
 *
 * EXAMPLES  
 *   ```
 *   parse(cardNumberLuhn, "4111111111111111")
 *   → "4111111111111111"  // passes Luhn
 *
 *   parse(cardNumberLuhn, "4111111111111112")
 *   → ❌ Luhn checksum failure
 *   ```
 */
export const cardNumberLuhn = v
    .string("Card number must be provided as a normalized string.")
    .pipe(
        v.minLength(12, "Card number is too short to be valid."),
        v.maxLength(19, "Card number is too long to be valid."),
        v.check((pan) => /^\d+$/.test(pan), "Card number must contain only digits."),
        v.check((pan) => {
            // Luhn algorithm
            let sum = 0;
            let shouldDouble = false;

            for (let i = pan.length - 1; i >= 0; i--) {
                let d = Number(pan[i]);

                if (shouldDouble) {
                    d = d * 2;
                    if (d > 9) d -= 9;
                }

                sum += d;
                shouldDouble = !shouldDouble;
            }

            return sum % 10 === 0;
        }, "Card number failed Luhn checksum.")
    );

/**
 * OUTPUT TYPE — LUHN-VALIDATED CARD NUMBER
 *
 * SUMMARY  
 *   Represents a syntactically valid, mathematically correct PAN.  
 *   Used as the gatekeeper for:
 *   - live transactions  
 *   - card vaulting  
 *   - tokenization  
 *
 * GUARANTEES  
 *   - Luhn-valid  
 *   - 12–19 digits  
 *   - ASCII numeric  
 *
 * EXAMPLE  
 *   ```
 *   const pan: CardNumberLuhn =
 *       parse(cardNumberLuhn, "4242424242424242");
 *   ```
 */
export type CardNumberLuhn = v.InferOutput<typeof cardNumberLuhn>;

// ============================================================================
// CARD-NUMBER-MASKED SCHEMA
// ============================================================================

/**
 * CARD-NUMBER-MASKED SCHEMA
 *
 * SUMMARY  
 *   Produces a **PCI-DSS–compliant masked representation** of a card number,
 *   ensuring that **no more than the final 4 digits** are ever exposed, while
 *   preserving:
 *
 *   - output length parity  
 *   - optional grouping format  
 *   - optional separation characters  
 *
 *   This schema never reveals the full PAN and is safe for:
 *   - logs  
 *   - UI display  
 *   - receipts  
 *   - analytics  
 *   - telemetry  
 *
 * PURPOSE  
 *   Enforces strong security guarantees by ensuring:
 *   - PAN digits beyond the last 4 are irreversibly masked  
 *   - no intermediate representations leak into logs  
 *   - masked output cannot be reconstructed  
 *
 * INPUT CONTRACT  
 *   - Accepts any **normalized, digit-only PAN** (12–19 digits) produced by
 *     `cardNumberNormalized` or `cardNumberLuhn`.  
 *   - Accepts optional formatting instructions.  
 *
 * OUTPUT CONTRACT  
 *   Produces an object:
 *   ```
 *   {
 *     masked: string;   // masked PAN, PCI-safe
 *     last4: string;    // final 4 digits
 *     length: number;   // total length of the original PAN
 *   }
 *   ```
 *
 * MASKING RULES  
 *   - Always reveals the **last 4 digits**.  
 *   - All prior digits become `*` by default.  
 *   - Output always equals original PAN length.  
 *   - No digits except last 4 are preserved.  
 *
 * SECURITY NOTES  
 *   - Masking is irreversible.  
 *   - Safe for frontend rendering, receipts, emails, audit logs.  
 *   - Safe to store in event logs without PCI redaction.  
 *
 * EXAMPLES  
 *   ```
 *   parse(cardNumberMasked, "4111111111111111")
 *   →
 *   {
 *     masked: "************1111",
 *     last4: "1111",
 *     length: 16
 *   }
 *
 *   parse(cardNumberMasked, "378282246310005")
 *   →
 *   {
 *     masked: "***********0005",
 *     last4: "0005",
 *     length: 15
 *   }
 *   ```
 */
export const cardNumberMasked = v
    .string("Card number must be normalized.")
    .pipe(
        v.minLength(12, "Card number is too short to mask safely."),
        v.maxLength(19, "Card number is too long to be a valid PAN."),
        v.check((pan) => /^\d+$/.test(pan), "Card number must contain only digits."),
        v.transform((pan) => {
            const len = pan.length;
            const last4 = pan.slice(-4);
            const masked = "*".repeat(len - 4) + last4;

            return {
                masked,
                last4,
                length: len,
            };
        })
    );

/**
 * OUTPUT TYPE — MASKED CARD NUMBER
 *
 * SUMMARY  
 *   Represents the PCI-safe masked form of a PAN, including derived metadata
 *   used across:
 *   - receipts  
 *   - customer portals  
 *   - fraud UI  
 *   - card selectors  
 *   - redaction layers  
 *
 * GUARANTEES  
 *   - Reveals only last 4 digits  
 *   - Preserves original PAN length  
 *   - 100% PCI-DSS safe  
 *
 * EXAMPLE  
 *   ```
 *   const m: CardNumberMasked =
 *       parse(cardNumberMasked, "4242424242424242");
 *
 *   console.log(m.masked); // "************4242"
 *   console.log(m.last4);  // "4242"
 *   ```
 */
export type CardNumberMasked = v.InferOutput<typeof cardNumberMasked>;

// ============================================================================
// CARD-NUMBER-LAST4 SCHEMA
// ============================================================================

/**
 * CARD-NUMBER-LAST4 SCHEMA
 *
 * SUMMARY  
 *   Extracts the **final 4 digits** of a previously validated payment card
 *   number (PAN). This schema enforces strict PCI-DSS safety rules:
 *
 *   - Only the last 4 digits may be revealed  
 *   - No other PAN digits are ever returned  
 *   - Input must already be sanitized + digit-only  
 *
 * PURPOSE  
 *   Provides a universally safe, display-friendly identifier for:
 *   - customer dashboards  
 *   - billing UIs  
 *   - receipts  
 *   - invoices  
 *   - decline notifications  
 *   - fraud reviews  
 *   - subscription selectors  
 *
 * INPUT CONTRACT  
 *   - Accepts any **digit-only PAN** of length 12–19  
 *   - Typically consumed after `cardNumberNormalized` or `cardNumberLuhn`  
 *
 * OUTPUT CONTRACT  
 *   ```
 *   {
 *     last4: string;   // always 4 digits
 *   }
 *   ```
 *
 * VALIDATION  
 *   - Must be all digits  
 *   - Must be between 12 and 19 digits  
 *   - Converts nothing — only extracts  
 *
 * SECURITY NOTES  
 *   - 100% PCI-safe  
 *   - Contains no reversible information  
 *   - Suitable for logs, emails, and analytics  
 *
 * EXAMPLES  
 *   ```
 *   parse(cardNumberLast4, "4111111111111111")
 *   → { last4: "1111" }
 *
 *   parse(cardNumberLast4, "378282246310005")
 *   → { last4: "0005" }
 *   ```
 */
export const cardNumberLast4 = v
    .string("Card number must be a string.")
    .pipe(
        v.minLength(12, "Card number too short to extract last4."),
        v.maxLength(19, "Card number too long to be a valid PAN."),
        v.check((pan) => /^\d+$/.test(pan), "Card number must contain only digits."),
        v.transform((pan) => ({
            last4: pan.slice(-4),
        }))
    );

/**
 * OUTPUT TYPE — LAST FOUR DIGITS OF CARD NUMBER
 *
 * SUMMARY  
 *   Strongly typed descriptor representing only the final 4 digits of a PAN.
 *
 * GUARANTEES  
 *   - Exactly 4 numeric characters  
 *   - Fully PCI-DSS compliant  
 *   - Never exposes original PAN length  
 *
 * EXAMPLE  
 *   ```
 *   const x: CardNumberLast4 =
 *       parse(cardNumberLast4, "4242424242424242");
 *
 *   console.log(x.last4); // "4242"
 *   ```
 */
export type CardNumberLast4 = v.InferOutput<typeof cardNumberLast4>;

// ============================================================================
// CARD-EXPIRY SCHEMA
// ============================================================================

/**
 * CARD-EXPIRY SCHEMA
 *
 * SUMMARY  
 *   Validates and normalizes **credit card expiration dates**. Accepts the
 *   two globally standard formats:
 *
 *   - `MM/YY`      (e.g., 04/27)  
 *   - `MM/YYYY`    (e.g., 04/2027)
 *
 *   The schema returns a canonical **ISO expiration descriptor**:
 *   ```
 *   {
 *     month: number;       // 1–12
 *     year: number;        // four-digit: 2024–2099
 *     iso: string;         // "YYYY-MM"
 *   }
 *   ```
 *
 * PURPOSE  
 *   Supports payment flows requiring:
 *   - billing updates  
 *   - subscription management  
 *   - checkout forms  
 *   - PCI-compliant storage (no PAN, no CVV)  
 *   - fraud validation  
 *   - tokenization systems  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - `"MM/YY"`  
 *   - `"MM/YYYY"`  
 *
 *   REJECTS:
 *   - invalid month values  
 *   - expired cards  
 *   - malformed separators  
 *   - ambiguous formats  
 *   - whitespace-only strings  
 *
 * OUTPUT CONTRACT  
 *   Always returns:
 *   ```
 *   {
 *     month: number;
 *     year: number;   // 4-digit
 *     iso: string;    // YYYY-MM
 *   }
 *   ```
 *
 * VALIDATION RULES  
 *   - Month must be **01–12**  
 *   - Two-digit year expands to **20YY** (Visa/MC global rule)  
 *   - Expiry must be **>= current month**  
 *   - No other separators allowed (must be `/`)  
 *
 * SECURITY NOTES  
 *   - Expiry is PCI-safe  
 *   - No CVV, no PAN, no sensitive secrets  
 *   - Safe for logs and analytics  
 *
 * EXAMPLES  
 *   ```
 *   parse(cardExpiry, "04/27")
 *   → { month: 4, year: 2027, iso: "2027-04" }
 *
 *   parse(cardExpiry, "11/2031")
 *   → { month: 11, year: 2031, iso: "2031-11" }
 *
 *   parse(cardExpiry, "00/25")
 *   → ERROR (invalid month)
 *   ```
 */
export const cardExpiry = v
    .string("Expiry must be a string in MM/YY or MM/YYYY format.")
    .pipe(
        v.check(
            (s) => /^(\d{2})\/(\d{2}|\d{4})$/.test(s),
            "Expiry must match MM/YY or MM/YYYY."
        ),
        v.transform((raw) => {
            const [, mmStr, yyStr] = raw.match(/^(\d{2})\/(\d{2}|\d{4})$/)!;

            const month = Number(mmStr);
            if (month < 1 || month > 12) {
                throw new Error("Invalid month in expiry date.");
            }

            const year =
                yyStr.length === 2
                    ? 2000 + Number(yyStr) // PCI rule: only 20xx allowed
                    : Number(yyStr);

            if (year < 2020 || year > 2099) {
                throw new Error("Expiry year must be between 2020 and 2099.");
            }

            // Future-date validation (YYYY-MM >= now)
            const now = new Date();
            const nowYear = now.getFullYear();
            const nowMonth = now.getMonth() + 1;

            if (year < nowYear || (year === nowYear && month < nowMonth)) {
                throw new Error("Card is expired.");
            }

            return {
                month,
                year,
                iso: `${year}-${String(month).padStart(2, "0")}`,
            };
        })
    );

/**
 * OUTPUT TYPE — CREDIT CARD EXPIRATION
 *
 * SUMMARY  
 *   Strongly typed descriptor representing a **normalized, validated** credit
 *   card expiration date.
 *
 * CONTRACT GUARANTEES  
 *   - Valid month (1–12)  
 *   - Valid 4-digit year (2020–2099)  
 *   - Not expired  
 *   - ISO-compliant canonical formatting (`YYYY-MM`)  
 *
 * EXAMPLE  
 *   ```
 *   const exp: CardExpiry =
 *       parse(cardExpiry, "08/33");
 *
 *   console.log(exp.iso); // "2033-08"
 *   ```
 */
export type CardExpiry = v.InferOutput<typeof cardExpiry>;

// ============================================================================
// CARD-CVV SCHEMA
// ============================================================================

/**
 * CARD-CVV SCHEMA
 *
 * SUMMARY  
 *   Validates the **Card Verification Value** (CVV/CVC/CID), enforcing strict
 *   PCI-safe format rules:
 *
 *   - 3 digits → Visa, MasterCard, Discover, JCB  
 *   - 4 digits → American Express  
 *
 *   This schema ensures strong syntactic correctness without storing or
 *   transforming sensitive authentication data.
 *
 * PURPOSE  
 *   Supports:
 *   - checkout forms  
 *   - subscription billing  
 *   - payment method updates  
 *   - card tokenization flows  
 *   - issuer-aware validation  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - `"123"`  
 *   - `"4567"`  
 *
 *   REJECTS:
 *   - whitespace  
 *   - symbols  
 *   - non-numeric characters  
 *   - fewer than 3 or more than 4 digits  
 *   - leading/trailing spaces  
 *
 * OUTPUT CONTRACT  
 *   Returns the CVV **unchanged** as a string.
 *
 * VALIDATION RULES  
 *   - Must match: `^[0-9]{3,4}$`  
 *   - No spaces allowed  
 *   - No coercion (must already be a string)  
 *
 * SECURITY NOTES  
 *   - Sensitive authentication data — DO NOT LOG  
 *   - Safe to validate, not safe to persist  
 *   - Conforms to PCI DSS rules for client-side/cardholder-only input  
 *
 * EXAMPLES  
 *   ```
 *   parse(cardCvv, "123")    → "123"
 *   parse(cardCvv, "9876")   → "9876"
 *
 *   parse(cardCvv, "")       → ERROR
 *   parse(cardCvv, "12a")    → ERROR
 *   parse(cardCvv, " 123 ")  → ERROR
 *   ```
 */
export const cardCvv = v
    .string("CVV must be a string containing 3 or 4 digits.")
    .pipe(
        v.check(
            (s) => /^[0-9]{3,4}$/.test(s),
            "CVV must be exactly 3 or 4 numeric digits."
        )
    );

/**
 * OUTPUT TYPE — CARD CVV
 *
 * SUMMARY  
 *   Represents the validated CVV/CVC/CID. The schema guarantees that:
 *
 *   - The value is **exactly 3 or 4 digits**  
 *   - It contains **only numbers**  
 *   - It has **no whitespace or formatting**  
 *
 * PURPOSE  
 *   Adds type-level guarantees for payment flows requiring issuer-correct
 *   CVV length without applying any transformations.
 *
 * SEMANTIC NOTES  
 *   - 3-digit CVV → Visa, MasterCard, Discover, JCB  
 *   - 4-digit CID → American Express  
 *
 * EXAMPLE  
 *   ```
 *   const code: CardCvv = parse(cardCvv, "834");
 *
 *   // AMEX
 *   const cid: CardCvv = parse(cardCvv, "1234");
 *   ```
 */
export type CardCvv = v.InferOutput<typeof cardCvv>;

// ============================================================================
// CARD-EXPIRY-MONTH SCHEMA
// ============================================================================

/**
 * CARD-EXPIRY-MONTH SCHEMA
 *
 * SUMMARY  
 *   Validates the **credit-card expiry month**, ensuring it is a syntactically
 *   correct and issuer-compatible month value:
 *
 *   - Accepts numeric values 1 through 12  
 *   - Accepts string-padded months: `"01"` → `"12"`  
 *   - Rejects invalid, zero, negative, or out-of-range months  
 *
 * PURPOSE  
 *   Enables:
 *   - checkout billing forms  
 *   - payment method update flows  
 *   - subscription renewals  
 *   - card tokenization validation  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - `"01"` … `"12"`  
 *   - `1` … `12`  
 *
 *   REJECTS:
 *   - `"00"`  
 *   - `"13"`  
 *   - non-numeric strings  
 *   - floats  
 *   - whitespace  
 *   - negative values  
 *
 * OUTPUT CONTRACT  
 *   Returns **a normalized 2-digit string**:  
 *   - `1` → `"01"`  
 *   - `"9"` → `"09"`  
 *   - `"12"` → `"12"`  
 *
 * VALIDATION RULES  
 *   - Coerces numbers to strings  
 *   - Must be integer  
 *   - Must be 1–12 inclusive  
 *   - Always outputs `"MM"` padded format  
 *
 * SEMANTIC NOTES  
 *   - Normalized `"MM"` form is required by nearly all payment processors.  
 *
 * EXAMPLES  
 *   ```
 *   parse(cardExpiryMonth, "03") → "03"
 *   parse(cardExpiryMonth, 9)    → "09"
 *   parse(cardExpiryMonth, 12)   → "12"
 *
 *   parse(cardExpiryMonth, "00") → ERROR
 *   parse(cardExpiryMonth, "13") → ERROR
 *   ```
 */
export const cardExpiryMonth = v.coerce(
    v.string("Expiry month must be a valid MM or numeric month."),
    (input: any) => {
        if (typeof input === "number") {
            if (!Number.isInteger(input)) throw new Error("Expiry month must be an integer.");
            const month = input;
            if (month < 1 || month > 12) throw new Error("Expiry month must be between 1 and 12.");
            return month.toString().padStart(2, "0");
        }

        if (typeof input === "string") {
            if (!/^[0-9]{1,2}$/.test(input)) {
                throw new Error("Expiry month must contain only digits.");
            }
            const month = Number(input);
            if (month < 1 || month > 12) throw new Error("Expiry month must be between 1 and 12.");
            return input.padStart(2, "0");
        }

        throw new Error("Invalid expiry month input.");
    }
);

/**
 * OUTPUT TYPE — CARD EXPIRY MONTH
 *
 * SUMMARY  
 *   Represents a validated, normalized **two-digit month string** compatible with
 *   credit-card processors and PCI-compliant payment flows.
 *
 * GUARANTEES  
 *   - Always `"01"` through `"12"`  
 *   - Always 2-digit format  
 *   - Always a string  
 *   - Never invalid or out of range  
 *
 * EXAMPLE  
 *   ```
 *   const m: CardExpiryMonth = parse(cardExpiryMonth, 7); 
 *   // m === "07"
 *   ```
 */
export type CardExpiryMonth = v.InferOutput<typeof cardExpiryMonth>;

// ============================================================================
// CARD-EXPIRY-YEAR SCHEMA
// ============================================================================

/**
 * CARD-EXPIRY-YEAR SCHEMA
 *
 * SUMMARY  
 *   Validates and normalizes a **credit card expiry year**, supporting both:
 *
 *   - 2-digit shorthand format (`"25"`)  
 *   - full 4-digit format (`"2025"`)  
 *
 *   The schema then converts all valid inputs into a **canonical 4-digit year**
 *   to support payment processors, subscription systems, and PCI-compliant
 *   workflows.
 *
 * PURPOSE  
 *   Ensures:
 *   - consistent `"YYYY"` year handling  
 *   - prevention of expired cards  
 *   - normalization of legacy `"YY"` inputs  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - `"25"`, `"30"`, `"99"`  
 *   - `"2025"`, `"2030"`  
 *   - integers 25, 30, 2025, etc.  
 *
 *   REJECTS:
 *   - years in the past  
 *   - malformed strings  
 *   - years beyond 2099 (issuer limit)  
 *   - floats  
 *
 * OUTPUT CONTRACT  
 *   Always returns a **4-digit string** `"YYYY"`.
 *
 * NORMALIZATION RULES  
 *   - `"25"` → `"2025"`  
 *   - `"05"` → `"2005"` (but rejected because 2005 < current year)  
 *   - `"2030"` → `"2030"`  
 *   - `27` → `"2027"`  
 *
 * VALIDATION RULES  
 *   - Must be numeric  
 *   - Must convert cleanly to integer  
 *   - Final year must be **>= current year**  
 *   - Year must be <= 2099  
 *
 * SEMANTIC NOTES  
 *   - Most major issuers do not issue cards with expiry beyond 2099.  
 *   - This schema enforces current-year minimum (but month validation is handled by month-schema).  
 *
 * EXAMPLES  
 *   ```
 *   parse(cardExpiryYear, "25")    → "2025"
 *   parse(cardExpiryYear, "2028")  → "2028"
 *   parse(cardExpiryYear, 32)      → "2032"
 *
 *   parse(cardExpiryYear, "04")    → ERROR (2004 < current year)
 *   parse(cardExpiryYear, 1999)    → ERROR
 *   parse(cardExpiryYear, "2105")  → ERROR
 *   ```
 */
export const cardExpiryYear = v.coerce(
    v.string("Expiry year must be numeric."),
    (input: any) => {
        const now = new Date();
        const currentYear = now.getFullYear();

        let str: string;

        // Convert input to string
        if (typeof input === "number") {
            if (!Number.isInteger(input)) {
                throw new Error("Expiry year must be an integer.");
            }
            str = String(input);
        } else if (typeof input === "string") {
            if (!/^[0-9]{2,4}$/.test(input)) {
                throw new Error("Expiry year must be 2 or 4 digits.");
            }
            str = input.trim();
        } else {
            throw new Error("Invalid expiry year input.");
        }

        // Convert YY → YYYY
        let year: number;
        if (str.length === 2) {
            year = Number(`20${str}`);
        } else {
            year = Number(str);
        }

        // Validate numeric range
        if (year < currentYear) {
            throw new Error(`Expiry year must be >= ${currentYear}.`);
        }
        if (year > 2099) {
            throw new Error("Expiry year must be <= 2099.");
        }

        return String(year);
    }
);

/**
 * OUTPUT TYPE — CARD EXPIRY YEAR
 *
 * SUMMARY  
 *   A validated **4-digit credit card expiry year** compatible with all major
 *   payment processors and tokenization gateways.
 *
 * GUARANTEES  
 *   - Always formatted `"YYYY"`  
 *   - Always ≥ current year  
 *   - Always ≤ 2099  
 *   - Always a string  
 *
 * EXAMPLE  
 *   ```
 *   const y: CardExpiryYear = parse(cardExpiryYear, "27");
 *   // y === "2027"
 *   ```
 */
export type CardExpiryYear = v.InferOutput<typeof cardExpiryYear>;

// ============================================================================
// CARD-EXPIRY-FULL SCHEMA
// ============================================================================

/**
 * CARD-EXPIRY-FULL SCHEMA
 *
 * SUMMARY  
 *   Validates and **cross-verifies** credit card expiry components:
 *
 *   - expiry month (1–12, normalized to "MM")  
 *   - expiry year (2-digit or 4-digit, normalized to "YYYY")  
 *   - ensures the combined month+year is **not expired**  
 *
 *   Produces a **fully normalized, canonical expiry descriptor**, including:
 *
 *   - padded month `"MM"`  
 *   - padded 4-digit year `"YYYY"`  
 *   - ISO-formatted string `"YYYY-MM"`  
 *
 * PURPOSE  
 *   Enables:
 *   - tokenization requests  
 *   - PCI-compliant storage (month/year only)  
 *   - subscription billing  
 *   - checkout forms  
 *   - mobile payment flows  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - `{ month: "03", year: "2027" }`  
 *   - `{ month: 3,    year: 27 }`  
 *   - `{ month: "9",  year: "25" }`  
 *
 *   REJECTS:
 *   - invalid month  
 *   - invalid year  
 *   - already expired month/year  
 *   - malformed objects  
 *
 * OUTPUT CONTRACT  
 *   Always returns:
 *   ```
 *   {
 *     month: "MM";
 *     year: "YYYY";
 *     iso: "YYYY-MM";
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - Reuses `cardExpiryMonth` for month validation  
 *   - Reuses `cardExpiryYear` for year validation  
 *   - Combines and checks against the current date  
 *   - Ensures the expiry date is **this month or later**  
 *
 * SEMANTIC NOTES  
 *   - ISO expiry (`YYYY-MM`) is accepted by nearly all processors.  
 *   - Cards expire at **end of month**, so comparison logic uses month granularity.  
 *
 * EXAMPLES  
 *   ```
 *   parse(cardExpiryFull, { month: "03", year: "2030" })
 *   → { month: "03", year: "2030", iso: "2030-03" }
 *
 *   parse(cardExpiryFull, { month: 2, year: 24 })
 *   → { month: "02", year: "2024", iso: "2024-02" }
 *
 *   // Expired
 *   parse(cardExpiryFull, { month: 5, year: 22 }) → ERROR
 *   ```
 */
export const cardExpiryFull = v.object({
    month: cardExpiryMonth,
    year: cardExpiryYear,
}).pipe(
    v.transform((i) => {
        const month = i.month; // already "MM"
        const year = i.year;   // already "YYYY"

        // Determine if expired
        const now = new Date();
        const nowYear = now.getFullYear();
        const nowMonth = now.getMonth() + 1; // 1–12

        const expYearNum = Number(year);
        const expMonthNum = Number(month);

        // Already expired?
        if (
            expYearNum < nowYear ||
            (expYearNum === nowYear && expMonthNum < nowMonth)
        ) {
            throw new Error(
                `The card expiry ${year}-${month} is already expired.`
            );
        }

        return {
            month,
            year,
            iso: `${year}-${month}`,
        };
    })
);

/**
 * OUTPUT TYPE — CARD EXPIRY FULL DESCRIPTOR
 *
 * SUMMARY  
 *   Represents a **complete, validated, cross-checked card expiry object**
 *   synthesized from month + year validation and normalized into canonical
 *   PCI-compliant format.
 *
 * GUARANTEES  
 *   - `month` is `"MM"`  
 *   - `year` is `"YYYY"`  
 *   - `iso` is `"YYYY-MM"`  
 *   - Result is guaranteed **not expired**  
 *
 * EXAMPLE  
 *   ```
 *   const exp: CardExpiryFull =
 *        parse(cardExpiryFull, { month: 8, year: 27 });
 *
 *   // exp:
 *   // {
 *   //   month: "08",
 *   //   year: "2027",
 *   //   iso: "2027-08"
 *   // }
 *   ```
 */
export type CardExpiryFull = v.InferOutput<typeof cardExpiryFull>;

// ============================================================================
// CARD-EXPIRY-YEAR-2DIGIT SCHEMA
// ============================================================================

/**
 * CARD-EXPIRY-YEAR-2DIGIT SCHEMA
 *
 * SUMMARY  
 *   Validates **strict 2-digit credit-card expiry years**, enforcing:
 *
 *   - exactly 2 digits  
 *   - numeric only  
 *   - canonical `"YY"` format  
 *   - future-validity (≥ current year % 100)  
 *
 *   This schema does **NOT** expand or convert to `YYYY`.  
 *   Some gateways (especially legacy POS systems, some EMV providers, and
 *   payment network proxies) operate exclusively on `"YY"` format.
 *
 * PURPOSE  
 *   Used where:
 *   - raw `"YY"` format must be preserved  
 *   - the year cannot be expanded  
 *   - systems work with EMV Track 2-like formats  
 *   - PCI vaults store expiry in strict 2-digit form  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - `"24"`  
 *   - `"27"`  
 *   - `"05"`  
 *
 *   REJECTS:
 *   - `"2025"` (4-digit not permitted)  
 *   - `"0"` or `"004"`  
 *   - non-numeric strings  
 *   - expired years  
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   - always the same `"YY"` string  
 *
 * VALIDATION RULES  
 *   - must match `/^[0-9]{2}$/`  
 *   - convert to number for comparison  
 *   - must be ≥ current year % 100  
 *   - must be ≤ 99  
 *
 * SEMANTIC NOTES  
 *   - “YY” is ambiguous outside of payment systems; this schema is strictly for
 *     card-expiry contexts where the meaning is well-defined.  
 *   - If you need canonical `"YYYY"` then use `cardExpiryYear` instead.  
 *
 * EXAMPLES  
 *   ```
 *   parse(cardExpiryYear2Digit, "27") → "27"
 *   parse(cardExpiryYear2Digit, "05") → "05"
 *
 *   parse(cardExpiryYear2Digit, "2027") → ERROR
 *   parse(cardExpiryYear2Digit, "00")   → ERROR (expired)
 *   ```
 */
export const cardExpiryYear2Digit = v.coerce(
    v.string("Expiry year must be a 2-digit string."),
    (input: any) => {
        const now = new Date();
        const yyCurrent = now.getFullYear() % 100; // 0–99

        let str: string;

        if (typeof input === "number") {
            if (!Number.isInteger(input)) {
                throw new Error("Expiry year must be an integer.");
            }
            if (input < 0 || input > 99) {
                throw new Error("Expiry year must be between 00 and 99.");
            }
            str = input.toString().padStart(2, "0");
        } else if (typeof input === "string") {
            if (!/^[0-9]{2}$/.test(input)) {
                throw new Error("Expiry year must be exactly 2 digits.");
            }
            str = input;
        } else {
            throw new Error("Invalid expiry year input.");
        }

        const yy = Number(str);

        if (yy < yyCurrent) {
            throw new Error(
                `Expiry year '${str}' is already expired (must be >= ${yyCurrent}).`
            );
        }

        return str;
    }
);

/**
 * OUTPUT TYPE — CARD EXPIRY YEAR (2-DIGIT)
 *
 * SUMMARY  
 *   Represents a validated **2-digit card expiry year**, suitable for systems
 *   that strictly operate on `"YY"` values without converting to `"YYYY"`.
 *
 * GUARANTEES  
 *   - Always `"YY"`  
 *   - Always 2 characters  
 *   - Always numeric  
 *   - Always ≥ current YY  
 *
 * EXAMPLE  
 *   ```
 *   const yy: CardExpiryYear2Digit =
 *       parse(cardExpiryYear2Digit, "28");
 *   // yy === "28"
 *   ```
 */
export type CardExpiryYear2Digit = v.InferOutput<typeof cardExpiryYear2Digit>;

// ============================================================================
// CARD-EXPIRY-YEAR-4DIGIT SCHEMA
// ============================================================================

/**
 * CARD-EXPIRY-YEAR-4DIGIT SCHEMA
 *
 * SUMMARY  
 *   Validates a **strict four-digit credit card expiry year** (`"YYYY"`), ensuring:
 *
 *   - exactly 4 numeric digits  
 *   - no whitespace  
 *   - no 2-digit shorthand  
 *   - year is not expired  
 *   - year is not unrealistically far in the future  
 *
 * PURPOSE  
 *   Required when:
 *   - card issuers or gateways demand `"YYYY"` format only  
 *   - internal systems store expiry in full ISO year form  
 *   - PCI vaulting requires normalized year structures  
 *   - legacy `"YY"` input is forbidden  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - `"2024"`  
 *   - `"2031"`  
 *   - `2027`  
 *
 *   REJECTS:
 *   - `"24"` or `"05"` (not 4 digits)  
 *   - `"202"` (3 digits)  
 *   - `"3025"` (beyond realistic issuer window)  
 *   - expired years  
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   - normalized `"YYYY"` string  
 *
 * VALIDATION RULES  
 *   - must match `/^[0-9]{4}$/`  
 *   - must be ≥ current year  
 *   - must be ≤ 2099  
 *
 * SEMANTIC NOTES  
 *   - Payment networks typically issue no card with expiration beyond 20–25 years.  
 *   - Using `"YYYY"` avoids ambiguity associated with `"YY"` rollover.  
 *
 * EXAMPLES  
 *   ```
 *   parse(cardExpiryYear4Digit, "2029")  → "2029"
 *   parse(cardExpiryYear4Digit, 2027)    → "2027"
 *
 *   parse(cardExpiryYear4Digit, "29")    → ERROR
 *   parse(cardExpiryYear4Digit, "209")   → ERROR
 *   parse(cardExpiryYear4Digit, "2104")  → ERROR
 *   ```
 */
export const cardExpiryYear4Digit = v.coerce(
    v.string("Expiry year must be a 4-digit string."),
    (input: any) => {
        const now = new Date();
        const currentYear = now.getFullYear();

        let str: string;

        if (typeof input === "number") {
            if (!Number.isInteger(input)) {
                throw new Error("Expiry year must be an integer.");
            }
            str = input.toString();
        } else if (typeof input === "string") {
            str = input.trim();
        } else {
            throw new Error("Invalid expiry year input.");
        }

        if (!/^[0-9]{4}$/.test(str)) {
            throw new Error("Expiry year must be exactly 4 digits.");
        }

        const year = Number(str);

        if (year < currentYear) {
            throw new Error(`Expiry year must be >= ${currentYear}.`);
        }
        if (year > 2099) {
            throw new Error("Expiry year must be <= 2099.");
        }

        return str;
    }
);

/**
 * OUTPUT TYPE — CARD EXPIRY YEAR (4-DIGIT)
 *
 * SUMMARY  
 *   Represents a validated, strict, PCI-compatible **four-digit expiry year**.
 *
 * GUARANTEES  
 *   - Always `"YYYY"`  
 *   - Always 4 digits  
 *   - Always a string  
 *   - Always >= current year  
 *   - Never accepts 2-digit format  
 *
 * EXAMPLE  
 *   ```
 *   const y: CardExpiryYear4Digit =
 *       parse(cardExpiryYear4Digit, "2028");
 *   ```
 */
export type CardExpiryYear4Digit = v.InferOutput<typeof cardExpiryYear4Digit>;

// ============================================================================
// CARD-EXPIRY-MMAA SCHEMA  (Format: "MM/AA")
// ============================================================================

/**
 * CARD-EXPIRY-MMAA SCHEMA
 *
 * SUMMARY  
 *   Validates and normalizes the **European-style card expiry format**:
 *
 *       `"MM/AA"`
 *
 *   This format is extremely common in:
 *   - EU checkout forms  
 *   - EMV terminal software  
 *   - PSD2-compliant strong-customer-auth flows  
 *   - mobile PSD2 SDKs  
 *
 *   The schema ensures:
 *   - correct 2-digit month  
 *   - correct 2-digit year  
 *   - future-validity  
 *   - canonicalized `"MM/AA"` output
 *
 * PURPOSE  
 *   Provides a single authoritative validator used in:
 *   - pan-European checkout forms  
 *   - card-on-file updates  
 *   - PSD2 authentication flows  
 *   - subscription renewals  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - `"03/27"`  
 *   - `"9/25"` → normalized to `"09/25"`  
 *   - `"12/30"`  
 *
 *   REJECTS:
 *   - `"3/2027"`  
 *   - `"13/20"`  
 *   - `"00/05"`  
 *   - anything without a slash  
 *
 * OUTPUT CONTRACT  
 *   Always returns:
 *   ```
 *   {
 *     month: "MM";
 *     year: "AA";      // 2-digit year
 *     iso:  "20AA-MM"; // expanded canonical form
 *     formatted: "MM/AA";
 *   }
 *   ```
 *
 * VALIDATION RULES  
 *   - must contain `/` separator  
 *   - left side must be 1–12  
 *   - right side must be 00–99  
 *   - must NOT be expired  
 *
 * SEMANTIC NOTES  
 *   - EU regulators and many PSPs prefer `MM/AA` rather than `MM/YYYY`.  
 *   - Card expiry always applies at the **end of the month**.  
 *
 * EXAMPLES  
 *   ```
 *   parse(cardExpiryMMAA, "03/27")
 *   → { month: "03", year: "27", iso: "2027-03", formatted: "03/27" }
 *
 *   parse(cardExpiryMMAA, "9/25")
 *   → { month: "09", year: "25", iso: "2025-09", formatted: "09/25" }
 *
 *   parse(cardExpiryMMAA, "13/25") → ERROR
 *   parse(cardExpiryMMAA, "05/17") → ERROR (expired)
 *   ```
 */
export const cardExpiryMMAA = v.coerce(
    v.string("Expiry must be in MM/AA format."),
    (input: any) => {
        if (typeof input !== "string") {
            throw new Error("Expiry must be a string in MM/AA format.");
        }

        const trimmed = input.trim();
        if (!/^\d{1,2}\/\d{2}$/.test(trimmed)) {
            throw new Error("Expiry must match MM/AA format.");
        }

        const [rawMonth, rawYY] = trimmed.split("/");
        const monthNum = Number(rawMonth);
        const yy = Number(rawYY);

        if (monthNum < 1 || monthNum > 12) {
            throw new Error("Expiry month must be between 01 and 12.");
        }

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentYY = currentYear % 100;
        const currentMonth = now.getMonth() + 1;

        // Expand year
        const fullYear = 2000 + yy;

        // Expiry validation
        if (
            fullYear < currentYear ||
            (fullYear === currentYear && monthNum < currentMonth)
        ) {
            throw new Error(
                `Expiry ${rawMonth.padStart(2, "0")}/${rawYY} is already expired.`
            );
        }

        const month = rawMonth.padStart(2, "0");
        const year = rawYY; // keep 2-digit for formatted form

        return {
            month,
            year,
            iso: `${2000 + yy}-${month}`,
            formatted: `${month}/${year}`,
        };
    }
);

/**
 * OUTPUT TYPE — CARD EXPIRY (MM/AA FORMAT)
 *
 * SUMMARY  
 *   Represents a validated European-style **MM/AA** expiry format suitable for
 *   all EU payment flows and EMV-style APIs.
 *
 * GUARANTEES  
 *   - `month` is `"MM"`  
 *   - `year` is `"AA"`  
 *   - `iso` is `"YYYY-MM"`  
 *   - `formatted` is `"MM/AA"`  
 *   - guaranteed not expired  
 *
 * EXAMPLE  
 *   ```
 *   const exp: CardExpiryMMAA =
 *       parse(cardExpiryMMAA, "03/28");
 *   ```
 */
export type CardExpiryMMAA = v.InferOutput<typeof cardExpiryMMAA>;

// ============================================================================
// CARD-EXPIRY-ISO SCHEMA  (Format: "YYYY-MM")
// ============================================================================

/**
 * CARD-EXPIRY-ISO SCHEMA
 *
 * SUMMARY  
 *   Validates **strict ISO 8601 credit-card expiry format**:
 *
 *       `"YYYY-MM"`
 *
 *   This is the canonical machine-readable form used by:
 *   - PCI vaults  
 *   - Payment processors (Stripe, Adyen, Braintree)  
 *   - EMV/e-commerce gateways  
 *   - recurring billing engines  
 *   - tokenization APIs  
 *
 *   Ensures:
 *   - exact 4-digit year  
 *   - exact 2-digit month  
 *   - future validity  
 *   - no partial dates  
 *
 * PURPOSE  
 *   Acts as the **authoritative expiry descriptor** for machine-to-machine
 *   operations where ambiguity must be eliminated:
 *
 *   - subscription renewal  
 *   - card-on-file storage  
 *   - gateway interoperability  
 *   - fraud/risk engines  
 *   - card metadata caching  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - `"2027-03"`  
 *   - `"2030-11"`  
 *
 *   REJECTS:
 *   - `"27-03"`  
 *   - `"2027/03"`  
 *   - `"2027-3"`  
 *   - `"2027-00"`  
 *   - `"2027-13"`  
 *   - expired `"YYYY-MM"`  
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   {
 *     month: "MM";
 *     year: "YYYY";
 *     iso: "YYYY-MM";
 *   }
 *   ```
 *
 * VALIDATION RULES  
 *   - must match `/^[0-9]{4}-[0-9]{2}$/`  
 *   - month must be 01–12  
 *   - year must be >= current year  
 *   - must not be expired  
 *
 * SEMANTIC NOTES  
 *   - `"YYYY-MM"` avoids ambiguity of `"YY"` rollover  
 *   - Most gateway APIs prefer `"YYYY-MM"` because it requires no expansion  
 *
 * EXAMPLES  
 *   ```
 *   parse(cardExpiryIso, "2028-09")
 *   → { month: "09", year: "2028", iso: "2028-09" }
 *
 *   parse(cardExpiryIso, "2023-01") → ERROR (expired)
 *   parse(cardExpiryIso, "27-03")   → ERROR
 *   ```
 */
export const cardExpiryIso = v.coerce(
    v.string("Expiry must be in YYYY-MM format."),
    (input: any) => {
        if (typeof input !== "string") {
            throw new Error("Expiry must be a string.");
        }

        const trimmed = input.trim();

        if (!/^[0-9]{4}-[0-9]{2}$/.test(trimmed)) {
            throw new Error("Expiry must match YYYY-MM exactly.");
        }

        const [rawYear, rawMonth] = trimmed.split("-");
        const year = Number(rawYear);
        const month = Number(rawMonth);

        if (month < 1 || month > 12) {
            throw new Error("Expiry month must be between 01 and 12.");
        }

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        // Expiration validation
        if (
            year < currentYear ||
            (year === currentYear && month < currentMonth)
        ) {
            throw new Error(`Expiry ${trimmed} is already expired.`);
        }

        const mm = rawMonth.padStart(2, "0");
        const yyyy = rawYear;

        return {
            month: mm,
            year: yyyy,
            iso: `${yyyy}-${mm}`,
        };
    }
);

/**
 * OUTPUT TYPE — CARD EXPIRY (ISO FORMAT)
 *
 * SUMMARY  
 *   A validated, machine-normalized expiry descriptor in **strict ISO 8601
 *   format**, suitable for all PCI-compliant systems.
 *
 * GUARANTEES  
 *   - `year` is a 4-digit string `"YYYY"`  
 *   - `month` is a 2-digit string `"MM"`  
 *   - `iso` is exactly `"YYYY-MM"`  
 *   - always non-expired  
 *
 * EXAMPLE  
 *   ```
 *   const exp: CardExpiryIso =
 *       parse(cardExpiryIso, "2031-12");
 *   ```
 */
export type CardExpiryIso = v.InferOutput<typeof cardExpiryIso>;

/*
    TODO:

1. CARD NUMBER (PAN) & RELATED IDENTIFIERS

Core PAN / Card Number
	1.	CARD-NUMBER-STRICT SCHEMA
	2.	CARD-NUMBER-LUHN SCHEMA
	3.	CARD-NUMBER-COERCE SCHEMA
	4.	CARD-NUMBER-NORMALIZED SCHEMA
	5.	CARD-NUMBER-MASKED SCHEMA

BIN / IIN / Branding
	6.	CARD-BIN (6–8 digit) SCHEMA
	7.	CARD-IIN SCHEMA
	8.	CARD-NETWORK SCHEMA (Visa, MC, Amex, Discover, JCB, UnionPay, etc.)
	9.	CARD-NETWORK-STRICT SCHEMA
	10.	CARD-NETWORK-INFERRED SCHEMA (network auto-detected from PAN)

Issuer / Country
	11.	CARD-ISSUER-COUNTRY SCHEMA
	12.	CARD-ISSUER-BANK-NAME SCHEMA
	13.	CARD-ISSUER-METADATA SCHEMA

Tokenized / Encrypted PAN
	14.	CARD-PAN-TOKENIZED SCHEMA (network tokens, DPAN, 3DS2 tokens)
	15.	CARD-PAN-ENCRYPTED SCHEMA (RSA/AES encrypted card blocks)
	16.	CARD-PAN-LAST4 SCHEMA

⸻

2. CVV / CVC / CID / Security Codes
	17.	CARD-CVV-STRICT SCHEMA (3 digits only)
	18.	CARD-CVV-AMEX SCHEMA (4 digits)
	19.	CARD-CVV-COERCE SCHEMA
	20.	CARD-CVV-NORMALIZED SCHEMA
	21.	CARD-CVV-OPTIONAL SCHEMA
	22.	CARD-CVV-MASKED SCHEMA

⸻

3. Cardholder Name
	23.	CARD-NAME-STRICT SCHEMA (A–Z + allowed punctuation)
	24.	CARD-NAME-ASCII SCHEMA
	25.	CARD-NAME-COERCE SCHEMA
	26.	CARD-NAME-NORMALIZED SCHEMA

⸻

4. Billing Address (Card-present & Card-not-present)
	27.	CARD-BILLING-ADDRESS-LINE1 SCHEMA
	28.	CARD-BILLING-ADDRESS-LINE2 SCHEMA
	29.	CARD-BILLING-CITY SCHEMA
	30.	CARD-BILLING-POSTAL-CODE SCHEMA
	31.	CARD-BILLING-POSTAL-CODE-NORTH-AMERICA SCHEMA
	32.	CARD-BILLING-POSTAL-CODE-EU SCHEMA
	33.	CARD-BILLING-COUNTRY SCHEMA
	34.	CARD-BILLING-REGION SCHEMA (State/Province)

⸻

5. AVS (Address Verification System)
	35.	CARD-AVS-CODE SCHEMA (A, B, C, D, M, N… etc.)
	36.	CARD-AVS-RESULT SCHEMA
	37.	CARD-AVS-DETAIL SCHEMA

⸻

6. 3DS / Authentication / Cryptograms
	38.	CARD-3DS1-ECI SCHEMA
	39.	CARD-3DS1-CAVV SCHEMA
	40.	CARD-3DS2-ECI SCHEMA
	41.	CARD-3DS2-CAVV SCHEMA
	42.	CARD-3DS2-DS-TRANS-ID SCHEMA
	43.	CARD-3DS2-SERVER-TRANS-ID SCHEMA
	44.	CARD-3DS2-CHALLENGE-INDICATOR SCHEMA
	45.	CARD-3DS2-AUTHENTICATION-VALUE SCHEMA

⸻

7. EMV / Contactless / Token Format
	46.	CARD-EMV-AID SCHEMA
	47.	CARD-EMV-CRYPTOGRAM SCHEMA
	48.	CARD-EMV-TVR SCHEMA
	49.	CARD-EMV-TSI SCHEMA
	50.	CARD-EMV-PROVIDER SCHEMA (Apple Pay, Google Pay, Samsung Pay)

⸻

8. Expiration Variants (NOT YET DONE)

(We already did: Year, Month, Year2, Year4, MMAA, ISO, Full.)

Remaining:
	51.	CARD-EXPIRY-RFC3339 SCHEMA (full date format)
	52.	CARD-EXPIRY-TIMESTAMP SCHEMA (POS terminals convert to timestamps)
	53.	CARD-EXPIRY-STRING-ANY SCHEMA (accept anything & normalize)

⸻

9. Card Tokens & Vault Identifiers
	54.	CARD-TOKEN-STRIPE SCHEMA
	55.	CARD-TOKEN-BRAINTREE SCHEMA
	56.	CARD-TOKEN-ADYEN SCHEMA
	57.	CARD-TOKEN-CYBERSOURCE SCHEMA
	58.	CARD-TOKEN-GENERIC SCHEMA
	59.	CARD-TOKEN-PSEUDOPAN SCHEMA
	60.	CARD-TOKEN-UUID SCHEMA

⸻

10. Risk / Fraud / Scoring Inputs
	61.	CARD-RISK-SCORE SCHEMA
	62.	CARD-RISK-FLAGS SCHEMA
	63.	CARD-RISK-VELOCITY SCHEMA
	64.	CARD-RISK-FINGERPRINT-ID SCHEMA

⸻

11. Card Metadata / Capabilities
	65.	CARD-NETWORK-FEATURES SCHEMA
	66.	CARD-COUNTRY-RESTRICTIONS SCHEMA
	67.	CARD-3DS-REQUIRED SCHEMA
	68.	CARD-CONTROL-BLOCK SCHEMA

⸻

12. Composite / Combined Schemas
	69.	CARD-PAYMENT-METHOD SCHEMA (full card object)
	70.	CARD-PAYMENT-REQUEST SCHEMA
	71.	CARD-TOKENIZE-REQUEST SCHEMA
	72.	CARD-VERIFICATION-REQUEST SCHEMA
	73.	CARD-BILLING-FULL SCHEMA
	74.	CARD-REFERENCE SCHEMA (PAN-less reference)

⸻

13. PCI / Compliance / Storage-Level Schemas
	75.	PCI-PAN-STORED SCHEMA (masked + tokenized only)
	76.	PCI-PAN-FORBIDDEN SCHEMA
	77.	PCI-FIELDS-FORBIDDEN SCHEMA

⸻

14. Utility Schemas
	78.	CARD-LAST4 SCHEMA
	79.	CARD-FIRST6 SCHEMA
	80.	CARD-FULLMASK SCHEMA
	81.	CARD-CLEANER SCHEMA (strip spaces, hyphens, invisible unicode)
*/