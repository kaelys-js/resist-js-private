#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { basename, extname, resolve, dirname, join } from 'node:path';
import { argv, exit, cwd } from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const configDir = resolve(rootDir, 'config');

const args = argv.slice(2);
const files = args.filter((a) => !a.startsWith('--'));
const flags = args.filter((a) => a.startsWith('--'));
const fix = flags.includes('--fix');
const format = flags.includes('--json') ? 'json' : 'unix';

// Custom rules flags
const stageFlag = flags.find((f) => f.startsWith('--stage='));
const stage = stageFlag ? stageFlag.split('=')[1] : 'lint';
const categoryFlag = flags.find((f) => f.startsWith('--category='));
const categories = categoryFlag ? categoryFlag.split('=')[1].split(',') : [];
const ruleFlag = flags.find((f) => f.startsWith('--rule='));
const ruleIds = ruleFlag ? ruleFlag.split('=')[1].split(',') : [];
const listRules = flags.includes('--list-rules');
const skipCustomRules = flags.includes('--no-custom-rules');
const onlyCustomRules = flags.includes('--only-custom-rules');

const results = [];

function getLinter(file) {
	const ext = extname(file).toLowerCase();
	const base = basename(file).toLowerCase();

	// Exact filename matches
	const filenameLinters = {
		'.editorconfig': lintEditorconfig,
		'.npmrc': lintNpmrc,
		'.nvmrc': lintNvmrc,
		'.gitignore': lintIgnoreFile,
		'.dockerignore': lintIgnoreFile,
		'.prettierignore': lintIgnoreFile,
		'.eslintignore': lintIgnoreFile,
		'.gitattributes': lintGitattributes,
		'.all-contributorsrc': lintJsonSchema,
		'.env': lintEnv,
		'dockerfile': lintDockerfile,
		'makefile': lintMakefile,
		'gnumakefile': lintMakefile,
		'cmakelists.txt': lintCmake,
		'cargo.toml': lintCargoToml,
		'pyproject.toml': lintPyprojectToml,
		'package.json': lintPackageJson,
		'tsconfig.json': lintJsonSchema,
		'composer.json': lintJsonSchema,
		'gemfile': lintRuby,
		'rakefile': lintRuby,
		'podfile': lintRuby,
		'fastfile': lintRuby,
		'appfile': lintRuby,
		'matchfile': lintRuby,
		'vagrantfile': lintRuby,
		'.rubocop.yml': lintYamllint,
		'justfile': lintJustfile,
		'.prettierrc': lintJsonSchema,
		'.eslintrc': lintJsonSchema,
		'biome.json': lintJsonSchema,
		'biome.jsonc': lintJsonSchema,
		'turbo.json': lintJsonSchema,
		'vercel.json': lintJsonSchema,
		'netlify.toml': lintTaplo,
		'wrangler.toml': lintTaplo,
		'deno.json': lintJsonSchema,
		'deno.jsonc': lintJsonSchema,
		// Helm
		'chart.yaml': lintHelmChart,
		'chart.yml': lintHelmChart,
		'values.yaml': lintHelmValues,
		'values.yml': lintHelmValues,
		// GitHub
		'codeowners': lintCodeowners,
		'funding.yml': lintGitHubFunding,
		'dependabot.yml': lintDependabot,
		'dependabot.yaml': lintDependabot,
	};

	if (filenameLinters[base]) {
		return filenameLinters[base];
	}

	// Kubernetes manifests (detect by content or path patterns)
	if ((ext === '.yaml' || ext === '.yml') && isKubernetesManifest(file)) {
		return lintKubernetes;
	}

	// GitHub files (path-based detection)
	const normalizedPath = file.replace(/\\/g, '/');
	if (normalizedPath.includes('.github/')) {
		// GitHub Actions workflows
		if (normalizedPath.includes('.github/workflows/') && (ext === '.yml' || ext === '.yaml')) {
			return lintGitHubWorkflow;
		}
		// Issue templates
		if (normalizedPath.includes('.github/ISSUE_TEMPLATE/') && (ext === '.yml' || ext === '.yaml' || ext === '.md')) {
			return lintGitHubIssueTemplate;
		}
		// PR template
		if (base === 'pull_request_template.md' || normalizedPath.includes('pull_request_template')) {
			return lintGitHubPrTemplate;
		}
	}

	// Prefix matches
	if (base.startsWith('.env')) return lintEnv;
	if (base.startsWith('dockerfile')) return lintDockerfile;
	if (base.startsWith('docker-compose')) return lintDockerCompose;
	if (base.startsWith('makefile')) return lintMakefile;
	if (base.startsWith('.eslintrc')) return lintJsonSchema;
	if (base.startsWith('.prettierrc')) return lintJsonSchema;

	// Extension-based linters
	const extLinters = {
		// JavaScript/TypeScript ecosystem
		'.ts': lintOxlint,
		'.tsx': lintOxlint,
		'.js': lintOxlint,
		'.jsx': lintOxlint,
		'.mts': lintOxlint,
		'.cts': lintOxlint,
		'.mjs': lintOxlint,
		'.cjs': lintOxlint,
		'.svelte': lintOxlint,
		'.vue': lintOxlint,
		'.astro': lintAstro,

		// Data formats
		'.json': lintJson,
		'.jsonc': lintJson,
		'.json5': lintJson,
		'.yaml': lintYamllint,
		'.yml': lintYamllint,
		'.toml': lintTaplo,
		'.xml': lintXml,
		'.csv': lintCsv,

		// Web
		'.css': lintStylelint,
		'.scss': lintStylelint,
		'.sass': lintStylelint,
		'.less': lintStylelint,
		'.html': lintHtmlhint,
		'.htm': lintHtmlhint,
		'.svg': lintSvg,
		'.hbs': lintHandlebars,
		'.handlebars': lintHandlebars,

		// Documentation
		'.md': lintMarkdownlint,
		'.mdx': lintMarkdownlint,
		'.rst': lintRst,
		'.adoc': lintAsciidoc,

		// Shell
		'.sh': lintShellcheck,
		'.bash': lintShellcheck,
		'.zsh': lintZsh,
		'.fish': lintFish,
		'.ps1': lintPowershell,
		'.psm1': lintPowershell,
		'.psd1': lintPowershell,
		'.bat': lintBatch,
		'.cmd': lintBatch,

		// Python
		'.py': lintPython,
		'.pyi': lintPython,
		'.pyx': lintPython,
		'.pxd': lintPython,

		// Rust
		'.rs': lintRust,

		// C/C++
		'.c': lintClang,
		'.h': lintClang,
		'.cpp': lintClang,
		'.cc': lintClang,
		'.cxx': lintClang,
		'.hpp': lintClang,
		'.hxx': lintClang,
		'.c++': lintClang,
		'.h++': lintClang,
		'.m': lintClang,
		'.mm': lintClang,

		// Swift
		'.swift': lintSwift,

		// Go
		'.go': lintGo,
		'.mod': lintGoMod,

		// Java/JVM
		'.java': lintJava,
		'.kt': lintKotlin,
		'.kts': lintKotlin,
		'.scala': lintScala,
		'.groovy': lintGroovy,
		'.gradle': lintGroovy,

		// .NET
		'.cs': lintCsharp,
		'.fs': lintFsharp,
		'.vb': lintVb,

		// Ruby
		'.rb': lintRuby,
		'.rake': lintRuby,
		'.gemspec': lintRuby,

		// PHP
		'.php': lintPhp,
		'.phtml': lintPhp,

		// Lua
		'.lua': lintLua,

		// Perl
		'.pl': lintPerl,
		'.pm': lintPerl,

		// Elixir/Erlang
		'.ex': lintElixir,
		'.exs': lintElixir,
		'.erl': lintErlang,
		'.hrl': lintErlang,

		// Haskell
		'.hs': lintHaskell,
		'.lhs': lintHaskell,

		// OCaml/ReasonML
		'.ml': lintOcaml,
		'.mli': lintOcaml,
		'.re': lintReason,
		'.rei': lintReason,

		// Zig
		'.zig': lintZig,

		// Nim
		'.nim': lintNim,

		// V
		'.v': lintVlang,

		// Crystal
		'.cr': lintCrystal,

		// D
		'.d': lintDlang,

		// Julia
		'.jl': lintJulia,

		// R
		'.r': lintR,
		'.R': lintR,

		// SQL
		'.sql': lintSqlfluff,

		// Infrastructure
		'.tf': lintTerraform,
		'.tfvars': lintTerraform,
		'.hcl': lintHcl,
		'.pkr.hcl': lintPacker,
		'.nomad': lintNomad,
		'.sentinel': lintSentinel,

		// Kubernetes/Helm
		'.helmignore': lintIgnoreFile,

		// GraphQL
		'.graphql': lintGraphql,
		'.gql': lintGraphql,

		// Protocol Buffers
		'.proto': lintProtobuf,

		// Thrift
		'.thrift': lintThrift,

		// Nix
		'.nix': lintNix,

		// Dhall
		'.dhall': lintDhall,

		// CUE
		'.cue': lintCue,

		// Jsonnet
		'.jsonnet': lintJsonnet,
		'.libsonnet': lintJsonnet,

		// Starlark/Bazel
		'.bzl': lintBazel,
		'.bazel': lintBazel,
		'.star': lintBazel,

		// Make/Build
		'.mk': lintMakefile,
		'.cmake': lintCmake,
		'.ninja': lintNinja,

		// Config
		'.ini': lintIni,
		'.conf': lintConf,
		'.cfg': lintConf,
		'.properties': lintProperties,

		// LaTeX
		'.tex': lintLatex,
		'.bib': lintBibtex,

		// Solidity
		'.sol': lintSolidity,

		// Move
		'.move': lintMove,

		// Vyper
		'.vy': lintVyper,

		// WASM
		'.wat': lintWat,
		'.wast': lintWat,
	};

	return extLinters[ext] || null;
}

// ============================================
// JavaScript/TypeScript/Web
// ============================================

function lintOxlint(file) {
	const configPath = join(configDir, 'oxlint.json');
	const configFlag = existsSync(configPath) ? `-c "${configPath}"` : '';
	return runCli(
		fix ? `oxlint ${configFlag} --fix --format=unix "${file}"` : `oxlint ${configFlag} --format=unix "${file}"`,
		parseUnixOutput
	);
}

function lintAstro(file) {
	const oxlintErrors = lintOxlint(file);
	const astroErrors = runCli(`astro check "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):(\d+)\s+-\s+(error|warning|hint):\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: parseInt(match[3], 10),
						severity: match[4] === 'hint' ? 'info' : match[4],
						message: match[5],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
	return [...oxlintErrors, ...astroErrors];
}

function lintJson(file) {
	try {
		const content = readFileSync(file, 'utf8');
		JSON.parse(content);
		return [];
	} catch (e) {
		const match = e.message.match(/at position (\d+)/);
		const pos = match ? parseInt(match[1], 10) : 0;
		const { line, column } = getLineCol(file, pos);
		return [{ file, line, column, severity: 'error', message: e.message }];
	}
}

function lintJsonSchema(file) {
	return lintJson(file);
}

function lintPackageJson(file) {
	const errors = lintJson(file);
	if (errors.length > 0) return errors;

	try {
		const content = JSON.parse(readFileSync(file, 'utf8'));
		const warnings = [];

		if (!content.name) {
			warnings.push({ file, line: 1, column: 1, severity: 'warning', message: 'Missing "name" field' });
		}
		if (!content.version) {
			warnings.push({ file, line: 1, column: 1, severity: 'warning', message: 'Missing "version" field' });
		}
		if (content.main && content.type === 'module' && !content.main.endsWith('.mjs')) {
			warnings.push({ file, line: 1, column: 1, severity: 'info', message: 'Consider using .mjs extension for "main" in ESM packages' });
		}

		return warnings;
	} catch {
		return [];
	}
}

function lintStylelint(file) {
	const configPath = join(configDir, '.stylelintrc.json');
	const configFlag = existsSync(configPath) ? `--config "${configPath}"` : '';
	return runCli(
		fix ? `stylelint ${configFlag} --fix --formatter=unix "${file}"` : `stylelint ${configFlag} --formatter=unix "${file}"`,
		parseUnixOutput
	);
}

function lintHtmlhint(file) {
	const configPath = join(configDir, '.htmlhintrc');
	const configFlag = existsSync(configPath) ? `-c "${configPath}"` : '';
	return runCli(`htmlhint ${configFlag} --format=unix "${file}"`, parseUnixOutput);
}

function lintSvg(file) {
	// Use svglint if available, otherwise fall back to custom validation
	if (isToolAvailable('svglint')) {
		const configPath = join(configDir, '.svglintrc.js');
		const configFlag = existsSync(configPath) ? `--config "${configPath}"` : '';
		return runCli(`svglint ${configFlag} --ci "${file}"`, (output) => {
			// svglint outputs in format: file:line:column message
			return output
				.trim()
				.split('\n')
				.filter((line) => line.includes(':'))
				.map((line) => {
					const match = line.match(/^(.+?):(\d+):(\d+)\s+(.+)$/);
					if (match) {
						return {
							file: match[1],
							line: parseInt(match[2], 10),
							column: parseInt(match[3], 10),
							severity: line.toLowerCase().includes('error') ? 'error' : 'warning',
							message: match[4],
						};
					}
					// Try simpler format
					const simpleMatch = line.match(/^(.+?):\s*(.+)$/);
					if (simpleMatch) {
						return {
							file,
							line: 1,
							column: 1,
							severity: 'warning',
							message: simpleMatch[2],
						};
					}
					return null;
				})
				.filter(Boolean);
		});
	}

	// Fallback: custom SVG validation
	const errors = [];
	try {
		const content = readFileSync(file, 'utf8');
		const lines = content.split('\n');

		// Check for SVG root element
		if (!content.includes('<svg')) {
			errors.push({ file, line: 1, column: 1, severity: 'error', message: 'Not a valid SVG: missing <svg> element' });
		}

		// Check for xmlns
		if (!content.includes('xmlns')) {
			errors.push({ file, line: 1, column: 1, severity: 'warning', message: 'Missing xmlns attribute on <svg> element' });
		}

		// Check for viewBox (recommended)
		if (!content.includes('viewBox')) {
			errors.push({ file, line: 1, column: 1, severity: 'warning', message: 'Missing viewBox attribute - recommended for responsive SVGs' });
		}

		// Security checks
		if (content.includes('<script')) {
			const lineNum = lines.findIndex((l) => l.includes('<script')) + 1;
			errors.push({ file, line: lineNum, column: 1, severity: 'error', message: 'SVG contains <script> tag - security risk' });
		}

		if (content.includes('onclick') || content.includes('onload') || content.includes('onerror')) {
			const lineNum = lines.findIndex((l) => /on(click|load|error)/.test(l)) + 1;
			errors.push({ file, line: lineNum, column: 1, severity: 'error', message: 'SVG contains inline event handlers - security risk' });
		}

		if (content.includes('javascript:')) {
			const lineNum = lines.findIndex((l) => l.includes('javascript:')) + 1;
			errors.push({ file, line: lineNum, column: 1, severity: 'error', message: 'SVG contains javascript: URL - security risk' });
		}

		// Check for external references
		if (content.includes('xlink:href="http') || content.includes('href="http')) {
			const lineNum = lines.findIndex((l) => /href="http/.test(l)) + 1;
			errors.push({ file, line: lineNum, column: 1, severity: 'warning', message: 'SVG contains external URL reference' });
		}

		// Check for foreignObject (can embed HTML)
		if (content.includes('<foreignObject')) {
			const lineNum = lines.findIndex((l) => l.includes('<foreignObject')) + 1;
			errors.push({ file, line: lineNum, column: 1, severity: 'warning', message: 'SVG contains <foreignObject> - can embed arbitrary HTML' });
		}

		// Check for proper XML structure
		const openTags = (content.match(/<[a-zA-Z][^/>]*>/g) || []).length;
		const closeTags = (content.match(/<\/[a-zA-Z][^>]*>/g) || []).length;
		const selfClosing = (content.match(/<[a-zA-Z][^>]*\/>/g) || []).length;
		if (openTags !== closeTags + selfClosing) {
			errors.push({ file, line: 1, column: 1, severity: 'error', message: 'SVG has mismatched tags - malformed XML' });
		}
	} catch (e) {
		errors.push({ file, line: 1, column: 1, severity: 'error', message: e.message });
	}
	return errors;
}

function lintHandlebars(file) {
	// Use ember-template-lint if available (works for any Handlebars)
	if (isToolAvailable('ember-template-lint')) {
		const configPath = join(configDir, '.ember-template-lint.js');
		const configFlag = existsSync(configPath) ? `--config-path "${configPath}"` : '';
		return runCli(`ember-template-lint ${configFlag} "${file}" --format=json`, (output) => {
			try {
				const results = JSON.parse(output);
				const fileResults = results[file] || [];
				return fileResults.map((r) => ({
					file,
					line: r.line || 1,
					column: r.column || 1,
					severity: r.severity === 2 ? 'error' : 'warning',
					message: `${r.rule}: ${r.message}`,
				}));
			} catch {
				// Fallback to parsing text output
				return output
					.trim()
					.split('\n')
					.filter((line) => line.includes(':'))
					.map((line) => {
						const match = line.match(/^(.+):(\d+):(\d+)\s+(.+)$/);
						if (match) {
							return {
								file: match[1],
								line: parseInt(match[2], 10),
								column: parseInt(match[3], 10),
								severity: line.toLowerCase().includes('error') ? 'error' : 'warning',
								message: match[4],
							};
						}
						return null;
					})
					.filter(Boolean);
			}
		});
	}

	// Fallback: basic Handlebars validation
	const errors = [];
	try {
		const content = readFileSync(file, 'utf8');
		const lines = content.split('\n');

		// Check for unclosed Handlebars expressions
		let openBlocks = [];
		lines.forEach((line, i) => {
			const lineNum = i + 1;

			// Check for opening block helpers
			const blockOpen = line.matchAll(/\{\{#(\w+)/g);
			for (const match of blockOpen) {
				openBlocks.push({ name: match[1], line: lineNum });
			}

			// Check for closing block helpers
			const blockClose = line.matchAll(/\{\{\/(\w+)/g);
			for (const match of blockClose) {
				const expected = openBlocks.pop();
				if (!expected) {
					errors.push({
						file,
						line: lineNum,
						column: match.index + 1,
						severity: 'error',
						message: `Unexpected closing block {{/${match[1]}}} without matching opening`,
					});
				} else if (expected.name !== match[1]) {
					errors.push({
						file,
						line: lineNum,
						column: match.index + 1,
						severity: 'error',
						message: `Mismatched block: expected {{/${expected.name}}} but found {{/${match[1]}}}`,
					});
				}
			}

			// Check for unclosed expressions on the same line
			const unclosed = (line.match(/\{\{/g) || []).length - (line.match(/\}\}/g) || []).length;
			if (unclosed > 0) {
				errors.push({
					file,
					line: lineNum,
					column: 1,
					severity: 'warning',
					message: 'Potentially unclosed Handlebars expression',
				});
			}

			// Check for triple-stash (unescaped HTML) - security warning
			if (line.includes('{{{')) {
				const col = line.indexOf('{{{') + 1;
				errors.push({
					file,
					line: lineNum,
					column: col,
					severity: 'warning',
					message: 'Unescaped HTML ({{{...}}}) may be a security risk - ensure content is trusted',
				});
			}
		});

		// Report unclosed blocks
		for (const block of openBlocks) {
			errors.push({
				file,
				line: block.line,
				column: 1,
				severity: 'error',
				message: `Unclosed block helper {{#${block.name}}} - missing {{/${block.name}}}`,
			});
		}
	} catch (e) {
		errors.push({ file, line: 1, column: 1, severity: 'error', message: e.message });
	}
	return errors;
}

// ============================================
// Documentation
// ============================================

function lintMarkdownlint(file) {
	const configPath = join(configDir, '.markdownlint.jsonc');
	const configFlag = existsSync(configPath) ? `-c "${configPath}"` : '';
	return runCli(
		fix ? `markdownlint ${configFlag} --fix "${file}"` : `markdownlint ${configFlag} "${file}"`,
		(output) => {
			return output
				.trim()
				.split('\n')
				.filter(Boolean)
				.map((line) => {
					const match = line.match(/^(.+):(\d+)(?::(\d+))?\s+(.+)$/);
					if (match) {
						return {
							file: match[1],
							line: parseInt(match[2], 10),
							column: parseInt(match[3] || '1', 10),
							severity: 'warning',
							message: match[4],
						};
					}
					return null;
				})
				.filter(Boolean);
		}
	);
}

function lintRst(file) {
	return runCli(`rstcheck "${file}"`, parseUnixOutput);
}

function lintAsciidoc(file) {
	return runCli(`asciidoctor -o /dev/null -v "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter((l) => l.includes('WARNING') || l.includes('ERROR'))
			.map((line) => {
				const match = line.match(/^asciidoctor:\s+(WARNING|ERROR):\s+(.+):(\d+):\s+(.+)$/);
				if (match) {
					return {
						file: match[2],
						line: parseInt(match[3], 10),
						column: 1,
						severity: match[1].toLowerCase(),
						message: match[4],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

// ============================================
// Data Formats
// ============================================

function lintYamllint(file) {
	const configPath = join(configDir, '.yamllint.yml');
	const configFlag = existsSync(configPath) ? `-c "${configPath}"` : '';
	return runCli(`yamllint ${configFlag} -f parsable "${file}"`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):(\d+):\s+\[(error|warning)\]\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: parseInt(match[3], 10),
						severity: match[4],
						message: match[5],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

function lintTaplo(file) {
	const configPath = join(configDir, 'taplo.toml');
	const configFlag = existsSync(configPath) ? `--config "${configPath}"` : '';
	return runCli(`taplo lint ${configFlag} "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/error\[.+\]:\s+(.+)/);
				if (match) {
					return { file, line: 1, column: 1, severity: 'error', message: match[1] };
				}
				return null;
			})
			.filter(Boolean);
	});
}

function lintXml(file) {
	return runCli(`xmllint --noout "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: 1,
						severity: 'error',
						message: match[3],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

function lintCsv(file) {
	const errors = [];
	try {
		const content = readFileSync(file, 'utf8');
		const lines = content.split('\n').filter((l) => l.trim());

		if (lines.length === 0) {
			return [{ file, line: 1, column: 1, severity: 'warning', message: 'Empty CSV file' }];
		}

		const headerCols = lines[0].split(',').length;

		lines.forEach((line, i) => {
			const cols = line.split(',').length;
			if (cols !== headerCols) {
				errors.push({
					file,
					line: i + 1,
					column: 1,
					severity: 'error',
					message: `Column count mismatch: expected ${headerCols}, got ${cols}`,
				});
			}
		});
	} catch (e) {
		errors.push({ file, line: 1, column: 1, severity: 'error', message: e.message });
	}
	return errors;
}

// ============================================
// Shell
// ============================================

function lintShellcheck(file) {
	// shellcheck uses .shellcheckrc in the script directory or home
	// We can use -x to follow sources and specify config via env
	const configPath = join(configDir, '.shellcheckrc');
	const envFlag = existsSync(configPath) ? `SHELLCHECK_OPTS="-x"` : '';
	return runCli(`${envFlag} shellcheck --format=gcc "${file}"`, parseGccOutput);
}

function lintZsh(file) {
	return runCli(`zsh -n "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: 1,
						severity: 'error',
						message: match[3],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

function lintFish(file) {
	return runCli(`fish --no-execute "${file}" 2>&1`, (output) => {
		const match = output.match(/(.+) \(line (\d+)\): (.+)/);
		if (match) {
			return [{ file, line: parseInt(match[2], 10), column: 1, severity: 'error', message: match[3] }];
		}
		return [];
	});
}

function lintPowershell(file) {
	return runCli(
		`pwsh -NoProfile -Command "Invoke-ScriptAnalyzer -Path '${file}' -Format Json" 2>&1`,
		(output) => {
			try {
				const results = JSON.parse(output);
				return results.map((r) => ({
					file: r.ScriptPath,
					line: r.Line,
					column: r.Column,
					severity: r.Severity.toLowerCase(),
					message: `${r.RuleName}: ${r.Message}`,
				}));
			} catch {
				return [];
			}
		}
	);
}

function lintBatch(file) {
	const errors = [];
	try {
		const content = readFileSync(file, 'utf8');
		const lines = content.split('\n');

		lines.forEach((line, i) => {
			const trimmed = line.trim().toLowerCase();

			if (trimmed.startsWith('goto ') && !trimmed.includes(':')) {
				errors.push({
					file,
					line: i + 1,
					column: 1,
					severity: 'warning',
					message: 'GOTO target should start with ":"',
				});
			}
		});
	} catch (e) {
		errors.push({ file, line: 1, column: 1, severity: 'error', message: e.message });
	}
	return errors;
}

// ============================================
// Python
// ============================================

function lintPython(file) {
	const configPath = join(configDir, 'ruff.toml');
	const configFlag = existsSync(configPath) ? `--config "${configPath}"` : '';
	const ruffErrors = runCli(
		fix ? `ruff check ${configFlag} --fix --output-format=text "${file}"` : `ruff check ${configFlag} --output-format=text "${file}"`,
		(output) => {
			return output
				.trim()
				.split('\n')
				.filter(Boolean)
				.map((line) => {
					const match = line.match(/^(.+):(\d+):(\d+):\s+(\w+)\s+(.+)$/);
					if (match) {
						return {
							file: match[1],
							line: parseInt(match[2], 10),
							column: parseInt(match[3], 10),
							severity: match[4].startsWith('E') || match[4].startsWith('F') ? 'error' : 'warning',
							message: `${match[4]}: ${match[5]}`,
						};
					}
					return null;
				})
				.filter(Boolean);
		}
	);

	const mypyErrors = runCli(`mypy --no-error-summary "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):\s+(error|warning|note):\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: 1,
						severity: match[3],
						message: match[4],
					};
				}
				return null;
			})
			.filter(Boolean);
	});

	return [...ruffErrors, ...mypyErrors];
}

// ============================================
// Rust
// ============================================

function lintRust(file) {
	return runCli(`cargo clippy --message-format=short 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter((l) => l.includes(file))
			.map((line) => {
				const match = line.match(/^(.+):(\d+):(\d+):\s+(error|warning|note)(?:\[.+\])?:\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: parseInt(match[3], 10),
						severity: match[4],
						message: match[5],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

function lintCargoToml(file) {
	const errors = lintTaplo(file);

	try {
		const content = readFileSync(file, 'utf8');

		if (!content.includes('[package]') && !content.includes('[workspace]')) {
			errors.push({
				file,
				line: 1,
				column: 1,
				severity: 'error',
				message: 'Missing [package] or [workspace] section',
			});
		}
	} catch (e) {
		errors.push({ file, line: 1, column: 1, severity: 'error', message: e.message });
	}

	return errors;
}

// ============================================
// C/C++/Objective-C
// ============================================

function lintClang(file) {
	return runCli(`clang-tidy "${file}" --quiet 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):(\d+):\s+(error|warning|note):\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: parseInt(match[3], 10),
						severity: match[4],
						message: match[5],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

// ============================================
// Swift
// ============================================

function lintSwift(file) {
	return runCli(
		fix ? `swiftlint lint --fix --quiet --reporter json "${file}"` : `swiftlint lint --quiet --reporter json "${file}"`,
		(output) => {
			try {
				const results = JSON.parse(output);
				return results.map((r) => ({
					file: r.file,
					line: r.line,
					column: r.character || 1,
					severity: r.severity.toLowerCase(),
					message: `${r.rule_id}: ${r.reason}`,
				}));
			} catch {
				return [];
			}
		}
	);
}

// ============================================
// Go
// ============================================

function lintGo(file) {
	return runCli(`golangci-lint run --out-format=line-number "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):(\d+):\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: parseInt(match[3], 10),
						severity: 'warning',
						message: match[4],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

function lintGoMod(file) {
	return runCli(`go mod verify 2>&1`, (output) => {
		if (output.includes('all modules verified')) {
			return [];
		}
		return [{ file, line: 1, column: 1, severity: 'error', message: output.trim() }];
	});
}

// ============================================
// Java/JVM
// ============================================

function lintJava(file) {
	return runCli(`checkstyle -c /google_checks.xml "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter((l) => l.includes('['))
			.map((line) => {
				const match = line.match(/^\[(.+)\]\s+(.+):(\d+)(?::(\d+))?:\s+(.+)$/);
				if (match) {
					return {
						file: match[2],
						line: parseInt(match[3], 10),
						column: parseInt(match[4] || '1', 10),
						severity: match[1].toLowerCase(),
						message: match[5],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

function lintKotlin(file) {
	return runCli(`ktlint --reporter=plain "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):(\d+):\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: parseInt(match[3], 10),
						severity: 'warning',
						message: match[4],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

function lintScala(file) {
	return runCli(`scalafmt --check "${file}" 2>&1`, (output) => {
		if (!output.includes('error')) return [];
		return [{ file, line: 1, column: 1, severity: 'warning', message: 'File needs formatting' }];
	});
}

function lintGroovy(file) {
	return runCli(`npm-groovy-lint --files "${file}" --output json 2>&1`, (output) => {
		try {
			const results = JSON.parse(output);
			return Object.values(results.files || {}).flatMap((f) =>
				(f.errors || []).map((e) => ({
					file,
					line: e.line,
					column: e.column || 1,
					severity: e.severity?.toLowerCase() || 'warning',
					message: e.msg,
				}))
			);
		} catch {
			return [];
		}
	});
}

// ============================================
// .NET
// ============================================

function lintCsharp(file) {
	return runCli(`dotnet format --verify-no-changes "${file}" 2>&1`, (output) => {
		if (output.includes('Formatted 0')) return [];
		return [{ file, line: 1, column: 1, severity: 'warning', message: 'File needs formatting' }];
	});
}

function lintFsharp(file) {
	return runCli(`fantomas --check "${file}" 2>&1`, (output) => {
		if (output.includes('was unchanged')) return [];
		return [{ file, line: 1, column: 1, severity: 'warning', message: 'File needs formatting' }];
	});
}

function lintVb(_file) {
	return [];
}

// ============================================
// Ruby
// ============================================

function lintRuby(file) {
	return runCli(
		fix ? `rubocop -a --format json "${file}"` : `rubocop --format json "${file}"`,
		(output) => {
			try {
				const results = JSON.parse(output);
				return results.files.flatMap((f) =>
					f.offenses.map((o) => ({
						file: f.path,
						line: o.location.start_line,
						column: o.location.start_column,
						severity: o.severity === 'error' || o.severity === 'fatal' ? 'error' : 'warning',
						message: `${o.cop_name}: ${o.message}`,
					}))
				);
			} catch {
				return [];
			}
		}
	);
}

// ============================================
// PHP
// ============================================

function lintPhp(file) {
	const syntaxErrors = runCli(`php -l "${file}" 2>&1`, (output) => {
		const match = output.match(/Parse error:\s+(.+)\s+in\s+(.+)\s+on line\s+(\d+)/);
		if (match) {
			return [{ file: match[2], line: parseInt(match[3], 10), column: 1, severity: 'error', message: match[1] }];
		}
		return [];
	});

	if (syntaxErrors.length > 0) return syntaxErrors;

	return runCli(`phpcs --report=json "${file}" 2>&1`, (output) => {
		try {
			const results = JSON.parse(output);
			return Object.values(results.files).flatMap((f) =>
				f.messages.map((m) => ({
					file,
					line: m.line,
					column: m.column,
					severity: m.type.toLowerCase(),
					message: `${m.source}: ${m.message}`,
				}))
			);
		} catch {
			return [];
		}
	});
}

// ============================================
// Lua
// ============================================

function lintLua(file) {
	return runCli(`luacheck --formatter plain "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):(\d+):\s+\(([EW]\d+)\)\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: parseInt(match[3], 10),
						severity: match[4].startsWith('E') ? 'error' : 'warning',
						message: `${match[4]}: ${match[5]}`,
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

// ============================================
// Perl
// ============================================

function lintPerl(file) {
	return runCli(`perl -c "${file}" 2>&1`, (output) => {
		if (output.includes('syntax OK')) return [];
		const match = output.match(/(.+) at (.+) line (\d+)/);
		if (match) {
			return [{ file: match[2], line: parseInt(match[3], 10), column: 1, severity: 'error', message: match[1] }];
		}
		return [];
	});
}

// ============================================
// Elixir/Erlang
// ============================================

function lintElixir(file) {
	return runCli(`mix credo --format=json "${file}" 2>&1`, (output) => {
		try {
			const results = JSON.parse(output);
			return (results.issues || []).map((i) => ({
				file: i.filename,
				line: i.line_no,
				column: i.column || 1,
				severity: i.priority === 'high' ? 'error' : 'warning',
				message: `${i.check}: ${i.message}`,
			}));
		} catch {
			return [];
		}
	});
}

function lintErlang(file) {
	return runCli(`erlc -W "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):\s+(Warning|Error):\s+(.+)$/i);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: 1,
						severity: match[3].toLowerCase(),
						message: match[4],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

// ============================================
// Haskell
// ============================================

function lintHaskell(file) {
	return runCli(`hlint --json "${file}" 2>&1`, (output) => {
		try {
			const results = JSON.parse(output);
			return results.map((r) => ({
				file: r.file,
				line: r.startLine,
				column: r.startColumn,
				severity: r.severity.toLowerCase(),
				message: `${r.hint}: ${r.from} ==> ${r.to}`,
			}));
		} catch {
			return [];
		}
	});
}

// ============================================
// OCaml/ReasonML
// ============================================

function lintOcaml(file) {
	return runCli(`ocamlc -c "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^File "(.+)", line (\d+), characters (\d+)-\d+:\s*$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: parseInt(match[3], 10),
						severity: 'error',
						message: 'Syntax error',
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

function lintReason(file) {
	return runCli(`refmt --parse re --print re "${file}" 2>&1`, (output) => {
		if (!output.includes('Error')) return [];
		return [{ file, line: 1, column: 1, severity: 'error', message: output.trim() }];
	});
}

// ============================================
// Modern Languages
// ============================================

function lintZig(file) {
	return runCli(`zig ast-check "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):(\d+):\s+(error|note):\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: parseInt(match[3], 10),
						severity: match[4] === 'error' ? 'error' : 'info',
						message: match[5],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

function lintNim(file) {
	return runCli(`nim check "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+)\((\d+), (\d+)\)\s+(Error|Warning|Hint):\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: parseInt(match[3], 10),
						severity: match[4].toLowerCase(),
						message: match[5],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

function lintVlang(file) {
	return runCli(`v -check "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):(\d+):\s+(error|warning):\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: parseInt(match[3], 10),
						severity: match[4],
						message: match[5],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

function lintCrystal(file) {
	return runCli(`crystal tool format --check "${file}" 2>&1`, (output) => {
		if (output.includes('formatting')) {
			return [{ file, line: 1, column: 1, severity: 'warning', message: 'File needs formatting' }];
		}
		return [];
	});
}

function lintDlang(file) {
	return runCli(`dmd -c -o- "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+)\((\d+)\):\s+(Error|Warning):\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: 1,
						severity: match[3].toLowerCase(),
						message: match[4],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

function lintJulia(file) {
	return runCli(`julia -e "using JuliaFormatter; format_file(\\"${file}\\", overwrite=false)" 2>&1`, (output) => {
		if (output.includes('false')) {
			return [{ file, line: 1, column: 1, severity: 'warning', message: 'File needs formatting' }];
		}
		return [];
	});
}

function lintR(file) {
	return runCli(`Rscript -e "lintr::lint('${file}')" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):(\d+):\s+(style|warning|error):\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: parseInt(match[3], 10),
						severity: match[4] === 'style' ? 'info' : match[4],
						message: match[5],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

// ============================================
// Infrastructure
// ============================================

function lintSqlfluff(file) {
	const configPath = join(configDir, '.sqlfluff');
	const configFlag = existsSync(configPath) ? `--config "${configPath}"` : '';
	return runCli(
		fix ? `sqlfluff fix ${configFlag} --force "${file}"` : `sqlfluff lint ${configFlag} --format=github-annotation "${file}"`,
		(output) => {
			return output
				.trim()
				.split('\n')
				.filter(Boolean)
				.map((line) => {
					try {
						const annotation = JSON.parse(line);
						return {
							file: annotation.file,
							line: annotation.line,
							column: annotation.col || 1,
							severity: annotation.annotation_level === 'failure' ? 'error' : 'warning',
							message: annotation.message,
						};
					} catch {
						return null;
					}
				})
				.filter(Boolean);
		}
	);
}

function lintDockerfile(file) {
	const configPath = join(configDir, '.hadolint.yaml');
	const configFlag = existsSync(configPath) ? `-c "${configPath}"` : '';
	return runCli(`hadolint ${configFlag} --format=gcc "${file}"`, parseGccOutput);
}

function lintDockerCompose(file) {
	const yamlErrors = lintYamllint(file);

	const composeErrors = runCli(`docker compose -f "${file}" config --quiet 2>&1`, (output) => {
		if (!output.trim()) return [];
		return [{ file, line: 1, column: 1, severity: 'error', message: output.trim() }];
	});

	return [...yamlErrors, ...composeErrors];
}

// ============================================
// Kubernetes/Helm
// ============================================

/**
 * Check if a YAML file is a Kubernetes manifest
 */
function isKubernetesManifest(file) {
	try {
		const content = readFileSync(file, 'utf8');
		// Check for common K8s fields
		return (
			content.includes('apiVersion:') &&
			content.includes('kind:') &&
			(content.includes('metadata:') || content.includes('spec:'))
		);
	} catch {
		return false;
	}
}

function lintHelmChart(file) {
	const yamlErrors = lintYamllint(file);

	// Use helm lint on the chart directory
	const chartDir = dirname(file);
	if (isToolAvailable('helm')) {
		const helmErrors = runCli(`helm lint "${chartDir}" 2>&1`, (output) => {
			const errors = [];
			const lines = output.trim().split('\n');

			for (const line of lines) {
				if (line.includes('[ERROR]')) {
					const match = line.match(/\[ERROR\]\s+(.+)/);
					errors.push({
						file,
						line: 1,
						column: 1,
						severity: 'error',
						message: match ? match[1] : line,
					});
				} else if (line.includes('[WARNING]')) {
					const match = line.match(/\[WARNING\]\s+(.+)/);
					errors.push({
						file,
						line: 1,
						column: 1,
						severity: 'warning',
						message: match ? match[1] : line,
					});
				} else if (line.includes('[INFO]')) {
					const match = line.match(/\[INFO\]\s+(.+)/);
					errors.push({
						file,
						line: 1,
						column: 1,
						severity: 'info',
						message: match ? match[1] : line,
					});
				}
			}

			return errors;
		});

		return [...yamlErrors, ...helmErrors];
	}

	// Fallback: basic Chart.yaml validation
	try {
		const content = readFileSync(file, 'utf8');
		const errors = [...yamlErrors];

		if (!content.includes('apiVersion:')) {
			errors.push({ file, line: 1, column: 1, severity: 'error', message: 'Missing required field: apiVersion' });
		}
		if (!content.includes('name:')) {
			errors.push({ file, line: 1, column: 1, severity: 'error', message: 'Missing required field: name' });
		}
		if (!content.includes('version:')) {
			errors.push({ file, line: 1, column: 1, severity: 'error', message: 'Missing required field: version' });
		}

		return errors;
	} catch (e) {
		return [...yamlErrors, { file, line: 1, column: 1, severity: 'error', message: e.message }];
	}
}

function lintHelmValues(file) {
	// Values files are just YAML, but we can add Helm-specific checks
	const yamlErrors = lintYamllint(file);

	// If helm is available, try template validation
	const chartDir = dirname(file);
	const chartFile = join(chartDir, 'Chart.yaml');

	if (isToolAvailable('helm') && existsSync(chartFile)) {
		const helmErrors = runCli(`helm template "${chartDir}" --values "${file}" 2>&1`, (output) => {
			if (output.includes('Error:')) {
				const match = output.match(/Error:\s+(.+)/);
				return [{
					file,
					line: 1,
					column: 1,
					severity: 'error',
					message: match ? match[1] : 'Helm template error',
				}];
			}
			return [];
		});

		return [...yamlErrors, ...helmErrors];
	}

	return yamlErrors;
}

function lintKubernetes(file) {
	const yamlErrors = lintYamllint(file);

	// Try kubeconform (faster, more up-to-date than kubeval)
	if (isToolAvailable('kubeconform')) {
		const k8sErrors = runCli(`kubeconform -output json "${file}" 2>&1`, (output) => {
			try {
				const results = JSON.parse(output);
				return results
					.filter((r) => r.status === 'statusInvalid' || r.status === 'statusError')
					.map((r) => ({
						file,
						line: 1,
						column: 1,
						severity: 'error',
						message: `${r.kind}/${r.name}: ${r.msg || r.err}`,
					}));
			} catch {
				// Parse text output
				if (output.includes('error') || output.includes('invalid')) {
					return [{ file, line: 1, column: 1, severity: 'error', message: output.trim() }];
				}
				return [];
			}
		});

		return [...yamlErrors, ...k8sErrors];
	}

	// Try kubeval (older but still common)
	if (isToolAvailable('kubeval')) {
		const k8sErrors = runCli(`kubeval --output=json "${file}" 2>&1`, (output) => {
			try {
				const results = JSON.parse(output);
				return results
					.filter((r) => r.status === 'invalid')
					.flatMap((r) =>
						r.errors.map((err) => ({
							file,
							line: 1,
							column: 1,
							severity: 'error',
							message: `${r.kind}/${r.name}: ${err}`,
						}))
					);
			} catch {
				return [];
			}
		});

		return [...yamlErrors, ...k8sErrors];
	}

	// Try kube-linter for best practices
	if (isToolAvailable('kube-linter')) {
		const k8sErrors = runCli(`kube-linter lint "${file}" --format=json 2>&1`, (output) => {
			try {
				const results = JSON.parse(output);
				return (results.Reports || []).map((r) => ({
					file,
					line: 1,
					column: 1,
					severity: r.Diagnostic?.Level === 'error' ? 'error' : 'warning',
					message: `${r.Check}: ${r.Diagnostic?.Message || r.Message}`,
				}));
			} catch {
				return [];
			}
		});

		return [...yamlErrors, ...k8sErrors];
	}

	// Fallback: basic K8s manifest validation
	try {
		const content = readFileSync(file, 'utf8');
		const errors = [...yamlErrors];
		const lines = content.split('\n');

		// Check for required fields
		if (!content.includes('apiVersion:')) {
			errors.push({ file, line: 1, column: 1, severity: 'error', message: 'Missing required field: apiVersion' });
		}
		if (!content.includes('kind:')) {
			errors.push({ file, line: 1, column: 1, severity: 'error', message: 'Missing required field: kind' });
		}

		// Check for common issues
		lines.forEach((line, i) => {
			const lineNum = i + 1;

			// Warn about 'latest' tag
			if (line.includes('image:') && line.includes(':latest')) {
				errors.push({
					file,
					line: lineNum,
					column: 1,
					severity: 'warning',
					message: 'Using :latest tag is not recommended - use specific versions',
				});
			}

			// Warn about missing resource limits
			if (line.trim() === 'containers:') {
				// Check if resources are defined nearby
				const containerSection = content.slice(content.indexOf('containers:'));
				if (!containerSection.includes('resources:')) {
					errors.push({
						file,
						line: lineNum,
						column: 1,
						severity: 'warning',
						message: 'Consider defining resource limits and requests for containers',
					});
				}
			}

			// Check for deprecated API versions
			if (line.includes('apiVersion:')) {
				if (line.includes('extensions/v1beta1')) {
					errors.push({
						file,
						line: lineNum,
						column: 1,
						severity: 'error',
						message: 'extensions/v1beta1 is deprecated - use apps/v1 instead',
					});
				}
				if (line.includes('apps/v1beta1') || line.includes('apps/v1beta2')) {
					errors.push({
						file,
						line: lineNum,
						column: 1,
						severity: 'error',
						message: 'apps/v1beta* is deprecated - use apps/v1 instead',
					});
				}
			}
		});

		return errors;
	} catch (e) {
		return [...yamlErrors, { file, line: 1, column: 1, severity: 'error', message: e.message }];
	}
}

function lintTerraform(file) {
	const fmtErrors = runCli(`terraform fmt -check -diff "${file}" 2>&1`, (output) => {
		if (!output.trim()) return [];
		return [{ file, line: 1, column: 1, severity: 'warning', message: 'File needs formatting' }];
	});

	const validateErrors = runCli(`tflint --format=compact "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):(\d+):\s+(Error|Warning|Notice):\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: parseInt(match[3], 10),
						severity: match[4].toLowerCase(),
						message: match[5],
					};
				}
				return null;
			})
			.filter(Boolean);
	});

	return [...fmtErrors, ...validateErrors];
}

function lintHcl(file) {
	return runCli(`hclfmt -check "${file}" 2>&1`, (output) => {
		if (!output.trim()) return [];
		return [{ file, line: 1, column: 1, severity: 'warning', message: 'File needs formatting' }];
	});
}

function lintPacker(file) {
	return runCli(`packer validate "${file}" 2>&1`, (output) => {
		if (output.includes('successfully')) return [];
		return [{ file, line: 1, column: 1, severity: 'error', message: output.trim() }];
	});
}

function lintNomad(file) {
	return runCli(`nomad job validate "${file}" 2>&1`, (output) => {
		if (output.includes('Job validation successful')) return [];
		return [{ file, line: 1, column: 1, severity: 'error', message: output.trim() }];
	});
}

function lintSentinel(file) {
	return runCli(`sentinel fmt -check "${file}" 2>&1`, (output) => {
		if (!output.trim()) return [];
		return [{ file, line: 1, column: 1, severity: 'warning', message: 'File needs formatting' }];
	});
}

function lintGraphql(file) {
	return runCli(`graphql-schema-linter "${file}" 2>&1`, parseUnixOutput);
}

function lintProtobuf(file) {
	return runCli(`buf lint "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):(\d+):(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: parseInt(match[3], 10),
						severity: 'warning',
						message: match[4].trim(),
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

function lintThrift(file) {
	return runCli(`thrift --gen js "${file}" 2>&1`, (output) => {
		if (!output.includes('[ERROR]')) return [];
		const match = output.match(/\[ERROR:(.+):(\d+)\]\s+(.+)/);
		if (match) {
			return [{ file: match[1], line: parseInt(match[2], 10), column: 1, severity: 'error', message: match[3] }];
		}
		return [];
	});
}

// ============================================
// Config Languages
// ============================================

function lintNix(file) {
	return runCli(`nix-instantiate --parse "${file}" 2>&1`, (output) => {
		if (!output.includes('error')) return [];
		const match = output.match(/error: (.+), at (.+):(\d+):(\d+)/);
		if (match) {
			return [{ file: match[2], line: parseInt(match[3], 10), column: parseInt(match[4], 10), severity: 'error', message: match[1] }];
		}
		return [];
	});
}

function lintDhall(file) {
	return runCli(`dhall lint --check "${file}" 2>&1`, (output) => {
		if (!output.trim()) return [];
		return [{ file, line: 1, column: 1, severity: 'warning', message: 'File needs formatting' }];
	});
}

function lintCue(file) {
	return runCli(`cue vet "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):(\d+):\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: parseInt(match[3], 10),
						severity: 'error',
						message: match[4],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

function lintJsonnet(file) {
	return runCli(`jsonnetfmt --test "${file}" 2>&1`, (output) => {
		if (!output.trim()) return [];
		return [{ file, line: 1, column: 1, severity: 'warning', message: 'File needs formatting' }];
	});
}

function lintBazel(file) {
	return runCli(`buildifier -lint=warn -mode=check "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):\s+(warning|error):\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: 1,
						severity: match[3],
						message: match[4],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

// ============================================
// Build Systems
// ============================================

function lintMakefile(file) {
	// Use checkmake if available
	if (isToolAvailable('checkmake')) {
		return runCli(`checkmake --format="{{.LineNumber}}:{{.Rule}}:{{.Violation}}" "${file}" 2>&1`, (output) => {
			return output
				.trim()
				.split('\n')
				.filter((line) => line && line.includes(':'))
				.map((line) => {
					const match = line.match(/^(\d+):(\w+):(.+)$/);
					if (match) {
						return {
							file,
							line: parseInt(match[1], 10),
							column: 1,
							severity: 'warning',
							message: `${match[2]}: ${match[3]}`,
						};
					}
					return null;
				})
				.filter(Boolean);
		});
	}

	// Fallback: custom Makefile validation
	const errors = [];
	try {
		const content = readFileSync(file, 'utf8');
		const lines = content.split('\n');

		lines.forEach((line, i) => {
			const lineNum = i + 1;

			// Check for spaces instead of tabs in recipes
			if (line.match(/^[ ]+[^#\s]/) && !line.startsWith('\t') && i > 0) {
				const prevLine = lines[i - 1];
				if (prevLine.includes(':') && !prevLine.startsWith('\t') && !prevLine.startsWith('#')) {
					errors.push({
						file,
						line: lineNum,
						column: 1,
						severity: 'error',
						message: 'Recipe lines must start with a tab, not spaces',
					});
				}
			}

			// Check for mixed tabs and spaces
			if (line.match(/^\t+ /) || line.match(/^ +\t/)) {
				errors.push({
					file,
					line: lineNum,
					column: 1,
					severity: 'warning',
					message: 'Mixed tabs and spaces in indentation',
				});
			}

			// Check for undefined variables
			const varMatches = line.matchAll(/\$\((\w+)\)/g);
			for (const match of varMatches) {
				const varName = match[1];
				const builtins = new Set(['MAKE', 'MAKEFLAGS', 'SHELL', 'CC', 'CXX', 'AR', 'RM', 'CFLAGS', 'CXXFLAGS', 'LDFLAGS', 'CURDIR', 'MAKEFILE_LIST', 'HOME', 'PATH', 'USER']);
				if (!builtins.has(varName) && !content.includes(`${varName} =`) && !content.includes(`${varName}:=`) && !content.includes(`${varName}?=`)) {
					errors.push({
						file,
						line: lineNum,
						column: match.index + 1,
						severity: 'warning',
						message: `Potentially undefined variable: ${varName}`,
					});
				}
			}
		});

		// Check for .PHONY targets
		if (!content.includes('.PHONY')) {
			errors.push({
				file,
				line: 1,
				column: 1,
				severity: 'info',
				message: 'Consider adding .PHONY targets for non-file targets',
			});
		}

		// Check for hardcoded shell paths
		if (content.includes('#!/bin/bash') || content.includes('/bin/sh')) {
			const lineNum = lines.findIndex((l) => l.includes('/bin/')) + 1;
			errors.push({
				file,
				line: lineNum,
				column: 1,
				severity: 'info',
				message: 'Consider using $(SHELL) instead of hardcoded shell path',
			});
		}
	} catch (e) {
		errors.push({ file, line: 1, column: 1, severity: 'error', message: e.message });
	}
	return errors;
}

function lintCmake(file) {
	return runCli(`cmake-lint "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+)(?::(\d+))?: \[([EWCI]\d+)\] (.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: parseInt(match[3] || '1', 10),
						severity: match[4].startsWith('E') ? 'error' : 'warning',
						message: `${match[4]}: ${match[5]}`,
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

function lintNinja(file) {
	return runCli(`ninja -t check "${file}" 2>&1`, (output) => {
		if (!output.includes('error')) return [];
		return [{ file, line: 1, column: 1, severity: 'error', message: output.trim() }];
	});
}

function lintJustfile(file) {
	return runCli(`just --check --justfile "${file}" 2>&1`, (output) => {
		if (!output.trim()) return [];
		const match = output.match(/error: (.+)\n\s+-->\s+(.+):(\d+):(\d+)/);
		if (match) {
			return [{ file: match[2], line: parseInt(match[3], 10), column: parseInt(match[4], 10), severity: 'error', message: match[1] }];
		}
		return [];
	});
}

// ============================================
// Config Files
// ============================================

function lintIni(file) {
	const errors = [];
	try {
		const content = readFileSync(file, 'utf8');
		const lines = content.split('\n');

		lines.forEach((line, i) => {
			const lineNum = i + 1;
			const trimmed = line.trim();

			if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
				return;
			}

			if (trimmed.startsWith('[')) {
				if (!trimmed.endsWith(']')) {
					errors.push({ file, line: lineNum, column: 1, severity: 'error', message: 'Unclosed section header' });
				}
				return;
			}

			if (!trimmed.includes('=')) {
				errors.push({ file, line: lineNum, column: 1, severity: 'error', message: 'Invalid syntax: expected key=value' });
			}
		});
	} catch (e) {
		errors.push({ file, line: 1, column: 1, severity: 'error', message: e.message });
	}
	return errors;
}

function lintConf(file) {
	return lintIni(file);
}

function lintProperties(file) {
	const errors = [];
	try {
		const content = readFileSync(file, 'utf8');
		const lines = content.split('\n');

		lines.forEach((line, i) => {
			const lineNum = i + 1;
			const trimmed = line.trim();

			if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) {
				return;
			}

			if (!trimmed.includes('=') && !trimmed.includes(':')) {
				errors.push({ file, line: lineNum, column: 1, severity: 'error', message: 'Invalid syntax: expected key=value or key:value' });
			}
		});
	} catch (e) {
		errors.push({ file, line: 1, column: 1, severity: 'error', message: e.message });
	}
	return errors;
}

function lintPyprojectToml(file) {
	const errors = lintTaplo(file);

	try {
		const content = readFileSync(file, 'utf8');

		if (!content.includes('[project]') && !content.includes('[tool.poetry]')) {
			errors.push({
				file,
				line: 1,
				column: 1,
				severity: 'warning',
				message: 'Missing [project] or [tool.poetry] section',
			});
		}
	} catch (e) {
		errors.push({ file, line: 1, column: 1, severity: 'error', message: e.message });
	}

	return errors;
}

// ============================================
// LaTeX
// ============================================

function lintLatex(file) {
	return runCli(`chktex -q "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):(\d+):(\d+):\s+(Warning|Error)\s+\d+:\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: parseInt(match[3], 10),
						severity: match[5].toLowerCase(),
						message: match[6],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

function lintBibtex(file) {
	return runCli(`biber --validate-datamodel --tool "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter((l) => l.includes('WARN') || l.includes('ERROR'))
			.map((line) => {
				return { file, line: 1, column: 1, severity: 'warning', message: line.trim() };
			});
	});
}

// ============================================
// Blockchain
// ============================================

function lintSolidity(file) {
	return runCli(`solhint "${file}" -f stylish 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^\s*(\d+):(\d+)\s+(error|warning)\s+(.+)$/);
				if (match) {
					return {
						file,
						line: parseInt(match[1], 10),
						column: parseInt(match[2], 10),
						severity: match[3],
						message: match[4],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

function lintMove(file) {
	return runCli(`move build --path "${file}" 2>&1`, (output) => {
		if (!output.includes('error')) return [];
		return [{ file, line: 1, column: 1, severity: 'error', message: output.trim() }];
	});
}

function lintVyper(file) {
	return runCli(`vyper -f bytecode "${file}" 2>&1`, (output) => {
		if (!output.includes('Error')) return [];
		const match = output.match(/line (\d+):(\d+)\s+(.+)/);
		if (match) {
			return [{ file, line: parseInt(match[1], 10), column: parseInt(match[2], 10), severity: 'error', message: match[3] }];
		}
		return [];
	});
}

// ============================================
// WASM
// ============================================

function lintWat(file) {
	return runCli(`wat2wasm --debug-names "${file}" -o /dev/null 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+):(\d+):\s+error:\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: parseInt(match[3], 10),
						severity: 'error',
						message: match[4],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

// ============================================
// Environment
// ============================================

function lintEnv(file) {
	return runCli(`dotenv-linter "${file}" 2>&1`, (output) => {
		return output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(.+):(\d+)\s+(.+)$/);
				if (match) {
					return {
						file: match[1],
						line: parseInt(match[2], 10),
						column: 1,
						severity: 'warning',
						message: match[3],
					};
				}
				return null;
			})
			.filter(Boolean);
	});
}

// ============================================
// Custom Linters (Config Files)
// ============================================

function lintEditorconfig(file) {
	// Use editorconfig-checker if available (checks file compliance, not just syntax)
	if (isToolAvailable('editorconfig-checker') || isToolAvailable('ec')) {
		const cmd = isToolAvailable('ec') ? 'ec' : 'editorconfig-checker';
		return runCli(`${cmd} "${file}" 2>&1`, (output) => {
			return output
				.trim()
				.split('\n')
				.filter((line) => line && !line.startsWith('Error count'))
				.map((line) => {
					// Format: file:line: message
					const match = line.match(/^(.+?):(\d+):\s*(.+)$/);
					if (match) {
						return {
							file: match[1],
							line: parseInt(match[2], 10),
							column: 1,
							severity: 'warning',
							message: match[3],
						};
					}
					// Format: file: message (no line number)
					const simpleMatch = line.match(/^(.+?):\s*(.+)$/);
					if (simpleMatch && !simpleMatch[2].includes(':')) {
						return {
							file: simpleMatch[1],
							line: 1,
							column: 1,
							severity: 'warning',
							message: simpleMatch[2],
						};
					}
					return null;
				})
				.filter(Boolean);
		});
	}

	// Fallback: custom editorconfig syntax validation
	const content = readFileSync(file, 'utf8');
	const lines = content.split('\n');
	const errors = [];

	const validProperties = new Set([
		'root', 'charset', 'end_of_line', 'indent_style', 'indent_size',
		'tab_width', 'insert_final_newline', 'trim_trailing_whitespace', 'max_line_length',
		'quote_type', 'spaces_around_operators', 'spaces_around_brackets',
	]);
	const validCharsets = new Set(['utf-8', 'utf-8-bom', 'utf-16be', 'utf-16le', 'latin1']);
	const validEndOfLine = new Set(['lf', 'crlf', 'cr']);
	const validIndentStyle = new Set(['tab', 'space']);
	const validBooleans = new Set(['true', 'false']);

	let inSection = false;
	let hasRoot = false;

	lines.forEach((line, i) => {
		const lineNum = i + 1;
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) return;

		if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
			const pattern = trimmed.slice(1, -1);
			if (!pattern) {
				errors.push({ file, line: lineNum, column: 1, severity: 'error', message: 'Empty section pattern' });
			}
			inSection = true;
			return;
		}

		if (trimmed.includes('=')) {
			let [key, ...rest] = trimmed.split('=');
			key = key.trim().toLowerCase();
			const value = rest.join('=').trim().toLowerCase();

			if (key === 'root') {
				hasRoot = true;
				if (inSection) {
					errors.push({ file, line: lineNum, column: 1, severity: 'error', message: '"root" must be outside any section' });
				}
				if (!validBooleans.has(value)) {
					errors.push({ file, line: lineNum, column: 1, severity: 'error', message: `Invalid root value: "${value}"` });
				}
				return;
			}

			if (!inSection) {
				errors.push({ file, line: lineNum, column: 1, severity: 'error', message: `"${key}" must be inside a section` });
				return;
			}

			if (!validProperties.has(key)) {
				errors.push({ file, line: lineNum, column: 1, severity: 'warning', message: `Unknown property: "${key}"` });
			}

			if (key === 'charset' && !validCharsets.has(value)) {
				errors.push({ file, line: lineNum, column: 1, severity: 'error', message: `Invalid charset: "${value}"` });
			}
			if (key === 'end_of_line' && !validEndOfLine.has(value)) {
				errors.push({ file, line: lineNum, column: 1, severity: 'error', message: `Invalid end_of_line: "${value}"` });
			}
			if (key === 'indent_style' && !validIndentStyle.has(value)) {
				errors.push({ file, line: lineNum, column: 1, severity: 'error', message: `Invalid indent_style: "${value}"` });
			}
			if (key === 'indent_size' && value !== 'tab' && !/^\d+$/.test(value)) {
				errors.push({ file, line: lineNum, column: 1, severity: 'error', message: `Invalid indent_size: "${value}"` });
			}
			if ((key === 'insert_final_newline' || key === 'trim_trailing_whitespace') && !validBooleans.has(value)) {
				errors.push({ file, line: lineNum, column: 1, severity: 'error', message: `Invalid ${key} value: "${value}" (must be true or false)` });
			}
		} else {
			errors.push({ file, line: lineNum, column: 1, severity: 'error', message: 'Invalid syntax: expected key = value' });
		}
	});

	if (!hasRoot) {
		errors.push({ file, line: 1, column: 1, severity: 'warning', message: 'Missing "root = true"' });
	}

	return errors;
}

function lintNpmrc(file) {
	const content = readFileSync(file, 'utf8');
	const lines = content.split('\n');
	const errors = [];

	const validSettings = new Set([
		'access', 'audit', 'audit-level', 'auto-install-peers', 'cache', 'color',
		'commit-hooks', 'dedupe-peer-dependents', 'depth', 'engine-strict', 'fetch-retries',
		'fetch-retry-factor', 'fetch-retry-maxtimeout', 'fetch-retry-mintimeout', 'fund',
		'git-tag-version', 'global', 'heading', 'hoist', 'hoist-pattern', 'https-proxy',
		'ignore-scripts', 'init-author-email', 'init-author-name', 'init-author-url',
		'init-license', 'init-version', 'legacy-peer-deps', 'link-workspace-packages',
		'lockfile', 'loglevel', 'manage-package-manager-versions', 'network-concurrency',
		'node-version', 'offline', 'package-lock', 'package-manager-strict-version',
		'prefer-frozen-lockfile', 'prefer-offline', 'prefer-workspace-packages', 'prefix',
		'progress', 'proxy', 'public-hoist-pattern', 'publish-branch', 'registry',
		'resolution-mode', 'resolve-peers-from-workspace-root', 'save', 'save-exact',
		'save-prefix', 'save-workspace-protocol', 'shamefully-hoist', 'shared-workspace-lockfile',
		'shell-emulator', 'shrinkwrap', 'strict-peer-dependencies', 'strict-ssl', 'tag',
		'tag-version-prefix', 'timing', 'unicode', 'use-node-version', 'user-agent',
	]);

	lines.forEach((line, i) => {
		const lineNum = i + 1;
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) return;
		if (trimmed.startsWith('//') || trimmed.startsWith('@')) return;

		if (trimmed.includes('=')) {
			let [key] = trimmed.split('=');
			key = key.trim();
			if (key.endsWith('[]')) key = key.slice(0, -2);

			if (!validSettings.has(key)) {
				errors.push({ file, line: lineNum, column: 1, severity: 'warning', message: `Unknown setting: "${key}"` });
			}
		} else {
			errors.push({ file, line: lineNum, column: 1, severity: 'error', message: 'Invalid syntax' });
		}
	});

	return errors;
}

function lintNvmrc(file) {
	const content = readFileSync(file, 'utf8').trim();
	const lines = content.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
	const errors = [];

	if (lines.length === 0) {
		return [{ file, line: 1, column: 1, severity: 'error', message: 'Empty file' }];
	}

	if (lines.length > 1) {
		errors.push({ file, line: 2, column: 1, severity: 'error', message: 'Only one version allowed' });
	}

	const version = lines[0].trim();
	const validPatterns = [
		/^v?\d+$/, /^v?\d+\.\d+$/, /^v?\d+\.\d+\.\d+$/,
		/^lts\/\*$/, /^lts\/[a-z]+$/i, /^node$/, /^stable$/,
	];

	if (!validPatterns.some((p) => p.test(version))) {
		errors.push({ file, line: 1, column: 1, severity: 'error', message: `Invalid version: "${version}"` });
	}

	return errors;
}

function lintIgnoreFile(file) {
	const content = readFileSync(file, 'utf8');
	const lines = content.split('\n');
	const errors = [];
	const seenPatterns = new Map();

	lines.forEach((line, i) => {
		const lineNum = i + 1;
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith('#')) return;

		if (trimmed.includes('***')) {
			errors.push({ file, line: lineNum, column: 1, severity: 'error', message: '"***" is invalid' });
		}

		if (line.endsWith(' ') && !line.endsWith('\\ ')) {
			errors.push({ file, line: lineNum, column: line.length, severity: 'warning', message: 'Trailing whitespace' });
		}

		const normalized = trimmed.replace(/^!/, '');
		if (seenPatterns.has(normalized)) {
			errors.push({ file, line: lineNum, column: 1, severity: 'warning', message: `Duplicate (line ${seenPatterns.get(normalized)})` });
		} else {
			seenPatterns.set(normalized, lineNum);
		}

		if (['*', '**', '**/*'].includes(trimmed)) {
			errors.push({ file, line: lineNum, column: 1, severity: 'warning', message: 'Pattern too broad' });
		}
	});

	return errors;
}

function lintGitattributes(file) {
	const content = readFileSync(file, 'utf8');
	const lines = content.split('\n');
	const errors = [];

	const validAttrs = new Set([
		'text', 'binary', 'auto', 'eol', 'diff', 'merge', 'whitespace',
		'export-ignore', 'export-subst', 'delta', 'encoding', 'ident', 'filter',
		'linguist-detectable', 'linguist-documentation', 'linguist-generated',
		'linguist-language', 'linguist-vendored', 'gitlab-generated',
	]);

	lines.forEach((line, i) => {
		const lineNum = i + 1;
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith('#')) return;

		const parts = trimmed.split(/\s+/);
		if (parts.length < 2) {
			errors.push({ file, line: lineNum, column: 1, severity: 'error', message: 'Expected pattern and attributes' });
			return;
		}

		const [, ...attrs] = parts;
		attrs.forEach((attr) => {
			let attrName = attr;
			if (attr.startsWith('-')) attrName = attr.slice(1);
			if (attr.includes('=')) [attrName] = attr.split('=');

			if (!validAttrs.has(attrName)) {
				errors.push({ file, line: lineNum, column: 1, severity: 'warning', message: `Unknown: "${attrName}"` });
			}
		});

		if (attrs.includes('text') && attrs.includes('binary')) {
			errors.push({ file, line: lineNum, column: 1, severity: 'error', message: 'Conflicting: text + binary' });
		}
	});

	return errors;
}

// ============================================
// Spelling
// ============================================

function lintTypos(file) {
	// typos is a fast spell checker written in Rust
	if (isToolAvailable('typos')) {
		const configPath = join(configDir, 'typos.toml');
		const configFlag = existsSync(configPath) ? `--config "${configPath}"` : '';
		return runCli(`typos ${configFlag} --format json "${file}" 2>&1`, (output) => {
			const errors = [];
			// typos outputs one JSON object per line
			for (const line of output.trim().split('\n')) {
				if (!line.trim()) continue;
				try {
					const result = JSON.parse(line);
					if (result.type === 'typo') {
						errors.push({
							file: result.path,
							line: result.line_num || 1,
							column: result.byte_offset || 1,
							severity: 'warning',
							message: `Typo: "${result.typo}" -> "${result.corrections?.join('" or "') || '?'}"`,
						});
					}
				} catch {
					// Not JSON, skip
				}
			}
			return errors;
		});
	}

	// Fallback to cspell if available
	if (isToolAvailable('cspell')) {
		return runCli(`cspell --no-progress --no-summary "${file}" 2>&1`, (output) => {
			return output
				.trim()
				.split('\n')
				.filter(Boolean)
				.map((line) => {
					// Format: file:line:col - Unknown word (word)
					const match = line.match(/^(.+):(\d+):(\d+)\s+-\s+(.+)$/);
					if (match) {
						return {
							file: match[1],
							line: parseInt(match[2], 10),
							column: parseInt(match[3], 10),
							severity: 'warning',
							message: match[4],
						};
					}
					return null;
				})
				.filter(Boolean);
		});
	}

	return [];
}

// ============================================
// Secrets Detection
// ============================================

function lintSecrets(file) {
	// gitleaks is the most popular secrets scanner
	if (isToolAvailable('gitleaks')) {
		const configPath = join(configDir, '.gitleaksrc.toml');
		const configFlag = existsSync(configPath) ? `--config "${configPath}"` : '';
		return runCli(`gitleaks detect ${configFlag} --no-git --source "${file}" --report-format json 2>&1`, (output) => {
			try {
				const results = JSON.parse(output);
				return (results || []).map((r) => ({
					file: r.File,
					line: r.StartLine || 1,
					column: r.StartColumn || 1,
					severity: 'error',
					message: `Secret detected: ${r.Description} (${r.RuleID})`,
				}));
			} catch {
				// No secrets found or error
				return [];
			}
		});
	}

	// Fallback to trufflehog if available
	if (isToolAvailable('trufflehog')) {
		return runCli(`trufflehog filesystem --json --no-update "${file}" 2>&1`, (output) => {
			const errors = [];
			for (const line of output.trim().split('\n')) {
				if (!line.trim()) continue;
				try {
					const result = JSON.parse(line);
					if (result.SourceMetadata) {
						errors.push({
							file,
							line: result.SourceMetadata.Data?.Filesystem?.line || 1,
							column: 1,
							severity: 'error',
							message: `Secret detected: ${result.DetectorName} - ${result.DecoderName || 'plaintext'}`,
						});
					}
				} catch {
					// Not JSON, skip
				}
			}
			return errors;
		});
	}

	// Basic fallback: check for common secret patterns
	const errors = [];
	try {
		const content = readFileSync(file, 'utf8');
		const lines = content.split('\n');

		const secretPatterns = [
			{ pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/i, name: 'API Key' },
			{ pattern: /(?:secret[_-]?key|secretkey)\s*[:=]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/i, name: 'Secret Key' },
			{ pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/i, name: 'Password' },
			{ pattern: /(?:aws[_-]?access[_-]?key[_-]?id)\s*[:=]\s*['"]?[A-Z0-9]{20}['"]?/i, name: 'AWS Access Key' },
			{ pattern: /(?:aws[_-]?secret[_-]?access[_-]?key)\s*[:=]\s*['"]?[a-zA-Z0-9/+=]{40}['"]?/i, name: 'AWS Secret Key' },
			{ pattern: /ghp_[a-zA-Z0-9]{36}/, name: 'GitHub Personal Access Token' },
			{ pattern: /gho_[a-zA-Z0-9]{36}/, name: 'GitHub OAuth Token' },
			{ pattern: /ghu_[a-zA-Z0-9]{36}/, name: 'GitHub User Token' },
			{ pattern: /ghs_[a-zA-Z0-9]{36}/, name: 'GitHub Server Token' },
			{ pattern: /ghr_[a-zA-Z0-9]{36}/, name: 'GitHub Refresh Token' },
			{ pattern: /sk-[a-zA-Z0-9]{48}/, name: 'OpenAI API Key' },
			{ pattern: /sk-ant-api[a-zA-Z0-9-]{80,}/, name: 'Anthropic API Key' },
			{ pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/, name: 'Private Key' },
			{ pattern: /xox[baprs]-[a-zA-Z0-9-]{10,}/, name: 'Slack Token' },
			{ pattern: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/, name: 'Slack Webhook' },
		];

		lines.forEach((line, i) => {
			const lineNum = i + 1;

			// Skip comments and example lines
			if (line.trim().startsWith('#') || line.trim().startsWith('//')) return;
			if (line.toLowerCase().includes('example') || line.toLowerCase().includes('placeholder')) return;

			for (const { pattern, name } of secretPatterns) {
				if (pattern.test(line)) {
					errors.push({
						file,
						line: lineNum,
						column: 1,
						severity: 'error',
						message: `Potential ${name} detected - use environment variables instead`,
					});
				}
			}
		});
	} catch (e) {
		// File read error, skip
	}

	return errors;
}

// ============================================
// GitHub Templates
// ============================================

function lintGitHubIssueTemplate(file) {
	const errors = lintYamllint(file);

	try {
		const content = readFileSync(file, 'utf8');
		const lines = content.split('\n');

		// Check for required frontmatter
		if (!content.startsWith('---')) {
			errors.push({
				file,
				line: 1,
				column: 1,
				severity: 'error',
				message: 'Issue template must start with YAML frontmatter (---)',
			});
			return errors;
		}

		// Check required fields
		if (!content.includes('name:')) {
			errors.push({ file, line: 1, column: 1, severity: 'error', message: 'Missing required field: name' });
		}
		if (!content.includes('description:')) {
			errors.push({ file, line: 1, column: 1, severity: 'error', message: 'Missing required field: description' });
		}

		// Check for body (form-based templates)
		if (file.endsWith('.yml') || file.endsWith('.yaml')) {
			if (!content.includes('body:')) {
				errors.push({ file, line: 1, column: 1, severity: 'warning', message: 'Consider adding a body section for form-based templates' });
			}
		}

		// Validate labels if present
		const labelsMatch = content.match(/labels:\s*\n((?:\s+-\s*.+\n?)+)/);
		if (labelsMatch) {
			const labelLines = labelsMatch[1].split('\n').filter(Boolean);
			for (const labelLine of labelLines) {
				const label = labelLine.replace(/^\s*-\s*/, '').trim();
				if (label && label.includes(' ') && !label.startsWith('"') && !label.startsWith("'")) {
					const lineNum = lines.findIndex((l) => l.includes(label)) + 1;
					errors.push({
						file,
						line: lineNum,
						column: 1,
						severity: 'warning',
						message: `Label "${label}" contains spaces - consider quoting it`,
					});
				}
			}
		}
	} catch (e) {
		errors.push({ file, line: 1, column: 1, severity: 'error', message: e.message });
	}

	return errors;
}

function lintGitHubPrTemplate(file) {
	const errors = [];

	try {
		const content = readFileSync(file, 'utf8');
		const lines = content.split('\n');

		// Check for empty template
		if (content.trim().length === 0) {
			errors.push({ file, line: 1, column: 1, severity: 'error', message: 'PR template is empty' });
			return errors;
		}

		// Check for common sections
		const hasChecklist = content.includes('- [ ]') || content.includes('- [x]');
		const hasDescription = content.toLowerCase().includes('description') || content.includes('##');

		if (!hasDescription) {
			errors.push({
				file,
				line: 1,
				column: 1,
				severity: 'info',
				message: 'Consider adding a description section (## Description)',
			});
		}

		if (!hasChecklist) {
			errors.push({
				file,
				line: 1,
				column: 1,
				severity: 'info',
				message: 'Consider adding a checklist (- [ ] item)',
			});
		}

		// Check for broken markdown
		lines.forEach((line, i) => {
			const lineNum = i + 1;

			// Check for unclosed brackets
			const openBrackets = (line.match(/\[/g) || []).length;
			const closeBrackets = (line.match(/\]/g) || []).length;
			if (openBrackets !== closeBrackets) {
				errors.push({
					file,
					line: lineNum,
					column: 1,
					severity: 'warning',
					message: 'Unclosed brackets in line',
				});
			}
		});
	} catch (e) {
		errors.push({ file, line: 1, column: 1, severity: 'error', message: e.message });
	}

	return errors;
}

function lintGitHubWorkflow(file) {
	// Use actionlint if available
	if (isToolAvailable('actionlint')) {
		return runCli(`actionlint -format '{{json .}}' "${file}" 2>&1`, (output) => {
			try {
				const results = JSON.parse(`[${output.trim().split('\n').join(',')}]`);
				return results.map((r) => ({
					file: r.filepath || file,
					line: r.line || 1,
					column: r.column || 1,
					severity: r.kind === 'error' ? 'error' : 'warning',
					message: r.message,
				}));
			} catch {
				// Parse line-based output
				return output
					.trim()
					.split('\n')
					.filter(Boolean)
					.map((line) => {
						const match = line.match(/^(.+):(\d+):(\d+):\s*(.+)$/);
						if (match) {
							return {
								file: match[1],
								line: parseInt(match[2], 10),
								column: parseInt(match[3], 10),
								severity: 'error',
								message: match[4],
							};
						}
						return null;
					})
					.filter(Boolean);
			}
		});
	}

	// Fallback: YAML lint + basic workflow validation
	const errors = lintYamllint(file);

	try {
		const content = readFileSync(file, 'utf8');
		const lines = content.split('\n');

		// Check for required fields
		if (!content.includes('on:') && !content.includes("'on':") && !content.includes('"on":')) {
			errors.push({ file, line: 1, column: 1, severity: 'error', message: 'Missing required field: on (trigger)' });
		}

		if (!content.includes('jobs:')) {
			errors.push({ file, line: 1, column: 1, severity: 'error', message: 'Missing required field: jobs' });
		}

		// Check for common issues
		lines.forEach((line, i) => {
			const lineNum = i + 1;

			// Warn about using latest
			if (line.includes('@latest') || line.includes('@master') || line.includes('@main')) {
				errors.push({
					file,
					line: lineNum,
					column: 1,
					severity: 'warning',
					message: 'Pin actions to a specific version/SHA instead of @latest/@master/@main',
				});
			}

			// Check for deprecated set-output
			if (line.includes('::set-output')) {
				errors.push({
					file,
					line: lineNum,
					column: 1,
					severity: 'error',
					message: '::set-output is deprecated - use $GITHUB_OUTPUT instead',
				});
			}

			// Check for deprecated save-state
			if (line.includes('::save-state')) {
				errors.push({
					file,
					line: lineNum,
					column: 1,
					severity: 'error',
					message: '::save-state is deprecated - use $GITHUB_STATE instead',
				});
			}

			// Check for deprecated set-env
			if (line.includes('::set-env')) {
				errors.push({
					file,
					line: lineNum,
					column: 1,
					severity: 'error',
					message: '::set-env is deprecated - use $GITHUB_ENV instead',
				});
			}

			// Warn about expression injection
			if (line.includes('${{') && (line.includes('github.event.issue.title') ||
					line.includes('github.event.issue.body') ||
					line.includes('github.event.pull_request.title') ||
					line.includes('github.event.pull_request.body') ||
					line.includes('github.event.comment.body'))) {
				if (line.includes('run:') || line.includes('script:')) {
					errors.push({
						file,
						line: lineNum,
						column: 1,
						severity: 'warning',
						message: 'Potential expression injection - user input in script context',
					});
				}
			}
		});
	} catch (e) {
		errors.push({ file, line: 1, column: 1, severity: 'error', message: e.message });
	}

	return errors;
}

function lintGitHubFunding(file) {
	const errors = lintYamllint(file);

	try {
		const content = readFileSync(file, 'utf8');

		// Valid funding platforms
		const validPlatforms = new Set([
			'github', 'patreon', 'open_collective', 'ko_fi', 'tidelift',
			'community_bridge', 'liberapay', 'issuehunt', 'otechie',
			'lfx_crowdfunding', 'polar', 'custom',
		]);

		const lines = content.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line.includes(':') && !line.trim().startsWith('#')) {
				const [key] = line.split(':');
				const platform = key.trim().toLowerCase();
				if (platform && !validPlatforms.has(platform)) {
					errors.push({
						file,
						line: i + 1,
						column: 1,
						severity: 'warning',
						message: `Unknown funding platform: ${platform}`,
					});
				}
			}
		}
	} catch (e) {
		errors.push({ file, line: 1, column: 1, severity: 'error', message: e.message });
	}

	return errors;
}

function lintCodeowners(file) {
	const errors = [];

	try {
		const content = readFileSync(file, 'utf8');
		const lines = content.split('\n');

		lines.forEach((line, i) => {
			const lineNum = i + 1;
			const trimmed = line.trim();

			// Skip empty lines and comments
			if (!trimmed || trimmed.startsWith('#')) return;

			const parts = trimmed.split(/\s+/);
			if (parts.length < 2) {
				errors.push({
					file,
					line: lineNum,
					column: 1,
					severity: 'error',
					message: 'Invalid CODEOWNERS entry - must have pattern and at least one owner',
				});
				return;
			}

			const [pattern, ...owners] = parts;

			// Validate owners format
			for (const owner of owners) {
				if (!owner.startsWith('@') && !owner.includes('@')) {
					errors.push({
						file,
						line: lineNum,
						column: trimmed.indexOf(owner) + 1,
						severity: 'error',
						message: `Invalid owner format: ${owner} (must be @user, @org/team, or email)`,
					});
				}
			}

			// Check for overly broad patterns
			if (pattern === '*') {
				errors.push({
					file,
					line: lineNum,
					column: 1,
					severity: 'info',
					message: 'Using * pattern - ensure this is intentional as a catch-all',
				});
			}
		});
	} catch (e) {
		errors.push({ file, line: 1, column: 1, severity: 'error', message: e.message });
	}

	return errors;
}

function lintDependabot(file) {
	const errors = lintYamllint(file);

	try {
		const content = readFileSync(file, 'utf8');

		// Check for required fields
		if (!content.includes('version:')) {
			errors.push({ file, line: 1, column: 1, severity: 'error', message: 'Missing required field: version' });
		}

		if (!content.includes('updates:')) {
			errors.push({ file, line: 1, column: 1, severity: 'error', message: 'Missing required field: updates' });
		}

		// Check version
		if (content.includes('version:') && !content.includes('version: 2')) {
			const lineNum = content.split('\n').findIndex((l) => l.includes('version:')) + 1;
			errors.push({
				file,
				line: lineNum,
				column: 1,
				severity: 'warning',
				message: 'Consider using version: 2 (latest)',
			});
		}

		// Valid package ecosystems
		const validEcosystems = new Set([
			'bundler', 'cargo', 'composer', 'docker', 'elm', 'gitsubmodule',
			'github-actions', 'gomod', 'gradle', 'maven', 'mix', 'npm',
			'nuget', 'pip', 'pub', 'swift', 'terraform',
		]);

		const ecosystemMatches = content.matchAll(/package-ecosystem:\s*["']?(\w+[-\w]*)["']?/g);
		for (const match of ecosystemMatches) {
			if (!validEcosystems.has(match[1])) {
				const lineNum = content.slice(0, match.index).split('\n').length;
				errors.push({
					file,
					line: lineNum,
					column: 1,
					severity: 'error',
					message: `Unknown package ecosystem: ${match[1]}`,
				});
			}
		}
	} catch (e) {
		errors.push({ file, line: 1, column: 1, severity: 'error', message: e.message });
	}

	return errors;
}

// ============================================
// Workspace-Level Linters
// ============================================

/**
 * Copy/paste detection with jscpd
 */
function lintJscpd(directory) {
	if (isToolAvailable('jscpd')) {
		const configPath = join(configDir, '.jscpd.json');
		const configFlag = existsSync(configPath) ? `--config "${configPath}"` : '';
		return runCli(
			`jscpd ${configFlag} "${directory}" --reporters json --silent 2>&1`,
			(output) => {
				try {
					const result = JSON.parse(output);
					return (result.duplicates || []).map((dup) => ({
						file: dup.firstFile?.name || directory,
						line: dup.firstFile?.startLoc?.line || 1,
						column: dup.firstFile?.startLoc?.column || 1,
						severity: 'warning',
						message: `Duplicate code detected: ${dup.lines} lines duplicated in ${dup.secondFile?.name || 'another file'}`,
					}));
				} catch {
					return [];
				}
			}
		);
	}
	return [];
}

/**
 * Dead code/unused exports detection with knip
 */
function lintKnip(directory) {
	if (isToolAvailable('knip')) {
		const configPath = join(configDir, 'knip.json');
		const configFlag = existsSync(configPath) ? `--config "${configPath}"` : '';
		return runCli(
			`knip ${configFlag} --directory "${directory}" --reporter json 2>&1`,
			(output) => {
				try {
					const result = JSON.parse(output);
					const errors = [];

					// Unused files
					for (const file of result.files || []) {
						errors.push({
							file,
							line: 1,
							column: 1,
							severity: 'warning',
							message: 'Unused file detected',
						});
					}

					// Unused exports
					for (const [file, exports] of Object.entries(result.exports || {})) {
						for (const exp of exports) {
							errors.push({
								file,
								line: exp.line || 1,
								column: exp.col || 1,
								severity: 'warning',
								message: `Unused export: ${exp.name}`,
							});
						}
					}

					// Unused dependencies
					for (const [file, deps] of Object.entries(result.dependencies || {})) {
						for (const dep of deps) {
							errors.push({
								file,
								line: 1,
								column: 1,
								severity: 'warning',
								message: `Unused dependency: ${dep}`,
							});
						}
					}

					return errors;
				} catch {
					return [];
				}
			}
		);
	}
	return [];
}

/**
 * Circular dependency detection with madge
 */
function lintMadge(directory) {
	if (isToolAvailable('madge')) {
		const configPath = join(configDir, '.madgerc');
		const configFlag = existsSync(configPath) ? `--config "${configPath}"` : '';
		return runCli(
			`madge ${configFlag} --circular --json "${directory}" 2>&1`,
			(output) => {
				try {
					const cycles = JSON.parse(output);
					return cycles.map((cycle) => ({
						file: cycle[0] || directory,
						line: 1,
						column: 1,
						severity: 'error',
						message: `Circular dependency detected: ${cycle.join(' → ')}`,
					}));
				} catch {
					return [];
				}
			}
		);
	}
	return [];
}

/**
 * Package publishing validation with publint
 */
function lintPublint(packageJsonPath) {
	if (isToolAvailable('publint')) {
		const dir = packageJsonPath.replace(/\/package\.json$/, '');
		return runCli(
			`publint "${dir}" --format json 2>&1`,
			(output) => {
				try {
					const result = JSON.parse(output);
					return (result.messages || []).map((msg) => ({
						file: packageJsonPath,
						line: 1,
						column: 1,
						severity: msg.type === 'error' ? 'error' : 'warning',
						message: msg.message,
					}));
				} catch {
					return [];
				}
			}
		);
	}
	return [];
}

/**
 * TypeScript exports validation with attw (arethetypeswrong)
 */
function lintAttw(packageJsonPath) {
	if (isToolAvailable('attw')) {
		const dir = packageJsonPath.replace(/\/package\.json$/, '');
		return runCli(
			`attw --pack "${dir}" --format json 2>&1`,
			(output) => {
				try {
					const result = JSON.parse(output);
					const errors = [];

					for (const [entrypoint, problems] of Object.entries(result.problems || {})) {
						for (const problem of problems) {
							errors.push({
								file: packageJsonPath,
								line: 1,
								column: 1,
								severity: 'error',
								message: `${entrypoint}: ${problem.kind} - ${problem.message || problem.kind}`,
							});
						}
					}

					return errors;
				} catch {
					return [];
				}
			}
		);
	}
	return [];
}

/**
 * Package.json field ordering with sort-package-json
 */
function lintSortPackageJson(file) {
	if (isToolAvailable('sort-package-json')) {
		return runCli(
			`sort-package-json "${file}" --check 2>&1`,
			(output) => {
				if (output.includes('not sorted') || output.includes('would be sorted')) {
					return [{
						file,
						line: 1,
						column: 1,
						severity: 'warning',
						message: 'package.json fields are not in standard order. Run sort-package-json to fix.',
					}];
				}
				return [];
			}
		);
	}
	return [];
}

/**
 * Architecture/dependency rules with dependency-cruiser
 */
function lintDependencyCruiser(directory) {
	if (isToolAvailable('depcruise')) {
		const configPath = join(configDir, '.dependency-cruiser.js');
		const configFlag = existsSync(configPath) ? `--config "${configPath}"` : '';
		return runCli(
			`depcruise ${configFlag} "${directory}" --output-type json 2>&1`,
			(output) => {
				try {
					const result = JSON.parse(output);
					return (result.summary?.violations || []).map((v) => ({
						file: v.from,
						line: 1,
						column: 1,
						severity: v.rule?.severity === 'error' ? 'error' : 'warning',
						message: `${v.rule?.name || 'dependency-cruiser'}: ${v.from} → ${v.to}`,
					}));
				} catch {
					return [];
				}
			}
		);
	}
	return [];
}

/**
 * License compliance checking with license-checker
 */
function lintLicenseChecker(directory) {
	if (isToolAvailable('license-checker')) {
		// Define problematic licenses
		const problematicLicenses = new Set([
			'GPL', 'GPL-2.0', 'GPL-3.0', 'AGPL', 'AGPL-3.0',
			'LGPL', 'LGPL-2.0', 'LGPL-2.1', 'LGPL-3.0',
			'SSPL', 'BSL', 'BUSL',
		]);

		return runCli(
			`license-checker --start "${directory}" --json 2>&1`,
			(output) => {
				try {
					const result = JSON.parse(output);
					const errors = [];

					for (const [pkg, info] of Object.entries(result)) {
						const license = info.licenses;
						if (license === 'UNKNOWN') {
							errors.push({
								file: `${directory}/package.json`,
								line: 1,
								column: 1,
								severity: 'warning',
								message: `Unknown license for package: ${pkg}`,
							});
						} else if (problematicLicenses.has(license)) {
							errors.push({
								file: `${directory}/package.json`,
								line: 1,
								column: 1,
								severity: 'warning',
								message: `Potentially problematic license (${license}) for package: ${pkg}`,
							});
						}
					}

					return errors;
				} catch {
					return [];
				}
			}
		);
	}
	return [];
}

/**
 * Monorepo dependency sync with syncpack
 */
function lintSyncpack(directory) {
	if (isToolAvailable('syncpack')) {
		const configPath = join(configDir, '.syncpackrc');
		const configFlag = existsSync(configPath) ? `--config "${configPath}"` : '';
		return runCli(
			`syncpack ${configFlag} list-mismatches --source "${directory}/**/package.json" 2>&1`,
			(output) => {
				const errors = [];
				const lines = output.split('\n');

				for (const line of lines) {
					// Parse syncpack output format
					const match = line.match(/(\S+)\s+has mismatched versions/i);
					if (match) {
						errors.push({
							file: `${directory}/package.json`,
							line: 1,
							column: 1,
							severity: 'warning',
							message: `Dependency version mismatch: ${match[1]}`,
						});
					}
				}

				return errors;
			}
		);
	}
	return [];
}

/**
 * File/folder naming conventions with ls-lint
 */
function lintLsLint(directory) {
	if (isToolAvailable('ls-lint')) {
		const configPath = join(configDir, '.ls-lint.yml');
		const configFlag = existsSync(configPath) ? `--config "${configPath}"` : '';
		return runCli(
			`ls-lint ${configFlag} "${directory}" 2>&1`,
			(output) => {
				const errors = [];
				const lines = output.split('\n');

				for (const line of lines) {
					// Parse ls-lint error format
					const match = line.match(/(.+?):\s*(.+)/);
					if (match && !line.startsWith('ls-lint')) {
						errors.push({
							file: match[1],
							line: 1,
							column: 1,
							severity: 'error',
							message: `Naming convention violation: ${match[2]}`,
						});
					}
				}

				return errors;
			}
		);
	}
	return [];
}

/**
 * Lockfile security with lockfile-lint
 */
function lintLockfileLint(lockfilePath) {
	if (isToolAvailable('lockfile-lint')) {
		const configPath = join(configDir, '.lockfile-lintrc.json');
		const configFlag = existsSync(configPath) ? `-c "${configPath}"` : '';
		return runCli(
			`lockfile-lint ${configFlag} --path "${lockfilePath}" 2>&1`,
			(output) => {
				const errors = [];

				if (output.includes('error') || output.includes('detected')) {
					// Parse lockfile-lint output
					const lines = output.split('\n');
					for (const line of lines) {
						if (line.includes('error') || line.includes('detected')) {
							errors.push({
								file: lockfilePath,
								line: 1,
								column: 1,
								severity: 'error',
								message: line.trim(),
							});
						}
					}
				}

				return errors;
			}
		);
	}

	// Fallback: basic lockfile checks
	const errors = [];
	try {
		const content = readFileSync(lockfilePath, 'utf8');

		// Check for http:// URLs (should be https)
		const httpMatches = content.matchAll(/"resolved":\s*"(http:\/\/[^"]+)"/g);
		for (const match of httpMatches) {
			errors.push({
				file: lockfilePath,
				line: 1,
				column: 1,
				severity: 'error',
				message: `Insecure HTTP URL in lockfile: ${match[1]}`,
			});
		}

		// Check for git:// URLs (should use https)
		const gitMatches = content.matchAll(/"resolved":\s*"(git:\/\/[^"]+)"/g);
		for (const match of gitMatches) {
			errors.push({
				file: lockfilePath,
				line: 1,
				column: 1,
				severity: 'warning',
				message: `Insecure git:// URL in lockfile: ${match[1]}`,
			});
		}
	} catch {
		// Ignore read errors
	}

	return errors;
}

/**
 * Commit message linting with commitlint
 */
function lintCommitlint(message) {
	if (isToolAvailable('commitlint')) {
		const configPath = join(configDir, 'commitlint.config.js');
		const configFlag = existsSync(configPath) ? `--config "${configPath}"` : '';
		return runCli(
			`echo "${message.replace(/"/g, '\\"')}" | commitlint ${configFlag} 2>&1`,
			(output) => {
				const errors = [];
				const lines = output.split('\n');

				for (const line of lines) {
					if (line.includes('✖') || line.includes('error')) {
						errors.push({
							file: 'commit-message',
							line: 1,
							column: 1,
							severity: 'error',
							message: line.replace(/✖\s*/, '').trim(),
						});
					} else if (line.includes('⚠') || line.includes('warning')) {
						errors.push({
							file: 'commit-message',
							line: 1,
							column: 1,
							severity: 'warning',
							message: line.replace(/⚠\s*/, '').trim(),
						});
					}
				}

				return errors;
			}
		);
	}

	// Fallback: basic conventional commit validation
	const errors = [];
	const conventionalPattern = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?: .+/;

	if (!conventionalPattern.test(message)) {
		errors.push({
			file: 'commit-message',
			line: 1,
			column: 1,
			severity: 'warning',
			message: 'Commit message does not follow conventional commit format (type(scope): description)',
		});
	}

	// Check message length
	const firstLine = message.split('\n')[0];
	if (firstLine.length > 100) {
		errors.push({
			file: 'commit-message',
			line: 1,
			column: 1,
			severity: 'warning',
			message: `Commit subject line too long (${firstLine.length} > 100 characters)`,
		});
	}

	return errors;
}

/**
 * CODEOWNERS validation with codeowners-checker or fallback
 */
function lintCodeownersChecker(file, rootDir) {
	if (isToolAvailable('codeowners-checker')) {
		return runCli(
			`codeowners-checker check --codeowners-file "${file}" --root "${rootDir}" 2>&1`,
			(output) => {
				const errors = [];
				const lines = output.split('\n');

				for (const line of lines) {
					if (line.includes('ERROR') || line.includes('not found') || line.includes('invalid')) {
						errors.push({
							file,
							line: 1,
							column: 1,
							severity: 'error',
							message: line.trim(),
						});
					}
				}

				return errors;
			}
		);
	}

	// Enhanced fallback: validate CODEOWNERS paths exist
	const errors = [];
	try {
		const content = readFileSync(file, 'utf8');
		const lines = content.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			// Skip comments and empty lines
			if (!line || line.startsWith('#')) continue;

			// Parse path and owners
			const parts = line.split(/\s+/);
			if (parts.length < 2) {
				errors.push({
					file,
					line: i + 1,
					column: 1,
					severity: 'error',
					message: 'Invalid CODEOWNERS entry: missing owner',
				});
				continue;
			}

			const pathPattern = parts[0];

			// Skip negation patterns
			if (pathPattern.startsWith('!')) continue;

			// Check if path exists (for non-glob patterns)
			if (!pathPattern.includes('*')) {
				const fullPath = `${rootDir}/${pathPattern.replace(/^\//, '')}`;
				try {
					statSync(fullPath);
				} catch {
					errors.push({
						file,
						line: i + 1,
						column: 1,
						severity: 'warning',
						message: `Path does not exist: ${pathPattern}`,
					});
				}
			}

			// Validate owner format
			const owners = parts.slice(1);
			for (const owner of owners) {
				if (!owner.startsWith('@') && !owner.includes('@')) {
					errors.push({
						file,
						line: i + 1,
						column: 1,
						severity: 'error',
						message: `Invalid owner format: ${owner} (should be @user, @org/team, or email)`,
					});
				}
			}
		}
	} catch (e) {
		errors.push({ file, line: 1, column: 1, severity: 'error', message: e.message });
	}

	return errors;
}

// ============================================
// Helpers
// ============================================

function runCli(command, parser) {
	try {
		const output = execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
		return parser(output);
	} catch (e) {
		if (e.stdout || e.stderr) {
			return parser(e.stdout || e.stderr || '');
		}
		return [];
	}
}

const toolAvailabilityCache = new Map();

function isToolAvailable(tool) {
	if (toolAvailabilityCache.has(tool)) {
		return toolAvailabilityCache.get(tool);
	}
	try {
		execSync(`which ${tool}`, { stdio: ['pipe', 'pipe', 'pipe'] });
		toolAvailabilityCache.set(tool, true);
		return true;
	} catch {
		toolAvailabilityCache.set(tool, false);
		return false;
	}
}

function parseUnixOutput(output) {
	return output
		.trim()
		.split('\n')
		.filter(Boolean)
		.map((line) => {
			const match = line.match(/^(.+):(\d+):(\d+):\s*(error|warning|note|info)?:?\s*(.+)$/);
			if (match) {
				return {
					file: match[1],
					line: parseInt(match[2], 10),
					column: parseInt(match[3], 10),
					severity: match[4] || 'error',
					message: match[5],
				};
			}
			return null;
		})
		.filter(Boolean);
}

function parseGccOutput(output) {
	return output
		.trim()
		.split('\n')
		.filter(Boolean)
		.map((line) => {
			const match = line.match(/^(.+):(\d+):(\d+):\s*(error|warning|note):\s*(.+)$/);
			if (match) {
				return {
					file: match[1],
					line: parseInt(match[2], 10),
					column: parseInt(match[3], 10),
					severity: match[4],
					message: match[5],
				};
			}
			return null;
		})
		.filter(Boolean);
}

function getLineCol(file, position) {
	const content = readFileSync(file, 'utf8');
	const before = content.slice(0, position);
	const lines = before.split('\n');
	return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

function formatOutput(results, fmt) {
	if (fmt === 'json') {
		return JSON.stringify(results, null, 2);
	}
	return results.map((r) => `${r.file}:${r.line}:${r.column}: ${r.severity}: ${r.message}`).join('\n');
}

// ============================================
// Custom Rules Integration
// ============================================

let customRulesLoaded = false;
let loadedRules = null;
let ruleContext = null;

async function loadCustomRules() {
	if (customRulesLoaded) return loadedRules;

	try {
		// Try to import compiled rules
		const rulesModule = await import('./rules/index.js');
		loadedRules = await rulesModule.loadRules();

		// Create context
		const rootDir = cwd();
		ruleContext = rulesModule.createRuleContext(rootDir, stage);

		customRulesLoaded = true;
		return loadedRules;
	} catch (e) {
		// Custom rules not compiled or not available
		if (!e.message.includes('Cannot find module')) {
			console.error('Error loading custom rules:', e.message);
		}
		customRulesLoaded = true;
		return null;
	}
}

async function runCustomFileRules(filePath, content) {
	if (!loadedRules || skipCustomRules) return [];

	try {
		const rulesModule = await import('./rules/index.js');
		return rulesModule.runFileRules(filePath, content, loadedRules, ruleContext, {
			stage,
			categories: categories.length ? categories : undefined,
			ruleIds: ruleIds.length ? ruleIds : undefined,
			fix,
		});
	} catch (e) {
		console.error(`Error running custom rules on ${filePath}:`, e.message);
		return [];
	}
}

async function runCustomWorkspaceRules() {
	if (!loadedRules || skipCustomRules) return [];

	try {
		const rulesModule = await import('./rules/index.js');
		const workspaceResults = await rulesModule.runWorkspaceRules(loadedRules, ruleContext, {
			stage,
			categories: categories.length ? categories : undefined,
			ruleIds: ruleIds.length ? ruleIds : undefined,
			fix,
		});

		const packageResults = await rulesModule.runPackageRules(loadedRules, ruleContext, {
			stage,
			categories: categories.length ? categories : undefined,
			ruleIds: ruleIds.length ? ruleIds : undefined,
			fix,
		});

		return [...workspaceResults, ...packageResults];
	} catch (e) {
		console.error('Error running workspace rules:', e.message);
		return [];
	}
}

function printRuleList(rules) {
	if (!rules) {
		console.log('No custom rules loaded. Run `pnpm build:rules` to compile rules.');
		return;
	}

	console.log('\nCustom Rules:');
	console.log('=============\n');

	// Group by category
	const byCategory = new Map();
	for (const rule of rules.all) {
		for (const cat of rule.categories) {
			const list = byCategory.get(cat) || [];
			list.push(rule);
			byCategory.set(cat, list);
		}
	}

	for (const [category, categoryRules] of byCategory) {
		console.log(`[${category}]`);
		for (const rule of categoryRules) {
			const stages = rule.stages.join(', ');
			console.log(`  ${rule.id}`);
			console.log(`    ${rule.description}`);
			console.log(`    Stages: ${stages}`);
		}
		console.log('');
	}

	console.log(`Total: ${rules.all.length} rules`);
}

// ============================================
// Main
// ============================================

async function main() {
	// Load custom rules
	await loadCustomRules();

	// Handle --list-rules
	if (listRules) {
		printRuleList(loadedRules);
		exit(0);
	}

	const filesToLint = files.length > 0 ? files : ['.'];

	// Run file-based linting
	for (const file of filesToLint) {
		if (!existsSync(file)) continue;

		const resolvedFile = resolve(file);

		// Run existing linters (unless --only-custom-rules)
		if (!onlyCustomRules) {
			const linter = getLinter(file);
			if (linter) {
				try {
					const fileResults = linter(resolvedFile);
					results.push(...fileResults);
				} catch (e) {
					console.error(`Error linting ${file}: ${e.message}`);
				}
			}
		}

		// Run custom file rules (TypeScript AST rules)
		if (!skipCustomRules && loadedRules) {
			try {
				const content = readFileSync(resolvedFile, 'utf8');
				const customResults = await runCustomFileRules(resolvedFile, content);
				results.push(...customResults);
			} catch (e) {
				// File read error, skip
			}
		}
	}

	// Run workspace and package rules
	if (!skipCustomRules && loadedRules) {
		const workspaceResults = await runCustomWorkspaceRules();
		results.push(...workspaceResults);
	}

	if (results.length > 0) {
		console.log(formatOutput(results, format));
		exit(1);
	}
	exit(0);
}

main();
