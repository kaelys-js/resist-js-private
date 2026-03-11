// Commitlint configuration
// https://commitlint.js.org/

/** @type {import('@commitlint/types').UserConfig} */
export default {
	extends: ['@commitlint/config-conventional'],
	parserPreset: 'conventional-changelog-conventionalcommits',
	rules: {
		// Type
		'type-enum': [
			2,
			'always',
			[
				'feat', // New feature
				'fix', // Bug fix
				'docs', // Documentation
				'style', // Formatting, missing semicolons, etc.
				'refactor', // Code change that neither fixes a bug nor adds a feature
				'perf', // Performance improvement
				'test', // Adding missing tests
				'build', // Build system or external dependencies
				'ci', // CI configuration
				'chore', // Other changes that don't modify src or test files
				'revert', // Reverts a previous commit
				'wip', // Work in progress
			],
		],
		'type-case': [2, 'always', 'lower-case'],
		'type-empty': [2, 'never'],

		// Scope
		'scope-case': [2, 'always', 'kebab-case'],
		'scope-enum': [
			1,
			'always',
			[
				// Global
				'config',
				'bac',
				'admin',
				'deps',
				'ci',
				'release',

				// Shared packages
				'schemas',
				'db',
				'utils',
				'ui',
				'types',

				// Product layers
				'api',
				'app',
				'marketing',
				'status',
				'iac',
				'assets',
				'tester',

				// Tools
				'linter',
				'formatter',
				'scripts',
			],
		],

		// Subject
		'subject-case': [2, 'always', 'sentence-case'],
		'subject-empty': [2, 'never'],
		'subject-full-stop': [2, 'never', '.'],
		'subject-max-length': [2, 'always', 72],
		'subject-min-length': [2, 'always', 10],

		// Header
		'header-max-length': [2, 'always', 100],
		'header-min-length': [2, 'always', 15],

		// Body
		'body-leading-blank': [2, 'always'],
		'body-max-line-length': [2, 'always', 100],
		'body-min-length': [0, 'always', 20],

		// Footer
		'footer-leading-blank': [2, 'always'],
		'footer-max-line-length': [2, 'always', 100],

		// References
		'references-empty': [1, 'never'],

		// Signed-off-by
		'signed-off-by': [0, 'always', 'Signed-off-by:'],

		// Trailer
		'trailer-exists': [0, 'always', 'Signed-off-by:'],
	},
	prompt: {
		questions: {
			type: {
				description: 'Select the type of change that you\'re committing',
				enum: {
					feat: {
						description: 'A new feature',
						title: 'Features',
						emoji: '✨',
					},
					fix: {
						description: 'A bug fix',
						title: 'Bug Fixes',
						emoji: '🐛',
					},
					docs: {
						description: 'Documentation only changes',
						title: 'Documentation',
						emoji: '📚',
					},
					style: {
						description: 'Changes that do not affect the meaning of the code',
						title: 'Styles',
						emoji: '💎',
					},
					refactor: {
						description: 'A code change that neither fixes a bug nor adds a feature',
						title: 'Code Refactoring',
						emoji: '📦',
					},
					perf: {
						description: 'A code change that improves performance',
						title: 'Performance Improvements',
						emoji: '🚀',
					},
					test: {
						description: 'Adding missing tests or correcting existing tests',
						title: 'Tests',
						emoji: '🚨',
					},
					build: {
						description: 'Changes that affect the build system or external dependencies',
						title: 'Builds',
						emoji: '🛠',
					},
					ci: {
						description: 'Changes to our CI configuration files and scripts',
						title: 'Continuous Integrations',
						emoji: '⚙️',
					},
					chore: {
						description: 'Other changes that don\'t modify src or test files',
						title: 'Chores',
						emoji: '♻️',
					},
					revert: {
						description: 'Reverts a previous commit',
						title: 'Reverts',
						emoji: '🗑',
					},
				},
			},
			scope: {
				description: 'What is the scope of this change (e.g. component or file name)',
			},
			subject: {
				description: 'Write a short, imperative tense description of the change',
			},
			body: {
				description: 'Provide a longer description of the change',
			},
			isBreaking: {
				description: 'Are there any breaking changes?',
			},
			breakingBody: {
				description: 'A BREAKING CHANGE commit requires a body. Please enter a longer description',
			},
			breaking: {
				description: 'Describe the breaking changes',
			},
			isIssueAffected: {
				description: 'Does this change affect any open issues?',
			},
			issuesBody: {
				description: 'If issues are closed, the commit requires a body. Please enter a longer description',
			},
			issues: {
				description: 'Add issue references (e.g. "fix #123", "re #123")',
			},
		},
	},
};
