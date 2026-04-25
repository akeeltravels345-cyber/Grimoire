import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { theme, getCurrentMoonPhase } from '../constants/theme';
import { getTodayPlanet } from '../constants/planetaryData';
import { getCurrentPlanetaryHour } from '../services/planetaryHours';
import { useApp } from '../contexts/AppContext';

const MOODS = [
  'Connected', 'Peaceful', 'Grateful', 'Empowered', 'Focused',
  'Reflective', 'Grounded', 'Centered', 'Soothed', 'Hopeful',
  'Contemplative', 'Determined', 'Joyful', 'Elevated', 'Liberated',
  'Radiant', 'Confident',
];

const ENERGY_LEVELS = [
  { value: 1, label: 'Low', icon: 'battery-1-bar' },
  { value: 2, label: 'Moderate', icon: 'battery-3-bar' },
  { value: 3, label: 'High', icon: 'battery-full' },
  { value: 4, label: 'Electric', icon: 'bolt' },
] as const;

export default function LogRitualScreen() {
  const { ritualId } = useLocalSearchParams<{ ritualId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rituals, addJournalEntry, addRitual } = useApp();
  const ritual = rituals.find(r => r.id === ritualId);

  const [notes, setNotes] = useState('');
  const [completedDate, setCompletedDate] = useState<Date>(new Date());
  const [showCompletedDatePicker, setShowCompletedDatePicker] = useState(false);
  const [mood, setMood] = useState('');
  const [energyLevel, setEnergyLevel] = useState(0);

  const [nextDate, setNextDate] = useState<Date | null>(null);
  const [showNextDatePicker, setShowNextDatePicker] = useState(false);
  const [scheduleNext, setScheduleNext] = useState(true);

  // Compute suggested next date based on schedule type
  const suggestedNextDate = useMemo(() => {
    if (!ritual) return null;
    const base = ritual.scheduledDate ? new Date(ritual.scheduledDate) : new Date();
    const now = new Date();
    switch (ritual.schedule) {
      case 'daily': {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        return d;
      }
      case 'weekly': {
        const d = new Date(base);
        d.setDate(d.getDate() + 7);
        // If that date is in the past, advance from today
        if (d <= now) { d.setTime(now.getTime()); d.setDate(d.getDate() + 7); }
        return d;
      }
      case 'monthly': {
        const d = new Date(base);
        d.setMonth(d.getMonth() + 1);
        if (d <= now) { d.setTime(now.getTime()); d.setMonth(d.getMonth() + 1); }
        return d;
      }
      case 'moon_phase': {
        const d = new Date(now);
        d.setDate(d.getDate() + 29);
        return d;
      }
      case 'as_needed':
      default:
        return null;
    }
  }, [ritual]);

  // Initialize nextDate from suggestion
  useState(() => {
    if (suggestedNextDate && nextDate === null) {
      setNextDate(suggestedNextDate);
    }
  });

  // Generate date options for completed date picker (past 60 days + today)
  const completedDateOptions = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 60; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d);
    }
    return dates;
  }, []);

  // Generate date options for picker (next 90 days)
  const nextDateOptions = useMemo(() => {
    const dates: Date[] = [];
    const start = new Date();
    start.setDate(start.getDate() + 1);
    for (let i = 0; i < 90; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const moonPhase = getCurrentMoonPhase();
  const todayPlanet = getTodayPlanet();
  const currentHour = getCurrentPlanetaryHour();

  const canSave = notes.trim().length > 0 && mood.length > 0;

  const handleSave = () => {
    if (!canSave || !ritualId) return;

    const energyLabel = ENERGY_LEVELS.find(e => e.value === energyLevel)?.label || '';
    const energyStr = energyLabel ? ` | Energy: ${energyLabel}` : '';
    const cosmicStr = `Moon: ${moonPhase.name} | Planet Hour: ${currentHour?.planet.name || 'Unknown'}`;

    addJournalEntry(ritualId, {
      date: completedDate.toISOString(),
      notes: notes.trim() + (energyStr ? `\n\n---\n${cosmicStr}${energyStr}` : ''),
      mood,
    });

    // Auto-create next occurrence if scheduled
    if (scheduleNext && nextDate && ritual) {
      addRitual({
        name: ritual.name,
        category: ritual.category,
        description: ritual.description,
        intention: ritual.intention,
        tangibleOutcome: ritual.tangibleOutcome,
        ingredients: ritual.ingredients,
        schedule: ritual.schedule,
        scheduleDetail: ritual.scheduleDetail,
        scheduledDate: nextDate.toISOString(),
        status: 'scheduled',
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  if (!ritual) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Ritual not found</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.primary, fontWeight: '600' }}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialIcons name="close" size={24} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Log Ritual</Text>
        <Pressable onPress={handleSave} style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]} disabled={!canSave}>
          <Text style={[styles.saveBtnText, !canSave && styles.saveBtnTextDisabled]}>Save</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.ritualInfo}>
            <Image source={require('../assets/images/ritual-complete.png')} style={styles.ritualImage} contentFit="contain" />
            <Text style={styles.ritualName}>{ritual.name}</Text>
            <Text style={styles.ritualDate}>
              {completedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>

          {/* Date Completed */}
          <Text style={styles.label}>Date Completed</Text>
          <Pressable style={styles.completedDateField} onPress={() => setShowCompletedDatePicker(true)}>
            <MaterialIcons name="event-available" size={20} color={theme.primary} />
            <Text style={styles.completedDateText}>
              {completedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
            <MaterialIcons name="edit-calendar" size={18} color={theme.textMuted} />
          </Pressable>
          <Text style={styles.completedDateHint}>Defaults to today — change if you are logging a past practice</Text>

          {/* Cosmic Context Card */}
          <View style={styles.cosmicCard}>
            <View style={styles.cosmicRow}>
              <Text style={styles.cosmicEmoji}>{moonPhase.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cosmicLabel}>{moonPhase.name}</Text>
                <Text style={styles.cosmicSub}>{moonPhase.energy}</Text>
              </View>
            </View>
            <View style={styles.cosmicDivider} />
            <View style={styles.cosmicRow}>
              <Text style={styles.cosmicEmoji}>{todayPlanet.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cosmicLabel}>Day of {todayPlanet.name}</Text>
                <Text style={styles.cosmicSub}>{todayPlanet.bestWorkings[0]}</Text>
              </View>
            </View>
            {currentHour ? (
              <>
                <View style={styles.cosmicDivider} />
                <View style={styles.cosmicRow}>
                  <Text style={styles.cosmicEmoji}>{currentHour.planet.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cosmicLabel}>Hour of {currentHour.planet.name}</Text>
                    <Text style={styles.cosmicSub}>{currentHour.planet.bestWorkings[0]}</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>

          {/* How do you feel? */}
          <Text style={styles.label}>How do you feel? *</Text>
          <View style={styles.moodGrid}>
            {MOODS.map(m => (
              <Pressable key={m} style={[styles.moodChip, mood === m && styles.moodChipActive]} onPress={() => { setMood(m); Haptics.selectionAsync(); }}>
                <Text style={[styles.moodChipText, mood === m && styles.moodChipTextActive]}>{m}</Text>
              </Pressable>
            ))}
          </View>

          {/* Energy Level */}
          <Text style={styles.label}>Energy Level</Text>
          <View style={styles.energyRow}>
            {ENERGY_LEVELS.map(e => (
              <Pressable key={e.value} style={[styles.energyOption, energyLevel === e.value && styles.energyOptionActive]}
                onPress={() => { setEnergyLevel(energyLevel === e.value ? 0 : e.value); Haptics.selectionAsync(); }}>
                <MaterialIcons name={e.icon as keyof typeof MaterialIcons.glyphMap} size={20} color={energyLevel === e.value ? theme.primary : theme.textMuted} />
                <Text style={[styles.energyText, energyLevel === e.value && { color: theme.primary }]}>{e.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Notes */}
          <Text style={styles.label}>Notes *</Text>
          <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} placeholder="Describe your experience... What happened? What did you notice? How did the energy feel?" placeholderTextColor={theme.textMuted} multiline textAlignVertical="top" />

          {/* Schedule Next Occurrence */}
          <View style={styles.nextSection}>
            <View style={styles.nextHeader}>
              <MaterialIcons name="event-repeat" size={20} color={theme.primary} />
              <Text style={styles.nextTitle}>Schedule Next Occurrence</Text>
              <Pressable
                style={[styles.nextToggle, scheduleNext && styles.nextToggleActive]}
                onPress={() => { setScheduleNext(!scheduleNext); Haptics.selectionAsync(); }}
              >
                <MaterialIcons
                  name={scheduleNext ? 'check-box' : 'check-box-outline-blank'}
                  size={22}
                  color={scheduleNext ? theme.primary : theme.textMuted}
                />
              </Pressable>
            </View>

            {scheduleNext ? (
              <>
                <Text style={styles.nextHint}>
                  {ritual.schedule === 'daily' ? 'Daily ritual — suggested: tomorrow'
                    : ritual.schedule === 'weekly' ? 'Weekly ritual — suggested: 7 days from last date'
                    : ritual.schedule === 'monthly' ? 'Monthly ritual — suggested: same day next month'
                    : ritual.schedule === 'moon_phase' ? 'Moon phase ritual — suggested: ~29 days'
                    : 'As needed — pick a date or uncheck to skip'}
                </Text>
                <Pressable style={styles.nextDateField} onPress={() => setShowNextDatePicker(true)}>
                  <MaterialIcons name="event" size={20} color={nextDate ? theme.primary : theme.textMuted} />
                  <Text style={[styles.nextDateText, !nextDate && { color: theme.textMuted }]}>
                    {nextDate
                      ? nextDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
                      : 'Select a date...'}
                  </Text>
                  <MaterialIcons name="edit-calendar" size={18} color={theme.textMuted} />
                </Pressable>
                {nextDate ? (
                  <View style={styles.nextPreview}>
                    <MaterialIcons name="auto-awesome" size={14} color={theme.accent} />
                    <Text style={styles.nextPreviewText}>
                      A new "{ritual.name}" will be created as Scheduled for this date
                    </Text>
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.nextSkip}>Next occurrence will not be auto-scheduled</Text>
            )}
          </View>
        </ScrollView>

        {/* Completed Date Picker Modal */}
        <Modal visible={showCompletedDatePicker} transparent animationType="slide">
          <Pressable style={styles.dateModalOverlay} onPress={() => setShowCompletedDatePicker(false)}>
            <Pressable style={styles.dateModalContent} onPress={() => {}}>
              <View style={styles.dateModalHeader}>
                <Text style={styles.dateModalTitle}>Date Completed</Text>
                <Pressable onPress={() => setShowCompletedDatePicker(false)} style={styles.dateModalClose}>
                  <MaterialIcons name="close" size={22} color={theme.textPrimary} />
                </Pressable>
              </View>
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {completedDateOptions.map((d, i) => {
                  const isSelected = d.toDateString() === completedDate.toDateString();
                  const isToday = d.toDateString() === new Date().toDateString();
                  return (
                    <Pressable
                      key={i}
                      style={[styles.dateOption, isSelected && styles.dateOptionActive]}
                      onPress={() => { setCompletedDate(d); setShowCompletedDatePicker(false); Haptics.selectionAsync(); }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.dateOptionText, isSelected && styles.dateOptionTextActive]}>
                          {d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                          {isToday ? '  (Today)' : ''}
                        </Text>
                      </View>
                      {isSelected ? <MaterialIcons name="check-circle" size={20} color={theme.primary} /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Next Date Picker Modal */}
        <Modal visible={showNextDatePicker} transparent animationType="slide">
          <Pressable style={styles.dateModalOverlay} onPress={() => setShowNextDatePicker(false)}>
            <Pressable style={styles.dateModalContent} onPress={() => {}}>
              <View style={styles.dateModalHeader}>
                <Text style={styles.dateModalTitle}>Next Occurrence</Text>
                <Pressable onPress={() => setShowNextDatePicker(false)} style={styles.dateModalClose}>
                  <MaterialIcons name="close" size={22} color={theme.textPrimary} />
                </Pressable>
              </View>
              {suggestedNextDate ? (
                <Pressable
                  style={styles.suggestedRow}
                  onPress={() => { setNextDate(suggestedNextDate); setShowNextDatePicker(false); Haptics.selectionAsync(); }}
                >
                  <MaterialIcons name="auto-awesome" size={16} color={theme.primary} />
                  <Text style={styles.suggestedText}>Suggested: {suggestedNextDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}</Text>
                </Pressable>
              ) : null}
              <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                {nextDateOptions.map((d, i) => {
                  const isSelected = nextDate && d.toDateString() === nextDate.toDateString();
                  const isSuggested = suggestedNextDate && d.toDateString() === suggestedNextDate.toDateString();
                  return (
                    <Pressable
                      key={i}
                      style={[styles.dateOption, isSelected && styles.dateOptionActive]}
                      onPress={() => { setNextDate(d); setShowNextDatePicker(false); Haptics.selectionAsync(); }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.dateOptionText, isSelected && styles.dateOptionTextActive]}>
                          {d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                          {isSuggested ? '  (Suggested)' : ''}
                        </Text>
                      </View>
                      {isSelected ? <MaterialIcons name="check-circle" size={20} color={theme.primary} /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: theme.textPrimary },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, backgroundColor: theme.primary, borderRadius: theme.radius.sm },
  saveBtnDisabled: { backgroundColor: theme.surfaceLight },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: theme.background },
  saveBtnTextDisabled: { color: theme.textMuted },
  ritualInfo: { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
  ritualImage: { width: 80, height: 80, marginBottom: 16 },
  ritualName: { fontSize: 20, fontWeight: '700', color: theme.textPrimary, textAlign: 'center', marginBottom: 4 },
  ritualDate: { fontSize: 14, color: theme.textSecondary },
  completedDateField: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.surface, borderRadius: theme.radius.md,
    padding: 14, borderWidth: 1, borderColor: theme.primary + '30',
  },
  completedDateText: { flex: 1, fontSize: 15, color: theme.textPrimary, fontWeight: '500' },
  completedDateHint: { fontSize: 12, color: theme.textMuted, marginTop: 6, marginLeft: 4, fontStyle: 'italic' },

  // Cosmic Context
  cosmicCard: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 14, marginTop: 16, borderWidth: 1, borderColor: theme.primary + '20', ...theme.shadows.card },
  cosmicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  cosmicEmoji: { fontSize: 20 },
  cosmicLabel: { fontSize: 13, fontWeight: '600', color: theme.textPrimary },
  cosmicSub: { fontSize: 11, color: theme.textSecondary },
  cosmicDivider: { height: 1, backgroundColor: theme.border + '60', marginVertical: 6 },

  label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginTop: 24, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moodChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border },
  moodChipActive: { backgroundColor: theme.primary + '20', borderColor: theme.primary },
  moodChipText: { fontSize: 13, fontWeight: '500', color: theme.textMuted },
  moodChipTextActive: { color: theme.primary, fontWeight: '600' },

  // Energy
  energyRow: { flexDirection: 'row', gap: 10 },
  energyOption: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, backgroundColor: theme.surface, borderRadius: theme.radius.md, borderWidth: 1.5, borderColor: theme.border },
  energyOptionActive: { backgroundColor: theme.primary + '15', borderColor: theme.primary },
  energyText: { fontSize: 11, fontWeight: '600', color: theme.textMuted },

  input: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 14, fontSize: 15, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border },
  textArea: { minHeight: 120, paddingTop: 14, lineHeight: 22 },

  // Schedule Next Occurrence
  nextSection: {
    backgroundColor: theme.surface, borderRadius: theme.radius.lg, padding: 16,
    marginTop: 24, borderWidth: 1, borderColor: theme.primary + '25',
    ...theme.shadows.card,
  },
  nextHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.textPrimary },
  nextToggle: { padding: 4 },
  nextToggleActive: {},
  nextHint: { fontSize: 12, color: theme.textSecondary, fontStyle: 'italic', marginTop: 8, marginBottom: 12, lineHeight: 17 },
  nextDateField: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.surfaceLight, borderRadius: theme.radius.md,
    padding: 14, borderWidth: 1, borderColor: theme.border,
  },
  nextDateText: { flex: 1, fontSize: 15, color: theme.textPrimary, fontWeight: '500' },
  nextPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingHorizontal: 4,
  },
  nextPreviewText: { fontSize: 12, color: theme.accent, fontStyle: 'italic', flex: 1, lineHeight: 16 },
  nextSkip: { fontSize: 12, color: theme.textMuted, fontStyle: 'italic', marginTop: 8 },

  // Date Picker Modal
  dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dateModalContent: { backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: '60%' },
  dateModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  dateModalTitle: { fontSize: 17, fontWeight: '700', color: theme.textPrimary },
  dateModalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  suggestedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: theme.primary + '0C',
    borderBottomWidth: 1, borderBottomColor: theme.border + '40',
  },
  suggestedText: { fontSize: 14, fontWeight: '600', color: theme.primary },
  dateOption: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.border + '40',
  },
  dateOptionActive: { backgroundColor: theme.primary + '12' },
  dateOptionText: { fontSize: 15, color: theme.textPrimary, fontWeight: '500' },
  dateOptionTextActive: { color: theme.primary, fontWeight: '700' },
});
