import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Language {
  code: string;
  name: string;
  flag: string;
  rtl?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLanguageSubject = new BehaviorSubject<string>('en');
  public currentLanguage$ = this.currentLanguageSubject.asObservable();

  // Expandable array of languages - Easy to add new languages!
  public readonly languages: Language[] = [
    { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
    { code: 'en', name: 'English', flag: '🇺🇸', rtl: false },
    { code: 'fr', name: 'Français', flag: '🇫🇷', rtl: false },
    // Add more languages here:
    // { code: 'es', name: 'Español', flag: '🇪🇸', rtl: false },
    // { code: 'de', name: 'Deutsch', flag: '🇩🇪', rtl: false },
    // { code: 'zh', name: '中文', flag: '🇨🇳', rtl: false },
    // { code: 'ja', name: '日本語', flag: '🇯🇵', rtl: false },
  ];

  constructor(private translate: TranslateService) {
    // Set default language
    const savedLanguage = localStorage.getItem('language') || 'en';
    this.setLanguage(savedLanguage);
  }

  setLanguage(langCode: string): void {
    if (this.languages.find(lang => lang.code === langCode)) {
      this.translate.use(langCode);
      this.currentLanguageSubject.next(langCode);
      localStorage.setItem('language', langCode);
      
      // Update document direction for RTL languages
      const language = this.languages.find(l => l.code === langCode);
      if (language) {
        document.documentElement.dir = language.rtl ? 'rtl' : 'ltr';
        document.documentElement.lang = langCode;
      }
    }
  }

  getCurrentLanguage(): string {
    return this.currentLanguageSubject.value;
  }

  getCurrentLanguageInfo(): Language | undefined {
    return this.languages.find(lang => lang.code === this.getCurrentLanguage());
  }

  isRTL(): boolean {
    const current = this.getCurrentLanguageInfo();
    return current?.rtl || false;
  }
}
