import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ChoreStore } from '../store';
import { CHORE_EMOJIS, ChoreKind, KID_COLOURS, KID_EMOJIS, Kid, guessEmoji, nextEmoji } from '../models';
import { startOfWeek } from '../week';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  readonly store = inject(ChoreStore);
  readonly kidEmojis = KID_EMOJIS;
  readonly kidColours = KID_COLOURS;
  readonly choreEmojis = CHORE_EMOJIS;

  readonly newKidName = signal('');
  readonly expanded = signal<string | null>(this.store.activeKid()?.id ?? null);
  readonly confirming = signal<string | null>(null);

  private confirmTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.confirmTimer));
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

  cycleEmoji(kid: Kid, choreId: string, current: string): void {
    this.store.patchChore(kid.id, choreId, { emoji: nextEmoji(current) });
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

  value(ev: Event): string {
    return (ev.target as HTMLInputElement).value;
  }
}
