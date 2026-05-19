import React from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { useApp } from '../../contexts/AppContext';
import { useAlert } from '@/template';
import { SignType } from '../../services/mockData';
import GradientScreen from '../../components/GradientScreen';
import { resolveCategoryColor, resolveCategory } from '../../utils/categoryHelpers';

const SIGN_CONFIG: Record<SignType, { emoji: string; label: string; color: string }> = {
  dream:         { emoji: '🌙', label: 'Dream',            color: '#6667AB' },
  omen:          { emoji: '🦅', label: 'Omen',             color: '#C9A0DC' },
  encounter:     { emoji: '👁️',  label: 'Encounter',        color: '#4EA8DE' },
  symbol:        { emoji: '✦',  label: 'Symbol',           color: '#F5D5E0' },
  number:        { emoji: '🔢', label: 'Repeated Number',  color: '#B8B0E8' },
  synchronicity: { emoji: '✨', label: 'Synchronicity',    color: '#7ED4A8' },
};

const STAGES = ['brewing', 'stirring', 'spilled'] as const;
const STAGE_CONFIG = {
  brewing:  { label: 'Brewing',  emoji: '🪄', color: '#C9A0DC' },
  stirring: { label: 'Stirring', emoji: '🌊', color: '#4EA8DE' },
  spilled:  { label: 'Spilled',  emoji: '⭐', color: '#7ED4A8' },
};

export default function ManifestationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { manifestations, categories, categoryColors, deleteManifestationResult } = useApp();
  const { showAlert } = useAlert();

  const manif = manifestations.find(m => m.id === id);

  if (!manif) {
    return (
      <GradientScreen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Manifestation not found</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.primary, fontWeight: '600' }}>Go back</Text>
          </Pressable>
        </View>
      </GradientScreen>
    );
  }

  const stage = STAGE_CONFIG[manif.status];
  const stageIndex = STAGES.indexOf(manif.status);
  const catObj = resolveCategory(manif.category, categories);
  const catColor = resolveCategoryColor(manif.category, categoryColors, categories);

  const sortedResults = [...manif.results].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const lastSign = sortedResults.filter(r => r.type === 'sign').at(-1);
  const spillResult = sortedResults.find(r => r.type === 'manifested');
  const daysActive = Math.ceil(
    (new Date().getTime() - new Date(manif.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleDeleteResult = (resultId: string, label: string) => {
    showAlert(
      'Remove this entry?',
      `Remove "${label}" from your signs log? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            deleteManifestationResult(manif.id, resultId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  return (
    <GradientScreen>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>✦ The Cauldron</Text>
          <Text style={styles.headerRitualName} numberOfLines={1}>{manif.ritualName}</Text>
        </View>
        <Pressable
          style={styles.headerBtn}
          onPress={() => router.push(`/ritual/${manif.ritualId}`)}
        >
          <MaterialIcons name="open-in-new" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Category + cast date */}
        <View style={styles.metaRow}>
          <View style={[styles.catPill, { backgroundColor: catColor + '20' }]}>
            <MaterialIcons
              name={(catObj?.icon || 'auto-awesome') as keyof typeof MaterialIcons.glyphMap}
              size={12}
              color={catColor}
            />
            <Text style={[styles.catPillText, { color: catColor }]}>
              {catObj?.name || manif.category}
            </Text>
          </View>
          <Text style={styles.castDate}>
            Cast {new Date(manif.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>

        {/* Intention */}
        <View style={[styles.intentionBlock, { borderLeftColor: stage.color }]}>
          <Text style={[styles.intentionLabel, { color: stage.color }]}>INTENTION</Text>
          <Text style={styles.intentionText}>"{manif.intention}"</Text>
        </View>

        {/* Stage progress track */}
        <View style={styles.progressTrack}>
          {STAGES.map((s, i) => {
            const cfg = STAGE_CONFIG[s];
            const isActive = i <= stageIndex;
            const isCurrent = s === manif.status;
            return (
              <React.Fragment key={s}>
                <View style={styles.progressStep}>
                  <View style={[
                    styles.progressDot,
                    { backgroundColor: isActive ? cfg.color : theme.surfaceLight, borderColor: isActive ? cfg.color : theme.border },
                  ]}>
                    {isCurrent && <View style={[styles.progressDotInner, { backgroundColor: cfg.color }]} />}
                    {i < stageIndex && (
                      <MaterialIcons name="check" size={10} color={theme.background} />
                    )}
                  </View>
                  <Text style={[styles.progressLabel, { color: isActive ? cfg.color : theme.textMuted }]}>
                    {cfg.emoji} {cfg.label}
                  </Text>
                </View>
                {i < STAGES.length - 1 && (
                  <View style={[styles.progressLine, { backgroundColor: i < stageIndex ? stage.color + '60' : theme.border }]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: stage.color }]}>
              {manif.results.filter(r => r.type === 'sign').length}
            </Text>
            <Text style={styles.statLabel}>Signs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: stage.color }]}>{daysActive}</Text>
            <Text style={styles.statLabel}>Days Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: stage.color }]}>
              {spillResult
                ? new Date(spillResult.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : lastSign
                ? new Date(lastSign.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '—'}
            </Text>
            <Text style={styles.statLabel}>{spillResult ? 'Spilled' : 'Last Sign'}</Text>
          </View>
        </View>

        {/* Spilled celebration */}
        {manif.status === 'spilled' && spillResult && (
          <View style={styles.spilledBanner}>
            <Text style={styles.spilledBannerEmoji}>⭐</Text>
            <Text style={styles.spilledBannerTitle}>Spilled into Reality</Text>
            <Text style={styles.spilledBannerDate}>
              {new Date(spillResult.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
            <Text style={styles.spilledBannerNote}>{spillResult.note}</Text>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.timelineTitle}>
            SIGNS & SYNCHRONICITIES
            {sortedResults.length > 0 && <Text style={styles.timelineCount}> · {sortedResults.filter(r => r.type === 'sign').length}</Text>}
          </Text>

          {sortedResults.filter(r => r.type === 'sign').length === 0 ? (
            <View style={styles.emptyTimeline}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyTitle}>No signs logged yet</Text>
              <Text style={styles.emptyText}>
                Stay aware — signs show up in dreams, patterns, and unexpected encounters.
              </Text>
              {manif.status !== 'spilled' && (
                <Pressable
                  style={styles.emptyLogBtn}
                  onPress={() => router.push({ pathname: '/add-manifestation', params: { ritualId: manif.ritualId } })}
                >
                  <Text style={styles.emptyLogBtnText}>✦ Log Your First Sign</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.timeline}>
              {sortedResults.filter(r => r.type === 'sign').map((r, index, arr) => {
                const signCfg = r.signType ? SIGN_CONFIG[r.signType] : null;
                const entryColor = signCfg?.color ?? '#4EA8DE';
                const isLast = index === arr.length - 1;

                return (
                  <View key={r.id} style={styles.timelineItem}>
                    {!isLast && <View style={[styles.timelineConnector, { backgroundColor: entryColor + '35' }]} />}
                    <View style={[styles.timelineDot, { backgroundColor: entryColor, borderColor: entryColor + '40' }]} />
                    <View style={[styles.timelineCard, { borderLeftColor: entryColor }]}>
                      <View style={styles.timelineCardHeader}>
                        <View style={[styles.signTypePill, { backgroundColor: entryColor + '15' }]}>
                          <Text style={styles.signEmoji}>{signCfg?.emoji ?? '✦'}</Text>
                          <Text style={[styles.signLabel, { color: entryColor }]}>
                            {signCfg?.label ?? 'Sign'}
                          </Text>
                        </View>
                        <Text style={styles.timelineDate}>
                          {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                        <Pressable
                          style={styles.deleteBtn}
                          onPress={() => handleDeleteResult(r.id, signCfg?.label ?? 'Sign')}
                          hitSlop={8}
                        >
                          <MaterialIcons name="delete-outline" size={16} color={theme.textMuted} />
                        </Pressable>
                      </View>
                      <Text style={styles.timelineNote}>{r.note}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating action bar */}
      {manif.status !== 'spilled' && (
        <View style={[styles.floatingBar, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={styles.logSignBtn}
            onPress={() => router.push({ pathname: '/add-manifestation', params: { ritualId: manif.ritualId } })}
          >
            <Text style={styles.logSignBtnText}>✦ Log a Sign</Text>
          </Pressable>
          <Pressable
            style={styles.spillBtn}
            onPress={() => router.push({ pathname: '/add-manifestation', params: { ritualId: manif.ritualId, mode: 'spill' } })}
          >
            <Text style={styles.spillBtnText}>⭐ It Spilled</Text>
          </Pressable>
        </View>
      )}
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerEyebrow: { fontSize: 10, fontWeight: '700', color: theme.primary, letterSpacing: 1.5, textTransform: 'uppercase' },
  headerRitualName: { fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginTop: 1 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 14 },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  catPillText: { fontSize: 11, fontWeight: '600' },
  castDate: { fontSize: 12, color: theme.textMuted },

  intentionBlock: {
    borderLeftWidth: 3, borderRadius: 10,
    backgroundColor: theme.surface, padding: 14, marginBottom: 20,
  },
  intentionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  intentionText: {
    fontSize: 15, color: theme.textPrimary, lineHeight: 22,
    fontStyle: 'italic', fontFamily: theme.fonts.serif,
  },

  progressTrack: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.surface, borderRadius: 14, padding: 16,
    marginBottom: 16,
  },
  progressStep: { alignItems: 'center', gap: 6 },
  progressDot: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  progressDotInner: { width: 8, height: 8, borderRadius: 4 },
  progressLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  progressLine: { flex: 1, height: 2, marginBottom: 16, marginHorizontal: 4 },

  statsRow: {
    flexDirection: 'row', backgroundColor: theme.surface,
    borderRadius: 14, padding: 16, marginBottom: 20,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 9, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: theme.border, marginVertical: 4 },

  spilledBanner: {
    alignItems: 'center', padding: 24, gap: 6,
    backgroundColor: '#7ED4A810', borderRadius: 16,
    borderWidth: 1, borderColor: '#7ED4A840', marginBottom: 24,
  },
  spilledBannerEmoji: { fontSize: 40, marginBottom: 4 },
  spilledBannerTitle: { fontSize: 18, fontWeight: '700', color: '#7ED4A8' },
  spilledBannerDate: { fontSize: 13, color: '#7ED4A8', fontWeight: '500', opacity: 0.8 },
  spilledBannerNote: {
    fontSize: 13, color: theme.textSecondary, textAlign: 'center',
    lineHeight: 20, fontFamily: theme.fonts.serif, paddingHorizontal: 16, marginTop: 6,
  },

  timelineSection: { marginTop: 4 },
  timelineTitle: { fontSize: 10, fontWeight: '700', color: theme.textMuted, letterSpacing: 1.2, marginBottom: 16 },
  timelineCount: { color: theme.textMuted, fontWeight: '400' },

  emptyTimeline: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: theme.textSecondary },
  emptyText: {
    fontSize: 13, color: theme.textMuted, textAlign: 'center',
    lineHeight: 20, paddingHorizontal: 20, fontFamily: theme.fonts.serif,
  },
  emptyLogBtn: {
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 20, borderWidth: 1.5, borderColor: theme.primary,
    backgroundColor: theme.primary + '12',
  },
  emptyLogBtnText: { fontSize: 13, fontWeight: '700', color: theme.primary },

  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  timelineDot: {
    width: 10, height: 10, borderRadius: 5, borderWidth: 2,
    marginTop: 16, flexShrink: 0,
  },
  timelineConnector: {
    position: 'absolute', left: 16, top: 26, bottom: -4, width: 2,
  },
  timelineCard: {
    flex: 1, backgroundColor: theme.surface, borderRadius: 12,
    borderLeftWidth: 3, padding: 12, marginBottom: 12,
  },
  timelineCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  signTypePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  signEmoji: { fontSize: 12 },
  signLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  timelineDate: { fontSize: 11, color: theme.textMuted, flex: 1 },
  deleteBtn: { padding: 2 },
  timelineNote: {
    fontSize: 13, color: theme.textPrimary, lineHeight: 20,
    fontFamily: theme.fonts.serif,
  },

  floatingBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: theme.background,
    borderTopWidth: 1, borderTopColor: theme.border,
  },
  logSignBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: theme.border,
    alignItems: 'center', backgroundColor: theme.surface,
  },
  logSignBtnText: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
  spillBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
    backgroundColor: '#7ED4A820', borderWidth: 1.5, borderColor: '#7ED4A8',
  },
  spillBtnText: { fontSize: 14, fontWeight: '700', color: '#7ED4A8' },
});
