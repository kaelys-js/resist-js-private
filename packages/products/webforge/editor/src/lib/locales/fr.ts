import type { EditorLocaleRaw } from './schema';

export const fr: EditorLocaleRaw = {
	meta: {
		description: 'WebForge RPG — Suite de création de jeux HD-2D',
		applicationName: 'WebForge',
	},
	common: {
		settings: 'Paramètres',
		help: 'Aide',
		rename: 'Renommer',
		duplicate: 'Dupliquer',
		delete: 'Supprimer',
		cancel: 'Annuler',
		save: 'Enregistrer',
		close: 'Fermer',
		loading: 'Chargement…',
	},
	sidebar: {
		scenes: 'Scènes',
		newScene: 'Nouvelle scène',
		assets: 'Ressources',
		tilesets: 'Jeux de tuiles',
		sprites: 'Sprites',
		audio: 'Audio',
	},
	header: {
		editor: 'Éditeur',
		scene: 'Scène',
		error: 'Erreur',
		toggleSidebar: 'Basculer la barre latérale',
	},
	settings: {
		appearance: 'Apparence',
		theme: 'Thème',
		language: 'Langue',
		toggleTheme: 'Changer le thème',
		light: 'Clair',
		dark: 'Sombre',
		system: 'Système',
		themeDefault: 'Par défaut',
		themeMidnight: 'Minuit',
		themeWarm: 'Chaleureux',
		themeForest: 'Forêt',
		themeOcean: 'Océan',
		themeRose: 'Rose',
		themeLavender: 'Lavande',
		themeSunset: 'Crépuscule',
		themeSlate: 'Ardoise',
		themeCopper: 'Cuivre',
		themeAurora: 'Aurore',
		themeAmethyst: 'Améthyste',
	},
	project: {
		openProject: 'Ouvrir le projet',
		webforgeProject: 'Projet WebForge',
	},
	scenes: {
		rename: 'Renommer la scène',
		duplicate: 'Dupliquer la scène',
		delete: 'Supprimer la scène',
	},
	errors: {
		badRequest: 'Requête invalide',
		badRequestDescription:
			'Quelque chose dans cette requête ne semble pas correct. Vérifiez et réessayez.',
		notFound: 'Page introuvable',
		notFoundDescription:
			'Nous avons cherché partout, mais cette page semble avoir disparu. Elle a peut-être été déplacée ou supprimée.',
		forbidden: 'Accès refusé',
		forbiddenDescription:
			"Vous n'avez pas la permission d'accéder à cette page. Essayez de vous connecter avec un autre compte.",
		serverError: "Une erreur s'est produite",
		serverErrorDescription:
			"Oups\u00A0! Quelque chose s'est cassé de notre côté. Nous y travaillons — veuillez réessayer dans un instant.",
		genericTitle: 'Erreur',
		genericDescription: "Quelque chose d'inattendu s'est produit lors du chargement de cette page.",
		goHome: "Retour à l'accueil",
		tryAgain: 'Réessayer',
		errorId: 'Référence\u00A0: {id}',
		copied: 'Copié\u00A0!',
	},
};
