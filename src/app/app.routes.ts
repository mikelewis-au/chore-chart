import { Routes } from '@angular/router';
import { Board } from './board/board';
import { SettingsGate } from './settings/gate';

export const routes: Routes = [
  { path: '', component: Board },
  { path: 'settings', component: SettingsGate },
  { path: '**', redirectTo: '' },
];
