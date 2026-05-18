import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, getCurrentMoonPhase } from '../constants/theme';
import { getTodayPlanet } from '../constants/planetaryData';
import { getCurrentPlanetaryHour } from '../services/planetaryHours';
import { useApp } from '../contexts/AppContext';
import { useAlert } from '@/template';
import StarField from '../components/StarField';

export default function LogRitualScreen() {
  const { ritualId, mode } = useLocalSearchParams<{ ritualId: string; mode?: string }>();
  const isReflectMode = mode === 'reflect';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rituals, addJournalEntry, moods, addMood, deleteMood } = useApp();
  const { showAlert } = useAlert();
  const ritual = rituals.find(r => r.id === ritualId);

  const [notes, setNotes] = useState('');
  const [completedDate, setCompletedDate] = useState<Date>(new Date());
  const [showCompletedDatePicker, setShowCompletedDatePicker] = useState(false);
  const [mood, setMood] = useState('');
  const [isAddingMood, setIsAddingMood] = useState(false);
  const [newMoodText, setNewMoodText] = useState('');

  const moonPhase = getCurrentMoonPhase();
  const todayPlanet = getTodayPlanet();
  const currentHour = getCurrentPlanetaryHour();

  const canSave = mood.length > 0;

  const handleSave = () => {
    if (!canSave || !ritualId) return;

    const cosmicParts: string[] = [
      `${moonPhase.icon} ${moonPhase.name} · ${moonPhase.energy}`,
      `${todayPlanet.emoji} Day of ${todayPlanet.name}`,
    ];
    if (currentHour) cosmicParts.push(`${currentHour.planet.emoji} Hour of ${currentHour.planet.name}`);

    addJournalEntry(
      ritualId,
      { date: completedDate.toISOString(), notes: notes.trim(), mood, cosmicContext: cosmicParts.join(' · ') },
      { markComplete: !isReflectMode }
    );

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  if (!ritual) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView edges={['top']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Ritual not found</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.primary, fontWeight: '600' }}>Go back</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={[theme.primary + '20', theme.primary + '08', 'transparent']}
        locations={[0, 0.4, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280 }}
        pointerEvents="none"
      />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <StarField starCount={40} showShootingStar={false} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialIcons name="close" size={24} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{isReflectMode ? 'Add Reflection' : 'Log Ritual'}</Text>
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

          {/* Date */}
          <Text style={styles.label}>{isReflectMode ? 'Date' : 'Date Completed'}</Text>
          <Pressable style={styles.completedDateField} onPress={() => setShowCompletedDatePicker(true)}>
            <MaterialIcons name="event-available" size={20} color={theme.primary} />
            <Text style={styles.completedDateText}>
              {completedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
            <MaterialIcons name="edit-calendar" size={18} color={theme.textMuted} />
          </Pressable>
          <Text style={styles.completedDateHint}>{isReflectMode ? 'Defaults to today — change if reflecting on a past moment' : 'Defaults to today — change if you are logging a past practice'}</Text>

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
            {moods.map(m => (
              <Pressable key={m} style={[styles.moodChip, mood === m && styles.moodChipActive]} onPress={() => { setMood(m); Haptics.selectionAsync(); }} onLongPress={() => { showAlert('Delete Mood?', `Remove "${m}" from your mood options?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { deleteMood(m); if (mood === m) setMood(''); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } }]); }} delayLongPress={500}>
                <Text style={[styles.moodChipText, mood === m && styles.moodChipTextActive]}>{m}</Text>
              </Pressable>
            ))}
            {isAddingMood ? (
              <View style={styles.moodAddInline}>
                <TextInput style={styles.moodAddInput} value={newMoodText} onChangeText={setNewMoodText} placeholder="New mood..." placeholderTextColor={theme.textMuted} autoFocus onSubmitEditing={() => { if (newMoodText.trim()) { addMood(newMoodText.trim()); setNewMoodText(''); } setIsAddingMood(false); }} returnKeyType="done" />
                <Pressable onPress={() => { if (newMoodText.trim()) { addMood(newMoodText.trim()); setNewMoodText(''); } setIsAddingMood(false); }} hitSlop={8}><MaterialIcons name="check" size={18} color={theme.success} /></Pressable>
                <Pressable onPress={() => { setIsAddingMood(false); setNewMoodText(''); }} hitSlop={8}><MaterialIcons name="close" size={18} color={theme.textMuted} /></Pressable>
              </View>
            ) : (
              <Pressable style={styles.moodAddChip} onPress={() => { setIsAddingMood(true); Haptics.selectionAsync(); }}>
                <MaterialIcons name="add" size={14} color={theme.accent} />
                <Text style={styles.moodAddChipText}>Add</Text>
              </Pressable>
            )}
          </View>

          {/* Notes */}
          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} placeholder="Describe your experience... What happened? What did you notice? How did the energy feel?" placeholderTextColor={theme.textMuted} multiline textAlignVertical="top" />
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
                {(() => {
                  const options: Date[] = [];
                  const now = new Date();
                  for (let i = 0; i < 60; i++) {
                    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
                    options.push(d);
                  }
                  return options;
                })().map((d, i) => {
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
      
      </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  moodAddChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: theme.accent + '40', borderStyle: 'dashed', backgroundColor: theme.accent + '08' },
  moodAddChipText: { fontSize: 13, fontWeight: '600', color: theme.accent },
  moodAddInline: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.primary + '40' },
  moodAddInput: { fontSize: 13, color: theme.textPrimary, minWidth: 80, padding: 0 },

  input: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 14, fontSize: 15, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border },
  textArea: { minHeight: 120, paddingTop: 14, lineHeight: 22 },


  // Date Picker Modal
  dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dateModalContent: { backgroundColor: '#231248', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: '60%' },
  dateModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  dateModalTitle: { fontSize: 17, fontWeight: '700', color: theme.textPrimary },
  dateModalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  dateOption: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.border + '40',
  },
  dateOptionActive: { backgroundColor: theme.primary + '12' },
  dateOptionText: { fontSize: 15, color: theme.textPrimary, fontWeight: '500' },
  dateOptionTextActive: { color: theme.primary, fontWeight: '700' },
});
