import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import { useApp } from '../../contexts/AppContext';
import { ManifestationRecord } from '../../services/mockData';

type FilterTab = 'all' | 'pending' | 'manifested';

function getStatusStyle(status: ManifestationRecord['status']) {
  switch (status) {
    case 'pending': return { bg: theme.primary + '18', border: theme.primary, color: theme.primary, label: 'Awaiting ✦' };
    case 'partial': return { bg: '#4EA8DE22', border: '#4EA8DE', color: '#4EA8DE', label: 'Signs Appearing' };
    case 'manifested': return { bg: theme.success + '18', border: theme.success, color: theme.success, label: 'Manifested' };
    default: return { bg: theme.surfaceLight, border: theme.border, color: theme.textMuted, label: status };
  }
}

export default function ManifestationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { manifestations, categories, categoryColors, addManifestationResult } = useApp();
  const [filter, setFilter] = useState<FilterTab>('all');

  const filtered = manifestations.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'pending') return m.status === 'pending' || m.status === 'partial';
    if (filter === 'manifested') return m.status === 'manifested';
    return true;
  });

  const pendingCount = manifestations.filter(m => m.status === 'pending' || m.status === 'partial').length;
  const manifestedCount = manifestations.filter(m => m.status === 'manifested').length;

  const getCatEmoji = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return '✦';
    const iconMap: Record<string, string> = {
      paid: '💰', favorite: '❤️', 'auto-awesome': '✨', shield: '🛡️',
    };
    return iconMap[cat.icon] || '✦';
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.topbar}>
        <View>
          <Text style={styles.topbarTitle}>Manifestations</Text>
          <Text style={styles.topbarSub}>Track what you called in</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={styles.filterTabs}>
          <Pressable style={[styles.filterTab, filter === 'all' && styles.filterTabActive]} onPress={() => setFilter('all')}>
            <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>All</Text>
          </Pressable>
          <Pressable style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]} onPress={() => setFilter('pending')}>
            <Text style={[styles.filterTabText, filter === 'pending' && styles.filterTabTextActive]}>Awaiting ✦</Text>
          </Pressable>
          <Pressable style={[styles.filterTab, filter === 'manifested' && styles.filterTabActive]} onPress={() => setFilter('manifested')}>
            <Text style={[styles.filterTabText, filter === 'manifested' && styles.filterTabTextActive]}>Manifested</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: theme.primary }]}>{pendingCount}</Text>
            <Text style={styles.summaryLabel}>AWAITING</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: theme.success }]}>{manifestedCount}</Text>
            <Text style={styles.summaryLabel}>MANIFESTED</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: '#4EA8DE' }]}>
              {manifestations.length > 0 ? Math.round((manifestedCount / manifestations.length) * 100) : 0}%
            </Text>
            <Text style={styles.summaryLabel}>SUCCESS</Text>
          </View>
        </View>

        {/* Manifestation Cards */}
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="auto-awesome" size={48} color={theme.textMuted} />
            <Text style={styles.emptyTitle}>
              {filter === 'manifested' ? 'No Manifestations Yet' : filter === 'pending' ? 'Nothing Awaiting' : 'No Intentions Set'}
            </Text>
            <Text style={styles.emptyText}>Add an intention when creating rituals to start tracking manifestations</Text>
          </View>
        ) : (
          filtered.map(m => {
            const ss = getStatusStyle(m.status);
            const catColor = categoryColors[m.category] || theme.accent;
            return (
              <Pressable key={m.id} style={styles.manifCard} onPress={() => router.push(`/ritual/${m.ritualId}`)}>
                {/* Header */}
                <View style={styles.manifCardHeader}>
                  <Text style={styles.manifCatEmoji}>{getCatEmoji(m.category)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.manifRitualName}>{m.ritualName}</Text>
                    <Text style={styles.manifDate}>
                      {new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: ss.bg, borderColor: ss.border }]}>
                    <Text style={[styles.statusBadgeText, { color: ss.color }]}>{ss.label}</Text>
                  </View>
                </View>

                {/* Intention */}
                <Text style={styles.manifIntention}>{m.intention}</Text>

                {/* Results */}
                {m.results.length > 0 ? (
                  <View style={styles.manifResults}>
                    {m.results.map(r => (
                      <View key={r.id} style={[styles.resultEntry, { borderLeftColor: r.type === 'manifested' ? theme.success : '#4EA8DE' }]}>
                        <View style={styles.resultEntryHeader}>
                          <Text style={[styles.resultTypeLabel, { color: r.type === 'manifested' ? theme.success : '#4EA8DE' }]}>
                            {r.type === 'manifested' ? 'Manifested' : 'Sign'}
                          </Text>
                          <Text style={styles.resultDate}>
                            {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        </View>
                        <Text style={styles.resultNote}>{r.note}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Record Button */}
                {m.status !== 'manifested' ? (
                  <Pressable
                    style={styles.recordBtn}
                    onPress={() => router.push({ pathname: '/add-manifestation', params: { ritualId: m.ritualId } })}
                  >
                    <MaterialIcons name="add-circle-outline" size={16} color={theme.textSecondary} />
                    <Text style={styles.recordBtnText}>Record a Sign or Manifestation</Text>
                  </Pressable>
                ) : null}
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
  topbar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  topbarTitle: { fontSize: 24, fontWeight: '700', color: theme.textPrimary },
  topbarSub: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },

  filterTabs: { flexDirection: 'row', backgroundColor: theme.surfaceLight, borderRadius: theme.radius.md, padding: 3 },
  filterTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  filterTabActive: { backgroundColor: theme.surface },
  filterTabText: { fontSize: 12, fontWeight: '500', color: theme.textMuted },
  filterTabTextActive: { color: theme.textPrimary, fontWeight: '600' },

  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 18 },
  summaryCard: { flex: 1, backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 14, alignItems: 'center', ...theme.shadows.card },
  summaryValue: { fontSize: 26, fontWeight: '700', marginBottom: 2 },
  summaryLabel: { fontSize: 9, fontWeight: '700', color: theme.textSecondary, letterSpacing: 0.8 },

  manifCard: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radius.lg, padding: 16, marginBottom: 12, ...theme.shadows.card },
  manifCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  manifCatEmoji: { fontSize: 24 },
  manifRitualName: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  manifDate: { fontSize: 11, color: theme.textMuted, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  manifIntention: { fontSize: 15, color: theme.textPrimary, lineHeight: 22, fontStyle: 'italic', marginBottom: 12 },

  manifResults: { gap: 8, marginBottom: 12 },
  resultEntry: { backgroundColor: theme.surfaceLight, borderLeftWidth: 2, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 0, borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  resultEntryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  resultTypeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  resultDate: { fontSize: 11, color: theme.textMuted },
  resultNote: { fontSize: 13, color: theme.textPrimary, lineHeight: 19 },

  recordBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1, borderColor: theme.border, borderRadius: 20, marginTop: 4 },
  recordBtnText: { fontSize: 12, fontWeight: '500', color: theme.textSecondary },

  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
});
