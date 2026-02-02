import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, IconComponent],
  template: `
    <header class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-3 md:px-4 py-3 md:py-4 flex items-center gap-3 md:gap-4">
        <a *ngIf="showBackButton" [routerLink]="backRoute || '/admin'" 
           class="text-gray-600 hover:text-gray-800 active:text-gray-900 transition touch-manipulation min-h-[44px] flex items-center gap-2">
          <app-icon name="arrow-left" size="20" color="--color-gray-600"></app-icon>
          <span class="hidden sm:inline">{{ 'common.back' | translate }}</span>
        </a>
        <h1 class="text-lg md:text-2xl font-bold text-gray-800 flex-1">{{ title | translate }}</h1>
        <ng-content></ng-content>
      </div>
    </header>
  `,
  styles: []
})
export class AdminHeaderComponent {
  @Input() title: string = '';
  @Input() showBackButton: boolean = false;
  @Input() backRoute: string = '/admin';
}
