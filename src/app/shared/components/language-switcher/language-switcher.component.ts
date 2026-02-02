import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { DropdownComponent, DropdownOption } from '../dropdown/dropdown.component';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule, TranslateModule, DropdownComponent],
  templateUrl: './language-switcher.component.html',
  styleUrls: ['./language-switcher.component.css']
})
export class LanguageSwitcherComponent {
  constructor(public languageService: LanguageService) {}

  get languageOptions(): DropdownOption[] {
    return this.languageService.languages.map(lang => ({
      value: lang.code,
      label: `${lang.name}`
    }));
  }

  get currentLanguage(): string {
    return this.languageService.getCurrentLanguage();
  }

  onLanguageChange(value: string | number): void {
    this.languageService.setLanguage(value as string);
  }
}
