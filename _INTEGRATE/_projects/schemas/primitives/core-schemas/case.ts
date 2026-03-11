✅ STRING CASE SCHEMAS — COMPLETE LIST

A. Canonical case formats
	1.	STRING-LOWERCASE
	2.	STRING-UPPERCASE
	3.	STRING-CAPITALIZED (first letter upper, rest lower)
	4.	STRING-TITLE-CASE
	5.	STRING-SENTENCE-CASE
	6.	STRING-INVERTED-CASE (flip capitals)

⸻

B. Code-style identifier formats
	7.	STRING-CAMEL-CASE
	8.	STRING-PASCAL-CASE
	9.	STRING-SNAKE-CASE
	10.	STRING-SCREAMING-SNAKE-CASE
	11.	STRING-KEBAB-CASE
	12.	STRING-TRAIN-CASE (Capitalized-Kebab-Case)
	13.	STRING-FLAT-CASE (nocase, alphanum only)
	14.	STRING-CONSTANT-CASE (UPPER.CONST.FORMAT)

⸻

C. Special forms
	15.	STRING-DOT-CASE (a.b.c)
	16.	STRING-PATH-CASE (a/b/c)
	17.	STRING-SPACE-CASE (“foo bar baz”)
	18.	STRING-ALPHANUMERIC-CASE (no separators)

⸻

D. Locale-aware case types
	19.	STRING-LOCALE-UPPERCASE
	20.	STRING-LOCALE-LOWERCASE
	21.	STRING-LOCALE-TITLECASE
	22.	STRING-LOCALE-FOLDCASE (case-insensitive canonicalization)

⸻

E. UX / content case rules
	23.	STRING-UI-LABEL-CASE (capitalized labels)
	24.	STRING-UI-BUTTON-CASE (title-case, short words lowercased)
	25.	STRING-UI-HEADLINE-CASE
	26.	STRING-UI-SENTENCE-LONGFORM-CASE
	27.	STRING-UI-PROPER-NOUN-CASE (preserve proper nouns)

⸻

F. SEO / slug formats
	28.	STRING-SLUG-CASE
	29.	STRING-SLUG-CASE-STRICT (ASCII only)
	30.	STRING-URL-SLUG-CASE (full normalization + NFC)

⸻

G. File/system identifier formats
	31.	STRING-FILENAME-CASE (safe, lowercase, hyphens)
	32.	STRING-MODULE-NAME-CASE (JS/TS package name: lowercase+hyphens)
	33.	STRING-NAMESPACE-CASE (Pascal.NamespaceCase)

⸻

H. API / backend identifier case
	34.	STRING-API-FIELD-CASE (camelCase)
	35.	STRING-API-PAYLOAD-CASE-STRICT
	36.	STRING-DB-COLUMN-CASE (snake_case)
	37.	STRING-DB-CONSTRAINT-NAME-CASE
	38.	STRING-GRAPHQL-FIELD-CASE (camelCase)
	39.	STRING-GRAPHQL-TYPE-CASE (PascalCase)

⸻

I. Analytics / event-case schemas
	40.	STRING-EVENT-NAME-CASE (kebab or snake)
	41.	STRING-TELEMETRY-KEY-CASE (flatcase or snake)
	42.	STRING-FEATURE-FLAG-CASE (kebab-case)

⸻

J. Security / canonicalization case schemas
	43.	STRING-CASE-FOLD-NFKC
	44.	STRING-CASE-FOLD-NFD
	45.	STRING-SECURE-UNICODE-LOWER (strip unsafe case mappings)
	46.	STRING-SECURE-UNICODE-UPPER
	47.	STRING-ASCII-FOLDCASE (remove accents + lowercase)

⸻

K. Detection-only (not transform)
	48.	STRING-IS-CAMEL-CASE
	49.	STRING-IS-PASCAL-CASE
	50.	STRING-IS-SNAKE-CASE
	51.	STRING-IS-KEBAB-CASE
	52.	STRING-IS-TITLE-CASE
	53.	STRING-IS-SCREAMING-SNAKE
	54.	STRING-IS-FLAT-CASE
	55.	STRING-IS-SLUG-CASE
	56.	STRING-IS-LOWERCASE
	57.	STRING-IS-UPPERCASE

(These are important because your system has transformers and validators.)

⸻

L. Composite or advanced
	58.	STRING-MULTI-CASE-ACCEPT (auto-detect and normalize)
	59.	STRING-CASE-COERCE (any → target case)
	60.	STRING-CASE-PERMISSIVE (accepts multiple patterns)
	61.	STRING-CASE-STRICT (must be exact match of pattern)

⸻

M. Human names
	62.	STRING-NAMECASE (John Smith)
	63.	STRING-NAMECASE-STRICT (no all-lower, no all-upper)
	64.	STRING-NAMECASE-PROPER (preserve surname prefixes: Mc, O’, von, van)

⸻

N. Product naming
	65.	STRING-PRODUCT-NAME-CASE (Brand-Safe Capitalization)
	66.	STRING-MARKETING-CASE (Title Case with stopword rules)