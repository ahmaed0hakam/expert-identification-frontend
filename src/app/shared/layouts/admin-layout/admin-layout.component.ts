import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { AdminNavComponent } from '../../components/admin-nav/admin-nav.component';
import { AdminHeaderComponent } from '../../components/admin-header/admin-header.component';
import { LanguageSwitcherComponent } from '../../components/language-switcher/language-switcher.component';
import { ToastComponent } from '../../components/toast/toast.component';
import { AuthService } from '../../../core/services/auth.service';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AdminNavComponent, AdminHeaderComponent, LanguageSwitcherComponent, ToastComponent, TranslateModule],
  template: `
    <div class="min-h-screen bg-gray-50 safe-top safe-bottom">
      <app-admin-header [title]="headerTitle" [showBackButton]="showBackButton" [backRoute]="backRoute">
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
      <main class="pb-16 md:pb-0">
        <router-outlet></router-outlet>
      </main>
      <app-toast></app-toast>
    </div>
  `,
  styles: []
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  headerTitle: string = 'admin.dashboard';
  showBackButton: boolean = false;
  backRoute: string = '/admin';
  private destroy$ = new Subject<void>();
  private isLoggingOut = false;

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Update header based on route
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updateHeaderFromRoute();
      });
    
    this.updateHeaderFromRoute();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateHeaderFromRoute() {
    let currentRoute = this.route;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }
    
    const routeData = currentRoute.snapshot.data;
    if (routeData['title']) {
      this.headerTitle = routeData['title'];
    }
    if (routeData['showBackButton'] !== undefined) {
      this.showBackButton = routeData['showBackButton'];
    }
    if (routeData['backRoute']) {
      this.backRoute = routeData['backRoute'];
    }
  }

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
