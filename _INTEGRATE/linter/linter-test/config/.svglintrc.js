/** @type {import('svglint').Config} */
export default {
	rules: {
		// Validate SVG element
		elm: {
			svg: true,
		},

		// Validate attributes
		attr: [
			{
				// SVG root element should have viewBox
				role: 'abs',
				'rule::selector': 'svg',
				viewBox: true,
			},
			{
				// Prefer viewBox over width/height on root
				role: 'abs',
				'rule::selector': 'svg',
				width: false,
				height: false,
			},
			{
				// No inline styles (prefer CSS classes)
				role: 'abs',
				'rule::selector': '*',
				style: false,
			},
			{
				// No onclick handlers
				role: 'abs',
				'rule::selector': '*',
				onclick: false,
				onload: false,
				onerror: false,
			},
			{
				// No JavaScript in href
				role: 'abs',
				'rule::selector': 'a',
				'xlink:href': /^(?!javascript:).*/i,
				href: /^(?!javascript:).*/i,
			},
		],

		// Custom rules
		custom: [
			// Check for empty title
			function (reporter, $, ast) {
				const title = $('title');
				if (title.length === 0) {
					reporter.warn('SVG should have a <title> element for accessibility');
				} else if (title.text().trim() === '') {
					reporter.error('<title> element should not be empty');
				}
			},

			// Check for desc on complex SVGs
			function (reporter, $) {
				const paths = $('path, circle, rect, polygon, polyline, ellipse, line');
				const desc = $('desc');
				if (paths.length > 5 && desc.length === 0) {
					reporter.warn('Complex SVGs should have a <desc> element');
				}
			},

			// Check for large file size
			function (reporter, $, ast, { source }) {
				const size = Buffer.byteLength(source, 'utf8');
				if (size > 50000) {
					reporter.warn(`SVG file is large (${Math.round(size / 1024)}KB). Consider optimizing.`);
				}
			},

			// Check for embedded raster images
			function (reporter, $) {
				const images = $('image');
				images.each((_, el) => {
					const href = $(el).attr('href') || $(el).attr('xlink:href');
					if (href && href.startsWith('data:image')) {
						reporter.warn('SVG contains embedded raster image. Consider using separate file.');
					}
				});
			},

			// Check for embedded scripts
			function (reporter, $) {
				const scripts = $('script');
				if (scripts.length > 0) {
					reporter.error('SVG should not contain <script> elements');
				}
			},

			// Check for embedded styles (prefer external CSS)
			function (reporter, $) {
				const styles = $('style');
				if (styles.length > 0) {
					reporter.warn('Consider using external CSS instead of embedded <style>');
				}
			},

			// Check for use of currentColor
			function (reporter, $) {
				const fills = $('[fill]').not('[fill="none"]').not('[fill="currentColor"]');
				const strokes = $('[stroke]').not('[stroke="none"]').not('[stroke="currentColor"]');

				if (fills.length > 0 || strokes.length > 0) {
					reporter.info('Consider using currentColor for fills/strokes to enable CSS styling');
				}
			},
		],
	},
};
