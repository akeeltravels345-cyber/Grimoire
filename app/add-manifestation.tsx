import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../constants/theme';
import { useApp } from '../contexts/AppContext';

export default function AddManifestationScreen() {
  const { ritualId } = useLocalSearchParams<{ ritualId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rituals, manifestations, addManifestationResult } = useApp();
  const ritual = rituals.find(r => r.id === ritualId);
  const manif = manifestations.find(m => m.ritualId === ritualId);

  const [description, setDescription] = useState('');
  const [resultType, setResultType] = useState<'sign' | 'manifested'>('sign');

  const canSave = description.trim().length > 0;

  const handleSave = () => {
    if (!canSave || !ritualId) return;
    addManifestationResult(ritualId, description.trim(), new Date().toISOString(), resultType);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  if (!ritual || !manif) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Ritual or manifestation not found</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.primary, fontWeight: '600' }}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialIcons name="close" size={24} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Record Manifestation</Text>
        <Pressable onPress={handleSave} style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]} disabled={!canSave}>
          <Text style={[styles.saveBtnText, !canSave && styles.saveBtnTextDisabled]}>Save</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Ritual Info */}
          <View style={styles.ritualInfo}>
            <MaterialIcons name="star" size={48} color={theme.success} />
            <Text style={styles.ritualName}>{ritual.name}</Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>

          {/* Intention Reminder */}
          <View style={styles.intentionCard}>
            <MaterialIcons name="auto-awesome" size={16} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.intentionLabel}>INTENTION</Text>
              <Text style={styles.intentionText}>{manif.intention}</Text>
            </View>
          </View>

          {/* Status Selector */}
          <Text style={styles.label}>What are you recording? *</Text>
          <View style={styles.typeRow}>
            <Pressable
              style={[styles.typeOption, resultType === 'sign' && styles.typeOptionActiveBlue]}
              onPress={() => { setResultType('sign'); Haptics.selectionAsync(); }}
            >
              <MaterialIcons name="eco" size={20} color={resultType === 'sign' ? '#4EA8DE' : theme.textMuted} />
              <Text style={[styles.typeOptionText, resultType === 'sign' && { color: '#4EA8DE' }]}>Signs Appearing</Text>
              <Text style={styles.typeOptionDesc}>Early indicators, synchronicities</Text>
            </Pressable>
            <Pressable
              style={[styles.typeOption, resultType === 'manifested' && styles.typeOptionActiveGreen]}
              onPress={() => { setResultType('manifested'); Haptics.selectionAsync(); }}
            >
              <MaterialIcons name="star" size={20} color={resultType === 'manifested' ? theme.success : theme.textMuted} />
              <Text style={[styles.typeOptionText, resultType === 'manifested' && { color: theme.success }]}>Fully Manifested</Text>
              <Text style={styles.typeOptionDesc}>The desired outcome materialized</Text>
            </Pressable>
          </View>

          {/* Description */}
          <Text style={styles.label}>What happened? *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what materialized or the signs you observed... Be specific about the result, when you noticed it, and how it connects to your ritual work."
            placeholderTextColor={theme.textMuted}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.hint}>Be detailed — this creates your manifestation timeline</Text>

          {/* Previous Results */}
          {manif.results.length > 0 ? (
            <>
              <Text style={styles.label}>Previous Records</Text>
              {manif.results.map(r => (
                <View key={r.id} style={[styles.prevResult, { borderLeftColor: r.type === 'manifested' ? theme.success : '#4EA8DE' }]}>
                  <View style={styles.prevResultHeader}>
                    <Text style={[styles.prevResultType, { color: r.type === 'manifested' ? theme.success : '#4EA8DE' }]}>
                      {r.type === 'manifested' ? 'Manifested' : 'Sign'}
                    </Text>
                    <Text style={styles.prevResultDate}>
                      {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={styles.prevResultNote}>{r.note}</Text>
                </View>
              ))}
            </>
          ) : null}
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
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, backgroundColor: theme.success, borderRadius: theme.radius.sm },
  saveBtnDisabled: { backgroundColor: theme.surfaceLight },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: theme.background },
  saveBtnTextDisabled: { color: theme.textMuted },
  ritualInfo: { alignItems: 'center', paddingTop: 32, paddingBottom: 16 },
  ritualName: { fontSize: 20, fontWeight: '700', color: theme.textPrimary, textAlign: 'center', marginTop: 12, marginBottom: 4 },
  dateText: { fontSize: 14, color: theme.textSecondary },
  intentionCard: { flexDirection: 'row', gap: 12, backgroundColor: theme.primary + '10', borderRadius: theme.radius.md, padding: 16, marginTop: 16, borderLeftWidth: 3, borderLeftColor: theme.primary },
  intentionLabel: { fontSize: 10, fontWeight: '700', color: theme.primary, letterSpacing: 1, marginBottom: 4 },
  intentionText: { fontSize: 14, color: theme.textPrimary, lineHeight: 20, fontStyle: 'italic' },
  label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginTop: 24, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  typeRow: { gap: 10 },
  typeOption: { backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border, borderRadius: theme.radius.md, padding: 16 },
  typeOptionActiveBlue: { backgroundColor: '#4EA8DE10', borderColor: '#4EA8DE' },
  typeOptionActiveGreen: { backgroundColor: theme.success + '10', borderColor: theme.success },
  typeOptionText: { fontSize: 15, fontWeight: '600', color: theme.textMuted, marginTop: 6 },
  typeOptionDesc: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  input: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 14, fontSize: 15, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border },
  textArea: { minHeight: 140, paddingTop: 14, lineHeight: 22 },
  hint: { fontSize: 12, color: theme.textMuted, marginTop: 6, fontStyle: 'italic' },
  prevResult: { backgroundColor: theme.surfaceLight, borderLeftWidth: 2, paddingHorizontal: 12, paddingVertical: 10, borderTopRightRadius: 8, borderBottomRightRadius: 8, marginBottom: 8 },
  prevResultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  prevResultType: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  prevResultDate: { fontSize: 11, color: theme.textMuted },
  prevResultNote: { fontSize: 13, color: theme.textPrimary, lineHeight: 18 },
});
