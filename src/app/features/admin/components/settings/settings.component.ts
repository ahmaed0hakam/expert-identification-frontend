import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService, Language } from '@/app/core/services/language.service';
import { AuthService } from '@/app/core/services/auth.service';
import { IconComponent } from '@/app/shared/components/icon/icon.component';
import { ROLES } from '@/app/shared/constants/roles';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, TranslateModule, IconComponent],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  currentUser: any = null;
  currentLanguage: Language | undefined;
  languages: Language[] = [];

  readonly roles = ROLES;

  constructor(
    private authService: AuthService,
    public languageService: LanguageService
  ) {}

  ngOnInit() {
    // Get current user
    this.currentUser = this.authService.getCurrentUserSync();
    
    // Subscribe to user changes
    this.authService.getCurrentUser().subscribe((user: any) => {
      this.currentUser = user || this.authService.getCurrentUserSync();
    });

    // Get current language info
    this.currentLanguage = this.languageService.getCurrentLanguageInfo();
    this.languages = this.languageService.languages;

    // Subscribe to language changes
    this.languageService.currentLanguage$.subscribe(() => {
      this.currentLanguage = this.languageService.getCurrentLanguageInfo();
    });
  }

  changeLanguage(langCode: string): void {
    this.languageService.setLanguage(langCode);
  }
}
