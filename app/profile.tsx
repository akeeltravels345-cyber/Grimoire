import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Switch, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useAlert } from '@/template';
import { theme } from '../constants/theme';
import GradientScreen from '../components/GradientScreen';
import { useApp } from '../contexts/AppContext';
import { getComputedStatus } from '../services/mockData';
import Svg, { Circle } from 'react-native-svg';

const PROFILE_KEY = 'grimoire_profile';

interface ProfileData {
  firstName: string;
  practiceSince: string;
  tradition: string;
  bio: string;
}

interface SettingsData {
  dailyReminder: boolean;
  ritualReminders: boolean;
  reminderTime: string;
  moonAlerts: boolean;
  planetaryHourAlerts: boolean;
  darkMode: boolean;
  hapticFeedback: boolean;
}

const SETTINGS_KEY = 'grimoire_settings';

const DEFAULT_PROFILE: ProfileData = {
  firstName: '',
  practiceSince: '',
  tradition: '',
  bio: '',
};

const DEFAULT_SETTINGS: SettingsData = {
  dailyReminder: true,
  ritualReminders: true,
  reminderTime: '08:00',
  moonAlerts: true,
  planetaryHourAlerts: false,
  darkMode: true,
  hapticFeedback: true,
};

function StatRing({ value, max, size = 64, color = theme.primary, label }: {
  value: number; max: number; size?: number; color?: string; label: string;
}) {
  const progress = Math.min(value / Math.max(max, 1), 1);
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.surfaceLight} strokeWidth={strokeWidth} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={`${circumference}`} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round" fill="none" rotation="-90" origin={`${size / 2},${size / 2}`} />
        </Svg>
        <Text style={{ fontSize: 16, fontWeight: '700', color }}>{value}</Text>
      </View>
      <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rituals, categories, manifestations, coreCategories, clearAllData } = useApp();
  const { showAlert } = useAlert();

  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [isEditing, setIsEditing] = useState(false);
  const [editProfile, setEditProfile] = useState<ProfileData>(DEFAULT_PROFILE);

  // Compute stats inline
  const totalPerformed = rituals.reduce((sum, r) => sum + r.timesPerformed, 0);
  const activeCount = rituals.filter(r => {
    const s = getComputedStatus(r);
    return s === 'scheduled' || s === 'approaching';
  }).length;
  const totalJournalEntries = rituals.reduce((sum, r) => sum + r.journal.length, 0);

  // Streak calculation
  const performedDates = new Set<string>();
  rituals.forEach(r => {
    r.journal.forEach(j => { performedDates.add(j.date.split('T')[0]); });
  });
  let streak = 0;
  const checkDate = new Date();
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (performedDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const totalManifested = manifestations.filter(m => m.status === 'spilled').length;
  const totalPending = manifestations.filter(m => m.status === 'brewing' || m.status === 'stirring').length;

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(PROFILE_KEY),
      AsyncStorage.getItem(SETTINGS_KEY),
    ]).then(([profileData, settingsData]) => {
      if (profileData) {
        try {
          const parsed = JSON.parse(profileData);
          setProfile(parsed);
          setEditProfile(parsed);
        } catch { /* ignore */ }
      }
      if (settingsData) {
        try { setSettings(JSON.parse(settingsData)); } catch { /* ignore */ }
      }
    });
  }, []);

  const saveProfile = () => {
    setProfile(editProfile);
    AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(editProfile));
    setIsEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const updateSetting = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    Haptics.selectionAsync();
  };

  const handleClearData = () => {
    showAlert(
      'Clear All Practice Data?',
      'This will permanently delete all rituals, manifestations, and journal entries. Your profile and categories will be kept. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            clearAllData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showAlert('Cleared', 'All practice data has been removed. You can start fresh.');
          },
        },
      ]
    );
  };

  const initials = profile.firstName
    ? profile.firstName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '\u2726';

  return (
    <GradientScreen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>

          {isEditing ? (
            <View style={styles.editSection}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>FIRST NAME</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editProfile.firstName}
                  onChangeText={v => setEditProfile(p => ({ ...p, firstName: v }))}
                  placeholder="Your first name..."
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>TRADITION / PATH</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editProfile.tradition}
                  onChangeText={v => setEditProfile(p => ({ ...p, tradition: v }))}
                  placeholder="e.g., Eclectic, Wiccan, Hoodoo..."
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>PRACTICING SINCE</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editProfile.practiceSince}
                  onChangeText={v => setEditProfile(p => ({ ...p, practiceSince: v }))}
                  placeholder="e.g., 2020, 5 years..."
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>BIO</Text>
                <TextInput
                  style={[styles.fieldInput, { minHeight: 80 }]}
                  value={editProfile.bio}
                  onChangeText={v => setEditProfile(p => ({ ...p, bio: v }))}
                  placeholder="A few words about your craft journey..."
                  placeholderTextColor={theme.textMuted}
                  multiline
                  textAlignVertical="top"
                />
              </View>
              <View style={styles.editButtons}>
                <Pressable style={styles.cancelBtn} onPress={() => { setIsEditing(false); setEditProfile(profile); }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveProfileBtn} onPress={saveProfile}>
                  <Text style={styles.saveProfileBtnText}>Save Profile</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.craftName}>{profile.firstName || 'Unnamed Practitioner'}</Text>
              {profile.tradition ? <Text style={styles.tradition}>{profile.tradition}</Text> : null}
              {profile.practiceSince ? <Text style={styles.practicing}>Practicing since {profile.practiceSince}</Text> : null}
              {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
              <Pressable style={styles.editBtn} onPress={() => { setIsEditing(true); setEditProfile(profile); }}>
                <MaterialIcons name="edit" size={14} color={theme.primary} />
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Practice Stats */}
        <Text style={styles.sectionTitle}>Practice Summary</Text>
        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <StatRing value={streak} max={30} color={theme.primary} label="Streak" />
            <StatRing value={totalPerformed} max={Math.max(100, totalPerformed)} color={theme.accent} label="Performed" />
            <StatRing value={totalManifested} max={manifestations.length || 1} color={theme.success} label="Manifested" />
            <StatRing value={totalJournalEntries} max={Math.max(50, totalJournalEntries)} color={theme.warning} label="Entries" />
          </View>

          <View style={styles.statsDivider} />

          <View style={styles.statsDetailRow}>
            <View style={styles.statsDetailItem}>
              <Text style={styles.statsDetailValue}>{rituals.length}</Text>
              <Text style={styles.statsDetailLabel}>Total Rituals</Text>
            </View>
            <View style={styles.statsDetailItem}>
              <Text style={styles.statsDetailValue}>{activeCount}</Text>
              <Text style={styles.statsDetailLabel}>In Progress</Text>
            </View>
            <View style={styles.statsDetailItem}>
              <Text style={styles.statsDetailValue}>{totalPending}</Text>
              <Text style={styles.statsDetailLabel}>Awaiting</Text>
            </View>
            <View style={styles.statsDetailItem}>
              <Text style={styles.statsDetailValue}>{categories.length}</Text>
              <Text style={styles.statsDetailLabel}>Categories</Text>
            </View>
          </View>
        </View>

        {/* Notification Settings */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="notifications" size={20} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Daily Practice Reminder</Text>
                <Text style={styles.settingDesc}>Get reminded to log your rituals</Text>
              </View>
            </View>
            <Switch
              value={settings.dailyReminder}
              onValueChange={v => updateSetting('dailyReminder', v)}
              trackColor={{ false: theme.surfaceLight, true: theme.primary + '50' }}
              thumbColor={settings.dailyReminder ? theme.primary : theme.textMuted}
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="event-available" size={20} color={theme.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Ritual Reminders</Text>
                <Text style={styles.settingDesc}>3-day and day-of scheduled ritual alerts</Text>
              </View>
            </View>
            <Switch
              value={settings.ritualReminders}
              onValueChange={async (v) => {
                if (v) {
                  const { status } = await Notifications.getPermissionsAsync();
                  if (status !== 'granted') {
                    const { status: newStatus } = await Notifications.requestPermissionsAsync();
                    if (newStatus !== 'granted') return;
                  }
                }
                updateSetting('ritualReminders', v);
              }}
              trackColor={{ false: theme.surfaceLight, true: theme.success + '50' }}
              thumbColor={settings.ritualReminders ? theme.success : theme.textMuted}
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="nightlight-round" size={20} color={theme.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Moon Phase Alerts</Text>
                <Text style={styles.settingDesc}>Notify on significant moon phases</Text>
              </View>
            </View>
            <Switch
              value={settings.moonAlerts}
              onValueChange={v => updateSetting('moonAlerts', v)}
              trackColor={{ false: theme.surfaceLight, true: theme.accent + '50' }}
              thumbColor={settings.moonAlerts ? theme.accent : theme.textMuted}
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="brightness-7" size={20} color={'#F59E0B'} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Planetary Hour Alerts</Text>
                <Text style={styles.settingDesc}>Alert when a favorable hour begins</Text>
              </View>
            </View>
            <Switch
              value={settings.planetaryHourAlerts}
              onValueChange={v => updateSetting('planetaryHourAlerts', v)}
              trackColor={{ false: theme.surfaceLight, true: '#F59E0B50' }}
              thumbColor={settings.planetaryHourAlerts ? '#F59E0B' : theme.textMuted}
            />
          </View>
        </View>

        {/* App Preferences */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="vibration" size={20} color={theme.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Haptic Feedback</Text>
                <Text style={styles.settingDesc}>Vibration on actions</Text>
              </View>
            </View>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={v => updateSetting('hapticFeedback', v)}
              trackColor={{ false: theme.surfaceLight, true: theme.primary + '50' }}
              thumbColor={settings.hapticFeedback ? theme.primary : theme.textMuted}
            />
          </View>

          <View style={styles.settingDivider} />

          <Pressable style={styles.settingRow} onPress={() => router.push('/core-practice-settings')}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="auto-awesome" size={20} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Core Practice</Text>
                <Text style={styles.settingDesc}>{coreCategories.length} categories tracking monthly</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.textMuted} />
          </Pressable>

          <View style={styles.settingDivider} />

          <Pressable style={styles.settingRow} onPress={() => router.push('/manage-categories')}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="tune" size={20} color={theme.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Manage Categories</Text>
                <Text style={styles.settingDesc}>Add or remove practice categories</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.textMuted} />
          </Pressable>

          <View style={styles.settingDivider} />

          <Pressable style={styles.settingRow} onPress={() => router.push('/spell-research')}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="science" size={20} color={theme.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Spell Research List</Text>
                <Text style={styles.settingDesc}>Spells to explore and add to your grimoire</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.textMuted} />
          </Pressable>
        </View>

        {/* Data Management */}
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.settingsCard}>
          <Pressable style={styles.settingRow} onPress={handleClearData}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="delete-sweep" size={20} color={theme.error} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: theme.error }]}>Clear All Practice Data</Text>
                <Text style={styles.settingDesc}>Remove all rituals, manifestations, and journal entries</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.error + '60'} />
          </Pressable>
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="auto-awesome" size={20} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Grimoire</Text>
                <Text style={styles.settingDesc}>Your Witchcraft Practice Companion</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '500' }}>v1.0</Text>
          </View>
        </View>
      </ScrollView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: theme.textPrimary },


  // Profile Card
  profileCard: { backgroundColor: theme.surface, borderRadius: theme.radius.lg, padding: 24, marginTop: 16, alignItems: 'center', ...theme.shadows.card },
  avatarContainer: { marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.primary + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.primary + '50' },
  avatarText: { fontSize: 28, fontWeight: '700', color: theme.primary },
  craftName: { fontSize: 22, fontWeight: '700', color: theme.textPrimary, marginBottom: 4, textAlign: 'center', fontFamily: theme.fonts.serif },
  tradition: { fontSize: 13, fontWeight: '600', color: theme.accent, marginBottom: 4 },
  practicing: { fontSize: 13, color: theme.textSecondary, marginBottom: 8, fontWeight: '500' },
  bio: { fontSize: 14, color: theme.textSecondary, lineHeight: 20, textAlign: 'center', marginBottom: 12, paddingHorizontal: 8, fontFamily: theme.fonts.serif, fontStyle: 'italic' as const },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.primary + '40', marginTop: 8 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: theme.primary },

  // Edit Section
  editSection: { width: '100%', gap: 4 },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, marginBottom: 6 },
  fieldInput: { backgroundColor: theme.surfaceLight, borderRadius: theme.radius.sm, padding: 12, fontSize: 15, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border },
  editButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  saveProfileBtn: { flex: 1, paddingVertical: 12, borderRadius: theme.radius.md, backgroundColor: theme.primary, alignItems: 'center' },
  saveProfileBtnText: { fontSize: 14, fontWeight: '600', color: theme.background },

  // Section
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginTop: 28, marginBottom: 12 },


  // Stats Card
  statsCard: { backgroundColor: theme.surface, borderRadius: theme.radius.lg, padding: 20, ...theme.shadows.card },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statsDivider: { height: 1, backgroundColor: theme.border, marginVertical: 16 },
  statsDetailRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statsDetailItem: { alignItems: 'center' },
  statsDetailValue: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: 2 },
  statsDetailLabel: { fontSize: 10, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5 },

  // Settings Card
  settingsCard: { backgroundColor: theme.surface, borderRadius: theme.radius.lg, ...theme.shadows.card, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: theme.textPrimary },
  settingDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2, fontWeight: '500' },
  settingDivider: { height: 1, backgroundColor: theme.border, marginHorizontal: 16 },
});
