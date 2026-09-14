import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { ChoreStore } from '../store';
import { Kid, STICKER_GROUPS, Sticker } from '../models';
import { celebrate, cheer } from '../confetti';
import { Avatar } from '../avatar/avatar';
import { EmojiPicker } from '../emoji-picker/emoji-picker';

const UNDO_MS = 5000;
const NUDGE_MS = 3000;

@Component({
  selector: 'app-toilet-card',
  imports: [Avatar, EmojiPicker],
  templateUrl: './toilet-card.html',
  styleUrl: './toilet-card.scss',
})
export class ToiletCard {
  readonly store = inject(ChoreStore);
  readonly kid = input.required<Kid>();
  readonly stickerGroups = STICKER_GROUPS;

  readonly card = computed(() => this.store.stickerCard(this.kid()));
  // At least as many slots as stickers, so lowering the card size in Settings never hides any.
  readonly slots = computed(() => {
    const { stickers, goal } = this.card();
    return Array.from({ length: Math.max(goal, stickers.length) }, (_, i) => stickers[i] ?? null);
  });
  readonly pct = computed(() => Math.min(100, Math.round((this.card().stickers.length / this.card().goal) * 100)));

  // Each remembers which kid it belongs to, so switching kids hides it instead of acting on someone else's card.
  private readonly lastAdded = signal<{ kidId: string; sticker: Sticker } | null>(null);
  private readonly nudgedKid = signal<string | null>(null);
  private readonly pickingKid = signal<string | null>(null);
  readonly undoable = computed(() => {
    const last = this.lastAdded();
    return last?.kidId === this.kid().id ? last.sticker : null;
  });
  readonly nudging = computed(() => this.nudgedKid() === this.kid().id);
  readonly picking = computed(() => this.pickingKid() === this.kid().id);

  private tap: { x: number; y: number } | null = null;
  private undoTimer: ReturnType<typeof setTimeout> | undefined;
  private nudgeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.undoTimer);
      clearTimeout(this.nudgeTimer);
    });
  }

  didIt(): void {
    const kid = this.kid();
    const status = this.store.stickerStatus(kid);
    if (status === 'too-soon') this.nudge(kid.id);
    if (status !== 'ok') return;
    this.tap = null;
    this.pickingKid.set(kid.id);
  }

  // The picker's pick output carries no event, so this is how the cheer knows where the finger was.
  noteTap(ev: PointerEvent): void {
    this.tap = { x: ev.clientX, y: ev.clientY };
  }

  closePicker(): void {
    this.pickingKid.set(null);
  }

  // No emoji means Surprise me.
  choose(emoji?: string): void {
    const kid = this.kid();
    this.pickingKid.set(null);
    const result = this.store.addSticker(kid, emoji);
    if (result === 'full') return;
    if (result === 'too-soon') {
      this.nudge(kid.id);
      return;
    }

    this.lastAdded.set({ kidId: kid.id, sticker: result });
    clearTimeout(this.undoTimer);
    this.undoTimer = setTimeout(() => this.lastAdded.set(null), UNDO_MS);

    const sound = this.store.soundOn();
    if (this.card().full) {
      celebrate(sound);
    } else {
      const { x, y } = this.tap ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      cheer(x, y, sound);
    }
  }

  undo(): void {
    const last = this.lastAdded();
    if (!last) return;
    this.store.undoSticker(last.kidId, last.sticker.at);
    this.lastAdded.set(null);
    clearTimeout(this.undoTimer);
  }

  private nudge(kidId: string): void {
    this.nudgedKid.set(kidId);
    clearTimeout(this.nudgeTimer);
    this.nudgeTimer = setTimeout(() => this.nudgedKid.set(null), NUDGE_MS);
  }
}
