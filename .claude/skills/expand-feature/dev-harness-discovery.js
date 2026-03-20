/**
 * Dev Harness Discovery Helper
 *
 * Register via browser_evaluate FIRST to discover what panels, sections,
 * and controls exist in the dev harness. Use this BEFORE registering the
 * control helper to build a complete testing checklist.
 *
 * Supports TWO DOM patterns:
 * 1. `.panel-header` (id: `<x>-header`) + `.panel-body` (id: `<x>-body`)
 *    with `.cg` sub-groups containing `.cg-header` + `.cg-body`
 * 2. `.section` (id: `section-<x>`) with `.section-header` + `.section-body`
 *    Controls may be flat (no `.cg` groups) or grouped in `.cg` sub-sections.
 *
 * Controls have `data-type` (slider|toggle|dropdown|text|color|info) and
 * `data-control` (kebab-case identifier) attributes for precise targeting.
 *
 * Usage:
 *   // In browser_evaluate:
 *   // () => { <paste this>; return __discover.panels(); }
 */

// eslint-disable-next-line no-unused-vars
const __discover = {
	/**
	 * Internal: resolve the controls container from a panel/section ID.
	 * - `.panel-body` pattern: returns the element itself
	 * - `.section` pattern: returns the `.section-body` child
	 * @param {string} panelBodyId
	 * @returns {HTMLElement|null}
	 */
	_container(panelBodyId) {
		const el = document.getElementById(panelBodyId);
		if (!el) return null;
		return el.querySelector('.section-body') || el;
	},

	/**
	 * Internal: collect controls from a DOM container element.
	 * Prefers `data-type` and `data-control` attributes when available,
	 * falls back to DOM inspection for controls without data attributes.
	 * @param {HTMLElement} container
	 * @returns {Array<{type: string, label: string, control?: string, value?: string, min?: string, max?: string, step?: string, options?: string[]}>}
	 */
	_collectControls(container) {
		const controls = [];
		const seen = new Set();

		// First pass: use data-type attributes (preferred)
		container.querySelectorAll('[data-type]').forEach((row) => {
			seen.add(row);
			const type = row.dataset.type;
			const control = row.dataset.control;
			const label =
				row.querySelector('.control-label')?.textContent?.trim();
			const entry = { type, label };
			if (control) entry.control = control;

			if (type === 'slider') {
				const slider = row.querySelector('input[type="range"]');
				if (slider) {
					entry.value = slider.value;
					entry.min = slider.min;
					entry.max = slider.max;
					entry.step = slider.step;
				}
			} else if (type === 'toggle') {
				const toggle = row.querySelector('.toggle-switch');
				entry.value = toggle?.classList.contains('on')
					? 'ON'
					: 'OFF';
			} else if (type === 'dropdown') {
				const select = row.querySelector('select');
				if (select) {
					entry.value =
						select.options[select.selectedIndex]?.text;
					entry.options = Array.from(select.options).map(
						(o) => o.text,
					);
				}
			} else if (type === 'text') {
				const input = row.querySelector('input[type="text"]');
				if (input) entry.value = input.value;
			} else if (type === 'color') {
				const input = row.querySelector('input[type="color"]');
				if (input) entry.value = input.value;
			} else if (type === 'info') {
				const valEl = row.querySelector('.control-value, span:last-child');
				if (valEl) entry.value = valEl.textContent?.trim();
			}

			controls.push(entry);
		});

		// Second pass: fallback for controls without data-type (legacy)
		container.querySelectorAll('.toggle-row').forEach((row) => {
			if (seen.has(row)) return;
			const label =
				row.querySelector('.control-label')?.textContent?.trim();
			const toggle = row.querySelector('.toggle-switch');
			controls.push({
				type: 'toggle',
				label,
				value: toggle?.classList.contains('on') ? 'ON' : 'OFF',
			});
		});
		container.querySelectorAll('.control-row').forEach((row) => {
			if (seen.has(row)) return;
			const label =
				row.querySelector('.control-label')?.textContent?.trim();
			const slider = row.querySelector('input[type="range"]');
			const select = row.querySelector('select');
			if (slider) {
				controls.push({
					type: 'slider',
					label,
					value: slider.value,
					min: slider.min,
					max: slider.max,
					step: slider.step,
				});
			}
			if (select) {
				const opts = Array.from(select.options).map((o) => o.text);
				controls.push({
					type: 'select',
					label,
					value: select.options[select.selectedIndex]?.text,
					options: opts,
				});
			}
		});
		return controls;
	},

	/**
	 * List all collapsible panels in the sidebar (top-level sections).
	 * Returns panel names, their IDs, and open/closed state.
	 *
	 * Supports TWO DOM patterns:
	 * 1. `.panel-header` with id ending `-header` -> body id ends `-body`
	 * 2. `.section` with `.section-header` child -> body is the section itself
	 */
	panels() {
		// Try .panel-header first (old pattern)
		const panelHeaders = document.querySelectorAll('.panel-header');
		if (panelHeaders.length > 0) {
			return Array.from(panelHeaders).map((h) => ({
				name: h.querySelector('span')?.textContent?.trim(),
				id: h.id,
				bodyId: h.id?.replace('-header', '-body'),
				isOpen: !h.classList.contains('collapsed'),
			}));
		}
		// Fall back to .section pattern (WebForge dev harness)
		return Array.from(document.querySelectorAll('.section[id]')).map(
			(s) => ({
				name: s
					.querySelector('.section-header')
					?.textContent?.trim()
					?.replace(/\s*[\u25BE\u25B8]\s*/, ''),
				id: s.id,
				bodyId: s.id,
				isOpen: !s.classList.contains('collapsed'),
			}),
		);
	},

	/**
	 * List all sub-sections within a panel body.
	 * Returns `.cg` group names and their open/closed state.
	 * If the panel has NO `.cg` groups (flat controls), returns an empty array.
	 * @param {string} panelBodyId — e.g., 'fog-body', 'section-daynight'
	 */
	sections(panelBodyId) {
		const container = this._container(panelBodyId);
		if (!container) return `Panel body "${panelBodyId}" not found`;
		const groups = container.querySelectorAll('.cg');
		if (groups.length === 0) return [];
		return Array.from(groups).map((g) => {
			const hdr = g.querySelector('.cg-header > span:first-child');
			return {
				name: hdr?.textContent?.trim(),
				isOpen: !g
					.querySelector('.cg-body')
					?.classList.contains('hidden'),
			};
		});
	},

	/**
	 * List all controls within a specific sub-section.
	 * Returns type (toggle/slider/select/text/color/info), label, control ID,
	 * current value, and range/options.
	 *
	 * If the panel has NO `.cg` groups, pass null or any string for sectionName
	 * to get ALL flat controls in the panel.
	 *
	 * @param {string} panelBodyId
	 * @param {string|null} sectionName — partial match, case-insensitive. Null = all flat controls.
	 */
	controls(panelBodyId, sectionName) {
		const container = this._container(panelBodyId);
		if (!container) return `Panel body "${panelBodyId}" not found`;

		const groups = container.querySelectorAll('.cg');

		// If .cg groups exist, search within them
		if (groups.length > 0 && sectionName) {
			for (const g of groups) {
				const hdr = g.querySelector('.cg-header > span:first-child');
				if (
					hdr &&
					hdr.textContent
						.trim()
						.toLowerCase()
						.includes(sectionName.toLowerCase())
				) {
					const cgBody = g.querySelector('.cg-body') || g;
					return this._collectControls(cgBody);
				}
			}
			return `Section "${sectionName}" not found`;
		}

		// No .cg groups (flat controls) — collect everything from the container
		return this._collectControls(container);
	},

	/**
	 * Complete inventory of ALL controls across ALL sections in a panel.
	 * Use this to build a testing checklist that ensures NOTHING is missed.
	 *
	 * Now includes `control` field from `data-control` attribute when available.
	 *
	 * For panels with `.cg` groups: returns { sectionName: [...controls] }
	 * For flat panels (no `.cg` groups): returns { "(root)": [...controls] }
	 *
	 * @param {string} panelBodyId
	 */
	fullInventory(panelBodyId) {
		const container = this._container(panelBodyId);
		if (!container) return `Panel body "${panelBodyId}" not found`;
		const inventory = {};

		const groups = container.querySelectorAll('.cg');

		if (groups.length > 0) {
			// Panel with .cg sub-sections
			groups.forEach((g) => {
				const name =
					g
						.querySelector('.cg-header > span:first-child')
						?.textContent?.trim() || 'unknown';
				const cgBody = g.querySelector('.cg-body') || g;
				inventory[name] = this._collectControls(cgBody);
			});
		} else {
			// Flat controls (no .cg sub-sections)
			inventory['(root)'] = this._collectControls(container);
		}

		return inventory;
	},

	/**
	 * Find top-level controls NOT inside any sub-section (directly in panel body).
	 * Some panels have controls at the root level (e.g., preset dropdowns, master toggles).
	 * @param {string} panelBodyId
	 */
	rootControls(panelBodyId) {
		const container = this._container(panelBodyId);
		if (!container) return `Panel body "${panelBodyId}" not found`;
		const controls = [];
		// Only look at direct children, not inside .cg groups
		container
			.querySelectorAll(':scope > [data-type]')
			.forEach((row) => {
				const type = row.dataset.type;
				const control = row.dataset.control;
				const label =
					row.querySelector('.control-label')?.textContent?.trim();
				const entry = { type, label };
				if (control) entry.control = control;

				if (type === 'toggle') {
					const toggle = row.querySelector('.toggle-switch');
					entry.value = toggle?.classList.contains('on')
						? 'ON'
						: 'OFF';
				} else if (type === 'slider') {
					const slider = row.querySelector('input[type="range"]');
					if (slider) {
						entry.value = slider.value;
						entry.min = slider.min;
						entry.max = slider.max;
					}
				} else if (type === 'dropdown') {
					const select = row.querySelector('select');
					if (select) {
						entry.value =
							select.options[select.selectedIndex]?.text;
						entry.options = Array.from(select.options).map(
							(o) => o.text,
						);
					}
				}
				controls.push(entry);
			});

		// Fallback: legacy rows without data-type
		container
			.querySelectorAll(':scope > .toggle-row:not([data-type])')
			.forEach((row) => {
				const label =
					row.querySelector('.control-label')?.textContent?.trim();
				const toggle = row.querySelector('.toggle-switch');
				controls.push({
					type: 'toggle',
					label,
					value: toggle?.classList.contains('on') ? 'ON' : 'OFF',
				});
			});
		container
			.querySelectorAll(':scope > .control-row:not([data-type])')
			.forEach((row) => {
				const label =
					row.querySelector('.control-label')?.textContent?.trim();
				const slider = row.querySelector('input[type="range"]');
				const select = row.querySelector('select');
				if (slider)
					controls.push({
						type: 'slider',
						label,
						value: slider.value,
						min: slider.min,
						max: slider.max,
					});
				if (select) {
					const opts = Array.from(select.options).map(
						(o) => o.text,
					);
					controls.push({
						type: 'select',
						label,
						value: select.options[select.selectedIndex]?.text,
						options: opts,
					});
				}
			});
		return controls;
	},

	/**
	 * Open a collapsed panel by clicking its header.
	 * Handles both `.panel-header` (by header ID) and `.section` (by section ID).
	 * @param {string} panelIdOrHeaderId — e.g., 'fog-header' or 'section-daynight'
	 */
	openPanel(panelIdOrHeaderId) {
		const el = document.getElementById(panelIdOrHeaderId);
		if (!el) return `Panel "${panelIdOrHeaderId}" not found`;

		// .section pattern — click the .section-header child
		if (el.classList.contains('section')) {
			if (el.classList.contains('collapsed')) {
				const hdr = el.querySelector('.section-header');
				if (hdr) hdr.click();
			}
			return `Panel "${panelIdOrHeaderId}" opened`;
		}

		// .panel-header pattern — click the header itself
		if (el.classList.contains('collapsed')) el.click();
		return `Panel "${panelIdOrHeaderId}" opened`;
	},

	/**
	 * Open a collapsed sub-section within a panel.
	 * Only applies to panels with `.cg` groups. No-op for flat panels.
	 * @param {string} panelBodyId
	 * @param {string} sectionName — partial match
	 */
	openSection(panelBodyId, sectionName) {
		const container = this._container(panelBodyId);
		if (!container) return `Panel body "${panelBodyId}" not found`;
		const groups = container.querySelectorAll('.cg');
		if (groups.length === 0) return 'No sub-sections (flat controls)';
		for (const g of groups) {
			const hdr = g.querySelector('.cg-header > span:first-child');
			if (
				hdr &&
				hdr.textContent
					.trim()
					.toLowerCase()
					.includes(sectionName.toLowerCase())
			) {
				const cgBody = g.querySelector('.cg-body');
				if (cgBody && cgBody.classList.contains('hidden')) {
					g.querySelector('.cg-header').click();
				}
				return `Section "${sectionName}" opened`;
			}
		}
		return `Section "${sectionName}" not found`;
	},

	/**
	 * Find a control by its data-control attribute value.
	 * Returns the control's type, label, current value, and DOM element.
	 * @param {string} controlId — data-control value (e.g., 'fog-density')
	 */
	findByControl(controlId) {
		const el = document.querySelector(`[data-control="${controlId}"]`);
		if (!el) return `Control "${controlId}" not found`;
		const type = el.dataset.type || 'unknown';
		const label =
			el.querySelector('.control-label')?.textContent?.trim();
		const entry = { type, label, control: controlId };

		if (type === 'slider') {
			const slider = el.querySelector('input[type="range"]');
			if (slider) {
				entry.value = slider.value;
				entry.min = slider.min;
				entry.max = slider.max;
			}
		} else if (type === 'toggle') {
			const toggle = el.querySelector('.toggle-switch');
			entry.value = toggle?.classList.contains('on') ? 'ON' : 'OFF';
		} else if (type === 'dropdown') {
			const select = el.querySelector('select');
			if (select) {
				entry.value = select.options[select.selectedIndex]?.text;
				entry.options = Array.from(select.options).map(
					(o) => o.text,
				);
			}
		}
		return entry;
	},

	/**
	 * Count all controls that have data-type and data-control attributes.
	 * Useful for verifying coverage after adding data attributes.
	 */
	attributeCoverage() {
		const withType = document.querySelectorAll('[data-type]').length;
		const withControl =
			document.querySelectorAll('[data-control]').length;
		const withBoth = document.querySelectorAll(
			'[data-type][data-control]',
		).length;
		return { withType, withControl, withBoth };
	},
};
