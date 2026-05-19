import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import { useApp } from '../../contexts/AppContext';
import { ManifestationRecord, SignType } from '../../services/mockData';
import StarField from '../../components/StarField';

type FilterTab = 'all' | 'brewing' | 'stirring' | 'spilled';

const SIGN_CONFIG: Record<SignType, { emoji: string; label: string; color: string }> = {
  dream:       { emoji: '🌙', label: 'Dream',         color: '#6667AB' },
  omen:        { emoji: '🦅', label: 'Omen',          color: '#C9A0DC' },
  encounter:   { emoji: '👁️',  label: 'Encounter',     color: '#4EA8DE' },
  symbol:      { emoji: '✦',  label: 'Symbol',        color: '#F5D5E0' },
  number:      { emoji: '🔢', label: 'Repeated Number', color: '#B8B0E8' },
  synchronicity: { emoji: '✨', label: 'Synchronicity', color: '#7ED4A8' },
};

const STAGE_CONFIG = {
  brewing:  { label: 'Brewing',  emoji: '🪄', color: '#C9A0DC', desc: 'Cast & in motion' },
  stirring: { label: 'Stirring', emoji: '🌊', color: '#4EA8DE', desc: 'Signs appearing' },
  spilled:  { label: 'Spilled',  emoji: '⭐', color: '#7ED4A8', desc: 'Into reality' },
};

function getStageStyle(status: ManifestationRecord['status']) {
  const cfg = STAGE_CONFIG[status] ?? STAGE_CONFIG.brewing;
  return { color: cfg.color, label: cfg.label, emoji: cfg.emoji, bg: cfg.color + '18', border: cfg.color };
}

export default function ManifestationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { manifestations, categories, categoryColors, addManifestationResult } = useApp();
  const [filter, setFilter] = useState<FilterTab>('all');

  const filtered = manifestations.filter(m => filter === 'all' || m.status === filter);

  const brewingCount  = manifestations.filter(m => m.status === 'brewing').length;
  const stirringCount = manifestations.filter(m => m.status === 'stirring').length;
  const spilledCount  = manifestations.filter(m => m.status === 'spilled').length;

  const getCatEmoji = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return '✦';
    const iconMap: Record<string, string> = {
      paid: '💰', favorite: '❤️', 'auto-awesome': '✨', shield: '🛡️', eco: '🌿',
    };
    return iconMap[cat.icon] || '✦';
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <LinearGradient
        colors={[theme.primary + '28', theme.primary + '10', 'transparent']}
        locations={[0, 0.4, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320, zIndex: 0 }}
        pointerEvents="none"
      />
      <StarField starCount={35} showShootingStar={false} />
      {/* Header */}
      <View style={styles.topbar}>
        <View>
          <Text style={styles.topbarTitle}>The Cauldron</Text>
          <Text style={styles.topbarSub}>What you've cast into motion</Text>
        </View>
      </View>

      {/* Stage summary cards */}
      <View style={styles.stageRow}>
        {(['brewing', 'stirring', 'spilled'] as const).map(stage => {
          const cfg = STAGE_CONFIG[stage];
          const count = stage === 'brewing' ? brewingCount : stage === 'stirring' ? stirringCount : spilledCount;
          const active = filter === stage;
          return (
            <Pressable
              key={stage}
              style={[styles.stageCard, { borderColor: active ? cfg.color : theme.border, backgroundColor: active ? cfg.color + '18' : theme.surface }]}
              onPress={() => setFilter(active ? 'all' : stage)}
            >
              <Text style={styles.stageEmoji}>{cfg.emoji}</Text>
              <Text style={[styles.stageCount, { color: cfg.color }]}>{count}</Text>
              <Text style={styles.stageLabel}>{cfg.label.toUpperCase()}</Text>
              <Text style={styles.stageDesc}>{cfg.desc}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Filter pill */}
      {filter !== 'all' && (
        <View style={styles.activeFilterRow}>
          <View style={[styles.activeFilterPill, { backgroundColor: STAGE_CONFIG[filter].color + '20', borderColor: STAGE_CONFIG[filter].color }]}>
            <Text style={[styles.activeFilterText, { color: STAGE_CONFIG[filter].color }]}>
              {STAGE_CONFIG[filter].emoji} {STAGE_CONFIG[filter].label}
            </Text>
            <Pressable onPress={() => setFilter('all')}>
              <MaterialIcons name="close" size={14} color={STAGE_CONFIG[filter].color} />
            </Pressable>
          </View>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🪄</Text>
            <Text style={styles.emptyTitle}>
              {filter === 'spilled' ? 'Nothing spilled yet' :
               filter === 'stirring' ? 'No signs logged yet' :
               filter === 'brewing' ? 'Nothing brewing' :
               'No intentions cast'}
            </Text>
            <Text style={styles.emptyText}>
              Add a tangible outcome when creating a ritual to start tracking what you call in
            </Text>
          </View>
        ) : (
          filtered.map(m => {
            const ss = getStageStyle(m.status);
            return (
              <Pressable key={m.id} style={styles.card} onPress={() => router.push(`/manifestation/${m.id}`)}>
                {/* Stage stripe */}
                <View style={[styles.cardStripe, { backgroundColor: ss.color }]} />

                <View style={styles.cardBody}>
                  {/* Header row */}
                  <View style={styles.cardHeader}>
                    <Text style={styles.catEmoji}>{getCatEmoji(m.category)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ritualName}>{m.ritualName}</Text>
                      <Text style={styles.cardDate}>
                        Cast {new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={[styles.stageBadge, { backgroundColor: ss.bg, borderColor: ss.border }]}>
                      <Text style={styles.stageBadgeEmoji}>{ss.emoji}</Text>
                      <Text style={[styles.stageBadgeText, { color: ss.color }]}>{ss.label}</Text>
                    </View>
                  </View>

                  {/* Intention */}
                  <View style={styles.intentionBlock}>
                    <Text style={styles.intentionLabel}>INTENTION</Text>
                    <Text style={styles.intentionText}>"{m.intention}"</Text>
                  </View>

                  {/* Signs log */}
                  {m.results.length > 0 && (
                    <View style={styles.signsSection}>
                      <Text style={styles.signsSectionLabel}>SIGNS & SYNCHRONICITIES</Text>
                      {m.results.map(r => {
                        const isFinal = r.type === 'manifested';
                        const signCfg = r.signType ? SIGN_CONFIG[r.signType] : null;
                        const entryColor = isFinal ? '#7ED4A8' : (signCfg?.color ?? '#4EA8DE');
                        return (
                          <View key={r.id} style={[styles.signEntry, { borderLeftColor: entryColor }]}>
                            <View style={styles.signEntryHeader}>
                              <View style={styles.signTypePill}>
                                <Text style={styles.signTypeEmoji}>
                                  {isFinal ? '⭐' : (signCfg?.emoji ?? '✦')}
                                </Text>
                                <Text style={[styles.signTypeLabel, { color: entryColor }]}>
                                  {isFinal ? 'Spilled' : (signCfg?.label ?? 'Sign')}
                                </Text>
                              </View>
                              <Text style={styles.signDate}>
                                {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </Text>
                            </View>
                            <Text style={styles.signNote}>{r.note}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Action buttons */}
                  {m.status !== 'spilled' && (
                    <View style={styles.actionRow}>
                      <Pressable
                        style={styles.logSignBtn}
                        onPress={(e) => { e.stopPropagation?.(); router.push({ pathname: '/add-manifestation', params: { ritualId: m.ritualId } }); }}
                      >
                        <Text style={styles.logSignBtnText}>✦ Log a Sign</Text>
                      </Pressable>
                      <Pressable
                        style={styles.spilledBtn}
                        onPress={(e) => { e.stopPropagation?.(); router.push({ pathname: '/add-manifestation', params: { ritualId: m.ritualId, mode: 'spill' } }); }}
                      >
                        <Text style={styles.spilledBtnText}>⭐ It Spilled</Text>
                      </Pressable>
                    </View>
                  )}

                  {m.status === 'spilled' && (
                    <View style={styles.spilledBanner}>
                      <Text style={styles.spilledBannerText}>⭐ This has spilled into reality</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  topbar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  topbarTitle: { fontSize: 26, fontWeight: '700', color: theme.textPrimary, letterSpacing: 0.3 },
  topbarSub: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },

  stageRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  stageCard: { flex: 1, borderRadius: 14, borderWidth: 1.5, padding: 12, alignItems: 'center', gap: 2 },
  stageEmoji: { fontSize: 20, marginBottom: 2 },
  stageCount: { fontSize: 20, fontWeight: '700' },
  stageLabel: { fontSize: 9, fontWeight: '700', color: theme.textSecondary, letterSpacing: 0.8 },
  stageDesc: { fontSize: 9, color: theme.textMuted, textAlign: 'center', marginTop: 1 },

  activeFilterRow: { paddingHorizontal: 16, marginBottom: 8 },
  activeFilterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  activeFilterText: { fontSize: 12, fontWeight: '600' },

  card: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 16, marginBottom: 14, overflow: 'hidden', flexDirection: 'row' },
  cardStripe: { width: 4 },
  cardBody: { flex: 1, padding: 14 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  catEmoji: { fontSize: 22 },
  ritualName: { fontSize: 15, fontWeight: '600', color: theme.textPrimary },
  cardDate: { fontSize: 11, color: theme.textMuted, marginTop: 1 },
  stageBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  stageBadgeEmoji: { fontSize: 11 },
  stageBadgeText: { fontSize: 11, fontWeight: '600' },

  intentionBlock: { backgroundColor: theme.surfaceLight, borderRadius: 10, padding: 12, marginBottom: 12 },
  intentionLabel: { fontSize: 9, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, marginBottom: 5 },
  intentionText: { fontSize: 14, color: theme.textPrimary, lineHeight: 21, fontStyle: 'italic', fontFamily: theme.fonts.serif },

  signsSection: { marginBottom: 12, gap: 8 },
  signsSectionLabel: { fontSize: 9, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, marginBottom: 2 },
  signEntry: { borderLeftWidth: 2, paddingLeft: 10, paddingVertical: 8, borderRadius: 0, paddingRight: 4 },
  signEntryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  signTypePill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  signTypeEmoji: { fontSize: 12 },
  signTypeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  signDate: { fontSize: 11, color: theme.textMuted },
  signNote: { fontSize: 13, color: theme.textPrimary, lineHeight: 19, fontFamily: theme.fonts.serif },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  logSignBtn: { flex: 1, paddingVertical: 9, borderWidth: 1, borderColor: theme.border, borderRadius: 20, alignItems: 'center' },
  logSignBtnText: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  spilledBtn: { flex: 1, paddingVertical: 9, borderWidth: 1, borderColor: '#7ED4A8', borderRadius: 20, alignItems: 'center', backgroundColor: '#7ED4A810' },
  spilledBtnText: { fontSize: 12, fontWeight: '600', color: '#7ED4A8' },

  spilledBanner: { paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: '#7ED4A810', borderWidth: 1, borderColor: '#7ED4A840', marginTop: 4 },
  spilledBannerText: { fontSize: 13, fontWeight: '600', color: '#7ED4A8' },

  emptyContainer: { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 21, paddingHorizontal: 24, fontFamily: theme.fonts.serif },
});
