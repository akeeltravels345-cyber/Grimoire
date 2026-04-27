import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { getTodayPlanet, PLANETS, DAY_RULERS, getPlanetByKey, PlanetData } from '../../constants/planetaryData';
import { getPlanetaryHours, getCurrentPlanetaryHour, formatHourTime, getUserTimezone, PlanetaryHourInfo } from '../../services/planetaryHours';
import GradientScreen from '../../components/GradientScreen';
import PlanetVisual from '../../components/PlanetVisual';

export default function PlanetaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const todayDow = new Date().getDay();

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

  return (
    <GradientScreen>
      <View style={styles.topbar}>
        <View><Text style={styles.topbarTitle}>Planetary Magic</Text><Text style={styles.topbarSub}>{selectedPlanet.day} — Day of {selectedPlanet.name}</Text></View>
      </View>
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
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  topbar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  topbarTitle: { fontSize: 24, fontWeight: '700', color: theme.textPrimary },
  topbarSub: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
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
  daySymbol: { fontSize: 24, fontWeight: '700' },
  dayName: { fontSize: 22, fontWeight: '700', color: theme.textPrimary },
  dayEnergy: { fontSize: 14, color: theme.textSecondary, lineHeight: 21, marginBottom: 18 },
  detailLabel: { fontSize: 10, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, marginTop: 14, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  detailChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  detailChipText: { fontSize: 12, fontWeight: '600' },
  subtleChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: theme.surfaceLight },
  subtleChipText: { fontSize: 12, fontWeight: '500', color: theme.textSecondary },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary },
  timezoneText: { fontSize: 11, color: theme.textMuted },
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
});
