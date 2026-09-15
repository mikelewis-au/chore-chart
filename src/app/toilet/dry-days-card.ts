import { Component, DestroyRef, ElementRef, computed, inject, input, signal } from '@angular/core';
import { ChoreStore, DryDay } from '../store';
import { CoinChoice, Kid, STICKER_GROUPS } from '../models';
import { FINALE_HOP_START_MS, celebrate, cheer, coinDrop, finale, finaleHopStep, giftBurst, splash } from '../confetti';
import { Avatar } from '../avatar/avatar';
import { EmojiPicker } from '../emoji-picker/emoji-picker';
import { DAY_LABELS, addDays, dayIndex, fromISODate, toISODate } from '../week';

const UNDO_MS = 5000;
const NOTE_MS = 3000;
const WASH_MS = 1100;
const CHOICE_DELAY_MS = 2000;

type Sheet = { kind: 'stickers'; day: 'today' | 'yesterday' } | { kind: 'accident' } | { kind: 'choice'; row: number };
type Undo = { kind: 'sticker' | 'accident'; date: string };

@Component({
  selector: 'app-dry-days-card',
  imports: [Avatar, EmojiPicker],
  templateUrl: './dry-days-card.html',
  styleUrl: './dry-days-card.scss',
})
export class DryDaysCard {
  readonly store = inject(ChoreStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly kid = input.required<Kid>();
  readonly today = input.required<Date>();
  readonly stickerGroups = STICKER_GROUPS;
  readonly champion = [...'Chart champion!'].map((ch) => (ch === ' ' ? ' ' : ch));

  readonly view = computed(() => this.store.dryView(this.kid(), this.today()));
  readonly left = computed(() => {
    const v = this.view();
    return v.complete ? 0 : v.perRow - v.rows[v.current].days.length;
  });
  readonly jar = computed(() => {
    const { coins, coinsNeeded } = this.view();
    return { slots: Array.from({ length: coinsNeeded }, (_, i) => i < coins), extra: Math.max(0, coins - coinsNeeded) };
  });
  readonly saveHint = computed(() => {
    const { coins, coinsNeeded } = this.view();
    const prize = this.kid().toilet?.bigPrize || 'the big prize';
    return coins + 1 >= coinsNeeded ? `That's enough for ${prize}!` : `${coins + 1} of ${coinsNeeded} coins for ${prize}`;
  });

  // Each remembers which kid it belongs to, so switching kids hides it instead of acting on someone else's chart.
  private readonly sheetFor = signal<{ kidId: string; sheet: Sheet } | null>(null);
  private readonly undoFor = signal<{ kidId: string; undo: Undo } | null>(null);
  private readonly noteFor = signal<{ kidId: string; text: string } | null>(null);
  private readonly washFor = signal<{ kidId: string; row: number; days: DryDay[] } | null>(null);
  private readonly finaleFor = signal<{ kidId: string; row: number } | null>(null);

  readonly sheet = computed(() => this.mine(this.sheetFor())?.sheet ?? null);
  readonly pickingDay = computed(() => {
    const s = this.sheet();
    return s?.kind === 'stickers' ? s.day : null;
  });
  readonly confirmingAccident = computed(() => this.sheet()?.kind === 'accident');
  readonly choiceRow = computed(() => {
    const s = this.sheet();
    return s?.kind === 'choice' ? s.row : null;
  });
  readonly undoable = computed(() => this.mine(this.undoFor())?.undo ?? null);
  readonly note = computed(() => this.mine(this.noteFor())?.text ?? null);
  readonly finaleRow = computed(() => this.mine(this.finaleFor())?.row ?? null);

  readonly grid = computed(() => {
    const v = this.view();
    const wash = this.mine(this.washFor());
    const step = finaleHopStep(v.rows.reduce((n, r) => n + r.days.length, 0));
    let hop = 0;
    return v.rows.map((row, r) => ({
      status: row.status,
      done: row.days.length,
      cells: Array.from({ length: v.perRow }, (_, i) => {
        const kept = row.days[i];
        // Washed stickers stay on screen just long enough to fall off.
        const day = kept ?? (wash?.row === r ? wash.days[i] : undefined);
        return {
          sticker: day?.sticker ?? null,
          stamp: day ? DAY_LABELS[dayIndex(fromISODate(day.date))] : null,
          washing: !kept && !!day,
          today: !day && r === v.current && i === row.days.length && v.canClaimToday,
          hop: kept ? `${FINALE_HOP_START_MS + hop++ * step}ms` : null,
        };
      }),
    }));
  });

  private tap: { x: number; y: number } | null = null;
  private undoTimer: ReturnType<typeof setTimeout> | undefined;
  private noteTimer: ReturnType<typeof setTimeout> | undefined;
  private washTimer: ReturnType<typeof setTimeout> | undefined;
  private choiceTimer: ReturnType<typeof setTimeout> | undefined;
  private stopFinale: (() => void) | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      [this.undoTimer, this.noteTimer, this.washTimer, this.choiceTimer].forEach(clearTimeout);
      this.stopFinale?.();
    });
  }

  tapDry(): void {
    const v = this.view();
    if (v.canClaimToday) {
      this.tap = null;
      this.openSheet({ kind: 'stickers', day: 'today' });
    } else {
      this.say(v.todayEntry?.accident ? 'A fresh try starts tomorrow 🌅' : "Today's sticker is on. See you tomorrow! 🌙");
    }
  }

  tapYesterday(): void {
    this.tap = null;
    this.openSheet({ kind: 'stickers', day: 'yesterday' });
  }

  tapAccident(): void {
    if (this.view().canLogAccident) this.openSheet({ kind: 'accident' });
    else this.say('Already logged today. Fresh try tomorrow 🌅');
  }

  openChoice(row: number): void {
    this.openSheet({ kind: 'choice', row });
  }

  closeSheet(): void {
    this.sheetFor.set(null);
  }

  // The picker's pick output carries no event, so this is how the cheer knows where the finger was.
  noteTap(ev: PointerEvent): void {
    this.tap = { x: ev.clientX, y: ev.clientY };
  }

  // No emoji means Surprise me.
  pick(emoji?: string): void {
    const day = this.pickingDay();
    if (!day) return;
    this.closeSheet();
    const kid = this.kid();
    const today = this.today();
    const result = this.store.claimDryDay(kid, today, day === 'today' ? today : addDays(today, -1), emoji);
    if (result === 'unavailable') return;

    const sound = this.store.soundOn();
    if (result.chartDone) {
      this.startFinale(result.row);
    } else if (result.rowDone) {
      // No undo on this one, so the row celebration can't be replayed.
      celebrate(sound);
      clearTimeout(this.choiceTimer);
      this.choiceTimer = setTimeout(() => {
        if (this.kid().id === kid.id) this.openChoice(result.row);
      }, CHOICE_DELAY_MS);
    } else {
      this.offerUndo({ kind: 'sticker', date: result.date });
      // Same cooldown as chores, so undoing and picking again doesn't replay the cheer.
      if (this.store.claimCelebration(`${kid.id}|dry|d:${result.date}`)) {
        const { x, y } = this.tap ?? this.centre('.chart');
        cheer(x, y, sound);
      }
    }
  }

  confirmAccident(): void {
    const kid = this.kid();
    const before = this.view();
    this.closeSheet();
    if (this.store.logAccident(kid, this.today()) === 'unavailable') return;

    const { x, y } = this.centre(`[data-row="${before.current}"]`);
    splash(x, y, this.store.soundOn());
    const days = before.rows[before.current].days;
    if (days.length) {
      this.washFor.set({ kidId: kid.id, row: before.current, days });
      clearTimeout(this.washTimer);
      this.washTimer = setTimeout(() => this.washFor.set(null), WASH_MS);
    }
    this.offerUndo({ kind: 'accident', date: toISODate(this.today()) });
  }

  undo(): void {
    const u = this.undoable();
    if (!u) return;
    const kidId = this.kid().id;
    if (u.kind === 'sticker') this.store.undoDryDay(kidId, u.date);
    else this.store.removeAccident(kidId, u.date);
    this.undoFor.set(null);
    this.washFor.set(null);
    clearTimeout(this.undoTimer);
  }

  choose(choice: CoinChoice): void {
    const row = this.choiceRow();
    if (row === null) return;
    this.closeSheet();
    if (!this.store.chooseRow(this.kid(), row, choice)) return;

    const sound = this.store.soundOn();
    if (choice === 'saved') {
      const { x, y } = this.centre('.jar');
      coinDrop(x, y, sound);
      const { coins, coinsNeeded, ready } = this.view();
      this.say(ready ? "That's enough for the big prize! 🎉" : `Saved! ${coins} of ${coinsNeeded} coins`);
    } else {
      const { x, y } = this.centre(`[data-row="${row}"] .cap`);
      giftBurst(x, y, sound);
      this.say('Enjoy your small prize! 🎁');
    }
  }

  yay(): void {
    const row = this.finaleRow();
    this.stopFinale?.();
    this.stopFinale = undefined;
    this.finaleFor.set(null);
    if (row !== null && this.view().rows[row]?.status === 'choosing') this.openChoice(row);
  }

  private startFinale(row: number): void {
    const stickers = this.view().rows.flatMap((r) => r.days.map((d) => d.sticker));
    this.stopFinale?.();
    this.stopFinale = finale(this.store.soundOn(), stickers);
    this.finaleFor.set({ kidId: this.kid().id, row });
    this.host.nativeElement.querySelector('.chart')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private openSheet(sheet: Sheet): void {
    this.sheetFor.set({ kidId: this.kid().id, sheet });
  }

  private say(text: string): void {
    this.noteFor.set({ kidId: this.kid().id, text });
    clearTimeout(this.noteTimer);
    this.noteTimer = setTimeout(() => this.noteFor.set(null), NOTE_MS);
  }

  private offerUndo(undo: Undo): void {
    this.undoFor.set({ kidId: this.kid().id, undo });
    clearTimeout(this.undoTimer);
    this.undoTimer = setTimeout(() => this.undoFor.set(null), UNDO_MS);
  }

  private centre(selector: string): { x: number; y: number } {
    const rect = this.host.nativeElement.querySelector(selector)?.getBoundingClientRect();
    return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  private mine<T extends { kidId: string }>(value: T | null): T | null {
    return value?.kidId === this.kid().id ? value : null;
  }
}
