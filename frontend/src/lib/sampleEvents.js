/**
 * Demo events used ONLY in preview/demo mode (see demoMode.js) to populate the
 * UI when no backend is running. Original, UNIGE-flavoured examples (real campus
 * locations) with curated images that match each event. Dates span late May →
 * June so the calendar (current month) is populated.
 */
export const SAMPLE_EVENTS = [
  {
    eventId: 'demo-1',
    title: 'Conférence publique : intelligence artificielle et société',
    category: 'Conférence',
    time: '2026-05-26T18:30:00',
    place: 'Uni Dufour, Auditoire U300',
    capacity: 300,
    description:
      "Table ronde ouverte à tous avec des chercheur·euses de l'UNIGE sur l'impact de l'IA dans nos sociétés.",
    bannerUrl:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
  },
  {
    eventId: 'demo-2',
    title: 'Tournoi inter-facultés de volleyball',
    category: 'Sport',
    time: '2026-05-30T13:00:00',
    place: 'Centre sportif universitaire, Champel',
    capacity: 120,
    description: 'Affronte les autres facultés lors du tournoi annuel organisé par UNIGE Sport.',
    bannerUrl: 'https://loremflickr.com/800/500/volleyball?lock=22',
  },
  {
    eventId: 'demo-3',
    title: 'Randonnée au lever du soleil au Salève',
    category: 'Plein air',
    time: '2026-06-04T05:30:00',
    place: 'Téléphérique du Salève',
    capacity: 25,
    description: 'Départ avant l’aube pour admirer le lever du soleil sur le lac et les Alpes.',
    bannerUrl:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80',
  },
  {
    eventId: 'demo-4',
    title: 'Atelier CV & entretien — Career Center',
    category: 'Carrière',
    time: '2026-06-10T12:15:00',
    place: 'Uni Mail, salle MR080',
    capacity: 40,
    description: 'Optimise ton CV et prépare tes entretiens avec les coachs du Career Center.',
    bannerUrl:
      'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=80',
  },
  {
    eventId: 'demo-5',
    title: 'Yoga & méditation au bord du lac',
    category: 'Bien-être',
    time: '2026-06-16T07:30:00',
    place: 'Quai Wilson',
    capacity: 40,
    description: 'Démarre la journée en douceur avec une séance accessible à tous les niveaux.',
    bannerUrl:
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
  },
  {
    eventId: 'demo-6',
    title: "Concert de l'Orchestre Universitaire de Genève",
    category: 'Musique',
    time: '2026-06-22T20:00:00',
    place: 'Bâtiment des Bastions, Aula',
    capacity: 200,
    description: "Concert de fin d'année de l'orchestre des étudiant·es — entrée libre.",
    bannerUrl: 'https://loremflickr.com/800/500/orchestra,concert?lock=66',
  },
]
