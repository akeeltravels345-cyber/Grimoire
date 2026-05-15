import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { SignType } from '../services/mockData';
import GradientScreen from '../components/GradientScreen';

const SIGN_TYPES: { key: SignType; emoji: string; label: string; desc: string; color: string }[] = [
  { key: 'dream',         emoji: '🌙', label: 'Dream',            desc: 'A dream that felt connected',   color: '#6667AB' },
  { key: 'omen',          emoji: '🦅', label: 'Omen',             desc: 'A sign in nature or the world', color: '#C9A0DC' },
  { key: 'encounter',     emoji: '👁️',  label: 'Encounter',        desc: 'A meaningful meeting or event', color: '#4EA8DE' },
  { key: 'symbol',        emoji: '✦',  label: 'Symbol',           desc: 'A recurring image or motif',    color: '#F5D5E0' },
  { key: 'number',        emoji: '🔢', label: 'Repeated Number',  desc: 'Numbers showing up in pattern', color: '#B8B0E8' },
  { key: 'synchronicity', emoji: '✨', label: 'Synchronicity',    desc: 'A meaningful coincidence',      color: '#7ED4A8' },
];

export default function AddManifestationScreen() {
  const { ritualId, mode } = useLocalSearchParams<{ ritualId: string; mode?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rituals, manifestations, addManifestationResult } = useApp();

  const ritual = rituals.find(r => r.id === ritualId);
  const manif = manifestations.find(m => m.ritualId === ritualId);

  const isSpillMode = mode === 'spill';
  const [isSpilling, setIsSpilling] = useState(isSpillMode);
  const [selectedSign, setSelectedSign] = useState<SignType | null>(null);
  const [description, setDescription] = useState('');

  const canSave = description.trim().length > 0 && (isSpilling || selectedSign !== null);

  const handleSave = () => {
    if (!canSave || !ritualId) return;
    const type = isSpilling ? 'manifested' : 'sign';
    const signType = isSpilling ? undefined : (selectedSign ?? undefined);
    addManifestationResult(ritualId, description.trim(), new Date().toISOString(), type, signType);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  if (!ritual || !manif) {
    return (
      <GradientScreen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Ritual not found</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.primary, fontWeight: '600' }}>Go back</Text>
          </Pressable>
        </View>
      </GradientScreen>
    );
  }

  const activeSignColor = isSpilling ? '#7ED4A8' : (selectedSign ? SIGN_TYPES.find(s => s.key === selectedSign)?.color : undefined);

  return (
    <GradientScreen>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialIcons name="close" size={24} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isSpilling ? '⭐ It Spilled' : '✦ Log a Sign'}
        </Text>
        <Pressable
          onPress={handleSave}
          style={[styles.saveBtn, { backgroundColor: canSave ? (activeSignColor ?? theme.primary) : theme.surfaceLight }]}
          disabled={!canSave}
        >
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
          {/* Intention reminder */}
          <View style={styles.intentionCard}>
            <Text style={styles.intentionLabel}>INTENTION</Text>
            <Text style={styles.intentionText}>"{manif.intention}"</Text>
            <Text style={styles.ritualNameSmall}>— {ritual.name}</Text>
          </View>

          {/* Mode toggle */}
          <View style={styles.modeToggleRow}>
            <Pressable
              style={[styles.modeToggle, !isSpilling && styles.modeToggleActive]}
              onPress={() => { setIsSpilling(false); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.modeToggleText, !isSpilling && styles.modeToggleTextActive]}>✦ Log a Sign</Text>
            </Pressable>
            <Pressable
              style={[styles.modeToggle, isSpilling && styles.modeToggleSpillActive]}
              onPress={() => { setIsSpilling(true); setSelectedSign(null); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.modeToggleText, isSpilling && styles.modeToggleSpillText]}>⭐ It Spilled</Text>
            </Pressable>
          </View>

          {/* Sign type picker — only when logging a sign */}
          {!isSpilling && (
            <>
              <Text style={styles.sectionLabel}>What kind of sign?</Text>
              <View style={styles.signGrid}>
                {SIGN_TYPES.map(s => {
                  const active = selectedSign === s.key;
                  return (
                    <Pressable
                      key={s.key}
                      style={[styles.signTile, { borderColor: active ? s.color : theme.border, backgroundColor: active ? s.color + '18' : theme.surface }]}
                      onPress={() => { setSelectedSign(s.key); Haptics.selectionAsync(); }}
                    >
                      <Text style={styles.signTileEmoji}>{s.emoji}</Text>
                      <Text style={[styles.signTileLabel, { color: active ? s.color : theme.textPrimary }]}>{s.label}</Text>
                      <Text style={styles.signTileDesc}>{s.desc}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* Spill mode info */}
          {isSpilling && (
            <View style={styles.spillInfo}>
              <Text style={styles.spillInfoEmoji}>⭐</Text>
              <Text style={styles.spillInfoTitle}>Mark as Spilled</Text>
              <Text style={styles.spillInfoDesc}>
                The intention has crossed from the unseen into reality. Describe what manifested.
              </Text>
            </View>
          )}

          {/* Description input */}
          <Text style={styles.sectionLabel}>
            {isSpilling ? 'What manifested?' : 'Describe what you witnessed'}
          </Text>
          <TextInput
            style={[styles.textArea, activeSignColor ? { borderColor: activeSignColor + '60' } : {}]}
            value={description}
            onChangeText={setDescription}
            placeholder={
              isSpilling
                ? 'Describe what came into reality — be specific about what happened and when...'
                : 'What did you notice? When did it happen? Why does it feel connected to your intention...'
            }
            placeholderTextColor={theme.textMuted}
            multiline
            textAlignVertical="top"
          />

          {/* Previous signs */}
          {manif.results.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Previous Signs</Text>
              {manif.results.map(r => {
                const isFinal = r.type === 'manifested';
                const signCfg = r.signType ? SIGN_TYPES.find(s => s.key === r.signType) : null;
                const entryColor = isFinal ? '#7ED4A8' : (signCfg?.color ?? '#4EA8DE');
                return (
                  <View key={r.id} style={[styles.prevEntry, { borderLeftColor: entryColor }]}>
                    <View style={styles.prevEntryHeader}>
                      <Text style={[styles.prevEntryType, { color: entryColor }]}>
                        {isFinal ? '⭐ Spilled' : `${signCfg?.emoji ?? '✦'} ${signCfg?.label ?? 'Sign'}`}
                      </Text>
                      <Text style={styles.prevEntryDate}>
                        {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <Text style={styles.prevEntryNote}>{r.note}</Text>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: theme.textPrimary },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: theme.radius.sm },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: theme.background },
  saveBtnTextDisabled: { color: theme.textMuted },

  intentionCard: { backgroundColor: theme.primary + '10', borderLeftWidth: 3, borderLeftColor: theme.primary, borderRadius: 12, padding: 14, marginTop: 18, marginBottom: 4 },
  intentionLabel: { fontSize: 9, fontWeight: '700', color: theme.primary, letterSpacing: 1, marginBottom: 6 },
  intentionText: { fontSize: 15, color: theme.textPrimary, lineHeight: 22, fontStyle: 'italic', fontFamily: theme.fonts.serif },
  ritualNameSmall: { fontSize: 11, color: theme.textMuted, marginTop: 6 },

  modeToggleRow: { flexDirection: 'row', backgroundColor: theme.surfaceLight, borderRadius: 12, padding: 3, marginTop: 18, marginBottom: 4 },
  modeToggle: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  modeToggleActive: { backgroundColor: theme.surface },
  modeToggleSpillActive: { backgroundColor: '#7ED4A820' },
  modeToggleText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  modeToggleTextActive: { color: theme.textPrimary },
  modeToggleSpillText: { color: '#7ED4A8' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 22, marginBottom: 10 },

  signGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  signTile: { width: '47%', borderWidth: 1.5, borderRadius: 12, padding: 12, gap: 4 },
  signTileEmoji: { fontSize: 22 },
  signTileLabel: { fontSize: 13, fontWeight: '600' },
  signTileDesc: { fontSize: 11, color: theme.textMuted, lineHeight: 15 },

  spillInfo: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  spillInfoEmoji: { fontSize: 40 },
  spillInfoTitle: { fontSize: 17, fontWeight: '700', color: '#7ED4A8' },
  spillInfoDesc: { fontSize: 13, color: theme.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20, fontFamily: theme.fonts.serif },

  textArea: { backgroundColor: theme.surface, borderRadius: 12, padding: 14, fontSize: 15, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border, minHeight: 140, paddingTop: 14, lineHeight: 22 },

  prevEntry: { borderLeftWidth: 2, paddingLeft: 12, paddingVertical: 10, paddingRight: 4, marginBottom: 8 },
  prevEntryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  prevEntryType: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  prevEntryDate: { fontSize: 11, color: theme.textMuted },
  prevEntryNote: { fontSize: 13, color: theme.textPrimary, lineHeight: 18, fontFamily: theme.fonts.serif },
});
