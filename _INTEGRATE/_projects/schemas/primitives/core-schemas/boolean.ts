/*
BooleanLoose:  "true" | "false" | 1 | 0 | "1" | "0" | true | false.
BooleanCoerceString: "yes/no", "on/off", "y/n" → boolean.
BooleanCoerceInt: 1 → true, 0 → false, rejects others.
BooleanCoerceFlexible: mixes string + number + boolean safely.
BooleanCoerceQuery: URL query param mode:
	•	?flag → true
	•	?flag= empty → false
	•	?flag=false → false
	•	?flag=1 → true

BooleanCoerceFormField: supports HTML form values:
	•	"on", "off"
	•	"checked"
	•	"true", "false"
	•	"0", "1"
BooleanAndSchema
BooleanOrSchema
BooleanXorSchema
BooleanNotSchema
BooleanBitmask8
BooleanBitmask32
BooleanBitmask64
BooleanBitFlags
BooleanCheckbox: 'on' | 'off' | boolean
BooleanToggle: boolean + transition state.
BooleanRadioYesNo: 'yes' | 'no' → coerces to boolean.
BooleanPrivacySetting: 'enabled' | 'disabled' | 'unset'
BooleanCookieChoice: 'accept' | 'reject' | 'unset'
BooleanTrackingPreference: GDPR TCF-style yes/no/consent string → boolean/null.
BooleanHTTPHeader: '1' | '0' | 'true' | 'false' | boolean
BooleanCacheDirective: validates boolean dict for Cache-Control (no-store, must-revalidate)
BooleanQueryParam: URLSearchParams-safe boolean.
BooleanFlagParam: ?flag → true, ?flag=false → false.
BooleanDBTinyInt: MySQL TINYINT(1) → boolean
BooleanDBPostgresBool: 't' | 'f' | boolean
BooleanSQLiteBool: integer 0/1
*/