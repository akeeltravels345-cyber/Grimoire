export const APP_NAME = 'Grimoire';

export interface PracticeCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const DEFAULT_CATEGORIES: PracticeCategory[] = [
  {
    id: 'general',
    name: 'General',
    icon: 'auto-fix-high',
    description: 'General practice and miscellaneous rituals',
  },
  {
    id: 'money_work',
    name: 'Money Work',
    icon: 'paid',
    description: 'Abundance, prosperity, financial spells',
  },
  {
    id: 'love_work',
    name: 'Love Work',
    icon: 'favorite',
    description: 'Love spells, self-love, relationship work',
  },
  {
    id: 'glamour_magick',
    name: 'Glamour Magick',
    icon: 'auto-awesome',
    description: 'Beauty, confidence, charisma, allure',
  },
  {
    id: 'protection_work',
    name: 'Protection Work',
    icon: 'shield',
    description: 'Wards, banishing, spiritual protection',
  },
];

export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  general: '#4EA8DE',
  money_work: '#5EBD8A',
  love_work: '#E85D6F',
  glamour_magick: '#C9A84C',
  protection_work: '#7C5CBF',
  'Money Work': '#5EBD8A',
  'Love Work': '#E85D6F',
  'Glamour Magick': '#C9A84C',
  'Glamour': '#C9A84C',
  'Protection Work': '#7C5CBF',
  'Protection': '#7C5CBF',
  'General': '#4EA8DE',
  spellwork: '#7C5CBF',
  divination: '#4EA8DE',
  meditation: '#5EBD8A',
  devotional: '#C9A84C',
  herbalism: '#5EBD8A',
  ancestral: '#E85D6F',
};

export const AVAILABLE_ICONS = [
  'auto-fix-high', 'paid', 'favorite', 'auto-awesome', 'shield', 'eco', 'visibility',
  'self-improvement', 'spa', 'local-fire-department', 'nightlight-round',
  'water-drop', 'bolt', 'star', 'diamond', 'psychology', 'healing',
  'flare', 'brightness-7', 'dark-mode', 'whatshot',
];

export const AVAILABLE_COLORS = [
  '#4EA8DE', '#E85D6F', '#C9A84C', '#5EBD8A', '#7C5CBF',
  '#F59E0B', '#EC4899', '#8B5CF6', '#10B981', '#EF4444',
  '#06B6D4', '#F97316',
];

export type CategoryId = string;

export const RITUAL_STATUS = {
  active: 'Active',
  completed: 'Completed',
  paused: 'Paused',
} as const;

export type RitualStatus = keyof typeof RITUAL_STATUS;

// Planetary day data
export interface PlanetaryDay {
  planet: string;
  symbol: string;
  day: string;
  color: string;
  energy: string;
  bestFor: string[];
}

export const PLANETARY_DAYS: PlanetaryDay[] = [
  {
    planet: 'Sun',
    symbol: '☉',
    day: 'Sunday',
    color: '#F59E0B',
    energy: 'Solar energy radiates vitality, success, and abundance. Excellent for prosperity work, healing, and empowerment spells.',
    bestFor: ['Vitality', 'Prosperity', 'Success', 'Healing', 'Leadership'],
  },
  {
    planet: 'Moon',
    symbol: '☽',
    day: 'Monday',
    color: '#94A3B8',
    energy: 'Lunar energy governs intuition, dreams, and the subconscious. Ideal for divination, psychic development, and emotional healing.',
    bestFor: ['Intuition', 'Dreams', 'Emotions', 'Fertility', 'Psychic Work'],
  },
  {
    planet: 'Mars',
    symbol: '♂',
    day: 'Tuesday',
    color: '#EF4444',
    energy: 'Martial energy fuels courage, strength, and decisive action. Perfect for protection spells, banishing, and overcoming obstacles.',
    bestFor: ['Courage', 'Protection', 'Strength', 'Banishing', 'Victory'],
  },
  {
    planet: 'Mercury',
    symbol: '☿',
    day: 'Wednesday',
    color: '#8B5CF6',
    energy: 'Mercurial energy enhances communication, intellect, and travel. Ideal for study, divination, business, and technology spells.',
    bestFor: ['Communication', 'Intellect', 'Travel', 'Business', 'Divination'],
  },
  {
    planet: 'Jupiter',
    symbol: '♃',
    day: 'Thursday',
    color: '#3B82F6',
    energy: 'Jovian energy expands luck, wealth, and spiritual growth. Excellent for abundance rituals, legal matters, and expansion.',
    bestFor: ['Luck', 'Wealth', 'Growth', 'Legal Matters', 'Expansion'],
  },
  {
    planet: 'Venus',
    symbol: '♀',
    day: 'Friday',
    color: '#EC4899',
    energy: 'Venusian energy rules love, beauty, and harmony. Perfect for love spells, glamour magick, art, and pleasure rituals.',
    bestFor: ['Love', 'Beauty', 'Harmony', 'Art', 'Pleasure'],
  },
  {
    planet: 'Saturn',
    symbol: '♄',
    day: 'Saturday',
    color: '#64748B',
    energy: 'Saturnine energy governs discipline, boundaries, and endings. Ideal for banishing, binding, protection, and karmic work.',
    bestFor: ['Discipline', 'Boundaries', 'Banishing', 'Binding', 'Karma'],
  },
];

// Planetary hours - Chaldean order
export const CHALDEAN_ORDER = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];
export const PLANETARY_SYMBOLS: Record<string, string> = {
  Saturn: '♄', Jupiter: '♃', Mars: '♂', Sun: '☉', Venus: '♀', Mercury: '☿', Moon: '☽',
};
export const PLANETARY_COLORS: Record<string, string> = {
  Saturn: '#64748B', Jupiter: '#3B82F6', Mars: '#EF4444', Sun: '#F59E0B',
  Venus: '#EC4899', Mercury: '#8B5CF6', Moon: '#94A3B8',
};

export function getPlanetaryDay(): PlanetaryDay {
  const dayIndex = new Date().getDay(); // 0=Sun
  return PLANETARY_DAYS[dayIndex];
}

// Approximate sunrise/sunset for planetary hour calculation
function getSunTimes() {
  const now = new Date();
  const sunrise = new Date(now);
  sunrise.setHours(6, 0, 0, 0);
  const sunset = new Date(now);
  sunset.setHours(18, 0, 0, 0);
  return { sunrise, sunset };
}

export interface PlanetaryHour {
  planet: string;
  symbol: string;
  color: string;
  startTime: Date;
  endTime: Date;
  isCurrent: boolean;
  isDay: boolean;
}

export function getPlanetaryHours(): PlanetaryHour[] {
  const now = new Date();
  const { sunrise, sunset } = getSunTimes();
  const dayMinutes = (sunset.getTime() - sunrise.getTime()) / 60000;
  const nightMinutes = 1440 - dayMinutes;
  const dayHourMinutes = dayMinutes / 12;
  const nightHourMinutes = nightMinutes / 12;

  const dayRulerMap: Record<number, number> = { 0: 3, 1: 6, 2: 2, 3: 5, 4: 1, 5: 4, 6: 0 };
  const dayOfWeek = now.getDay();
  const startIndex = dayRulerMap[dayOfWeek];

  const hours: PlanetaryHour[] = [];

  for (let i = 0; i < 12; i++) {
    const planetIndex = (startIndex + i) % 7;
    const planet = CHALDEAN_ORDER[planetIndex];
    const startTime = new Date(sunrise.getTime() + i * dayHourMinutes * 60000);
    const endTime = new Date(sunrise.getTime() + (i + 1) * dayHourMinutes * 60000);
    const isCurrent = now >= startTime && now < endTime;
    hours.push({
      planet,
      symbol: PLANETARY_SYMBOLS[planet],
      color: PLANETARY_COLORS[planet],
      startTime,
      endTime,
      isCurrent,
      isDay: true,
    });
  }

  for (let i = 0; i < 12; i++) {
    const planetIndex = (startIndex + 12 + i) % 7;
    const planet = CHALDEAN_ORDER[planetIndex];
    const startTime = new Date(sunset.getTime() + i * nightHourMinutes * 60000);
    const endTime = new Date(sunset.getTime() + (i + 1) * nightHourMinutes * 60000);
    const isCurrent = now >= startTime && now < endTime;
    hours.push({
      planet,
      symbol: PLANETARY_SYMBOLS[planet],
      color: PLANETARY_COLORS[planet],
      startTime,
      endTime,
      isCurrent,
      isDay: false,
    });
  }

  return hours;
}
