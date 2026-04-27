import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { useAlert } from '@/template';
import GradientScreen from '../components/GradientScreen';

const scheduleOptions = [
  { id: 'daily', label: 'Daily', icon: 'today' },
  { id: 'weekly', label: 'Weekly', icon: 'date-range' },
  { id: 'monthly', label: 'Monthly', icon: 'calendar-month' },
  { id: 'moon_phase', label: 'Moon Phase', icon: 'nightlight-round' },
  { id: 'as_needed', label: 'As Needed', icon: 'more-time' },
] as const;

export default function AddRitualScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addRitual, addLibraryRitual, libraryRituals, categories, categoryColors, deleteCategory } = useApp();
  const { showAlert } = useAlert();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(categories[0]?.id || '');
  const [description, setDescription] = useState('');
  const [intention, setIntention] = useState('');
  const [tangibleOutcome, setTangibleOutcome] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [schedule, setSchedule] = useState<'daily' | 'weekly' | 'monthly' | 'moon_phase' | 'as_needed'>('as_needed');
  const [scheduleDetail, setScheduleDetail] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [consecutiveDays, setConsecutiveDays] = useState('1');

  // Generate days for the current and next month
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

  const needsDate = true;
  const parsedConsecutive = Math.max(1, parseInt(consecutiveDays) || 1);
  const canSave = name.trim().length > 0 && intention.trim().length > 0 && tangibleOutcome.trim().length > 0 && (needsDate ? scheduledDate !== null : true);

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
      scheduleDetail: scheduleDetail.trim() || undefined,
      scheduledDate: scheduledDate ? scheduledDate.toISOString() : undefined,
      consecutiveDays: parsedConsecutive,
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
    <GradientScreen>
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
              const catColor = categoryColors[cat.id] || theme.accent;
              return (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryOption,
                    category === cat.id && { backgroundColor: catColor + '20', borderColor: catColor },
                  ]}
                  onPress={() => { setCategory(cat.id); Haptics.selectionAsync(); }}
                  onLongPress={() => {
                    showAlert(
                      'Delete Category?',
                      `Remove "${cat.name}" from your categories? This cannot be undone.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => {
                            deleteCategory(cat.id);
                            if (category === cat.id) setCategory(categories[0]?.id || '');
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                          },
                        },
                      ]
                    );
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
          <Text style={styles.hint}>Create a new category in Manage Categories</Text>

             {/* Intention */}
          <Text style={styles.label}>Intention *</Text>
          <TextInput style={[styles.input, styles.textArea]} value={intention} onChangeText={setIntention} placeholder="What is the purpose of this ritual?" placeholderTextColor={theme.textMuted} multiline textAlignVertical="top" />
         
          {/* Tangible Outcome */}
          <Text style={styles.label}>Tangible Outcome *</Text>
          <TextInput style={[styles.input, styles.textArea]} value={tangibleOutcome} onChangeText={setTangibleOutcome} placeholder="Translate that intention into a specific measurable result. Be specific e.g. Receive $5,000 within 30 days" placeholderTextColor={theme.textMuted} multiline textAlignVertical="top" />
          <Text style={styles.hint}> The information in this field auto generates an entery in your manifestation tracker .</Text>

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
              <Pressable key={opt.id} style={[styles.scheduleOption, schedule === opt.id && styles.scheduleOptionActive]} onPress={() => { setSchedule(opt.id); if (opt.id === 'as_needed') { } Haptics.selectionAsync(); }}>
                <MaterialIcons name={opt.icon as keyof typeof MaterialIcons.glyphMap} size={20} color={schedule === opt.id ? theme.primary : theme.textMuted} />
                <Text style={[styles.scheduleOptionText, schedule === opt.id && styles.scheduleOptionTextActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        

          <TextInput style={styles.input} value={scheduleDetail} onChangeText={setScheduleDetail} placeholder="e.g., Every Sunday evening, Full Moon nights..." placeholderTextColor={theme.textMuted} />

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

          {/* Scheduled Date (hidden for as_needed) */}
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
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  scheduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  scheduleOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.radius.md, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border },
  scheduleOptionActive: { backgroundColor: theme.primary + '15', borderColor: theme.primary },
  scheduleOptionText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  scheduleOptionTextActive: { color: theme.primary },

  // Date Field
  dateField: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 14, borderWidth: 1, borderColor: theme.border },
  dateFieldText: { flex: 1, fontSize: 15, color: theme.textPrimary, fontWeight: '500' },

  // Date Picker Modal
  dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dateModalContent: { backgroundColor: '#231248', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: '60%' },
  dateModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
  dateModalTitle: { fontSize: 17, fontWeight: '700', color: theme.textPrimary },
  dateModalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  dateOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border + '40' },
  dateOptionActive: { backgroundColor: theme.primary + '12' },
  dateOptionText: { fontSize: 15, color: theme.textPrimary, fontWeight: '500' },
  dateOptionTextActive: { color: theme.primary, fontWeight: '700' },
});
