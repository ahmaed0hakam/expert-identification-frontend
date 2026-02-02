import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { UserHeaderComponent } from '../../components/user-header/user-header.component';
import { UserNavComponent } from '../../components/user-nav/user-nav.component';
import { ToastComponent } from '../../components/toast/toast.component';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, UserHeaderComponent, UserNavComponent, ToastComponent],
  template: `
    <div class="min-h-screen bg-gray-50 safe-top safe-bottom">
      <app-user-header [title]="headerTitle"></app-user-header>
      <app-user-nav></app-user-nav>
      <main class="pb-16 md:pb-0">
        <router-outlet></router-outlet>
      </main>
      <app-toast></app-toast>
    </div>
  `,
  styles: []
})
export class UserLayoutComponent implements OnInit, OnDestroy {
  headerTitle: string = 'user.search';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router
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
  }
}
