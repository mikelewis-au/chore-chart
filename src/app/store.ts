import { Injectable, computed, effect, signal } from '@angular/core';
import { AppState, Chore, ChoreKind, CooldownId, DEFAULT_COOLDOWN, KID_AVATARS, KID_COLOURS, Kid, cooldownMs, guessEmoji } from './models';
import { addDays, startOfWeek, toISODate, weekDates } from './week';

const STORAGE_KEY = 'chore-chart.v1';

// A grown-up who answers the maths question can come and go for this long before being asked again.
const UNLOCK_GRACE_MS = 5 * 60_000;

export interface WeekStats {
  total: number;
  done: number;
  pct: number;
  unlocked: boolean;
  needed: number;
}

function uid(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function emptyState(): AppState {
  return { version: 1, kids: [], activeKidId: null, done: {}, soundOn: true, cooldown: DEFAULT_COOLDOWN, lockSettings: false, celebrated: {} };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== 1 || !Array.isArray(parsed.kids)) return emptyState();
    return {
      ...parsed,
      done: prune(parsed.done ?? {}),
      soundOn: parsed.soundOn ?? true,
      cooldown: parsed.cooldown ?? DEFAULT_COOLDOWN,
      lockSettings: parsed.lockSettings ?? false,
      celebrated: prune(parsed.celebrated ?? {}),
    };
  } catch {
    return emptyState();
  }
}

// Completion and celebration keys end in a YYYY-MM-DD date; drop anything older than 8 weeks.
function prune<T>(rec: Record<string, T>): Record<string, T> {
  const cutoff = toISODate(addDays(startOfWeek(new Date()), -56));
  return Object.fromEntries(Object.entries(rec).filter(([k]) => k.slice(-10) >= cutoff)) as Record<string, T>;
}

function save(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable; nothing useful to do in a prototype.
  }
}

@Injectable({ providedIn: 'root' })
export class ChoreStore {
  private readonly state = signal<AppState>(load());
  // Deliberately not persisted: reopening the app re-arms the lock.
  private readonly unlockedUntil = signal(0);

  readonly kids = computed(() => this.state().kids);
  readonly done = computed(() => this.state().done);
  readonly soundOn = computed(() => this.state().soundOn);
  readonly cooldown = computed(() => this.state().cooldown);
  readonly lockSettings = computed(() => this.state().lockSettings);
  readonly activeKid = computed(() => {
    const s = this.state();
    return s.kids.find((k) => k.id === s.activeKidId) ?? s.kids[0] ?? null;
  });

  constructor() {
    effect(() => save(this.state()));
  }

  setSound(on: boolean): void {
    this.state.update((s) => ({ ...s, soundOn: on }));
  }

  setCooldown(id: CooldownId): void {
    this.state.update((s) => ({ ...s, cooldown: id }));
  }

  setLockSettings(on: boolean): void {
    this.state.update((s) => ({ ...s, lockSettings: on }));
  }

  settingsUnlocked(): boolean {
    return !this.lockSettings() || this.unlockedUntil() > Date.now();
  }

  unlockSettings(): void {
    this.unlockedUntil.set(Date.now() + UNLOCK_GRACE_MS);
  }

  setActiveKid(id: string): void {
    this.state.update((s) => ({ ...s, activeKidId: id }));
  }

  addKid(name: string): Kid {
    const n = this.state().kids.length;
    const kid: Kid = {
      id: uid(),
      name: name.trim(),
      emoji: KID_AVATARS[n % KID_AVATARS.length],
      colour: KID_COLOURS[n % KID_COLOURS.length],
      prize: '',
      prizeThreshold: 80,
      chores: [],
    };
    this.state.update((s) => ({ ...s, kids: [...s.kids, kid], activeKidId: s.activeKidId ?? kid.id }));
    return kid;
  }

  patchKid(id: string, patch: Partial<Omit<Kid, 'id' | 'chores'>>): void {
    this.updateKid(id, (k) => ({ ...k, ...patch }));
  }

  removeKid(id: string): void {
    this.state.update((s) => {
      const kids = s.kids.filter((k) => k.id !== id);
      const mine = (key: string) => key.startsWith(`${id}|`);
      const done = Object.fromEntries(Object.entries(s.done).filter(([key]) => !mine(key))) as Record<string, true>;
      const celebrated = Object.fromEntries(Object.entries(s.celebrated).filter(([key]) => !mine(key)));
      return { ...s, kids, done, celebrated, activeKidId: s.activeKidId === id ? (kids[0]?.id ?? null) : s.activeKidId };
    });
  }

  addChore(kidId: string, kind: ChoreKind, name: string, emoji: string): void {
    const chore: Chore = { id: uid(), name: name.trim(), emoji, kind };
    this.updateKid(kidId, (k) => ({ ...k, chores: [...k.chores, chore] }));
  }

  patchChore(kidId: string, choreId: string, patch: Partial<Omit<Chore, 'id'>>): void {
    this.updateKid(kidId, (k) => ({ ...k, chores: k.chores.map((c) => (c.id === choreId ? { ...c, ...patch } : c)) }));
  }

  removeChore(kidId: string, choreId: string): void {
    this.updateKid(kidId, (k) => ({ ...k, chores: k.chores.filter((c) => c.id !== choreId) }));
  }

  dailyKey(kidId: string, choreId: string, day: Date): string {
    return `${kidId}|${choreId}|d:${toISODate(day)}`;
  }

  weeklyKey(kidId: string, choreId: string, monday: Date): string {
    return `${kidId}|${choreId}|w:${toISODate(monday)}`;
  }

  prizeKey(kidId: string, monday: Date): string {
    return `${kidId}|prize|w:${toISODate(monday)}`;
  }

  // Kids untick and re-tick chores to farm the animations, so a key only celebrates once per cooldown window.
  claimCelebration(key: string): boolean {
    const s = this.state();
    const last = s.celebrated[key];
    if (last !== undefined && Date.now() - last < cooldownMs(s.cooldown)) return false;
    this.state.update((st) => ({ ...st, celebrated: { ...st.celebrated, [key]: Date.now() } }));
    return true;
  }

  isDone(key: string): boolean {
    return !!this.done()[key];
  }

  toggle(key: string): boolean {
    const nowDone = !this.isDone(key);
    this.state.update((s) => {
      const done = { ...s.done };
      if (nowDone) done[key] = true;
      else delete done[key];
      return { ...s, done };
    });
    return nowDone;
  }

  clearWeek(kidId: string, monday: Date): void {
    const keys = new Set(this.weekKeys(this.kids().find((k) => k.id === kidId), monday));
    keys.add(this.prizeKey(kidId, monday));
    this.state.update((s) => ({
      ...s,
      done: Object.fromEntries(Object.entries(s.done).filter(([key]) => !keys.has(key))) as Record<string, true>,
      celebrated: Object.fromEntries(Object.entries(s.celebrated).filter(([key]) => !keys.has(key))),
    }));
  }

  weekStats(kid: Kid, monday: Date): WeekStats {
    const keys = this.weekKeys(kid, monday);
    const done = this.done();
    const total = keys.length;
    const doneCount = keys.filter((k) => done[k]).length;
    const pct = total ? Math.round((doneCount / total) * 100) : 0;
    const target = Math.ceil((kid.prizeThreshold / 100) * total);
    return { total, done: doneCount, pct, unlocked: total > 0 && doneCount >= target, needed: Math.max(0, target - doneCount) };
  }

  seedExample(): void {
    const sam = this.addKid('Sam');
    const ava = this.addKid('Ava');
    const daily = ['Make bed', 'Brush teeth', 'Tidy room'];
    const weekly = ['Empty the bins', 'Water the plants'];
    for (const kid of [sam, ava]) {
      daily.forEach((n) => this.addChore(kid.id, 'daily', n, guessEmoji(n)));
      weekly.forEach((n) => this.addChore(kid.id, 'weekly', n, guessEmoji(n)));
    }
    this.patchKid(sam.id, { prize: 'Movie night 🍿' });
    this.patchKid(ava.id, { prize: 'Ice cream trip 🍦' });
  }

  private weekKeys(kid: Kid | undefined, monday: Date): string[] {
    if (!kid) return [];
    const days = weekDates(monday);
    return kid.chores.flatMap((c) =>
      c.kind === 'daily' ? days.map((d) => this.dailyKey(kid.id, c.id, d)) : [this.weeklyKey(kid.id, c.id, monday)],
    );
  }

  private updateKid(id: string, fn: (k: Kid) => Kid): void {
    this.state.update((s) => ({ ...s, kids: s.kids.map((k) => (k.id === id ? fn(k) : k)) }));
  }
}
