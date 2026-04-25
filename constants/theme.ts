// Grimoire - Witchcraft Practice Tracker
// Emotional: Q2 (Calm + Serious) with mystical warmth

export const theme = {
  // Primary - Mystical Gold
  primary: '#C9A84C',
  primaryLight: '#E2C97E',
  primaryDark: '#A68A3A',

  // Accent - Deep Violet
  accent: '#7C5CBF',
  accentLight: '#A78BFA',
  accentDark: '#5B3A9E',

  // Backgrounds
  background: '#0F0E17',
  backgroundSecondary: '#1A1828',
  surface: '#232136',
  surfaceLight: '#2E2B47',

  // Text
  textPrimary: '#E8E4F0',
  textSecondary: '#9890A8',
  textMuted: '#6B6480',

  // Semantic
  success: '#5EBD8A',
  error: '#E85D6F',
  warning: '#E2A84C',

  // Borders
  border: '#2E2B47',
  borderLight: '#3D3A56',

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
