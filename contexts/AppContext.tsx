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

const DEFAULT_JOURNAL_TYPES: JournalEntryType[] = [
  { id: 'reflection', label: 'Reflection', icon: '\u{1F4D6}' },
  { id: 'dream', label: 'Dream', icon: '\u{1F319}' },
  { id: 'encounter', label: 'Encounter', icon: '\u{1F441}\uFE0F' },
  { id: 'insight', label: 'Insight', icon: '\u{1F4A1}' },
  
];

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
  addJournalEntry: (ritualId: string, entry: Omit<JournalEntry, 'id'>) => void;
  addManifestationResult: (ritualId: string, note: string, date: string, type: 'sign' | 'manifested') => void;
  getManifestations: () => ManifestationRecord[];
  addCategory: (category: PracticeCategory, color: string) => void;
  deleteCategory: (categoryId: string) => void;
  addStandaloneEntry: (entry: Omit<StandaloneJournalEntry, 'id'>) => void;
  deleteStandaloneEntry: (id: string) => void;
  updateStatus: (ritualId: string, status: 'scheduled' | 'approaching' | 'completed' | 'overdue' | 'dismissed') => void;
  addLibraryRitual: (ritual: Omit<LibraryRitual, 'id' | 'createdAt' | 'timesPerformed'>) => string;
  updateLibraryRitual: (id: string, updates: Partial<LibraryRitual>) => void;
  deleteLibraryRitual: (id: string) => void;
  addToPractice: (libraryId: string, overrides?: { scheduledDate?: string; schedule?: LibraryRitual['schedule']; consecutiveDays?: number }) => void;
  journalEntryTypes: JournalEntryType[];
  addJournalEntryType: (type: JournalEntryType) => void;
  deleteJournalEntryType: (id: string) => void;
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

  const addRitual = (ritual: Omit<Ritual, 'id' | 'createdAt' | 'timesPerformed' | 'journal'> & { status?: Ritual['status'] }) => {
    const id = Date.now().toString();
    const seriesId = 'series_' + id;
    const shouldPropagate = ['daily', 'weekly', 'monthly'].includes(ritual.schedule);

    const numConsecutive = ritual.consecutiveDays || 1;
    const groupId = numConsecutive > 1 ? 'group_' + id : undefined;

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
      const newRitual: Ritual = {
        ...ritual,
        id,
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
        status: 'pending',
        results: [],
        createdAt: new Date().toISOString(),
      };
      setManifestations(prev => [newManif, ...prev]);
    }
  };

  const updateRitual = (id: string, updates: Partial<Ritual>) => {
    setRituals(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
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

  const addJournalEntry = (ritualId: string, entry: Omit<JournalEntry, 'id'>) => {
    const newEntry: JournalEntry = { ...entry, id: Date.now().toString() };
    setRituals(prev => prev.map(r => {
      if (r.id !== ritualId) return r;
      // Use the entry date (which may be backdated) for lastPerformed
      // Only update lastPerformed if this entry is newer than current
      const entryTime = new Date(entry.date).getTime();
      const currentLastPerformed = r.lastPerformed ? new Date(r.lastPerformed).getTime() : 0;
      const newLastPerformed = entryTime > currentLastPerformed ? entry.date : r.lastPerformed || entry.date;
      return {
        ...r,
        journal: [newEntry, ...r.journal],
        lastPerformed: newLastPerformed,
        timesPerformed: r.timesPerformed + 1,
        status: 'completed' as const,
      };
    }));
  };

  const addManifestationResult = (ritualId: string, note: string, date: string, type: 'sign' | 'manifested') => {
    const newResult: ManifestationResult = {
      id: 'mr_' + Date.now().toString(),
      note,
      date,
      type,
    };
    setManifestations(prev => prev.map(m => {
      if (m.ritualId !== ritualId) return m;
      const newStatus = type === 'manifested' ? 'manifested' : 'partial';
      return {
        ...m,
        results: [...m.results, newResult],
        status: newStatus as ManifestationRecord['status'],
      };
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
    const defaults = ['reflection', 'dream', 'encounter', 'insight', 'reminder'];
    if (defaults.includes(id)) return;
    setJournalEntryTypes(prev => prev.filter(t => t.id !== id));
  };

  const addToPractice = (libraryId: string, overrides?: { scheduledDate?: string; schedule?: LibraryRitual['schedule']; consecutiveDays?: number }) => {
    const libRitual = libraryRituals.find(r => r.id === libraryId);
    if (!libRitual) return;
    addRitual({
      name: libRitual.name,
      category: libRitual.category,
      description: libRitual.description,
      intention: libRitual.intention,
      tangibleOutcome: libRitual.tangibleOutcome,
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
    await AsyncStorage.multiRemove([STORAGE_KEY, MANIFESTATIONS_KEY, STANDALONE_KEY, NOTIF_IDS_KEY, LIBRARY_KEY, JOURNAL_TYPES_KEY]);
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  };

  return (
    <AppContext.Provider value={{
      rituals, libraryRituals, categories, categoryColors, manifestations, standaloneEntries, isLoaded,
      addRitual, updateRitual, deleteRitual, deleteFutureInSeries, deleteEntireSeries, stopSchedule,
      addJournalEntry, addManifestationResult, getManifestations,
      addCategory, deleteCategory,
      addStandaloneEntry, deleteStandaloneEntry, updateStatus,
      addLibraryRitual, updateLibraryRitual, deleteLibraryRitual, addToPractice,
      journalEntryTypes, addJournalEntryType, deleteJournalEntryType, clearAllData,
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
