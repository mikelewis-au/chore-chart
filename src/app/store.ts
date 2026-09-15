import { Injectable, computed, effect, signal } from '@angular/core';
import { AppState, BoardMode, Chore, ChoreKind, CoinChoice, CooldownId, DEFAULT_COOLDOWN, DEFAULT_DRY, DEFAULT_TOILET, DryChart, DryEntry, KID_AVATARS, KID_COLOURS, Kid, STICKERS, STICKER_GAP_MS, Sticker, ToiletChart, cooldownMs, dueOn, guessEmoji } from './models';
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

export interface StickerCard {
  stickers: Sticker[];
  goal: number;
  left: number;
  full: boolean;
}

export interface DryDay {
  date: string;
  sticker: string;
}

export interface DryRow {
  days: DryDay[];
  status: 'active' | 'future' | 'choosing' | CoinChoice;
}

export interface DryView {
  rows: DryRow[];
  current: number; // -1 once every row is full
  perRow: number;
  complete: boolean;
  todayEntry: DryEntry | null;
  canClaimToday: boolean;
  canClaimYesterday: boolean;
  canLogAccident: boolean;
  // The newest entry's date when it's an accident, so Settings can offer to remove it.
  lastAccident: string | null;
  coins: number;
  coinsNeeded: number;
  ready: boolean;
}

export interface DryClaim {
  date: string;
  sticker: string;
  row: number;
  rowDone: boolean;
  chartDone: boolean;
}

function uid(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function emptyState(): AppState {
  return { version: 1, kids: [], activeKidId: null, done: {}, soundOn: true, cooldown: DEFAULT_COOLDOWN, lockSettings: false, celebrated: {}, stickers: {}, lastStickerAt: {}, boardMode: {}, dryCharts: {}, coins: {} };
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
      stickers: parsed.stickers ?? {},
      lastStickerAt: parsed.lastStickerAt ?? {},
      boardMode: parsed.boardMode ?? {},
      dryCharts: parsed.dryCharts ?? {},
      coins: parsed.coins ?? {},
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

function omit<T>(rec: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(rec).filter(([k]) => k !== key));
}

const EMPTY_DRY: DryChart = { entries: {}, choices: {} };

// Rows are worked out from the day log rather than stored, so removing an accident brings its washed row straight back.
function layoutDry(chart: DryChart, perRow: number, rowCount: number): { full: DryDay[][]; current: DryDay[] } {
  const full: DryDay[][] = [];
  let current: DryDay[] = [];
  for (const date of Object.keys(chart.entries).sort()) {
    if (full.length === rowCount) break;
    const entry = chart.entries[date];
    if (entry.sticker) {
      current.push({ date, sticker: entry.sticker });
      if (current.length === perRow) {
        full.push(current);
        current = [];
      }
    }
    // After the sticker, so an accident later on the day a row filled only restarts the next row.
    if (entry.accident) current = [];
  }
  return { full, current };
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
      return {
        ...s,
        kids,
        done,
        celebrated,
        stickers: omit(s.stickers, id),
        lastStickerAt: omit(s.lastStickerAt, id),
        boardMode: omit(s.boardMode, id),
        dryCharts: omit(s.dryCharts, id),
        coins: omit(s.coins, id),
        activeKidId: s.activeKidId === id ? (kids[0]?.id ?? null) : s.activeKidId,
      };
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

  setToilet(kidId: string, patch: Partial<ToiletChart>): void {
    this.updateKid(kidId, (k) => ({ ...k, toilet: { ...DEFAULT_TOILET, ...k.toilet, ...patch } }));
  }

  setBoardMode(kidId: string, mode: BoardMode): void {
    this.state.update((s) => ({ ...s, boardMode: { ...s.boardMode, [kidId]: mode } }));
  }

  // The saved choice outlives the chart being switched off, so switching it back on returns to the same view.
  modeFor(kid: Kid): BoardMode {
    if (!kid.toilet?.enabled) return 'chores';
    return this.state().boardMode[kid.id] ?? (kid.chores.length ? 'chores' : 'toilet');
  }

  stickerCard(kid: Kid): StickerCard {
    const stickers = this.state().stickers[kid.id] ?? [];
    const goal = kid.toilet?.goal ?? DEFAULT_TOILET.goal;
    return { stickers, goal, left: Math.max(0, goal - stickers.length), full: stickers.length >= goal };
  }

  stickerStatus(kid: Kid): 'ok' | 'too-soon' | 'full' {
    if (this.stickerCard(kid).full) return 'full';
    const since = Date.now() - (this.state().lastStickerAt[kid.id] ?? 0);
    // A clock set backwards makes this negative; let it through rather than locking the chart for hours.
    return since >= 0 && since < STICKER_GAP_MS ? 'too-soon' : 'ok';
  }

  // Re-checks the status because the sticker sheet can sit open while another tab adds a sticker.
  addSticker(kid: Kid, emoji?: string): Sticker | 'too-soon' | 'full' {
    const status = this.stickerStatus(kid);
    if (status !== 'ok') return status;
    const now = Date.now();
    const pool = STICKERS.filter((e) => e !== this.stickerCard(kid).stickers.at(-1)?.emoji);
    const sticker: Sticker = { emoji: emoji ?? pool[Math.floor(Math.random() * pool.length)], at: now };
    this.state.update((s) => ({
      ...s,
      stickers: { ...s.stickers, [kid.id]: [...(s.stickers[kid.id] ?? []), sticker] },
      lastStickerAt: { ...s.lastStickerAt, [kid.id]: now },
    }));
    return sticker;
  }

  // Leaves lastStickerAt alone, so undoing and tapping again can't skip the gap or replay the celebration.
  undoSticker(kidId: string, at: number): void {
    this.state.update((s) => ({ ...s, stickers: { ...s.stickers, [kidId]: (s.stickers[kidId] ?? []).filter((st) => st.at !== at) } }));
  }

  newCard(kidId: string): void {
    this.state.update((s) => ({ ...s, stickers: omit(s.stickers, kidId), lastStickerAt: omit(s.lastStickerAt, kidId) }));
  }

  dryView(kid: Kid, today: Date): DryView {
    const { chart, perRow, rowCount, full, current } = this.dryLayout(kid);
    const complete = full.length === rowCount;
    const rows: DryRow[] = Array.from({ length: rowCount }, (_, i) => {
      if (i < full.length) return { days: full[i], status: chart.choices[i] ?? 'choosing' };
      return i === full.length ? { days: current, status: 'active' } : { days: [], status: 'future' };
    });
    const todayKey = toISODate(today);
    const yesterdayKey = toISODate(addDays(today, -1));
    const last = Object.keys(chart.entries).sort().at(-1) ?? null;
    const started = (key: string) => !chart.startedOn || key >= chart.startedOn;
    // Entries only ever go after the newest one, so the rows stay in date order even if the clock goes backwards.
    const canClaimToday = !complete && started(todayKey) && (last === null || last < todayKey);
    const coins = this.state().coins[kid.id] ?? 0;
    const coinsNeeded = kid.toilet?.bigPrizeCoins ?? DEFAULT_DRY.bigPrizeCoins;
    return {
      rows,
      current: complete ? -1 : full.length,
      perRow,
      complete,
      todayEntry: chart.entries[todayKey] ?? null,
      canClaimToday,
      canClaimYesterday: canClaimToday && started(yesterdayKey) && (last === null || last < yesterdayKey),
      canLogAccident: !complete && started(todayKey) && (last === null || last <= todayKey) && !chart.entries[todayKey]?.accident,
      lastAccident: last && chart.entries[last].accident ? last : null,
      coins,
      coinsNeeded,
      ready: coins >= coinsNeeded,
    };
  }

  // Re-checks the view because the sticker sheet can stay open past midnight or while Settings changes the chart.
  claimDryDay(kid: Kid, today: Date, day: Date, sticker?: string): DryClaim | 'unavailable' {
    const view = this.dryView(kid, today);
    const key = toISODate(day);
    const allowed = key === toISODate(today) ? view.canClaimToday : key === toISODate(addDays(today, -1)) && view.canClaimYesterday;
    if (!allowed) return 'unavailable';
    const previous = view.rows[view.current].days.at(-1)?.sticker ?? view.rows[view.current - 1]?.days.at(-1)?.sticker;
    const pool = STICKERS.filter((e) => e !== previous);
    const entry = { sticker: sticker ?? pool[Math.floor(Math.random() * pool.length)], at: Date.now() };
    this.addDryEntry(kid, view, key, entry);
    const after = this.dryView(kid, today);
    return { date: key, sticker: entry.sticker, row: view.current, rowDone: after.current !== view.current, chartDone: after.complete };
  }

  logAccident(kid: Kid, today: Date): { washed: number } | 'unavailable' {
    const view = this.dryView(kid, today);
    if (!view.canLogAccident) return 'unavailable';
    const key = toISODate(today);
    const existing = this.state().dryCharts[kid.id]?.entries[key];
    this.addDryEntry(kid, view, key, { ...existing, accident: true, at: existing?.at ?? Date.now() });
    return { washed: view.rows[view.current].days.length };
  }

  undoDryDay(kidId: string, date: string): void {
    this.updateDry(kidId, (c) => (c.entries[date] && !c.entries[date].accident ? { ...c, entries: omit(c.entries, date) } : c));
  }

  removeAccident(kidId: string, date: string): void {
    this.updateDry(kidId, (c) => {
      const entry = c.entries[date];
      if (!entry?.accident) return c;
      return { ...c, entries: entry.sticker ? { ...c.entries, [date]: { sticker: entry.sticker, at: entry.at } } : omit(c.entries, date) };
    });
  }

  // Only a full row with no choice yet, so a coin can't be counted twice.
  chooseRow(kid: Kid, row: number, choice: CoinChoice): boolean {
    const { chart, full } = this.dryLayout(kid);
    if (row >= full.length || chart.choices[row]) return false;
    this.state.update((s) => ({
      ...s,
      dryCharts: { ...s.dryCharts, [kid.id]: { ...chart, choices: { ...chart.choices, [row]: choice } } },
      coins: choice === 'saved' ? { ...s.coins, [kid.id]: (s.coins[kid.id] ?? 0) + 1 } : s.coins,
    }));
    return true;
  }

  prizeGiven(kid: Kid): void {
    const needed = kid.toilet?.bigPrizeCoins ?? DEFAULT_DRY.bigPrizeCoins;
    this.state.update((s) => {
      const coins = s.coins[kid.id] ?? 0;
      return coins < needed ? s : { ...s, coins: { ...s.coins, [kid.id]: coins - needed } };
    });
  }

  // Coins stay in the jar. If the old chart already has today, the new one starts tomorrow.
  newDryChart(kidId: string, today: Date): void {
    this.updateDry(kidId, (c) => {
      const last = Object.keys(c.entries).sort().at(-1);
      const todayKey = toISODate(today);
      return { entries: {}, choices: {}, startedOn: last && last >= todayKey ? toISODate(addDays(today, 1)) : todayKey };
    });
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
      c.kind === 'daily'
        ? days.filter((d) => dueOn(c, d)).map((d) => this.dailyKey(kid.id, c.id, d))
        : [this.weeklyKey(kid.id, c.id, monday)],
    );
  }

  private updateKid(id: string, fn: (k: Kid) => Kid): void {
    this.state.update((s) => ({ ...s, kids: s.kids.map((k) => (k.id === id ? fn(k) : k)) }));
  }

  private dryLayout(kid: Kid) {
    const chart = this.state().dryCharts[kid.id] ?? EMPTY_DRY;
    // The first entry fixes the chart's shape, so changing the settings only affects the next chart.
    const fixed = Object.keys(chart.entries).length > 0;
    const perRow = (fixed ? chart.perRow : undefined) ?? kid.toilet?.perRow ?? DEFAULT_DRY.perRow;
    const rowCount = (fixed ? chart.rows : undefined) ?? kid.toilet?.rows ?? DEFAULT_DRY.rows;
    return { chart, perRow, rowCount, ...layoutDry(chart, perRow, rowCount) };
  }

  private addDryEntry(kid: Kid, view: DryView, date: string, entry: DryEntry): void {
    this.updateDry(kid.id, (c) => ({
      ...c,
      ...(Object.keys(c.entries).length ? {} : { perRow: view.perRow, rows: view.rows.length }),
      entries: { ...c.entries, [date]: entry },
    }));
  }

  private updateDry(kidId: string, fn: (c: DryChart) => DryChart): void {
    this.state.update((s) => ({ ...s, dryCharts: { ...s.dryCharts, [kidId]: fn(s.dryCharts[kidId] ?? EMPTY_DRY) } }));
  }
}
