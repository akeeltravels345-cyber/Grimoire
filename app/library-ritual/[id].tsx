
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useApp } from '../../contexts/AppContext';
import { useAlert } from '@/template';
import StarField from '../../components/StarField';
import { resolveCategoryColor, resolveCategory } from '../../utils/categoryHelpers';

const scheduleLabels: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', moon_phase: 'Moon Phase', as_needed: 'As Needed', monthly: 'Monthly',
};

export default function LibraryRitualDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { libraryRituals, rituals, categories, categoryColors, deleteLibraryRitual, updateLibraryRitual } = useApp();
  const { showAlert } = useAlert();

  const libRitual = libraryRituals.find(r => r.id === id);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIntention, setEditIntention] = useState('');
  const [editOutcome, setEditOutcome] = useState('');
  const [editIngredients, setEditIngredients] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // Practice status
  const practiceRituals = useMemo(() => {
    if (!id) return [];
    return rituals.filter(r => r.libraryId === id);
  }, [rituals, id]);

  const inPractice = practiceRituals.length > 0;
  const totalPerformed = useMemo(() => {
    return practiceRituals.reduce((sum, r) => sum + r.timesPerformed, 0);
  }, [practiceRituals]);
  const completedCount = useMemo(() => {
    return practiceRituals.filter(r => r.status === 'completed').length;
  }, [practiceRituals]);

  const startEditing = () => {
    if (!libRitual) return;
    setEditName(libRitual.name);
    setEditDescription(libRitual.description);
    setEditIntention(libRitual.intention);
    setEditOutcome(libRitual.tangibleOutcome);
    setEditIngredients(libRitual.ingredients?.join(',') || '');
    setEditCategory(libRitual.category);
    setEditing(true);
  };

  const saveEdits = () => {
    if (!libRitual || !id) return;
    if (!editName.trim() || !editIntention.trim()) {
      showAlert('Required Fields', 'Name and intention are required.');
      return;
    }
    updateLibraryRitual(id as string, {
      name: editName.trim(),
      description: editDescription.trim(),
      intention: editIntention.trim(),
      category: editCategory,
      tangibleOutcome: editOutcome.trim(),
      ingredients: editIngredients.trim()
        ? editIngredients.split(',').map(i => i.trim()).filter(Boolean)
        : undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditing(false);
  };

  const handleDelete = () => {
    showAlert(
      'Delete from Library?',
      'This will permanently remove this spell from your grimoire. Practice instances will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (id) {
              deleteLibraryRitual(id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              router.back();
            }
          },
        },
      ]
    );
  };

  if (!libRitual) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <StarField starCount={40} showShootingStar={false} />
          <View style={styles.notFound}>
            <MaterialIcons name="auto-stories" size={48} color={theme.textMuted} />
            <Text style={styles.notFoundTitle}>Spell not found</Text>
            <Pressable onPress={() => router.back()} style={styles.notFoundBtn}>
              <Text style={styles.notFoundBtnText}>Go Back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const catObj = resolveCategory(libRitual.category, categories);
  const catColor = resolveCategoryColor(libRitual.category, categoryColors, categories);
  const ingredients = libRitual.ingredients?.filter(Boolean) || [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Category-tinted wash fading from top */}
      <LinearGradient
        colors={[catColor + '28', catColor + '10', 'transparent']}
        locations={[0, 0.4, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }}
        pointerEvents="none"
      />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <StarField starCount={40} showShootingStar={false} />
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }} />
        {editing ? (
  <Pressable onPress={saveEdits} style={[styles.headerAction, { backgroundColor: theme.primary }]} hitSlop={8}>
    <MaterialIcons name="check" size={20} color={theme.background} />
  </Pressable>
) : (
  <Pressable onPress={startEditing} style={styles.headerAction} hitSlop={8}>
    <MaterialIcons name="edit" size={20} color={theme.textSecondary} />
  </Pressable>
)}
        <Pressable onPress={handleDelete} style={styles.headerAction} hitSlop={8}>
          <MaterialIcons name="delete-outline" size={20} color={theme.error} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.ritualHeader}>
          {editing ? (
            <>
              <Text style={styles.editFieldLabel}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {categories.map(cat => {
                  const cColor = resolveCategoryColor(cat.id, categoryColors, categories);
                  const isActive = editCategory === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: isActive ? cColor + '20' : theme.surface, borderWidth: 1.5, borderColor: isActive ? cColor : theme.border }}
                      onPress={() => setEditCategory(cat.id)}
                    >
                      <MaterialIcons name={cat.icon as keyof typeof MaterialIcons.glyphMap} size={16} color={isActive ? cColor : theme.textMuted} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? cColor : theme.textMuted }}>{cat.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={styles.editFieldLabel}>SPELL NAME</Text>
              <TextInput style={styles.editNameInput} value={editName} onChangeText={setEditName} multiline placeholderTextColor={theme.textMuted} placeholder="Spell name..." />
            </>
          ) : (
            <>
              <View style={[styles.categoryRing, { borderColor: catColor + '50' }]}>
                <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
                  <MaterialIcons name={(catObj?.icon || 'auto-fix-high') as keyof typeof MaterialIcons.glyphMap} size={32} color={catColor} />
                </View>
              </View>
              <Text style={styles.ritualName}>{libRitual.name}</Text>
              <View style={styles.nameSeparator}>
                <View style={[styles.nameSeparatorLine, { backgroundColor: catColor + '50' }]} />
                <MaterialIcons name="auto-awesome" size={11} color={catColor} style={{ marginHorizontal: 8 }} />
                <View style={[styles.nameSeparatorLine, { backgroundColor: catColor + '50' }]} />
              </View>
              <View style={styles.tagRow}>
                <View style={[styles.tag, { backgroundColor: catColor + '20' }]}>
                  <Text style={[styles.tagText, { color: catColor }]}>{catObj?.name || libRitual.category}</Text>
                </View>
                <View style={styles.tag}>
                  <MaterialIcons name="schedule" size={12} color={theme.textSecondary} />
                  <Text style={styles.tagText}>{scheduleLabels[libRitual.schedule] || libRitual.schedule}</Text>
                </View>
                <View style={[styles.tag, { backgroundColor: inPractice ? theme.success + '20' : theme.accent + '15' }]}>
                  <MaterialIcons name={inPractice ? 'check-circle' : 'bookmark-border'} size={12} color={inPractice ? theme.success : theme.accent} />
                  <Text style={[styles.tagText, { color: inPractice ? theme.success : theme.accent }]}>
                    {inPractice ? 'In Practice' : 'Library Only'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Intention */}
        {libRitual.intention ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>INTENTION</Text>
            <View style={styles.intentionBox}>
              <View style={styles.intentionBorder} />
              {editing ? (
  <TextInput style={[styles.intentionText, { borderBottomWidth: 1, borderBottomColor: theme.primary }]} value={editIntention} onChangeText={setEditIntention} multiline />
) : (
  <Text style={styles.intentionText}>{libRitual.intention}</Text>
)}
            </View>
          </View>
        ) : null}

        {/* Tangible Outcome — always visible in edit mode, hidden when empty in view mode */}
        {(editing || libRitual.tangibleOutcome) ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PURPOSE / TANGIBLE OUTCOME</Text>
            <View style={styles.outcomeBox}>
              <View style={styles.outcomeBorder} />
              <View style={styles.outcomeContent}>
                <MaterialIcons name="track-changes" size={16} color={theme.accent} />
                {editing ? (
                  <TextInput
                    style={[styles.outcomeText, { borderBottomWidth: 1, borderBottomColor: theme.accent }]}
                    value={editOutcome}
                    onChangeText={setEditOutcome}
                    placeholder="Optional: a specific measurable result…"
                    placeholderTextColor={theme.textMuted}
                    multiline
                  />
                ) : (
                  <Text style={styles.outcomeText}>{libRitual.tangibleOutcome}</Text>
                )}
              </View>
            </View>
          </View>
        ) : null}

        {/* Description */}
        {libRitual.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DESCRIPTION</Text>
            {editing ? (
  <TextInput style={[styles.descriptionText, { borderBottomWidth: 1, borderBottomColor: theme.border, minHeight: 80 }]} value={editDescription} onChangeText={setEditDescription} multiline />
) : (
  <Text style={styles.descriptionText}>{libRitual.description}</Text>
)}
          </View>
        ) : null}

        {/* Ingredients */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>INGREDIENTS & MATERIALS</Text>
          {editing ? (
            <View>
              {editIngredients.split(',').map((ing, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                  <TextInput
                    style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 8, padding: 10, fontSize: 14, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border }}
                    value={ing.trim()}
                    onChangeText={(text) => {
                      const parts = editIngredients.split(',');
                      parts[i] = text;
                      setEditIngredients(parts.join(','));
                    }}
                    placeholder="Ingredient..."
                    placeholderTextColor={theme.textMuted}
                  />
                  <Pressable
                    hitSlop={12}
                    onPress={() => {
                      const parts = editIngredients.split(',').filter((_, idx) => idx !== i);
                      setEditIngredients(parts.length > 0 ? parts.join(',') : '');
                    }}
                  >
                    <MaterialIcons name="remove-circle-outline" size={24} color={theme.error} />
                  </Pressable>
                </View>
              ))}
              <Pressable
                hitSlop={12}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, paddingVertical: 10, paddingHorizontal: 4 }}
                onPress={() => {
                  setEditIngredients(editIngredients.length > 0 ? editIngredients + ',' : '');
                }}
              >
                <MaterialIcons name="add-circle-outline" size={22} color={theme.primary} />
                <Text style={{ fontSize: 14, color: theme.primary, fontWeight: '600' }}>Add Ingredient</Text>
              </Pressable>
            </View>
          ) : ingredients.length > 0 ? (
            <View style={styles.ingredientGrid}>
              {ingredients.map((ing, i) => (
                <View key={i} style={styles.ingredientChip}>
                  <MaterialIcons name="fiber-manual-record" size={6} color={theme.primary} />
                  <Text style={styles.ingredientText}>{ing}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 14, color: theme.textMuted, fontStyle: 'italic' }}>No ingredients added yet</Text>
          )}
        </View>

        {/* Practice History */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PRACTICE HISTORY</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{practiceRituals.length}</Text>
              <Text style={styles.statLabel}>Scheduled</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.success }]}>{completedCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.primary }]}>{totalPerformed}</Text>
              <Text style={styles.statLabel}>Times Logged</Text>
            </View>
          </View>
        </View>

        {/* Created date */}
        <View style={styles.metaRow}>
          <MaterialIcons name="calendar-today" size={12} color={theme.textMuted} />
          <Text style={styles.metaText}>
            Added {new Date(libRitual.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
      </ScrollView>

      {/* Floating Bottom Button */}
      <View style={[styles.floatingBar, { paddingBottom: insets.bottom + 16 }]}>
        {inPractice ? (
          <Pressable
            style={styles.viewPracticeBtn}
            onPress={() => {
              if (practiceRituals.length === 1) {
                router.push(`/ritual/${practiceRituals[0].id}`);
              } else {
                router.push('/(tabs)/rituals');
              }
            }}
          >
            <MaterialIcons name="visibility" size={20} color={theme.textPrimary} />
            <Text style={styles.viewPracticeBtnText}>View in Practice</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.addPracticeBtn}
            onPress={() => router.push({ pathname: '/add-to-practice', params: { libraryId: id } })}
          >
            <MaterialIcons name="add" size={20} color={theme.background} />
            <Text style={styles.addPracticeBtnText}>Add to Practice</Text>
          </Pressable>
        )}
      </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAction: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center',
    marginLeft: 4,
  },

  // Not Found
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundTitle: { fontSize: 17, fontWeight: '600', color: theme.textSecondary },
  notFoundBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: theme.primary, borderRadius: theme.radius.md },
  notFoundBtnText: { fontSize: 14, fontWeight: '600', color: theme.background },

  // Hero
  ritualHeader: { alignItems: 'center', paddingBottom: 20, paddingTop: 8 },
  categoryRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  categoryBadge: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  ritualName: { fontSize: 26, fontWeight: '700', color: theme.textPrimary, textAlign: 'center', marginBottom: 10, lineHeight: 34, fontFamily: theme.fonts.serif },
  nameSeparator: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, width: '60%' },
  nameSeparatorLine: { flex: 1, height: 1 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, backgroundColor: theme.surfaceLight },
  tagText: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },

  // Edit mode hero
  editFieldLabel: { fontSize: 11, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 8, marginTop: 4, alignSelf: 'flex-start' },
  editNameInput: { width: '100%', backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 14, fontSize: 20, fontWeight: '700', color: theme.textPrimary, borderWidth: 1.5, borderColor: theme.primary + '30', fontFamily: theme.fonts.serif, textAlign: 'center', marginBottom: 8 },

  // Sections
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: theme.textMuted,
    letterSpacing: 1.2, marginBottom: 10,
    textTransform: 'uppercase' as const,
  },

  // Intention
  intentionBox: { flexDirection: 'row' },
  intentionBorder: {
    width: 3, backgroundColor: theme.primary, borderRadius: 2,
    marginRight: 14,
  },
  intentionText: {
    flex: 1, fontSize: 15, color: theme.textPrimary,
    fontFamily: theme.fonts.serif,
    fontStyle: 'italic', lineHeight: 24,
  },

  // Outcome
  outcomeBox: { flexDirection: 'row' },
  outcomeBorder: {
    width: 3, backgroundColor: theme.accent, borderRadius: 2,
    marginRight: 14,
  },
  outcomeContent: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: theme.accent + '08', borderRadius: theme.radius.sm,
    padding: 14,
  },
  outcomeText: {
    flex: 1, fontSize: 15, color: theme.textPrimary, lineHeight: 22,
    fontWeight: '500',
  },

  // Description
  descriptionText: {
    fontSize: 15, color: theme.textSecondary, lineHeight: 22,
  },

  // Ingredients
  ingredientGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ingredientChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
  },
  ingredientText: { fontSize: 13, fontWeight: '500', color: theme.textPrimary },

  // Practice Stats
  statsRow: { flexDirection: 'row', backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 18, ...theme.shadows.card },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 },
  statLabel: { fontSize: 10, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: theme.border, marginVertical: 4 },

  // Meta
  metaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingTop: 8,
  },
  metaText: { fontSize: 11, color: theme.textMuted },

  // Floating Bar
  floatingBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: theme.background,
    borderTopWidth: 1, borderTopColor: theme.border,
  },
  addPracticeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.primary, borderRadius: theme.radius.md,
    paddingVertical: 16,
    ...theme.shadows.elevated,
  },
  addPracticeBtnText: { fontSize: 16, fontWeight: '700', color: theme.background },
  viewPracticeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.surface, borderRadius: theme.radius.md,
    paddingVertical: 16, borderWidth: 1.5, borderColor: theme.border,
  },
  viewPracticeBtnText: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
});
