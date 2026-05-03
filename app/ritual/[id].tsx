import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useApp } from '../../contexts/AppContext';
import { useAlert } from '@/template';
import { getComputedStatus, getDaysUntil as getDaysUntilCount } from '../../services/mockData';
import StarField from '../../components/StarField';
import { resolveCategoryColor, resolveCategory } from '../../utils/categoryHelpers';

const scheduleLabels: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', moon_phase: 'Moon Phase', as_needed: 'As Needed', monthly: 'Monthly',
};

export default function RitualDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rituals, categories, categoryColors, manifestations, updateRitual, deleteRitual, deleteFutureInSeries, deleteEntireSeries, stopSchedule, updateStatus } = useApp();

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIntention, setEditIntention] = useState('');
  const [editTangibleOutcome, setEditTangibleOutcome] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editIngredients, setEditIngredients] = useState(''); const [editScheduledDate, setEditScheduledDate] = useState<string | undefined>(undefined);
const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const { showAlert } = useAlert();
  const ritual = rituals.find(r => r.id === id);
  const editDateOptions: Date[] = [];
const editDateStart = new Date();
for (let i = 0; i < 90; i++) {
  const d = new Date(editDateStart);
  d.setDate(d.getDate() + i);
  editDateOptions.push(d);
}

  if (!ritual) {
    return (
      <LinearGradient
        colors={['#2A1020', '#1E0A2E', '#180820', '#1A0A28', '#120618']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={['rgba(180,60,120,0.2)', 'transparent', 'rgba(100,40,160,0.15)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="none"
        />
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <StarField starCount={40} showShootingStar={false} />
          <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ritual not found</Text>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Go back</Text>
          </Pressable>
        </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const category = resolveCategory(ritual.category, categories);
  const catColor = resolveCategoryColor(ritual.category, categoryColors, categories);
  const manif = manifestations.find(m => m.ritualId === ritual.id);

  const computedStatus = getComputedStatus(ritual);
  const csColor = computedStatus === 'completed' ? theme.success
    : computedStatus === 'scheduled' ? theme.accent
    : computedStatus === 'overdue' ? theme.error : theme.warning;
  const csIcon = computedStatus === 'completed' ? 'check-circle' as const
    : computedStatus === 'scheduled' ? 'event' as const
    : computedStatus === 'overdue' ? 'error-outline' as const
    : 'notifications-active' as const;
  const csLabel = computedStatus === 'completed' ? 'Completed'
    : computedStatus === 'scheduled' ? 'Scheduled'
    : computedStatus === 'overdue' ? 'Overdue' : 'Approaching';
  const daysCount = ritual.scheduledDate ? getDaysUntilCount(ritual.scheduledDate) : null;
  const countdownLabel = daysCount !== null
    ? daysCount < -1 ? `${Math.abs(daysCount)} days overdue`
    : daysCount === -1 ? '1 day overdue'
    : daysCount === 0 ? 'Today'
    : daysCount === 1 ? 'Tomorrow'
    : `In ${daysCount} days`
    : null;

  // Series info
  const isPartOfSeries = Boolean(ritual.seriesId);
  const seriesCount = isPartOfSeries ? rituals.filter(r => r.seriesId === ritual.seriesId).length : 0;
  const futureInSeries = isPartOfSeries ? rituals.filter(r =>
    r.seriesId === ritual.seriesId &&
    r.status !== 'completed' &&
    r.scheduledDate &&
    new Date(r.scheduledDate).getTime() > new Date().getTime()
  ).length : 0;

  const startEditing = () => {
    if (!ritual) return;
    setEditName(ritual.name);
    setEditDescription(ritual.description);
    setEditIntention(ritual.intention);
    setEditTangibleOutcome(ritual.tangibleOutcome || '');
    setEditCategory(ritual.category);
    setEditIngredients(ritual.ingredients ? ritual.ingredients.join(',') : ''); setEditScheduledDate(ritual.scheduledDate);
    setIsEditing(true);
    Haptics.selectionAsync();
  };

  const cancelEditing = () => {
    setIsEditing(false);
    Haptics.selectionAsync();
  };

  const saveEdits = () => {
    if (!ritual || !editName.trim()) return;
    updateRitual(ritual.id, {
      name: editName.trim(),
      description: editDescription.trim(),
      intention: editIntention.trim(),
      tangibleOutcome: editTangibleOutcome.trim(),
      category: editCategory,
      ingredients: editIngredients.trim() ? editIngredients.split(',').map(i => i.trim()).filter(Boolean) : undefined,
      scheduledDate: editScheduledDate,
    });
    setIsEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleReschedule = () => {
    updateStatus(ritual.id, 'scheduled');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = () => {
    if (isPartOfSeries) {
      const buttons: any[] = [
        { text: 'Cancel', style: 'cancel' },
        { text: 'This Only', onPress: () => { deleteRitual(ritual.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); router.back(); } },
      ];

      if (futureInSeries > 0 && ritual.scheduledDate) {
        buttons.push({
          text: `This & Future (${futureInSeries})`,
          style: 'destructive',
          onPress: () => {
            deleteFutureInSeries(ritual.seriesId!, ritual.scheduledDate!);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.back();
          },
        });
      }

      showAlert(
        'Delete Ritual',
        `This is part of a ${scheduleLabels[ritual.schedule] || ''} series (${seriesCount} total). What would you like to delete?`,
        buttons
      );
    } else {
      showAlert('Delete Ritual', `Are you sure you want to delete "${ritual.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { deleteRitual(ritual.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); router.back(); } },
      ]);
    }
  };

  const handleStopSchedule = () => {
    if (!ritual.seriesId) return;
    showAlert(
      'Stop Schedule',
      'This will remove all future scheduled occurrences of this ritual from today onward. Completed rituals and their journal entries will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Schedule',
          style: 'destructive',
          onPress: () => {
            stopSchedule(ritual.seriesId!);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const handleComplete = () => {
    updateStatus(ritual.id, 'completed');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  function getStatusStyle(status: string) {
    switch (status) {
      case 'pending': return { bg: theme.primary + '18', border: theme.primary, color: theme.primary, label: 'Awaiting \u2726', icon: 'hourglass-top' as const };
      case 'partial': return { bg: '#4EA8DE22', border: '#4EA8DE', color: '#4EA8DE', label: 'Signs Appearing', icon: 'eco' as const };
      case 'manifested': return { bg: theme.success + '18', border: theme.success, color: theme.success, label: 'Manifested', icon: 'star' as const };
      default: return { bg: theme.surfaceLight, border: theme.border, color: theme.textMuted, label: 'Unknown', icon: 'help' as const };
    }
  }

  function getStatusLabel(s?: string) {
    switch (s) {
      case 'approaching': return { color: theme.warning, label: 'Approaching', icon: 'notifications-active' as const };
      case 'completed': return { color: theme.success, label: 'Completed', icon: 'check-circle' as const };
      default: return { color: theme.accent, label: 'Scheduled', icon: 'event' as const };
    }
  }

  const msStyle = getStatusLabel(ritual.status);

  return (
    <LinearGradient
      colors={['#2A1020', '#1E0A2E', '#180820', '#1A0A28', '#120618']}
      locations={[0, 0.25, 0.5, 0.75, 1]}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={{ flex: 1 }}
    >
      <LinearGradient
        colors={['rgba(180,60,120,0.2)', 'transparent', 'rgba(100,40,160,0.15)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <StarField starCount={40} showShootingStar={false} />
      <View style={styles.header}>
        <Pressable onPress={isEditing ? cancelEditing : () => router.back()} style={styles.headerBtn}>
          <MaterialIcons name={isEditing ? 'close' : 'arrow-back'} size={24} color={theme.textPrimary} />
        </Pressable>
        {isEditing ? (
          <Text style={styles.headerEditTitle}>Editing</Text>
        ) : null}
        <View style={{ flex: 1 }} />
        {isEditing ? (
          <Pressable onPress={saveEdits} style={[styles.headerBtn, styles.saveEditBtn]} disabled={!editName.trim()}>
            <MaterialIcons name="check" size={22} color={editName.trim() ? theme.background : theme.textMuted} />
          </Pressable>
        ) : (
          <>
            <Pressable onPress={startEditing} style={styles.headerBtn}>
              <MaterialIcons name="edit" size={22} color={theme.accent} />
            </Pressable>
            {isPartOfSeries && futureInSeries > 0 ? (
              <Pressable onPress={handleStopSchedule} style={styles.headerBtn}>
                <MaterialIcons name="stop-circle" size={22} color={theme.warning} />
              </Pressable>
            ) : null}
            <Pressable onPress={handleDelete} style={styles.headerBtn}>
              <MaterialIcons name="delete-outline" size={22} color={theme.error} />
            </Pressable>
          </>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Ritual Header */}
        <View style={styles.ritualHeader}>
          {isEditing ? (
            <>
              {/* Category Picker */}
              <Text style={styles.editFieldLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.editCatScroll} contentContainerStyle={styles.editCatRow}>
                {categories.map(cat => {
                  const cColor = categoryColors[cat.id] || theme.accent;
                  const isActive = editCategory === cat.id;
                  return (
                    <Pressable key={cat.id}
                      style={[styles.editCatChip, isActive && { backgroundColor: cColor + '20', borderColor: cColor }]}
                      onPress={() => { setEditCategory(cat.id); Haptics.selectionAsync(); }}>
                      <MaterialIcons name={cat.icon as keyof typeof MaterialIcons.glyphMap} size={18} color={isActive ? cColor : theme.textMuted} />
                      <Text style={[styles.editCatChipText, isActive && { color: cColor }]}>{cat.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Name */}
              <Text style={styles.editFieldLabel}>Ritual Name</Text>
              <TextInput style={styles.editInput} value={editName} onChangeText={setEditName} placeholder="Ritual name..." placeholderTextColor={theme.textMuted} />
            </>
          ) : (
            <>
              <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
                <MaterialIcons name={(category?.icon || 'auto-fix-high') as keyof typeof MaterialIcons.glyphMap} size={28} color={catColor} />
              </View>
              <Text style={styles.ritualName}>{ritual.name}</Text>
              <View style={styles.tagRow}>
                <View style={[styles.tag, { backgroundColor: catColor + '20' }]}>
                  <Text style={[styles.tagText, { color: catColor }]}>{category?.name || ritual.category}</Text>
                </View>
                <View style={styles.tag}>
                  <MaterialIcons name="schedule" size={12} color={theme.textSecondary} />
                  <Text style={styles.tagText}>{scheduleLabels[ritual.schedule]}</Text>
                </View>
                <View style={[styles.tag, { backgroundColor: msStyle.color + '20' }]}>
                  <MaterialIcons name={msStyle.icon} size={12} color={msStyle.color} />
                  <Text style={[styles.tagText, { color: msStyle.color }]}>{msStyle.label}</Text>
                </View>
                {(isPartOfSeries || Boolean(ritual.groupId)) ? (
                  <View style={[styles.tag, { backgroundColor: theme.accent + '15' }]}>
                    <MaterialIcons name="repeat" size={12} color={theme.accent} />
                    <Text style={[styles.tagText, { color: theme.accent }]}>
                      {isPartOfSeries ? `Series (${seriesCount})` : `Group (${rituals.filter(r => r.groupId === ritual.groupId).length})`}
                    </Text>
                  </View>
                ) : null}
              </View>
            </>
          )}
        </View>

        {/* Status & Schedule Card */}
        <View style={[styles.statusBadgeCard, { borderColor: csColor + '35', backgroundColor: csColor + '0A' }]}>
          <View style={styles.statusInlineRow}>
            <View style={[styles.statusBadgeIconWrap, { backgroundColor: csColor + '18' }]}>
              <MaterialIcons name={csIcon} size={24} color={csColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusBadgeLabel, { color: csColor }]}>{csLabel}</Text>
              {ritual.scheduledDate ? (
                <Text style={styles.scheduledForDate}>
                  {new Date(ritual.scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
              ) : null}
            </View>
            {(computedStatus === 'approaching' || computedStatus === 'overdue') && countdownLabel ? (
              <View style={[styles.countdownPill, { backgroundColor: (computedStatus === 'overdue' ? theme.error : theme.warning) + '18' }]}>
                <Text style={[styles.countdownText, { color: computedStatus === 'overdue' ? theme.error : theme.warning }]}>{countdownLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Stop Schedule Banner (for series with future rituals) */}
        {isPartOfSeries && futureInSeries > 0 ? (
          <Pressable style={styles.stopBanner} onPress={handleStopSchedule}>
            <MaterialIcons name="stop-circle" size={18} color={theme.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.stopBannerTitle}>Recurring {scheduleLabels[ritual.schedule]} Schedule</Text>
              <Text style={styles.stopBannerSub}>{futureInSeries} future occurrence{futureInSeries !== 1 ? 's' : ''} remaining</Text>
            </View>
            <Text style={styles.stopBannerAction}>Stop</Text>
          </Pressable>
        ) : null}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{ritual.timesPerformed}</Text>
            <Text style={styles.statLabel}>Performed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{manif ? manif.results.length : 0}</Text>
            <Text style={styles.statLabel}>Results</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {ritual.lastPerformed ? new Date(ritual.lastPerformed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}
            </Text>
            <Text style={styles.statLabel}>Last Done</Text>
          </View>
        </View>

         {/* Intention */}
        {isEditing ? (
          <View style={styles.editSection}>
            <Text style={styles.editFieldLabel}>Intention</Text>
            <TextInput style={[styles.editInput, styles.editTextArea]} value={editIntention} onChangeText={setEditIntention} placeholder="What is the purpose of this ritual?" placeholderTextColor={theme.textMuted} multiline textAlignVertical="top" />
          </View>
        ) : (
          <View style={styles.intentionCard}>
            <MaterialIcons name="auto-awesome" size={18} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.intentionLabel}>INTENTION</Text>
              <Text style={styles.intentionText}>{ritual.intention}</Text>
            </View>
          </View>
        )}

        {/* Tangible Outcome */}
        {isEditing ? (
          <View style={styles.editSection}>
            <Text style={styles.editFieldLabel}>Tangible Outcome</Text>
            <TextInput style={[styles.editInput, styles.editTextArea]} value={editTangibleOutcome} onChangeText={setEditTangibleOutcome} placeholder="What specific result are you asking for?" placeholderTextColor={theme.textMuted} multiline textAlignVertical="top" />
          </View>
        ) : ritual.tangibleOutcome ? (
          <View style={styles.outcomeCard}>
            <View style={styles.outcomeHeader}>
              <MaterialIcons name="flag" size={18} color={theme.primary} />
              <Text style={styles.outcomeLabel}>TANGIBLE OUTCOME</Text>
            </View>
            <Text style={styles.outcomeText}>{ritual.tangibleOutcome}</Text>
            {manif ? (
              <Pressable style={styles.outcomeManifLink}
                onPress={() => router.push({ pathname: '/add-manifestation', params: { ritualId: ritual.id } })}>
                {(() => {
                  const ss = getStatusStyle(manif.status);
                  return (
                    <>
                      <MaterialIcons name={ss.icon} size={14} color={ss.color} />
                      <Text style={[styles.outcomeManifText, { color: ss.color }]}>{ss.label}</Text>
                      {manif.status !== 'manifested' ? (
                        <Text style={styles.outcomeManifAction}>Add Result</Text>
                      ) : null}
                    </>
                  );
                })()}
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Description */}
        {isEditing ? (
          <View style={styles.editSection}>
            <Text style={styles.editFieldLabel}>Description</Text>
            <TextInput style={[styles.editInput, styles.editTextArea]} value={editDescription} onChangeText={setEditDescription} placeholder="Describe the ritual process..." placeholderTextColor={theme.textMuted} multiline textAlignVertical="top" />
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{ritual.description}</Text>
          </View>
        )}


        {/* Ingredients */}
{isEditing ? (
  <View style={styles.editSection}>
    <Text style={styles.editFieldLabel}>Ingredients & Tools</Text>
    <View>
      {editIngredients.split(',').map((ing, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
          <TextInput
            style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 10, padding: 12, fontSize: 15, color: theme.textPrimary, borderWidth: 1.5, borderColor: theme.primary + '30' }}
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
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: theme.primary + '10', borderRadius: 10, borderWidth: 1, borderColor: theme.primary + '30' }}
        onPress={() => {
          setEditIngredients(editIngredients.length > 0 ? editIngredients + ',' : '');
        }}
      >
        <MaterialIcons name="add-circle-outline" size={22} color={theme.primary} />
        <Text style={{ fontSize: 14, color: theme.primary, fontWeight: '700', letterSpacing: 0.3 }}>Add Ingredient</Text>
      </Pressable>
    </View>
  </View>
) : null}

        {/* Scheduled Date */}
        {isEditing ? (
          <View style={styles.editSection}>
            <Text style={styles.editFieldLabel}>Scheduled Date</Text>
            <Pressable style={styles.editInput} onPress={() => setShowEditDatePicker(true)}>
              <Text style={{ color: editScheduledDate ? theme.textPrimary : theme.textMuted, fontSize: 15 }}>
                {editScheduledDate
                  ? new Date(editScheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
                  : 'No date set — tap to add'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Modal visible={showEditDatePicker} transparent animationType="slide">
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setShowEditDatePicker(false)}>
            <Pressable style={{ backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: '60%' }} onPress={() => {}}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: theme.textPrimary }}>Select Date</Text>
                <Pressable onPress={() => setShowEditDatePicker(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surfaceLight, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="close" size={22} color={theme.textPrimary} />
                </Pressable>
              </View>
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {editScheduledDate ? (
                  <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border + '40', backgroundColor: theme.error + '10' }}
                    onPress={() => { setEditScheduledDate(undefined); setShowEditDatePicker(false); }}
                  >
                    <MaterialIcons name="close" size={18} color={theme.error} />
                    <Text style={{ fontSize: 15, color: theme.error, fontWeight: '600', marginLeft: 10 }}>Remove date</Text>
                  </Pressable>
                ) : null}
                {editDateOptions.map((d, i) => {
                  const isSelected = editScheduledDate && d.toDateString() === new Date(editScheduledDate).toDateString();
                  const isToday = d.toDateString() === new Date().toDateString();
                  return (
                    <Pressable
                      key={i}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border + '40', backgroundColor: isSelected ? theme.primary + '12' : 'transparent' }}
                      onPress={() => { setEditScheduledDate(d.toISOString()); setShowEditDatePicker(false); Haptics.selectionAsync(); }}
                    >
                      <Text style={{ flex: 1, fontSize: 15, color: isSelected ? theme.primary : theme.textPrimary, fontWeight: isSelected ? '700' : '500' }}>
                        {d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                        {isToday ? '  (Today)' : ''}
                      </Text>
                      {isSelected ? <MaterialIcons name="check-circle" size={20} color={theme.primary} /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Ingredients (view mode) */}
        {!isEditing && ritual.ingredients && ritual.ingredients.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients & Tools</Text>
            <View style={styles.ingredientsList}>
              {ritual.ingredients.map((item, i) => (
                <View key={i} style={styles.ingredientItem}>
                  <View style={styles.ingredientDot} />
                  <Text style={styles.ingredientText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Manifestation Section */}
        {manif ? (
          <View style={[styles.section, { marginTop: 8 }]}>
            <View style={styles.manifHeader}>
              <Text style={styles.sectionTitle}>Manifestation</Text>
              {(() => {
                const ss = getStatusStyle(manif.status);
                return (
                  <View style={[styles.manifStatusBadge, { backgroundColor: ss.bg, borderColor: ss.border }]}>
                    <MaterialIcons name={ss.icon} size={12} color={ss.color} />
                    <Text style={[styles.manifStatusText, { color: ss.color }]}>{ss.label}</Text>
                  </View>
                );
              })()}
            </View>

            <View style={styles.manifIntentionBox}>
              <Text style={styles.manifIntention}>{manif.intention}</Text>
            </View>

            {manif.results.length > 0 ? (
              <View style={styles.manifResultsList}>
                {manif.results.map(r => (
                  <View key={r.id} style={[styles.manifResult, { borderLeftColor: r.type === 'manifested' ? theme.success : '#4EA8DE' }]}>
                    <View style={styles.manifResultHeader}>
                      <Text style={[styles.manifResultType, { color: r.type === 'manifested' ? theme.success : '#4EA8DE' }]}>
                        {r.type === 'manifested' ? 'Manifested' : 'Sign'}
                      </Text>
                      <Text style={styles.manifResultDate}>
                        {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <Text style={styles.manifResultNote}>{r.note}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {manif.status !== 'manifested' ? (
              <Pressable style={styles.addManifestBtn} onPress={() => router.push({ pathname: '/add-manifestation', params: { ritualId: ritual.id } })}>
                <MaterialIcons name="add-circle-outline" size={16} color={theme.success} />
                <Text style={styles.addManifestText}>Add Result</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Journal Section */}
        <View style={[styles.section, { marginTop: 8 }]}>
          <View style={styles.journalHeader}>
            <Text style={styles.sectionTitle}>Journal</Text>
            <Text style={styles.journalCount}>{ritual.journal.length} entries</Text>
          </View>

          {ritual.journal.length === 0 ? (
            <View style={styles.emptyJournal}>
              <Image source={require('../../assets/images/journal-empty.png')} style={{ width: 100, height: 100, marginBottom: 12 }} contentFit="contain" />
              <Text style={styles.emptyJournalText}>No journal entries yet</Text>
              <Text style={styles.emptyJournalSub}>Log this ritual to start recording your practice</Text>
            </View>
          ) : (
            ritual.journal.map((entry) => (
              <View key={entry.id} style={styles.journalEntry}>
                <View style={styles.journalEntryHeader}>
                  <Text style={styles.journalDate}>
                    {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                  <View style={styles.moodBadge}>
                    <Text style={styles.moodText}>{entry.mood}</Text>
                  </View>
                </View>
                <Text style={styles.journalNotes}>{entry.notes}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Buttons */}
      <View style={[styles.floatingContainer, { bottom: insets.bottom + 16 }]}>
        {manif && manif.status !== 'manifested' ? (
          <Pressable style={styles.manifestButton} onPress={() => router.push({ pathname: '/add-manifestation', params: { ritualId: ritual.id } })}>
            <MaterialIcons name="star" size={18} color={theme.background} />
            <Text style={styles.manifestButtonText}>Add Result</Text>
          </Pressable>
        ) : null}
        {computedStatus === 'completed' ? (
          <Pressable style={[styles.completeRitualBtn, { backgroundColor: catColor }]} onPress={handleReschedule}>
            <MaterialIcons name="replay" size={20} color={theme.background} />
            <Text style={styles.completeRitualBtnText}>Reschedule</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.completeRitualBtn} onPress={() => router.push({ pathname: '/log-ritual', params: { ritualId: ritual.id } })}>
            <MaterialIcons name="check-circle" size={20} color={theme.background} />
            <Text style={styles.completeRitualBtnText}>Complete</Text>
          </Pressable>
        )}
      </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 18, color: theme.textSecondary, marginBottom: 16 },
  backLink: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: theme.surface, borderRadius: theme.radius.md },
  backLinkText: { fontSize: 14, color: theme.primary, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  headerBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerEditTitle: { fontSize: 16, fontWeight: '600', color: theme.textSecondary, marginLeft: 4 },
  saveEditBtn: { backgroundColor: theme.success, borderRadius: 22 },
  ritualHeader: { alignItems: 'center', paddingBottom: 20 },
  categoryBadge: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  ritualName: { fontSize: 22, fontWeight: '700', color: theme.textPrimary, textAlign: 'center', marginBottom: 12, lineHeight: 28, fontFamily: theme.fonts.serif },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, backgroundColor: theme.surfaceLight },
  tagText: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },

  statusBadgeCard: {
    alignItems: 'center', backgroundColor: theme.surface, borderRadius: theme.radius.lg,
    padding: 20, marginBottom: 16, borderWidth: 1, borderColor: theme.border,
    ...theme.shadows.card,
  },
  statusInlineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusBadgeIconWrap: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
  },
  statusBadgeLabel: { fontSize: 15, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' as const },
  scheduledForDate: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginTop: 2 },
  countdownPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  countdownText: { fontSize: 13, fontWeight: '700' },

  // Stop Schedule Banner
  stopBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.warning + '0A', borderWidth: 1, borderColor: theme.warning + '30',
    borderRadius: theme.radius.md, padding: 14, marginBottom: 16,
  },
  stopBannerTitle: { fontSize: 13, fontWeight: '600', color: theme.textPrimary },
  stopBannerSub: { fontSize: 11, color: theme.textSecondary, marginTop: 1 },
  stopBannerAction: { fontSize: 13, fontWeight: '700', color: theme.warning },

  statsRow: { flexDirection: 'row', backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 18, marginBottom: 20, ...theme.shadows.card },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 },
  statLabel: { fontSize: 10, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: theme.border, marginVertical: 4 },

  outcomeCard: { backgroundColor: theme.success + '10', borderRadius: theme.radius.md, padding: 16, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: theme.success },
  outcomeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  outcomeLabel: { fontSize: 10, fontWeight: '700', color: theme.success, letterSpacing: 1 },
  outcomeText: { fontSize: 14, color: theme.textPrimary, lineHeight: 20, fontWeight: '500', marginBottom: 10 },
  outcomeManifLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border + '40' },
  outcomeManifText: { fontSize: 12, fontWeight: '600' },
  outcomeManifAction: { marginLeft: 'auto', fontSize: 12, fontWeight: '600', color: theme.primary },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: 10 },
  descriptionText: { fontSize: 15, color: theme.textSecondary, lineHeight: 22 },
  intentionCard: { flexDirection: 'row', gap: 12, backgroundColor: theme.primary + '10', borderRadius: theme.radius.md, padding: 16, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: theme.primary },
  intentionLabel: { fontSize: 10, fontWeight: '700', color: theme.primary, letterSpacing: 1, marginBottom: 4 },
  intentionText: { fontSize: 14, color: theme.textPrimary, lineHeight: 20, fontStyle: 'italic', fontFamily: theme.fonts.serif },
  ingredientsList: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 16, gap: 10, ...theme.shadows.card },
  ingredientItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ingredientDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.accent },
  ingredientText: { fontSize: 14, color: theme.textSecondary, fontWeight: '500' },

  // Edit mode
  editSection: { marginBottom: 16 },
  editFieldLabel: { fontSize: 11, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  editInput: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 14, fontSize: 15, color: theme.textPrimary, borderWidth: 1.5, borderColor: theme.primary + '30' },
  editTextArea: { minHeight: 80, paddingTop: 14, lineHeight: 21 },
  editHint: { fontSize: 11, color: theme.textMuted, marginTop: 4, fontStyle: 'italic' },
  editCatScroll: { marginBottom: 12 },
  editCatRow: { gap: 8, paddingVertical: 4 },
  editCatChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border },
  editCatChipText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },

  manifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  manifStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  manifStatusText: { fontSize: 11, fontWeight: '600' },
  manifIntentionBox: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 16, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: theme.primary, ...theme.shadows.card },
  manifIntention: { fontSize: 14, color: theme.textPrimary, lineHeight: 20, fontStyle: 'italic', fontFamily: theme.fonts.serif },
  manifResultsList: { gap: 8, marginBottom: 12 },
  manifResult: { backgroundColor: theme.surfaceLight, borderLeftWidth: 2, paddingHorizontal: 12, paddingVertical: 10, borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  manifResultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  manifResultType: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  manifResultDate: { fontSize: 11, color: theme.textMuted },
  manifResultNote: { fontSize: 13, color: theme.textPrimary, lineHeight: 19 },
  addManifestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderWidth: 1, borderColor: theme.success + '40', borderRadius: theme.radius.md, backgroundColor: theme.success + '08' },
  addManifestText: { fontSize: 13, fontWeight: '600', color: theme.success },

  journalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  journalCount: { fontSize: 13, color: theme.textMuted },
  emptyJournal: { alignItems: 'center', paddingVertical: 24, backgroundColor: theme.surface, borderRadius: theme.radius.md },
  emptyJournalText: { fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginBottom: 4 },
  emptyJournalSub: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
  journalEntry: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 16, marginBottom: 10, ...theme.shadows.card },
  journalEntryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  journalDate: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  moodBadge: { backgroundColor: theme.surfaceLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  moodText: { fontSize: 11, fontWeight: '600', color: theme.textSecondary },
  journalNotes: { fontSize: 14, color: theme.textPrimary, lineHeight: 20, fontFamily: theme.fonts.serif },

  floatingContainer: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 12 },
  manifestButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.success, paddingVertical: 16, borderRadius: theme.radius.lg, ...theme.shadows.elevated },
  manifestButtonText: { fontSize: 15, fontWeight: '700', color: theme.background },
  completeRitualBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.primary, paddingVertical: 16, borderRadius: theme.radius.lg,
    ...theme.shadows.elevated,
  },
  completeRitualBtnText: { fontSize: 15, fontWeight: '700', color: theme.background, letterSpacing: 0.3 },
});
