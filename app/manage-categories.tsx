import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import GradientScreen from '../components/GradientScreen';
import { resolveCategoryColor } from '../utils/categoryHelpers';

import { AVAILABLE_ICONS, AVAILABLE_COLORS } from '../constants/config';

export default function ManageCategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { categories, categoryColors, addCategory, deleteCategory } = useApp();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState(AVAILABLE_ICONS[0]);
  const [newColor, setNewColor] = useState(AVAILABLE_COLORS[0]);
  const [newDescription, setNewDescription] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    const id = newName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    addCategory({
      id,
      name: newName.trim(),
      icon: newIcon,
      description: newDescription.trim(),
    }, newColor);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewName('');
    setNewDescription('');
    setIsAdding(false);
  };

  const handleDelete = (catId: string) => {
    deleteCategory(catId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  return (
    <GradientScreen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Manage Categories</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Your Categories</Text>

          {categories.map(cat => {
            const catColor = resolveCategoryColor(cat.id, categoryColors, categories);
            return (
              <View key={cat.id} style={styles.categoryItem}>
                <View style={[styles.categoryIconBox, { backgroundColor: catColor + '20' }]}>
                  <MaterialIcons name={cat.icon as keyof typeof MaterialIcons.glyphMap} size={22} color={catColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  {cat.description ? <Text style={styles.categoryDesc}>{cat.description}</Text> : null}
                </View>
                <Pressable style={styles.deleteBtn} onPress={() => handleDelete(cat.id)}>
                  <MaterialIcons name="close" size={18} color={theme.error} />
                </Pressable>
              </View>
            );
          })}

          {!isAdding ? (
            <Pressable style={styles.addCategoryBtn} onPress={() => setIsAdding(true)}>
              <MaterialIcons name="add-circle-outline" size={22} color={theme.primary} />
              <Text style={styles.addCategoryText}>Add Category</Text>
            </Pressable>
          ) : (
            <View style={styles.addForm}>
              <Text style={styles.formLabel}>Category Name</Text>
              <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="e.g., Shadow Work" placeholderTextColor={theme.textMuted} />

              <Text style={styles.formLabel}>Description</Text>
              <TextInput style={styles.input} value={newDescription} onChangeText={setNewDescription} placeholder="Brief description..." placeholderTextColor={theme.textMuted} />

              <Text style={styles.formLabel}>Icon</Text>
              <View style={styles.iconGrid}>
                {AVAILABLE_ICONS.map(icon => (
                  <Pressable
                    key={icon}
                    style={[styles.iconOption, newIcon === icon && styles.iconOptionActive]}
                    onPress={() => setNewIcon(icon)}
                  >
                    <MaterialIcons name={icon as keyof typeof MaterialIcons.glyphMap} size={22} color={newIcon === icon ? theme.primary : theme.textMuted} />
                  </Pressable>
                ))}
              </View>

              <Text style={styles.formLabel}>Color</Text>
              <View style={styles.colorGrid}>
                {AVAILABLE_COLORS.map(color => (
                  <Pressable
                    key={color}
                    style={[styles.colorOption, { backgroundColor: color }, newColor === color && styles.colorOptionActive]}
                    onPress={() => setNewColor(color)}
                  />
                ))}
              </View>

              <View style={styles.formActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setIsAdding(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.confirmBtn, !newName.trim() && { opacity: 0.5 }]} onPress={handleAdd} disabled={!newName.trim()}>
                  <Text style={styles.confirmBtnText}>Add Category</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: theme.textPrimary },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, marginTop: 20, marginBottom: 16 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 16, marginBottom: 10, gap: 14, ...theme.shadows.card },
  categoryIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  categoryName: { fontSize: 15, fontWeight: '600', color: theme.textPrimary },
  categoryDesc: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.error + '15', alignItems: 'center', justifyContent: 'center' },
  addCategoryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderWidth: 1.5, borderColor: theme.primary + '40', borderRadius: theme.radius.md, borderStyle: 'dashed', marginTop: 8 },
  addCategoryText: { fontSize: 15, fontWeight: '600', color: theme.primary },
  addForm: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 20, marginTop: 8, ...theme.shadows.card },
  formLabel: { fontSize: 12, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  input: { backgroundColor: theme.backgroundSecondary, borderRadius: theme.radius.sm, padding: 12, fontSize: 15, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconOption: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.backgroundSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  iconOptionActive: { borderColor: theme.primary, backgroundColor: theme.primary + '15' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorOption: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  colorOptionActive: { borderColor: '#FFF', transform: [{ scale: 1.15 }] },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: theme.radius.sm, backgroundColor: theme.surfaceLight, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: theme.radius.sm, backgroundColor: theme.primary, alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '600', color: theme.background },
});
