import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../constants/theme';
import { useApp } from '../contexts/AppContext';

export default function AddLibraryRitualScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addLibraryRitual, categories, categoryColors } = useApp();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(categories[0]?.id || '');
  const [description, setDescription] = useState('');
  const [intention, setIntention] = useState('');
  const [tangibleOutcome, setTangibleOutcome] = useState('');
  const [ingredients, setIngredients] = useState('');

  const canSave = name.trim().length > 0 && intention.trim().length > 0 && tangibleOutcome.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    addLibraryRitual({
      name: name.trim(),
      category,
      description: description.trim(),
      intention: intention.trim(),
      tangibleOutcome: tangibleOutcome.trim(),
      ingredients: ingredients.trim() ? ingredients.split(',').map(i => i.trim()).filter(Boolean) : undefined,
      schedule: 'as_needed',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialIcons name="close" size={24} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Add to Library</Text>
        <Pressable onPress={handleSave} style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]} disabled={!canSave}>
          <Text style={[styles.saveBtnText, !canSave && styles.saveBtnTextDisabled]}>Save</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={styles.subtitleWrap}>
            <MaterialIcons name="auto-stories" size={18} color={theme.textMuted} />
            <Text style={styles.subtitle}>Save this spell to your personal grimoire. You can add it to your practice later.</Text>
          </View>

          {/* Name */}
          <Text style={styles.label}>Spell Name *</Text>
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
                >
                  <MaterialIcons name={cat.icon as keyof typeof MaterialIcons.glyphMap} size={22} color={category === cat.id ? catColor : theme.textMuted} />
                  <Text style={[styles.categoryOptionText, category === cat.id && { color: catColor }]}>{cat.name}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Tangible Outcome */}
          <Text style={styles.label}>Tangible Outcome *</Text>
          <TextInput style={[styles.input, styles.textArea]} value={tangibleOutcome} onChangeText={setTangibleOutcome} placeholder="Translate that intention into a specific measurable result. Be precise - e.g., Receive $5,000 within 30 days" placeholderTextColor={theme.textMuted} multiline textAlignVertical="top" />
          <Text style={styles.hint}>Be specific - what does the success of this spell look and feel like?</Text>

          {/* Intention */}
          <Text style={styles.label}>Intention *</Text>
          <TextInput style={[styles.input, styles.textArea]} value={intention} onChangeText={setIntention} placeholder="What is the purpose of this spell?" placeholderTextColor={theme.textMuted} multiline textAlignVertical="top" />

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Describe the spell process, steps, and any special notes..." placeholderTextColor={theme.textMuted} multiline textAlignVertical="top" />

          {/* Ingredients */}
          <Text style={styles.label}>Ingredients & Tools</Text>
          <TextInput style={styles.input} value={ingredients} onChangeText={setIngredients} placeholder="Comma-separated: candle, herbs, crystal..." placeholderTextColor={theme.textMuted} />
          <Text style={styles.hint}>Separate items with commas</Text>
        </ScrollView>
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
  subtitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 4 },
  subtitle: { flex: 1, fontSize: 13, color: theme.textSecondary, lineHeight: 18, fontStyle: 'italic' },
  label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 14, fontSize: 15, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border },
  textArea: { minHeight: 100, paddingTop: 14 },
  hint: { fontSize: 12, color: theme.textMuted, marginTop: 4, marginLeft: 4, fontStyle: 'italic' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryOption: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.radius.md, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border },
  categoryOptionText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
});
