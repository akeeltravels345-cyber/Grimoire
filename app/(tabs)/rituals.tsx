import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { theme, getCurrentMoonPhase } from '../../constants/theme';
import { getTodayPlanet } from '../../constants/planetaryData';
import { getCurrentPlanetaryHour } from '../../services/planetaryHours';
import { useApp } from '../../contexts/AppContext';
import { useAlert } from '@/template';
import { getComputedStatus, getDaysUntil, getUniqueRitualCounts, Ritual } from '../../services/mockData';
import SwipeableRow from '../../components/SwipeableRow';
import GradientScreen from '../../components/GradientScreen';
import { resolveCategoryColor, resolveCategory } from '../../utils/categoryHelpers';

type TabMode = 'library' | 'practice' | 'manifestations';
type StatusFilter = 'all' | 'scheduled' | 'approaching' | 'completed' | 'overdue';
type TimelineView = 'list' | 'week' | 'month';

const STATUS_CONFIG = {
  scheduled: { color: theme.accent, label: 'Scheduled', icon: 'event' as const },
  approaching: { color: theme.warning, label: 'Approaching', icon: 'notifications-active' as const },
  completed: { color: theme.success, label: 'Done', icon: 'check-circle' as const },
  overdue: { color: theme.error, label: 'Overdue', icon: 'error-outline' as const },
} as const;

const DAY_ABBRS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_PILL_WIDTH = 48;
const DAY_PILL_HEIGHT = 64;
const DAY_PILL_GAP = 6;

const scheduleLabels: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', moon_phase: 'Moon', as_needed: 'As Needed', monthly: 'Monthly',
};

function getMonthDays(): Date[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: Date[] = [];
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDaysLabel(days: number): string {
  if (days < -1) return `${Math.abs(days)}d late`;
  if (days === -1) return '1d late';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days}d`;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(weekStart: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function getCalendarGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = firstDay.getDay();
  const grid: (Date | null)[][] = [];
  let week: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) { grid.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    grid.push(week);
  }
  return grid;
}

type RitualWithComputed = Ritual & { computedStatus: 'scheduled' | 'approaching' | 'completed' | 'overdue' };

function getStatusStyle(status: string) {
  switch (status) {
    case 'brewing':  return { bg: theme.primary + '18', border: theme.primary, color: theme.primary, label: '\ud83e\ude84 Brewing' };
    case 'stirring': return { bg: '#4EA8DE22', border: '#4EA8DE', color: '#4EA8DE', label: '\ud83c\udf0a Stirring' };
    case 'spilled':  return { bg: theme.success + '18', border: theme.success, color: theme.success, label: '\u2b50 Spilled' };
    default: return { bg: theme.surfaceLight, border: theme.border, color: theme.textMuted, label: status };
  }
}

export default function RitualsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { rituals, libraryRituals, categories, categoryColors, manifestations, updateStatus, updateRitual, deleteRitual, deleteLibraryRitual, deleteFutureInSeries, stopSchedule, addJournalEntry, moods, addMood, deleteMood } = useApp();
  const { showAlert } = useAlert();

  const [tabMode, setTabMode] = useState<TabMode>('library');
  const [timelineView, setTimelineView] = useState<TimelineView>('list');
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [manifFilter, setManifFilter] = useState<'all' | 'brewing' | 'stirring' | 'spilled'>('all');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedCalDay, setSelectedCalDay] = useState<Date | null>(null);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const dateScrollRef = useRef<ScrollView>(null);

  const [libSearch, setLibSearch] = useState('');
  const [libCategory, setLibCategory] = useState<string>('all');
  const [showLibSearch, setShowLibSearch] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [quickLogRitualId, setQuickLogRitualId] = useState<string | null>(null);
  const [quickLogMood, setQuickLogMood] = useState('');
  const [quickLogNotes, setQuickLogNotes] = useState('');
  const [quickLogDate, setQuickLogDate] = useState<Date>(new Date());
  const [showQuickDatePicker, setShowQuickDatePicker] = useState(false);
  const [isAddingMood, setIsAddingMood] = useState(false);
  const [newMoodText, setNewMoodText] = useState('');

  const today = useMemo(() => new Date(), []);
  const monthDays = useMemo(() => getMonthDays(), []);

  useEffect(() => {
    if (timelineView === 'list' && tabMode === 'practice') {
      const todayIndex = today.getDate() - 1;
      const scrollX = Math.max(0, todayIndex * (DAY_PILL_WIDTH + DAY_PILL_GAP) - 140);
      setTimeout(() => { dateScrollRef.current?.scrollTo({ x: scrollX, animated: true }); }, 300);
    }
  }, [today, timelineView, tabMode]);

  const ritualsWithComputed = useMemo(() => rituals.map(r => ({ ...r, computedStatus: getComputedStatus(r) })), [rituals]);
  const counts = useMemo(() => getUniqueRitualCounts(rituals), [rituals]);
  const loggedCompleteCount = useMemo(() => rituals.filter(r => r.status === 'completed' && r.timesPerformed > 0).length, [rituals]);

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

  const filteredLibrary = useMemo(() => {
    let list = libraryRituals;
    if (libSearch.trim()) {
      const q = libSearch.toLowerCase().trim();
      list = list.filter(r => {
        const cat = categories.find(c => c.id === r.category);
        return r.name.toLowerCase().includes(q) ||
          r.intention?.toLowerCase().includes(q) ||
          cat?.name.toLowerCase().includes(q);
      });
    }
    if (libCategory !== 'all') list = list.filter(r => r.category === libCategory);
    return list;
  }, [libraryRituals, libSearch, libCategory, categories]);

  const libraryInPractice = useMemo(() => {
    const set = new Set<string>();
    rituals.forEach(r => { if (r.libraryId) set.add(r.libraryId); });
    return set;
  }, [rituals]);

  const currentWeekStart = useMemo(() => { const base = getWeekStart(today); base.setDate(base.getDate() + weekOffset * 7); return base; }, [today, weekOffset]);
  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);
  const weekRitualMap = useMemo(() => { const map = new Map<string, RitualWithComputed[]>(); weekDays.forEach(day => { const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`; map.set(key, dayRitualMap.get(key) || []); }); return map; }, [weekDays, dayRitualMap]);
  const weekStats = useMemo(() => { let total = 0; let completed = 0; weekDays.forEach(day => { const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`; (weekRitualMap.get(key) || []).forEach(r => { total++; if (r.computedStatus === 'completed') completed++; }); }); return { total, completed, pct: total > 0 ? Math.round((completed / total) * 100) : 0 }; }, [weekDays, weekRitualMap]);
  const weekLabel = useMemo(() => { const start = weekDays[0]; const end = weekDays[6]; if (start.getMonth() === end.getMonth()) return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()}\u2013${end.getDate()}`; return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}\u2013${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`; }, [weekDays]);

  const calMonth = useMemo(() => { const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1); return { year: d.getFullYear(), month: d.getMonth() }; }, [today, monthOffset]);
  const calGrid = useMemo(() => getCalendarGrid(calMonth.year, calMonth.month), [calMonth]);
  const calLabel = useMemo(() => new Date(calMonth.year, calMonth.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), [calMonth]);
  const monthStats = useMemo(() => { let total = 0; let completed = 0; let overdue = 0; let approaching = 0; const dim = new Date(calMonth.year, calMonth.month + 1, 0).getDate(); for (let d = 1; d <= dim; d++) { const date = new Date(calMonth.year, calMonth.month, d); const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; (dayRitualMap.get(key) || []).forEach(r => { total++; if (r.computedStatus === 'completed') completed++; if (r.computedStatus === 'overdue') overdue++; if (r.computedStatus === 'approaching') approaching++; }); } return { total, completed, overdue, approaching, pct: total > 0 ? Math.round((completed / total) * 100) : 0 }; }, [calMonth, dayRitualMap]);
  const selectedDayRituals = useMemo(() => { if (!selectedCalDay) return []; const key = `${selectedCalDay.getFullYear()}-${selectedCalDay.getMonth()}-${selectedCalDay.getDate()}`; return dayRitualMap.get(key) || []; }, [selectedCalDay, dayRitualMap]);

  const filtered = useMemo(() => {
    let list = ritualsWithComputed;
    if (selectedDay) list = list.filter(r => r.scheduledDate ? isSameDay(new Date(r.scheduledDate), selectedDay) : false);
    if (activeFilter !== 'all') list = list.filter(r => r.computedStatus === activeFilter);
    if (activeCategory !== 'all') list = list.filter(r => r.category === activeCategory);
    return list;
  }, [ritualsWithComputed, activeFilter, selectedDay, activeCategory]);
  const isFiltered = activeFilter !== 'all' || selectedDay !== null || activeCategory !== 'all';
  const sortedFiltered = useMemo(() => { const order: Record<string, number> = { overdue: 0, approaching: 1, scheduled: 2, completed: 3 }; return [...filtered].sort((a, b) => { const oa = order[a.computedStatus] ?? 2; const ob = order[b.computedStatus] ?? 2; if (oa !== ob) return oa - ob; const da = a.scheduledDate ? new Date(a.scheduledDate).getTime() : Infinity; const db = b.scheduledDate ? new Date(b.scheduledDate).getTime() : Infinity; return da - db; }); }, [filtered]);

  const filteredManifestations = manifestations.filter(m => { if (manifFilter === 'all') return true; if (manifFilter === 'brewing') return m.status === 'brewing'; if (manifFilter === 'stirring') return m.status === 'stirring'; if (manifFilter === 'spilled') return m.status === 'spilled'; return true; });
  const pendingCount = manifestations.filter(m => m.status === 'brewing' || m.status === 'stirring').length;
  const manifestedCount = manifestations.filter(m => m.status === 'spilled').length;

  const toggleFilter = useCallback((status: StatusFilter) => { setActiveFilter(prev => prev === status ? 'all' : status); Haptics.selectionAsync(); }, []);
  const toggleDay = useCallback((day: Date) => { setSelectedDay(prev => prev && isSameDay(prev, day) ? null : day); Haptics.selectionAsync(); }, []);
  const openQuickLog = useCallback((ritualId: string) => { setQuickLogRitualId(ritualId); setQuickLogMood(''); setQuickLogNotes(''); setQuickLogDate(new Date()); setShowQuickLog(true); }, []);
  const handleComplete = useCallback((ritualId: string) => { openQuickLog(ritualId); }, [openQuickLog]);

  const handleDismiss = useCallback((ritual: RitualWithComputed) => {
    showAlert('Dismiss Ritual', 'Mark this ritual as dismissed? It will be removed from your overdue list.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Dismiss', style: 'destructive', onPress: () => { updateRitual(ritual.id, { status: 'dismissed' as any, scheduledDate: undefined }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
    ]);
  }, [updateRitual, showAlert]);

  const handleDeleteRitual = useCallback((ritual: RitualWithComputed) => {
    if (ritual.seriesId) {
      const seriesCount = rituals.filter(r => r.seriesId === ritual.seriesId).length;
      const futureCount = rituals.filter(r => r.seriesId === ritual.seriesId && r.status !== 'completed' && r.scheduledDate && new Date(r.scheduledDate).getTime() >= new Date(ritual.scheduledDate || '').getTime()).length;
      const buttons: any[] = [
        { text: 'Cancel', style: 'cancel' },
        { text: 'This Only', onPress: () => { deleteRitual(ritual.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
      ];
      if (futureCount > 1) buttons.push({ text: `This & Future (${futureCount})`, style: 'destructive', onPress: () => { deleteFutureInSeries(ritual.seriesId!, ritual.scheduledDate || new Date().toISOString()); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } });
      showAlert('Delete Ritual', `This ritual is part of a ${scheduleLabels[ritual.schedule] || ''} series (${seriesCount} total). What would you like to delete?`, buttons);
    } else {
      deleteRitual(ritual.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [rituals, deleteRitual, deleteFutureInSeries, showAlert]);

  const renderRitualCard = (ritual: RitualWithComputed) => {
    const cfg = STATUS_CONFIG[ritual.computedStatus];
    const cat = resolveCategory(ritual.category, categories);
    const catColor = resolveCategoryColor(ritual.category, categoryColors, categories);
    const days = ritual.scheduledDate ? getDaysUntil(ritual.scheduledDate) : null;
    const daysLabel = days !== null ? getDaysLabel(days) : null;
    const isOverdue = days !== null && days < 0;
    const isToday2 = days === 0;
    const isUrgent = days !== null && days > 0 && days <= 3;
    const manif = manifestations.find(m => m.ritualId === ritual.id);
    const dimmed = ritual.computedStatus === 'completed';
    const daysBadgeColor = isOverdue ? theme.error : isToday2 ? theme.primary : isUrgent ? theme.warning : theme.textMuted;

    return (
      <SwipeableRow key={ritual.id} onDelete={() => handleDeleteRitual(ritual)}>
        <Pressable style={[styles.ritualCard, dimmed ? { opacity: 0.55 } : null]} onPress={() => router.push(`/ritual/${ritual.id}`)}>
          <View style={[styles.cardLeftBorder, { backgroundColor: cfg.color }]} />
          <View style={styles.cardBody}>
            <View style={styles.cardTopRow}>
              <View style={[styles.catIconBox, { backgroundColor: catColor + '18' }]}>
                <MaterialIcons name={(cat?.icon || 'auto-fix-high') as keyof typeof MaterialIcons.glyphMap} size={22} color={catColor} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>{ritual.name}</Text>
                {(ritual.tangibleOutcome || ritual.intention) ? <Text style={styles.cardIntention} numberOfLines={2}>{ritual.tangibleOutcome || ritual.intention}</Text> : null}
              </View>
              <View style={styles.cardActions}>
                {daysLabel ? <View style={[styles.daysBadge, { backgroundColor: daysBadgeColor + '15', borderColor: daysBadgeColor + '30' }]}><Text style={[styles.daysBadgeText, { color: daysBadgeColor }]}>{daysLabel}</Text></View> : null}
                {ritual.computedStatus !== 'completed' ? (
                  <View style={styles.cardActionBtns}>
                    {ritual.computedStatus === 'overdue' ? <Pressable style={styles.dismissBtn} onPress={(e) => { e.stopPropagation?.(); handleDismiss(ritual); }} hitSlop={8}><Text style={styles.dismissBtnText}>Dismiss</Text></Pressable> : null}
                    <Pressable style={styles.completeBtn} onPress={(e) => { e.stopPropagation?.(); handleComplete(ritual.id); }} hitSlop={8}><MaterialIcons name="check" size={18} color={theme.success} /></Pressable>
                  </View>
                ) : <View style={styles.completedIcon}><MaterialIcons name="check-circle" size={20} color={theme.success + '80'} /></View>}
              </View>
            </View>
            <View style={styles.cardBadgeRow}>
              <View style={[styles.cardBadge, { backgroundColor: catColor + '12' }]}><Text style={[styles.cardBadgeText, { color: catColor }]}>{cat?.name || ritual.category}</Text></View>
              <View style={styles.cardBadge}><Text style={styles.cardBadgeText}>{scheduleLabels[ritual.schedule] || ritual.schedule}</Text></View>
              {(ritual.seriesId || ritual.groupId) ? <View style={[styles.cardBadge, { backgroundColor: theme.accent + '12' }]}><MaterialIcons name="repeat" size={10} color={theme.accent} /><Text style={[styles.cardBadgeText, { color: theme.accent }]}>Series</Text></View> : null}
              {manif ? <View style={[styles.cardBadge, { backgroundColor: manif.status === 'spilled' ? theme.success + '12' : manif.status === 'stirring' ? '#4EA8DE12' : theme.primary + '12' }]}><Text style={[styles.cardBadgeText, { color: manif.status === 'spilled' ? theme.success : manif.status === 'stirring' ? '#4EA8DE' : theme.primary }]}>{manif.status === 'spilled' ? '⭐ Spilled' : manif.status === 'stirring' ? '🌊 Stirring' : '🪄 Brewing'}</Text></View> : null}
            </View>
          </View>
        </Pressable>
      </SwipeableRow>
    );
  };

  const renderCompactRitual = (ritual: RitualWithComputed) => {
    const cfg = STATUS_CONFIG[ritual.computedStatus];
    const cat = resolveCategory(ritual.category, categories);
    const catColor = resolveCategoryColor(ritual.category, categoryColors, categories);
    const dimmed = ritual.computedStatus === 'completed';
    return (
      <SwipeableRow key={ritual.id} onDelete={() => handleDeleteRitual(ritual)}>
        <Pressable style={[styles.compactRow, dimmed ? { opacity: 0.5 } : null]} onPress={() => router.push(`/ritual/${ritual.id}`)}>
          <View style={[styles.compactStrip, { backgroundColor: cfg.color }]} />
          <View style={[styles.compactIcon, { backgroundColor: catColor + '18' }]}><MaterialIcons name={(cat?.icon || 'auto-fix-high') as keyof typeof MaterialIcons.glyphMap} size={16} color={catColor} /></View>
          <View style={{ flex: 1 }}><Text style={styles.compactName} numberOfLines={1}>{ritual.name}</Text><Text style={styles.compactCategory} numberOfLines={1}>{cat?.name || ''}</Text></View>
          {ritual.computedStatus !== 'completed' ? <Pressable style={styles.compactCheck} onPress={(e) => { e.stopPropagation?.(); handleComplete(ritual.id); }} hitSlop={8}><MaterialIcons name="check" size={15} color={theme.success} /></Pressable> : <MaterialIcons name="check-circle" size={18} color={theme.success + '60'} />}
        </Pressable>
      </SwipeableRow>
    );
  };

  const renderWeekView = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
      <View style={styles.timelineNav}>
        <Pressable onPress={() => setWeekOffset(w => w - 1)} style={styles.navArrow} hitSlop={12}><MaterialIcons name="chevron-left" size={22} color={theme.textSecondary} /></Pressable>
        <View style={styles.navCenter}><Text style={styles.navLabel}>{weekLabel}</Text>{weekOffset !== 0 ? <Pressable onPress={() => setWeekOffset(0)}><Text style={styles.navToday}>Today</Text></Pressable> : null}</View>
        <Pressable onPress={() => setWeekOffset(w => w + 1)} style={styles.navArrow} hitSlop={12}><MaterialIcons name="chevron-right" size={22} color={theme.textSecondary} /></Pressable>
      </View>
      <View style={styles.weekSummary}><Text style={styles.weekSummaryText}><Text style={{ color: theme.success, fontWeight: '700' }}>{weekStats.completed}</Text><Text style={{ color: theme.textMuted }}> / {weekStats.total} done</Text></Text><View style={styles.weekBarBg}><View style={[styles.weekBarFill, { width: `${Math.max(weekStats.pct, 3)}%` }]} /></View></View>
      {weekDays.map((day, idx) => {
        const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
        const dayRituals = weekRitualMap.get(key) || [];
        const isToday3 = isSameDay(day, today);
        const isPast = day < today && !isToday3;
        return (
          <View key={idx} style={[styles.weekDaySection, isToday3 ? styles.weekDaySectionToday : null]}>
            <View style={styles.weekDayHeader}>
              <View style={[styles.weekDayPill, isToday3 ? styles.weekDayPillToday : null]}><Text style={[styles.weekDayName, isToday3 ? { color: theme.primary } : null]}>{DAY_FULL[day.getDay()]}</Text><Text style={[styles.weekDayNum, isToday3 ? { color: theme.primary } : null]}>{day.getDate()}</Text></View>
              {dayRituals.length > 0 ? <Text style={styles.weekDayCountText}>{dayRituals.filter(r => r.computedStatus === 'completed').length}/{dayRituals.length}</Text> : null}
              {isToday3 ? <View style={styles.todayDot} /> : null}
            </View>
            {dayRituals.length > 0 ? <View style={styles.weekDayRituals}>{dayRituals.map(r => renderCompactRitual(r))}</View> : <View style={[styles.weekDayEmpty, isPast ? { opacity: 0.3 } : null]}><Text style={styles.weekDayEmptyText}>{isPast ? 'No rituals' : 'Nothing scheduled'}</Text></View>}
          </View>
        );
      })}
    </ScrollView>
  );

  const renderMonthView = () => {
    const screenW = Math.max(1, Dimensions.get('window').width - 32);
    const cellSize = Math.floor(screenW / 7);
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
        <View style={styles.timelineNav}>
          <Pressable onPress={() => { setMonthOffset(m => m - 1); setSelectedCalDay(null); }} style={styles.navArrow} hitSlop={12}><MaterialIcons name="chevron-left" size={22} color={theme.textSecondary} /></Pressable>
          <View style={styles.navCenter}><Text style={styles.navLabel}>{calLabel}</Text>{monthOffset !== 0 ? <Pressable onPress={() => { setMonthOffset(0); setSelectedCalDay(null); }}><Text style={styles.navToday}>This Month</Text></Pressable> : null}</View>
          <Pressable onPress={() => { setMonthOffset(m => m + 1); setSelectedCalDay(null); }} style={styles.navArrow} hitSlop={12}><MaterialIcons name="chevron-right" size={22} color={theme.textSecondary} /></Pressable>
        </View>
        <View style={styles.monthSummaryRow}><Text style={[styles.monthSumVal, { color: theme.success }]}>{monthStats.completed}</Text><Text style={styles.monthSumSep}>/</Text><Text style={[styles.monthSumVal, { color: theme.textSecondary }]}>{monthStats.total}</Text><Text style={styles.monthSumLabel}>done</Text>{monthStats.overdue > 0 ? <><View style={styles.monthSumDivider} /><Text style={[styles.monthSumVal, { color: theme.error }]}>{monthStats.overdue}</Text><Text style={styles.monthSumLabel}>late</Text></> : null}<View style={{ flex: 1 }} /><Text style={styles.monthPctText}>{monthStats.pct}%</Text></View>
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeaderRow}>{DAY_ABBRS.map(d => <View key={d} style={[styles.calHeaderCell, { width: cellSize }]}><Text style={styles.calHeaderText}>{d}</Text></View>)}</View>
          {calGrid.map((week, wi) => <View key={wi} style={styles.calendarWeekRow}>{week.map((day, di) => {
            if (!day) return <View key={di} style={[styles.calCell, { width: cellSize }]} />;
            const key2 = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
            const cellRituals = dayRitualMap.get(key2) || [];
            const isToday4 = isSameDay(day, today);
            const isSelected3 = selectedCalDay ? isSameDay(day, selectedCalDay) : false;
            return (
              <Pressable key={di} style={[styles.calCell, { width: cellSize }, isToday4 ? styles.calCellToday : null, isSelected3 ? styles.calCellSelected : null]} onPress={() => { setSelectedCalDay(prev => prev && isSameDay(prev, day) ? null : day); Haptics.selectionAsync(); }}>
                <Text style={[styles.calCellNum, isToday4 ? styles.calCellNumToday : null, isSelected3 ? styles.calCellNumSelected : null]}>{day.getDate()}</Text>
                {cellRituals.length > 0 ? <View style={styles.calDotRow}>{cellRituals.some(r => r.computedStatus === 'overdue') ? <View style={[styles.calDot, { backgroundColor: theme.error }]} /> : null}{cellRituals.some(r => r.computedStatus === 'approaching') ? <View style={[styles.calDot, { backgroundColor: theme.warning }]} /> : null}{cellRituals.some(r => r.computedStatus === 'scheduled') ? <View style={[styles.calDot, { backgroundColor: theme.accent }]} /> : null}{cellRituals.some(r => r.computedStatus === 'completed') ? <View style={[styles.calDot, { backgroundColor: theme.success }]} /> : null}</View> : <View style={styles.calDotRow} />}
              </Pressable>
            );
          })}</View>)}
        </View>
        <View style={styles.calLegend}>{[{ color: theme.accent, label: 'Scheduled' }, { color: theme.warning, label: 'Soon' }, { color: theme.success, label: 'Done' }, { color: theme.error, label: 'Late' }].map(l => <View key={l.label} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: l.color }]} /><Text style={styles.legendText}>{l.label}</Text></View>)}</View>
        {selectedCalDay ? (
          <View style={styles.calSelectedSection}>
            <View style={styles.calSelectedHeader}><Text style={styles.calSelectedTitle}>{selectedCalDay.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text><Text style={styles.calSelectedCount}>{selectedDayRituals.length} ritual{selectedDayRituals.length !== 1 ? 's' : ''}</Text></View>
            {selectedDayRituals.length > 0 ? selectedDayRituals.map(r => renderCompactRitual(r)) : <View style={styles.calEmptyDay}><Text style={styles.calEmptyText}>Nothing scheduled</Text></View>}
          </View>
        ) : <View style={styles.calHint}><MaterialIcons name="touch-app" size={14} color={theme.textMuted} /><Text style={styles.calHintText}>Tap a day to view</Text></View>}
      </ScrollView>
    );
  };

  const renderCategorySheet = () => (
    <Modal visible={showCategorySheet} transparent animationType="slide" onRequestClose={() => setShowCategorySheet(false)}>
      <Pressable style={styles.sheetOverlay} onPress={() => setShowCategorySheet(false)}>
        <Pressable style={styles.sheetContainer} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Filter by Category</Text>
          <View style={styles.sheetChips}>
            <Pressable style={[styles.sheetChip, activeCategory === 'all' && styles.sheetChipActive]} onPress={() => { setActiveCategory('all'); setShowCategorySheet(false); Haptics.selectionAsync(); }}><Text style={[styles.sheetChipText, activeCategory === 'all' && styles.sheetChipTextActive]}>All Categories</Text></Pressable>
            {categories.map(cat => { const catColor = categoryColors[cat.id] || theme.accent; const isActive = activeCategory === cat.id; return (
              <Pressable key={cat.id} style={[styles.sheetChip, isActive && { backgroundColor: catColor, borderColor: catColor }]} onPress={() => { setActiveCategory(isActive ? 'all' : cat.id); setShowCategorySheet(false); Haptics.selectionAsync(); }}><MaterialIcons name={cat.icon as keyof typeof MaterialIcons.glyphMap} size={16} color={isActive ? '#FFF' : catColor} /><Text style={[styles.sheetChipText, isActive && styles.sheetChipTextActive]}>{cat.name}</Text><Text style={[styles.sheetChipCount, isActive && { color: '#FFF' }]}>{ritualsWithComputed.filter(r => r.category === cat.id).length}</Text></Pressable>
            ); })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderLibraryTab = () => (
    <View style={{ flex: 1 }}>
      {showLibSearch ? (
  <View style={styles.libSearchWrap}>
    <MaterialIcons name="search" size={18} color={theme.textMuted} />
    <TextInput style={styles.libSearchInput} value={libSearch} onChangeText={setLibSearch} placeholder="Search your grimoire..." placeholderTextColor={theme.textMuted} autoFocus />
    <Pressable onPress={() => { setLibSearch(''); setShowLibSearch(false); }} hitSlop={8}>
      <MaterialIcons name="close" size={16} color={theme.textMuted} />
    </Pressable>
  </View>
) : null}
      <View style={styles.libChipStripContainer}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.libChipStripContent}>
        <Pressable style={[styles.libCatChip, libCategory === 'all' ? { backgroundColor: 'rgba(245,213,224,0.15)', borderColor: 'rgba(245,213,224,0.4)' } : { backgroundColor: 'rgba(245,213,224,0.15)', borderColor: 'rgba(245,213,224,0.4)', opacity: 0.7 }]} onPress={() => { setLibCategory('all'); Haptics.selectionAsync(); }}><Text style={[styles.libCatChipText, { color: '#F5D5E0' }]}>All</Text></Pressable>
        {categories.map(cat => { const catColor = categoryColors[cat.id] || theme.accent; const isActive = libCategory === cat.id; return (
          <Pressable key={cat.id} style={[styles.libCatChip, isActive ? { backgroundColor: catColor + '25', borderColor: catColor + '60' } : { backgroundColor: catColor + '18', borderColor: catColor + '35', opacity: 0.7 }]} onPress={() => { setLibCategory(isActive ? 'all' : cat.id); Haptics.selectionAsync(); }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><MaterialIcons name={cat.icon as keyof typeof MaterialIcons.glyphMap} size={14} color={catColor} /><Text style={[styles.libCatChipText, { color: catColor }]}>{cat.name}</Text></View></Pressable>
        ); })}
      </ScrollView></View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80, gap: 8 }} showsVerticalScrollIndicator={false}>
        {filteredLibrary.length === 0 ? (
          <View style={styles.libEmptyState}>
            <MaterialIcons name="auto-stories" size={52} color={theme.textMuted} />
            <Text style={styles.libEmptyTitle}>{libSearch.trim() || libCategory !== 'all' ? 'No spells found' : 'Your grimoire is empty'}</Text>
            <Text style={styles.libEmptyText}>{libSearch.trim() || libCategory !== 'all' ? 'Try adjusting your search or filter' : 'Add your first spell to build your personal grimoire'}</Text>
            {!libSearch.trim() && libCategory === 'all' ? <Pressable style={styles.libEmptyCta} onPress={() => router.push('/add-library-ritual')}><MaterialIcons name="add" size={18} color={theme.background} /><Text style={styles.libEmptyCtaText}>Add Spell</Text></Pressable> : null}
          </View>
        ) : filteredLibrary.map(libR => {
          const cat = resolveCategory(libR.category, categories);
          const catColor = resolveCategoryColor(libR.category, categoryColors, categories);
          const inPractice = libraryInPractice.has(libR.id);
          return (
            <SwipeableRow key={libR.id} onDelete={() => { showAlert('Remove from Library?', `Remove "${libR.name}" from your grimoire?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => { deleteLibraryRitual(libR.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } }]); }}>
              <Pressable
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderLeftWidth: 3,
                  borderLeftColor: catColor,
                }}
                onPress={() => router.push(`/library-ritual/${libR.id}`)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: catColor, shadowColor: catColor, shadowOpacity: 0.6, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#F5D5E0', fontFamily: theme.fonts.serif }} numberOfLines={1}>{libR.name}</Text>
                    <Text style={{ fontSize: 11, color: theme.accent, fontWeight: '500', marginTop: 1 }}>{cat?.name || libR.category}</Text>
                  </View>
                  {libR.timesPerformed > 0 ? (
                    <View style={{ backgroundColor: catColor + '20', borderWidth: 0.5, borderColor: catColor + '50', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: catColor }}>×{libR.timesPerformed}</Text>
                    </View>
                  ) : null}
                  {inPractice ? (
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(94,189,138,0.15)', borderWidth: 0.5, borderColor: 'rgba(94,189,138,0.4)', alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name="check" size={14} color="#7ED4A8" />
                    </View>
                  ) : null}
                </View>
                {libR.intention ? (
                  <Text style={{ fontSize: 14, color: theme.textSecondary, lineHeight: 20, fontFamily: theme.fonts.serif, fontStyle: 'italic', marginBottom: 4 }} numberOfLines={2}>{libR.intention}</Text>
                ) : null}
                {!inPractice ? (
                  <View style={{ flexDirection: 'row', marginTop: 6 }}>
                    <Pressable
                      style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, backgroundColor: catColor + '12', borderWidth: 0.5, borderColor: catColor + '50' }}
                      onPress={(e) => { e.stopPropagation?.(); router.push({ pathname: '/add-to-practice', params: { libraryId: libR.id } }); }}
                      hitSlop={8}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: catColor }}>+ Add to Practice</Text>
                    </Pressable>
                  </View>
                ) : null}
              </Pressable>
            </SwipeableRow>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <GradientScreen>
      <View style={styles.header}>
  <Text style={styles.title}>Rituals</Text>
  <View style={styles.headerRight}>
    <Pressable style={styles.headerIconBtn} onPress={() => setShowLibSearch(true)}>
      <MaterialIcons name="search" size={20} color={theme.textSecondary} />
    </Pressable>
    <Pressable style={styles.headerIconBtn} onPress={() => router.push('/manage-categories')}>
      <MaterialIcons name="tune" size={20} color={theme.textSecondary} />
    </Pressable>
    {tabMode !== 'manifestations' ? (
  <Pressable style={styles.addButton} onPress={() => {
    if (tabMode === 'library') {
      router.push('/add-library-ritual');
    } else {
      router.push('/add-ritual');
    }
  }}>
    <MaterialIcons name="add" size={22} color={theme.background} />
  </Pressable>
) : null}
  </View>
</View>

      <View style={styles.segmentWrap}><View style={styles.segmentPill}>{([{ key: 'library' as TabMode, label: 'Library' }, { key: 'practice' as TabMode, label: 'Practice' }, { key: 'manifestations' as TabMode, label: 'Cauldron' }]).map(tab => <Pressable key={tab.key} style={[styles.segmentBtn, tabMode === tab.key && styles.segmentBtnActive]} onPress={() => { setTabMode(tab.key); if (tab.key === 'practice') setSelectedDay(new Date()); Haptics.selectionAsync(); }}><Text style={[styles.segmentText, tabMode === tab.key && styles.segmentTextActive]}>{tab.label}</Text></Pressable>)}</View></View>

      {tabMode === 'library' ? renderLibraryTab() : tabMode === 'practice' ? (
        <>
          <View style={styles.toolbar}>
            <View style={styles.timelinePill}>{([{ key: 'list' as TimelineView, label: 'List' }, { key: 'week' as TimelineView, label: 'Week' }, { key: 'month' as TimelineView, label: 'Month' }]).map(t => <Pressable key={t.key} style={[styles.timelineBtn, timelineView === t.key && styles.timelineBtnActive]} onPress={() => { setTimelineView(t.key); Haptics.selectionAsync(); }}><Text style={[styles.timelineBtnText, timelineView === t.key && styles.timelineBtnTextActive]}>{t.label}</Text></Pressable>)}</View>
            <Pressable style={[styles.catFilterBtn, activeCategory !== 'all' && styles.catFilterBtnActive]} onPress={() => setShowCategorySheet(true)}><MaterialIcons name="filter-list" size={18} color={activeCategory !== 'all' ? theme.primary : theme.textSecondary} />{activeCategory !== 'all' ? <Text style={styles.catFilterLabel} numberOfLines={1}>{categories.find(c => c.id === activeCategory)?.name || 'Filter'}</Text> : null}</Pressable>
          </View>

          {timelineView === 'list' ? (
            <>
              <View style={styles.dateStripContainer}><ScrollView ref={dateScrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStripContent}>{monthDays.map((day, i) => { const isToday = isSameDay(day, today); const isSelected = selectedDay ? isSameDay(day, selectedDay) : false; const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`; const dayRituals2 = dayRitualMap.get(dayKey) || []; const dots = dayRituals2.slice(0, 3).map(r => STATUS_CONFIG[r.computedStatus].color); return (<Pressable key={i} style={[styles.dayPill, isToday && styles.dayPillToday, isSelected && styles.dayPillSelected]} onPress={() => toggleDay(day)}><Text style={[styles.dayAbbr, isToday && styles.dayAbbrToday, isSelected && styles.dayAbbrSelected]}>{DAY_ABBRS[day.getDay()]}</Text><Text style={[styles.dayNum, isToday && styles.dayNumToday, isSelected && styles.dayNumSelected]}>{day.getDate()}</Text><View style={styles.dotRow}>{dots.map((color, di) => <View key={di} style={[styles.dot, { backgroundColor: color }]} />)}</View></Pressable>); })}</ScrollView></View>
              {isFiltered ? <View style={styles.filterBar}><Text style={styles.filterText}>{sortedFiltered.length} result{sortedFiltered.length !== 1 ? 's' : ''}</Text><Pressable onPress={() => { setActiveFilter('all'); setSelectedDay(null); setActiveCategory('all'); }}><Text style={styles.filterClear}>Clear All</Text></Pressable></View> : null}
              {sortedFiltered.length > 0 ? <View style={styles.swipeHint}><MaterialIcons name="swipe-left" size={12} color={theme.textMuted} /><Text style={styles.swipeHintText}>Swipe left to delete</Text></View> : null}
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
                {sortedFiltered.length === 0 ? <View style={styles.emptyState}><Image source={require('../../assets/images/empty-rituals.png')} style={{ width: 120, height: 120, marginBottom: 12 }} contentFit="contain" /><Text style={styles.emptyTitle}>No Rituals Found</Text><Text style={styles.emptyText}>{isFiltered ? 'Try adjusting your filters' : 'Add your first ritual to begin'}</Text><Pressable style={styles.emptyCta} onPress={() => router.push('/add-ritual')}><MaterialIcons name="add" size={18} color={theme.background} /><Text style={styles.emptyCtaText}>Add Ritual</Text></Pressable></View> : sortedFiltered.map(r => renderRitualCard(r))}
              </ScrollView>
            </>
          ) : timelineView === 'week' ? renderWeekView() : renderMonthView()}
        </>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
          <View style={styles.manifFilterTabs}>{([{ key: 'all' as const, label: 'All' }, { key: 'brewing' as const, label: '\ud83e\ude84 Brewing' }, { key: 'stirring' as const, label: '\ud83c\udf0a Stirring' }, { key: 'spilled' as const, label: '\u2b50 Spilled' }]).map(f => <Pressable key={f.key} style={[styles.manifFilterTab, manifFilter === f.key && styles.manifFilterTabActive]} onPress={() => setManifFilter(f.key)}><Text style={[styles.manifFilterText, manifFilter === f.key && styles.manifFilterTextActive]}>{f.label}</Text></Pressable>)}</View>
          <View style={styles.manifSummaryRow}><View style={styles.manifSummaryCard}><Text style={[styles.manifSummaryValue, { color: theme.primary }]}>{pendingCount}</Text><Text style={styles.manifSummaryLabel}>BREWING</Text></View><View style={styles.manifSummaryCard}><Text style={[styles.manifSummaryValue, { color: theme.success }]}>{manifestedCount}</Text><Text style={styles.manifSummaryLabel}>SPILLED</Text></View><View style={styles.manifSummaryCard}><Text style={[styles.manifSummaryValue, { color: '#4EA8DE' }]}>{manifestations.length > 0 ? Math.round((manifestedCount / manifestations.length) * 100) : 0}%</Text><Text style={styles.manifSummaryLabel}>SUCCESS</Text></View></View>
          {filteredManifestations.length === 0 ? <View style={styles.emptyState}><MaterialIcons name="auto-awesome" size={48} color={theme.textMuted} /><Text style={styles.emptyTitle}>{manifFilter === 'spilled' ? 'Nothing Spilled Yet' : manifFilter === 'brewing' ? 'Nothing Brewing' : 'No Intentions Cast'}</Text><Text style={styles.emptyText}>Add a tangible outcome when creating rituals to track what you call in</Text></View> : filteredManifestations.map(m => {
            const ss = getStatusStyle(m.status);
            return (<Pressable key={m.id} style={[styles.manifCard, { borderLeftColor: ss.border }]} onPress={() => router.push(`/ritual/${m.ritualId}`)}><View style={styles.manifCardHeader}><View style={{ flex: 1 }}><Text style={styles.manifRitualName}>{m.ritualName}</Text><Text style={styles.manifDate}>{new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text></View><View style={[styles.manifStatusBadge, { backgroundColor: ss.bg, borderColor: ss.border }]}><Text style={[styles.manifStatusText, { color: ss.color }]}>{ss.label}</Text></View></View><Text style={styles.manifIntention}>{m.intention}</Text>{m.results.length > 0 ? <View style={styles.manifResults}>{m.results.map(r => <View key={r.id} style={[styles.manifResultEntry, { borderLeftColor: r.type === 'manifested' ? theme.success : '#4EA8DE' }]}><View style={styles.manifResultHeader}><Text style={[styles.manifResultType, { color: r.type === 'manifested' ? theme.success : '#4EA8DE' }]}>{r.type === 'manifested' ? '\u2b50 Spilled' : '\u2726 Sign'}</Text><Text style={styles.manifResultDate}>{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text></View><Text style={styles.manifResultNote}>{r.note}</Text></View>)}</View> : null}{m.status !== 'spilled' ? <Pressable style={styles.manifLogBtn} onPress={() => router.push({ pathname: '/add-manifestation', params: { ritualId: m.ritualId } })}><MaterialIcons name="add-circle-outline" size={16} color={theme.primary} /><Text style={styles.manifLogBtnText}>Log a Sign</Text></Pressable> : null}</Pressable>);
          })}
        </ScrollView>
      )}

      {renderCategorySheet()}

      {/* ═══ QUICK LOG BOTTOM SHEET ═══ */}
      <Modal visible={showQuickLog} transparent animationType="slide" onRequestClose={() => setShowQuickLog(false)}>
        <Pressable style={styles.qlOverlay} onPress={() => setShowQuickLog(false)}>
          <Pressable style={styles.qlSheet} onPress={() => {}}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.qlHandle} />
              {(() => {
                const qlRitual = rituals.find(r => r.id === quickLogRitualId);
                const moonPhase = getCurrentMoonPhase();
                const todayPlanet = getTodayPlanet();
                const currentHour = getCurrentPlanetaryHour();
                const qlCanSave = quickLogMood.length > 0;
                return (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
                    <Text style={styles.qlRitualName}>{qlRitual?.name || 'Ritual'}</Text>
                    <View style={styles.qlCosmicCard}>
                      <View style={styles.qlCosmicRow}><Text style={styles.qlCosmicEmoji}>{moonPhase.icon}</Text><View style={{ flex: 1 }}><Text style={styles.qlCosmicLabel}>{moonPhase.name}</Text><Text style={styles.qlCosmicSub}>{moonPhase.energy}</Text></View></View>
                      <View style={styles.qlCosmicDivider} />
                      <View style={styles.qlCosmicRow}><Text style={styles.qlCosmicEmoji}>{todayPlanet.emoji}</Text><View style={{ flex: 1 }}><Text style={styles.qlCosmicLabel}>Day of {todayPlanet.name}</Text><Text style={styles.qlCosmicSub}>{todayPlanet.bestWorkings[0]}</Text></View></View>
                      {currentHour ? <><View style={styles.qlCosmicDivider} /><View style={styles.qlCosmicRow}><Text style={styles.qlCosmicEmoji}>{currentHour.planet.emoji}</Text><View style={{ flex: 1 }}><Text style={styles.qlCosmicLabel}>Hour of {currentHour.planet.name}</Text><Text style={styles.qlCosmicSub}>{currentHour.planet.bestWorkings[0]}</Text></View></View></> : null}
                    </View>
                    <Text style={styles.qlLabel}>Date Completed</Text>
                    <Pressable style={styles.qlDateField} onPress={() => setShowQuickDatePicker(true)}><MaterialIcons name="event-available" size={18} color={theme.primary} /><Text style={styles.qlDateText}>{quickLogDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</Text><MaterialIcons name="edit-calendar" size={16} color={theme.textMuted} /></Pressable>
                    <Text style={styles.qlDateHint}>Defaults to today \u2014 change if logging a past practice</Text>
                    <Text style={styles.qlLabel}>How did it feel? *</Text>
                    <View style={styles.qlMoodGrid}>{moods.map(m => <Pressable key={m} style={[styles.qlMoodChip, quickLogMood === m && styles.qlMoodChipActive]} onPress={() => { setQuickLogMood(m); Haptics.selectionAsync(); }} onLongPress={() => { showAlert('Delete Mood?', `Remove "${m}" from your mood options?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { deleteMood(m); if (quickLogMood === m) setQuickLogMood(''); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } }]); }} delayLongPress={500}><Text style={[styles.qlMoodChipText, quickLogMood === m && styles.qlMoodChipTextActive]}>{m}</Text></Pressable>)}{isAddingMood ? <View style={styles.qlMoodAddInline}><TextInput style={styles.qlMoodAddInput} value={newMoodText} onChangeText={setNewMoodText} placeholder="New mood..." placeholderTextColor={theme.textMuted} autoFocus onSubmitEditing={() => { if (newMoodText.trim()) { addMood(newMoodText.trim()); setNewMoodText(''); } setIsAddingMood(false); }} returnKeyType="done" /><Pressable onPress={() => { if (newMoodText.trim()) { addMood(newMoodText.trim()); setNewMoodText(''); } setIsAddingMood(false); }} hitSlop={8}><MaterialIcons name="check" size={18} color={theme.success} /></Pressable><Pressable onPress={() => { setIsAddingMood(false); setNewMoodText(''); }} hitSlop={8}><MaterialIcons name="close" size={18} color={theme.textMuted} /></Pressable></View> : <Pressable style={styles.qlMoodAddChip} onPress={() => { setIsAddingMood(true); Haptics.selectionAsync(); }}><MaterialIcons name="add" size={14} color={theme.accent} /><Text style={styles.qlMoodAddChipText}>Add</Text></Pressable>}</View>
                    <Text style={styles.qlLabel}>Notes</Text>
                    <TextInput style={styles.qlNotesInput} value={quickLogNotes} onChangeText={setQuickLogNotes} placeholder="What happened? Any signs or observations..." placeholderTextColor={theme.textMuted} multiline textAlignVertical="top" />
                    <Pressable style={[styles.qlSaveBtn, !qlCanSave && styles.qlSaveBtnDisabled]} disabled={!qlCanSave} onPress={() => { if (!qlCanSave || !quickLogRitualId) return; addJournalEntry(quickLogRitualId, { date: quickLogDate.toISOString(), notes: quickLogNotes.trim(), mood: quickLogMood }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setShowQuickLog(false); }}><Text style={[styles.qlSaveBtnText, !qlCanSave && styles.qlSaveBtnTextDisabled]}>Mark Complete</Text></Pressable>
                  </ScrollView>
                );
              })()}
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showQuickDatePicker} transparent animationType="slide" onRequestClose={() => setShowQuickDatePicker(false)}>
        <Pressable style={styles.qlOverlay} onPress={() => setShowQuickDatePicker(false)}>
          <Pressable style={styles.qlDateModal} onPress={() => {}}>
            <View style={styles.qlDateModalHeader}><Text style={styles.qlDateModalTitle}>Date Completed</Text><Pressable onPress={() => setShowQuickDatePicker(false)} style={styles.qlDateModalClose}><MaterialIcons name="close" size={22} color={theme.textPrimary} /></Pressable></View>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>{(() => { const opts: Date[] = []; const now = new Date(); for (let i = 0; i < 60; i++) opts.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)); return opts; })().map((d, i) => { const isSelected = d.toDateString() === quickLogDate.toDateString(); const isToday = d.toDateString() === new Date().toDateString(); return (<Pressable key={i} style={[styles.qlDateOption, isSelected && styles.qlDateOptionActive]} onPress={() => { setQuickLogDate(d); setShowQuickDatePicker(false); Haptics.selectionAsync(); }}><View style={{ flex: 1 }}><Text style={[styles.qlDateOptionText, isSelected && styles.qlDateOptionTextActive]}>{d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}{isToday ? '  (Today)' : ''}</Text></View>{isSelected ? <MaterialIcons name="check-circle" size={20} color={theme.primary} /> : null}</Pressable>); })}</ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', color: theme.textPrimary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  addButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  segmentWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  segmentPill: { flexDirection: 'row', backgroundColor: theme.surfaceLight, borderRadius: 14, padding: 3 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: theme.surface },
  segmentText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  segmentTextActive: { color: theme.textPrimary, fontWeight: '700' },
  libSearchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, backgroundColor: theme.surface, borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: theme.border },
  libSearchInput: { flex: 1, fontSize: 14, color: theme.textPrimary, padding: 0 },
  libChipStripContainer: { marginBottom: 10 },
  libChipStripContent: { paddingHorizontal: 16, gap: 8 },
  libCatChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border },
  libCatChipText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },

  libEmptyState: { alignItems: 'center', paddingVertical: 50 },
  libEmptyTitle: { fontSize: 17, fontWeight: '700', color: theme.textPrimary, marginTop: 12, marginBottom: 4 },
  libEmptyText: { fontSize: 13, color: theme.textSecondary, textAlign: 'center', lineHeight: 18, paddingHorizontal: 24, marginBottom: 16 },
  libEmptyCta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: theme.radius.full },
  libEmptyCtaText: { fontSize: 14, fontWeight: '600', color: theme.background },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  timelinePill: { flexDirection: 'row', backgroundColor: theme.surfaceLight, borderRadius: 10, padding: 3 },
  timelineBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  timelineBtnActive: { backgroundColor: theme.surface },
  timelineBtnText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  timelineBtnTextActive: { color: theme.primary },
  catFilterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  catFilterBtnActive: { borderColor: theme.primary + '50', backgroundColor: theme.primary + '10' },
  catFilterLabel: { fontSize: 12, fontWeight: '600', color: theme.primary, maxWidth: 80 },
  dateStripContainer: { paddingBottom: 10 },
  dateStripContent: { paddingHorizontal: 12, gap: DAY_PILL_GAP },
  dayPill: { width: DAY_PILL_WIDTH, height: DAY_PILL_HEIGHT, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: 'transparent' },
  dayPillToday: { backgroundColor: theme.primary + '18', borderColor: theme.primary + '40' },
  dayPillSelected: { backgroundColor: theme.accent + '22', borderColor: theme.accent },
  dayAbbr: { fontSize: 10, fontWeight: '600', color: theme.textMuted, marginBottom: 2 },
  dayAbbrToday: { color: theme.primary },
  dayAbbrSelected: { color: theme.accent },
  dayNum: { fontSize: 18, fontWeight: '700', color: theme.textSecondary },
  dayNumToday: { color: theme.primary },
  dayNumSelected: { color: theme.accent },
  dotRow: { flexDirection: 'row', gap: 3, marginTop: 3, minHeight: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  filterBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6 },
  filterText: { fontSize: 12, fontWeight: '500', color: theme.textSecondary },
  filterClear: { fontSize: 12, fontWeight: '700', color: theme.primary },
  swipeHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingHorizontal: 16, paddingBottom: 6 },
  swipeHintText: { fontSize: 10, color: theme.textMuted, fontStyle: 'italic' },
  ritualCard: { flexDirection: 'row', backgroundColor: theme.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
  cardLeftBorder: { width: 3 },
  cardBody: { flex: 1, padding: 14, gap: 10 },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  catIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, paddingTop: 2 },
  cardName: { fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginBottom: 3 },
  cardIntention: { fontSize: 13, color: theme.textSecondary, fontStyle: 'italic', lineHeight: 18, fontFamily: theme.fonts.serif },
  cardActions: { alignItems: 'flex-end', gap: 6, paddingTop: 2 },
  daysBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  daysBadgeText: { fontSize: 10, fontWeight: '700' },
  completeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.success + '50', backgroundColor: theme.success + '08' },
  cardActionBtns: { alignItems: 'flex-end', gap: 4 },
  dismissBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.error + '10', borderWidth: 1, borderColor: theme.error + '25' },
  dismissBtnText: { fontSize: 10, fontWeight: '700', color: theme.error },
  completedIcon: { paddingTop: 2 },
  cardBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginLeft: 54 },
  cardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.surfaceLight },
  cardBadgeText: { fontSize: 11, fontWeight: '600', color: theme.textMuted },

  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 10, padding: 10, minHeight: 44, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
  compactStrip: { width: 3, height: 28, borderRadius: 2 },
  compactIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  compactName: { fontSize: 13, fontWeight: '600', color: theme.textPrimary },
  compactCategory: { fontSize: 10, fontWeight: '600', color: theme.textMuted },
  compactCheck: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.success + '40', backgroundColor: theme.success + '08' },
  timelineNav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  navArrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  navCenter: { flex: 1, alignItems: 'center' },
  navLabel: { fontSize: 15, fontWeight: '700', color: theme.textPrimary },
  navToday: { fontSize: 12, fontWeight: '600', color: theme.primary, marginTop: 2 },
  weekSummary: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 12 },
  weekSummaryText: { fontSize: 13, fontWeight: '500' },
  weekBarBg: { flex: 1, height: 4, backgroundColor: theme.surfaceLight, borderRadius: 2, overflow: 'hidden' },
  weekBarFill: { height: 4, backgroundColor: theme.success, borderRadius: 2 },
  weekDaySection: { marginHorizontal: 16, marginBottom: 4, borderRadius: theme.radius.md, overflow: 'hidden', backgroundColor: 'transparent' },
  weekDaySectionToday: { borderWidth: 1, borderColor: theme.primary + '25', backgroundColor: theme.primary + '04' },
  weekDayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  weekDayPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: theme.surface },
  weekDayPillToday: { backgroundColor: theme.primary + '15' },
  weekDayName: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  weekDayNum: { fontSize: 15, fontWeight: '700', color: theme.textPrimary },
  weekDayCountText: { fontSize: 11, fontWeight: '600', color: theme.textMuted, flex: 1 },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary },
  weekDayRituals: { padding: 14 },
  weekDayEmpty: { paddingVertical: 14, alignItems: 'center' },
  weekDayEmptyText: { fontSize: 11, color: theme.textMuted, fontStyle: 'italic' },
  monthSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, marginBottom: 8 },
  monthSumVal: { fontSize: 16, fontWeight: '700' },
  monthSumSep: { fontSize: 14, color: theme.textMuted },
  monthSumLabel: { fontSize: 12, fontWeight: '500', color: theme.textMuted, marginLeft: 2 },
  monthSumDivider: { width: 1, height: 14, backgroundColor: theme.border, marginHorizontal: 6 },
  monthPctText: { fontSize: 13, fontWeight: '700', color: theme.primary },
  calendarCard: { marginHorizontal: 16, backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 6, marginBottom: 8 },
  calendarHeaderRow: { flexDirection: 'row' },
  calHeaderCell: { alignItems: 'center', paddingVertical: 4 },
  calHeaderText: { fontSize: 10, fontWeight: '700', color: theme.textMuted, letterSpacing: 0.5 },
  calendarWeekRow: { flexDirection: 'row' },
  calCell: { alignItems: 'center', justifyContent: 'center', paddingVertical: 5, borderRadius: 8 },
  calCellToday: { backgroundColor: theme.primary + '12' },
  calCellSelected: { backgroundColor: theme.primary + '22' },
  calCellNum: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  calCellNumToday: { color: theme.primary, fontWeight: '700' },
  calCellNumSelected: { color: theme.primary, fontWeight: '700' },
  calDotRow: { flexDirection: 'row', gap: 2, marginTop: 2, minHeight: 4 },
  calDot: { width: 4, height: 4, borderRadius: 2 },
  calLegend: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingHorizontal: 16, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 5, height: 5, borderRadius: 3 },
  legendText: { fontSize: 10, fontWeight: '500', color: theme.textMuted },
  calSelectedSection: { paddingHorizontal: 16 },
  calSelectedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  calSelectedTitle: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
  calSelectedCount: { fontSize: 11, fontWeight: '600', color: theme.textSecondary },
  calEmptyDay: { alignItems: 'center', paddingVertical: 20 },
  calEmptyText: { fontSize: 12, color: theme.textMuted },
  calHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12 },
  calHintText: { fontSize: 11, color: theme.textMuted, fontStyle: 'italic' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.textPrimary, marginTop: 6, marginBottom: 4 },
  emptyText: { fontSize: 13, color: theme.textSecondary, textAlign: 'center', lineHeight: 18, paddingHorizontal: 20, marginBottom: 16 },
  emptyCta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: theme.radius.full },
  emptyCtaText: { fontSize: 14, fontWeight: '600', color: theme.background },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetContainer: { backgroundColor: '#1C0E3A', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.surfaceLight, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: 16 },
  sheetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sheetChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  sheetChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  sheetChipText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  sheetChipTextActive: { color: '#FFF' },
  sheetChipCount: { fontSize: 12, fontWeight: '700', color: theme.textMuted },
  manifFilterTabs: { flexDirection: 'row', backgroundColor: theme.surfaceLight, borderRadius: theme.radius.md, padding: 3, marginBottom: 14, marginTop: 4 },
  manifFilterTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  manifFilterTabActive: { backgroundColor: theme.surface },
  manifFilterText: { fontSize: 13, fontWeight: '500', color: theme.textMuted },
  manifFilterTextActive: { color: theme.textPrimary, fontWeight: '600' },
  manifSummaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  manifSummaryCard: { flex: 1, backgroundColor: theme.surface, borderRadius: theme.radius.md, paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center' },
  manifSummaryValue: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  manifSummaryLabel: { fontSize: 9, fontWeight: '700', color: theme.textSecondary, letterSpacing: 0.8 },
  manifCard: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radius.lg, padding: 16, marginBottom: 12, borderLeftWidth: 3, overflow: 'hidden' },
  manifCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  manifRitualName: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
  manifDate: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  manifStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, borderWidth: 1 },
  manifStatusText: { fontSize: 11, fontWeight: '600' },
  manifIntention: { fontSize: 15, color: theme.textPrimary, lineHeight: 22, fontStyle: 'italic', marginBottom: 12 },
  manifResults: { gap: 8, marginBottom: 12 },
  manifResultEntry: { backgroundColor: theme.surfaceLight, borderLeftWidth: 2, paddingHorizontal: 12, paddingVertical: 10, borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  manifResultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  manifResultType: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  manifResultDate: { fontSize: 10, color: theme.textMuted },
  manifResultNote: { fontSize: 13, color: theme.textPrimary, lineHeight: 18 },
  manifLogBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderWidth: 1, borderColor: theme.primary + '40', borderRadius: 12, marginTop: 4, backgroundColor: theme.primary + '06' },
  manifLogBtnText: { fontSize: 13, fontWeight: '600', color: theme.primary },
  qlOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  qlSheet: { backgroundColor: '#1C0E3A', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', paddingTop: 8, paddingBottom: 16 },
  qlHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.surfaceLight, alignSelf: 'center', marginBottom: 12 },
  qlRitualName: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, textAlign: 'center', fontFamily: theme.fonts.serif, marginBottom: 16 },
  qlCosmicCard: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 14, borderWidth: 1, borderColor: theme.primary + '20', marginBottom: 4 },
  qlCosmicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  qlCosmicEmoji: { fontSize: 20 },
  qlCosmicLabel: { fontSize: 13, fontWeight: '600', color: theme.textPrimary },
  qlCosmicSub: { fontSize: 11, color: theme.textSecondary },
  qlCosmicDivider: { height: 1, backgroundColor: theme.border + '60', marginVertical: 6 },
  qlLabel: { fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginTop: 18, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  qlDateField: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 12, borderWidth: 1, borderColor: theme.primary + '30' },
  qlDateText: { flex: 1, fontSize: 14, color: theme.textPrimary, fontWeight: '500' },
  qlDateHint: { fontSize: 11, color: theme.textMuted, marginTop: 4, fontStyle: 'italic' },
  qlMoodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  qlMoodChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border },
  qlMoodChipActive: { backgroundColor: theme.primary + '20', borderColor: theme.primary },
  qlMoodChipText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  qlMoodChipTextActive: { color: theme.primary, fontWeight: '700' },
  qlNotesInput: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 12, fontSize: 15, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border, minHeight: 80, lineHeight: 22 },
  qlSaveBtn: { backgroundColor: theme.primary, borderRadius: theme.radius.md, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  qlSaveBtnDisabled: { backgroundColor: theme.surfaceLight },
  qlSaveBtnText: { fontSize: 15, fontWeight: '700', color: theme.background },
  qlSaveBtnTextDisabled: { color: theme.textMuted },
  qlMoodAddChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1.5, borderColor: theme.accent + '40', borderStyle: 'dashed', backgroundColor: theme.accent + '08' },
  qlMoodAddChipText: { fontSize: 12, fontWeight: '600', color: theme.accent },
  qlMoodAddInline: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 18, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.primary + '40' },
  qlMoodAddInput: { fontSize: 12, color: theme.textPrimary, minWidth: 80, padding: 0 },
  qlDateModal: { backgroundColor: '#231248', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: '60%' },
  qlDateModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
  qlDateModalTitle: { fontSize: 17, fontWeight: '700', color: theme.textPrimary },
  qlDateModalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  qlDateOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border + '40' },
  qlDateOptionActive: { backgroundColor: theme.primary + '12' },
  qlDateOptionText: { fontSize: 15, color: theme.textPrimary, fontWeight: '500' },
  qlDateOptionTextActive: { color: theme.primary, fontWeight: '700' },
});
