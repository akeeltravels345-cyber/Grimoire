import { theme } from '../constants/theme';

interface CategoryLike {
  id: string;
  name: string;
  icon?: string;
}

/**
 * Find a category by flexible matching: ID, name, or case-insensitive name.
 */
export function resolveCategory(
  categoryKey: string | undefined,
  categories: CategoryLike[]
): CategoryLike | undefined {
  if (!categoryKey) return undefined;
  return categories.find(
    c =>
      c.id === categoryKey ||
      c.name === categoryKey ||
      c.name.toLowerCase() === categoryKey.toLowerCase()
  );
}

/**
 * Resolve category color with multi-fallback matching.
 * Tries: direct key → underscore format → hyphen format → resolved category ID/name → fallback.
 */
export function resolveCategoryColor(
  categoryKey: string | undefined,
  categoryColors: Record<string, string>,
  categories: CategoryLike[],
  fallback: string = theme.accent
): string {
  if (!categoryKey) return fallback;

  // Direct key match
  if (categoryColors[categoryKey]) return categoryColors[categoryKey];

  // Underscore-formatted key
  const keyUnderscore = categoryKey.toLowerCase().replace(/\s+/g, '_');
  if (categoryColors[keyUnderscore]) return categoryColors[keyUnderscore];

  // Hyphen-formatted key
  const keyHyphen = categoryKey.toLowerCase().replace(/\s+/g, '-');
  if (categoryColors[keyHyphen]) return categoryColors[keyHyphen];

  // Resolve via category object and try ID / name variants
  const cat = resolveCategory(categoryKey, categories);
  if (cat) {
    if (categoryColors[cat.id]) return categoryColors[cat.id];
    if (categoryColors[cat.name]) return categoryColors[cat.name];
    const nameUnderscore = cat.name.toLowerCase().replace(/\s+/g, '_');
    if (categoryColors[nameUnderscore]) return categoryColors[nameUnderscore];
    const nameHyphen = cat.name.toLowerCase().replace(/\s+/g, '-');
    if (categoryColors[nameHyphen]) return categoryColors[nameHyphen];
  }

  return fallback;
}
