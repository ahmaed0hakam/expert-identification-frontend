import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AdminHeaderComponent } from '../../components/admin-header/admin-header.component';
import { AdminNavComponent } from '../../components/admin-nav/admin-nav.component';
import { UserHeaderComponent } from '../../components/user-header/user-header.component';
import { UserNavComponent } from '../../components/user-nav/user-nav.component';
import { LanguageSwitcherComponent } from '../../components/language-switcher/language-switcher.component';
import { IconComponent } from '../../components/icon/icon.component';
import { ToastComponent } from '../../components/toast/toast.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-offline-search-layout',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AdminHeaderComponent,
    AdminNavComponent,
    UserHeaderComponent,
    UserNavComponent,
    LanguageSwitcherComponent,
    IconComponent,
    ToastComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50 safe-top safe-bottom">
      <!-- Header for authenticated admin users -->
      <ng-container *ngIf="isAuthenticated && isAdmin">
        <app-admin-header [title]="'offlineSearch.infoTitle'" [showBackButton]="true" [backRoute]="'/admin/search'">
          <div class="hidden md:flex items-center gap-2 md:gap-4">
            <app-language-switcher></app-language-switcher>
            <button
              (click)="logout()"
              class="px-3 md:px-4 py-2 text-xs md:text-sm text-gray-600 hover:text-gray-800 active:text-gray-900 transition touch-manipulation min-h-[44px]"
            >
              {{ 'common.logout' | translate }}
            </button>
          </div>
          <div class="md:hidden">
            <button
              (click)="logout()"
              class="px-3 py-2 text-xs text-gray-600 hover:text-gray-800 active:text-gray-900 transition touch-manipulation min-h-[44px]"
            >
              {{ 'common.logout' | translate }}
            </button>
          </div>
        </app-admin-header>
        <app-admin-nav></app-admin-nav>
      </ng-container>

      <!-- Header for authenticated regular users -->
      <ng-container *ngIf="isAuthenticated && !isAdmin">
        <app-user-header [title]="'offlineSearch.infoTitle'" [showBackButton]="true" [backRoute]="'/search'"></app-user-header>
        <app-user-nav></app-user-nav>
      </ng-container>

      <!-- Header for non-authenticated users -->
      <ng-container *ngIf="!isAuthenticated">
        <header class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div class="max-w-7xl mx-auto px-3 md:px-4 py-3 md:py-4 flex justify-between items-center">
            <h1 class="text-lg md:text-2xl font-bold text-gray-800">{{ 'offlineSearch.infoTitle' | translate }}</h1>
            <div class="flex items-center gap-2 md:gap-4">
              <app-language-switcher></app-language-switcher>
            </div>
          </div>
        </header>

        <!-- Back to Login -->
        <div class="bg-white border-b border-gray-200">
          <div class="max-w-7xl mx-auto px-3 md:px-4 py-2">
            <button
              (click)="navigateToLogin()"
              class="flex items-center gap-2 text-sm md:text-base text-gray-600 hover:text-gray-800 active:text-gray-900 transition touch-manipulation"
            >
              <app-icon name="arrow-left" size="20" color="--color-gray-600"></app-icon>
              <span>{{ 'auth.login' | translate }}</span>
            </button>
          </div>
        </div>
      </ng-container>

      <!-- Content -->
      <main class="container-content" [class.pb-16]="isAuthenticated" [class.md:pb-0]="isAuthenticated">
        <ng-content></ng-content>
      </main>
      <app-toast></app-toast>
    </div>
  `,
  styles: []
})
export class OfflineSearchLayoutComponent implements OnInit {
  isAuthenticated = false;
  isAdmin = false;
  private isLoggingOut = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check auth state initially
    this.updateAuthState();
    
    // Subscribe to auth state changes
    this.authService.getCurrentUser().subscribe(user => {
      this.updateAuthState();
    });
  }

  private updateAuthState(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.isAdmin = this.authService.getUserRole() === 'admin';
    } else {
      this.isAdmin = false;
    }
  }

  async logout() {
    if (this.isLoggingOut) {
      return;
    }
    
    this.isLoggingOut = true;
    try {
      await this.authService.logout();
      await this.router.navigate(['/login'], { replaceUrl: true });
    } catch (error) {
      console.error('Logout error:', error);
      await this.router.navigate(['/login'], { replaceUrl: true });
    } finally {
      this.isLoggingOut = false;
    }
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
