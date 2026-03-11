/** @type {import('ember-template-lint').Configuration} */
export default {
	extends: 'recommended',
	rules: {
		// Accessibility
		'no-invalid-interactive': 'error',
		'no-redundant-role': 'error',
		'require-button-type': 'error',
		'require-input-label': 'error',
		'require-valid-alt-text': 'error',

		// Best practices
		'no-bare-strings': 'off', // Enable if using i18n
		'no-html-comments': 'warn',
		'no-inline-styles': 'warn',
		'no-triple-curlies': 'error',
		'no-unnecessary-concat': 'warn',

		// Formatting
		'block-indentation': 2,
		'linebreak-style': 'unix',
		'no-trailing-spaces': 'error',
		'quotes': 'double',
		'self-closing-void-elements': 'error',

		// Ember specific (disabled for general Handlebars)
		'no-action': 'off',
		'no-curly-component-invocation': 'off',
		'no-implicit-this': 'off',
	},
	ignore: [
		'node_modules/**',
		'dist/**',
		'build/**',
	],
};
