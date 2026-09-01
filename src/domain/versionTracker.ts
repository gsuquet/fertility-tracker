import { groupObservationsIntoCycles } from './cycleBoundaryDetector';
import { Observation } from '../types/crms';

export interface VersionRelease {
  version: string;
  date: string;
  title: string;
  titleFr?: string;
  tagline?: string;
  taglineFr?: string;
  highlights: string[];
  highlightsFr?: string[];
  crmsSpecVersion: string;
  breakingChanges?: boolean;
}

export interface VersionInfo {
  version: string;
  buildDate: string;
  crmsSpecVersion: string;
  appName: string;
  environment: string;
  repositoryUrl: string;
}

export interface StorageStats {
  itemCount: number;
  estimatedBytes: number;
  formattedSize: string;
  cyclesCount: number;
  observationsCount: number;
}

export const LAST_SEEN_VERSION_KEY = 'fertility_tracker_last_seen_version';
export const STORAGE_HAS_SEEN_WELCOME_KEY = 'fertility_tracker_has_seen_welcome';
export const STORAGE_OBSERVATIONS_KEY = 'fertility_care_observations';
export const CRMS_SPEC_VERSION = '1.1.0';

export const VERSION_HISTORY: VersionRelease[] = [
  {
    version: '1.9.1',
    date: '2026-09-01',
    title: 'Mobile Action Sheet Portal & Viewport Positioning Fix',
    titleFr: 'Correction du Positionnement et Rendu par Portail du Menu Mobile',
    tagline: 'Portaled mobile action sheet directly to document.body to prevent ancestor backdrop-filter displacement',
    taglineFr: 'Rendu du volet d\'actions mobile via un portail sur document.body pour éviter les décalages liés au backdrop-filter',
    crmsSpecVersion: '1.1.0',
    highlights: [
      'Rendered mobile action sheet via ReactDOM.createPortal directly into document.body',
      'Fixed viewport clipping and stacking context offset caused by ancestor header CSS backdrop-filter',
      'Added explicit full-viewport overlay bounds and touch scroll containment for mobile action sheet',
    ],
    highlightsFr: [
      'Rendu du volet d\'actions mobile via ReactDOM.createPortal directement dans document.body',
      'Correction du décalage d\'affichage causé par le backdrop-filter CSS de l\'en-tête parent',
      'Ajout des limites de vue complètes et confinement du défilement tactile sur le volet mobile',
    ],
  },
  {
    version: '1.9.0',
    date: '2026-09-01',
    title: 'Mobile Navigation Streamlining & Bottom-Sheet Popups',
    titleFr: 'Simplification de l\'En-tête Mobile & Modales en Volet Inférieur',
    tagline: 'Consolidated mobile header into a sleek More menu and transformed all dialogs into responsive native bottom sheets',
    taglineFr: 'Regroupement des actions de l\'en-tête mobile dans un menu Plus et conversion des modales en volets inférieurs adaptés',
    crmsSpecVersion: '1.1.0',
    highlights: [
      'Streamlined mobile top navigation to Logo, Cycle Picker, and a consolidated More Actions button (⋮)',
      'Added sleek mobile Action Sheet bottom drawer for Export, Welcome Guide, Version info, Language, and Theme toggles',
      'Transformed all popups (ExportModal, WelcomeModal, VersionModal, CycleStartModal) into mobile-friendly bottom sheets with clamped 88dvh height, sticky headers/footers, and independent scrollable bodies',
      'Full safe-area inset compatibility for mobile browsers and touch devices',
    ],
    highlightsFr: [
      'Simplification de la barre supérieure mobile avec le logo, le sélecteur de cycle et un bouton Plus d\'actions unique (⋮)',
      'Ajout d\'un volet d\'actions mobile fluide pour l\'export, le guide d\'accueil, les infos de version, la langue et le thème',
      'Conversion de toutes les modales (Export, Bienvenue, Version, Nouveau cycle) en volets inférieurs limités à 88dvh avec défilement interne et barres figées',
      'Prise en charge intégrale des zones sécurisées (safe-area insets) pour mobiles',
    ],
  },
  {
    version: '1.8.2',
    date: '2026-09-01',
    title: 'Dark Mode UI Theming & Button Primitives Polish',
    titleFr: 'Polissage du Thème Sombre & Primitives de Boutons',
    tagline: 'Fixed dark mode styling for detailed selectors toggle, PDF export configuration card, and modal action buttons',
    taglineFr: 'Correction du style en mode sombre pour le bouton des sélecteurs détaillés, la configuration d\'export PDF et les boutons de modales',
    crmsSpecVersion: '1.1.0',
    highlights: [
      'Defined robust .btn-outline, .btn-ghost, .btn-sm, and .btn-lg button primitives using design tokens',
      'Replaced undefined color variables in PDF configurator with theme-adaptive design tokens (--bg-surface, --bg-primary, --text-primary)',
      'Ensured full dark mode compatibility across tour navigation and form toggles',
    ],
    highlightsFr: [
      'Définition des primitives de bouton .btn-outline, .btn-ghost, .btn-sm et .btn-lg avec les jetons de design',
      'Remplacement des variables non définies de l\'export PDF par les jetons adaptatifs (--bg-surface, --bg-primary, --text-primary)',
      'Garantie d\'une compatibilité totale en mode sombre pour les boutons de navigation du guide et les sélecteurs',
    ],
  },
  {
    version: '1.8.1',
    date: '2026-09-01',
    title: 'Mobile Header Brand Text Collapse Optimization',
    titleFr: 'Optimisation du Masquage du Titre dans l\'En-tête Mobile',
    tagline: 'Collapsed brand text on mobile viewports so only the logo is displayed, preventing header bar overflow',
    taglineFr: 'Masquage du texte de la marque sur mobile pour n\'afficher que le logo, évitant le débordement de l\'en-tête',
    crmsSpecVersion: '1.1.0',
    highlights: [
      'Collapsed brand text (.brand-text) on mobile screens (<= 640px) to keep only the logo icon visible',
      'Eliminated header control crowding and improved cycle picker layout on compact touch displays',
    ],
    highlightsFr: [
      'Masquage du texte de marque (.brand-text) sur les écrans mobiles (<= 640px) pour ne conserver que le logo',
      'Suppression des chevauchements d\'en-tête et amélioration de la disposition du sélecteur de cycle sur mobile',
    ],
  },
  {
    version: '1.8.0',
    date: '2026-08-31',
    title: 'Layered CSS Design System Architecture & Maintainability',
    titleFr: 'Architecture CSS Modulaire & Système de Design en Couches',
    tagline: 'Modularized monolithic styling with native CSS @layer, formalized design tokens, and domain stylesheets (ADR 0002)',
    taglineFr: 'Modularisation des styles avec CSS @layer natif, jetons de design formalisés et feuilles de style dédiées (ADR 0002)',
    crmsSpecVersion: '1.1.0',
    highlights: [
      'Architected modular layered CSS with @layer tokens, base, primitives, views, utilities (ADR 0002)',
      'Extracted styles into dedicated token, primitive, and view modules (tokens, spacing, buttons, badges, chart, calendar, today, analytics, modals, print)',
      'Formalized semantic spacing and z-index design token scales while retaining 100% selector stability',
      'Enhanced empty chart row state to seamlessly highlight current day with today pill badge',
    ],
    highlightsFr: [
      'Architecture CSS modulaire avec @layer tokens, base, primitives, views, utilities (ADR 0002)',
      'Extraction des styles en modules dédiés (jetons, espacements, boutons, badges, graphique, calendrier, aujourd\'hui, analyses, modales, impression)',
      'Formalisation des échelles de jetons d\'espacement et de z-index avec une compatibilité totale des sélecteurs',
      'Amélioration de l\'état vide du graphique pour mettre en valeur le jour actuel avec le badge Aujourd\'hui',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-08-06',
    title: 'Mucus & Frequency Code Formatting Streamlining',
    titleFr: 'Formatage Épuré des Codes Glaire & Fréquence',
    tagline: 'Removed whitespace between mucus stretch/modifier and frequency in both code formatting and parsing (e.g. 10KLX3, 0AD)',
    taglineFr: 'Suppression des espaces entre la glaire et la fréquence dans le formatage et l\'analyse des codes (ex. 10KLX3, 0AD)',
    crmsSpecVersion: '1.1.0',
    highlights: [
      'Removed whitespace between mucus stretch/modifiers and frequency code (e.g. 10KLX3, 0AD, 2WX2)',
      'Enhanced soft parser to parse freeform text input with or without whitespace between mucus and frequency',
      'Updated placeholders, onboarding documentation, and automated tests across the application',
    ],
    highlightsFr: [
      'Suppression de l\'espace entre la glaire (étirement/qualité) et le code de fréquence (ex. 10KLX3, 0AD, 2WX2)',
      'Amélioration de l\'analyseur direct pour traiter les saisis avec ou sans espace entre glaire et fréquence',
      'Mise à jour des exemples, de la documentation d\'accueil et des tests automatisés',
    ],
  },
  {
    version: '1.6.1',
    date: '2026-08-05',
    title: 'Centered Modal Overlay & Viewport Elevation Polish',
    titleFr: 'Centrage de la Modale de Confirmation & Superposition Visuelle',
    tagline: 'Centered modal layout overlaying top of page with elevated z-index for optimal visibility across all screen sizes',
    taglineFr: 'Affichage centré de la modale superposée avec z-index élevé pour une visibilité optimale sur tous les écrans',
    crmsSpecVersion: '1.0.0',
    highlights: [
      'Centered CycleStartModal in exact screen middle with elevated z-index overlay',
      'Prevented mobile bottom sheet repositioning for Cycle Start prompt modal',
    ],
    highlightsFr: [
      'Centrage de la modale CycleStartModal au milieu de l\'écran avec un z-index élevé',
      'Maintien du centrage sur mobile pour la modale de confirmation de début de cycle',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-08-05',
    title: 'First Bleeding Day Cycle Start Confirmation & Drawer Controls',
    titleFr: 'Confirmation de début de cycle sur premier jour de saignement',
    tagline: 'Interactive prompt and Observation Drawer toggle to designate whether the first bleeding day of a series marks a new cycle boundary',
    taglineFr: 'Invitation interactive et commutateur dans le tiroir pour désigner si le premier jour de saignement marque un nouveau cycle',
    crmsSpecVersion: '1.0.0',
    highlights: [
      'Added interactive Cycle Start modal prompting when logging the first bleeding day of a series',
      'Added explicit "Start of New Cycle" toggle switch in the Observation Drawer when bleeding is active',
      'Updated cycle boundary detector engine to respect explicit isCycleStart overrides on observations',
      'Updated unit test suite covering cycle boundary detector and version tracker',
    ],
    highlightsFr: [
      'Ajout d\'une modale interactive de confirmation du début de cycle lors de la saisie du premier jour de saignement',
      'Ajout d\'un commutateur "Début de nouveau cycle" dans le tiroir d\'observation lorsque des saignements sont sélectionnés',
      'Mise à jour du moteur de détection des limites de cycle pour respecter les choix utilisateur explicites',
      'Mise à jour des tests automatisés couvrant les limites de cycle et le gestionnaire de version',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-08-05',
    title: 'Current Day Visual Highlighting & View Focus Suite',
    titleFr: 'Mise en Valeur du Jour Actuel & Focalisation Visuelle',
    tagline: 'Distinct current day visual styling across Calendar and Chart views with glowing accent borders, circular date badges, today headers, and screen reader accessibility',
    taglineFr: 'Mise en valeur visuelle du jour actuel sur le calendrier et le graphique avec bordures lumineuses, timbres circulaires et compatibilité lecteurs d\'écran',
    crmsSpecVersion: '1.0.0',
    highlights: [
      'Added distinct accent border ring, background tint, and circular date badge highlighting today in Calendar Grid view',
      'Added glowing accent border and "TODAY" pill badge on active cycle columns in Chart / Paper Grid view',
      'Integrated screen reader accessibility with aria-current="date" attributes on current day elements',
      'Updated automated test suite covering current day visual indicators and accessibility attributes',
    ],
    highlightsFr: [
      'Ajout d\'une bordure d\'accentuation, d\'une nuance de fond et d\'un badge circulaire pour le jour actuel dans le Calendrier',
      'Ajout d\'une bordure lumineuse et d\'un badge "TODAY" dans l\'en-tête de colonne de la vue Graphique',
      'Prise en charge des lecteurs d\'écran avec l\'attribut aria-current="date" sur les éléments du jour actuel',
      'Mise à jour des tests automatisés couvrant les indicateurs du jour actuel et l\'accessibilité',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-07-31',
    title: 'Mobile Navigation & Clean Export Utilities Suite',
    titleFr: 'Optimisation Layout Mobile & Suite Noms d\'Exportation',
    tagline: 'Mobile top stats removal on graph & calendar, 5-day aligned history items, streamlined version history accordion, and standardized lowercase dash-separated export filenames',
    taglineFr: 'Masquage des stats mobiles sur graphique et calendrier, alignement de l\'historique 5 jours, accordéon de version épuré et noms d\'exportation en minuscules avec tirets',
    crmsSpecVersion: '1.0.0',
    highlights: [
      'Removed top stats header cards on mobile for Graph, Calendar, and Today views to increase charting area while retaining them on Analytics view',
      'Refactored Recent 5-Day Observation History card with aligned 3-column layout: fixed date column, aligned stamp badge slot, and single-line code text',
      'Streamlined past version history accordion headers by displaying version badge and date only, placing title inside the expanded section body',
      'Redesigned GitHub open-source repository link in System Information tab with a GitHub icon and responsive mobile layout',
      'Standardized all JSON backup and PDF export file names to strictly lowercase dash-separated strings (e.g. fertility-tracker-data-backup-YYYY-MM-DD.json)',
    ],
    highlightsFr: [
      'Masquage des cartes statistiques supérieures sur mobile pour les vues Graphique, Calendrier et Aujourd\'hui pour maximiser l\'espace',
      'Réorganisation de l\'historique des 5 derniers jours avec alignement en 3 colonnes : date fixe, emplacement de timbre aligné et code sur une seule ligne',
      'Épuration de l\'accordéon d\'historique des versions en déplaçant le titre dans la section dépliée pour éviter les retours à la ligne',
      'Nouveau design du lien du dépôt GitHub dans l\'onglet Informations Système avec icône GitHub adaptative sur mobile',
      'Normalisation de tous les noms de fichiers d\'exportation JSON et PDF en minuscules avec tirets',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-07-31',
    title: 'PDF Export Enhancement & Symptom Refinement',
    titleFr: 'Optimisation Export PDF & Séparation des Symptômes',
    tagline: 'Compact PDF chart export grid with 2-line observation code wrapping, dedicated free-form notes row, auto-close modal flow, and symptom code formatting',
    taglineFr: 'Grille PDF compacte avec repli du code sur 2 lignes, ligne de notes libres en-dessous, fermeture automatique du modal et séparation des symptômes',
    crmsSpecVersion: '1.0.0',
    highlights: [
      'Removed day of week display from printable PDF chart export cells to maximize horizontal space',
      'Compact observation code rendering with space removal and automatic 2-line text wrapping for long codes',
      'Added dedicated free-form notes line at the bottom of each chart cell in PDF export view',
      'Seamless PDF export user flow with automatic modal close and real-time success toast notification',
      'Separated symptom codes (AP, RAP, LAP) from primary codeString to eliminate duplicate display and ensure strict placement in symptom badges',
      'Full English and French localization for PDF export success feedback and version release notes',
    ],
    highlightsFr: [
      'Supprimé l\'affichage du jour de la semaine dans l\'exportation PDF pour maximiser l\'espace disponible',
      'Rendu compact des codes d\'observation avec suppression des espaces et repli automatique sur 2 lignes',
      'Ajouté une ligne dédiée pour les notes libres en bas de chaque cellule de graphique dans la vue PDF',
      'Flux d\'exportation PDF optimisé avec fermeture automatique du modal et notification de succès',
      'Séparation des codes de symptômes (AP, RAP, LAP) de la chaîne de code principale pour supprimer les doublons',
      'Traduction intégrale en anglais et en français des notifications et des notes de version',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-07-30',
    title: 'Welcome Screen & New User Onboarding Guide',
    titleFr: 'Écran de Bienvenue & Guide de Démarrage',
    tagline: 'Multi-step interactive onboarding, CrMS biomarker education, dual-mode logging guide, demo data loader, and persistent first-visit tracking',
    taglineFr: 'Guide d\'accueil interactif, tutoriel biomarqueurs CrMS, guidage de saisie double-mode et données démo en un clic',
    crmsSpecVersion: '1.0.0',
    highlights: [
      'Added interactive multi-step Welcome Screen & Onboarding Guide modal for new users',
      'Comprehensive Creighton Model System (CrMS) biomarker & stamp color educational guide',
      'Interactive dual-mode charting walkthrough explaining Direct Code vs. Detailed Selectors',
      'Symmetrical card layout, justified text alignment, and fixed-column stamp icon formatting',
      'Interactive Version History accordion with expandable release notes and separated version/date badges',
      'Mobile bottom navigation localization fix using concise mobile tab labels (e.g. Graphique, Calendrier)',
      'One-click Demo Data loader on final onboarding slide to populate sample cycle observations instantly',
      'Persistent first-visit detection with auto-popup and quick-access Help buttons in Header & Footer',
      'Full English and French localization across all onboarding slides and system modals',
    ],
    highlightsFr: [
      'Ajout du modal d\'accueil interactif en 4 étapes pour guider les nouvelles utilisatrices',
      'Guide pédagogique complet des biomarqueurs et timbres de couleur du Modèle Creighton (CrMS)',
      'Présentation interactive du mode Saisie Directe par code et des Sélecteurs Détaillés',
      'Mise en page symétrique des cartes, texte justifié et alignement fixe de la colonne des timbres',
      'Accordéon interactif pour l\'historique des versions avec badges de version et dates séparés',
      'Correction de la barre de navigation mobile utilisant les traductions courtes (ex. Graphique, Calendrier)',
      'Bouton de chargement de données démo en un clic pour explorer immédiatement toutes les vues',
      'Détection automatique de première visite et boutons d\'aide dédiés dans le Header et le Footer',
      'Traduction intégrale en anglais et en français sur tous les écrans du guide et modals système',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-07-30',
    title: 'Version Tracker & Application UX Performance Suite',
    titleFr: 'Suivi des Versions & Suite de Performance UX',
    tagline: 'Built-in Version Tracker, UX performance enhancements, and mobile top bar scaling',
    taglineFr: 'Système de suivi des versions intégré, optimisations de rendu et barre supérieure mobile adaptative',
    crmsSpecVersion: '1.0.0',
    highlights: [
      'Added interactive Version Tracker & System Diagnostics modal accessible from header & footer',
      'UX performance optimizations for high-speed chart rendering and instant view transitions',
      'Responsive mobile top bar layout with adaptive brand logo scaling and tight button spacing',
      'Enhanced surface token color contrast across dark and light UI design modes',
      'Live storage footprint diagnostics tracking logged observations and active cycles',
    ],
    highlightsFr: [
      'Ajout du modal interactif À propos, Suivi des versions et Diagnostics système',
      'Optimisations des performances de rendu pour des transitions de vue instantanées',
      'Disposition adaptative de la barre de navigation mobile selon la taille d\'écran',
      'Amélioration du contraste des couleurs sur les thèmes clair et sombre',
      'Diagnostics de l\'empreinte mémoire locale avec comptage des cycles et observations',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-29',
    title: 'Creighton Model System Core Engine & Multi-View Suite',
    titleFr: 'Moteur Mère Modèle Creighton & Vues Multiples',
    tagline: 'Initial official release of Fertility Tracker',
    taglineFr: 'Version initiale officielle de Fertility Tracker',
    crmsSpecVersion: '1.0.0',
    highlights: [
      'Standardized Creighton Model System (CrMS) biomarker parser and stamp calculator',
      'Automatic Peak Day (P) detection and post-peak transition counting (P+1, P+2, P+3)',
      'Paper Chart Strip view, Monthly Calendar Grid, Today Observation view, and Cycle Analytics',
      'Practitioner PDF export, high-resolution PNG chart rendering, and JSON data backup/restore',
      'Bilingual support (English and French) with light and dark mode design themes',
      'Privacy-first architecture with 100% local client-side data storage',
    ],
    highlightsFr: [
      'Analyseur de biomarqueurs et calcul des timbres conforme aux règles CrMS',
      'Détection automatique du Jour Sommet (P) et décompte des jours post-sommet (P+1, P+2, P+3)',
      'Graphique Papier 35 jours, Calendrier Mensuel, Tableau de bord Aujourd\'hui et Analyses',
      'Export PDF praticien, rendu PNG haute définition et sauvegarde/restauration JSON',
      'Prise en charge bilingue français/anglais et thèmes clair et sombre',
      'Architecture 100% locale sans aucun serveur ni suivi tiers',
    ],
  },
];

export function getAppVersion(): string {
  if (typeof __APP_VERSION__ !== 'undefined') {
    return __APP_VERSION__;
  }
  return '1.9.1';
}

export function getBuildDate(): string {
  if (typeof __BUILD_DATE__ !== 'undefined') {
    return __BUILD_DATE__;
  }
  return '2026-09-01T00:00:00.000Z';
}

export function getVersionInfo(): VersionInfo {
  return {
    version: getAppVersion(),
    buildDate: getBuildDate(),
    crmsSpecVersion: CRMS_SPEC_VERSION,
    appName: 'Fertility Tracker',
    environment: import.meta.env?.MODE || 'production',
    repositoryUrl: 'https://github.com/gsuquet/fertility-tracker',
  };
}

export function getVersionHistory(): VersionRelease[] {
  return VERSION_HISTORY;
}

export function getLatestRelease(): VersionRelease {
  return VERSION_HISTORY[0];
}

export function checkAndRecordVersionSeen(): { isNewVersion: boolean; previousVersion: string | null } {
  try {
    const currentVersion = getAppVersion();
    const lastSeen = localStorage.getItem(LAST_SEEN_VERSION_KEY);
    const isNewVersion = !lastSeen || lastSeen !== currentVersion;

    if (isNewVersion) {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);
    }

    return {
      isNewVersion,
      previousVersion: lastSeen,
    };
  } catch {
    return {
      isNewVersion: false,
      previousVersion: null,
    };
  }
}

export function getStorageStats(): StorageStats {
  let itemCount = 0;
  let totalBytes = 0;
  let cyclesCount = 0;
  let observationsCount = 0;

  try {
    if (typeof localStorage !== 'undefined') {
      const knownKeys = [
        STORAGE_OBSERVATIONS_KEY,
        LAST_SEEN_VERSION_KEY,
        STORAGE_HAS_SEEN_WELCOME_KEY,
        'fertility_care_lang',
        'fertility_care_theme',
      ];
      const keysSet = new Set<string>(knownKeys);
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) keysSet.add(k);
        }
        for (const k of Object.keys(localStorage)) {
          if (typeof (localStorage as unknown as Record<string, unknown>)[k] === 'string') {
            keysSet.add(k);
          }
        }
      } catch {
        // ignore
      }

      for (const key of keysSet) {
        const val = localStorage.getItem(key);
        if (val !== null) {
          itemCount++;
          totalBytes += key.length + val.length;
        }
      }

      const storedObs = localStorage.getItem(STORAGE_OBSERVATIONS_KEY);
      if (storedObs) {
        const parsed = JSON.parse(storedObs);
        if (Array.isArray(parsed)) {
          observationsCount = parsed.length;
          const cycles = groupObservationsIntoCycles(parsed as Observation[]);
          cyclesCount = cycles.length;
        }
      }
    }
  } catch {
    // Graceful fallback if localStorage is unavailable
  }

  let formattedSize = `${totalBytes} B`;
  if (totalBytes > 1024 * 1024) {
    formattedSize = `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (totalBytes > 1024) {
    formattedSize = `${(totalBytes / 1024).toFixed(2)} KB`;
  }

  return {
    itemCount,
    estimatedBytes: totalBytes,
    formattedSize,
    cyclesCount,
    observationsCount,
  };
}
