
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, getCurrentMoonPhase } from '../../constants/theme';
import { getTodayPlanet } from '../../constants/planetaryData';
import { getCurrentPlanetaryHour, formatHourTime, PlanetaryHourInfo } from '../../services/planetaryHours';
import { useApp } from '../../contexts/AppContext';
import { getComputedStatus, getDaysUntil } from '../../services/mockData';

import StarField from '../../components/StarField';
import MoonVisual from '../../components/MoonVisual';
import PlanetVisual from '../../components/PlanetVisual';
import PracticeOverview from '../../components/PracticeOverview';

function getMoonPhaseIndex(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const c = Math.floor(365.25 * year);
  const e = Math.floor(30.6 * month);
  const jd = c + e + day - 694039.09;
  const phase = jd / 29.53058867;
  return Math.round((phase - Math.floor(phase)) * 8) % 8;
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { rituals, categories, categoryColors, manifestations } = useApp();
  const moonPhase = getCurrentMoonPhase();
  const moonPhaseIndex = getMoonPhaseIndex();
  const todayPlanet = getTodayPlanet();

  const [currentHour, setCurrentHour] = useState<PlanetaryHourInfo | null>(null);

  useEffect(() => {
    const update = () => setCurrentHour(getCurrentPlanetaryHour());
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const overdueRituals = useMemo(() => {
    return rituals
      .map(r => ({ ...r, computedStatus: getComputedStatus(r) }))
      .filter(r => r.computedStatus === 'overdue')
      .sort((a, b) => {
        const da = a.scheduledDate ? new Date(a.scheduledDate).getTime() : Infinity;
        const db = b.scheduledDate ? new Date(b.scheduledDate).getTime() : Infinity;
        return da - db;
      });
  }, [rituals]);



  const recentEntries = useMemo(() => {
    const entries: { id: string; ritualName: string; ritualId: string; category: string; date: string; notes: string; mood: string }[] = [];
    rituals.forEach(r => {
      r.journal.forEach(j => {
        entries.push({ ...j, ritualName: r.name, ritualId: r.id, category: r.category });
      });
    });
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
  }, [rituals]);

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  function getOverduePill(days: number): string {
    if (days === -1) return '1d overdue';
    return `${Math.abs(days)}d overdue`;
  }

  return (
    <LinearGradient
      colors={['#4A2875', '#3A1F65', '#2D1855', '#231245', '#1C0E3A']}
      locations={[0, 0.2, 0.45, 0.7, 1]}
      start={{ x: 0.25, y: 0 }}
      end={{ x: 0.75, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView edges={['top']} style={styles.container}>
        {/* Atmospheric colour wash overlay */}
        <LinearGradient
          colors={['rgba(150,80,180,0.15)', 'rgba(100,60,160,0.06)', 'rgba(80,50,150,0.08)', 'rgba(102,103,171,0.12)']}
locations={[0, 0.35, 0.65, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
          pointerEvents="none"
        />
        {/* Top highlight */}
        <LinearGradient
          colors={['rgba(180,120,220,0.12)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%' as any, zIndex: 0 }}
          pointerEvents="none"
        />
        {/* Bottom vignette */}
        <LinearGradient
          colors={['transparent', 'rgba(20,10,40,0.5)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%' as any, zIndex: 0 }}
          pointerEvents="none"
        />
        <StarField starCount={80} showShootingStar={true} />

        <ScrollView
          style={{ flex: 1, zIndex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.dateText}>{todayStr}</Text>
              <Text style={styles.greeting}>Blessed Be ✦</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => router.push('/add-ritual')} style={styles.addButton}>
                <LinearGradient
                  colors={[theme.primary, theme.primaryDark]}
                  style={styles.addButtonGradient}
                >
                  <MaterialIcons name="add" size={24} color={theme.background} />
                </LinearGradient>
              </Pressable>
              <Pressable onPress={() => router.push('/profile')} style={styles.profileButton}>
                <MaterialIcons name="person" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* ═══ COSMIC CONTEXT — Square Cards ═══ */}
          <View style={styles.cosmicGrid}>
            <Pressable
              style={[styles.planetCard, { borderColor: todayPlanet.color + '25', borderTopColor: 'rgba(255,255,255,0.15)' }]}
              onPress={() => router.push('/(tabs)/planetary')}
            >
              <View style={styles.planetCardTop}>
                <View style={styles.planetVisualWrap}>
                  <PlanetVisual planetKey={todayPlanet.key} size={38} showGlow={false} />
                </View>
                <View style={[styles.planetDayBadge, { backgroundColor: todayPlanet.color + '33' }]}>
                  <Text style={[styles.planetDayBadgeText, { color: todayPlanet.color }]}>{todayPlanet.day}</Text>
                </View>
              </View>
              <Text style={[styles.planetCardTitle, { color: todayPlanet.color }]}>Day of {todayPlanet.name}</Text>
              <View style={styles.planetWorkingsWrap}>
                {todayPlanet.bestWorkings.slice(0, 4).map((w, i) => (
                  <View key={i} style={[styles.planetWorkingChip, { backgroundColor: todayPlanet.color + '28' }]}>
                    <Text style={[styles.planetWorkingText, { color: todayPlanet.color }]}>{w}</Text>
                  </View>
                ))}
              </View>
              {currentHour ? (
                <View style={styles.planetHourRow}>
                  <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
                    <PlanetVisual planetKey={currentHour.planet.key} size={16} showGlow={false} />
                  </View>
                  <Text style={styles.planetHourText}>
                    {currentHour.planet.name} hour · {formatHourTime(currentHour.startTime)}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <View style={styles.moonCard}>
              <View style={styles.moonVisualWrap}>
                <MoonVisual phaseIndex={moonPhaseIndex} size={62} />
              </View>
              <Text style={styles.moonPhaseName}>{moonPhase.name}</Text>
              <Text style={styles.moonEnergy} numberOfLines={2}>{moonPhase.energy}</Text>
            </View>
          </View>

          {/* ═══ OVERDUE ALERTS ═══ */}
          {overdueRituals.length > 0 ? (
            <View style={styles.alertsSection}>
              <View style={styles.alertsHeader}>
                <MaterialIcons name="error-outline" size={16} color={theme.error} />
                <Text style={styles.alertsTitle}>{overdueRituals.length} Past Due</Text>
              </View>
              {overdueRituals.map(r => {
                const catColor = categoryColors[r.category] || theme.accent;
                const cat = categories.find(c => c.id === r.category);
                const days = r.scheduledDate ? getDaysUntil(r.scheduledDate) : null;
                return (
                  <Pressable
                    key={r.id}
                    style={styles.alertBanner}
                    onPress={() => router.push(`/ritual/${r.id}`)}
                  >
                    <View style={[styles.alertIcon, { backgroundColor: catColor + '20' }]}>
                      <MaterialIcons
                        name={(cat?.icon || 'auto-fix-high') as keyof typeof MaterialIcons.glyphMap}
                        size={18}
                        color={catColor}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.alertName} numberOfLines={1}>{r.name}</Text>
                      {r.intention ? <Text style={styles.alertIntention} numberOfLines={1}>{r.intention}</Text> : null}
                    </View>
                    {days !== null ? (
                      <View style={styles.alertDatePill}>
                        <Text style={styles.alertDateText}>{getOverduePill(days)}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* ═══ PRACTICE OVERVIEW ═══ */}
          <PracticeOverview />

          {/* ═══ RECENT ACTIVITY ═══ */}
          {recentEntries.length > 0 ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <Pressable onPress={() => router.push('/(tabs)/journal')}>
                  <Text style={styles.seeAll}>Journal</Text>
                </Pressable>
              </View>
              {recentEntries.map(entry => {
                const catColor = categoryColors[entry.category] || theme.accent;
                return (
                  <Pressable key={entry.id} style={styles.activityCard} onPress={() => router.push(`/ritual/${entry.ritualId}`)}>
                    <View style={[styles.activityDot, { backgroundColor: catColor }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityRitual}>{entry.ritualName}</Text>
                      <Text style={styles.activityNotes} numberOfLines={2}>{entry.notes}</Text>
                      <View style={styles.activityMeta}>
                        <Text style={styles.activityDate}>
                          {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                        <View style={styles.activityMoodBadge}>
                          <Text style={styles.activityMood}>{entry.mood}</Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, marginBottom: 16 },
  dateText: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
  greeting: {
    fontSize: 26, fontWeight: '700', color: theme.textPrimary, marginTop: 2,
    textShadowColor: 'rgba(245,213,224,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  addButton: {
    width: 44, height: 44, borderRadius: 22, overflow: 'hidden',
  },
  addButtonGradient: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  profileButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },

  // ═══ Cosmic Grid — Square Cards ═══
  cosmicGrid: {
    flexDirection: 'row', gap: 10, marginBottom: 16,
  },
  planetCard: {
    flex: 1.4, backgroundColor: theme.surface, borderRadius: theme.radius.lg,
    padding: 14, borderWidth: 1, borderColor: theme.border, borderTopColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'space-between', minHeight: 155, overflow: 'hidden',
  },
  planetCardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  planetVisualWrap: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  planetDayBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  planetDayBadgeText: { fontSize: 10, fontWeight: '700' },
  planetCardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  planetWorkingsWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8,
  },
  planetWorkingChip: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  planetWorkingText: { fontSize: 10, fontWeight: '600' },
  planetHourRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingTop: 6, borderTopWidth: 1, borderTopColor: theme.border,
  },
  planetHourText: { fontSize: 11, fontWeight: '500', color: theme.textSecondary },

  moonCard: {
    flex: 1, backgroundColor: theme.surface, borderRadius: theme.radius.lg,
    padding: 14, alignItems: 'center', justifyContent: 'center',
    minHeight: 155, borderWidth: 1, borderColor: theme.border, borderTopColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  moonVisualWrap: {
    marginBottom: 6, height: 90, alignItems: 'center', justifyContent: 'center',
  },
  moonPhaseName: { fontSize: 13, fontWeight: '700', color: theme.textPrimary, textAlign: 'center', marginBottom: 4 },
  moonEnergy: { fontSize: 10, fontWeight: '500', color: theme.textSecondary, textAlign: 'center', lineHeight: 14 },

  // ═══ Alerts — overdue only ═══
  alertsSection: { marginBottom: 16 },
  alertsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  alertsTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.error },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.error + '08', borderRadius: theme.radius.md,
    padding: 12, marginBottom: 6,
    borderLeftWidth: 3, borderLeftColor: theme.error,
  },
  alertIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  alertName: { fontSize: 13, fontWeight: '700', color: theme.error, marginBottom: 1 },
  alertIntention: { fontSize: 11, color: theme.textSecondary, fontStyle: 'italic' },
  alertDatePill: {
    backgroundColor: theme.error + '18', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 10, marginLeft: 4,
  },
  alertDateText: { fontSize: 10, fontWeight: '700', color: theme.error },



  // ═══ Sections ═══
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary },
  seeAll: { fontSize: 14, fontWeight: '600', color: theme.primary },

  // ═══ Activity ═══
  activityCard: {
    flexDirection: 'row', backgroundColor: theme.surface, borderRadius: theme.radius.md,
    padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: theme.border, borderTopColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  activityRitual: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, marginBottom: 3 },
  activityNotes: { fontSize: 13, color: theme.textSecondary, lineHeight: 18, marginBottom: 6 },
  activityMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activityDate: { fontSize: 12, color: theme.textMuted },
  activityMoodBadge: { backgroundColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  activityMood: { fontSize: 11, color: theme.textSecondary, fontWeight: '500' },
});
