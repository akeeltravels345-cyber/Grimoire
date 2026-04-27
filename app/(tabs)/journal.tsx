import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import GradientScreen from '../../components/GradientScreen';
import { useApp } from '../../contexts/AppContext';
import { useAlert } from '@/template';
import { getRecentActivity, StandaloneJournalEntry } from '../../services/mockData';
import SwipeableRow from '../../components/SwipeableRow';

const MOODS = ['Connected', 'Peaceful', 'Grateful', 'Reflective', 'Contemplative', 'Hopeful', 'Empowered', 'Joyful'];

const SPIRITUAL_EMOJIS = [
  '\u{1F300}', '\u2728', '\u{1F52E}', '\u{1F4AB}', '\u{1F30A}', '\u{1F525}', '\u{1F33F}', '\u26A1',
  '\u{1F56F}\uFE0F', '\u{1F9FF}', '\u{1F311}', '\u2601\uFE0F', '\u{1F5DD}\uFE0F', '\u{1FAAC}', '\u{1FAE7}',
  '\u{1F338}', '\u{1F98B}', '\u{1F40D}', '\u{1F339}', '\u2B50',
];

const DEFAULT_TYPE_IDS = ['reflection', 'dream', 'encounter', 'insight'];

type JournalTab = 'all' | 'rituals' | 'personal';

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { rituals, categoryColors, standaloneEntries, addStandaloneEntry, deleteStandaloneEntry, journalEntryTypes, addJournalEntryType, deleteJournalEntryType } = useApp();
  const { showAlert } = useAlert();
  const ritualEntries = getRecentActivity(rituals);
  const [tab, setTab] = useState<JournalTab>('all');
  const [isAdding, setIsAdding] = useState(false);

  // New entry form
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newType, setNewType] = useState<string>('reflection');
  const [newMood, setNewMood] = useState('');
  const [newTags, setNewTags] = useState('');
  const [editingEntry, setEditingEntry] = useState<StandaloneJournalEntry | null>(null);

  // New type modal
  const [showNewTypeModal, setShowNewTypeModal] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [newTypeEmoji, setNewTypeEmoji] = useState('\u2728');

  const clearForm = () => {
    setNewTitle('');
    setNewNotes('');
    setNewMood('');
    setNewTags('');
    setNewType('reflection');
    setEditingEntry(null);
    setIsAdding(false);
  };

  const handleSaveEntry = () => {
    if (!newTitle.trim() || !newNotes.trim()) return;
    if (editingEntry) {
      deleteStandaloneEntry(editingEntry.id);
      addStandaloneEntry({
        date: editingEntry.date,
        title: newTitle.trim(),
        notes: newNotes.trim(),
        mood: newMood || undefined,
        tags: newTags.trim() ? newTags.split(',').map(t => t.trim()).filter(Boolean) : [],
        type: newType,
      });
    } else {
      addStandaloneEntry({
        date: new Date().toISOString(),
        title: newTitle.trim(),
        notes: newNotes.trim(),
        mood: newMood || undefined,
        tags: newTags.trim() ? newTags.split(',').map(t => t.trim()).filter(Boolean) : [],
        type: newType,
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    clearForm();
  };

  const handleEditEntry = (entry: StandaloneJournalEntry) => {
    setEditingEntry(entry);
    setNewTitle(entry.title);
    setNewNotes(entry.notes);
    setNewMood(entry.mood || '');
    setNewTags(entry.tags.join(', '));
    setNewType(entry.type);
    setIsAdding(true);
    Haptics.selectionAsync();
  };

  const handleCreateType = () => {
    if (!newTypeLabel.trim()) return;
    const id = newTypeLabel.toLowerCase().trim().replace(/\s+/g, '_');
    // Prevent duplicates
    if (journalEntryTypes.some(t => t.id === id)) {
      showAlert('Duplicate', 'A type with this name already exists.');
      return;
    }
    addJournalEntryType({ id, label: newTypeLabel.trim(), icon: newTypeEmoji });
    setNewType(id);
    setNewTypeLabel('');
    setNewTypeEmoji('\u2728');
    setShowNewTypeModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleLongPressType = (typeId: string) => {
    if (DEFAULT_TYPE_IDS.includes(typeId)) return;
    const typeObj = journalEntryTypes.find(t => t.id === typeId);
    showAlert(
      'Delete Type?',
      `Remove "${typeObj?.label || typeId}" from your journal types? Existing entries will keep their type label.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteJournalEntryType(typeId);
            if (newType === typeId) setNewType('reflection');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  // Build combined timeline
  type TimelineItem = {
    id: string;
    date: string;
    kind: 'ritual' | 'personal';
    title: string;
    notes: string;
    mood?: string;
    ritualId?: string;
    category?: string;
    type?: string;
    tags?: string[];
  };

  const allItems: TimelineItem[] = [];

  if (tab === 'all' || tab === 'rituals') {
    ritualEntries.forEach(e => {
      allItems.push({
        id: e.id,
        date: e.date,
        kind: 'ritual',
        title: e.ritualName,
        notes: e.notes,
        mood: e.mood,
        ritualId: e.ritualId,
        category: e.category,
      });
    });
  }

  if (tab === 'all' || tab === 'personal') {
    standaloneEntries.forEach(e => {
      allItems.push({
        id: e.id,
        date: e.date,
        kind: 'personal',
        title: e.title,
        notes: e.notes,
        mood: e.mood,
        type: e.type,
        tags: e.tags,
      });
    });
  }

  allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group by date
  const grouped: Record<string, TimelineItem[]> = {};
  allItems.forEach(item => {
    const dateKey = new Date(item.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(item);
  });
  const sections = Object.entries(grouped);

  const getTypeIcon = (type?: string) => {
    const t = journalEntryTypes.find(et => et.id === type);
    return t?.icon || '\u{1F4D6}';
  };

  const getTypeLabel = (type?: string) => {
    const t = journalEntryTypes.find(et => et.id === type);
    return t?.label || 'Note';
  };

  if (allItems.length === 0 && !isAdding) {
    return (
      <GradientScreen>
        <View style={styles.header}>
          <Text style={styles.title}>Journal</Text>
          <Pressable style={styles.addBtn} onPress={() => setIsAdding(true)}>
            <MaterialIcons name="add" size={22} color={theme.background} />
          </Pressable>
        </View>
        <View style={styles.emptyContainer}>
          <Image source={require('../../assets/images/journal-empty.png')} style={styles.emptyImage} contentFit="contain" />
          <Text style={styles.emptyTitle}>Your Journal Awaits</Text>
          <Text style={styles.emptyText}>Record your rituals, thoughts, dreams, and insights here.</Text>
          <Pressable style={styles.emptyCta} onPress={() => setIsAdding(true)}>
            <MaterialIcons name="edit" size={18} color={theme.background} />
            <Text style={styles.emptyCtaText}>Write Entry</Text>
          </Pressable>
        </View>
      </GradientScreen>
    );
  }

  const renderEntryCard = (item: TimelineItem) => {
    const catColor = item.category ? (categoryColors[item.category] || theme.accent) : theme.accent;
    const isPersonal = item.kind === 'personal';

    const card = (
      <Pressable style={styles.entryCard}
        onPress={item.kind === 'ritual' && item.ritualId ? () => router.push(`/ritual/${item.ritualId}`) : undefined}>
        <View style={styles.entryTop}>
          {item.kind === 'ritual' ? (
            <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
          ) : (
            <View style={[styles.personalIcon, { backgroundColor: theme.accent + '20' }]}>
              <Text style={{ fontSize: 14 }}>{getTypeIcon(item.type)}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.entryTitle}>{item.title}</Text>
            {isPersonal ? (
              <Text style={styles.entryType}>{getTypeLabel(item.type)}</Text>
            ) : null}
          </View>
          {item.mood ? (
            <View style={styles.moodBadge}><Text style={styles.moodBadgeText}>{item.mood}</Text></View>
          ) : null}
          {isPersonal ? (
            <Pressable style={styles.editEntryBtn}
              onPress={() => {
                const entry = standaloneEntries.find(e => e.id === item.id);
                if (entry) handleEditEntry(entry);
              }}>
              <MaterialIcons name="edit" size={14} color={theme.accent} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.entryNotes} numberOfLines={3}>{item.notes}</Text>
        {item.tags && item.tags.length > 0 ? (
          <View style={styles.tagRow}>
            {item.tags.map(tag => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Pressable>
    );

    if (isPersonal) {
      return (
        <SwipeableRow key={item.id} onDelete={() => { deleteStandaloneEntry(item.id); Haptics.selectionAsync(); }}>
          {card}
        </SwipeableRow>
      );
    }

    return <View key={item.id}>{card}</View>;
  };

  return (
    <GradientScreen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Journal</Text>
          <Text style={styles.headerCount}>{allItems.length} entries</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => { if (isAdding) { clearForm(); } else { setIsAdding(true); } }}>
          <MaterialIcons name={isAdding ? 'close' : 'add'} size={22} color={theme.background} />
        </Pressable>
      </View>

      {/* Tab Filters */}
      <View style={styles.tabRow}>
        <Pressable style={[styles.tabChip, tab === 'all' && styles.tabChipActive]} onPress={() => setTab('all')}>
          <Text style={[styles.tabChipText, tab === 'all' && styles.tabChipTextActive]}>All</Text>
        </Pressable>
        <Pressable style={[styles.tabChip, tab === 'rituals' && styles.tabChipActive]} onPress={() => setTab('rituals')}>
          <MaterialIcons name="menu-book" size={14} color={tab === 'rituals' ? theme.textPrimary : theme.textMuted} />
          <Text style={[styles.tabChipText, tab === 'rituals' && styles.tabChipTextActive]}>Rituals</Text>
        </Pressable>
        <Pressable style={[styles.tabChip, tab === 'personal' && styles.tabChipActive]} onPress={() => setTab('personal')}>
          <MaterialIcons name="edit-note" size={14} color={tab === 'personal' ? theme.textPrimary : theme.textMuted} />
          <Text style={[styles.tabChipText, tab === 'personal' && styles.tabChipTextActive]}>Personal</Text>
        </Pressable>
      </View>

      {/* Swipe hint for personal entries */}
      {tab !== 'rituals' && standaloneEntries.length > 0 ? (
        <View style={styles.swipeHint}>
          <MaterialIcons name="swipe-left" size={12} color={theme.textMuted} />
          <Text style={styles.swipeHintText}>Swipe personal entries left to delete</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* New Entry Form */}
          {isAdding ? (
            <View style={styles.addForm}>
              <Text style={styles.addFormTitle}>{editingEntry ? 'Edit Journal Entry' : 'New Journal Entry'}</Text>

              {/* Type Selector */}
              <View style={styles.typeRow}>
                {journalEntryTypes.map(et => {
                  const isCustom = !DEFAULT_TYPE_IDS.includes(et.id);
                  return (
                    <Pressable
                      key={et.id}
                      style={[styles.typeChip, newType === et.id && styles.typeChipActive]}
                      onPress={() => { setNewType(et.id); Haptics.selectionAsync(); }}
                      onLongPress={isCustom ? () => handleLongPressType(et.id) : undefined}
                      delayLongPress={500}
                    >
                      <Text style={{ fontSize: 14 }}>{et.icon}</Text>
                      <Text style={[styles.typeChipText, newType === et.id && { color: theme.primary }]}>{et.label}</Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  style={styles.newTypeBtn}
                  onPress={() => { setShowNewTypeModal(true); Haptics.selectionAsync(); }}
                >
                  <MaterialIcons name="add" size={14} color={theme.accent} />
                  <Text style={styles.newTypeBtnText}>New Type</Text>
                </Pressable>
              </View>

              <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle} placeholder="Title..." placeholderTextColor={theme.textMuted} />

              <TextInput style={[styles.input, styles.textArea]} value={newNotes} onChangeText={setNewNotes}
                placeholder="Write your thoughts, observations, or reminders..." placeholderTextColor={theme.textMuted} multiline textAlignVertical="top" />

              {/* Mood */}
              <Text style={styles.formLabel}>Mood (optional)</Text>
              <View style={styles.moodRow}>
                {MOODS.map(m => (
                  <Pressable key={m} style={[styles.moodChip, newMood === m && styles.moodChipActive]}
                    onPress={() => { setNewMood(newMood === m ? '' : m); Haptics.selectionAsync(); }}>
                    <Text style={[styles.moodChipText, newMood === m && styles.moodChipTextActive]}>{m}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Tags */}
              <TextInput style={styles.input} value={newTags} onChangeText={setNewTags} placeholder="Tags (comma-separated)..." placeholderTextColor={theme.textMuted} />

              <Pressable style={[styles.saveEntryBtn, (!newTitle.trim() || !newNotes.trim()) && { opacity: 0.5 }]}
                onPress={handleSaveEntry} disabled={!newTitle.trim() || !newNotes.trim()}>
                <MaterialIcons name="check" size={18} color={theme.background} />
                <Text style={styles.saveEntryBtnText}>{editingEntry ? 'Update Entry' : 'Save Entry'}</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Timeline */}
          {sections.map(([dateKey, items]) => (
            <View key={dateKey} style={styles.dateSection}>
              <Text style={styles.dateHeader}>{dateKey}</Text>
              {items.map(item => renderEntryCard(item))}
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* New Type Modal */}
      <Modal visible={showNewTypeModal} transparent animationType="fade" onRequestClose={() => setShowNewTypeModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowNewTypeModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: '#231248' }]} onPress={() => {}}>
            <Text style={styles.modalTitle}>Create New Type</Text>

            <Text style={styles.modalLabel}>Label</Text>
            <TextInput
              style={styles.modalInput}
              value={newTypeLabel}
              onChangeText={setNewTypeLabel}
              placeholder="e.g. Channelling"
              placeholderTextColor={theme.textMuted}
              autoFocus
            />

            <Text style={styles.modalLabel}>Choose an Icon</Text>
            <View style={styles.emojiGrid}>
              {SPIRITUAL_EMOJIS.map(emoji => (
                <Pressable
                  key={emoji}
                  style={[styles.emojiBtn, newTypeEmoji === emoji && styles.emojiBtnActive]}
                  onPress={() => { setNewTypeEmoji(emoji); Haptics.selectionAsync(); }}
                >
                  <Text style={{ fontSize: 20 }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalPreview}>
              <Text style={{ fontSize: 16 }}>{newTypeEmoji}</Text>
              <Text style={styles.modalPreviewText}>{newTypeLabel.trim() || 'Preview'}</Text>
            </View>

            <View style={styles.modalBtnRow}>
              <Pressable style={styles.modalCancelBtn} onPress={() => { setShowNewTypeModal(false); setNewTypeLabel(''); setNewTypeEmoji('\u2728'); }}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalCreateBtn, !newTypeLabel.trim() && { opacity: 0.4 }]}
                onPress={handleCreateType}
                disabled={!newTypeLabel.trim()}
              >
                <Text style={styles.modalCreateBtnText}>Create Type</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: theme.textPrimary },
  headerCount: { fontSize: 13, color: theme.textSecondary, fontWeight: '500', marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },

  // Tabs
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  tabChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: theme.surface },
  tabChipActive: { backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.primary + '40' },
  tabChipText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  tabChipTextActive: { color: theme.textPrimary },

  // Swipe hint
  swipeHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 4, paddingHorizontal: 16, paddingBottom: 6,
  },
  swipeHintText: { fontSize: 10, color: theme.textMuted, fontStyle: 'italic' },

  // Add Form
  addForm: { backgroundColor: theme.surface, borderRadius: theme.radius.lg, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: theme.primary + '30', ...theme.shadows.card },
  addFormTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, marginBottom: 14 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: theme.surfaceLight, borderWidth: 1.5, borderColor: theme.border },
  typeChipActive: { backgroundColor: theme.primary + '15', borderColor: theme.primary },
  typeChipText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  newTypeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
    borderWidth: 1.5, borderColor: theme.accent + '40', borderStyle: 'dashed',
    backgroundColor: theme.accent + '08',
  },
  newTypeBtnText: { fontSize: 12, fontWeight: '600', color: theme.accent },
  input: { backgroundColor: theme.backgroundSecondary, borderRadius: theme.radius.sm, padding: 12, fontSize: 15, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border, marginBottom: 10 },
  textArea: { minHeight: 100, paddingTop: 12, lineHeight: 21 },
  formLabel: { fontSize: 11, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, marginBottom: 8 },
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  moodChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border },
  moodChipActive: { backgroundColor: theme.primary + '20', borderColor: theme.primary },
  moodChipText: { fontSize: 12, fontWeight: '500', color: theme.textMuted },
  moodChipTextActive: { color: theme.primary, fontWeight: '600' },
  saveEntryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.primary, paddingVertical: 14, borderRadius: theme.radius.md, marginTop: 8 },
  saveEntryBtnText: { fontSize: 15, fontWeight: '600', color: theme.background },

  // Timeline
  dateSection: { marginBottom: 20 },
  dateHeader: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  entryCard: { backgroundColor: theme.surface, borderRadius: 12, padding: 16, ...theme.shadows.card },
  entryTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  personalIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  entryTitle: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  entryType: { fontSize: 11, color: theme.accent, fontWeight: '500', marginTop: 1 },
  moodBadge: { backgroundColor: theme.surfaceLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  moodBadgeText: { fontSize: 11, fontWeight: '600', color: theme.textSecondary },
  entryNotes: { fontSize: 14, color: theme.textSecondary, lineHeight: 20, marginBottom: 4 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tagChip: { backgroundColor: theme.surfaceLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 11, color: theme.accent, fontWeight: '500' },
  editEntryBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.accent + '10', alignItems: 'center', justifyContent: 'center' },

  // Empty
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyImage: { width: 200, height: 200, marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyCta: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: theme.radius.full },
  emptyCtaText: { fontSize: 15, fontWeight: '600', color: theme.background },

  // New Type Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalContent: {
    backgroundColor: theme.surface, borderRadius: theme.radius.lg,
    padding: 24, width: '100%', maxWidth: 380,
    ...theme.shadows.elevated,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: 16 },
  modalLabel: { fontSize: 11, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  modalInput: {
    backgroundColor: theme.backgroundSecondary, borderRadius: theme.radius.sm,
    padding: 12, fontSize: 15, color: theme.textPrimary,
    borderWidth: 1, borderColor: theme.border, marginBottom: 16,
  },
  emojiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16,
  },
  emojiBtn: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surfaceLight, borderWidth: 1.5, borderColor: 'transparent',
  },
  emojiBtnActive: {
    backgroundColor: theme.primary + '18', borderColor: theme.primary,
  },
  modalPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.surfaceLight, borderRadius: theme.radius.sm,
    padding: 12, marginBottom: 20,
  },
  modalPreviewText: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  modalBtnRow: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: theme.radius.md,
    backgroundColor: theme.surfaceLight, alignItems: 'center',
    borderWidth: 1, borderColor: theme.border,
  },
  modalCancelBtnText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  modalCreateBtn: {
    flex: 1, paddingVertical: 13, borderRadius: theme.radius.md,
    backgroundColor: theme.primary, alignItems: 'center',
  },
  modalCreateBtnText: { fontSize: 14, fontWeight: '600', color: theme.background },
});
