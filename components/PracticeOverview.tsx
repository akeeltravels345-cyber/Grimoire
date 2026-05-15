import React, { useEffect, useMemo, useState, memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { theme } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { resolveCategoryColor } from '../utils/categoryHelpers';

// ═══════════════════════════════════════════
// Core category configuration
// ═══════════════════════════════════════════

const CORE_CATEGORIES = ['Money Work', 'Glamour', 'Unblocking', 'Protection'];

const CORE_ICONS: Record<string, string> = {
  'money work': 'paid',
  'glamour': 'auto-awesome',
  'unblocking': 'lock-open',
  'protection': 'shield',
};

const CORE_FALLBACK_COLORS: Record<string, string> = {
  'money work': '#5EBD8A',
  'glamour': '#C9A84C',
  'unblocking': '#4EA8DE',
  'protection': '#7C5CBF',
};

interface CategoryStat {
  catId: string;
  name: string;
  icon: string;
  color: string;
  completedCount: number;
  totalCount: number;
  neglected: boolean;
  lastPerformedDaysAgo: number | null;
  healthPoints: number;
}

// ═══════════════════════════════════════════
// Animated Sub-Components
// ═══════════════════════════════════════════

// Sparkle dot that fades in and out at its own cadence
const Sparkle = memo(({ x, y, size, delayMs, color }: { x: number; y: number; size: number; delayMs: number; color: string }) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.1, { duration: 1400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{
        position: 'absolute', left: x, top: y,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color,
      }, style]}
    />
  );
});

// Animated progress bar that slides from 0 to target
const AnimatedBar = memo(({ progress, color, delayMs = 0, isEmpty = false, isGradient = false }: {
  progress: number; color: string; delayMs?: number; isEmpty?: boolean; isGradient?: boolean;
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const barWidth = useSharedValue(0);

  useEffect(() => {
    if (containerWidth > 0) {
      const target = Math.max((progress / 100) * containerWidth, progress > 0 ? 3 : 0);
      barWidth.value = withDelay(delayMs, withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) }));
    }
  }, [progress, containerWidth]);

  const animStyle = useAnimatedStyle(() => ({ width: barWidth.value }));

  if (isEmpty) {
    return <View style={s.barEmpty} />;
  }

  return (
    <View
      style={isGradient ? s.healthBarBg : s.barBg}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {isGradient ? (
        <Animated.View style={[{ height: 6, borderRadius: 3, overflow: 'hidden' }, animStyle]}>
          <LinearGradient
            colors={[theme.primaryDark, theme.primary, '#DFC4EB']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1, borderRadius: 3 }}
          />
        </Animated.View>
      ) : (
        <Animated.View style={[s.barFill, { backgroundColor: color }, animStyle]} />
      )}
    </View>
  );
});

// Health score with pulsing glow and sparkles
function HealthScoreDisplay({ score }: { score: number }) {
  const pulse = useSharedValue(0);
  const fadeIn = useSharedValue(0);

  useEffect(() => {
    fadeIn.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const scoreColor = score >= 70 ? theme.success : score >= 40 ? theme.warning : theme.error;

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.15, 0.55]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.9, 1.2]) }],
  }));

  const numberStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.02]) }],
  }));

  // Sparkle positions around the score
  const sparkles = [
    { x: 15, y: 8, size: 3, delay: 0, color: theme.primary + '80' },
    { x: -10, y: 30, size: 2.5, delay: 400, color: theme.accent + '70' },
    { x: 5, y: 55, size: 2, delay: 800, color: '#F5D5E0' + '60' },
    { x: -15, y: 12, size: 2, delay: 1200, color: theme.primary + '60' },
    { x: 20, y: 48, size: 2.5, delay: 600, color: theme.accent + '50' },
  ];

  return (
    <View style={s.healthWrap}>
      {/* Ambient glow */}
      <Animated.View style={[s.healthGlow, { backgroundColor: scoreColor }, glowStyle]} />

      {/* Sparkles */}
      <View style={s.sparkleField}>
        {sparkles.map((sp, i) => (
          <Sparkle key={i} x={sp.x + 60} y={sp.y} size={sp.size} delayMs={sp.delay} color={sp.color} />
        ))}
      </View>

      {/* Score number */}
      <Animated.View style={[s.healthScoreRow, numberStyle]}>
        <Text style={[s.healthScoreNum, { color: scoreColor }]}>{score}</Text>
        <Text style={s.healthScoreMax}>/ 100</Text>
      </Animated.View>

      <Text style={s.healthLabel}>Practice Health</Text>
      <Text style={s.healthSub}>Rolling 30 days</Text>

      {/* Gradient health bar */}
      <View style={s.healthBarOuter}>
        <AnimatedBar progress={score} color={scoreColor} delayMs={300} isGradient />
      </View>
    </View>
  );
}

// Bouncing arrow for "Schedule now"
const BouncingArrow = memo(() => {
  const bounce = useSharedValue(0);

  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(bounce.value, [0, 1], [0, 5]) }],
  }));

  return (
    <Animated.View style={style}>
      <MaterialIcons name="arrow-forward" size={13} color={theme.warning} />
    </Animated.View>
  );
});

// Single category row
function CategoryRow({ stat, index, isCore }: { stat: CategoryStat; index: number; isCore: boolean }) {
  const router = useRouter();

  // Neglected pulsing border (always call hooks)
  const neglectedPulse = useSharedValue(0);

  useEffect(() => {
    if (stat.neglected) {
      neglectedPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [stat.neglected]);

  const neglectedAnimStyle = useAnimatedStyle(() => {
    if (!stat.neglected) return { borderColor: 'transparent' };
    return {
      borderColor: `rgba(232, 200, 122, ${interpolate(neglectedPulse.value, [0, 1], [0.12, 0.4])})`,
    };
  });

  // Row fade-in
  const fadeIn = useSharedValue(0);
  useEffect(() => {
    fadeIn.value = withDelay(200 + index * 80, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
  }, []);
  const rowFadeStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [{ translateY: interpolate(fadeIn.value, [0, 1], [8, 0]) }],
  }));

  const lastText = stat.lastPerformedDaysAgo === null
    ? '—'
    : stat.lastPerformedDaysAgo === 0
      ? 'Today'
      : `${stat.lastPerformedDaysAgo}d ago`;

  const pct = stat.totalCount > 0 ? Math.round((stat.completedCount / stat.totalCount) * 100) : 0;
  const isEmpty = stat.totalCount === 0;
  const barColor = stat.neglected ? theme.warning : stat.color;

  const handlePress = () => {
    router.push('/(tabs)/rituals');
  };

  const handleSchedule = () => {
    router.push(`/add-ritual?category=${encodeURIComponent(stat.catId)}`);
  };

  return (
    <Animated.View style={rowFadeStyle}>
      <Pressable onPress={handlePress} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
        <Animated.View
          style={[
            s.catRow,
            { backgroundColor: stat.color + '08' },
            stat.neglected ? s.catRowNeglected : null,
            neglectedAnimStyle,
          ]}
        >
          {/* Category colour wash */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: stat.color + '05', borderRadius: 12 }]} />

          <View style={s.catRowTop}>
            <View style={s.catRowLeft}>
              <View style={[s.catIconBubble, { backgroundColor: stat.color + '1A' }]}>
                <MaterialIcons name={stat.icon as keyof typeof MaterialIcons.glyphMap} size={15} color={stat.color} />
              </View>
              <Text style={[s.catRowName, stat.neglected ? { color: theme.warning } : null]} numberOfLines={1}>
                {stat.name}
              </Text>
            </View>
            <View style={s.catRowRight}>
              {isEmpty ? (
                <Text style={s.catRowEmptyText}> — </Text>
              ) : (
                <Text style={[s.catRowCount, stat.neglected ? { color: theme.warning } : { color: stat.color }]}>
                  {stat.completedCount}/{stat.totalCount}
                </Text>
              )}
              <Text style={[s.catRowLast, stat.neglected && stat.lastPerformedDaysAgo !== null ? { color: theme.warning } : null]}>
                {lastText}
              </Text>
            </View>
          </View>

          <AnimatedBar
            progress={pct}
            color={barColor}
            delayMs={400 + index * 120}
            isEmpty={isEmpty && !stat.neglected}
          />

          {stat.neglected && isCore ? (
            <Pressable style={s.scheduleRow} onPress={handleSchedule} hitSlop={6}>
              <Text style={s.scheduleText}>Schedule now</Text>
              <BouncingArrow />
            </Pressable>
          ) : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════

export default function PracticeOverview() {
  const { rituals, categories, categoryColors, manifestations } = useApp();

  const data = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ——— Core category stats ———
    const coreStats: CategoryStat[] = [];
    const coreCatIds = new Set<string>();
    let totalHealth = 0;

    CORE_CATEGORIES.forEach(coreName => {
      const catObj = categories.find(c => c.name.toLowerCase().trim() === coreName.toLowerCase().trim());
      const catId = catObj?.id || '';
      if (catId) coreCatIds.add(catId);

      const fallbackIcon = CORE_ICONS[coreName.toLowerCase()] || 'auto-fix-high';
      const fallbackColor = CORE_FALLBACK_COLORS[coreName.toLowerCase()] || theme.accent;
      const catColor = catId ? resolveCategoryColor(catId, categoryColors, categories, fallbackColor) : fallbackColor;
      const catIcon = catObj?.icon || fallbackIcon;

      const catRituals = catId ? rituals.filter(r => r.category === catId) : [];
      const recentRituals = catRituals.filter(r => {
        if (!r.scheduledDate) return false;
        const d = new Date(r.scheduledDate);
        return d >= thirtyDaysAgo && d <= now;
      });

      const totalCount = recentRituals.length;
      const completedCount = recentRituals.filter(r => r.status === 'completed').length;

      // Find most recent performance across ALL rituals in this category
      let lastPerformedDaysAgo: number | null = null;
      const perfDates = catRituals
        .filter(r => r.lastPerformed)
        .map(r => new Date(r.lastPerformed!).getTime());
      if (perfDates.length > 0) {
        const recent = new Date(Math.max(...perfDates));
        lastPerformedDaysAgo = Math.floor((now.getTime() - recent.getTime()) / (24 * 60 * 60 * 1000));
      }

      const neglected = lastPerformedDaysAgo === null || lastPerformedDaysAgo >= 30;

      // Health: 25 max, deduct proportionally
      let healthPoints = 0;
      if (lastPerformedDaysAgo !== null && lastPerformedDaysAgo < 30) {
        healthPoints = Math.round(25 * ((30 - lastPerformedDaysAgo) / 30));
      }
      totalHealth += healthPoints;

      coreStats.push({
        catId, name: coreName, icon: catIcon, color: catColor,
        completedCount, totalCount, neglected, lastPerformedDaysAgo, healthPoints,
      });
    });

    // ——— Active (non-core) category stats ———
    const activeStats: CategoryStat[] = [];
    categories.forEach(cat => {
      if (coreCatIds.has(cat.id)) return;
      const catRituals = rituals.filter(r => r.category === cat.id);
      const recentRituals = catRituals.filter(r => {
        if (!r.scheduledDate) return false;
        const d = new Date(r.scheduledDate);
        return d >= thirtyDaysAgo && d <= now;
      });
      if (recentRituals.length === 0) return;

      const totalCount = recentRituals.length;
      const completedCount = recentRituals.filter(r => r.status === 'completed').length;
      const catColor = resolveCategoryColor(cat.id, categoryColors, categories);

      let lastPerformedDaysAgo: number | null = null;
      const perfDates = catRituals
        .filter(r => r.lastPerformed)
        .map(r => new Date(r.lastPerformed!).getTime());
      if (perfDates.length > 0) {
        const recent = new Date(Math.max(...perfDates));
        lastPerformedDaysAgo = Math.floor((now.getTime() - recent.getTime()) / (24 * 60 * 60 * 1000));
      }

      activeStats.push({
        catId: cat.id, name: cat.name, icon: cat.icon || 'auto-fix-high', color: catColor,
        completedCount, totalCount, neglected: false, lastPerformedDaysAgo, healthPoints: 0,
      });
    });

    // ——— Totals ———
    const allRecent = rituals.filter(r => {
      if (!r.scheduledDate) return false;
      const d = new Date(r.scheduledDate);
      return d >= thirtyDaysAgo && d <= now;
    });
    const totalCompleted = allRecent.filter(r => r.status === 'completed').length;
    const totalRituals = allRecent.length;
    const neglectedCount = coreStats.filter(c => c.neglected).length;

    return {
      coreStats,
      activeStats,
      healthScore: Math.min(100, totalHealth),
      totalCompleted,
      totalRituals,
      neglectedCount,
    };
  }, [rituals, categories, categoryColors]);

  const manifestedCount = manifestations.filter(m => m.status === 'spilled').length;

  return (
    <View style={s.card}>
      {/* Subtle top border glow */}
      <LinearGradient
        colors={[theme.primary + '20', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={s.cardTopGlow}
        pointerEvents="none"
      />

      {/* Health Score */}
      <HealthScoreDisplay score={data.healthScore} />

      {/* ——— Core Practice ——— */}
      <View style={s.dividerRow}>
        <View style={s.dividerLine} />
        <MaterialIcons name="stars" size={11} color={theme.primary + '80'} />
        <Text style={s.dividerText}>Core Practice</Text>
        <View style={s.dividerLine} />
      </View>

      {data.coreStats.map((stat, i) => (
        <CategoryRow key={`core-${i}`} stat={stat} index={i} isCore />
      ))}

      {/* ——— Active Practice ——— */}
      {data.activeStats.length > 0 ? (
        <>
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>Active Practice</Text>
            <View style={s.dividerLine} />
          </View>
          {data.activeStats.map((stat, i) => (
            <CategoryRow key={`active-${i}`} stat={stat} index={i + 4} isCore={false} />
          ))}
        </>
      ) : null}

      {/* ——— Footer Stats ——— */}
      <View style={s.footer}>
        <View style={s.footerItem}>
          <Text style={[s.footerValue, { color: theme.success }]}>{data.totalCompleted}</Text>
          <Text style={s.footerLabel}>Completed</Text>
        </View>
        <View style={s.footerDivider} />
        <View style={s.footerItem}>
          <Text style={[s.footerValue, { color: theme.primary }]}>{data.totalRituals}</Text>
          <Text style={s.footerLabel}>Total</Text>
        </View>
        <View style={s.footerDivider} />
        <View style={s.footerItem}>
          <Text style={[s.footerValue, { color: data.neglectedCount > 0 ? theme.warning : theme.textMuted }]}>{data.neglectedCount}</Text>
          <Text style={[s.footerLabel, data.neglectedCount > 0 ? { color: theme.warning } : null]}>Neglected</Text>
        </View>
        <View style={s.footerDivider} />
        <View style={s.footerItem}>
          <Text style={[s.footerValue, { color: '#4EA8DE' }]}>{manifestedCount}</Text>
          <Text style={s.footerLabel}>Manifested</Text>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════

const s = StyleSheet.create({
  // Card
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.border,
    borderTopColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  cardTopGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 60,
  },

  // Health Score
  healthWrap: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 4,
    marginBottom: 4,
  },
  healthGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    top: -10,
    opacity: 0.2,
  },
  sparkleField: {
    position: 'absolute',
    width: 140,
    height: 70,
    top: 0,
  },
  healthScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  healthScoreNum: {
    fontSize: 52,
    fontWeight: '700',
    includeFontPadding: false,
    textShadowColor: 'rgba(201,160,220,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  healthScoreMax: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.textMuted,
  },
  healthLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  healthSub: {
    fontSize: 10,
    color: theme.textMuted,
    fontWeight: '500',
    marginTop: 1,
    marginBottom: 10,
  },
  healthBarOuter: {
    width: '75%',
  },
  healthBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.border,
  },
  dividerText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Category Row
  catRow: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catRowNeglected: {
    backgroundColor: theme.warning + '05',
  },
  catRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  catRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  catIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catRowName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textPrimary,
    flex: 1,
  },
  catRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catRowCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  catRowEmptyText: {
    fontSize: 12,
    color: theme.textMuted,
  },
  catRowLast: {
    fontSize: 10,
    fontWeight: '500',
    color: theme.textMuted,
    minWidth: 42,
    textAlign: 'right',
  },

  // Progress Bar
  barBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  barEmpty: {
    height: 4,
    borderRadius: 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.textMuted + '28',
  },

  // Schedule CTA
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 7,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.warning + '15',
  },
  scheduleText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.warning,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  footerItem: {
    alignItems: 'center',
  },
  footerValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  footerLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.textMuted,
    textTransform: 'uppercase',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  footerDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.border,
  },
});
