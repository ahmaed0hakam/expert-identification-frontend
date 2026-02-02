import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { UploadComponent } from './components/upload/upload.component';
import { ManageImagesComponent } from './components/manage-images/manage-images.component';
import { ManageUsersComponent } from './components/manage-users/manage-users.component';
import { SearchComponent } from '../user/components/search/search.component';
import { ResultsComponent } from '../user/components/results/results.component';
import { SettingsComponent } from './components/settings/settings.component';

export const adminRoutes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    data: { title: 'admin.dashboard', showBackButton: false }
  },
  {
    path: 'upload',
    component: UploadComponent,
    data: { title: 'admin.uploadImages', showBackButton: true, backRoute: '/admin' }
  },
  {
    path: 'manage',
    component: ManageImagesComponent,
    data: { title: 'admin.manageImages', showBackButton: true, backRoute: '/admin' }
  },
  {
    path: 'users',
    component: ManageUsersComponent,
    data: { title: 'admin.manageUsers', showBackButton: true, backRoute: '/admin' }
  },
  {
    path: 'search',
    component: SearchComponent,
    data: { title: 'admin.imageSearch', showBackButton: false }
  },
  {
    path: 'search/results',
    component: ResultsComponent,
    data: { title: 'user.searchResults', showBackButton: true, backRoute: '/admin/search' }
  },
  {
    path: 'settings',
    component: SettingsComponent,
    data: { title: 'admin.settings.title', showBackButton: true, backRoute: '/admin' }
  }
];
