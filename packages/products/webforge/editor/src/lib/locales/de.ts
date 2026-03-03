import type { EditorLocaleRaw } from './schema';

export const de: EditorLocaleRaw = {
	meta: {
		description: 'WebForge RPG — HD-2D-Spielerstellungssuite',
		applicationName: 'WebForge',
	},
	common: {
		settings: 'Einstellungen',
		help: 'Hilfe',
		rename: 'Umbenennen',
		duplicate: 'Duplizieren',
		delete: 'Löschen',
		cancel: 'Abbrechen',
		save: 'Speichern',
		close: 'Schließen',
		loading: 'Laden…',
	},
	sidebar: {
		scenes: 'Szenen',
		newScene: 'Neue Szene',
		assets: 'Assets',
		tilesets: 'Tilesets',
		sprites: 'Sprites',
		audio: 'Audio',
	},
	header: {
		editor: 'Editor',
		scene: 'Szene',
		error: 'Fehler',
		toggleSidebar: 'Seitenleiste umschalten',
	},
	settings: {
		appearance: 'Darstellung',
		theme: 'Design',
		language: 'Sprache',
		toggleTheme: 'Design wechseln',
		light: 'Hell',
		dark: 'Dunkel',
		system: 'System',
		themeDefault: 'Standard',
		themeMidnight: 'Mitternacht',
		themeWarm: 'Warm',
		themeForest: 'Wald',
		themeOcean: 'Ozean',
		themeRose: 'Rose',
		themeLavender: 'Lavendel',
		themeSunset: 'Sonnenuntergang',
		themeSlate: 'Schiefer',
		themeCopper: 'Kupfer',
		themeAurora: 'Polarlicht',
		themeAmethyst: 'Amethyst',
	},
	project: {
		openProject: 'Projekt öffnen',
		webforgeProject: 'WebForge-Projekt',
	},
	scenes: {
		rename: 'Szene umbenennen',
		duplicate: 'Szene duplizieren',
		delete: 'Szene löschen',
	},
	errors: {
		badRequest: 'Ungültige Anfrage',
		badRequestDescription:
			'Etwas an dieser Anfrage stimmt nicht. Bitte überprüfen und erneut versuchen.',
		notFound: 'Seite nicht gefunden',
		notFoundDescription:
			'Wir haben überall gesucht, aber diese Seite scheint verschwunden zu sein. Möglicherweise wurde sie verschoben oder gelöscht.',
		forbidden: 'Zugriff verweigert',
		forbiddenDescription:
			'Sie haben keine Berechtigung, auf diese Seite zuzugreifen. Versuchen Sie, sich mit einem anderen Konto anzumelden.',
		serverError: 'Etwas ist schiefgelaufen',
		serverErrorDescription:
			'Hoppla! Auf unserer Seite ist etwas kaputtgegangen. Wir kümmern uns darum — bitte versuchen Sie es gleich noch einmal.',
		genericTitle: 'Fehler',
		genericDescription: 'Beim Laden dieser Seite ist etwas Unerwartetes passiert.',
		goHome: 'Zur Startseite',
		tryAgain: 'Erneut versuchen',
		errorId: 'Referenz: {id}',
		copied: 'Kopiert!',
	},
};
