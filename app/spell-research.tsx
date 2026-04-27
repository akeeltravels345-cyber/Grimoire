import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { theme } from '../constants/theme';
import GradientScreen from '../components/GradientScreen';
import SwipeableRow from '../components/SwipeableRow';
import { useApp } from '../contexts/AppContext';

const STORAGE_KEY = 'grimoire_spell_research';

interface ResearchItem {
  id: string;
  name: string;
  notes?: string;
  category?: string;
  researched: boolean;
  createdAt: string;
}

export default function SpellResearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { categories, categoryColors } = useApp();

  const [items, setItems] = useState<ResearchItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newCategory, setNewCategory] = useState<string | undefined>(undefined);

  // Load from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try { setItems(JSON.parse(raw)); } catch {}
      }
      setIsLoaded(true);
    });
  }, []);

  // Persist on change
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isLoaded]);

  const toggleResearched = useCallback((id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, researched: !item.researched } : item
    ));
    Haptics.selectionAsync();
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    Haptics.selectionAsync();
  }, []);

  const handleSave = () => {
    if (!newName.trim()) return;
    const newItem: ResearchItem = {
      id: Date.now().toString(),
      name: newName.trim(),
      notes: newNotes.trim() || undefined,
      category: newCategory,
      researched: false,
      createdAt: new Date().toISOString(),
    };
    setItems(prev => [newItem, ...prev]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewName('');
    setNewNotes('');
    setNewCategory(undefined);
    setShowModal(false);
  };

  const toResearch = items.filter(i => !i.researched);
  const researched = items.filter(i => i.researched);

  const getCatName = (catId?: string) => {
    if (!catId) return null;
    return categories.find(c => c.id === catId);
  };

  const renderItem = (item: ResearchItem) => {
    const cat = getCatName(item.category);
    const catColor = item.category ? (categoryColors[item.category] || theme.accent) : theme.accent;
    const isResearched = item.researched;

    return (
      <SwipeableRow key={item.id} onDelete={() => deleteItem(item.id)}>
        <View style={[styles.itemCard, isResearched ? { opacity: 0.5 } : null]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.notes ? <Text style={styles.itemNotes} numberOfLines={2}>{item.notes}</Text> : null}
            {cat ? (
              <View style={[styles.catBadge, { backgroundColor: catColor + '20' }]}>
                <MaterialIcons name={cat.icon as keyof typeof MaterialIcons.glyphMap} size={11} color={catColor} />
                <Text style={[styles.catBadgeText, { color: catColor }]}>{cat.name}</Text>
              </View>
            ) : null}
          </View>
          <Pressable
            style={[styles.checkBtn, isResearched ? styles.checkBtnActive : null]}
            onPress={() => toggleResearched(item.id)}
            hitSlop={8}
          >
            <MaterialIcons
              name={isResearched ? 'check-circle' : 'radio-button-unchecked'}
              size={26}
              color={isResearched ? theme.success : theme.textMuted}
            />
          </Pressable>
        </View>
      </SwipeableRow>
    );
  };

  return (
    <GradientScreen>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Spell Research</Text>
          <Text style={styles.headerSub}>Spells to explore and add to your grimoire</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setShowModal(true)}>
          <MaterialIcons name="add" size={22} color={theme.background} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="science" size={48} color={theme.textMuted} />
            <Text style={styles.emptyTitle}>No Spells Yet</Text>
            <Text style={styles.emptyText}>Tap + to add spells you want to research and explore.</Text>
          </View>
        ) : (
          <>
            {/* To Research */}
            {toResearch.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="explore" size={16} color={theme.primary} />
                  <Text style={styles.sectionTitle}>To Research</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{toResearch.length}</Text>
                  </View>
                </View>
                {toResearch.map(renderItem)}
              </View>
            ) : null}

            {/* Researched */}
            {researched.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="check-circle-outline" size={16} color={theme.success} />
                  <Text style={[styles.sectionTitle, { color: theme.success }]}>Researched</Text>
                  <View style={[styles.countBadge, { backgroundColor: theme.success + '18' }]}>
                    <Text style={[styles.countText, { color: theme.success }]}>{researched.length}</Text>
                  </View>
                </View>
                {researched.map(renderItem)}
              </View>
            ) : null}
          </>
        )}

        {/* Swipe hint */}
        {items.length > 0 ? (
          <View style={styles.swipeHint}>
            <MaterialIcons name="swipe-left" size={12} color={theme.textMuted} />
            <Text style={styles.swipeHintText}>Swipe left to delete</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalKeyboard}>
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Add Spell to Research</Text>

              {/* Name */}
              <Text style={styles.modalLabel}>Spell Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Mirror Box Reversal"
                placeholderTextColor={theme.textMuted}
                autoFocus
              />

              {/* Category */}
              <Text style={styles.modalLabel}>Category (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catScrollContent}>
                <Pressable
                  style={[styles.catChip, !newCategory ? styles.catChipActive : null]}
                  onPress={() => { setNewCategory(undefined); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.catChipText, !newCategory ? styles.catChipTextActive : null]}>None</Text>
                </Pressable>
                {categories.map(cat => {
                  const color = categoryColors[cat.id] || theme.accent;
                  const isActive = newCategory === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      style={[
                        styles.catChip,
                        isActive ? { backgroundColor: color + '25', borderColor: color } : null,
                      ]}
                      onPress={() => { setNewCategory(cat.id); Haptics.selectionAsync(); }}
                    >
                      <MaterialIcons name={cat.icon as keyof typeof MaterialIcons.glyphMap} size={13} color={isActive ? color : theme.textMuted} />
                      <Text style={[styles.catChipText, isActive ? { color } : null]}>{cat.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Notes */}
              <Text style={styles.modalLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={newNotes}
                onChangeText={setNewNotes}
                placeholder="Sources, ideas, specific aspects to look into..."
                placeholderTextColor={theme.textMuted}
                multiline
                textAlignVertical="top"
              />

              {/* Buttons */}
              <View style={styles.modalBtnRow}>
                <Pressable style={styles.modalCancelBtn} onPress={() => { setShowModal(false); setNewName(''); setNewNotes(''); setNewCategory(undefined); }}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSaveBtn, !newName.trim() ? { opacity: 0.4 } : null]}
                  onPress={handleSave}
                  disabled={!newName.trim()}
                >
                  <MaterialIcons name="add" size={18} color={theme.background} />
                  <Text style={styles.modalSaveText}>Save</Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: theme.textPrimary },
  headerSub: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center',
  },

  // Empty
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary },
  emptyText: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },

  // Sections
  section: { marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary, flex: 1 },
  countBadge: {
    backgroundColor: theme.primary + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  countText: { fontSize: 12, fontWeight: '700', color: theme.primary },

  // Item Card
  itemCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.surface, borderRadius: theme.radius.md,
    padding: 14, ...theme.shadows.card,
  },
  itemName: { fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginBottom: 2 },
  itemNotes: { fontSize: 13, color: theme.textSecondary, fontStyle: 'italic', lineHeight: 18, marginBottom: 4 },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4,
  },
  catBadgeText: { fontSize: 11, fontWeight: '600' },
  checkBtn: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  checkBtnActive: {},

  // Swipe hint
  swipeHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 20 },
  swipeHintText: { fontSize: 10, color: theme.textMuted, fontStyle: 'italic' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end',
  },
  modalKeyboard: { justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#231248', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: theme.textMuted,
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: 20 },
  modalLabel: {
    fontSize: 11, fontWeight: '600', color: theme.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  modalInput: {
    backgroundColor: theme.surface, borderRadius: theme.radius.sm,
    padding: 12, fontSize: 15, color: theme.textPrimary,
    borderWidth: 1, borderColor: theme.border, marginBottom: 16,
  },
  modalTextArea: { minHeight: 80, paddingTop: 12, lineHeight: 21 },

  // Category chips in modal
  catScroll: { marginBottom: 16 },
  catScrollContent: { flexDirection: 'row', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
    backgroundColor: theme.surfaceLight, borderWidth: 1.5, borderColor: theme.border,
  },
  catChipActive: { backgroundColor: theme.primary + '15', borderColor: theme.primary },
  catChipText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  catChipTextActive: { color: theme.primary },

  // Buttons
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: theme.radius.md,
    backgroundColor: theme.surfaceLight, alignItems: 'center',
    borderWidth: 1, borderColor: theme.border,
  },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  modalSaveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: theme.radius.md, backgroundColor: theme.primary,
  },
  modalSaveText: { fontSize: 14, fontWeight: '600', color: theme.background },
});
