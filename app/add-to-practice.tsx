import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { useAlert } from '@/template';

const scheduleOptions = [
  { id: 'daily', label: 'Daily', icon: 'today' },
  { id: 'weekly', label: 'Weekly', icon: 'date-range' },
  { id: 'monthly', label: 'Monthly', icon: 'calendar-month' },
  { id: 'moon_phase', label: 'Moon Phase', icon: 'nightlight-round' },
  { id: 'as_needed', label: 'As Needed', icon: 'more-time' },
] as const;

export default function AddToPracticeScreen() {
  const { libraryId } = useLocalSearchParams<{ libraryId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { libraryRituals, addToPractice, categoryColors, categories } = useApp();
  const { showAlert } = useAlert();

  const libRitual = libraryRituals.find(r => r.id === libraryId);

  const [schedule, setSchedule] = useState<'daily' | 'weekly' | 'monthly' | 'moon_phase' | 'as_needed'>(
    libRitual?.schedule || 'as_needed'
  );
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [consecutiveDays, setConsecutiveDays] = useState('1');

  const generateDateOptions = () => {
    const dates: Date[] = [];
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 0; i < 60; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };
  const dateOptions = generateDateOptions();

  const formatDateDisplay = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const needsDate = schedule !== 'as_needed';
  const parsedConsecutive = Math.max(1, parseInt(consecutiveDays) || 1);
  const canSave = needsDate ? scheduledDate !== null : true;

  const handleSave = () => {
    if (!canSave || !libraryId) return;
    addToPractice(libraryId, {
      scheduledDate: scheduledDate ? scheduledDate.toISOString() : undefined,
      schedule,
      consecutiveDays: parsedConsecutive,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showAlert('Added to Practice!', `${libRitual?.name || 'Ritual'} has been scheduled.`);
    router.back();
  };

  if (!libRitual) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Library ritual not found</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.primary, fontWeight: '600' }}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const catObj = categories.find(c => c.id === libRitual.category);
  const catColor = categoryColors[libRitual.category] || theme.accent;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialIcons name="close" size={24} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Add to Practice</Text>
        <Pressable onPress={handleSave} style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]} disabled={!canSave}>
          <Text style={[styles.saveBtnText, !canSave && styles.saveBtnTextDisabled]}>Save</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Ritual Info Card */}
          <View style={styles.ritualCard}>
            <View style={styles.ritualCardHeader}>
              <MaterialIcons
                name={(catObj?.icon || 'auto-awesome') as keyof typeof MaterialIcons.glyphMap}
                size={28}
                color={catColor}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.ritualName}>{libRitual.name}</Text>
                <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
                  <Text style={[styles.categoryBadgeText, { color: catColor }]}>{catObj?.name || libRitual.category}</Text>
                </View>
              </View>
            </View>
            {libRitual.intention ? (
              <Text style={styles.ritualIntention} numberOfLines={2}>{libRitual.intention}</Text>
            ) : null}
          </View>

          {/* Schedule */}
          <Text style={styles.label}>Schedule</Text>
          <View style={styles.scheduleGrid}>
            {scheduleOptions.map(opt => (
              <Pressable
                key={opt.id}
                style={[styles.scheduleOption, schedule === opt.id && styles.scheduleOptionActive]}
                onPress={() => { setSchedule(opt.id); Haptics.selectionAsync(); }}
              >
                <MaterialIcons name={opt.icon as keyof typeof MaterialIcons.glyphMap} size={20} color={schedule === opt.id ? theme.primary : theme.textMuted} />
                <Text style={[styles.scheduleOptionText, schedule === opt.id && styles.scheduleOptionTextActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          {schedule === 'as_needed' ? (
            <View style={styles.asNeededNote}>
              <MaterialIcons name="info-outline" size={16} color={theme.textMuted} />
              <Text style={styles.asNeededNoteText}>As needed rituals will appear in your tracker without a scheduled date.</Text>
            </View>
          ) : null}

          {/* Consecutive Days */}
          {needsDate ? (
            <>
              <Text style={styles.label}>Number of Consecutive Days</Text>
              <TextInput
                style={[styles.input, { width: 100 }]}
                value={consecutiveDays}
                onChangeText={setConsecutiveDays}
                placeholder="1"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={styles.hint}>e.g. enter 3 if this ritual must be performed 3 days in a row</Text>
            </>
          ) : null}

          {/* Scheduled Date */}
          {needsDate ? (
            <>
              <Text style={styles.label}>Scheduled Date *</Text>
              <Pressable style={styles.dateField} onPress={() => setShowDatePicker(true)}>
                <MaterialIcons name="event" size={20} color={scheduledDate ? theme.primary : theme.textMuted} />
                <Text style={[styles.dateFieldText, !scheduledDate && { color: theme.textMuted }]}>
                  {scheduledDate ? formatDateDisplay(scheduledDate) : 'Select a date for this ritual...'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color={theme.textMuted} />
              </Pressable>
              {!scheduledDate ? <Text style={styles.hint}>Required - pick the date this ritual is scheduled</Text> : null}
            </>
          ) : null}
        </ScrollView>

        {/* Date Picker Modal */}
        <Modal visible={showDatePicker} transparent animationType="slide">
          <Pressable style={styles.dateModalOverlay} onPress={() => setShowDatePicker(false)}>
            <Pressable style={styles.dateModalContent} onPress={() => {}}>
              <View style={styles.dateModalHeader}>
                <Text style={styles.dateModalTitle}>Select Date</Text>
                <Pressable onPress={() => setShowDatePicker(false)} style={styles.dateModalClose}>
                  <MaterialIcons name="close" size={22} color={theme.textPrimary} />
                </Pressable>
              </View>
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {dateOptions.map((d, i) => {
                  const isSelected = scheduledDate && d.toDateString() === scheduledDate.toDateString();
                  const isToday = d.toDateString() === new Date().toDateString();
                  return (
                    <Pressable
                      key={i}
                      style={[styles.dateOption, isSelected && styles.dateOptionActive]}
                      onPress={() => { setScheduledDate(d); setShowDatePicker(false); Haptics.selectionAsync(); }}
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

  // Ritual Info Card
  ritualCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.primary + '20',
    ...theme.shadows.card,
  },
  ritualCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ritualName: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  categoryBadgeText: { fontSize: 11, fontWeight: '600' },
  ritualIntention: { fontSize: 13, color: theme.textSecondary, marginTop: 10, lineHeight: 18, fontStyle: 'italic' },

  label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginTop: 24, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 14, fontSize: 15, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border },
  hint: { fontSize: 12, color: theme.textMuted, marginTop: 4, marginLeft: 4, fontStyle: 'italic' },

  scheduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  scheduleOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.radius.md, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border },
  scheduleOptionActive: { backgroundColor: theme.primary + '15', borderColor: theme.primary },
  scheduleOptionText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  scheduleOptionTextActive: { color: theme.primary },

  asNeededNote: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 4 },
  asNeededNoteText: { flex: 1, fontSize: 12, color: theme.textMuted, fontStyle: 'italic', lineHeight: 16 },

  // Date Field
  dateField: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 14, borderWidth: 1, borderColor: theme.border },
  dateFieldText: { flex: 1, fontSize: 15, color: theme.textPrimary, fontWeight: '500' },

  // Date Picker Modal
  dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dateModalContent: { backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: '60%' },
  dateModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
  dateModalTitle: { fontSize: 17, fontWeight: '700', color: theme.textPrimary },
  dateModalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  dateOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border + '40' },
  dateOptionActive: { backgroundColor: theme.primary + '12' },
  dateOptionText: { fontSize: 15, color: theme.textPrimary, fontWeight: '500' },
  dateOptionTextActive: { color: theme.primary, fontWeight: '700' },
});
