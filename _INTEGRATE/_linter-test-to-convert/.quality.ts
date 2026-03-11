import { qualitySchema, type Quality } from '@/quality/lint/quality/schemas';

/**
 * TODO(gaia): Comment
 */
const quality: Quality = {
	branding: {
		author: '~',
		license: 'UNLICENSED',
		packagePrefix: '@enzuzo',
		urls: {
			bugs: '',
			funding: '',
			homepage: '',
			repository: '',
		},
	},
	provider: {
		commit: {},
		type: 'gitlab',
		pr: {
			minReviewers: 2,
			minDescriptionLength: 0,
			additions: {
				min: 0,
				max: 0,
			},
			deletions: {
				min: 0,
				max: 0,
			},
			disallowed: {
				dependencies: [], // exceptInPackage
				deletionOf: [],
				exceptInWorkspaceRoot: [],
			},
			requiredPackageScripts: [],
			warnWhenModified: [],
			structure: {
				/*workspace: {
                    apps: {
                        templates,
                        '@business-apps',
                        '*-app'
                    },

                    docs: {
                        'locale-code',
                        '*.md'
                    },

                    shared: {
                        config: {
                            ci: {
                                actions,
                                workflows
                            },
                            format: {
                                // qualityStaticAnalysisTypesSchema
                            },
                            language: {
                                typescript: {
                                    // package.json, README, tsconfig.json
                                }
                            },
                            lint: {
                                // qualityStaticAnalysisTypesSchema +
                                // biome, commit, danger, husky, oxlint, quality, syncpack
                            }
                        },
                        locale: {},
                        schemas: {},
                        utils: {
                            '@business-utils',
                            '~util-*', // util-group
                            'util-',
                            'templates'
                        },
                        ux: {},
                    }
                },*/
			},
		},
	},
	stages: {
		ci: {
			// TODO(gaia): setup .gitlab-ci file -> pnpm quality:ci
			enabled: true,
			rules: [],
		},
		'commit-msg': {
			enabled: true,
			rules: [],
		},
		'pre-commit': {
			enabled: true,
			rules: [],
		},
		'pre-push': {
			enabled: true,
			rules: [],
		},
	},
	staticAnalysis: {
		format: [
			'all-contributors/.all-contributorsrc',
			'astro',
			'biome/biome.json',
			'cloudflare/wrangler.toml',
			'css',
			'docker/.dockerignore',
			'docker/dockerfile',
			'env',
			'eslint/.eslintignore',
			'git/.gitattributes',
			'git/.gitignore',
			'html',
			'javascript',
			'json',
			'md',
			'node/.nvmrc',
			'npm/.npmrc',
			'nx/nx.json',
			'pnpm/pnpm-workspace.yaml',
			'react',
			'sass',
			'scss',
			'sh',
			'svelte',
			'svg',
			'toml',
			'typescript',
			'typescript/tsconfig.json',
			'vscode/.editorconfig',
			'yaml',
		],
		lint: [
			'all-contributors/.all-contributorsrc',
			'astro',
			'biome/biome.json',
			'cloudflare/wrangler.toml',
			'css',
			'docker/.dockerignore',
			'docker/dockerfile',
			'env',
			'eslint/.eslintignore',
			'git/.gitattributes',
			'git/.gitignore',
			'html',
			'javascript',
			'json',
			'md',
			'node/.nvmrc',
			'npm/.npmrc',
			'nx/nx.json',
			'pnpm/pnpm-workspace.yaml',
			'react',
			'sass',
			'scss',
			'sh',
			'svelte',
			'svg',
			'toml',
			'typescript',
			'typescript/tsconfig.json',
			'vscode/.editorconfig',
			'yaml',
		],
	},
	versioning: {
		'@sveltejs/adapter-cloudflare': 'latest',
		'@sveltejs/kit': 'latest',
		'@sveltejs/vite-plugin-svelte': 'latest',
		'svelte-check': 'latest',
		biome: 'latest',
		commitlint: 'latest',
		dangerjs: 'latest',
		husky: 'latest',
		node: 'latest',
		nx: 'latest',
		oxlint: 'latest',
		pnpm: 'latest',
		svelte: 'latest',
		syncpack: 'latest',
		typescript: 'latest',
		unocss: 'latest',
		vite: 'latest',
		vitest: 'latest',
		wrangler: 'latest',
		zod: 'latest',
	},
};

qualitySchema.parse(quality);

export { quality };
