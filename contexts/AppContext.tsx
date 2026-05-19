import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Ritual, JournalEntry, ManifestationRecord, ManifestationResult, StandaloneJournalEntry, LibraryRitual } from '../services/mockData';
import { PracticeCategory, DEFAULT_CATEGORIES, DEFAULT_CATEGORY_COLORS } from '../constants/config';

export interface JournalEntryType {
  id: string;
  label: string;
  icon: string;
}

const DEFAULT_MOODS = ['Connected', 'Peaceful', 'Grateful', 'Reflective', 'Contemplative', 'Hopeful', 'Empowered', 'Joyful', 'Grounded', 'Centered', 'Elevated', 'Determined', 'Radiant', 'Mystified', 'Aware'];
const MOODS_KEY = 'grimoire_moods';
const CORE_CATEGORIES_KEY = 'grimoire_core_categories';

const DEFAULT_JOURNAL_TYPES: JournalEntryType[] = [
  { id: 'reflection', label: 'Reflection', icon: '\u{1F4D6}' },
  { id: 'dream', label: 'Dream', icon: '\u{1F319}' },
  { id: 'encounter', label: 'Encounter', icon: '\u{1F441}\uFE0F' },
  { id: 'insight', label: 'Insight', icon: '\u{1F4A1}' },
  
];

export interface MonthlySnapshot {
  month: string;
  label: string;
  intention: string;
  ritualIntention: string;
  intentionSet: boolean;
  coreCategoryResults: {
    categoryId: string;
    categoryName: string;
    completed: boolean;
    ritualsCompleted: number;
    ritualsScheduled: number;
  }[];
  totalScheduled: number;
  totalCompleted: number;
  totalMissed: number;
  completionRate: number;
  missedRituals: { id: string; name: string; scheduledDate: string; category: string; }[];
  completedRituals: { id: string; name: string; category: string; completedDate: string; }[];
  monthlyStreakCount: number;
  createdAt: string;
}

interface AppContextType {
  rituals: Ritual[];
  libraryRituals: LibraryRitual[];
  categories: PracticeCategory[];
  categoryColors: Record<string, string>;
  manifestations: ManifestationRecord[];
  standaloneEntries: StandaloneJournalEntry[];
  isLoaded: boolean;
  addRitual: (ritual: Omit<Ritual, 'id' | 'createdAt' | 'timesPerformed' | 'journal'> & { status?: Ritual['status'] }) => void;
  updateRitual: (id: string, updates: Partial<Ritual>) => void;
  deleteRitual: (id: string) => void;
  deleteFutureInSeries: (seriesId: string, fromDate: string) => void;
  deleteEntireSeries: (seriesId: string) => void;
  stopSchedule: (seriesId: string) => void;
  addJournalEntry: (ritualId: string, entry: Omit<JournalEntry, 'id'>, opts?: { markComplete?: boolean }) => void;
  updateJournalEntry: (ritualId: string, entryId: string, updates: Partial<JournalEntry>) => void;
  deleteJournalEntry: (ritualId: string, entryId: string) => void;
  updateStandaloneEntry: (id: string, updates: Partial<StandaloneJournalEntry>) => void;
  addManifestationResult: (ritualId: string, note: string, date: string, type: 'sign' | 'manifested', signType?: import('../services/mockData').SignType) => void;
  deleteManifestationResult: (manifestationId: string, resultId: string) => void;
  getManifestations: () => ManifestationRecord[];
  addCategory: (category: PracticeCategory, color: string) => void;
  deleteCategory: (categoryId: string) => void;
  addStandaloneEntry: (entry: Omit<StandaloneJournalEntry, 'id'>) => void;
  deleteStandaloneEntry: (id: string) => void;
  updateStatus: (ritualId: string, status: 'scheduled' | 'approaching' | 'completed' | 'overdue' | 'dismissed') => void;
  addLibraryRitual: (ritual: Omit<LibraryRitual, 'id' | 'createdAt' | 'timesPerformed'>) => string;
  updateLibraryRitual: (id: string, updates: Partial<LibraryRitual>) => void;
  deleteLibraryRitual: (id: string) => void;
  addToPractice: (libraryId: string, overrides?: { scheduledDate?: string; schedule?: LibraryRitual['schedule']; consecutiveDays?: number; tangibleOutcome?: string }) => void;
  journalEntryTypes: JournalEntryType[];
  addJournalEntryType: (type: JournalEntryType) => void;
  deleteJournalEntryType: (id: string) => void;
  moods: string[];
  addMood: (mood: string) => void;
  deleteMood: (mood: string) => void;
  coreCategories: string[];
  setCoreCategories: (ids: string[]) => void;
  monthlySnapshots: MonthlySnapshot[];
  currentMonthIntention: { intention: string; ritualIntention: string; intentionSet: boolean; month: string };
  setMonthlyIntention: (intention: string, ritualIntention: string) => void;
  monthlyStreak: number;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'grimoire_rituals';
const CATEGORIES_KEY = 'grimoire_categories';
const COLORS_KEY = 'grimoire_category_colors';
const MANIFESTATIONS_KEY = 'grimoire_manifestations';
const STANDALONE_KEY = 'grimoire_standalone_entries';
const NOTIF_IDS_KEY = 'grimoire_notification_ids';
const LIBRARY_KEY = 'grimoire_library';
const JOURNAL_TYPES_KEY = 'grimoire_journal_types';
const DATA_VERSION_KEY = 'grimoire_data_version';
const SNAPSHOTS_KEY = 'grimoire_monthly_snapshots';
const MONTHLY_INTENTION_KEY = 'grimoire_monthly_intention';

const CURRENT_DATA_VERSION = '4';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function getStoredNotifIds(): Promise<Record<string, string[]>> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_IDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function setStoredNotifIds(ids: Record<string, string[]>): Promise<void> {
  await AsyncStorage.setItem(NOTIF_IDS_KEY, JSON.stringify(ids));
}

async function cancelNotificationsForRitual(ritualId: string): Promise<void> {
  const stored = await getStoredNotifIds();
  const ids = stored[ritualId] || [];
  for (const nId of ids) {
    await Notifications.cancelScheduledNotificationAsync(nId).catch(() => {});
  }
  delete stored[ritualId];
  await setStoredNotifIds(stored);
}

async function scheduleRemindersForRitual(ritual: { id: string; name: string; scheduledDate?: string; status: string }): Promise<void> {
  if (Platform.OS === 'web') return;

  if (!ritual.scheduledDate || ritual.status === 'completed') {
    await cancelNotificationsForRitual(ritual.id);
    return;
  }

  await cancelNotificationsForRitual(ritual.id);

  const scheduledTime = new Date(ritual.scheduledDate);
  const now = new Date();
  const newIds: string[] = [];

  const threeDaysBefore = new Date(scheduledTime);
  threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
  threeDaysBefore.setHours(9, 0, 0, 0);

  if (threeDaysBefore > now) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Ritual Reminder',
          body: `\u{1F52E} ${ritual.name} is in 3 days \u2014 prepare your space`,
          data: { ritualId: ritual.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: threeDaysBefore },
      });
      newIds.push(id);
    } catch {}
  }

  const dayOf = new Date(scheduledTime);
  dayOf.setHours(9, 0, 0, 0);

  if (dayOf > now) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Ritual Today',
          body: `\u2728 Today is the day \u2014 ${ritual.name} is scheduled for today`,
          data: { ritualId: ritual.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dayOf },
      });
      newIds.push(id);
    } catch {}
  }

  if (newIds.length > 0) {
    const stored = await getStoredNotifIds();
    stored[ritual.id] = newIds;
    await setStoredNotifIds(stored);
  }
}

// Helper: generate propagation dates
function generatePropagationDates(schedule: string, startDate: Date): Date[] {
  const dates: Date[] = [];
  if (schedule === 'daily') {
    for (let i = 1; i <= 30; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
  } else if (schedule === 'weekly') {
    for (let i = 1; i <= 12; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i * 7);
      dates.push(d);
    }
  } else if (schedule === 'monthly') {
    for (let i = 1; i <= 12; i++) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + i);
      dates.push(d);
    }
  }
  return dates;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [categories, setCategories] = useState<PracticeCategory[]>(DEFAULT_CATEGORIES);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(DEFAULT_CATEGORY_COLORS);
  const [manifestations, setManifestations] = useState<ManifestationRecord[]>([]);
  const [standaloneEntries, setStandaloneEntries] = useState<StandaloneJournalEntry[]>([]);
  const [libraryRituals, setLibraryRituals] = useState<LibraryRitual[]>([]);
  const [journalEntryTypes, setJournalEntryTypes] = useState<JournalEntryType[]>(DEFAULT_JOURNAL_TYPES);
  const [moods, setMoods] = useState<string[]>(DEFAULT_MOODS);
  const [coreCategories, setCoreCategoriesState] = useState<string[]>([]);
  const [monthlySnapshots, setMonthlySnapshots] = useState<MonthlySnapshot[]>([]);
  const [currentMonthIntention, setCurrentMonthIntention] = useState({ intention: '', ritualIntention: '', intentionSet: false, month: '' });
  const [isLoaded, setIsLoaded] = useState(false);
  const hasRequestedPermissions = useRef(false);

  useEffect(() => {
    if (!hasRequestedPermissions.current) {
      hasRequestedPermissions.current = true;
      requestNotificationPermissions();
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const storedVersion = await AsyncStorage.getItem(DATA_VERSION_KEY);

        if (storedVersion !== CURRENT_DATA_VERSION) {
          await AsyncStorage.multiRemove([
            STORAGE_KEY, MANIFESTATIONS_KEY, STANDALONE_KEY, NOTIF_IDS_KEY,
          ]);
          await AsyncStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
          const [catData, colorData] = await Promise.all([
            AsyncStorage.getItem(CATEGORIES_KEY),
            AsyncStorage.getItem(COLORS_KEY),
          ]);
          if (catData) { try { setCategories(JSON.parse(catData)); } catch {} }
          if (colorData) { try { setCategoryColors(JSON.parse(colorData)); } catch {} }
          setIsLoaded(true);
          return;
        }

        const [ritualData, catData, colorData, manifData, standaloneData, libraryData] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(CATEGORIES_KEY),
          AsyncStorage.getItem(COLORS_KEY),
          AsyncStorage.getItem(MANIFESTATIONS_KEY),
          AsyncStorage.getItem(STANDALONE_KEY),
          AsyncStorage.getItem(LIBRARY_KEY),
        ]);
        if (ritualData) { try { setRituals(JSON.parse(ritualData)); } catch {} }
        if (catData) { try { setCategories(JSON.parse(catData)); } catch {} }
        if (colorData) { try { setCategoryColors(JSON.parse(colorData)); } catch {} }
        if (manifData) { try { setManifestations(JSON.parse(manifData)); } catch {} }
        if (standaloneData) { try { setStandaloneEntries(JSON.parse(standaloneData)); } catch {} }
        if (libraryData) { try { setLibraryRituals(JSON.parse(libraryData)); } catch {} }
        const journalTypesData = await AsyncStorage.getItem(JOURNAL_TYPES_KEY);
        if (journalTypesData) { try { setJournalEntryTypes(JSON.parse(journalTypesData)); } catch {} }
        const moodsData = await AsyncStorage.getItem(MOODS_KEY);
        if (moodsData) { try { setMoods(JSON.parse(moodsData)); } catch {} }

        // Load core categories
        const loadedCats: PracticeCategory[] = catData ? JSON.parse(catData) : DEFAULT_CATEGORIES;
        const coreCatData = await AsyncStorage.getItem(CORE_CATEGORIES_KEY);
        if (coreCatData) {
          try { setCoreCategoriesState(JSON.parse(coreCatData)); } catch {}
        } else {
          const coreNames = ['money work', 'glamour', 'unblocking', 'protection'];
          const defaults = loadedCats
            .filter(c => coreNames.some(n => c.name.toLowerCase().includes(n)))
            .map(c => c.id)
            .slice(0, 4);
          if (defaults.length < 4 && loadedCats.length > 0) {
            const remaining = loadedCats
              .filter(c => !defaults.includes(c.id))
              .map(c => c.id)
              .slice(0, 4 - defaults.length);
            defaults.push(...remaining);
          }
          setCoreCategoriesState(defaults);
        }

        // Load monthly snapshots
        const snapshotData = await AsyncStorage.getItem(SNAPSHOTS_KEY);
        if (snapshotData) { try { setMonthlySnapshots(JSON.parse(snapshotData)); } catch {} }
        const intentionData = await AsyncStorage.getItem(MONTHLY_INTENTION_KEY);
        if (intentionData) { try { setCurrentMonthIntention(JSON.parse(intentionData)); } catch {} }
      } catch {}
      setIsLoaded(true);
    })();
  }, []);

  const scheduleAllReminders = useCallback(async () => {
    for (const r of rituals) {
      await scheduleRemindersForRitual(r);
    }
  }, [rituals]);

  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rituals));
      scheduleAllReminders();
    }
  }, [rituals, isLoaded]);
  useEffect(() => { if (isLoaded) AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories)); }, [categories, isLoaded]);
  useEffect(() => { if (isLoaded) AsyncStorage.setItem(COLORS_KEY, JSON.stringify(categoryColors)); }, [categoryColors, isLoaded]);
  useEffect(() => { if (isLoaded) AsyncStorage.setItem(MANIFESTATIONS_KEY, JSON.stringify(manifestations)); }, [manifestations, isLoaded]);
  useEffect(() => { if (isLoaded) AsyncStorage.setItem(STANDALONE_KEY, JSON.stringify(standaloneEntries)); }, [standaloneEntries, isLoaded]);
  useEffect(() => { if (isLoaded) AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(libraryRituals)); }, [libraryRituals, isLoaded]);
  useEffect(() => { if (isLoaded) AsyncStorage.setItem(JOURNAL_TYPES_KEY, JSON.stringify(journalEntryTypes)); }, [journalEntryTypes, isLoaded]);
  useEffect(() => { if (isLoaded) AsyncStorage.setItem(MOODS_KEY, JSON.stringify(moods)); }, [moods, isLoaded]);
  useEffect(() => { if (isLoaded) AsyncStorage.setItem(CORE_CATEGORIES_KEY, JSON.stringify(coreCategories)); }, [coreCategories, isLoaded]);
  useEffect(() => { if (isLoaded) AsyncStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(monthlySnapshots)); }, [monthlySnapshots, isLoaded]);
  useEffect(() => { if (isLoaded) AsyncStorage.setItem(MONTHLY_INTENTION_KEY, JSON.stringify(currentMonthIntention)); }, [currentMonthIntention, isLoaded]);

  const addRitual = (ritual: Omit<Ritual, 'id' | 'createdAt' | 'timesPerformed' | 'journal'> & { status?: Ritual['status'] }) => {
    const id = Date.now().toString();
    const seriesId = 'series_' + id;
    const shouldPropagate = ['daily', 'weekly', 'monthly'].includes(ritual.schedule);

    const numConsecutive = ritual.consecutiveDays || 1;
    const groupId = numConsecutive > 1 ? 'group_' + id : undefined;

    // --- Auto-link or auto-create library ritual ---
    let resolvedLibraryId = ritual.libraryId;
    if (!resolvedLibraryId) {
      const alreadyInLibrary = libraryRituals.find(
        r => r.name.toLowerCase().trim() === ritual.name.toLowerCase().trim()
      );
      if (alreadyInLibrary) {
        resolvedLibraryId = alreadyInLibrary.id;
      } else {
        const libId = 'lib_' + Date.now().toString();
        const newLibRitual: LibraryRitual = {
          id: libId,
          name: ritual.name,
          category: ritual.category,
          description: ritual.description || '',
          intention: ritual.intention || '',
          tangibleOutcome: ritual.tangibleOutcome || '',
          ingredients: ritual.ingredients,
          schedule: ritual.schedule,
          scheduleDetail: ritual.scheduleDetail,
          createdAt: new Date().toISOString(),
          timesPerformed: 0,
        };
        setLibraryRituals(prev => [newLibRitual, ...prev]);
        resolvedLibraryId = libId;
      }
    }

    // --- Consecutive days mode: create a group of entries ---
    if (numConsecutive > 1 && ritual.scheduledDate) {
      const baseDate = new Date(ritual.scheduledDate);
      const groupRituals: Ritual[] = [];

      for (let i = 0; i < numConsecutive; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i);
        groupRituals.push({
          ...ritual,
          id: i === 0 ? id : id + '_g' + (i + 1),
          name: `${ritual.name} \u2014 Day ${i + 1} of ${numConsecutive}`,
          groupId,
          consecutiveDays: numConsecutive,
          libraryId: resolvedLibraryId,
          createdAt: new Date().toISOString(),
          timesPerformed: 0,
          journal: [],
          status: 'scheduled',
          scheduledDate: d.toISOString(),
        });
      }
      setRituals(prev => [...groupRituals, ...prev]);
    } else {
      // --- Normal mode (single or schedule-propagated) ---
      let newRitual: Ritual = {
        ...ritual,
        id,
        libraryId: resolvedLibraryId,
        createdAt: new Date().toISOString(),
        timesPerformed: 0,
        journal: [],
        status: ritual.status || 'scheduled',
        seriesId: shouldPropagate ? seriesId : undefined,
      };

      if (shouldPropagate && ritual.scheduledDate) {
        const baseDate = new Date(ritual.scheduledDate);
        const futureDates = generatePropagationDates(ritual.schedule, baseDate);
        const propagatedRituals: Ritual[] = [newRitual];

        for (let i = 0; i < futureDates.length; i++) {
          propagatedRituals.push({
            ...ritual,
            id: id + '_p' + (i + 1),
            seriesId,
            libraryId: resolvedLibraryId,
            createdAt: new Date().toISOString(),
            timesPerformed: 0,
            journal: [],
            status: 'scheduled',
            scheduledDate: futureDates[i].toISOString(),
          });
        }
        setRituals(prev => [...propagatedRituals, ...prev]);
      } else {
        setRituals(prev => [newRitual, ...prev]);
      }
    }

    // Create manifestation only when tangibleOutcome is non-empty
    const manifSource = (ritual.tangibleOutcome && ritual.tangibleOutcome.trim().length > 0)
      ? ritual.tangibleOutcome.trim()
      : '';
    if (manifSource.length > 0) {
      const newManif: ManifestationRecord = {
        id: 'mf_' + id,
        ritualId: id,
        ritualName: ritual.name,
        intention: manifSource,
        category: ritual.category,
        status: 'brewing',
        results: [],
        createdAt: new Date().toISOString(),
      };
      setManifestations(prev => [newManif, ...prev]);
    }
  };

  const updateRitual = (id: string, updates: Partial<Ritual>) => {
    setRituals(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    if (updates.name) {
      setManifestations(prev => prev.map(m => m.ritualId === id ? { ...m, ritualName: updates.name! } : m));
    }
  };

  const deleteRitual = (id: string) => {
    cancelNotificationsForRitual(id);
    setRituals(prev => prev.filter(r => r.id !== id));
    setManifestations(prev => prev.filter(m => m.ritualId !== id));
  };

  // Delete all future (unperformed) rituals in a series from a given date onward
  const deleteFutureInSeries = (seriesId: string, fromDate: string) => {
    const fromTime = new Date(fromDate).getTime();
    setRituals(prev => {
      const toDelete = prev.filter(r =>
        r.seriesId === seriesId &&
        r.status !== 'completed' &&
        r.scheduledDate &&
        new Date(r.scheduledDate).getTime() >= fromTime
      );
      toDelete.forEach(r => cancelNotificationsForRitual(r.id));
      return prev.filter(r => !toDelete.some(d => d.id === r.id));
    });
  };

  // Delete every ritual in a series (keeps completed data via journal entries already logged)
  const deleteEntireSeries = (seriesId: string) => {
    setRituals(prev => {
      const toDelete = prev.filter(r => r.seriesId === seriesId);
      toDelete.forEach(r => cancelNotificationsForRitual(r.id));
      return prev.filter(r => r.seriesId !== seriesId);
    });
    // Also clean up manifestations linked to any ritual in the series
    setManifestations(prev => {
      const seriesRitualIds = rituals.filter(r => r.seriesId === seriesId).map(r => r.id);
      return prev.filter(m => !seriesRitualIds.includes(m.ritualId));
    });
  };

  // Stop a recurring schedule: delete all future unperformed rituals but keep completed/logged ones
  const stopSchedule = (seriesId: string) => {
    const now = new Date();
    setRituals(prev => {
      const toDelete = prev.filter(r =>
        r.seriesId === seriesId &&
        r.status !== 'completed' &&
        r.scheduledDate &&
        new Date(r.scheduledDate).getTime() > now.getTime()
      );
      toDelete.forEach(r => cancelNotificationsForRitual(r.id));
      // Keep completed and past rituals, remove only unperformed future ones
      return prev.filter(r => !toDelete.some(d => d.id === r.id));
    });
  };

  const addJournalEntry = (ritualId: string, entry: Omit<JournalEntry, 'id'>, opts?: { markComplete?: boolean }) => {
    const markComplete = opts?.markComplete !== false;
    const newEntry: JournalEntry = { ...entry, id: Date.now().toString() };
    setRituals(prev => prev.map(r => {
      if (r.id !== ritualId) return r;
      const entryTime = new Date(entry.date).getTime();
      const currentLastPerformed = r.lastPerformed ? new Date(r.lastPerformed).getTime() : 0;
      const newLastPerformed = entryTime > currentLastPerformed ? entry.date : r.lastPerformed || entry.date;
      if (markComplete) {
        return {
          ...r,
          journal: [newEntry, ...r.journal],
          lastPerformed: newLastPerformed,
          timesPerformed: r.timesPerformed + 1,
          status: 'completed' as const,
        };
      }
      return { ...r, journal: [newEntry, ...r.journal] };
    }));
  };

  const updateJournalEntry = (ritualId: string, entryId: string, updates: Partial<JournalEntry>) => {
    setRituals(prev => prev.map(r => {
      if (r.id !== ritualId) return r;
      return { ...r, journal: r.journal.map(e => e.id === entryId ? { ...e, ...updates } : e) };
    }));
  };

  const deleteJournalEntry = (ritualId: string, entryId: string) => {
    setRituals(prev => prev.map(r => {
      if (r.id !== ritualId) return r;
      return { ...r, journal: r.journal.filter(e => e.id !== entryId) };
    }));
  };

  const updateStandaloneEntry = (id: string, updates: Partial<StandaloneJournalEntry>) => {
    setStandaloneEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const addManifestationResult = (ritualId: string, note: string, date: string, type: 'sign' | 'manifested', signType?: import('../services/mockData').SignType) => {
    const newResult: ManifestationResult = {
      id: 'mr_' + Date.now().toString(),
      note,
      date,
      type,
      signType,
    };
    setManifestations(prev => prev.map(m => {
      if (m.ritualId !== ritualId) return m;
      const newStatus = type === 'manifested' ? 'spilled' : m.status === 'spilled' ? 'spilled' : 'stirring';
      return {
        ...m,
        results: [...m.results, newResult],
        status: newStatus as ManifestationRecord['status'],
      };
    }));
  };

  const deleteManifestationResult = (manifestationId: string, resultId: string) => {
    setManifestations(prev => prev.map(m => {
      if (m.id !== manifestationId) return m;
      const newResults = m.results.filter(r => r.id !== resultId);
      const newStatus: ManifestationRecord['status'] =
        newResults.some(r => r.type === 'manifested') ? 'spilled' :
        newResults.some(r => r.type === 'sign') ? 'stirring' : 'brewing';
      return { ...m, results: newResults, status: newStatus };
    }));
  };

  const getManifestations = () => manifestations;

  const addCategory = (category: PracticeCategory, color: string) => {
    setCategories(prev => [...prev, category]);
    setCategoryColors(prev => ({ ...prev, [category.id]: color }));
  };

  const deleteCategory = (categoryId: string) => {
    setCategories(prev => prev.filter(c => c.id !== categoryId));
    setCategoryColors(prev => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
  };

  const addStandaloneEntry = (entry: Omit<StandaloneJournalEntry, 'id'>) => {
    const newEntry: StandaloneJournalEntry = { ...entry, id: 'se_' + Date.now().toString() };
    setStandaloneEntries(prev => [newEntry, ...prev]);
  };

  const deleteStandaloneEntry = (id: string) => {
    setStandaloneEntries(prev => prev.filter(e => e.id !== id));
  };

  const addLibraryRitual = (ritual: Omit<LibraryRitual, 'id' | 'createdAt' | 'timesPerformed'>): string => {
    const id = 'lib_' + Date.now().toString();
    const newLibRitual: LibraryRitual = {
      ...ritual,
      id,
      createdAt: new Date().toISOString(),
      timesPerformed: 0,
    };
    setLibraryRituals(prev => [newLibRitual, ...prev]);
    return id;
  };

  const updateLibraryRitual = (id: string, updates: Partial<LibraryRitual>) => {
    setLibraryRituals(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteLibraryRitual = (id: string) => {
    setLibraryRituals(prev => prev.filter(r => r.id !== id));
  };

  const addJournalEntryType = (type: JournalEntryType) => {
    setJournalEntryTypes(prev => [...prev, type]);
  };

  const deleteJournalEntryType = (id: string) => {
    setJournalEntryTypes(prev => prev.filter(t => t.id !== id));
  };

  const addMood = (mood: string) => {
    const trimmed = mood.trim();
    if (!trimmed || moods.includes(trimmed)) return;
    setMoods(prev => [...prev, trimmed]);
  };

  const deleteMood = (mood: string) => {
    setMoods(prev => prev.filter(m => m !== mood));
  };

  const updateCoreCategories = (ids: string[]) => {
    const valid = ids.slice(0, 6);
    if (valid.length === 0) return;
    setCoreCategoriesState(valid);
  };

  const setMonthlyIntention = (intention: string, ritualIntention: string) => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonthIntention({ intention, ritualIntention, intentionSet: true, month });
  };

  const createMonthlySnapshot = useCallback((year: number, month: number) => {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const alreadyArchived = monthlySnapshots.some(s => s.month === monthStr);
    if (alreadyArchived) return;

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

    const monthRituals = rituals.filter(r => {
      if (!r.scheduledDate) return false;
      const d = new Date(r.scheduledDate);
      return d >= monthStart && d <= monthEnd;
    });

    const completed = monthRituals.filter(r => r.status === 'completed');
    const missed = monthRituals.filter(r => r.status !== 'completed' && r.status !== 'dismissed');

    const coreCategoryResults = coreCategories.map(catId => {
      const cat = categories.find(c => c.id === catId);
      const catRituals = monthRituals.filter(r => r.category === catId);
      const catCompleted = catRituals.filter(r => r.status === 'completed');
      return {
        categoryId: catId,
        categoryName: cat?.name || catId,
        completed: catCompleted.length > 0,
        ritualsCompleted: catCompleted.length,
        ritualsScheduled: catRituals.length,
      };
    });

    const prevSnapshots = monthlySnapshots.filter(s => s.month < monthStr);
    const streak = prevSnapshots.length > 0
      ? prevSnapshots.reduce((count, s) => {
          if (s.coreCategoryResults.every(c => c.completed)) return count + 1;
          return 0;
        }, 0)
      : 0;

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const snapshot: MonthlySnapshot = {
      month: monthStr,
      label: `${monthNames[month]} ${year}`,
      intention: currentMonthIntention.month === monthStr ? currentMonthIntention.intention : '',
      ritualIntention: currentMonthIntention.month === monthStr ? currentMonthIntention.ritualIntention : '',
      intentionSet: currentMonthIntention.month === monthStr ? currentMonthIntention.intentionSet : false,
      coreCategoryResults,
      totalScheduled: monthRituals.length,
      totalCompleted: completed.length,
      totalMissed: missed.length,
      completionRate: monthRituals.length > 0 ? Math.round((completed.length / monthRituals.length) * 100) : 0,
      missedRituals: missed.map(r => ({ id: r.id, name: r.name, scheduledDate: r.scheduledDate || '', category: r.category })),
      completedRituals: completed.map(r => ({ id: r.id, name: r.name, category: r.category, completedDate: r.lastPerformed || r.scheduledDate || '' })),
      monthlyStreakCount: streak,
      createdAt: new Date().toISOString(),
    };

    setMonthlySnapshots(prev => [snapshot, ...prev]);
  }, [rituals, categories, coreCategories, monthlySnapshots, currentMonthIntention]);

  useEffect(() => {
    if (!isLoaded) return;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonthStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
    const alreadyArchived = monthlySnapshots.some(s => s.month === prevMonthStr);
    if (!alreadyArchived && rituals.length > 0) {
      createMonthlySnapshot(prevYear, prevMonth);
    }
  }, [isLoaded]);

  const monthlyStreak = monthlySnapshots.filter(s =>
    s.coreCategoryResults.every(c => c.completed)
  ).length;

  const addToPractice = (libraryId: string, overrides?: { scheduledDate?: string; schedule?: LibraryRitual['schedule']; consecutiveDays?: number; tangibleOutcome?: string }) => {
    const libRitual = libraryRituals.find(r => r.id === libraryId);
    if (!libRitual) return;
    addRitual({
      name: libRitual.name,
      category: libRitual.category,
      description: libRitual.description,
      intention: libRitual.intention,
      tangibleOutcome: overrides?.tangibleOutcome ?? libRitual.tangibleOutcome,
      ingredients: libRitual.ingredients,
      schedule: overrides?.schedule || libRitual.schedule,
      scheduleDetail: libRitual.scheduleDetail,
      scheduledDate: overrides?.scheduledDate,
      consecutiveDays: overrides?.consecutiveDays,
      libraryId,
      status: 'scheduled',
    });
    // Increment timesPerformed on the library source
    setLibraryRituals(prev => prev.map(r => r.id === libraryId ? { ...r, timesPerformed: r.timesPerformed + 1 } : r));
  };

  const updateStatus = (ritualId: string, status: 'scheduled' | 'approaching' | 'completed' | 'overdue' | 'dismissed') => {
    setRituals(prev => prev.map(r => r.id === ritualId ? { ...r, status } : r));
  };

  const clearAllData = async () => {
    setRituals([]);
    setManifestations([]);
    setStandaloneEntries([]);
    setLibraryRituals([]);
    setJournalEntryTypes(DEFAULT_JOURNAL_TYPES);
    setMoods(DEFAULT_MOODS);
    setCoreCategoriesState([]);
    setMonthlySnapshots([]);
    setCurrentMonthIntention({ intention: '', ritualIntention: '', intentionSet: false, month: '' });
    await AsyncStorage.multiRemove([STORAGE_KEY, MANIFESTATIONS_KEY, STANDALONE_KEY, NOTIF_IDS_KEY, LIBRARY_KEY, JOURNAL_TYPES_KEY, MOODS_KEY, CORE_CATEGORIES_KEY, SNAPSHOTS_KEY, MONTHLY_INTENTION_KEY, 'grimoire_spell_research']);
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  };

  return (
    <AppContext.Provider value={{
      rituals, libraryRituals, categories, categoryColors, manifestations, standaloneEntries, isLoaded,
      addRitual, updateRitual, deleteRitual, deleteFutureInSeries, deleteEntireSeries, stopSchedule,
      addJournalEntry, updateJournalEntry, deleteJournalEntry, updateStandaloneEntry,
      addManifestationResult, deleteManifestationResult, getManifestations,
      addCategory, deleteCategory,
      addStandaloneEntry, deleteStandaloneEntry, updateStatus,
      addLibraryRitual, updateLibraryRitual, deleteLibraryRitual, addToPractice,
      journalEntryTypes, addJournalEntryType, deleteJournalEntryType,
      moods, addMood, deleteMood,
      coreCategories, setCoreCategories: updateCoreCategories,
      monthlySnapshots, currentMonthIntention, setMonthlyIntention, monthlyStreak,
      clearAllData,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
