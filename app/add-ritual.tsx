import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { useAlert } from '@/template';
import StarField from '../components/StarField';
import { resolveCategoryColor } from '../utils/categoryHelpers';

const scheduleOptions = [
  { id: 'daily', label: 'Daily', icon: 'today' },
  { id: 'weekly', label: 'Weekly', icon: 'date-range' },
  { id: 'monthly', label: 'Monthly', icon: 'calendar-month' },
  { id: 'moon_phase', label: 'Moon Phase', icon: 'nightlight-round' },
  { id: 'as_needed', label: 'One Time', icon: 'more-time' },
] as const;

const DATE_OPTIONS = (() => {
  const dates: Date[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
})();

export default function AddRitualScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addRitual, addLibraryRitual, libraryRituals, categories, categoryColors, deleteCategory } = useApp();
  const { showAlert } = useAlert();

  const params = useLocalSearchParams<{ category?: string }>();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(
    params.category && categories.some(c => c.id === params.category) ? params.category : (categories[0]?.id || '')
  );
  const [description, setDescription] = useState('');
  const [intention, setIntention] = useState('');
  const [tangibleOutcome, setTangibleOutcome] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [schedule, setSchedule] = useState<'daily' | 'weekly' | 'monthly' | 'moon_phase' | 'as_needed'>('as_needed');
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [consecutiveDays, setConsecutiveDays] = useState(1);

  const needsDate = schedule !== 'as_needed';
  const canSave =
    name.trim().length > 0 &&
    intention.trim().length > 0 &&
    (!needsDate || scheduledDate !== null);

  const handleSave = () => {
    if (!canSave) return;
    addRitual({
      name: name.trim(),
      category,
      description: description.trim(),
      intention: intention.trim(),
      tangibleOutcome: tangibleOutcome.trim(),
      ingredients: ingredients.trim() ? ingredients.split(',').map(i => i.trim()).filter(Boolean) : undefined,
      schedule,
      scheduledDate: scheduledDate ? scheduledDate.toISOString() : undefined,
      consecutiveDays: schedule === 'daily' ? consecutiveDays : 1,
      status: 'scheduled',
    });

    const alreadyInLibrary = libraryRituals.some(
      r => r.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (!alreadyInLibrary) {
      addLibraryRitual({
        name: name.trim(),
        category,
        description: description.trim(),
        intention: intention.trim(),
        tangibleOutcome: tangibleOutcome.trim(),
        ingredients: ingredients.trim() ? ingredients.split(',').map(i => i.trim()).filter(Boolean) : undefined,
        schedule,
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Soft purple wash from the top */}
      <LinearGradient
        colors={[theme.primary + '28', theme.primary + '10', 'transparent']}
        locations={[0, 0.4, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320, zIndex: 0 }}
        pointerEvents="none"
      />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <StarField starCount={40} showShootingStar={false} />
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <MaterialIcons name="close" size={24} color={theme.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>New Ritual</Text>
          <Pressable onPress={handleSave} style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]} disabled={!canSave}>
            <Text style={[styles.saveBtnText, !canSave && styles.saveBtnTextDisabled]}>Save</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Name */}
            <Text style={styles.label}>Ritual Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g., Full Moon Abundance Spell" placeholderTextColor={theme.textMuted} />

            {/* Category */}
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map(cat => {
                const catColor = resolveCategoryColor(cat.id, categoryColors, categories);
                return (
                  <Pressable
                    key={cat.id}
                    style={[styles.categoryOption, category === cat.id && { backgroundColor: catColor + '20', borderColor: catColor }]}
                    onPress={() => { setCategory(cat.id); Haptics.selectionAsync(); }}
                    onLongPress={() => {
                      showAlert('Delete Category?', `Remove "${cat.name}" from your categories? This cannot be undone.`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => { deleteCategory(cat.id); if (category === cat.id) setCategory(categories[0]?.id || ''); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
                      ]);
                    }}
                    delayLongPress={500}
                  >
                    <MaterialIcons name={cat.icon as keyof typeof MaterialIcons.glyphMap} size={22} color={category === cat.id ? catColor : theme.textMuted} />
                    <Text style={[styles.categoryOptionText, category === cat.id && { color: catColor }]}>{cat.name}</Text>
                  </Pressable>
                );
              })}
              <Pressable style={styles.newCategoryOption} onPress={() => router.push('/manage-categories')}>
                <MaterialIcons name="add" size={22} color={theme.textMuted} />
                <Text style={styles.newCategoryOptionText}>New Category</Text>
              </Pressable>
            </View>

            {/* Intention */}
            <Text style={styles.label}>Intention *</Text>
            <TextInput style={[styles.input, styles.textArea]} value={intention} onChangeText={setIntention} placeholder="What is the purpose of this ritual?" placeholderTextColor={theme.textMuted} multiline textAlignVertical="top" />

            {/* Tangible Outcome — optional, auto-creates manifestation entry */}
            <Text style={styles.label}>Tangible Outcome</Text>
            <TextInput style={[styles.input, styles.textArea]} value={tangibleOutcome} onChangeText={setTangibleOutcome} placeholder="Optional: a specific measurable result. e.g. Receive $5,000 within 30 days" placeholderTextColor={theme.textMuted} multiline textAlignVertical="top" />
            <Text style={styles.hint}>✦ If set, auto-adds an entry in your Cauldron (manifestation tracker)</Text>

            {/* Description */}
            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Describe the ritual process, steps, and any special notes..." placeholderTextColor={theme.textMuted} multiline textAlignVertical="top" />

            {/* Ingredients */}
            <Text style={styles.label}>Ingredients & Tools</Text>
            <TextInput style={styles.input} value={ingredients} onChangeText={setIngredients} placeholder="Comma-separated: candle, herbs, crystal..." placeholderTextColor={theme.textMuted} />
            <Text style={styles.hint}>Separate items with commas</Text>

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

            {/* Consecutive Days — only for daily */}
            {schedule === 'daily' && (
              <>
                <Text style={styles.label}>Consecutive Days</Text>
                <View style={styles.consecutiveRow}>
                  <Pressable
                    style={styles.consecutiveBtn}
                    onPress={() => { setConsecutiveDays(d => Math.max(1, d - 1)); Haptics.selectionAsync(); }}
                  >
                    <MaterialIcons name="remove" size={20} color={theme.textPrimary} />
                  </Pressable>
                  <Text style={styles.consecutiveValue}>{consecutiveDays}</Text>
                  <Pressable
                    style={styles.consecutiveBtn}
                    onPress={() => { setConsecutiveDays(d => d + 1); Haptics.selectionAsync(); }}
                  >
                    <MaterialIcons name="add" size={20} color={theme.textPrimary} />
                  </Pressable>
                  <Text style={styles.consecutiveLabel}>
                    {consecutiveDays === 1 ? 'day' : 'days in a row'}
                  </Text>
                </View>
              </>
            )}

            {/* Inline date selector — hidden for as_needed */}
            {needsDate && (
              <>
                <Text style={styles.label}>Start Date *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dateStrip}
                >
                  {DATE_OPTIONS.map((d, i) => {
                    const isSelected = scheduledDate?.toDateString() === d.toDateString();
                    const isToday = d.toDateString() === new Date().toDateString();
                    return (
                      <Pressable
                        key={i}
                        style={[styles.datePill, isSelected && styles.datePillActive]}
                        onPress={() => { setScheduledDate(d); Haptics.selectionAsync(); }}
                      >
                        <Text style={[styles.datePillDay, isSelected && styles.datePillTextActive]}>
                          {isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}
                        </Text>
                        <Text style={[styles.datePillNum, isSelected && styles.datePillTextActive]}>
                          {d.getDate()}
                        </Text>
                        <Text style={[styles.datePillMonth, isSelected && styles.datePillTextActive]}>
                          {d.toLocaleDateString('en-US', { month: 'short' })}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {!scheduledDate ? (
                  <Text style={styles.hint}>Swipe to pick a start date</Text>
                ) : (
                  <Text style={[styles.hint, { color: theme.primary }]}>
                    Scheduled for {scheduledDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Text>
                )}
              </>
            )}
          </ScrollView>
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
  label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 14, fontSize: 15, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border },
  textArea: { minHeight: 100, paddingTop: 14 },
  hint: { fontSize: 12, color: theme.textMuted, marginTop: 4, marginLeft: 4, fontStyle: 'italic' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryOption: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.radius.md, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border },
  categoryOptionText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  newCategoryOption: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.radius.md, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.textMuted + '40', borderStyle: 'dashed' },
  newCategoryOptionText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  scheduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  scheduleOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.radius.md, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border },
  scheduleOptionActive: { backgroundColor: theme.primary + '15', borderColor: theme.primary },
  scheduleOptionText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  scheduleOptionTextActive: { color: theme.primary },
  consecutiveRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  consecutiveBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  consecutiveValue: { fontSize: 22, fontWeight: '700', color: theme.textPrimary, minWidth: 32, textAlign: 'center' },
  consecutiveLabel: { fontSize: 14, color: theme.textSecondary },
  dateStrip: { paddingVertical: 4, paddingRight: 16, gap: 8 },
  datePill: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border, minWidth: 58 },
  datePillActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  datePillDay: { fontSize: 11, fontWeight: '600', color: theme.textMuted, marginBottom: 2 },
  datePillNum: { fontSize: 20, fontWeight: '700', color: theme.textPrimary },
  datePillMonth: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  datePillTextActive: { color: theme.background },
});
