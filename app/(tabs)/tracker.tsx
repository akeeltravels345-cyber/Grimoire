import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import { useApp } from '../../contexts/AppContext';
import { getComputedStatus, getDaysUntil, getUniqueRitualCounts, Ritual } from '../../services/mockData';
import StarField from '../../components/StarField';

type StatusFilter = 'all' | 'scheduled' | 'approaching' | 'completed' | 'overdue';

const STATUS_CONFIG = {
  scheduled: { color: theme.accent, label: 'Scheduled', icon: 'event' as const },
  approaching: { color: theme.warning, label: 'Approaching', icon: 'notifications-active' as const },
  completed: { color: theme.success, label: 'Completed', icon: 'check-circle' as const },
  overdue: { color: theme.error, label: 'Overdue', icon: 'error-outline' as const },
} as const;

const DAY_ABBRS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_PILL_WIDTH = 52;
const DAY_PILL_GAP = 6;

// Generate all days of current month
function getMonthDays(): Date[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: Date[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDaysLabel(days: number): string {
  if (days < -1) return `${Math.abs(days)}d overdue`;
  if (days === -1) return '1d overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

type RitualWithComputed = Ritual & { computedStatus: 'scheduled' | 'approaching' | 'completed' | 'overdue' };

interface GroupedSection {
  key: string;
  label: string;
  color: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  rituals: RitualWithComputed[];
  dimmed?: boolean;
}

const scheduleLabels: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', moon_phase: 'Moon', as_needed: 'As Needed', monthly: 'Monthly',
};

export default function TrackerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { rituals, categories, categoryColors, updateStatus } = useApp();
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const dateScrollRef = useRef<ScrollView>(null);

  const today = useMemo(() => new Date(), []);
  const monthDays = useMemo(() => getMonthDays(), []);

  // Auto-scroll to today on mount
  useEffect(() => {
    const todayIndex = today.getDate() - 1;
    const scrollX = Math.max(0, todayIndex * (DAY_PILL_WIDTH + DAY_PILL_GAP) - 140);
    setTimeout(() => {
      dateScrollRef.current?.scrollTo({ x: scrollX, animated: true });
    }, 300);
  }, [today]);

  // Compute status for every ritual
  const ritualsWithComputed = useMemo(() => {
    return rituals.map(r => ({
      ...r,
      computedStatus: getComputedStatus(r),
    }));
  }, [rituals]);

  const counts = useMemo(() => {
    return getUniqueRitualCounts(rituals);
  }, [rituals]);

  // Map scheduled dates to ritual statuses for dot indicators
  const dayRitualMap = useMemo(() => {
    const map = new Map<string, RitualWithComputed[]>();
    ritualsWithComputed.forEach(r => {
      if (r.scheduledDate) {
        const d = new Date(r.scheduledDate);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r);
      }
    });
    return map;
  }, [ritualsWithComputed]);

  // Apply filters
  const filtered = useMemo(() => {
    let list = ritualsWithComputed;

    // Day filter
    if (selectedDay) {
      list = list.filter(r => {
        if (!r.scheduledDate) return false;
        const d = new Date(r.scheduledDate);
        return isSameDay(d, selectedDay);
      });
    }

    // Status filter
    if (activeFilter !== 'all') {
      list = list.filter(r => r.computedStatus === activeFilter);
    }

    return list;
  }, [ritualsWithComputed, activeFilter, selectedDay]);

  const isFiltered = activeFilter !== 'all' || selectedDay !== null;

  // Sort: overdue → approaching → scheduled → completed
  const sortedFiltered = useMemo(() => {
    const order: Record<string, number> = { overdue: 0, approaching: 1, scheduled: 2, completed: 3 };
    return [...filtered].sort((a, b) => {
      const oa = order[a.computedStatus] ?? 2;
      const ob = order[b.computedStatus] ?? 2;
      if (oa !== ob) return oa - ob;
      // Within same status, sort by scheduledDate
      const da = a.scheduledDate ? new Date(a.scheduledDate).getTime() : Infinity;
      const db = b.scheduledDate ? new Date(b.scheduledDate).getTime() : Infinity;
      return da - db;
    });
  }, [filtered]);

  // Grouped sections (only when not filtered)
  const groupedSections = useMemo((): GroupedSection[] => {
    if (isFiltered) return [];
    const groups: GroupedSection[] = [
      { key: 'overdue', label: 'Overdue', color: theme.error, icon: 'error-outline', rituals: [] },
      { key: 'approaching', label: 'Approaching Soon', color: theme.warning, icon: 'notifications-active', rituals: [] },
      { key: 'scheduled', label: 'Scheduled', color: theme.accent, icon: 'event', rituals: [] },
      { key: 'completed', label: 'Completed', color: theme.success, icon: 'check-circle', rituals: [], dimmed: true },
    ];
    ritualsWithComputed.forEach(r => {
      const g = groups.find(g => g.key === r.computedStatus);
      if (g) g.rituals.push(r);
    });
    // Sort within each group by date
    groups.forEach(g => {
      g.rituals.sort((a, b) => {
        const da = a.scheduledDate ? new Date(a.scheduledDate).getTime() : Infinity;
        const db = b.scheduledDate ? new Date(b.scheduledDate).getTime() : Infinity;
        return da - db;
      });
    });
    return groups.filter(g => g.rituals.length > 0);
  }, [ritualsWithComputed, isFiltered]);

  const toggleFilter = useCallback((status: StatusFilter) => {
    setActiveFilter(prev => prev === status ? 'all' : status);
    Haptics.selectionAsync();
  }, []);

  const toggleDay = useCallback((day: Date) => {
    setSelectedDay(prev => {
      if (prev && isSameDay(prev, day)) return null;
      return day;
    });
    Haptics.selectionAsync();
  }, []);

  const handleComplete = useCallback((ritualId: string) => {
    updateStatus(ritualId, 'completed');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [updateStatus]);

  const currentMonth = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const renderRitualRow = (ritual: RitualWithComputed, dimmed?: boolean) => {
    const cfg = STATUS_CONFIG[ritual.computedStatus];
    const catColor = categoryColors[ritual.category] || theme.accent;
    const cat = categories.find(c => c.id === ritual.category);
    const isAsNeeded = ritual.schedule === 'as_needed' && !ritual.scheduledDate;
    const days = ritual.scheduledDate ? getDaysUntil(ritual.scheduledDate) : null;
    const daysLabel = days !== null ? getDaysLabel(days) : null;
    const isOverdue = days !== null && days < 0;
    const isUrgent = days !== null && days >= 0 && days <= 1;

    return (
      <Pressable
        key={ritual.id}
        style={[styles.ritualRow, dimmed ? { opacity: 0.55 } : null]}
        onPress={() => router.push(`/ritual/${ritual.id}`)}
      >
        <View style={[styles.ritualStrip, { backgroundColor: cfg.color }]} />
        <View style={styles.ritualBody}>
          <View style={styles.ritualTopRow}>
            <View style={[styles.catIcon, { backgroundColor: catColor + '20' }]}>
              <MaterialIcons
                name={(cat?.icon || 'auto-fix-high') as keyof typeof MaterialIcons.glyphMap}
                size={22}
                color={catColor}
              />
            </View>
            <View style={styles.ritualInfo}>
              <Text style={styles.ritualName} numberOfLines={1}>{ritual.name}</Text>
              {ritual.intention ? (
                <Text style={styles.ritualIntention} numberOfLines={1}>{ritual.intention}</Text>
              ) : null}
            </View>
            {ritual.computedStatus !== 'completed' ? (
              <Pressable
                style={styles.completeBtn}
                onPress={(e) => { e.stopPropagation?.(); handleComplete(ritual.id); }}
                hitSlop={8}
              >
                <MaterialIcons name="check" size={16} color={theme.success} />
                <Text style={styles.completeBtnText}>Done</Text>
              </Pressable>
            ) : (
              <MaterialIcons name="check-circle" size={20} color={theme.success + '80'} />
            )}
          </View>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: catColor + '18' }]}>
              <Text style={[styles.badgeText, { color: catColor }]}>{cat?.name || ritual.category}</Text>
            </View>
            {isAsNeeded ? (
              <View style={styles.badge}>
                <MaterialIcons name="more-time" size={10} color={theme.textMuted} />
                <Text style={styles.badgeText}>As Needed</Text>
              </View>
            ) : (
              <>
                {daysLabel ? (
                  <View style={[
                    styles.badge,
                    isOverdue ? { backgroundColor: theme.error + '18' } : isUrgent ? { backgroundColor: theme.warning + '18' } : null,
                  ]}>
                    <MaterialIcons
                      name="event"
                      size={10}
                      color={isOverdue ? theme.error : isUrgent ? theme.warning : theme.textMuted}
                    />
                    <Text style={[
                      styles.badgeText,
                      isOverdue ? { color: theme.error } : isUrgent ? { color: theme.warning } : null,
                    ]}>{daysLabel}</Text>
                  </View>
                ) : null}
                <View style={styles.badge}>
                  <MaterialIcons name="schedule" size={10} color={theme.textMuted} />
                  <Text style={styles.badgeText}>{scheduleLabels[ritual.schedule] || ritual.schedule}</Text>
                </View>
              </>
            )}
            {(ritual.seriesId || ritual.groupId) ? (
              <View style={[styles.badge, { backgroundColor: theme.accent + '12' }]}>
                <MaterialIcons name="repeat" size={10} color={theme.accent} />
                <Text style={[styles.badgeText, { color: theme.accent }]}>Series</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <LinearGradient
        colors={[theme.primary + '28', theme.primary + '10', 'transparent']}
        locations={[0, 0.4, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320, zIndex: 0 }}
        pointerEvents="none"
      />
      <StarField starCount={35} showShootingStar={false} />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Practice Tracker</Text>
          <Text style={styles.subtitle}>{currentMonth}</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => router.push('/add-ritual')}>
          <MaterialIcons name="add" size={22} color={theme.background} />
        </Pressable>
      </View>

      {/* Status Filter Cards */}
      <View style={styles.statusRow}>
        {(['scheduled', 'approaching', 'completed'] as const).map(status => {
          const cfg = STATUS_CONFIG[status];
          const isActive = activeFilter === status;
          return (
            <Pressable
              key={status}
              style={[
                styles.statusCard,
                { borderLeftColor: cfg.color },
                isActive && { borderColor: cfg.color, backgroundColor: cfg.color + '10' },
              ]}
              onPress={() => toggleFilter(status)}
            >
              <MaterialIcons name={cfg.icon} size={18} color={cfg.color} />
              <Text style={[styles.statusCount, { color: cfg.color }]}>{counts[status]}</Text>
              <Text style={styles.statusLabel}>{cfg.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Overdue banner */}
      {counts.overdue > 0 ? (
        <Pressable
          style={[styles.overdueBanner, activeFilter === 'overdue' && { borderColor: theme.error }]}
          onPress={() => toggleFilter('overdue')}
        >
          <MaterialIcons name="error-outline" size={16} color={theme.error} />
          <Text style={styles.overdueText}>
            {counts.overdue} overdue ritual{counts.overdue > 1 ? 's' : ''} need attention
          </Text>
          <MaterialIcons name={activeFilter === 'overdue' ? 'close' : 'chevron-right'} size={18} color={theme.error} />
        </Pressable>
      ) : null}

      {/* Date Strip Calendar */}
      <View style={styles.dateStripContainer}>
        <ScrollView
          ref={dateScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateStripContent}
        >
          {monthDays.map((day, i) => {
            const isToday = isSameDay(day, today);
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
            const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
            const dayRituals = dayRitualMap.get(dayKey) || [];
            // Take up to 3 dots
            const dots = dayRituals.slice(0, 3).map(r => STATUS_CONFIG[r.computedStatus].color);

            return (
              <Pressable
                key={i}
                style={[
                  styles.dayPill,
                  isToday && styles.dayPillToday,
                  isSelected && styles.dayPillSelected,
                ]}
                onPress={() => toggleDay(day)}
              >
                <Text style={[
                  styles.dayAbbr,
                  isToday && styles.dayAbbrToday,
                  isSelected && styles.dayAbbrSelected,
                ]}>
                  {DAY_ABBRS[day.getDay()]}
                </Text>
                <Text style={[
                  styles.dayNum,
                  isToday && styles.dayNumToday,
                  isSelected && styles.dayNumSelected,
                ]}>
                  {day.getDate()}
                </Text>
                <View style={styles.dotRow}>
                  {dots.map((color, di) => (
                    <View key={di} style={[styles.dot, { backgroundColor: color }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter indicator */}
      {isFiltered ? (
        <View style={styles.filterBar}>
          <Text style={styles.filterText}>
            {selectedDay
              ? `${selectedDay.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
              : ''}
            {selectedDay && activeFilter !== 'all' ? ' · ' : ''}
            {activeFilter !== 'all' ? `${activeFilter}` : ''}
            {` (${sortedFiltered.length})`}
          </Text>
          <Pressable onPress={() => { setActiveFilter('all'); setSelectedDay(null); }}>
            <Text style={styles.filterClear}>Clear Filters</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Ritual List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
      >
        {isFiltered ? (
          // Flat list when filtered
          sortedFiltered.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-available" size={48} color={theme.textMuted} />
              <Text style={styles.emptyTitle}>No rituals found</Text>
              <Text style={styles.emptyText}>Try adjusting your filters or add new rituals</Text>
            </View>
          ) : (
            sortedFiltered.map(r => renderRitualRow(r))
          )
        ) : (
          // Grouped sections when unfiltered
          groupedSections.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-available" size={48} color={theme.textMuted} />
              <Text style={styles.emptyTitle}>No rituals yet</Text>
              <Text style={styles.emptyText}>Add rituals to start tracking your monthly practice</Text>
            </View>
          ) : (
            groupedSections.map((section, si) => (
              <View key={section.key}>
                {si > 0 ? <View style={styles.sectionDivider} /> : null}
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: section.color }]} />
                  <MaterialIcons name={section.icon} size={16} color={section.color} />
                  <Text style={[styles.sectionLabel, { color: section.color }]}>{section.label}</Text>
                  <Text style={styles.sectionCount}>{section.rituals.length}</Text>
                </View>
                {section.rituals.map(r => renderRitualRow(r, section.dimmed))}
              </View>
            ))
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10,
  },
  title: { fontSize: 26, fontWeight: '700', color: theme.textPrimary },
  subtitle: { fontSize: 13, color: theme.textSecondary, fontWeight: '500', marginTop: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center',
  },

  // Status Cards
  statusRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  statusCard: {
    flex: 1, backgroundColor: theme.surface, borderRadius: theme.radius.md,
    paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 3,
    borderLeftWidth: 3, borderWidth: 1, borderColor: theme.border,
    ...theme.shadows.card,
  },
  statusCount: { fontSize: 22, fontWeight: '700' },
  statusLabel: { fontSize: 9, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Overdue Banner
  overdueBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.error + '0A', borderRadius: theme.radius.md,
    paddingVertical: 10, paddingHorizontal: 14, marginHorizontal: 16, marginBottom: 8,
    borderWidth: 1, borderColor: theme.error + '30',
  },
  overdueText: { flex: 1, fontSize: 12, fontWeight: '600', color: theme.error },

  // Date Strip
  dateStripContainer: {
    borderBottomWidth: 1, borderBottomColor: theme.border,
    paddingBottom: 10, marginBottom: 4,
  },
  dateStripContent: {
    paddingHorizontal: 12, gap: DAY_PILL_GAP,
  },
  dayPill: {
    width: DAY_PILL_WIDTH, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 14,
    backgroundColor: theme.surface, borderWidth: 1.5, borderColor: 'transparent',
  },
  dayPillToday: {
    borderColor: theme.primary,
    backgroundColor: theme.primary + '0C',
  },
  dayPillSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primary + '20',
  },
  dayAbbr: { fontSize: 10, fontWeight: '600', color: theme.textMuted, marginBottom: 2 },
  dayAbbrToday: { color: theme.primary },
  dayAbbrSelected: { color: theme.primary },
  dayNum: { fontSize: 16, fontWeight: '700', color: theme.textSecondary },
  dayNumToday: { color: theme.primary },
  dayNumSelected: { color: theme.primary },
  dotRow: { flexDirection: 'row', gap: 3, marginTop: 4, minHeight: 6 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },

  // Filter Bar
  filterBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  filterText: { fontSize: 12, fontWeight: '500', color: theme.textSecondary, textTransform: 'capitalize' },
  filterClear: { fontSize: 12, fontWeight: '600', color: theme.primary },

  // Section headers (grouped mode)
  sectionDivider: { height: 1, backgroundColor: theme.border, marginVertical: 12, marginHorizontal: 4 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 10, paddingHorizontal: 4,
  },
  sectionDot: { width: 4, height: 18, borderRadius: 2 },
  sectionLabel: { fontSize: 14, fontWeight: '700', flex: 1 },
  sectionCount: { fontSize: 12, fontWeight: '600', color: theme.textMuted,
    backgroundColor: theme.surfaceLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginTop: 16, marginBottom: 6 },
  emptyText: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },

  // Ritual Row
  ritualRow: {
    flexDirection: 'row', backgroundColor: theme.surface,
    borderRadius: theme.radius.md, marginBottom: 8, overflow: 'hidden',
    ...theme.shadows.card,
  },
  ritualStrip: { width: 4 },
  ritualBody: { flex: 1, padding: 12, gap: 8 },
  ritualTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ritualInfo: { flex: 1 },
  ritualName: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, marginBottom: 1 },
  ritualIntention: { fontSize: 12, color: theme.textSecondary, fontStyle: 'italic' },
  completeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: theme.success + '40', backgroundColor: theme.success + '08',
  },
  completeBtnText: { fontSize: 11, fontWeight: '700', color: theme.success },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginLeft: 50 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
    backgroundColor: theme.surfaceLight,
  },
  badgeText: { fontSize: 10, fontWeight: '600', color: theme.textMuted },
});
