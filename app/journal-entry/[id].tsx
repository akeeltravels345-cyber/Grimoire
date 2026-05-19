import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import { useApp } from '../../contexts/AppContext';
import { useAlert } from '@/template';
import { resolveCategoryColor } from '../../utils/categoryHelpers';
import StarField from '../../components/StarField';

const MOOD_COLORS: Record<string, string> = {
  Connected: '#6667AB', Empowered: '#7B337E', Peaceful: '#5EBD8A',
  Grateful: '#C9A84C', Reflective: '#4EA8DE', Contemplative: '#8B5CF6',
  Hopeful: '#5EBDAA', Grounded: '#5EBD8A', Centered: '#6667AB',
  Elevated: '#C9847A', Determined: '#E85D6F', Mystified: '#7C5CBF',
  Aware: '#4EA8DE', Radiant: '#C9A84C', Joyful: '#F59E0B',
};

const TYPE_COLORS: Record<string, string> = {
  reflection: '#5EBDAA', dream: '#6667AB', encounter: '#C9847A',
  insight: '#C9A84C', reminder: '#E85D6F',
};

export default function JournalEntryDetailScreen() {
  const { id, ritualId } = useLocalSearchParams<{ id: string; ritualId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rituals, standaloneEntries, categoryColors, categories,
    updateJournalEntry, deleteJournalEntry, updateStandaloneEntry, deleteStandaloneEntry,
    moods, journalEntryTypes } = useApp();
  const { showAlert } = useAlert();

  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editMood, setEditMood] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState('');

  // Resolve entry — ritual or standalone
  const ritual = ritualId ? rituals.find(r => r.id === ritualId) : undefined;
  const ritualEntry = ritual?.journal.find(e => e.id === id);
  const standaloneEntry = !ritualId ? standaloneEntries.find(e => e.id === id) : undefined;

  const isRitual = Boolean(ritualEntry);
  const entry = ritualEntry ?? standaloneEntry;

  if (!entry) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Entry not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.primary, fontWeight: '600' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const catColor = ritual
    ? resolveCategoryColor(ritual.category, categoryColors, categories)
    : entry && 'type' in entry
    ? (TYPE_COLORS[(entry as any).type] || theme.accent)
    : theme.accent;

  const moodColor = MOOD_COLORS[entry.mood || ''] || theme.accent;

  const formattedDate = new Date(entry.date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const startEditing = () => {
    setEditNotes(entry.notes);
    setEditMood(entry.mood || '');
    if (!isRitual && standaloneEntry) {
      setEditTitle(standaloneEntry.title);
      setEditTags(standaloneEntry.tags?.join(', ') || '');
    }
    setIsEditing(true);
  };

  const saveEdits = () => {
    if (isRitual && ritualId) {
      updateJournalEntry(ritualId, id, {
        notes: editNotes.trim(),
        mood: editMood || entry.mood,
      });
    } else if (standaloneEntry) {
      updateStandaloneEntry(standaloneEntry.id, {
        title: editTitle.trim() || standaloneEntry.title,
        notes: editNotes.trim(),
        mood: editMood || undefined,
        tags: editTags.trim() ? editTags.split(',').map(t => t.trim()).filter(Boolean) : [],
      });
    }
    setIsEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = () => {
    showAlert(
      'Delete Entry?',
      'This journal entry will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (isRitual && ritualId) {
              deleteJournalEntry(ritualId, id);
            } else if (standaloneEntry) {
              deleteStandaloneEntry(standaloneEntry.id);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.back();
          },
        },
      ]
    );
  };

  const getTypeInfo = () => {
    if (!standaloneEntry) return null;
    const t = journalEntryTypes.find(et => et.id === (standaloneEntry as any).type);
    return t || { icon: '📖', label: 'Note' };
  };

  const typeInfo = getTypeInfo();
  const tags = standaloneEntry?.tags || [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Category/type color wash */}
      <LinearGradient
        colors={[catColor + '22', catColor + '08', 'transparent']}
        locations={[0, 0.35, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260 }}
        pointerEvents="none"
      />
      <StarField starCount={30} showShootingStar={false} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={isEditing ? () => setIsEditing(false) : () => router.back()} style={styles.headerBtn} hitSlop={8}>
          <MaterialIcons name={isEditing ? 'close' : 'arrow-back'} size={24} color={theme.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }} />
        {isEditing ? (
          <Pressable onPress={saveEdits} style={[styles.headerBtn, styles.saveBtn]}>
            <MaterialIcons name="check" size={22} color={theme.background} />
          </Pressable>
        ) : (
          <>
            <Pressable onPress={startEditing} style={styles.headerBtn}>
              <MaterialIcons name="edit" size={20} color={theme.accent} />
            </Pressable>
            <Pressable onPress={handleDelete} style={styles.headerBtn}>
              <MaterialIcons name="delete-outline" size={20} color={theme.error} />
            </Pressable>
          </>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Entry header block */}
        <View style={styles.entryHero}>
          {/* Source label */}
          {isRitual ? (
            <Pressable
              style={styles.sourcePill}
              onPress={() => ritualId && router.push(`/ritual/${ritualId}`)}
            >
              <View style={[styles.sourceDot, { backgroundColor: catColor }]} />
              <Text style={[styles.sourceText, { color: catColor }]}>{ritual?.name}</Text>
              <MaterialIcons name="open-in-new" size={12} color={catColor} />
            </Pressable>
          ) : typeInfo ? (
            <View style={[styles.sourcePill, { backgroundColor: catColor + '15', borderColor: catColor + '30' }]}>
              <Text style={{ fontSize: 14 }}>{typeInfo.icon}</Text>
              <Text style={[styles.sourceText, { color: catColor }]}>{typeInfo.label}</Text>
            </View>
          ) : null}

          {/* Title (standalone) or ritual name (ritual) */}
          {isEditing && !isRitual ? (
            <TextInput
              style={styles.titleInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Title..."
              placeholderTextColor={theme.textMuted}
            />
          ) : (
            <Text style={styles.entryTitle}>
              {isRitual ? ritual?.name : (standaloneEntry as any)?.title}
            </Text>
          )}

          <Text style={styles.entryDate}>{formattedDate}</Text>

          {/* Mood row */}
          {isEditing ? (
            <View style={styles.moodEditRow}>
              {moods.map(m => (
                <Pressable
                  key={m}
                  style={[styles.moodChip, editMood === m && { backgroundColor: (MOOD_COLORS[m] || theme.primary) + '25', borderColor: MOOD_COLORS[m] || theme.primary }]}
                  onPress={() => { setEditMood(editMood === m ? '' : m); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.moodChipText, editMood === m && { color: MOOD_COLORS[m] || theme.primary, fontWeight: '600' }]}>{m}</Text>
                </Pressable>
              ))}
            </View>
          ) : entry.mood ? (
            <View style={[styles.moodBadge, { backgroundColor: moodColor + '20', borderColor: moodColor + '40' }]}>
              <Text style={[styles.moodText, { color: moodColor }]}>{entry.mood}</Text>
            </View>
          ) : null}
        </View>

        {/* Cosmic context */}
        {'cosmicContext' in entry && entry.cosmicContext ? (
          <View style={styles.cosmicCard}>
            <MaterialIcons name="auto-awesome" size={14} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cosmicText}>{(entry as any).cosmicContext}</Text>
          </View>
        ) : null}

        {/* Decorative separator */}
        <View style={styles.separator}>
          <View style={[styles.separatorLine, { backgroundColor: catColor + '40' }]} />
          <MaterialIcons name="auto-awesome" size={10} color={catColor} style={{ marginHorizontal: 10 }} />
          <View style={[styles.separatorLine, { backgroundColor: catColor + '40' }]} />
        </View>

        {/* Notes */}
        {isEditing ? (
          <TextInput
            style={styles.notesEditInput}
            value={editNotes}
            onChangeText={setEditNotes}
            placeholder="Write your entry..."
            placeholderTextColor={theme.textMuted}
            multiline
            textAlignVertical="top"
            autoFocus
          />
        ) : (
          <Text style={styles.notesText}>{entry.notes || 'No notes recorded.'}</Text>
        )}

        {/* Tags (standalone) */}
        {!isRitual && (
          isEditing ? (
            <View style={{ marginTop: 24 }}>
              <Text style={styles.fieldLabel}>TAGS</Text>
              <TextInput
                style={styles.tagsInput}
                value={editTags}
                onChangeText={setEditTags}
                placeholder="dream, moon, breakthrough..."
                placeholderTextColor={theme.textMuted}
              />
            </View>
          ) : tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {tags.map(tag => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          ) : null
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 8,
  },
  headerBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { backgroundColor: theme.success },

  entryHero: { paddingTop: 12, paddingBottom: 20 },
  sourcePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1,
    borderColor: theme.border, marginBottom: 14,
  },
  sourceDot: { width: 8, height: 8, borderRadius: 4 },
  sourceText: { fontSize: 12, fontWeight: '600' },

  titleInput: {
    fontSize: 22, fontWeight: '700', color: theme.textPrimary,
    fontFamily: theme.fonts.serif, borderBottomWidth: 1,
    borderBottomColor: theme.border, paddingBottom: 8, marginBottom: 8,
  },
  entryTitle: {
    fontSize: 24, fontWeight: '700', color: theme.textPrimary,
    fontFamily: theme.fonts.serif, lineHeight: 32, marginBottom: 6,
  },
  entryDate: { fontSize: 13, color: theme.textSecondary, marginBottom: 12 },

  moodBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  moodText: { fontSize: 12, fontWeight: '600' },
  moodEditRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  moodChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border,
  },
  moodChipText: { fontSize: 12, fontWeight: '500', color: theme.textMuted },

  cosmicCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.primary + '10', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: theme.primary + '20',
    marginBottom: 20,
  },
  cosmicText: { flex: 1, fontSize: 12, color: theme.textSecondary, fontStyle: 'italic', lineHeight: 18 },

  separator: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  separatorLine: { flex: 1, height: 1 },

  notesText: {
    fontSize: 16, color: theme.textPrimary, lineHeight: 28,
    fontFamily: theme.fonts.serif,
  },
  notesEditInput: {
    fontSize: 16, color: theme.textPrimary, lineHeight: 28,
    fontFamily: theme.fonts.serif, minHeight: 200,
    backgroundColor: theme.surface, borderRadius: theme.radius.md,
    padding: 16, borderWidth: 1, borderColor: theme.border,
  },

  fieldLabel: {
    fontSize: 10, fontWeight: '700', color: theme.textMuted,
    letterSpacing: 1.2, marginBottom: 8, textTransform: 'uppercase' as const,
  },
  tagsInput: {
    backgroundColor: theme.surface, borderRadius: theme.radius.md,
    padding: 12, fontSize: 14, color: theme.textPrimary,
    borderWidth: 1, borderColor: theme.border,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 24 },
  tagChip: { backgroundColor: theme.surfaceLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 12, color: theme.accent, fontWeight: '500' },
});
