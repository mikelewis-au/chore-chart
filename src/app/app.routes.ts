import { Routes } from '@angular/router';
import { Board } from './board/board';
import { Settings } from './settings/settings';

export const routes: Routes = [
  { path: '', component: Board },
  { path: 'settings', component: Settings },
  { path: '**', redirectTo: '' },
];
