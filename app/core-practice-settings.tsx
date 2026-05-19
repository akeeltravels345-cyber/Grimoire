import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch, StyleSheet, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAlert } from '@/template';
import { theme } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { resolveCategoryColor } from '../utils/categoryHelpers';
import StarField from '../components/StarField';

export default function CorePracticeSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { coreCategories, setCoreCategories, categories, categoryColors } = useApp();
  const { showAlert } = useAlert();

  const [selectedIds, setSelectedIds] = useState<string[]>([...coreCategories]);

  const handleToggle = (catId: string) => {
    const isActive = selectedIds.includes(catId);

    if (isActive) {
      if (selectedIds.length <= 1) {
        showAlert('Minimum Required', 'You need at least one core category.');
        return;
      }
      setSelectedIds(prev => prev.filter(id => id !== catId));
    } else {
      if (selectedIds.length >= 6) {
        showAlert('Maximum Reached', 'You can have a maximum of 6 core categories.');
        return;
      }
      setSelectedIds(prev => [...prev, catId]);
    }
    Haptics.selectionAsync();
  };

  const handleSave = () => {
    setCoreCategories(selectedIds);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const hasChanges = JSON.stringify([...selectedIds].sort()) !== JSON.stringify([...coreCategories].sort());

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

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <MaterialIcons name="arrow-back" size={24} color={theme.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Core Practice</Text>
          <Pressable
            onPress={handleSave}
            style={[styles.saveBtn, !hasChanges && styles.saveBtnDisabled]}
            disabled={!hasChanges}
          >
            <Text style={[styles.saveBtnText, !hasChanges && styles.saveBtnTextDisabled]}>Save</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1, zIndex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Subtitle */}
          <View style={styles.subtitleCard}>
            <MaterialIcons name="auto-awesome" size={18} color={theme.primary} />
            <Text style={styles.subtitleText}>
              Choose up to 6 categories that define your core monthly practice. The dashboard will hold you accountable to these every month.
            </Text>
          </View>

          {/* Selected count */}
          <View style={styles.countRow}>
            <Text style={styles.countText}>{selectedIds.length} of 6 selected</Text>
            <View style={styles.countBar}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.countDot,
                    i < selectedIds.length ? { backgroundColor: theme.primary } : { backgroundColor: theme.surfaceLight },
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Category list */}
          <View style={styles.listCard}>
            {categories.map((cat, i) => {
              const isActive = selectedIds.includes(cat.id);
              const catColor = resolveCategoryColor(cat.id, categoryColors, categories);

              return (
                <View key={cat.id}>
                  <Pressable
                    style={[
                      styles.catRow,
                      isActive && { backgroundColor: catColor + '0D' },
                    ]}
                    onPress={() => handleToggle(cat.id)}
                  >
                    <View style={[styles.catIcon, { backgroundColor: isActive ? catColor + '20' : theme.surfaceLight }]}>
                      <MaterialIcons
                        name={(cat.icon || 'auto-fix-high') as keyof typeof MaterialIcons.glyphMap}
                        size={20}
                        color={isActive ? catColor : theme.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.catName, !isActive && { color: theme.textMuted }]}>
                        {cat.name}
                      </Text>
                      {isActive ? (
                        <Text style={[styles.catBadge, { color: catColor }]}>Core pillar</Text>
                      ) : null}
                    </View>
                    <Switch
                      value={isActive}
                      onValueChange={() => handleToggle(cat.id)}
                      trackColor={{ false: theme.surfaceLight, true: catColor + '50' }}
                      thumbColor={isActive ? catColor : theme.textMuted}
                    />
                  </Pressable>
                  {i < categories.length - 1 ? <View style={styles.catDivider} /> : null}
                </View>
              );
            })}
          </View>

          {/* Info note */}
          <View style={styles.infoRow}>
            <MaterialIcons name="info-outline" size={14} color={theme.textMuted} />
            <Text style={styles.infoText}>
              Core categories appear on your dashboard monthly snapshot with progress tracking and accountability warnings.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    zIndex: 2,
  },
  headerBtn: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17, fontWeight: '600', color: theme.textPrimary,
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: theme.primary,
    borderRadius: theme.radius.sm,
  },
  saveBtnDisabled: {
    backgroundColor: theme.surfaceLight,
  },
  saveBtnText: {
    fontSize: 15, fontWeight: '600', color: theme.background,
  },
  saveBtnTextDisabled: {
    color: theme.textMuted,
  },

  subtitleCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  subtitleText: {
    flex: 1,
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 21,
    fontFamily: theme.fonts.serif,
    fontStyle: 'italic',
  },

  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  countText: {
    fontSize: 12, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  countBar: {
    flexDirection: 'row', gap: 5,
  },
  countDot: {
    width: 8, height: 8, borderRadius: 4,
  },

  listCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
    borderTopColor: 'rgba(255,255,255,0.15)',
    marginBottom: 20,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  catIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  catName: {
    fontSize: 15, fontWeight: '600', color: theme.textPrimary,
  },
  catBadge: {
    fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  catDivider: {
    height: 1, backgroundColor: theme.border, marginHorizontal: 16,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.textMuted,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
