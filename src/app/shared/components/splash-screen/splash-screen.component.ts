import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="splash-screen" [class.hidden]="isHidden">
      <!-- Background -->
      <div class="background-gradient"></div>
      
      <!-- Decorative Lines (Professional geometric pattern) -->
      <div class="decorative-lines">
        <div class="line line-1"></div>
        <div class="line line-2"></div>
        <div class="line line-3"></div>
      </div>
      
      <!-- Central Content -->
      <div class="splash-content">
        <!-- Logo Container -->
        <div class="logo-container">
          <div class="logo-icon">
            <img src="assets/logo.jpg" [alt]="('common.appName' | translate) + ' Logo'" class="logo-image">
          </div>
          <div class="logo-badge"></div>
        </div>
        
        <!-- App Name -->
        <h1 class="app-name">{{ 'common.appName' | translate }}</h1>
        
        <!-- App Tagline/Subtitle -->
        <p class="app-tagline">{{ 'splash.tagline' | translate }}</p>
        
        <!-- Professional Loading Indicator -->
        <div class="loading-indicator">
          <div class="loading-bar">
            <div class="loading-progress"></div>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="splash-footer">
        <p class="footer-text">{{ 'splash.loading' | translate }}</p>
      </div>
    </div>
  `,
  styles: [`
    .splash-screen {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.6s ease-out, visibility 0.6s ease-out;
      overflow: hidden;
    }

    .splash-screen.hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    /* Background Gradient - Using primary theme colors */
    .background-gradient {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, 
        var(--color-primary-800) 0%,
        var(--color-primary-700) 25%,
        var(--color-primary-800) 50%,
        var(--color-primary-700) 75%,
        var(--color-primary-800) 100%
      );
      z-index: 1;
    }
    
    /* Subtle overlay for depth */
    .background-gradient::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.1) 0%, transparent 70%);
      z-index: 1;
    }

    /* Decorative Lines - Professional geometric pattern */
    .decorative-lines {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2;
      overflow: hidden;
    }

    .line {
      position: absolute;
      background: rgba(255, 255, 255, 0.03);
    }

    .line-1 {
      width: 2px;
      height: 100%;
      left: 20%;
      animation: lineFadeIn 1.5s ease-out;
    }

    .line-2 {
      width: 2px;
      height: 100%;
      right: 20%;
      animation: lineFadeIn 1.5s ease-out 0.3s both;
    }

    .line-3 {
      width: 100%;
      height: 2px;
      top: 50%;
      animation: lineFadeIn 1.5s ease-out 0.6s both;
    }

    @keyframes lineFadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    /* Central Content */
    .splash-content {
      position: relative;
      z-index: 3;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      animation: contentFadeIn 0.8s ease-out;
    }

    @keyframes contentFadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Logo Container - Professional government style */
    .logo-container {
      position: relative;
      margin-bottom: 2.5rem;
      animation: logoFadeIn 1s ease-out 0.3s both;
    }

    .logo-icon {
      width: 140px;
      height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-white);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 20px var(--color-shadow-lg), 0 0 0 2px rgba(255, 255, 255, 0.1);
      position: relative;
      z-index: 2;
    }

    .logo-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 32px;
      height: 32px;
      background: #ffffff;
      border-radius: 50%;
      border: 3px solid #1e3a8a;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      z-index: 3;
      animation: badgeFadeIn 1s ease-out 0.8s both;
    }

    @keyframes logoFadeIn {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes badgeFadeIn {
      from {
        opacity: 0;
        transform: scale(0);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .logo-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 12px;
    }

    /* App Name - Professional government style */
    .app-name {
      font-size: 2.5rem;
      font-weight: 600;
      color: var(--color-white);
      margin: 0 0 0.5rem 0;
      letter-spacing: 0.02em;
      animation: nameFadeIn 1s ease-out 0.5s both;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    /* App Tagline */
    .app-tagline {
      font-size: 0.875rem;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.8);
      margin: 0 0 2.5rem 0;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      animation: taglineFadeIn 1s ease-out 0.7s both;
    }

    @keyframes nameFadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes taglineFadeIn {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Professional Loading Indicator */
    .loading-indicator {
      width: 200px;
      animation: loadingFadeIn 1s ease-out 0.9s both;
    }

    .loading-bar {
      width: 100%;
      height: 3px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    }

    .loading-progress {
      height: 100%;
      width: 30%;
      background: var(--color-white);
      border-radius: 2px;
      animation: loadingProgress 2s ease-in-out infinite;
      box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
    }

    @keyframes loadingProgress {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(400%);
      }
    }

    @keyframes loadingFadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    /* Footer */
    .splash-footer {
      position: absolute;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 3;
      animation: footerFadeIn 1s ease-out 1s both;
    }

    .footer-text {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.6);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin: 0;
    }

    @keyframes footerFadeIn {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    /* Mobile and tablet optimizations (applies until 1024px) */
    @media (max-width: 1023px) {
      .logo-icon {
        width: 110px;
        height: 110px;
        padding: 12px;
      }

      .logo-badge {
        width: 28px;
        height: 28px;
        top: -6px;
        right: -6px;
      }

      .app-name {
        font-size: 2rem;
      }

      .app-tagline {
        font-size: 0.75rem;
      }

      .loading-indicator {
        width: 180px;
      }

      .splash-footer {
        bottom: 1.5rem;
      }
    }
  `]
})
export class SplashScreenComponent implements OnInit, OnDestroy {
  isHidden = false;
  private destroy$ = new Subject<void>();
  private readonly FIRST_LAUNCH_KEY = 'eod_first_launch';
  private readonly MIN_DISPLAY_TIME = 4000; // Minimum 4 seconds (allows animations to complete)
  private hasHidden = false; // Prevent multiple hide calls
  private startTime = Date.now();

  constructor(private router: Router) {}

  ngOnInit() {
    // Show splash screen on every page load
    // Mark as launched (for tracking purposes, but still show splash)
    localStorage.setItem(this.FIRST_LAUNCH_KEY, 'true');

    // Record start time
    this.startTime = Date.now();
    
    // Hide after minimum display time (allowing all animations to complete)
    setTimeout(() => {
      this.safeHideSplash();
    }, this.MIN_DISPLAY_TIME);

    // Also hide when navigation completes (as backup, but respect minimum time)
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // Ensure minimum display time has passed
        const elapsed = Date.now() - this.startTime;
        const remaining = Math.max(0, this.MIN_DISPLAY_TIME - elapsed);
        
        if (remaining > 0) {
          setTimeout(() => {
            this.safeHideSplash();
          }, remaining);
        } else {
          // Add small delay to ensure smooth transition
          setTimeout(() => {
            this.safeHideSplash();
          }, 100);
        }
      });
  }

  private safeHideSplash() {
    // Prevent multiple hide calls
    if (this.hasHidden) {
      return;
    }
    
    // Ensure minimum time has elapsed
    const elapsed = Date.now() - this.startTime;
    if (elapsed < this.MIN_DISPLAY_TIME) {
      const remaining = this.MIN_DISPLAY_TIME - elapsed;
      setTimeout(() => {
        this.hideSplash();
      }, remaining);
    } else {
      this.hideSplash();
    }
  }

  private hideSplash() {
    if (this.hasHidden) {
      return;
    }
    
    this.hasHidden = true;
    this.isHidden = true;
    
    // Remove from DOM after fade-out animation completes
    setTimeout(() => {
      const splashElement = document.querySelector('app-splash-screen');
      if (splashElement) {
        splashElement.remove();
      }
    }, 600); // Match the transition duration (0.6s)
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
