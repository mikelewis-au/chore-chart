import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CATCH_UP_DAYS, ChoreStore } from '../store';
import { AVATAR_GROUPS, CHORE_GROUPS, COOLDOWNS, ChoreKind, DEFAULT_DRY, KID_COLOURS, Kid, guessEmoji } from '../models';
import { Avatar } from '../avatar/avatar';
import { EmojiPicker } from '../emoji-picker/emoji-picker';
import { addDays, fromISODate, startOfWeek, toISODate } from '../week';
import { party } from '../sounds';

type PickerTarget = { kind: 'avatar'; kidId: string } | { kind: 'chore'; kidId: string; choreId: string };

@Component({
  selector: 'app-settings',
  imports: [Avatar, EmojiPicker],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  readonly store = inject(ChoreStore);
  readonly kidColours = KID_COLOURS;
  readonly avatarGroups = AVATAR_GROUPS;
  readonly choreGroups = CHORE_GROUPS;
  readonly cooldowns = COOLDOWNS;
  readonly cooldownHint = computed(() => COOLDOWNS.find((c) => c.id === this.store.cooldown())?.hint ?? '');
  readonly dryDefaults = DEFAULT_DRY;
  readonly catchUpDays = CATCH_UP_DAYS;
  readonly today = new Date();

  // How long the dry run has been going before the next chart starts, per kid. 1 is today only.
  private readonly backdateFor = signal<Record<string, number>>({});

  readonly picker = signal<PickerTarget | null>(null);

  readonly newKidName = signal('');
  readonly expanded = signal<string | null>(this.store.activeKid()?.id ?? null);
  readonly confirming = signal<string | null>(null);

  private confirmTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.confirmTimer));
  }

  setSound(on: boolean): void {
    this.store.setSound(on);
    // Playing inside the tap also unlocks audio on iOS for later chore ticks.
    if (on) party();
  }

  addKid(): void {
    const name = this.newKidName().trim();
    if (!name) return;
    const kid = this.store.addKid(name);
    this.newKidName.set('');
    this.expanded.set(kid.id);
  }

  toggleExpanded(id: string): void {
    this.expanded.set(this.expanded() === id ? null : id);
  }

  addChore(kid: Kid, kind: ChoreKind, input: HTMLInputElement): void {
    const name = input.value.trim();
    if (!name) return;
    this.store.addChore(kid.id, kind, name, guessEmoji(name));
    input.value = '';
    input.focus();
  }

  pickerSelected(): string {
    const p = this.picker();
    if (!p) return '';
    const kid = this.store.kids().find((k) => k.id === p.kidId);
    return p.kind === 'avatar' ? (kid?.emoji ?? '') : (kid?.chores.find((c) => c.id === p.choreId)?.emoji ?? '');
  }

  onPick(value: string): void {
    const p = this.picker();
    if (!p) return;
    if (p.kind === 'avatar') this.store.patchKid(p.kidId, { emoji: value });
    else this.store.patchChore(p.kidId, p.choreId, { emoji: value });
    this.picker.set(null);
  }

  chores(kid: Kid, kind: ChoreKind) {
    return kid.chores.filter((c) => c.kind === kind);
  }

  // Destructive actions need two taps within 3 seconds; no native confirm() dialogs.
  confirmAction(key: string, action: () => void): void {
    if (this.confirming() === key) {
      this.confirming.set(null);
      clearTimeout(this.confirmTimer);
      action();
      return;
    }
    this.confirming.set(key);
    clearTimeout(this.confirmTimer);
    this.confirmTimer = setTimeout(() => this.confirming.set(null), 3000);
  }

  removeKid(kid: Kid): void {
    this.confirmAction(`kid:${kid.id}`, () => this.store.removeKid(kid.id));
  }

  clearWeek(kid: Kid): void {
    this.confirmAction(`week:${kid.id}`, () => this.store.clearWeek(kid.id, startOfWeek(new Date())));
  }

  newCard(kid: Kid): void {
    this.confirmAction(`toilet:${kid.id}`, () => this.store.newCard(kid.id));
  }

  prizeGiven(kid: Kid): void {
    this.confirmAction(`prize:${kid.id}`, () => this.store.prizeGiven(kid));
  }

  removeAccident(kid: Kid, date: string): void {
    this.confirmAction(`accident:${kid.id}`, () => this.store.removeAccident(kid.id, date));
  }

  backdate(kidId: string): number {
    return this.backdateFor()[kidId] ?? 1;
  }

  setBackdate(kidId: string, days: number): void {
    this.backdateFor.update((b) => ({ ...b, [kidId]: days }));
  }

  backdateTip(kid: Kid): string {
    const days = this.backdate(kid.id);
    const start = this.store.nextChartStart(kid.id, this.today, days);
    if (start === toISODate(this.today)) return 'The next chart starts today.';
    // The last chart's days are off limits, so say so rather than promise a date that won't happen.
    const capped = start > toISODate(addDays(this.today, -(days - 1))) ? ' The last chart already counted the days before that.' : '';
    return `${this.dayName(start)} to today, so ${kid.name} can pick stickers for the days already done.${capped}`;
  }

  // Starting a backdated chart resets the slider, so without this nothing on screen shows it worked.
  catchUpHint(kid: Kid, days: number): string {
    if (!days) return '';
    return `${days} earlier ${days === 1 ? 'day has' : 'days have'} no sticker yet. ${kid.name} can pick ${days === 1 ? 'it' : 'them'} on the board.`;
  }

  newDryChart(kid: Kid): void {
    this.confirmAction(`dry:${kid.id}`, () => {
      this.store.newDryChart(kid.id, new Date(), this.backdate(kid.id));
      this.setBackdate(kid.id, 1);
    });
  }

  dayName(iso: string): string {
    return fromISODate(iso).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  value(ev: Event): string {
    return (ev.target as HTMLInputElement).value;
  }
}
