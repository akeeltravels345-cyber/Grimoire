export type SignType = 'dream' | 'omen' | 'encounter' | 'symbol' | 'number' | 'synchronicity';

export interface ManifestationResult {
  id: string;
  note: string;
  date: string;
  type: 'sign' | 'manifested';
  signType?: SignType;
}

export interface ManifestationRecord {
  id: string;
  ritualId: string;
  ritualName: string;
  intention: string;
  category: string;
  status: 'brewing' | 'stirring' | 'spilled';
  results: ManifestationResult[];
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  notes: string;
  mood: string;
  results?: string;
  cosmicContext?: string;
}

// Standalone journal entry (not tied to a ritual)
export interface StandaloneJournalEntry {
  id: string;
  date: string;
  title: string;
  notes: string;
  mood?: string;
  tags: string[];
  type: string; // Dynamic — managed via journalEntryTypes in AppContext
}

export interface LibraryRitual {
  id: string;
  name: string;
  category: string;
  description: string;
  intention: string;
  tangibleOutcome: string;
  ingredients?: string[];
  schedule: 'daily' | 'weekly' | 'moon_phase' | 'as_needed' | 'monthly';
  scheduleDetail?: string;
  createdAt: string;
  timesPerformed: number;
}

export interface Ritual {
  id: string;
  name: string;
  category: string;
  description: string;
  intention: string;
  tangibleOutcome: string;
  ingredients?: string[];
  schedule: 'daily' | 'weekly' | 'moon_phase' | 'as_needed' | 'monthly';
  scheduleDetail?: string;
  scheduledDate?: string; // ISO date for when it is next scheduled
  status: 'scheduled' | 'approaching' | 'completed' | 'overdue' | 'dismissed';
  createdAt: string;
  lastPerformed?: string;
  timesPerformed: number;
  journal: JournalEntry[];
  seriesId?: string; // Links propagated rituals together as a series
  consecutiveDays?: number; // Number of consecutive days this ritual spans
  groupId?: string; // Links consecutive-day ritual entries together
  libraryId?: string; // Links this practice instance back to its Library source
}

// --- Helper Functions ---

export function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((targetDay.getTime() - todayDay.getTime()) / (1000 * 60 * 60 * 24));
}

export function getComputedStatus(ritual: Ritual): 'scheduled' | 'approaching' | 'completed' | 'overdue' {
  if (ritual.status === 'completed') return 'completed';
  if (ritual.status === 'dismissed') return 'scheduled';
  // As-needed rituals without a scheduled date are always 'scheduled'
  if (ritual.schedule === 'as_needed' && !ritual.scheduledDate) return 'scheduled';
  if (ritual.scheduledDate) {
    const days = getDaysUntil(ritual.scheduledDate);
    if (days < 0) return 'overdue';
    if (days <= 3) return 'approaching';
  }
  return 'scheduled';
}

/**
 * Deduplicates rituals by logical group (seriesId > groupId > id)
 * and returns unique counts per computed status.
 */
export function getUniqueRitualCounts(rituals: Ritual[]): { scheduled: number; approaching: number; completed: number; overdue: number; total: number } {
  // Group rituals by their logical identity
  const groups = new Map<string, Ritual[]>();
  rituals.forEach(r => {
    const key = r.seriesId || r.groupId || r.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  });

  const counts = { scheduled: 0, approaching: 0, completed: 0, overdue: 0, total: 0 };

  groups.forEach(group => {
    counts.total++;
    // Determine aggregate status: worst uncompleted status wins
    // Priority: overdue > approaching > scheduled > completed (all must be completed)
    let hasOverdue = false;
    let hasApproaching = false;
    let hasScheduled = false;
    let allCompleted = true;

    group.forEach(r => {
      const s = getComputedStatus(r);
      if (s !== 'completed') allCompleted = false;
      if (s === 'overdue') hasOverdue = true;
      if (s === 'approaching') hasApproaching = true;
      if (s === 'scheduled') hasScheduled = true;
    });

    if (allCompleted) counts.completed++;
    else if (hasOverdue) counts.overdue++;
    else if (hasApproaching) counts.approaching++;
    else counts.scheduled++;
  });

  return counts;
}

export function getRecentActivity(rituals: Ritual[]) {
  const entries: (JournalEntry & { ritualName: string; ritualId: string; category: string })[] = [];
  rituals.forEach(r => {
    r.journal.forEach(j => {
      entries.push({ ...j, ritualName: r.name, ritualId: r.id, category: r.category });
    });
  });
  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
