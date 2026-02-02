import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '../icon/icon.component';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-header',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, IconComponent],
  template: `
    <header class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-3 md:px-4 py-3 md:py-4 flex items-center gap-3 md:gap-4">
        <a *ngIf="showBackButton" [routerLink]="backRoute || '/search'" 
           class="text-gray-600 hover:text-gray-800 active:text-gray-900 transition touch-manipulation min-h-[44px] flex items-center gap-2">
          <app-icon name="arrow-left" size="20" color="--color-gray-600"></app-icon>
          <span class="hidden sm:inline">{{ 'common.back' | translate }}</span>
        </a>
        <h1 class="text-lg md:text-2xl font-bold text-gray-800 flex-1">{{ title | translate }}</h1>
        <div class="flex items-center gap-2 md:gap-4">
          <button
            (click)="logout()"
            class="px-3 md:px-4 py-2 text-xs md:text-sm text-gray-600 hover:text-gray-800 active:text-gray-900 transition touch-manipulation min-h-[44px]"
          >
            {{ 'common.logout' | translate }}
          </button>
        </div>
      </div>
    </header>
  `,
  styles: []
})
export class UserHeaderComponent {
  @Input() title: string = 'user.search';
  @Input() showBackButton: boolean = false;
  @Input() backRoute: string = '/search';
  private isLoggingOut = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async logout() {
    if (this.isLoggingOut) {
      return; // Prevent double clicks
    }
    
    this.isLoggingOut = true;
    try {
      await this.authService.logout();
      // Use replaceUrl to prevent back navigation
      await this.router.navigate(['/login'], { replaceUrl: true });
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate even if logout fails
      await this.router.navigate(['/login'], { replaceUrl: true });
    } finally {
      this.isLoggingOut = false;
    }
  }
}
