
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ReAnimated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay } from 'react-native-reanimated';
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

// ═══ Animated Star Field ═══
interface StarData {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  baseOpacity: number;
  delay: number;
  duration: number;
}

function AnimatedStar({ star }: { star: StarData }) {
  const opacity = useSharedValue(star.baseOpacity * 0.2);

  useEffect(() => {
    opacity.value = withDelay(
      star.delay,
      withRepeat(
        withSequence(
          withTiming(star.baseOpacity, { duration: star.duration }),
          withTiming(star.baseOpacity * 0.2, { duration: star.duration }),
        ),
        -1,
        true
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <ReAnimated.View
      style={[
        {
          position: 'absolute',
          left: `${star.x}%` as any,
          top: `${star.y}%` as any,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          backgroundColor: star.color,
        },
        animStyle,
      ]}
    />
  );
}

function ShootingStar() {
  const { width: screenW, height: screenH } = Dimensions.get('window');
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const trailScale = useSharedValue(0.3);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    const startX = Math.random() * (screenW * 0.6) + screenW * 0.05;
    const startY = Math.random() * (screenH * 0.45) + 20;
    const travel = 120 + Math.random() * 80;

    translateX.value = startX;
    translateY.value = startY;
    trailScale.value = 0.3;

    opacity.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withTiming(0.75, { duration: 380 }),
      withTiming(0, { duration: 140 }),
    );
    trailScale.value = withSequence(
      withTiming(1, { duration: 120 }),
      withTiming(0.5, { duration: 480 }),
    );
    translateX.value = withTiming(startX + travel, { duration: 600 });
    translateY.value = withTiming(startY + travel * 0.55, { duration: 600 });
  }, [screenW, screenH]);

  useEffect(() => {
    const scheduleNext = () => {
      const delay = 8000 + Math.random() * 4000;
      timeoutRef.current = setTimeout(() => {
        trigger();
        scheduleNext();
      }, delay);
    };
    timeoutRef.current = setTimeout(() => {
      trigger();
      scheduleNext();
    }, 3000);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [trigger]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: '30deg' },
      { scaleX: trailScale.value },
    ],
  }));

  return (
    <ReAnimated.View
      style={[{ position: 'absolute', width: 64, height: 2, zIndex: 2 }, animStyle]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={['transparent', 'rgba(245,213,224,0.3)', '#F5D5E0', '#FFFFFF']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ width: 64, height: 2, borderRadius: 1 }}
      />
      {/* Bright head dot */}
      <View style={{
        position: 'absolute', right: -1, top: -1.5,
        width: 5, height: 5, borderRadius: 2.5,
        backgroundColor: '#FFFFFF',
        shadowColor: '#F5D5E0', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9, shadowRadius: 6, elevation: 4,
      }} />
    </ReAnimated.View>
  );
}

function StarField() {
  const stars = useMemo(() => {
    const result: StarData[] = [];
    for (let i = 0; i < 80; i++) {
      let size: number, baseOpacity: number, color: string;
      if (i < 12) {
        size = 2.5 + Math.random() * 0.5;
        baseOpacity = 0.8 + Math.random() * 0.2;
        color = Math.random() < 0.2 ? '#F5D5E0' : '#FFFFFF';
      } else if (i < 36) {
        size = 1.5;
        baseOpacity = 0.5 + Math.random() * 0.2;
        color = '#FFFFFF';
      } else {
        size = 0.8 + Math.random() * 0.2;
        baseOpacity = 0.2 + Math.random() * 0.2;
        color = '#FFFFFF';
      }
      result.push({
        id: i,
        x: Math.random() * 96 + 2,
        y: Math.random() * 96 + 2,
        size,
        color,
        baseOpacity,
        delay: Math.random() * 4000,
        duration: 2000 + Math.random() * 3000,
      });
    }
    return result;
  }, []);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }} pointerEvents="none">
      {stars.map(star => (
        <AnimatedStar key={star.id} star={star} />
      ))}
      <ShootingStar />
    </View>
  );
}

export { StarField };

function MoonPhaseVisual({ phaseIndex, size }: { phaseIndex: number; size: number }) {
  const radius = size / 2;
  const moonColor = theme.textPrimary;
  const shadowColor = theme.background;

  if (phaseIndex === 4) {
    return (
      <View style={{
        width: size, height: size, borderRadius: radius,
        backgroundColor: moonColor,
        shadowColor: theme.textPrimary, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
      }} />
    );
  }

  if (phaseIndex === 0) {
    return (
      <View style={{
        width: size, height: size, borderRadius: radius,
        backgroundColor: shadowColor,
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
      }} />
    );
  }

  const offsets: Record<number, number> = {
    1: -0.28, 2: -0.52, 3: -0.82,
    5: 0.82, 6: 0.52, 7: 0.28,
  };
  const offset = (offsets[phaseIndex] || 0) * size;

  return (
    <View style={{
      width: size, height: size, borderRadius: radius,
      backgroundColor: moonColor, overflow: 'hidden',
      shadowColor: theme.textPrimary, shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5, shadowRadius: 16, elevation: 4,
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

  const categoryProgress = useMemo(() => {
    const catMap = new Map<string, { total: number; completed: number; color: string; name: string; icon: string }>();
    categories.forEach(cat => {
      catMap.set(cat.id, { total: 0, completed: 0, color: categoryColors[cat.id] || theme.accent, name: cat.name, icon: cat.icon || 'auto-fix-high' });
    });
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

  const uniqueCounts = useMemo(() => getUniqueRitualCounts(rituals), [rituals]);
  const totalRituals = uniqueCounts.total;
  const completedCount = uniqueCounts.completed;
  const overallPct = totalRituals > 0 ? Math.round((completedCount / totalRituals) * 100) : 0;
  const manifestedCount = manifestations.filter(m => m.status === 'manifested').length;
  const signsCount = manifestations.filter(m => m.status === 'partial').length;

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
          colors={['rgba(150,80,180,0.4)', 'rgba(100,60,160,0.1)', 'rgba(80,50,150,0.15)', 'rgba(102,103,171,0.25)']}
          locations={[0, 0.35, 0.65, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
          pointerEvents="none"
        />
        {/* Top highlight */}
        <LinearGradient
          colors={['rgba(180,120,220,0.3)', 'transparent']}
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
        <StarField />

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
                <Text style={styles.planetEmoji}>{todayPlanet.emoji}</Text>
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
              <View style={[styles.overallBarFill, { width: `${Math.max(overallPct, 2)}%` }]}>
                <LinearGradient
                  colors={[theme.primaryDark, theme.primary, '#E0A8C0']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ flex: 1, borderRadius: 4 }}
                />
              </View>
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
    minHeight: 155, borderWidth: 1, borderColor: theme.border, borderTopColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
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
    padding: 16, marginBottom: 20, borderWidth: 1, borderColor: theme.border, borderTopColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  overviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  overviewTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  overviewPctChip: { backgroundColor: theme.primary + '18', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  overviewPctText: { fontSize: 13, fontWeight: '700', color: theme.primary },

  // Overall bar
  overallBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 4, marginBottom: 4, overflow: 'hidden' },
  overallBarFill: { height: 8, borderRadius: 4, overflow: 'hidden' },
  overallBarLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  overallBarLabel: { fontSize: 10, fontWeight: '500', color: theme.textMuted },

  // Category bars
  catProgressRow: { marginBottom: 10 },
  catProgressLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  catProgressName: { flex: 1, fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  catProgressCount: { fontSize: 11, fontWeight: '600', color: theme.textMuted },
  catBarBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 3, overflow: 'hidden' },
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
