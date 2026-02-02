import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../../../../shared/components/language-switcher/language-switcher.component';
import { AdminNavComponent } from '../../../../shared/components/admin-nav/admin-nav.component';
import { AdminHeaderComponent } from '../../../../shared/components/admin-header/admin-header.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, LanguageSwitcherComponent, AdminNavComponent, AdminHeaderComponent, IconComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  stats: any = null;
  isLoading = true;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    public translate: TranslateService
  ) {}

  async ngOnInit() {
    await this.loadStats();
  }

  async loadStats() {
    try {
      this.stats = await this.apiService.getStats().toPromise();
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
