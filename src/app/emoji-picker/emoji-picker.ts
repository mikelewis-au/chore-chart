import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { Avatar } from '../avatar/avatar';

export interface PickerItem {
  value: string;
  label: string;
}

export interface PickerGroup {
  label: string;
  items: PickerItem[];
}

@Component({
  selector: 'app-emoji-picker',
  imports: [Avatar],
  templateUrl: './emoji-picker.html',
  styleUrl: './emoji-picker.scss',
})
export class EmojiPicker {
  readonly title = input('Pick one');
  readonly groups = input.required<PickerGroup[]>();
  readonly selected = input('');
  readonly pick = output<string>();
  readonly closed = output<void>();

  readonly query = signal('');
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.groups();
    return this.groups()
      .map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  });

  constructor() {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inject(DestroyRef).onDestroy(() => (document.body.style.overflow = previous));
  }
}
