import { Component, computed, input } from '@angular/core';
import { SPRITE_SIZE, isSprite, spriteName, spritePixels } from '../avatars';

@Component({
  selector: 'app-avatar',
  template: `
    @if (pixels(); as px) {
      <svg [attr.viewBox]="'0 0 ' + size + ' ' + size" shape-rendering="crispEdges" role="img" [attr.aria-label]="name()">
        @for (p of px; track $index) {
          <rect [attr.x]="p.x" [attr.y]="p.y" width="1" height="1" [attr.fill]="p.c" />
        }
      </svg>
    } @else {
      {{ value() }}
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    svg {
      width: 1.25em;
      height: 1.25em;
    }
  `,
})
export class Avatar {
  readonly value = input.required<string>();
  readonly size = SPRITE_SIZE;
  readonly pixels = computed(() => (isSprite(this.value()) ? spritePixels(this.value()) : null));
  readonly name = computed(() => spriteName(this.value()));
}
