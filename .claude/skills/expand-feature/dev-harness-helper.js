/**
 * Dev Harness Control Helper
 *
 * Register via browser_evaluate at session start for programmatic control
 * manipulation during visual testing. Replace '<feature>' with the actual
 * panel body ID (e.g., 'fog-body', 'section-daynight').
 *
 * Supports TWO DOM patterns:
 * 1. Panels with `.cg` sub-groups — pass sub-section name to target controls
 * 2. Flat panels (no `.cg` groups) — pass any string for sectionName (searches
 *    all controls in the panel body directly)
 *
 * Controls can be targeted by `data-control` attribute (preferred) or by
 * label text matching (fallback).
 *
 * Usage:
 *   // In browser_evaluate, copy this entire file content and wrap in:
 *   // () => { <paste here>; return 'helper registered'; }
 *
 *   // Or register per-feature:
 *   window.__helper = createHelper('fog-body');
 *   window.__helper = createHelper('section-daynight');
 */

// eslint-disable-next-line no-unused-vars
function createHelper(panelBodyId) {
	return {
		/**
		 * Resolve the actual controls container from the panel body ID.
		 * - `.panel-body` pattern: returns the element itself
		 * - `.section` pattern: returns the `.section-body` child
		 * @returns {HTMLElement|null}
		 */
		_container() {
			const el = document.getElementById(panelBodyId);
			if (!el) return null;
			return el.querySelector('.section-body') || el;
		},

		/**
		 * Internal: find a control row by data-control attribute first,
		 * then fall back to label text matching within a section.
		 * @param {string} controlId — data-control value or label text
		 * @param {string} [sectionName] — optional section name for label fallback
		 * @param {string} [rowSelector] — CSS selector for row type (e.g., '.toggle-row', '.control-row')
		 * @returns {HTMLElement|null}
		 */
		_findRow(controlId, sectionName, rowSelector) {
			// Try data-control first (precise, preferred)
			const container = this._container();
			if (container) {
				const byAttr = container.querySelector(
					`[data-control="${controlId}"]`,
				);
				if (byAttr) return byAttr;
			}

			// Fall back to label text matching within section
			const section = this.findSection(sectionName || '');
			if (!section) return null;
			const rows = section.querySelectorAll(
				rowSelector || '.control-row, .toggle-row',
			);
			for (const row of rows) {
				const label = row.querySelector('.control-label');
				if (
					label &&
					label.textContent
						.trim()
						.toLowerCase()
						.includes(controlId.toLowerCase())
				) {
					return row;
				}
			}
			return null;
		},

		/**
		 * Find a control group by header text.
		 *
		 * Supports TWO DOM patterns:
		 * 1. `.cg` groups with `.cg-header > span:first-child` — searches by name
		 * 2. Flat panels (no `.cg` groups) — returns the container itself
		 *    (all controls are at the root level)
		 *
		 * @param {string} sectionName — partial match, case-insensitive
		 * @returns {HTMLElement|null}
		 */
		findSection(sectionName) {
			const container = this._container();
			if (!container) return null;

			const groups = container.querySelectorAll('.cg');

			// If .cg groups exist, search them by name
			if (groups.length > 0) {
				for (const g of groups) {
					const hdr = g.querySelector(
						'.cg-header > span:first-child',
					);
					if (
						hdr &&
						hdr.textContent
							.trim()
							.toLowerCase()
							.includes(sectionName.toLowerCase())
					) {
						return g;
					}
				}
				return null;
			}

			// No .cg groups (flat controls) — return the container itself
			return container;
		},

		/**
		 * Toggle a switch ON or OFF.
		 *
		 * Dev harness toggles are `.toggle-switch` divs with class `on`
		 * (NOT <input type="checkbox">, NOT .active).
		 *
		 * Tries `data-control` selector first, then falls back to label text.
		 *
		 * @param {string} sectionName — sub-section name (ignored for flat panels)
		 * @param {string} labelOrControl — data-control value or label text (partial match)
		 * @param {boolean} wantOn — desired state
		 * @returns {string} confirmation message
		 */
		setToggle(sectionName, labelOrControl, wantOn) {
			const row = this._findRow(
				labelOrControl,
				sectionName,
				'.toggle-row, [data-type="toggle"]',
			);
			if (!row) return `Toggle "${labelOrControl}" not found in "${sectionName}"`;
			const toggle = row.querySelector('.toggle-switch');
			if (!toggle) return `Toggle switch not found in row "${labelOrControl}"`;
			const isOn = toggle.classList.contains('on');
			if (isOn !== wantOn) toggle.click();
			const label =
				row.querySelector('.control-label')?.textContent?.trim() ||
				labelOrControl;
			return `${label}: ${wantOn ? 'ON' : 'OFF'}`;
		},

		/**
		 * Set a slider value.
		 *
		 * MUST use prototype setter + dispatch events (React-style).
		 * Direct `.value = x` assignment does NOT trigger change handlers.
		 *
		 * Tries `data-control` selector first, then falls back to label text.
		 *
		 * @param {string} sectionName
		 * @param {string} labelOrControl — data-control value or label text
		 * @param {number} value
		 * @returns {string} confirmation message
		 */
		setSlider(sectionName, labelOrControl, value) {
			const row = this._findRow(
				labelOrControl,
				sectionName,
				'.control-row, [data-type="slider"]',
			);
			if (!row) return `Slider "${labelOrControl}" not found in "${sectionName}"`;
			const slider = row.querySelector('input[type="range"]');
			if (!slider) return `Slider input not found in row "${labelOrControl}"`;
			const setter = Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				'value',
			).set;
			setter.call(slider, value);
			slider.dispatchEvent(new Event('input', { bubbles: true }));
			slider.dispatchEvent(new Event('change', { bubbles: true }));
			const label =
				row.querySelector('.control-label')?.textContent?.trim() ||
				labelOrControl;
			return `${label}: ${value}`;
		},

		/**
		 * Set a dropdown/select value.
		 *
		 * Same prototype setter pattern as sliders.
		 * Matches by option text OR option value (case-insensitive).
		 *
		 * Tries `data-control` selector first, then falls back to label text.
		 *
		 * @param {string} sectionName
		 * @param {string} labelOrControl — data-control value or label text
		 * @param {string} optionText — option text or value to select
		 * @returns {string} confirmation message
		 */
		setSelect(sectionName, labelOrControl, optionText) {
			const row = this._findRow(
				labelOrControl,
				sectionName,
				'.control-row, [data-type="dropdown"]',
			);
			if (!row) return `Select "${labelOrControl}" not found in "${sectionName}"`;
			const select = row.querySelector('select');
			if (!select) return `Select element not found in row "${labelOrControl}"`;
			const opts = Array.from(select.options);
			const match = opts.find(
				(o) =>
					o.text.toLowerCase() === optionText.toLowerCase() ||
					o.value.toLowerCase() === optionText.toLowerCase(),
			);
			if (!match)
				return `Option "${optionText}" not found. Available: ${opts.map((o) => o.text).join(', ')}`;
			const setter = Object.getOwnPropertyDescriptor(
				HTMLSelectElement.prototype,
				'value',
			).set;
			setter.call(select, match.value);
			select.dispatchEvent(new Event('change', { bubbles: true }));
			const label =
				row.querySelector('.control-label')?.textContent?.trim() ||
				labelOrControl;
			return `${label}: ${optionText}`;
		},

		/**
		 * Read current state of ALL controls in a section.
		 *
		 * Returns object with label -> { value, control?, type? } for every
		 * toggle, slider, select, text, and color control. Includes `data-control`
		 * value when available.
		 *
		 * For flat panels (no .cg groups), sectionName is ignored — reads all controls.
		 *
		 * @param {string} sectionName
		 * @returns {object} { label: { value, control?, type? }, ... }
		 */
		readAll(sectionName) {
			const section = this.findSection(sectionName);
			if (!section) return `Section "${sectionName}" not found`;
			const result = {};

			// Prefer data-type rows
			section.querySelectorAll('[data-type]').forEach((row) => {
				const type = row.dataset.type;
				const control = row.dataset.control;
				const label =
					row.querySelector('.control-label')?.textContent?.trim();
				if (!label) return;

				const entry = {};
				if (control) entry.control = control;
				if (type) entry.type = type;

				if (type === 'toggle') {
					const toggle = row.querySelector('.toggle-switch');
					entry.value = toggle?.classList.contains('on')
						? 'ON'
						: 'OFF';
				} else if (type === 'slider') {
					const slider = row.querySelector('input[type="range"]');
					if (slider) entry.value = slider.value;
				} else if (type === 'dropdown') {
					const select = row.querySelector('select');
					if (select)
						entry.value =
							select.options[select.selectedIndex]?.text;
				} else if (type === 'text') {
					const input = row.querySelector('input[type="text"]');
					if (input) entry.value = input.value;
				} else if (type === 'color') {
					const input = row.querySelector('input[type="color"]');
					if (input) entry.value = input.value;
				}

				result[label] = entry;
			});

			// Fallback for legacy rows
			section
				.querySelectorAll('.toggle-row:not([data-type])')
				.forEach((row) => {
					const label = row.querySelector('.control-label');
					const toggle = row.querySelector('.toggle-switch');
					if (label && toggle)
						result[label.textContent.trim()] = {
							value: toggle.classList.contains('on')
								? 'ON'
								: 'OFF',
						};
				});
			section
				.querySelectorAll('.control-row:not([data-type])')
				.forEach((row) => {
					const label = row.querySelector('.control-label');
					const slider = row.querySelector('input[type="range"]');
					const select = row.querySelector('select');
					if (label && slider)
						result[label.textContent.trim()] = {
							value: slider.value,
						};
					if (label && select)
						result[label.textContent.trim()] = {
							value: select.options[select.selectedIndex]?.text,
						};
				});
			return result;
		},
	};
}
