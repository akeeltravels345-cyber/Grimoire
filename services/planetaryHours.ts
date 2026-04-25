// Planetary Hours Calculator — Chaldean System
import { CHALDEAN_ORDER, DAY_RULERS, PLANETS, PlanetData } from '../constants/planetaryData';

export interface PlanetaryHourInfo {
  hourNumber: number;
  planetKey: string;
  planet: PlanetData;
  startTime: Date;
  endTime: Date;
  type: 'day' | 'night';
  isCurrent: boolean;
}

// Approximate sunrise at 6:00 AM and sunset at 8:00 PM local time
function getSunTimes(date: Date): { sunrise: Date; sunset: Date; nextSunrise: Date } {
  const sunrise = new Date(date);
  sunrise.setHours(6, 0, 0, 0);

  const sunset = new Date(date);
  sunset.setHours(20, 0, 0, 0);

  const nextSunrise = new Date(date);
  nextSunrise.setDate(nextSunrise.getDate() + 1);
  nextSunrise.setHours(6, 0, 0, 0);

  return { sunrise, sunset, nextSunrise };
}

/**
 * Calculate all 24 planetary hours for the current day using the Chaldean system.
 * Day hours: sunrise to sunset divided into 12 equal parts.
 * Night hours: sunset to next sunrise divided into 12 equal parts.
 * The first hour of the day is ruled by the day's ruling planet.
 * Each subsequent hour follows Chaldean order.
 */
export function getPlanetaryHours(date?: Date): PlanetaryHourInfo[] {
  const now = date || new Date();
  const today = new Date(now);
  const { sunrise, sunset, nextSunrise } = getSunTimes(today);

  const dayDurationMs = sunset.getTime() - sunrise.getTime();
  const nightDurationMs = nextSunrise.getTime() - sunset.getTime();
  const dayHourMs = dayDurationMs / 12;
  const nightHourMs = nightDurationMs / 12;

  // Find the Chaldean index of the day ruler
  const dayOfWeek = today.getDay();
  const dayRulerKey = DAY_RULERS[dayOfWeek];
  const startChaldeanIndex = CHALDEAN_ORDER.indexOf(dayRulerKey);

  const hours: PlanetaryHourInfo[] = [];

  // 12 day hours
  for (let i = 0; i < 12; i++) {
    const chaldeanIdx = (startChaldeanIndex + i) % 7;
    const planetKey = CHALDEAN_ORDER[chaldeanIdx];
    const startTime = new Date(sunrise.getTime() + i * dayHourMs);
    const endTime = new Date(sunrise.getTime() + (i + 1) * dayHourMs);
    const isCurrent = now >= startTime && now < endTime;

    hours.push({
      hourNumber: i + 1,
      planetKey,
      planet: PLANETS[planetKey],
      startTime,
      endTime,
      type: 'day',
      isCurrent,
    });
  }

  // 12 night hours
  for (let i = 0; i < 12; i++) {
    const chaldeanIdx = (startChaldeanIndex + 12 + i) % 7;
    const planetKey = CHALDEAN_ORDER[chaldeanIdx];
    const startTime = new Date(sunset.getTime() + i * nightHourMs);
    const endTime = new Date(sunset.getTime() + (i + 1) * nightHourMs);
    const isCurrent = now >= startTime && now < endTime;

    hours.push({
      hourNumber: i + 1,
      planetKey,
      planet: PLANETS[planetKey],
      startTime,
      endTime,
      type: 'night',
      isCurrent,
    });
  }

  return hours;
}

/**
 * Returns whichever planetary hour is active right now, or null.
 */
export function getCurrentPlanetaryHour(): PlanetaryHourInfo | null {
  const hours = getPlanetaryHours();
  return hours.find(h => h.isCurrent) || null;
}

export function formatHourTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Local Time';
  }
}
