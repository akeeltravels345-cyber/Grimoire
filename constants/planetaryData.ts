// Comprehensive Planetary Magic Data
// Based on classical astrological correspondences

export interface PlanetData {
  key: string;
  name: string;
  symbol: string;
  emoji: string;
  day: string;
  color: string;
  energy: string;
  bestWorkings: string[];
  herbs: string[];
  crystals: string[];
  colors: string[];
}

export const PLANETS: Record<string, PlanetData> = {
  sun: {
    key: 'sun',
    name: 'Sun',
    symbol: '☉',
    emoji: '☀️',
    day: 'Sunday',
    color: '#F59E0B',
    energy: 'Solar energy radiates vitality, success, and abundance. Excellent for prosperity work, healing, confidence, and empowerment spells.',
    bestWorkings: ['Vitality', 'Prosperity', 'Success', 'Healing', 'Leadership', 'Confidence', 'Fame'],
    herbs: ['Chamomile', 'St. John\'s Wort', 'Cinnamon', 'Frankincense', 'Bay Laurel', 'Marigold'],
    crystals: ['Citrine', 'Amber', 'Tiger\'s Eye', 'Sunstone', 'Pyrite', 'Gold'],
    colors: ['Gold', 'Yellow', 'Orange', 'Amber'],
  },
  moon: {
    key: 'moon',
    name: 'Moon',
    symbol: '☽',
    emoji: '🌙',
    day: 'Monday',
    color: '#94A3B8',
    energy: 'Lunar energy governs intuition, dreams, and the subconscious. Ideal for divination, psychic development, emotional healing, and fertility rites.',
    bestWorkings: ['Intuition', 'Dreams', 'Emotions', 'Fertility', 'Psychic Work', 'Cleansing', 'Travel'],
    herbs: ['Mugwort', 'Jasmine', 'Moonwort', 'White Willow', 'Lotus', 'Coconut'],
    crystals: ['Moonstone', 'Selenite', 'Pearl', 'Labradorite', 'Clear Quartz', 'Opal'],
    colors: ['Silver', 'White', 'Pale Blue', 'Lavender'],
  },
  mars: {
    key: 'mars',
    name: 'Mars',
    symbol: '♂',
    emoji: '🔴',
    day: 'Tuesday',
    color: '#EF4444',
    energy: 'Martial energy fuels courage, strength, and decisive action. Perfect for protection spells, banishing, overcoming obstacles, and competition.',
    bestWorkings: ['Courage', 'Protection', 'Strength', 'Banishing', 'Victory', 'Lust', 'Willpower'],
    herbs: ['Dragon\'s Blood', 'Nettle', 'Ginger', 'Garlic', 'Pepper', 'Thistle'],
    crystals: ['Bloodstone', 'Red Jasper', 'Garnet', 'Carnelian', 'Ruby', 'Iron'],
    colors: ['Red', 'Scarlet', 'Crimson', 'Black'],
  },
  mercury: {
    key: 'mercury',
    name: 'Mercury',
    symbol: '☿',
    emoji: '💜',
    day: 'Wednesday',
    color: '#8B5CF6',
    energy: 'Mercurial energy enhances communication, intellect, and adaptability. Ideal for study, divination, business deals, travel, and technology spells.',
    bestWorkings: ['Communication', 'Intellect', 'Travel', 'Business', 'Divination', 'Learning', 'Wit'],
    herbs: ['Lavender', 'Fennel', 'Dill', 'Marjoram', 'Parsley', 'Caraway'],
    crystals: ['Agate', 'Fluorite', 'Aventurine', 'Citrine', 'Ametrine', 'Opal'],
    colors: ['Purple', 'Violet', 'Mixed Colors', 'Iridescent'],
  },
  jupiter: {
    key: 'jupiter',
    name: 'Jupiter',
    symbol: '♃',
    emoji: '🔵',
    day: 'Thursday',
    color: '#3B82F6',
    energy: 'Jovian energy expands luck, wealth, and spiritual growth. Excellent for abundance rituals, legal matters, expansion, higher learning, and generosity.',
    bestWorkings: ['Luck', 'Wealth', 'Growth', 'Legal Matters', 'Expansion', 'Wisdom', 'Honor'],
    herbs: ['Sage', 'Nutmeg', 'Clove', 'Cedar', 'Hyssop', 'Borage'],
    crystals: ['Amethyst', 'Lapis Lazuli', 'Sapphire', 'Turquoise', 'Sodalite', 'Tin'],
    colors: ['Blue', 'Royal Purple', 'Indigo', 'Deep Violet'],
  },
  venus: {
    key: 'venus',
    name: 'Venus',
    symbol: '♀',
    emoji: '💖',
    day: 'Friday',
    color: '#EC4899',
    energy: 'Venusian energy rules love, beauty, and harmony. Perfect for love spells, glamour magick, artistic inspiration, pleasure rituals, and reconciliation.',
    bestWorkings: ['Love', 'Beauty', 'Harmony', 'Art', 'Pleasure', 'Friendship', 'Glamour'],
    herbs: ['Rose', 'Vanilla', 'Hibiscus', 'Apple', 'Yarrow', 'Thyme'],
    crystals: ['Rose Quartz', 'Emerald', 'Jade', 'Malachite', 'Copper', 'Rhodonite'],
    colors: ['Pink', 'Green', 'Rose Gold', 'Copper'],
  },
  saturn: {
    key: 'saturn',
    name: 'Saturn',
    symbol: '♄',
    emoji: '⚫',
    day: 'Saturday',
    color: '#64748B',
    energy: 'Saturnine energy governs discipline, boundaries, and endings. Ideal for banishing, binding, protection, karmic work, and long-term structure.',
    bestWorkings: ['Discipline', 'Boundaries', 'Banishing', 'Binding', 'Karma', 'Endings', 'Structure'],
    herbs: ['Comfrey', 'Patchouli', 'Myrrh', 'Cypress', 'Hemlock', 'Mullein'],
    crystals: ['Obsidian', 'Onyx', 'Jet', 'Black Tourmaline', 'Hematite', 'Lead'],
    colors: ['Black', 'Dark Brown', 'Grey', 'Indigo'],
  },
};

// Chaldean order: Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon
export const CHALDEAN_ORDER: string[] = [
  'saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon',
];

// Day rulers indexed by day of week (0=Sunday)
export const DAY_RULERS: string[] = [
  'sun',      // 0 = Sunday
  'moon',     // 1 = Monday
  'mars',     // 2 = Tuesday
  'mercury',  // 3 = Wednesday
  'jupiter',  // 4 = Thursday
  'venus',    // 5 = Friday
  'saturn',   // 6 = Saturday
];

export function getTodayPlanet(): PlanetData {
  const dayOfWeek = new Date().getDay();
  const rulerKey = DAY_RULERS[dayOfWeek];
  return PLANETS[rulerKey];
}

export function getPlanetByKey(key: string): PlanetData {
  return PLANETS[key] || PLANETS.sun;
}
