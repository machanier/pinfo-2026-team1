export const FACULTY_OPTIONS = [
  'Faculte des sciences',
  'Faculte de medecine',
  'Faculte des lettres',
  'Faculte des sciences de la societe (SdS)',
  "Faculte d'economie et de management (GSEM)",
  'Faculte de droit',
  'Faculte de theologie',
  "Faculte de psychologie et des sciences de l'education (FPSE)",
  "Faculte de traduction et d'interpretation (FTI)",
  'Global Studies Institute (GSI)',
  "Centre universitaire d'informatique (CUI)",
  "Institut des sciences de l'environnement (ISE)",
  'Institut universitaire de formation des enseignants (IUFE)',
]

export const PROGRAM_OPTIONS_BY_FACULTY = {
  'Faculte des sciences': [
    'Mathematiques',
    'Sciences informatiques',
    'Physique',
    'Chimie et Biochimie',
    'Biologie',
    "Sciences de la Terre et de l'environnement",
    'Sciences pharmaceutiques',
  ],
  'Faculte de medecine': [
    'Medecine humaine',
    'Medecine dentaire',
    'Sciences du mouvement et du sport (Education physique)',
  ],
  "Faculte d'economie et de management (GSEM)": [
    "Management / Gestion d'entreprise",
    'Economie',
    'Finance',
    'Statistique',
    'Science des donnees (Data Science)',
  ],
  'Faculte de droit': ['Droit suisse', 'Droit international et europeen', 'Droit economique'],
  'Faculte des sciences de la societe (SdS)': [
    'Science politique',
    'Sociologie',
    'Geographie et environnement',
    'Histoire, economie et societe',
    'Etudes genre',
  ],
  'Global Studies Institute (GSI)': ['Relations internationales', 'Etudes europeennes'],
  "Faculte de psychologie et des sciences de l'education (FPSE)": [
    'Psychologie',
    "Sciences de l'education",
    'Logopedie',
  ],
  'Faculte des lettres': [
    'Langues et litteratures',
    'Histoire',
    "Histoire de l'art",
    'Philosophie',
    "Sciences de l'Antiquite",
    'Archeologie',
  ],
  "Faculte de traduction et d'interpretation (FTI)": [
    'Traduction',
    'Interpretation de conference',
    'Technologies de la traduction / Communication multilingue',
  ],
  'Faculte de theologie': ['Theologie protestante'],
  "Centre universitaire d'informatique (CUI)": ['Sciences informatiques'],
  "Institut des sciences de l'environnement (ISE)": ["Sciences de la Terre et de l'environnement"],
  'Institut universitaire de formation des enseignants (IUFE)': ['Formation des enseignants'],
}

export const DEGREE_LEVELS = ['BACHELOR', 'MASTER', 'PHD']
export const DEGREE_LABELS = { BACHELOR: 'Bachelor', MASTER: 'Master', PHD: 'Doctorat (PhD)' }
