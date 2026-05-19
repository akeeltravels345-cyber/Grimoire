import React, { useState } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, Platform,
  KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import StarField from '../components/StarField';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function MonthlyIntentionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setMonthlyIntention } = useApp();

  const now = new Date();
  const monthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  const [step, setStep] = useState<1 | 2>(1);
  const [problemText, setProblemText] = useState('');
  const [ritualsText, setRitualsText] = useState('');

  const canContinue = problemText.trim().length > 0;
  const canFinish = ritualsText.trim().length > 0;

  const handleContinue = () => {
    if (!canContinue) return;
    setStep(2);
    Haptics.selectionAsync();
  };

  const handleFinish = () => {
    if (!canFinish) return;
    setMonthlyIntention(problemText.trim(), ritualsText.trim());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)/rituals');
  };

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
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <StarField starCount={40} showShootingStar={false} />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 32, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Close button */}
            <View style={styles.topRow}>
              <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={12}>
                <MaterialIcons name="close" size={22} color={theme.textMuted} />
              </Pressable>
            </View>

            {/* Progress indicator */}
            <View style={styles.progressRow}>
              <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
              <View style={[styles.progressBar, step >= 2 && styles.progressBarActive]} />
              <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
            </View>
            <Text style={styles.stepLabel}>Step {step} of 2</Text>

            {/* Header */}
            <Text style={styles.monthTitle}>{monthLabel}</Text>
            <Text style={styles.subtitle}>A new chapter begins ✦</Text>

            {/* Decorative divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerStar}>✦</Text>
              <View style={styles.dividerLine} />
            </View>

            {step === 1 ? (
              <>
                {/* Step 1 — The Problem */}
                <Text style={styles.question}>
                  What is not working in your life right now that you want to address this month?
                </Text>

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.diaryInput}
                    value={problemText}
                    onChangeText={setProblemText}
                    placeholder="Write freely..."
                    placeholderTextColor={theme.textMuted}
                    multiline
                    textAlignVertical="top"
                    autoFocus
                  />
                </View>

                <View style={{ flex: 1 }} />

                <Pressable
                  style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
                  onPress={handleContinue}
                  disabled={!canContinue}
                >
                  <Text style={[styles.continueBtnText, !canContinue && styles.continueBtnTextDisabled]}>
                    Continue →
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                {/* Step 2 — The Rituals */}
                <Text style={styles.question}>
                  What rituals do you need this month to work on this?
                </Text>

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.diaryInput}
                    value={ritualsText}
                    onChangeText={setRitualsText}
                    placeholder="List the spells, rituals, or practices calling to you..."
                    placeholderTextColor={theme.textMuted}
                    multiline
                    textAlignVertical="top"
                    autoFocus
                  />
                </View>

                <View style={{ flex: 1 }} />

                {/* Back link */}
                <Pressable onPress={() => { setStep(1); Haptics.selectionAsync(); }} style={styles.backLink}>
                  <MaterialIcons name="arrow-back" size={16} color={theme.textMuted} />
                  <Text style={styles.backLinkText}>Back to Step 1</Text>
                </Pressable>

                <Pressable
                  style={[styles.finishBtn, !canFinish && styles.finishBtnDisabled]}
                  onPress={handleFinish}
                  disabled={!canFinish}
                >
                  <LinearGradient
                    colors={canFinish ? ['#C9A84C', '#B89530', '#A88520'] : [theme.surfaceLight, theme.surfaceLight]}
                    style={styles.finishBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={[styles.finishBtnText, !canFinish && styles.finishBtnTextDisabled]}>
                      Happy Planning ✦
                    </Text>
                  </LinearGradient>
                </Pressable>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const serifFont = theme.fonts.serif;

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
    marginBottom: 8,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    marginBottom: 6,
  },
  progressDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(201,160,220,0.3)',
  },
  progressDotActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  progressBar: {
    width: 60, height: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginHorizontal: 4,
  },
  progressBarActive: {
    backgroundColor: theme.primary,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 24,
  },

  // Header
  monthTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5D5E0',
    textAlign: 'center',
    fontFamily: serifFont,
    textShadowColor: 'rgba(245,213,224,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: serifFont,
    marginBottom: 20,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(201,160,220,0.25)',
  },
  dividerStar: {
    fontSize: 14,
    color: theme.primary,
  },

  // Question
  question: {
    fontSize: 20,
    color: '#F5D5E0',
    fontFamily: serifFont,
    fontStyle: 'italic',
    lineHeight: 30,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },

  // Input
  inputWrapper: {
    borderColor: 'rgba(201,160,220,0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    minHeight: 160,
  },
  diaryInput: {
    fontSize: 16,
    color: '#F5D5E0',
    fontFamily: serifFont,
    lineHeight: 26,
    minHeight: 140,
    padding: 0,
  },

  // Continue button
  continueBtn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  continueBtnDisabled: {
    backgroundColor: theme.surfaceLight,
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.background,
    fontFamily: serifFont,
  },
  continueBtnTextDisabled: {
    color: theme.textMuted,
  },

  // Back link
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textMuted,
  },

  // Finish button
  finishBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
  },
  finishBtnDisabled: {},
  finishBtnGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 14,
  },
  finishBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C0E3A',
    fontFamily: serifFont,
    letterSpacing: 0.3,
  },
  finishBtnTextDisabled: {
    color: theme.textMuted,
  },
});
