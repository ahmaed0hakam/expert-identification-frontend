import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';
import { Subscription } from 'rxjs';
import { IconComponent } from '../icon/icon.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, IconComponent, TranslateModule],
  template: `
    <div class="toast-container">
      <div
        *ngFor="let toast of toasts(); trackBy: trackById"
        [class]="getToastClasses(toast.type)"
        class="toast"
      >
        <div class="toast-content">
          <app-icon 
            [name]="getIconName(toast.type)" 
            [size]="20"
            class="toast-icon"
          ></app-icon>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
        <button
          (click)="removeToast(toast.id)"
          class="toast-close"
          [attr.aria-label]="'common.close' | translate"
        >
          <app-icon name="close" size="16"></app-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 100%;
      width: 100%;
      padding: 0 1rem;
      pointer-events: none;
    }

    /* Desktop styles (starts at 1024px) */
    @media (min-width: 1024px) {
      .toast-container {
        width: auto;
        max-width: 28rem;
        padding: 0;
      }
    }

    .toast {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      border-radius: 0.5rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      pointer-events: auto;
      animation: slideInRight 0.3s ease-out;
      min-height: 3.5rem;
      background-color: var(--color-white);
      backdrop-filter: blur(10px);
    }

    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      min-width: 0;
    }

    .toast-icon {
      flex-shrink: 0;
    }

    .toast-message {
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 500;
      word-wrap: break-word;
      flex: 1;
    }

    .toast-close {
      flex-shrink: 0;
      margin-left: 0.75rem;
      padding: 0.25rem;
      border-radius: 0.25rem;
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
      color: currentColor;
    }

    .toast-close:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }

    .toast-close:active {
      background-color: rgba(0, 0, 0, 0.2);
    }

    /* Success Toast */
    .toast-success {
      background-color: var(--color-white);
      border-left: 4px solid var(--color-success);
      color: var(--color-success-dark);
      box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.2), 0 4px 6px -2px rgba(16, 185, 129, 0.1);
    }

    .toast-success .toast-icon {
      color: var(--color-success);
    }

    /* Error Toast */
    .toast-error {
      background-color: var(--color-white);
      border-left: 4px solid var(--color-danger);
      color: var(--color-danger-dark);
      box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.2), 0 4px 6px -2px rgba(239, 68, 68, 0.1);
    }

    .toast-error .toast-icon {
      color: var(--color-danger);
    }

    /* Warning Toast */
    .toast-warning {
      background-color: var(--color-white);
      border-left: 4px solid var(--color-warning);
      color: var(--color-warning-dark);
      box-shadow: 0 10px 15px -3px rgba(245, 158, 11, 0.2), 0 4px 6px -2px rgba(245, 158, 11, 0.1);
    }

    .toast-warning .toast-icon {
      color: var(--color-warning);
    }

    /* Info Toast */
    .toast-info {
      background-color: var(--color-white);
      border-left: 4px solid var(--color-info);
      color: var(--color-info-dark);
      box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.2), 0 4px 6px -2px rgba(59, 130, 246, 0.1);
    }

    .toast-info .toast-icon {
      color: var(--color-info);
    }

    /* RTL Support */
    [dir="rtl"] .toast-container {
      right: auto;
      left: 1rem;
    }

    [dir="rtl"] .toast {
      border-left: none;
      border-right: 4px solid;
    }

    [dir="rtl"] .toast-close {
      margin-left: 0;
      margin-right: 0.75rem;
    }

    @keyframes slideInLeft {
      from {
        transform: translateX(-100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    [dir="rtl"] .toast {
      animation: slideInLeft 0.3s ease-out;
    }

    /* Mobile optimizations */
    /* Mobile and tablet styles (applies until 1024px) */
    @media (max-width: 1023px) {
      .toast-container {
        top: 0.5rem;
        right: 0.5rem;
        left: 0.5rem;
        width: auto;
      }

      .toast {
        padding: 0.875rem;
        min-height: 3rem;
      }

      .toast-message {
        font-size: 0.8125rem;
      }
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts = signal<Toast[]>([]);
  private subscription?: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.subscription = this.toastService.toasts$.subscribe(toasts => {
      this.toasts.set(toasts);
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  removeToast(id: string): void {
    this.toastService.remove(id);
  }

  getToastClasses(type: Toast['type']): string {
    return `toast-${type}`;
  }

  getIconName(type: Toast['type']): string {
    switch (type) {
      case 'success':
        return 'check';
      case 'error':
        return 'warning';
      case 'warning':
        return 'warning';
      case 'info':
        return 'search';
      default:
        return 'search';
    }
  }

  trackById(index: number, toast: Toast): string {
    return toast.id;
  }
}
