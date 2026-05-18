import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { getTodayPlanet, PLANETS, DAY_RULERS, getPlanetByKey, PlanetData } from '../../constants/planetaryData';
import { getPlanetaryHours, getCurrentPlanetaryHour, formatHourTime, getUserTimezone, PlanetaryHourInfo } from '../../services/planetaryHours';
import GradientScreen from '../../components/GradientScreen';
import PlanetVisual from '../../components/PlanetVisual';
import MoonVisual from '../../components/MoonVisual';

// ═══ MOON PHASE CALCULATIONS ═══
const REFERENCE_NEW_MOON = new Date('2024-01-11').getTime();
const LUNAR_CYCLE = 29.53058867;

function getDaysSinceNewMoon(date: Date): number {
  const diff = date.getTime() - REFERENCE_NEW_MOON;
  const days = diff / (1000 * 60 * 60 * 24);
  return ((days % LUNAR_CYCLE) + LUNAR_CYCLE) % LUNAR_CYCLE;
}

function getMoonPhaseFromAge(age: number): { name: string; icon: string; index: number } {
  if (age < 1.85) return { name: 'New Moon', icon: '🌑', index: 0 };
  if (age < 7.38) return { name: 'Waxing Crescent', icon: '🌒', index: 1 };
  if (age < 9.23) return { name: 'First Quarter', icon: '🌓', index: 2 };
  if (age < 14.77) return { name: 'Waxing Gibbous', icon: '🌔', index: 3 };
  if (age < 16.61) return { name: 'Full Moon', icon: '🌕', index: 4 };
  if (age < 22.15) return { name: 'Waning Gibbous', icon: '🌖', index: 5 };
  if (age < 23.99) return { name: 'Last Quarter', icon: '🌗', index: 6 };
  if (age < 27.68) return { name: 'Waning Crescent', icon: '🌘', index: 7 };
  return { name: 'New Moon', icon: '🌑', index: 0 };
}

function getIllumination(age: number): number {
  return Math.round((1 - Math.cos(2 * Math.PI * age / LUNAR_CYCLE)) / 2 * 100);
}

function getNextPhaseDate(fromDate: Date, targetAge: number): Date {
  const currentAge = getDaysSinceNewMoon(fromDate);
  let daysUntil = targetAge - currentAge;
  if (daysUntil <= 0) daysUntil += LUNAR_CYCLE;
  const result = new Date(fromDate);
  result.setDate(result.getDate() + Math.round(daysUntil));
  return result;
}

function formatLunarDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ═══ ECLIPSE DATA ═══
const ECLIPSES_2026 = [
  { type: 'Annular Solar Eclipse', date: 'February 17, 2026', visibility: 'Antarctica, South America', icon: '💫' },
  { type: 'Penumbral Lunar Eclipse', date: 'March 3, 2026', visibility: 'Americas, Europe, Africa', icon: '🌕' },
  { type: 'Total Solar Eclipse', date: 'August 12, 2026', visibility: 'Europe, North Africa, Arctic', icon: '🌑' },
];

// ═══ MOON MAGIC GUIDE ═══
const MOON_MAGIC = [
  { phase: 'New Moon', icon: '🌑', color: '#9B8EC4', works: 'New beginnings, setting intentions, planting seeds of change' },
  { phase: 'Waxing', icon: '🌒', color: '#7ED4A8', works: 'Growth, attraction, building momentum, drawing in' },
  { phase: 'Full Moon', icon: '🌕', color: '#F5D5E0', works: 'Manifestation, power, gratitude, divination, charging' },
  { phase: 'Waning', icon: '🌖', color: '#E8A87C', works: 'Releasing, banishing, letting go, cord cutting' },
  { phase: 'Dark Moon', icon: '🌘', color: '#8B7DA8', works: 'Rest, shadow work, divination, inner reflection' },
];

type ScreenTab = 'planets' | 'moon';

export default function PlanetaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const todayDow = new Date().getDay();

  const [screenTab, setScreenTab] = useState<ScreenTab>(tab === 'moon' ? 'moon' : 'planets');
  const [selectedDay, setSelectedDay] = useState(todayDow);
  const [hours, setHours] = useState<PlanetaryHourInfo[]>([]);
  const [hourTab, setHourTab] = useState<'day' | 'night'>('day');
  const timezone = getUserTimezone();

  const selectedPlanet = getPlanetByKey(DAY_RULERS[selectedDay]);
  const isToday = selectedDay === todayDow;

  const getDateForDay = useCallback((dayIndex: number) => {
    const today = new Date();
    const currentDow = today.getDay();
    let diff = dayIndex - currentDow;
    if (diff > 3) diff -= 7;
    if (diff < -3) diff += 7;
    const target = new Date(today);
    target.setDate(today.getDate() + diff);
    return target;
  }, []);

  useEffect(() => {
    const targetDate = getDateForDay(selectedDay);
    const allHours = getPlanetaryHours(targetDate);
    if (!isToday) allHours.forEach(h => { h.isCurrent = false; });
    setHours(allHours);
  }, [selectedDay, isToday, getDateForDay]);

  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => { setHours(getPlanetaryHours()); }, 60000);
    return () => clearInterval(interval);
  }, [isToday]);

  const filteredHours = hours.filter(h => h.type === hourTab);
  const dayAbbrevs = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleWeekDayTap = (dayIndex: number) => { setSelectedDay(dayIndex); setHourTab('day'); Haptics.selectionAsync(); };
  const selectedDateStr = getDateForDay(selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // ═══ Moon Tab Data ═══
  const now = useMemo(() => new Date(), []);
  const moonAge = useMemo(() => getDaysSinceNewMoon(now), [now]);
  const currentMoonPhase = useMemo(() => getMoonPhaseFromAge(moonAge), [moonAge]);
  const illumination = useMemo(() => getIllumination(moonAge), [moonAge]);

  const moonEnergyDesc = useMemo(() => {
    if (currentMoonPhase.index === 0) return 'A time of stillness and new beginnings. Set your intentions under the dark sky.';
    if (currentMoonPhase.index === 1) return 'Energy is building. Focus on growth, attraction, and drawing what you desire closer.';
    if (currentMoonPhase.index === 2) return 'A turning point. Take decisive action and overcome obstacles in your path.';
    if (currentMoonPhase.index === 3) return 'Power is swelling. Refine your work and prepare for the peak of manifestation.';
    if (currentMoonPhase.index === 4) return 'Maximum illumination and power. Manifest, celebrate, and express gratitude.';
    if (currentMoonPhase.index === 5) return 'Begin releasing what no longer serves you. Share wisdom and give thanks.';
    if (currentMoonPhase.index === 6) return 'A time of rebalancing. Let go of resistance and surrender to the flow.';
    return 'The quietest phase. Rest, reflect, and prepare for the cycle to begin anew.';
  }, [currentMoonPhase]);

  const nextFullMoon = useMemo(() => getNextPhaseDate(now, LUNAR_CYCLE / 2), [now]);
  const nextNewMoon = useMemo(() => getNextPhaseDate(now, 0), [now]);
  const nextFirstQuarter = useMemo(() => getNextPhaseDate(now, LUNAR_CYCLE / 4), [now]);
  const nextLastQuarter = useMemo(() => getNextPhaseDate(now, (LUNAR_CYCLE * 3) / 4), [now]);

  const next30Days = useMemo(() => {
    const days: { date: Date; phase: { name: string; icon: string; index: number }; illumination: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const age = getDaysSinceNewMoon(d);
      days.push({ date: d, phase: getMoonPhaseFromAge(age), illumination: getIllumination(age) });
    }
    return days;
  }, [now]);

  const renderPlanetsTab = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
      <View style={styles.weekGrid}>
        {dayAbbrevs.map((abbr, i) => {
          const planet = getPlanetByKey(DAY_RULERS[i]);
          const isSelected = i === selectedDay;
          const isTodayCell = i === todayDow;
          return (
            <Pressable key={abbr} style={[styles.weekCell, isSelected && { borderColor: planet.color, backgroundColor: planet.color + '15' }, !isSelected && isTodayCell && { borderColor: theme.primary + '40' }]} onPress={() => handleWeekDayTap(i)}>
              <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                <PlanetVisual planetKey={planet.key} size={isSelected ? 22 : 18} showGlow={false} />
              </View>
              <Text style={[styles.weekAbbr, isSelected && { color: planet.color, fontWeight: '700' }]}>{abbr}</Text>
              <Text style={[styles.weekSymbol, { color: isSelected ? planet.color : theme.textMuted }]}>{planet.symbol}</Text>
              {isTodayCell ? <View style={[styles.todayDot, { backgroundColor: isSelected ? planet.color : theme.primary }]} /> : null}
            </Pressable>
          );
        })}
      </View>
      {!isToday ? <View style={styles.dateIndicator}><MaterialIcons name="calendar-today" size={14} color={theme.textMuted} /><Text style={styles.dateIndicatorText}>{selectedDateStr}</Text><Pressable onPress={() => { setSelectedDay(todayDow); Haptics.selectionAsync(); }}><Text style={styles.todayLink}>Go to Today</Text></Pressable></View> : null}
      <View style={[styles.dayCard, { borderColor: selectedPlanet.color + '40' }]}>
        <View style={styles.dayCardHeader}><View style={styles.dayPlanetVisual}><PlanetVisual planetKey={selectedPlanet.key} size={48} showGlow={true} /></View><View style={{ flex: 1 }}><Text style={styles.dayLabel}>{isToday ? "TODAY'S RULING PLANET" : `${selectedPlanet.day.toUpperCase()} RULER`}</Text><View style={styles.dayNameRow}><Text style={[styles.daySymbol, { color: selectedPlanet.color }]}>{selectedPlanet.symbol}</Text><Text style={styles.dayName}>{selectedPlanet.name}</Text></View></View></View>
        <Text style={styles.dayEnergy}>{selectedPlanet.energy}</Text>
        <Text style={styles.detailLabel}>BEST WORKINGS</Text><View style={styles.chipRow}>{selectedPlanet.bestWorkings.map(w => <View key={w} style={[styles.detailChip, { backgroundColor: selectedPlanet.color + '18' }]}><Text style={[styles.detailChipText, { color: selectedPlanet.color }]}>{w}</Text></View>)}</View>
        <Text style={styles.detailLabel}>HERBS</Text><View style={styles.chipRow}>{selectedPlanet.herbs.map(h => <View key={h} style={styles.subtleChip}><Text style={styles.subtleChipText}>{h}</Text></View>)}</View>
        <Text style={styles.detailLabel}>CRYSTALS</Text><View style={styles.chipRow}>{selectedPlanet.crystals.map(c => <View key={c} style={styles.subtleChip}><Text style={styles.subtleChipText}>{c}</Text></View>)}</View>
        <Text style={styles.detailLabel}>COLORS</Text><View style={styles.chipRow}>{selectedPlanet.colors.map(c => <View key={c} style={[styles.detailChip, { backgroundColor: selectedPlanet.color + '18' }]}><Text style={[styles.detailChipText, { color: selectedPlanet.color }]}>{c}</Text></View>)}</View>
      </View>
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>{isToday ? 'Planetary Hours' : `${selectedPlanet.day} Hours`}</Text><Text style={styles.timezoneText}>{timezone}</Text></View>
      <View style={styles.phTabs}><Pressable style={[styles.phTab, hourTab === 'day' && styles.phTabActive]} onPress={() => setHourTab('day')}><Text style={[styles.phTabText, hourTab === 'day' && styles.phTabTextActive]}>☀️ Day Hours</Text></Pressable><Pressable style={[styles.phTab, hourTab === 'night' && styles.phTabActive]} onPress={() => setHourTab('night')}><Text style={[styles.phTabText, hourTab === 'night' && styles.phTabTextActive]}>🌙 Night Hours</Text></Pressable></View>
      <View style={styles.hoursCard}>
        <View style={styles.tableHeaderRow}><Text style={[styles.tableHeaderCell, { width: 32 }]}>#</Text><Text style={[styles.tableHeaderCell, { width: 36 }]}></Text><Text style={[styles.tableHeaderCell, { flex: 1 }]}>Planet</Text><Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Energy</Text><Text style={[styles.tableHeaderCell, { width: 68, textAlign: 'right' }]}>Start</Text></View>
        {filteredHours.map((h) => { const isActive = h.isCurrent; return (
          <View key={`${h.type}-${h.hourNumber}`} style={[styles.tableRow, isActive && styles.tableRowActive]}>
            <View style={[styles.hourNumBox, isActive ? { backgroundColor: h.planet.color + '25' } : null]}><Text style={[styles.hourNum, isActive ? { color: h.planet.color } : null]}>{h.hourNumber}</Text></View>
            <View style={styles.hourPlanetIcon}><PlanetVisual planetKey={h.planet.key} size={18} showGlow={false} /></View>
            <View style={{ flex: 1 }}><Text style={[styles.hourPlanetName, isActive ? { color: h.planet.color, fontWeight: '700' } : null]}>{h.planet.name}</Text></View>
            <Text style={[styles.hourEnergySummary, isActive ? { color: h.planet.color } : null]} numberOfLines={1}>{h.planet.bestWorkings[0]}</Text>
            <View style={{ width: 68, alignItems: 'flex-end' }}>{isActive ? <View style={[styles.nowBadge, { backgroundColor: h.planet.color + '25' }]}><Text style={[styles.nowBadgeText, { color: h.planet.color }]}>NOW</Text></View> : <Text style={styles.hourTime}>{formatHourTime(h.startTime)}</Text>}</View>
          </View>
        ); })}
      </View>
    </ScrollView>
  );

  const renderMoonTab = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
      {/* ═══ Current Moon Phase Hero ═══ */}
      <View style={styles.moonHero}>
        <View style={styles.moonHeroVisual}>
          <MoonVisual phaseIndex={currentMoonPhase.index} size={110} />
        </View>
        <Text style={styles.moonHeroName}>{currentMoonPhase.name}</Text>
        <View style={styles.moonHeroStats}>
          <View style={styles.moonHeroStat}>
            <Text style={styles.moonHeroStatValue}>{illumination}%</Text>
            <Text style={styles.moonHeroStatLabel}>Illuminated</Text>
          </View>
          <View style={styles.moonHeroStatDivider} />
          <View style={styles.moonHeroStat}>
            <Text style={styles.moonHeroStatValue}>{Math.round(moonAge)}</Text>
            <Text style={styles.moonHeroStatLabel}>Days Old</Text>
          </View>
        </View>
        <Text style={styles.moonHeroEnergy}>{moonEnergyDesc}</Text>
        <View style={styles.moonHeroNextRow}>
          <View style={styles.moonHeroNextItem}>
            <Text style={styles.moonHeroNextIcon}>🌕</Text>
            <View>
              <Text style={styles.moonHeroNextLabel}>Next Full Moon</Text>
              <Text style={styles.moonHeroNextDate}>{formatLunarDate(nextFullMoon)}</Text>
            </View>
          </View>
          <View style={styles.moonHeroNextItem}>
            <Text style={styles.moonHeroNextIcon}>🌑</Text>
            <View>
              <Text style={styles.moonHeroNextLabel}>Next New Moon</Text>
              <Text style={styles.moonHeroNextDate}>{formatLunarDate(nextNewMoon)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ═══ 30-Day Moon Calendar Strip ═══ */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Moon Calendar</Text>
        <Text style={styles.timezoneText}>Next 30 days</Text>
      </View>
      <View style={styles.moonStripContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moonStripContent}>
          {next30Days.map((day, i) => {
            const isToday2 = i === 0;
            const isKeyPhase = day.phase.index === 0 || day.phase.index === 4;
            return (
              <View key={i} style={[styles.moonStripDay, isToday2 && styles.moonStripDayToday, isKeyPhase && styles.moonStripDayKey]}>
                <Text style={[styles.moonStripDayAbbr, isToday2 && { color: theme.primary }]}>
                  {day.date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                </Text>
                <Text style={[styles.moonStripDayNum, isToday2 && { color: theme.primary }]}>
                  {day.date.getDate()}
                </Text>
                <Text style={styles.moonStripIcon}>{day.phase.icon}</Text>
                <Text style={[styles.moonStripPhase, isKeyPhase && { color: '#F5D5E0', fontWeight: '700' }]} numberOfLines={1}>
                  {day.phase.name.split(' ').pop()}
                </Text>
                <View style={[styles.moonStripIllumBar]}>
                  <View style={[styles.moonStripIllumFill, { width: `${Math.max(day.illumination, 4)}%` }]} />
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* ═══ Upcoming Lunar Events ═══ */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Upcoming Phases</Text>
      </View>
      <View style={styles.lunarEventsCard}>
        {[
          { icon: '🌕', name: 'Full Moon', date: nextFullMoon, color: '#F5D5E0' },
          { icon: '🌑', name: 'New Moon', date: nextNewMoon, color: '#9B8EC4' },
          { icon: '🌓', name: 'First Quarter', date: nextFirstQuarter, color: '#7ED4A8' },
          { icon: '🌗', name: 'Last Quarter', date: nextLastQuarter, color: '#E8A87C' },
        ].sort((a, b) => a.date.getTime() - b.date.getTime()).map((event, i, arr) => (
          <View key={event.name}>
            <View style={styles.lunarEventRow}>
              <View style={[styles.lunarEventIconBox, { backgroundColor: event.color + '15' }]}>
                <Text style={styles.lunarEventIcon}>{event.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lunarEventName, { color: event.color }]}>{event.name}</Text>
                <Text style={styles.lunarEventDate}>{formatLunarDate(event.date)}</Text>
              </View>
              <Text style={styles.lunarEventDays}>
                {Math.max(1, Math.round((event.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))}d
              </Text>
            </View>
            {i < arr.length - 1 ? <View style={styles.lunarEventDivider} /> : null}
          </View>
        ))}
      </View>

      {/* ═══ Eclipse Information ═══ */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Upcoming Eclipses 2026</Text>
      </View>
      <View style={{ gap: 10, marginBottom: 20 }}>
        {ECLIPSES_2026.map((eclipse, i) => (
          <View key={i} style={styles.eclipseCard}>
            <View style={styles.eclipseHeader}>
              <Text style={styles.eclipseIcon}>{eclipse.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.eclipseType}>{eclipse.type}</Text>
                <Text style={styles.eclipseDate}>{eclipse.date}</Text>
              </View>
            </View>
            <View style={styles.eclipseVisRow}>
              <MaterialIcons name="public" size={13} color={theme.textMuted} />
              <Text style={styles.eclipseVisText}>{eclipse.visibility}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ═══ Moon Magic Timing Guide ═══ */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Moon Magic Timing</Text>
      </View>
      <View style={styles.magicGuideCard}>
        {MOON_MAGIC.map((item, i) => (
          <View key={item.phase}>
            <View style={styles.magicRow}>
              <View style={[styles.magicIconBox, { backgroundColor: item.color + '18' }]}>
                <Text style={styles.magicIcon}>{item.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.magicPhase, { color: item.color }]}>{item.phase}</Text>
                <Text style={styles.magicWorks}>{item.works}</Text>
              </View>
            </View>
            {i < MOON_MAGIC.length - 1 ? <View style={styles.magicDivider} /> : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <GradientScreen>
      <View style={styles.topbar}>
        <View>
          <Text style={styles.topbarTitle}>{screenTab === 'planets' ? 'Planetary Magic' : 'Moon Phases'}</Text>
          <Text style={styles.topbarSub}>
            {screenTab === 'planets'
              ? `${selectedPlanet.day} — Day of ${selectedPlanet.name}`
              : `${currentMoonPhase.name} · ${illumination}% illuminated`}
          </Text>
        </View>
      </View>

      {/* Screen-level segment control */}
      <View style={styles.screenSegWrap}>
        <View style={styles.screenSegPill}>
          <Pressable
            style={[styles.screenSegBtn, screenTab === 'planets' && styles.screenSegBtnActive]}
            onPress={() => { setScreenTab('planets'); Haptics.selectionAsync(); }}
          >
            <MaterialIcons name="brightness-7" size={16} color={screenTab === 'planets' ? theme.textPrimary : theme.textMuted} />
            <Text style={[styles.screenSegText, screenTab === 'planets' && styles.screenSegTextActive]}>Planets</Text>
          </Pressable>
          <Pressable
            style={[styles.screenSegBtn, screenTab === 'moon' && styles.screenSegBtnActive]}
            onPress={() => { setScreenTab('moon'); Haptics.selectionAsync(); }}
          >
            <MaterialIcons name="nightlight-round" size={16} color={screenTab === 'moon' ? theme.textPrimary : theme.textMuted} />
            <Text style={[styles.screenSegText, screenTab === 'moon' && styles.screenSegTextActive]}>Moon</Text>
          </Pressable>
        </View>
      </View>

      {screenTab === 'planets' ? renderPlanetsTab() : renderMoonTab()}
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  topbar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  topbarTitle: { fontSize: 24, fontWeight: '700', color: theme.textPrimary },
  topbarSub: { fontSize: 13, color: theme.textSecondary, marginTop: 2, fontWeight: '500' },

  // Screen-level segment
  screenSegWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  screenSegPill: { flexDirection: 'row', backgroundColor: theme.surfaceLight, borderRadius: 14, padding: 3 },
  screenSegBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  screenSegBtnActive: { backgroundColor: theme.surface },
  screenSegText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  screenSegTextActive: { color: theme.textPrimary, fontWeight: '700' },

  // Planets tab
  weekGrid: { flexDirection: 'row', gap: 6, marginBottom: 16, marginTop: 4 },
  weekCell: { flex: 1, backgroundColor: theme.surface, borderRadius: theme.radius.md, paddingVertical: 14, alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: theme.border },
  weekAbbr: { fontSize: 10, fontWeight: '600', color: theme.textSecondary },
  weekSymbol: { fontSize: 14, fontWeight: '700', color: theme.textMuted },
  todayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  dateIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: theme.surfaceLight, borderRadius: theme.radius.sm, marginBottom: 14 },
  dateIndicatorText: { flex: 1, fontSize: 13, fontWeight: '500', color: theme.textSecondary },
  todayLink: { fontSize: 13, fontWeight: '600', color: theme.primary },
  dayCard: { backgroundColor: theme.surface, borderRadius: theme.radius.lg, padding: 20, marginBottom: 20, borderWidth: 1 },
  dayCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  dayPlanetVisual: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  dayLabel: { fontSize: 10, fontWeight: '700', color: theme.textSecondary, letterSpacing: 1, marginBottom: 4 },
  dayNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  daySymbol: { fontSize: 22, fontWeight: '700' },
  dayName: { fontSize: 20, fontWeight: '700', color: theme.textPrimary },
  dayEnergy: { fontSize: 14, color: theme.textSecondary, lineHeight: 21, marginBottom: 18 },
  detailLabel: { fontSize: 10, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, marginTop: 14, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  detailChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  detailChipText: { fontSize: 12, fontWeight: '600' },
  subtleChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: theme.surfaceLight },
  subtleChipText: { fontSize: 12, fontWeight: '500', color: theme.textSecondary },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary },
  timezoneText: { fontSize: 12, color: theme.textMuted, fontWeight: '500' },
  phTabs: { flexDirection: 'row', backgroundColor: theme.surfaceLight, borderRadius: theme.radius.md, padding: 3, marginBottom: 14 },
  phTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  phTabActive: { backgroundColor: theme.surface },
  phTabText: { fontSize: 13, fontWeight: '500', color: theme.textMuted },
  phTabTextActive: { color: theme.textPrimary, fontWeight: '600' },
  hoursCard: { backgroundColor: theme.surface, borderRadius: theme.radius.lg, padding: 10, marginBottom: 20 },
  tableHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  tableHeaderCell: { fontSize: 10, fontWeight: '700', color: theme.textMuted, letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border + '60' },
  tableRowActive: { backgroundColor: theme.primary + '10', borderRadius: theme.radius.sm },
  hourNumBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: theme.surfaceLight, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  hourNum: { fontSize: 12, fontWeight: '700', color: theme.textMuted },
  hourPlanetIcon: { width: 32, height: 24, alignItems: 'center', justifyContent: 'center' },
  hourPlanetName: { fontSize: 13, fontWeight: '600', color: theme.textPrimary },
  hourEnergySummary: { flex: 1.2, fontSize: 11, color: theme.textSecondary },
  hourTime: { fontSize: 12, color: theme.textMuted },
  nowBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  nowBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  // ═══ Moon Tab Styles ═══

  // Moon Hero
  moonHero: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,213,224,0.15)',
    borderTopColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  moonHeroVisual: {
    marginBottom: 16,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonHeroName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5D5E0',
    fontFamily: theme.fonts.serif,
    marginBottom: 14,
    textShadowColor: 'rgba(245,213,224,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  moonHeroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 16,
  },
  moonHeroStat: { alignItems: 'center' },
  moonHeroStatValue: { fontSize: 22, fontWeight: '700', color: theme.textPrimary },

  moonHeroStatLabel: { fontSize: 10, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  moonHeroStatDivider: { width: 1, height: 28, backgroundColor: theme.border },
  moonHeroEnergy: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: theme.fonts.serif,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  moonHeroNextRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  moonHeroNextItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245,213,224,0.06)',
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,213,224,0.10)',
  },
  moonHeroNextIcon: { fontSize: 22 },
  moonHeroNextLabel: { fontSize: 10, fontWeight: '600', color: theme.textMuted, letterSpacing: 0.3 },
  moonHeroNextDate: { fontSize: 12, fontWeight: '600', color: theme.textPrimary, marginTop: 1 },

  // 30-Day Moon Strip
  moonStripContainer: { marginBottom: 20 },
  moonStripContent: { paddingHorizontal: 0, gap: 6 },
  moonStripDay: {
    width: 58,
    backgroundColor: theme.surface,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: theme.border,
  },
  moonStripDayToday: {
    borderColor: theme.primary + '50',
    backgroundColor: theme.primary + '10',
  },
  moonStripDayKey: {
    borderColor: 'rgba(245,213,224,0.30)',
    backgroundColor: 'rgba(245,213,224,0.06)',
  },
  moonStripDayAbbr: { fontSize: 9, fontWeight: '600', color: theme.textMuted },
  moonStripDayNum: { fontSize: 14, fontWeight: '700', color: theme.textSecondary },
  moonStripIcon: { fontSize: 18, marginVertical: 2 },
  moonStripPhase: { fontSize: 8, fontWeight: '500', color: theme.textMuted, textAlign: 'center' },
  moonStripIllumBar: {
    width: 32,
    height: 3,
    backgroundColor: theme.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  moonStripIllumFill: {
    height: 3,
    backgroundColor: '#F5D5E0',
    borderRadius: 2,
  },

  // Lunar Events
  lunarEventsCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  lunarEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  lunarEventIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lunarEventIcon: { fontSize: 22 },
  lunarEventName: { fontSize: 15, fontWeight: '700' },
  lunarEventDate: { fontSize: 12, color: theme.textSecondary, marginTop: 1, fontWeight: '500' },
  lunarEventDays: { fontSize: 13, fontWeight: '700', color: theme.textMuted },
  lunarEventDivider: { height: 1, backgroundColor: theme.border + '60', marginLeft: 54 },

  // Eclipse Cards
  eclipseCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    borderLeftWidth: 3,
    borderLeftColor: '#E8A87C',
  },
  eclipseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  eclipseIcon: { fontSize: 24 },
  eclipseType: { fontSize: 15, fontWeight: '700', color: theme.textPrimary },
  eclipseDate: { fontSize: 13, fontWeight: '600', color: theme.accent, marginTop: 2 },
  eclipseVisRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 36 },
  eclipseVisText: { fontSize: 12, color: theme.textMuted },

  // Moon Magic Guide
  magicGuideCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,213,224,0.15)',
  },
  magicRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  magicIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  magicIcon: { fontSize: 20 },
  magicPhase: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  magicWorks: { fontSize: 13, color: theme.textSecondary, lineHeight: 19, fontFamily: theme.fonts.serif },
  magicDivider: { height: 1, backgroundColor: theme.border + '60', marginLeft: 52 },
});
