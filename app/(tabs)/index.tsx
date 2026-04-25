import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme, getCurrentMoonPhase } from '../../constants/theme';
import { getTodayPlanet } from '../../constants/planetaryData';
import { getCurrentPlanetaryHour, formatHourTime, PlanetaryHourInfo } from '../../services/planetaryHours';
import { useApp } from '../../contexts/AppContext';
import { getComputedStatus, getDaysUntil, getUniqueRitualCounts } from '../../services/mockData';

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

function MoonPhaseVisual({ phaseIndex, size }: { phaseIndex: number; size: number }) {
  const radius = size / 2;
  const moonColor = '#E8E4F0';
  const shadowColor = theme.background;
  const glowColor = 'rgba(232, 228, 240, 0.15)';

  if (phaseIndex === 4) {
    return (
      <View style={{
        width: size, height: size, borderRadius: radius,
        backgroundColor: moonColor,
        shadowColor: moonColor, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6, shadowRadius: 12, elevation: 8,
      }} />
    );
  }

  if (phaseIndex === 0) {
    return (
      <View style={{
        width: size, height: size, borderRadius: radius,
        backgroundColor: shadowColor,
        borderWidth: 1.5, borderColor: '#3D3A56',
      }} />
    );
  }

  // Shadow circle offset by phase to create crescent/gibbous shapes
  const offsets: Record<number, number> = {
    1: -0.28, 2: -0.52, 3: -0.82,
    5: 0.82, 6: 0.52, 7: 0.28,
  };
  const offset = (offsets[phaseIndex] || 0) * size;

  return (
    <View style={{
      width: size, height: size, borderRadius: radius,
      backgroundColor: moonColor, overflow: 'hidden',
      shadowColor: moonColor, shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    }}>
      <View style={{
        position: 'absolute', width: size, height: size,
        borderRadius: radius, backgroundColor: shadowColor,
        left: offset, top: 0,
      }} />
    </View>
  );
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

  // Only overdue rituals for alerts
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

  // Practice overview: per-category progress (unique rituals)
  const categoryProgress = useMemo(() => {
    const catMap = new Map<string, { total: number; completed: number; color: string; name: string; icon: string }>();
    categories.forEach(cat => {
      catMap.set(cat.id, { total: 0, completed: 0, color: categoryColors[cat.id] || theme.accent, name: cat.name, icon: cat.icon || 'auto-fix-high' });
    });
    // Group rituals by logical identity per category
    const catGroups = new Map<string, Map<string, typeof rituals>>();
    rituals.forEach(r => {
      if (!catGroups.has(r.category)) catGroups.set(r.category, new Map());
      const groupMap = catGroups.get(r.category)!;
      const key = r.seriesId || r.groupId || r.id;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(r);
    });
    catGroups.forEach((groupMap, catId) => {
      const entry = catMap.get(catId);
      if (!entry) return;
      groupMap.forEach(group => {
        entry.total++;
        const allCompleted = group.every(r => getComputedStatus(r) === 'completed');
        if (allCompleted) entry.completed++;
      });
    });
    return Array.from(catMap.values()).filter(c => c.total > 0);
  }, [rituals, categories, categoryColors]);

  // Overall stats — unique ritual counts (series/groups counted once)
  const uniqueCounts = useMemo(() => getUniqueRitualCounts(rituals), [rituals]);
  const totalRituals = uniqueCounts.total;
  const completedCount = uniqueCounts.completed;
  const overallPct = totalRituals > 0 ? Math.round((completedCount / totalRituals) * 100) : 0;
  const manifestedCount = manifestations.filter(m => m.status === 'manifested').length;
  const signsCount = manifestations.filter(m => m.status === 'partial').length;

  // Recent journal entries
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
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
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
              <MaterialIcons name="add" size={24} color={theme.background} />
            </Pressable>
            <Pressable onPress={() => router.push('/profile')} style={styles.profileButton}>
              <MaterialIcons name="person" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* ═══ COSMIC CONTEXT — Square Cards ═══ */}
        <View style={styles.cosmicGrid}>
          <Pressable
            style={[styles.planetCard, { borderColor: todayPlanet.color + '25' }]}
            onPress={() => router.push('/(tabs)/planetary')}
          >
            <View style={styles.planetCardTop}>
              <Text style={styles.planetEmoji}>{todayPlanet.emoji}</Text>
              <View style={[styles.planetDayBadge, { backgroundColor: todayPlanet.color + '18' }]}>
                <Text style={[styles.planetDayBadgeText, { color: todayPlanet.color }]}>{todayPlanet.day}</Text>
              </View>
            </View>
            <Text style={[styles.planetCardTitle, { color: todayPlanet.color }]}>Day of {todayPlanet.name}</Text>
            <View style={styles.planetWorkingsWrap}>
              {todayPlanet.bestWorkings.slice(0, 4).map((w, i) => (
                <View key={i} style={[styles.planetWorkingChip, { backgroundColor: todayPlanet.color + '12' }]}>
                  <Text style={[styles.planetWorkingText, { color: todayPlanet.color }]}>{w}</Text>
                </View>
              ))}
            </View>
            {currentHour ? (
              <View style={styles.planetHourRow}>
                <Text style={{ fontSize: 11 }}>{currentHour.planet.emoji}</Text>
                <Text style={styles.planetHourText}>
                  {currentHour.planet.name} hour · {formatHourTime(currentHour.startTime)}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <View style={styles.moonCard}>
            <View style={styles.moonVisualWrap}>
              <MoonPhaseVisual phaseIndex={moonPhaseIndex} size={54} />
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
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>Practice Overview</Text>
            <View style={styles.overviewPctChip}>
              <Text style={styles.overviewPctText}>{overallPct}%</Text>
            </View>
          </View>

          {/* Overall progress bar */}
          <View style={styles.overallBarBg}>
            <View style={[styles.overallBarFill, { width: `${Math.max(overallPct, 2)}%` }]} />
          </View>
          <View style={styles.overallBarLabels}>
            <Text style={styles.overallBarLabel}>{completedCount} completed</Text>
            <Text style={styles.overallBarLabel}>{totalRituals} total</Text>
          </View>

          {/* Per-category bars */}
          {categoryProgress.map((cat, i) => {
            const pct = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;
            return (
              <View key={i} style={styles.catProgressRow}>
                <View style={styles.catProgressLabel}>
                  <MaterialIcons name={cat.icon as keyof typeof MaterialIcons.glyphMap} size={14} color={cat.color} />
                  <Text style={styles.catProgressName} numberOfLines={1}>{cat.name}</Text>
                  <Text style={styles.catProgressCount}>{cat.completed}/{cat.total}</Text>
                </View>
                <View style={styles.catBarBg}>
                  <View style={[styles.catBarFill, { width: `${Math.max(pct, 2)}%`, backgroundColor: cat.color }]} />
                </View>
              </View>
            );
          })}

          {/* Manifestation mini-stats */}
          <View style={styles.manifRow}>
            <View style={styles.manifStat}>
              <MaterialIcons name="star" size={14} color={theme.success} />
              <Text style={[styles.manifStatValue, { color: theme.success }]}>{manifestedCount}</Text>
              <Text style={styles.manifStatLabel}>Manifested</Text>
            </View>
            <View style={styles.manifDivider} />
            <View style={styles.manifStat}>
              <MaterialIcons name="eco" size={14} color="#4EA8DE" />
              <Text style={[styles.manifStatValue, { color: '#4EA8DE' }]}>{signsCount}</Text>
              <Text style={styles.manifStatLabel}>Signs</Text>
            </View>
            <View style={styles.manifDivider} />
            <View style={styles.manifStat}>
              <MaterialIcons name="hourglass-top" size={14} color={theme.primary} />
              <Text style={[styles.manifStatValue, { color: theme.primary }]}>{manifestations.filter(m => m.status === 'pending').length}</Text>
              <Text style={styles.manifStatLabel}>Awaiting</Text>
            </View>
          </View>
        </View>

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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, marginBottom: 16 },
  dateText: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
  greeting: { fontSize: 26, fontWeight: '700', color: theme.textPrimary, marginTop: 2 },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', ...theme.shadows.card },
  profileButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },

  // ═══ Cosmic Grid — Square Cards ═══
  cosmicGrid: {
    flexDirection: 'row', gap: 10, marginBottom: 16,
  },
  planetCard: {
    flex: 1.4, backgroundColor: theme.surface, borderRadius: theme.radius.lg,
    padding: 14, borderWidth: 1, justifyContent: 'space-between',
    minHeight: 155, ...theme.shadows.card,
  },
  planetCardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  planetEmoji: { fontSize: 28 },
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
    minHeight: 155, borderWidth: 1, borderColor: theme.border,
    ...theme.shadows.card,
  },
  moonVisualWrap: {
    marginBottom: 10,
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

  // ═══ Practice Overview ═══
  overviewCard: {
    backgroundColor: theme.surface, borderRadius: theme.radius.lg,
    padding: 16, marginBottom: 20, ...theme.shadows.card,
  },
  overviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  overviewTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  overviewPctChip: { backgroundColor: theme.primary + '18', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  overviewPctText: { fontSize: 13, fontWeight: '700', color: theme.primary },

  // Overall bar
  overallBarBg: { height: 8, backgroundColor: theme.surfaceLight, borderRadius: 4, marginBottom: 4, overflow: 'hidden' },
  overallBarFill: { height: 8, backgroundColor: theme.primary, borderRadius: 4 },
  overallBarLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  overallBarLabel: { fontSize: 10, fontWeight: '500', color: theme.textMuted },

  // Category bars
  catProgressRow: { marginBottom: 10 },
  catProgressLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  catProgressName: { flex: 1, fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  catProgressCount: { fontSize: 11, fontWeight: '600', color: theme.textMuted },
  catBarBg: { height: 5, backgroundColor: theme.surfaceLight, borderRadius: 3, overflow: 'hidden' },
  catBarFill: { height: 5, borderRadius: 3 },

  // Manifestation mini-stats
  manifRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.border,
  },
  manifStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  manifStatValue: { fontSize: 15, fontWeight: '700' },
  manifStatLabel: { fontSize: 10, fontWeight: '500', color: theme.textMuted },
  manifDivider: { width: 1, height: 18, backgroundColor: theme.border },

  // ═══ Sections ═══
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary },
  seeAll: { fontSize: 14, fontWeight: '600', color: theme.primary },

  // ═══ Activity ═══
  activityCard: { flexDirection: 'row', backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 14, marginBottom: 8, gap: 12, ...theme.shadows.card },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  activityRitual: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, marginBottom: 3 },
  activityNotes: { fontSize: 13, color: theme.textSecondary, lineHeight: 18, marginBottom: 6 },
  activityMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activityDate: { fontSize: 12, color: theme.textMuted },
  activityMoodBadge: { backgroundColor: theme.surfaceLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  activityMood: { fontSize: 11, color: theme.textSecondary, fontWeight: '500' },
});
