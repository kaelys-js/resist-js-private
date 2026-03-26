/** @type {import('dependency-cruiser').IConfiguration} */
export default {
	forbidden: [
		// No circular dependencies
		{
			name: 'no-circular',
			severity: 'error',
			comment: 'Circular dependencies lead to maintenance nightmares',
			from: {},
			to: {
				circular: true,
			},
		},

		// No orphans (files not reachable from entry points)
		{
			name: 'no-orphans',
			severity: 'warn',
			comment: 'Files that are not reachable from entry points might be dead code',
			from: {
				orphan: true,
				pathNot: [
					'\\.d\\.ts$',
					'\\.test\\.',
					'\\.spec\\.',
					'__tests__',
					'__mocks__',
					'fixtures',
				],
			},
			to: {},
		},

		// No deprecated dependencies
		{
			name: 'no-deprecated-core',
			severity: 'warn',
			comment: 'Deprecated Node.js core modules should not be used',
			from: {},
			to: {
				dependencyTypes: ['core'],
				path: ['^(punycode|domain|constants|sys|_linklist|_stream_wrap)$'],
			},
		},

		// No dependencies on devDependencies from production code
		{
			name: 'not-to-dev-dep',
			severity: 'error',
			comment: 'Production code should not depend on devDependencies',
			from: {
				path: '^src/',
				pathNot: ['\\.test\\.', '\\.spec\\.', '__tests__', '__mocks__'],
			},
			to: {
				dependencyTypes: ['npm-dev'],
			},
		},

		// No dependencies on optionalDependencies
		{
			name: 'no-optional-deps',
			severity: 'warn',
			comment: 'Optional dependencies might not be installed',
			from: {},
			to: {
				dependencyTypes: ['npm-optional'],
			},
		},

		// Shared packages should not depend on product packages
		{
			name: 'shared-not-to-products',
			severity: 'error',
			comment: 'Shared packages must not depend on product-specific code',
			from: {
				path: '^shared/',
			},
			to: {
				path: '^products/',
			},
		},

		// Products should not depend on other products
		{
			name: 'products-isolated',
			severity: 'error',
			comment: 'Products must be isolated from each other',
			from: {
				path: '^products/([^/]+)/',
			},
			to: {
				path: '^products/(?!$1)[^/]+/',
			},
		},

		// Config layer should not depend on anything except schemas
		{
			name: 'config-dependencies',
			severity: 'error',
			comment: 'Config can only depend on schemas',
			from: {
				path: '^config/',
			},
			to: {
				pathNot: ['^shared/schemas/', '^node_modules/'],
			},
		},

		// API layer should follow hexagonal architecture
		{
			name: 'api-domain-pure',
			severity: 'error',
			comment: 'Domain layer should not depend on adapters or handlers',
			from: {
				path: 'api/domain/',
			},
			to: {
				path: 'api/(adapters|handlers)/',
			},
		},

		// No dynamic requires in production code
		{
			name: 'no-dynamic-require',
			severity: 'warn',
			comment: 'Dynamic requires make static analysis difficult',
			from: {
				pathNot: ['scripts/', '\\.config\\.'],
			},
			to: {
				dynamic: true,
			},
		},

		// No non-package imports
		{
			name: 'no-non-package-json',
			severity: 'error',
			comment: 'Non-package.json imports might break',
			from: {},
			to: {
				dependencyTypes: ['npm-no-pkg', 'npm-unknown'],
			},
		},
	],

	options: {
		doNotFollow: {
			path: ['node_modules'],
			dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled'],
		},

		exclude: {
			path: [
				'node_modules',
				'\\.d\\.ts$',
				'\\.test\\.',
				'\\.spec\\.',
				'__tests__',
				'__mocks__',
				'coverage',
				'dist',
				'build',
				'\\.svelte-kit',
			],
		},

		includeOnly: {
			path: ['^src/', '^lib/', '^shared/', '^products/', '^config/', '^admin/', '^bac/'],
		},

		tsPreCompilationDeps: true,

		tsConfig: {
			fileName: 'tsconfig.json',
		},

		combinedDependencies: true,

		externalModuleResolutionStrategy: 'node_modules',

		progress: {
			type: 'performance-log',
		},

		reporterOptions: {
			dot: {
				collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)',
				theme: {
					graph: {
						splines: 'ortho',
					},
					modules: [
						{
							criteria: { source: '^src/domain/' },
							attributes: { fillcolor: '#ccffcc' },
						},
						{
							criteria: { source: '^src/adapters/' },
							attributes: { fillcolor: '#ffcccc' },
						},
						{
							criteria: { source: '^src/handlers/' },
							attributes: { fillcolor: '#ccccff' },
						},
					],
					dependencies: [
						{
							criteria: { resolved: '^node_modules/' },
							attributes: { style: 'dashed' },
						},
					],
				},
			},
			archi: {
				collapsePattern: '^(packages|src|lib)/[^/]+|node_modules/(@[^/]+/[^/]+|[^/]+)',
				theme: {
					graph: { rankdir: 'TB' },
				},
			},
		},
	},
};
