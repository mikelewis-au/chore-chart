import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar } from '../avatar/avatar';
import { ChoreStore } from '../store';
import { Chore, dueOn } from '../models';
import { DAY_LABELS, DAY_NAMES, dayIndex, startOfWeek, toISODate, weekDates } from '../week';
import { celebrate, cheer } from '../confetti';

@Component({
  selector: 'app-board',
  imports: [RouterLink, Avatar],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  readonly store = inject(ChoreStore);
  readonly dayLabels = DAY_LABELS;

  readonly today = signal(new Date());
  readonly selectedDay = signal(new Date());
  readonly monday = computed(() => startOfWeek(this.today()));
  readonly days = computed(() => weekDates(this.monday()));

  readonly kid = this.store.activeKid;
  readonly daily = computed(() => this.kid()?.chores.filter((c) => c.kind === 'daily') ?? []);
  readonly dailyDue = computed(() => this.daily().filter((c) => dueOn(c, this.selectedDay())));
  readonly weekly = computed(() => this.kid()?.chores.filter((c) => c.kind === 'weekly') ?? []);
  readonly stats = computed(() => {
    const kid = this.kid();
    return kid ? this.store.weekStats(kid, this.monday()) : null;
  });

  readonly dayTitle = computed(() => {
    const sel = toISODate(this.selectedDay());
    if (sel === toISODate(this.today())) return 'Today';
    if (sel === toISODate(new Date(this.today().getTime() - 86_400_000))) return 'Yesterday';
    return DAY_NAMES[dayIndex(this.selectedDay())];
  });

  constructor() {
    // Roll the board over at midnight or when the app is brought back to the foreground.
    const refresh = () => {
      const now = new Date();
      if (toISODate(now) !== toISODate(this.today())) {
        this.today.set(now);
        this.selectedDay.set(now);
      }
    };
    const timer = setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    });
  }

  isToday(d: Date): boolean {
    return toISODate(d) === toISODate(this.today());
  }

  isSelected(d: Date): boolean {
    return toISODate(d) === toISODate(this.selectedDay());
  }

  isFuture(d: Date): boolean {
    return toISODate(d) > toISODate(this.today());
  }

  dayDone(d: Date): boolean {
    const kid = this.kid();
    const due = this.daily().filter((c) => dueOn(c, d));
    return !!kid && due.length > 0 && due.every((c) => this.store.isDone(this.store.dailyKey(kid.id, c.id, d)));
  }

  key(chore: Chore): string {
    const kid = this.kid()!;
    return chore.kind === 'daily'
      ? this.store.dailyKey(kid.id, chore.id, this.selectedDay())
      : this.store.weeklyKey(kid.id, chore.id, this.monday());
  }

  toggle(chore: Chore, ev: MouseEvent): void {
    const kid = this.kid()!;
    const key = this.key(chore);
    const wasUnlocked = this.stats()?.unlocked ?? false;
    if (!this.store.toggle(key)) return;
    const justUnlocked = !wasUnlocked && (this.stats()?.unlocked ?? false);
    // Claim both, so a chore re-ticked later replays neither animation.
    const choreCheer = this.store.claimCelebration(key);
    const prizeCheer = justUnlocked && this.store.claimCelebration(this.store.prizeKey(kid.id, this.monday()));
    const sound = this.store.soundOn();
    if (prizeCheer) {
      celebrate(sound);
    } else if (choreCheer) {
      const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
      cheer(ev.clientX || rect.left + 40, ev.clientY || rect.top + rect.height / 2, sound);
    }
  }
}
