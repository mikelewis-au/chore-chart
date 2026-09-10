import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Question {
  text: string;
  answer: number;
}

// Two-digit times tables: seconds for a grown-up, out of reach for a five-year-old.
function question(): Question {
  const a = 6 + Math.floor(Math.random() * 14);
  const b = 3 + Math.floor(Math.random() * 10);
  return { text: `${a} × ${b}`, answer: a * b };
}

@Component({
  selector: 'app-lock',
  imports: [RouterLink],
  template: `
    <section class="card lock" [class.shake]="shaking()">
      <div class="icon">🔒</div>
      <h1>Grown-ups only</h1>
      <p class="ask">Answer to unlock</p>
      <p class="sum">{{ sum().text }} = ?</p>
      <input
        #box
        type="text"
        inputmode="numeric"
        autocomplete="off"
        enterkeyhint="go"
        aria-label="Answer"
        (input)="entry.set(box.value)"
        (keydown.enter)="check(box)"
      />
      <button class="btn primary" (click)="check(box)" [disabled]="!entry().trim()">Unlock</button>
      @if (wrong()) {
        <p class="nope">Not quite — here's a new one.</p>
      }
      <a routerLink="/" class="btn ghost">Back to chores</a>
    </section>
  `,
  styleUrl: './lock.scss',
})
export class Lock {
  readonly solved = output<void>();

  readonly sum = signal(question());
  readonly entry = signal('');
  readonly wrong = signal(false);
  readonly shaking = signal(false);

  private shakeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.shakeTimer));
  }

  check(box: HTMLInputElement): void {
    if (Number(box.value.trim()) === this.sum().answer) {
      this.solved.emit();
      return;
    }
    // A fresh question each time, so guessing can't chip away at one answer.
    this.sum.set(question());
    box.value = '';
    box.focus();
    this.entry.set('');
    this.wrong.set(true);
    // Off and on again so a second wrong answer replays the shake.
    this.shaking.set(false);
    clearTimeout(this.shakeTimer);
    this.shakeTimer = setTimeout(() => this.shaking.set(true), 20);
  }
}
