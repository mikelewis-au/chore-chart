import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { ChoreStore } from '../store';
import { Kid, Sticker } from '../models';
import { celebrate, cheer } from '../confetti';

const UNDO_MS = 5000;
const NUDGE_MS = 3000;

@Component({
  selector: 'app-toilet-card',
  templateUrl: './toilet-card.html',
  styleUrl: './toilet-card.scss',
})
export class ToiletCard {
  readonly store = inject(ChoreStore);
  readonly kid = input.required<Kid>();

  readonly card = computed(() => this.store.stickerCard(this.kid()));
  // At least as many slots as stickers, so lowering the card size in Settings never hides any.
  readonly slots = computed(() => {
    const { stickers, goal } = this.card();
    return Array.from({ length: Math.max(goal, stickers.length) }, (_, i) => stickers[i] ?? null);
  });
  readonly pct = computed(() => Math.min(100, Math.round((this.card().stickers.length / this.card().goal) * 100)));

  // Both remember which kid they belong to, so switching kids hides them instead of undoing someone else's sticker.
  private readonly lastAdded = signal<{ kidId: string; sticker: Sticker } | null>(null);
  private readonly nudgedKid = signal<string | null>(null);
  readonly undoable = computed(() => {
    const last = this.lastAdded();
    return last?.kidId === this.kid().id ? last.sticker : null;
  });
  readonly nudging = computed(() => this.nudgedKid() === this.kid().id);

  private undoTimer: ReturnType<typeof setTimeout> | undefined;
  private nudgeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.undoTimer);
      clearTimeout(this.nudgeTimer);
    });
  }

  add(ev: MouseEvent): void {
    const kid = this.kid();
    const result = this.store.addSticker(kid);
    if (result === 'full') return;
    if (result === 'too-soon') {
      this.nudgedKid.set(kid.id);
      clearTimeout(this.nudgeTimer);
      this.nudgeTimer = setTimeout(() => this.nudgedKid.set(null), NUDGE_MS);
      return;
    }

    this.lastAdded.set({ kidId: kid.id, sticker: result });
    clearTimeout(this.undoTimer);
    this.undoTimer = setTimeout(() => this.lastAdded.set(null), UNDO_MS);

    const sound = this.store.soundOn();
    if (this.card().full) {
      celebrate(sound);
    } else {
      const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
      cheer(ev.clientX || rect.left + rect.width / 2, ev.clientY || rect.top + rect.height / 2, sound);
    }
  }

  undo(): void {
    const last = this.lastAdded();
    if (!last) return;
    this.store.undoSticker(last.kidId, last.sticker.at);
    this.lastAdded.set(null);
    clearTimeout(this.undoTimer);
  }
}
