SECTION 1 — CORE REGEXP SCHEMAS
	1.	RegexpStrict Schema — accepts only RegExp objects
	2.	RegexpString Schema — validates regex string form (e.g. "^[a-z]+$")
	3.	RegexpCoerce Schema — string → RegExp object
	4.	RegexpCoerceOptional
	5.	RegexpCoerceNullable
	6.	RegexpLiteral Schema — literal syntax (/foo/i) parser
	7.	RegexpFlags Schema — validates flags (gimuyds)
	8.	RegexpFlagsOptional
	9.	RegexpFlagsCoerce — normalize combined flags string
	10.	RegexpPresent — required regex field

⸻

SECTION 2 — VALIDATION & STRUCTURE
	11.	RegexpPatternSchema — only valid JS regex source allowed
	12.	RegexpPatternSafeSchema — disallow catastrophic backtracking patterns
	13.	RegexpPatternLengthSchema — min/max pattern length
	14.	RegexpAnchoredSchema — must start with ^ and/or end with $
	15.	RegexpUnicodeSchema — enforces u flag or pattern compliance
	16.	RegexpGlobalSchema — enforces g flag presence
	17.	RegexpCaseInsensitiveSchema — enforces i flag presence
	18.	RegexpMultilineSchema — enforces m flag presence
	19.	RegexpDotAllSchema — enforces s flag presence
	20.	RegexpStickySchema — enforces y flag presence
	21.	RegexpHasNamedGroupsSchema
	22.	RegexpHasCaptureGroupsSchema
	23.	RegexpHasLookaheadSchema
	24.	RegexpHasLookbehindSchema
	25.	RegexpNoBackreferencesSchema

⸻

SECTION 3 — COERCION & CONSTRUCTION
	26.	RegexpFromString Schema — "foo" → /foo/
	27.	RegexpFromJSON Schema — {"source":"foo","flags":"i"} → /foo/i
	28.	RegexpFromLiteralString Schema — parses /foo/g text safely
	29.	RegexpFromTemplate Schema — constructs dynamic pattern
	30.	RegexpSerializeToJSONSchema
	31.	RegexpDeserializeSchema
	32.	RegexpNormalizeSchema — trims whitespace, dedups flags
	33.	RegexpCanonicalSchema — canonicalized string form
	34.	RegexpCompileSchema — compile-time validation wrapper
	35.	RegexpSafeCompileSchema — catches SyntaxError

⸻

SECTION 4 — MATCHING & EVALUATION
	36.	RegexpTestSchema — validates { pattern, input, result }
	37.	RegexpExecSchema — captures match[] output shape
	38.	RegexpMatchAllSchema — generator output normalized
	39.	RegexpReplaceSchema — { pattern, input, replacement }
	40.	RegexpSplitSchema — { pattern, input } → string[]
	41.	RegexpSearchSchema — { pattern, input } → index
	42.	RegexpTokenizeSchema — splits text into tokens
	43.	RegexpExtractGroupsSchema — extracts named captures
	44.	RegexpHighlightSchema — computes match ranges
	45.	RegexpFilterArraySchema — filters array by regex match

⸻

SECTION 5 — SECURITY & SANDBOX
	46.	RegexpSafeSchema — timeout-guarded evaluation
	47.	RegexpSandboxedSchema — executes in VM or worker
	48.	RegexpTimeoutSchema — configurable max ms
	49.	RegexpDepthLimitSchema — recursion / quantifier nesting limit
	50.	RegexpCatastrophicCheckSchema — heuristic ReDoS guard
	51.	RegexpEscapedSchema — ensures pattern is escaped literally
	52.	RegexpLiteralOnlySchema — forbids regex metacharacters
	53.	RegexpEscapeInputSchema — escapes arbitrary input safely
	54.	RegexpWhitelistSchema — allow-listed patterns only
	55.	RegexpBlacklistSchema — deny-listed patterns

⸻

SECTION 6 — TYPE / UTILITIES
	56.	RegexpOptional
	57.	RegexpNullable
	58.	RegexpDefault(pattern)
	59.	RegexpEnum(pattern[])
	60.	RegexpArray
	61.	RegexpMap
	62.	RegexpRecord
	63.	RegexpSet
	64.	RegexpWeakSet
	65.	RegexpWeakMap

⸻

SECTION 7 — DOMAIN-SPECIFIC REGEX SCHEMAS
	66.	RegexpEmailSchema
	67.	RegexpURLSchema
	68.	RegexpUUIDSchema
	69.	RegexpIPv4Schema
	70.	RegexpIPv6Schema
	71.	RegexpMacAddressSchema
	72.	RegexpHexColorSchema
	73.	RegexpSlugSchema
	74.	RegexpUsernameSchema
	75.	RegexpPasswordSchema
	76.	RegexpPhoneNumberSchema
	77.	RegexpPostalCodeSchema
	78.	RegexpCurrencySchema
	79.	RegexpDateISO8601Schema
	80.	RegexpTimeSchema
	81.	RegexpHTMLTagSchema
	82.	RegexpCSSClassSchema
	83.	RegexpNumberSchema
	84.	RegexpFloatSchema
	85.	RegexpIntegerSchema
	86.	RegexpEmojiSchema
	87.	RegexpUnicodeLetterSchema
	88.	RegexpWordSchema
	89.	RegexpWhitespaceSchema
	90.	RegexpPunctuationSchema

⸻

SECTION 8 — PERFORMANCE & ANALYTICS
	91.	RegexpBenchmarkSchema — measure compile+exec time
	92.	RegexpStatsSchema — pattern metrics (length, ops, groups)
	93.	RegexpComplexityScoreSchema — heuristic cost metric
	94.	RegexpHotPathSchema — tracks most-used patterns
	95.	RegexpCacheStatsSchema
	96.	RegexpProfileSchema — per-regex runtime profile
	97.	RegexpAnalyzerSchema — AST analysis output
	98.	RegexpOptimizerSchema — simplified equivalent pattern
	99.	RegexpSimplifySchema — normalizes redundant constructs
	100.	RegexpDeterminismSchema — checks deterministic vs ambiguous

⸻

SECTION 9 — STORAGE & SERIALIZATION
	101.	RegexpToJSONSchema
	102.	RegexpFromJSONSchema
	103.	RegexpToBase64Schema
	104.	RegexpFromBase64Schema
	105.	RegexpToHexSchema
	106.	RegexpToStringSchema
	107.	RegexpFromStringSchema
	108.	RegexpToDatabaseSchema
	109.	RegexpFromDatabaseSchema
	110.	RegexpPersistentCacheSchema
	111.	RegexpRegistryEntrySchema
	112.	RegexpManifestSchema

⸻

SECTION 10 — FIELD & DESCRIPTOR FACTORIES
	113.	createRegexpField(description)
	114.	createRegexpPatternField(description,flags)
	115.	RegexpFieldStrict
	116.	RegexpFieldOptional
	117.	RegexpFieldNullable
	118.	RegexpFieldCoerce
	119.	RegexpFieldDefault
	120.	RegexpFieldRecord
	121.	RegexpFieldMap
	122.	RegexpFieldLocalized — per-locale pattern sets
	123.	RegexpFieldDescriptor — includes description, flags, source

⸻

SECTION 11 — TESTING / QA SCHEMAS
	124.	RegexpTestCaseSchema — {input,expected} pairs
	125.	RegexpTestSuiteSchema — group of test cases
	126.	RegexpFuzzCaseSchema
	127.	RegexpMutationTestSchema — verify robustness
	128.	RegexpRegressionTestSchema
	129.	RegexpCoverageSchema
	130.	RegexpBenchmarkResultSchema
	131.	RegexpFixtureSchema

⸻

SECTION 12 — TOOLING / EDITOR INTEGRATION
	132.	RegexpSyntaxHighlightSchema
	133.	RegexpASTSchema
	134.	RegexpTokenSchema
	135.	RegexpParseErrorSchema
	136.	RegexpAutoCompleteSchema
	137.	RegexpLintRuleSchema
	138.	RegexpFormatterSchema
	139.	RegexpVisualizerSchema
	140.	RegexpPlaygroundSchema
	141.	RegexpExampleSchema

⸻

SECTION 13 — CROSS-LANGUAGE / ENGINE SCHEMAS
	142.	RegexpPythonCompatibleSchema
	143.	RegexpPCRECompatibleSchema
	144.	RegexpRE2CompatibleSchema
	145.	RegexpRustCompatibleSchema
	146.	RegexpGoCompatibleSchema
	147.	RegexpJavaCompatibleSchema
	148.	RegexpPOSIXCompatibleSchema
	149.	RegexpOnigurumaCompatibleSchema
	150.	RegexpEngineSchema (engine id, features)

⸻

SECTION 14 — META / MONITORING
	151.	RegexpUsageStatsSchema
	152.	RegexpErrorLogSchema
	153.	RegexpWarningSchema
	154.	RegexpAuditTrailSchema
	155.	RegexpSecurityEventSchema
	156.	RegexpPolicySchema
	157.	RegexpGovernanceSchema
	158.	RegexpSchemaVersionSchema
	159.	RegexpSchemaManifestSchema
	160.	RegexpSchemaRegistrySchema