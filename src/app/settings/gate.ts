import { Component, inject, signal } from '@angular/core';
import { ChoreStore } from '../store';
import { Lock } from '../lock/lock';
import { Settings } from './settings';

@Component({
  selector: 'app-settings-gate',
  imports: [Lock, Settings],
  template: `
    @if (unlocked()) {
      <app-settings />
    } @else {
      <app-lock (solved)="unlock()" />
    }
  `,
})
export class SettingsGate {
  private readonly store = inject(ChoreStore);
  // Checked once per visit, so the grace period can't expire while a grown-up is part way through editing.
  readonly unlocked = signal(this.store.settingsUnlocked());

  unlock(): void {
    this.store.unlockSettings();
    this.unlocked.set(true);
  }
}
