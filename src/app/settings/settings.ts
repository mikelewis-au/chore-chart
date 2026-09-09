import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ChoreStore } from '../store';
import { AVATAR_GROUPS, CHORE_GROUPS, ChoreKind, KID_COLOURS, Kid, guessEmoji } from '../models';
import { Avatar } from '../avatar/avatar';
import { EmojiPicker } from '../emoji-picker/emoji-picker';
import { startOfWeek } from '../week';
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

  value(ev: Event): string {
    return (ev.target as HTMLInputElement).value;
  }
}
