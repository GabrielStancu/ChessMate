import { Routes } from '@angular/router';
import { AnalysisBoardPageComponent } from './pages/analysis-board-page.component';
import { GameSearchPageComponent } from './pages/game-search-page.component';

export const appRoutes: Routes = [
  {
    path: '',
    component: GameSearchPageComponent
  },
  {
    path: 'analysis/:gameId',
    component: AnalysisBoardPageComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
