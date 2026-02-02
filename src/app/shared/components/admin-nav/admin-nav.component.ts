import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-admin-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, IconComponent],
  template: `
    <!-- Desktop Navigation (Top Bar) -->
    <nav class="hidden md:block bg-white border-b border-gray-200 overflow-x-auto">
      <div class="max-w-7xl mx-auto px-2 md:px-4">
        <div class="flex space-x-2 md:space-x-8 min-w-max">
          <a routerLink="/admin" routerLinkActive="nav-link-active" class="nav-link ml-2 md:ml-4">
            {{ 'admin.dashboard' | translate }}
          </a>
          <a routerLink="/admin/upload" routerLinkActive="nav-link-active" class="nav-link">
            {{ 'admin.uploadImages' | translate }}
          </a>
          <a routerLink="/admin/manage" routerLinkActive="nav-link-active" class="nav-link">
            {{ 'admin.manageImages' | translate }}
          </a>
          <a routerLink="/admin/users" routerLinkActive="nav-link-active" class="nav-link">
            {{ 'admin.manageUsers' | translate }}
          </a>
          <a routerLink="/admin/search" routerLinkActive="nav-link-active" class="nav-link">
            {{ 'admin.imageSearch' | translate }}
          </a>
          <a routerLink="/offline-search" routerLinkActive="nav-link-active" class="nav-link">
            {{ 'offlineSearch.infoTitle' | translate }}
          </a>
          <a routerLink="/admin/settings" routerLinkActive="nav-link-active" class="nav-link">
            {{ 'admin.settings.title' | translate }}
          </a>
        </div>
      </div>
    </nav>

    <!-- Mobile Navigation (Bottom Bar with Icons) -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-bottom">
      <div class="flex justify-around items-center h-16">
        <a 
          routerLink="/admin" 
          routerLinkActive="mobile-nav-active" 
          [routerLinkActiveOptions]="{ exact: true }"
          class="mobile-nav-link flex flex-col items-center justify-center flex-1 h-full"
          [attr.aria-label]="'admin.dashboard' | translate"
        >
          <app-icon name="dashboard" size="24"></app-icon>
        </a>
        <a 
          routerLink="/admin/upload" 
          routerLinkActive="mobile-nav-active" 
          class="mobile-nav-link flex flex-col items-center justify-center flex-1 h-full"
          [attr.aria-label]="'admin.uploadImages' | translate"
        >
          <app-icon name="upload" size="24"></app-icon>
        </a>
        <a 
          routerLink="/admin/manage" 
          routerLinkActive="mobile-nav-active" 
          class="mobile-nav-link flex flex-col items-center justify-center flex-1 h-full"
          [attr.aria-label]="'admin.manageImages' | translate"
        >
          <app-icon name="image" size="24"></app-icon>
        </a>
        <a 
          routerLink="/admin/users" 
          routerLinkActive="mobile-nav-active" 
          class="mobile-nav-link flex flex-col items-center justify-center flex-1 h-full"
          [attr.aria-label]="'admin.manageUsers' | translate"
        >
          <app-icon name="users" size="24"></app-icon>
        </a>
        <a 
          routerLink="/admin/search" 
          routerLinkActive="mobile-nav-active" 
          class="mobile-nav-link flex flex-col items-center justify-center flex-1 h-full"
          [attr.aria-label]="'admin.imageSearch' | translate"
        >
          <app-icon name="search" size="24"></app-icon>
        </a>
        <a 
          routerLink="/admin/settings" 
          routerLinkActive="mobile-nav-active" 
          class="mobile-nav-link flex flex-col items-center justify-center flex-1 h-full"
          [attr.aria-label]="'admin.settings.title' | translate"
        >
          <app-icon name="settings" size="24"></app-icon>
        </a>
      </div>
    </nav>
  `,
  styles: [`
    .mobile-nav-link {
      transition: all 0.2s ease;
      touch-action: manipulation;
      color: #6b7280;
    }
    
    .mobile-nav-link:active {
      background-color: rgba(0, 0, 0, 0.05);
    }
    
    .mobile-nav-link app-icon {
      color: currentColor;
    }
    
    .mobile-nav-active {
      color: var(--color-primary-600);
    }
    
    .mobile-nav-active app-icon {
      color: var(--color-primary-600) !important;
    }
  `]
})
export class AdminNavComponent {
}
