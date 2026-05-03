// Grimoire - Witchcraft Practice Tracker
// Emotional: Q2 (Calm + Serious) with mystical warmth

import { Platform } from 'react-native';

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

  // Typography — unified scale (base 16, ratio ~1.2)
  // Serif: Georgia (iOS) / serif (Android) — for ritual names, intentions, journal notes
  // System: default — for UI labels, badges, controls
  fonts: {
    serif: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    system: undefined as string | undefined,  // default system font
  },
  typography: {
    // Page-level
    pageTitle: { fontSize: 24, fontWeight: '700' as const },            // e.g. "Rituals", "Journal"
    pageSubtitle: { fontSize: 13, fontWeight: '500' as const },         // e.g. date, entry count
    // Sections
    sectionHeader: { fontSize: 18, fontWeight: '700' as const },        // e.g. "Recent Activity"
    sectionLabel: { fontSize: 10, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 1.2 }, // e.g. "CORE PRACTICE"
    // Cards
    cardTitle: { fontSize: 15, fontWeight: '600' as const },            // card heading
    cardBody: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 }, // card description
    // Content
    body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 }, // main readable text
    bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 }, // secondary text
    // Emphasis
    heroData: { fontSize: 48, fontWeight: '700' as const },             // large stat numbers
    dataLarge: { fontSize: 22, fontWeight: '700' as const },            // stat ring values, summary counts
    dataMedium: { fontSize: 18, fontWeight: '700' as const },           // medium stat values
    // UI controls
    button: { fontSize: 15, fontWeight: '600' as const },               // primary CTA text
    buttonSmall: { fontSize: 13, fontWeight: '600' as const },          // small buttons/links
    badge: { fontSize: 11, fontWeight: '600' as const },                // chips, tags, badges
    badgeSmall: { fontSize: 10, fontWeight: '600' as const },           // tiny status labels
    // Form
    formLabel: { fontSize: 12, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    formInput: { fontSize: 15, fontWeight: '400' as const },
    formHint: { fontSize: 12, fontWeight: '400' as const },
    // Navigation
    tabLabel: { fontSize: 13, fontWeight: '600' as const },
    headerTitle: { fontSize: 17, fontWeight: '600' as const },
    // Captions
    caption: { fontSize: 12, fontWeight: '500' as const },
    tiny: { fontSize: 10, fontWeight: '600' as const },
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
