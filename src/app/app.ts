import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    // Prototype: take new builds immediately so phones don't sit on stale versions.
    const updates = inject(SwUpdate);
    if (!updates.isEnabled) return;
    updates.versionUpdates.pipe(filter((e) => e.type === 'VERSION_READY')).subscribe(() => document.location.reload());

    // The worker only looks for a new build at startup, and an installed PWA can be resumed for days without one.
    const check = () => void updates.checkForUpdate().catch(() => undefined);
    setInterval(check, 30 * 60_000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) check();
    });
  }
}
