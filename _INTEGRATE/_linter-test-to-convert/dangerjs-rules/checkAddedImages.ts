import type { Rules } from '../interfaces/rulesInterface';

import { readFileSync } from 'node:fs';

import optimizeSvg from '../utils/optimizeSvg';

export default {
	description: '[Task] Are Images Optimized? (checkAddedImages)',
	run: ({ danger, fail }): boolean => {
		const changedFiles = [
			...danger.git.modified_files,
			...danger.git.created_files,
		];
		let hasErrors = false;

		for (const file of changedFiles) {
			if (file.includes('.svg')) {
				const svgFileData = readFileSync(file, 'utf-8').toString();
				const optimizedSvg = optimizeSvg(svgFileData);

				if (svgFileData !== optimizedSvg) {
					fail(
						`The file "${file}" is not an optimized SVG. You should use "svgo" to optimize this svg.`,
					);
					hasErrors = true;
				}
			} else if (
				file.includes('.png') ||
				file.includes('.jpg') ||
				file.includes('.jpeg') ||
				file.includes('.webp') ||
				file.includes('.ico')
			) {
				// TODO
			} else {
				// [Note]: Nothing to handle here
			}
		}

		if (hasErrors) {
			throw new Error(
				'One or more image files are not optimized, refer to the report at the end.',
			);
		}
		return hasErrors;
	},
} satisfies Rules;
