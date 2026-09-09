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
    if (updates.isEnabled) {
      updates.versionUpdates.pipe(filter((e) => e.type === 'VERSION_READY')).subscribe(() => document.location.reload());
    }
  }
}
