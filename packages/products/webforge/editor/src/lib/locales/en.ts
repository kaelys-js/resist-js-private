import type { EditorLocaleRaw } from './schema';

export const en: EditorLocaleRaw = {
	meta: {
		description: 'WebForge RPG — HD-2D game creation suite',
		applicationName: 'WebForge',
	},
	common: {
		settings: 'Settings',
		help: 'Help',
		rename: 'Rename',
		duplicate: 'Duplicate',
		delete: 'Delete',
		cancel: 'Cancel',
		save: 'Save',
		close: 'Close',
		loading: 'Loading…',
	},
	sidebar: {
		scenes: 'Scenes',
		newScene: 'New Scene',
		assets: 'Assets',
		tilesets: 'Tilesets',
		sprites: 'Sprites',
		audio: 'Audio',
	},
	header: {
		editor: 'Editor',
		scene: 'Scene',
		error: 'Error',
		toggleSidebar: 'Toggle Sidebar',
	},
	settings: {
		appearance: 'Appearance',
		theme: 'Theme',
		language: 'Language',
		toggleTheme: 'Toggle theme',
		light: 'Light',
		dark: 'Dark',
		system: 'System',
		themeDefault: 'Default',
		themeMidnight: 'Midnight',
		themeWarm: 'Warm',
		themeForest: 'Forest',
		themeOcean: 'Ocean',
		themeRose: 'Rose',
		themeLavender: 'Lavender',
		themeSunset: 'Sunset',
		themeSlate: 'Slate',
		themeCopper: 'Copper',
		themeAurora: 'Aurora',
		themeAmethyst: 'Amethyst',
	},
	project: {
		openProject: 'Open Project',
		webforgeProject: 'WebForge Project',
	},
	scenes: {
		rename: 'Rename Scene',
		duplicate: 'Duplicate Scene',
		delete: 'Delete Scene',
	},
	errors: {
		badRequest: 'Bad request',
		badRequestDescription:
			"Something in that request didn't look right. Double-check and try again.",
		notFound: 'Page not found',
		notFoundDescription:
			'We looked everywhere, but this page seems to have wandered off. It may have been moved or deleted.',
		forbidden: 'Access denied',
		forbiddenDescription:
			"You don't have permission to access this page. Try signing in with a different account.",
		serverError: 'Something went wrong',
		serverErrorDescription:
			"Oops! Something broke on our end. We're looking into it — please try again in a moment.",
		genericTitle: 'Error',
		genericDescription: 'Something unexpected happened while loading this page.',
		goHome: 'Go to homepage',
		tryAgain: 'Try again',
		errorId: 'Error ID: {id}',
	},
};
