import { Routes } from '@angular/router';
import { SearchComponent } from './components/search/search.component';
import { ResultsComponent } from './components/results/results.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { SettingsComponent } from '../admin/components/settings/settings.component';

export const userRoutes: Routes = [
  {
    path: '',
    component: SearchComponent,
    data: { title: 'user.search' }
  },
  {
    path: 'results',
    component: ResultsComponent,
    data: { title: 'user.searchResults' }
  },
  {
    path: 'gallery',
    component: GalleryComponent,
    data: { title: 'user.gallery' }
  },
  {
    path: 'gallery/:id',
    loadComponent: () => import('./components/folder-detail/folder-detail.component').then(m => m.FolderDetailComponent),
    data: { title: 'user.folderDetail' }
  },
  {
    path: 'settings',
    component: SettingsComponent,
    data: { title: 'admin.settings.title' }
  }
];
