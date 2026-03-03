import * as v from 'valibot';
import { messageTemplate } from '@/locale/template';

/**
 * Editor locale schema — defines all translatable strings.
 *
 * Namespaces: meta, common, sidebar, header, settings, project, scenes.
 * Each key uses `messageTemplate()` for static strings or
 * `messageTemplate({ param: Schema })` for parameterized strings.
 */
export const EditorLocaleSchema = v.strictObject({
	meta: v.strictObject({
		description: messageTemplate(),
		applicationName: messageTemplate(),
	}),
	common: v.strictObject({
		settings: messageTemplate(),
		help: messageTemplate(),
		rename: messageTemplate(),
		duplicate: messageTemplate(),
		delete: messageTemplate(),
		cancel: messageTemplate(),
		save: messageTemplate(),
		close: messageTemplate(),
		loading: messageTemplate(),
	}),
	sidebar: v.strictObject({
		scenes: messageTemplate(),
		newScene: messageTemplate(),
		assets: messageTemplate(),
		tilesets: messageTemplate(),
		sprites: messageTemplate(),
		audio: messageTemplate(),
	}),
	header: v.strictObject({
		editor: messageTemplate(),
		scene: messageTemplate(),
	}),
	settings: v.strictObject({
		appearance: messageTemplate(),
		theme: messageTemplate(),
		language: messageTemplate(),
		light: messageTemplate(),
		dark: messageTemplate(),
		system: messageTemplate(),
		themeDefault: messageTemplate(),
		themeMidnight: messageTemplate(),
		themeWarm: messageTemplate(),
		themeForest: messageTemplate(),
		themeOcean: messageTemplate(),
		themeRose: messageTemplate(),
		themeLavender: messageTemplate(),
		themeSunset: messageTemplate(),
		themeSlate: messageTemplate(),
		themeCopper: messageTemplate(),
		themeAurora: messageTemplate(),
		themeAmethyst: messageTemplate(),
	}),
	project: v.strictObject({
		openProject: messageTemplate(),
		webforgeProject: messageTemplate(),
	}),
	scenes: v.strictObject({
		rename: messageTemplate(),
		duplicate: messageTemplate(),
		delete: messageTemplate(),
	}),
});

export type EditorLocaleRaw = v.InferOutput<typeof EditorLocaleSchema>;
