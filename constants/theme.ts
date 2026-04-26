// Grimoire - Witchcraft Practice Tracker
// Emotional: Q2 (Calm + Serious) with mystical warmth

export const theme = {
  // Primary - Moon Lavender
  primary: '#C9A0DC',
  primaryLight: '#DFC4EB',
  primaryDark: '#9B6DB5',

  // Accent - Soft Lavender
  accent: '#B8B0E8',
  accentLight: '#D0C9F2',
  accentDark: '#8878A8',

  // Backgrounds — Deep celestial purples
  background: '#1C0E3A',
  backgroundSecondary: '#231248',
  surface: 'rgba(255,255,255,0.10)',
  surfaceLight: 'rgba(255,255,255,0.07)',

  // Text — Blush & lavender
  textPrimary: '#F5D5E0',
  textSecondary: '#C4B0D8',
  textMuted: '#8878A8',

  // Semantic
  success: '#7ED4A8',
  error: '#E88898',
  warning: '#E8C87A',

  // Borders
  border: 'rgba(255,255,255,0.10)',
  borderLight: 'rgba(255,255,255,0.15)',

  // Default category colors (fallback)
  categories: {
    money_work: '#5EBD8A',
    love_work: '#E85D6F',
    glamour_magick: '#C9A84C',
    protection_work: '#7C5CBF',
  } as Record<string, string>,

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  // Border radius
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  // Typography
  typography: {
    heroData: { fontSize: 48, fontWeight: '700' as const },
    heroLabel: { fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 1 },
    sectionHeader: { fontSize: 18, fontWeight: '700' as const },
    cardTitle: { fontSize: 16, fontWeight: '600' as const },
    cardValue: { fontSize: 24, fontWeight: '700' as const },
    body: { fontSize: 15, fontWeight: '400' as const },
    caption: { fontSize: 13, fontWeight: '400' as const },
    small: { fontSize: 11, fontWeight: '500' as const },
  },

  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    elevated: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
  },
};

// Moon phase data
export const moonPhases = [
  { name: 'New Moon', icon: '🌑', energy: 'New beginnings, setting intentions' },
  { name: 'Waxing Crescent', icon: '🌒', energy: 'Growth, attraction, manifestation' },
  { name: 'First Quarter', icon: '🌓', energy: 'Action, determination, commitment' },
  { name: 'Waxing Gibbous', icon: '🌔', energy: 'Refinement, patience, trust' },
  { name: 'Full Moon', icon: '🌕', energy: 'Power, clarity, culmination' },
  { name: 'Waning Gibbous', icon: '🌖', energy: 'Gratitude, sharing, teaching' },
  { name: 'Last Quarter', icon: '🌗', energy: 'Release, forgiveness, letting go' },
  { name: 'Waning Crescent', icon: '🌘', energy: 'Rest, reflection, surrender' },
];

export function getCurrentMoonPhase(): typeof moonPhases[0] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const c = Math.floor(365.25 * year);
  const e = Math.floor(30.6 * month);
  const jd = c + e + day - 694039.09;
  const phase = jd / 29.53058867;
  const phaseIndex = Math.round((phase - Math.floor(phase)) * 8) % 8;

  return moonPhases[phaseIndex];
}
