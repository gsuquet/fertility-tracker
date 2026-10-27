import type { TranslationSchema } from '../types';

export const fr: TranslationSchema = {
  appTitle: 'Fertility Tracker',
  subtitle: 'Modèle Creighton (CrMS)',
  locale: 'fr-FR',
  tabs: {
    today: "Aujourd'hui",
    chart: 'Graphique Papier',
    calendar: 'Calendrier Mensuel',
    analytics: 'Analyses du Cycle',
  },
  mobileTabs: {
    today: "Aujourd'hui",
    chart: 'Graphique',
    calendar: 'Calendrier',
    log: 'Saisie',
    analytics: 'Analyses',
  },
  todayView: {
    guidance: {
      red: 'Phase de règles. Considérez les jours de saignement comme potentiellement fertiles.',
      whiteBaby:
        'Glaire fertile (Symbole Bébé). Journée fertile. Suivez vos objectifs de fertilité.',
      postPeak: "Compte Post-Sommet (+1, +2, +3). Fenêtre d'hyper-fertilité post-ovulatoire.",
      dry: "Journée sèche / infertile. Continuez l'observation quotidienne.",
    },
    title: 'Observation du jour',
    subtitle: 'Saisissez, consultez et suivez votre observation quotidienne du Modèle Creighton',
    todayLabel: "Aujourd'hui",
    loggedStatus: 'Observation enregistrée pour cette date',
    notLoggedStatus: 'Aucune observation saisie pour cette date',
    fertilityStatus: 'Statut de fertilité & Conseils',
    recentHistory: 'Historique des 5 derniers jours',
    prevDay: 'Jour précédent',
    nextDay: 'Jour suivant',
    goToToday: "Aller à aujourd'hui",
    savedNotice: 'Observation enregistrée avec succès !',
    deletedNotice: 'Observation supprimée.',
    noEntryShort: 'Non saisie',
    entryMode: 'Mode de Saisie',
    modeDirect: 'Code Direct Seul',
    modeDetailed: 'Formulaire Détaillé',
    showDetailed: 'Afficher les Sélecteurs Détaillés',
    hideDetailed: 'Masquer les Sélecteurs Détaillés',
  },
  menu: {
    title: 'Menu & Options',
    exportHint: 'Imprimer ou exporter en PDF / JSON',
    guideHint: 'Tutoriel et guide des biomarqueurs',
    versionHint: 'Notes de version & stockage local',
    languageToggle: 'Langue : Français',
    themeDark: 'Thème : Sombre',
    themeLight: 'Thème : Clair',
  },
  actions: {
    newEntry: 'Saisir une observation',
    exportPdf: 'Export Praticien PDF / PNG',
    exportJson: 'Sauvegarder (JSON)',
    importJson: 'Restaurer (JSON)',
    clearData: 'Réinitialiser',
    loadDemo: 'Charger Cycle Démo',
    save: 'Enregistrer',
    cancel: 'Annuler',
    close: 'Fermer',
    delete: 'Supprimer',
    setPeak: 'Définir le Jour Sommet (P)',
    removePeak: 'Retirer le Jour Sommet (P)',
  },
  labels: {
    date: 'Date',
    cycleDay: 'Jour du Cycle',
    bleeding: 'Flux Saignement',
    stretch: 'Viscosité / Étirement du Mucus',
    modifiers: 'Apparence / Caractéristiques',
    frequency: 'Fréquence',
    symptoms: 'Symptômes Contextuels',
    intercourse: 'Rapports Sexuels (I)',
    notes: 'Notes / Remarques',
    directInput: 'Saisie Directe de Code',
    directInputPlaceholder: 'ex: 10KLX3 I AP',
    stampPreview: 'Aperçu du Timbre',
    peakDay: 'Jour Sommet (P)',
    postPeakCount: 'Compte Post-Sommet',
  },
  codes: {
    bleeding: {
      H: 'H - Flux abondant',
      M: 'M - Flux modéré',
      L: 'L - Flux léger',
      VL: 'VL - Flux vraiment léger',
      B: 'B - Saignement brun / noir',
    },
    stretch: {
      '0': '0 - Sec',
      '2': '2 - Humide sans lubrification',
      '2W': '2W - Mouillé sans lubrification',
      '4': '4 - Brillant sans lubrification',
      '6': '6 - Peu élastique (0.5cm)',
      '8': '8 - Moyennement élastique (1-2cm)',
      '10': '10 - Très élastique (2.5cm+)',
      '10DL': '10DL - Humide avec lubrification',
      '10SL': '10SL - Brillant avec lubrification',
      '10WL': '10WL - Mouillé avec lubrification',
    },
    modifiers: {
      B: 'B - Saignement brun',
      C: 'C - Opaque / blanc',
      'C/K': 'C/K - Opaque / transparent',
      G: 'G - Gommeux / collant',
      K: 'K - Transparent',
      L: 'L - Lubrifiant',
      P: 'P - Pâteux / crémeux',
      Y: 'Y - Jaune',
    },
    frequency: {
      X1: 'X1 - 1 fois',
      X2: 'X2 - 2 fois',
      X3: 'X3 - 3 fois',
      AD: 'AD - Toute la journée (4+ fois)',
    },
    symptoms: {
      AP: 'AP - Douleur abdominale',
      RAP: 'RAP - Douleur abdominale droite',
      LAP: 'LAP - Douleur abdominale gauche',
    },
    intercourse: {
      I: 'I - Rapports sexuels',
    },
  },
  stats: {
    cycleLength: 'Longueur du Cycle',
    peakDay: 'Jour Sommet Estime (P)',
    lutealPhase: 'Phase Lutéale',
    mucusDays: 'Jours de Glaire Fertile',
    intercourseCount: 'Fréquence des Rapports',
    days: 'jours',
  },
  analytics: {
    phasesTitle: 'Répartition des Phases du Cycle',
    mensesPhase: 'Phase de Règles',
    follicularPhase: 'Phase Folliculaire (jusqu au Sommet P)',
    lutealPhase: 'Phase Lutéale (Post-Sommet P)',
    distributionTitle: 'Distribution des Timbres et Glaire',
    trendTitle: 'Tendance du Score de Glaire Creighton (0 à 10)',
    clinicalTitle: 'Résumé Clinique Praticien (CrMS / NaPro)',
    mcsGuideTitle: 'Qu est-ce que le Score de Glaire Creighton (MCS) ?',
    mcsGuideText:
      'Le Score de Glaire (MCS) est une métrique clinique développée par le Dr Thomas Hilgers (Institut Pape Paul VI). Il évalue la qualité de la glaire cervicale de 0 à 10 (Sec=0, Humide=2, Élastique=6..8, Très Élastique/Transparent/Lubrifiant=10). Les médecins NaPro recommandent un score >= 9.0 pour une fertilité optimale.',
    avgMucusScore: 'Score Moyen de Glaire',
    lutealHealth: 'Santé de la Phase Lutéale',
    normalLuteal: 'Normale (9-17 jours)',
    abnormalLuteal: 'Phase lutéale courte/allongée',
    inProgress: 'en cours',
    pendingPeak: 'Jour Sommet en attente',
  },
  chartStrip: {
    fullGrid: 'Grille Papier 35 Jours',
    compactGrid: 'Bande Compacte',
    showLegend: 'Légende des Timbres',
    hideLegend: 'Masquer la Légende',
    jumpToPeak: 'Jour Sommet (P)',
    jumpToLatest: 'Dernier Jour',
    jumpToStart: 'Jour 1',
    phaseMenses: 'Règles',
    phaseFollicular: 'Pré-Sommet (Glaire)',
    phasePeak: 'Jour Sommet (P)',
    phasePostPeak: 'Compte Post-Sommet',
    phaseLuteal: 'Post-Sommet Infertile',
    addDay: 'Ajouter une observation',
    notesTooltip: 'Contient des notes',
    noPeak: 'Pas de jour sommet défini',
    cycleBadge: 'Cycle',
  },
  exportModal: {
    title: 'Export Praticien & Sauvegarde',
    description:
      'Exportez votre graphique Creighton en PDF ou PNG pour votre instructeur FertilityCare ou médecin NaPro.',
    printPdf: 'Imprimer / Sauvegarder en PDF',
    downloadPng: 'Télécharger en PNG',
    pdfExportMode: "Périmètre d'exportation PDF",
    singleCycle: 'Cycle unique',
    multipleCycles: 'Plusieurs cycles',
    selectCycle: 'Sélectionner le cycle',
    selectCycles: 'Sélectionner les cycles à exporter',
    selectAll: 'Tout sélectionner',
    deselectAll: 'Tout désélectionner',
    oldestToNewestNote:
      'Exporté en mode paysage (grille de 35 jours) du plus ancien au plus récent.',
    exportSuccess: 'Rapport PDF généré avec succès !',
    pdfDescription: 'Crée un PDF en mode paysage avec une grille de 35 jours.',
    jsonDescription:
      "Téléchargez toutes vos observations dans un fichier JSON. Le fichier n'est pas chiffré : gardez-le privé.",
    importError:
      "Ce fichier n'est pas une sauvegarde valide. Sélectionnez un fichier de sauvegarde JSON de Fertility Tracker.",
  },
  confirmDialog: {
    demoTitle: 'Remplacer vos données par la démo ?',
    demoMessage: 'Les cycles de démo remplacent les {count} observations de ce navigateur.',
    demoConfirm: 'Charger la démo',
    importTitle: 'Restaurer cette sauvegarde ?',
    importSummary: 'Le fichier contient {count} observations, du {first} au {last}.',
    importEmpty: 'Le fichier ne contient aucune observation.',
    importChoice:
      'Vous avez {count} observations. Remplacer les supprime et garde seulement le fichier. Fusionner les garde, et le fichier remplace les jours de même date.',
    importReplace: 'Remplacer',
    importMerge: 'Fusionner',
    clearTitle: 'Supprimer toutes les données du graphique ?',
    clearMessage:
      "Cette action supprime les {count} observations de ce navigateur. Une copie reste sur cet appareil jusqu'à ce que vous cliquiez sur Supprimer la copie dans le message d'annulation.",
    clearConfirm: 'Tout supprimer',
    recoveryTitle: 'Supprimer les données illisibles ?',
    recoveryMessage:
      "L'application ne garde aucune autre copie de ces données. Téléchargez-les d'abord si vous voulez les garder.",
    recoveryConfirm: 'Supprimer la copie',
  },
  undoToast: {
    demo: 'Les données de démo ont remplacé vos observations.',
    import: 'La sauvegarde a remplacé vos observations.',
    merge: 'La sauvegarde est fusionnée avec vos observations.',
    clear: 'Toutes les observations sont supprimées.',
    earlier: "L'application garde une copie de vos observations d'avant la dernière modification.",
    undo: 'Annuler la modification',
    dismiss: 'Supprimer la copie',
    notSaved:
      "Le navigateur n'a pas pu enregistrer la copie. L'annulation fonctionne seulement jusqu'au rechargement de la page.",
  },
  storageRecovery: {
    message:
      "Les observations enregistrées n'ont pas pu être lues. L'application garde une copie des données d'origine. Téléchargez la copie avant de la supprimer.",
    download: 'Télécharger les données illisibles',
    dismiss: 'Supprimer la copie',
    messageNoCopy:
      "Les observations enregistrées n'ont pas pu être lues, et l'application n'a pas pu en garder une copie. Téléchargez les données d'origine maintenant. Votre prochaine modification les remplace.",
    close: 'Fermer',
    messagePartial:
      "{count} enregistrements sauvegardés n'ont pas pu être lus. L'application affiche les autres observations et garde une copie des données d'origine. Téléchargez la copie avant de la supprimer.",
    messagePartialNoCopy:
      "{count} enregistrements sauvegardés n'ont pas pu être lus, et l'application n'a pas pu en garder une copie. L'application affiche les autres observations. Téléchargez les données d'origine maintenant. Votre prochaine modification les remplace.",
    messagePartialOne:
      "1 enregistrement sauvegardé n'a pas pu être lu. L'application affiche les autres observations et garde une copie des données d'origine. Téléchargez la copie avant de la supprimer.",
    messagePartialNoCopyOne:
      "1 enregistrement sauvegardé n'a pas pu être lu, et l'application n'a pas pu en garder une copie. L'application affiche les autres observations. Téléchargez les données d'origine maintenant. Votre prochaine modification les remplace.",
  },
  storageWarning: {
    saveFailed:
      "Le navigateur n'a pas pu enregistrer vos observations. Vos modifications sont conservées seulement jusqu'à la fermeture ou au rechargement de la page. Sauvegardez vos données maintenant.",
    backUpNow: 'Sauvegarder maintenant',
  },
  backupReminder: {
    message:
      'Votre dernière sauvegarde date de plus de {days} jours. Téléchargez une sauvegarde pour garder une copie de vos observations.',
    messageNever:
      "Vous n'avez aucune sauvegarde de vos observations. Téléchargez une sauvegarde pour en garder une copie.",
    backUpNow: 'Sauvegarder maintenant',
    later: 'Plus tard',
  },
  disclaimer: {
    trademark:
      "FertilityCare™ et le système Creighton Model FertilityCare™ (CrMS) sont des marques déposées de l'Institut Saint Paul VI pour l'étude de la reproduction humaine.",
    nonAffiliation:
      "Fertility Tracker est un projet logiciel indépendant et open-source. Il n'est pas affilié, approuvé, certifié ou sponsorisé par l'Institut Saint Paul VI, FertilityCare™ Centers of America (FCCA) ou FertilityCare™ Centers International (FCCI).",
    medical:
      "Ce logiciel est destiné uniquement au suivi personnel, à l'archivage et à des fins éducatives. Il ne constitue pas un avis, un diagnostic ou un traitement médical. Consultez toujours un instructeur certifié FertilityCare ou un consultant médical pour des conseils cliniques.",
  },
  versionTracker: {
    title: 'À propos & Suivi des Versions',
    appVersion: "Version de l'application",
    crmsSpec: 'Spécification CrMS',
    buildDate: 'Date de build',
    tabReleaseNotes: 'Notes de version',
    tabSystemInfo: 'Informations système',
    tabStorage: 'Stockage & Diagnostics',
    latestRelease: 'Dernière version',
    releaseHistory: 'Historique des versions',
    keyHighlights: 'Fonctionnalités & Améliorations clés',
    environment: 'Environnement',
    repository: 'Dépôt GitHub',
    storageUsage: 'Empreinte du stockage local',
    totalItems: 'Clés de stockage totales',
    cyclesTracked: 'Cycles suivis',
    observationsRecorded: 'Observations enregistrées',
    close: 'Fermer',
    whatsNew: 'Nouveautés dans la v',
  },
  welcomeModal: {
    title: 'Bienvenue dans Fertility Tracker',
    subtitle: 'Guide & Démarrage du Modèle Creighton (CrMS)',
    stepCount: 'Étape {current} sur {total}',
    skip: 'Passer la visite',
    previous: 'Précédent',
    next: 'Suivant',
    getStarted: 'Démarrer à zéro',
    loadDemoData: 'Explorer le Cycle Démo',
    dontShowAgain: 'Ne plus afficher automatiquement',
    slides: {
      slide1: {
        tag: '1. Introduction',
        title: 'Graphique Clinique & Confidentialité Absolue',
        description:
          'Fertility Tracker est conçu autour du Modèle Creighton (CrMS)—une méthode scientifique et standardisée pour suivre les biomarqueurs naturels de fertilité.',
        privacyTitle: 'Confidentialité 100% Locale',
        privacyText:
          'Vos données de santé restent exclusivement enregistrées dans votre navigateur. Aucun compte, aucun serveur distant, aucun suivi tiers.',
        crmsTitle: 'Observation des Biomarqueurs',
        crmsText:
          "Contrairement aux outils de calcul statistique qui prédisent vos règles, le système CrMS s'appuie sur des observations physiques quotidiennes du mucus, des saignements et des sensations.",
      },
      slide2: {
        tag: '2. Biomarqueurs & Timbres',
        title: 'Comprendre les Timbres du Graphique',
        description: 'Chaque observation correspond aux timbres cliniques du papier graphique :',
        stamps: {
          red: {
            title: 'Timbre Rouge (Flux)',
            desc: 'Jours de saignements menstruels (H, M, L, VL, B).',
          },
          green: {
            title: 'Timbre Vert (Sec)',
            desc: 'Jours inféconds secs sans aucune observation de mucus.',
          },
          greenBaby: {
            title: 'Vert + Bébé (Mucus)',
            desc: 'Jours féconds présentant du mucus non-sommet.',
          },
          whiteBaby: {
            title: 'Blanc + Bébé (Sommet/Fécond)',
            desc: 'Jour Sommet (P) ou mucus filant, transparent ou lubrifiant.',
          },
          yellow: {
            title: 'Timbres Jaunes',
            desc: 'Profil de mucus continu / régime des timbres jaunes.',
          },
        },
        peakNoteTitle: 'Jour Sommet (P) & Décompte',
        peakNoteText:
          'Le dernier jour de mucus transparent, étirable ou lubrifiant est le Jour Sommet (P). Les jours de décompte (P+1, P+2, P+3) marquent la transition vers la période inféconde.',
      },
      slide3: {
        tag: '3. Saisie Quotidienne',
        title: 'Comment Saisir vos Observations',
        description:
          "Enregistrez votre observation quotidienne en quelques secondes via la vue Aujourd'hui ou le tiroir de saisie.",
        directTitle: 'Saisie Directe par Code',
        directText:
          'Les utilisatrices expérimentées peuvent saisir directement leur code CrMS (ex. 10KLX3 I AP).',
        detailedTitle: 'Sélecteurs Détaillés',
        detailedText:
          "Les nouvelles utilisatrices peuvent sélectionner pas à pas le flux, la viscosité, l'apparence, la fréquence et les symptômes avec aperçu instantané du timbre.",
        livePreviewTitle: 'Détection Automatique du Sommet',
        livePreviewText:
          'Le moteur CrMS met automatiquement à jour la couleur des timbres, le marqueur Sommet et le décompte post-sommet.',
      },
      slide4: {
        tag: '4. Vues & Démarrage Rapide',
        title: 'Explorez les Vues & Commencez',
        description:
          'Basculez facilement entre 4 vues spécialisées conçues pour le suivi quotidien, le rendu conforme au graphique papier et les consultations.',
        views: {
          today: "Tableau de bord Aujourd'hui : Saisie rapide et historique récent.",
          chart: 'Graphique Papier : Lignes de 35 jours identiques au graphique papier.',
          calendar: "Calendrier Mensuel : Vue d'ensemble de vos observations par mois.",
          analytics:
            'Analyses du Cycle : Métriques de durée de cycle, phase lutéale et score de mucus.',
        },
        quickStartTitle: 'Prête à commencer ?',
        quickStartDesc:
          'Chargez des données démo pour explorer toutes les vues du graphique, ou commencez avec un graphique vierge pour votre suivi personal.',
      },
    },
  },
  cycleStartModal: {
    title: 'Début de nouveau cycle ?',
    question: 'Ce jour de saignement est-il le début d’un nouveau cycle ?',
    description:
      'C’est le premier jour de saignement après des jours sans saignement. Vous pouvez choisir s’il commence un nouveau cycle ou poursuit votre cycle actuel.',
    yesBtn: 'Oui, démarrer un nouveau cycle',
    noBtn: 'Non, poursuivre le cycle actuel',
    cancelBtn: 'Annuler',
    isCycleStartLabel: 'Début de nouveau cycle',
    isCycleStartHelp: 'Désigne cette observation comme le jour 1 d’un nouveau cycle menstruel.',
  },
  errorBoundary: {
    title: 'Cette partie n’a pas pu se charger',
    message:
      'Une erreur s’est produite ou vous êtes hors ligne. Vos observations sont en sécurité dans ce navigateur. Rechargez la page pour réessayer.',
    reload: 'Recharger',
  },
};
