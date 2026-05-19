import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { useAlert } from '@/template';
import StarField from '../components/StarField';
import { resolveCategoryColor } from '../utils/categoryHelpers';

export default function AddLibraryRitualScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addLibraryRitual, categories, categoryColors, deleteCategory } = useApp();
  const { showAlert } = useAlert();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(categories[0]?.id || '');
  const [description, setDescription] = useState('');
  const [intention, setIntention] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [showPracticePrompt, setShowPracticePrompt] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const id = addLibraryRitual({
      name: name.trim(),
      category,
      description: description.trim(),
      intention: intention.trim(),
      tangibleOutcome: '',
      ingredients: ingredients.trim() ? ingredients.split(',').map(i => i.trim()).filter(Boolean) : undefined,
      schedule: 'as_needed',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSavedId(id ?? null);
    setShowPracticePrompt(true);
  };

  const handleAddToPractice = () => {
    setShowPracticePrompt(false);
    if (savedId) {
      router.replace({ pathname: '/add-to-practice', params: { libraryId: savedId } });
    } else {
      router.back();
    }
  };

  const handleSkip = () => {
    setShowPracticePrompt(false);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
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
          <Text style={styles.headerTitle}>Add to Library</Text>
          <Pressable onPress={handleSave} style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]} disabled={!canSave}>
            <Text style={[styles.saveBtnText, !canSave && styles.saveBtnTextDisabled]}>Save</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.subtitleWrap}>
              <MaterialIcons name="auto-stories" size={18} color={theme.textMuted} />
              <Text style={styles.subtitle}>Save this spell to your grimoire. Only a name is needed — fill in the rest later.</Text>
            </View>

            {/* Name — only required field */}
            <Text style={styles.label}>Spell Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Full Moon Abundance Spell"
              placeholderTextColor={theme.textMuted}
            />

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
                <Text style={styles.newCategoryOptionText}>New</Text>
              </Pressable>
            </View>

            {/* Optional fields */}
            <Text style={styles.sectionDivider}>OPTIONAL DETAILS</Text>

            <Text style={styles.label}>Intention</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={intention}
              onChangeText={setIntention}
              placeholder="What is the purpose of this spell?"
              placeholderTextColor={theme.textMuted}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.label}>Ritual Instructions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Steps, process, special notes..."
              placeholderTextColor={theme.textMuted}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.label}>Ingredients & Tools</Text>
            <TextInput
              style={styles.input}
              value={ingredients}
              onChangeText={setIngredients}
              placeholder="candle, herbs, crystal..."
              placeholderTextColor={theme.textMuted}
            />
            <Text style={styles.hint}>Separate items with commas</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Add to Practice prompt */}
      <Modal visible={showPracticePrompt} transparent animationType="fade">
        <View style={styles.promptOverlay}>
          <View style={styles.promptCard}>
            <Text style={styles.promptEmoji}>✨</Text>
            <Text style={styles.promptTitle}>"{name}" saved!</Text>
            <Text style={styles.promptSubtitle}>Do you want to add it to your practice now?</Text>
            <Pressable style={styles.promptPrimaryBtn} onPress={handleAddToPractice}>
              <Text style={styles.promptPrimaryBtnText}>Add to Practice</Text>
            </Pressable>
            <Pressable style={styles.promptSkipBtn} onPress={handleSkip}>
              <Text style={styles.promptSkipBtnText}>Save to Library Only</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  subtitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 4 },
  subtitle: { flex: 1, fontSize: 13, color: theme.textSecondary, lineHeight: 18, fontStyle: 'italic' },
  label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 14, fontSize: 15, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border },
  textArea: { minHeight: 100, paddingTop: 14 },
  hint: { fontSize: 12, color: theme.textMuted, marginTop: 4, marginLeft: 4, fontStyle: 'italic' },
  sectionDivider: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 1.2, marginTop: 32, marginBottom: 4, textAlign: 'center' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryOption: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.radius.md, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border },
  categoryOptionText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  newCategoryOption: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.radius.md, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.textMuted + '40', borderStyle: 'dashed' },
  newCategoryOptionText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },

  promptOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  promptCard: { backgroundColor: '#231248', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: theme.primary + '30' },
  promptEmoji: { fontSize: 40, marginBottom: 12 },
  promptTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, textAlign: 'center', marginBottom: 8 },
  promptSubtitle: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  promptPrimaryBtn: { width: '100%', backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  promptPrimaryBtnText: { fontSize: 15, fontWeight: '700', color: theme.background },
  promptSkipBtn: { width: '100%', paddingVertical: 12, alignItems: 'center' },
  promptSkipBtnText: { fontSize: 14, color: theme.textMuted, fontWeight: '500' },
});
