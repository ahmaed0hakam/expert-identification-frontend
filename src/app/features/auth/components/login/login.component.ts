import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services/auth.service';
import { OfflineSearchService } from '../../../../core/services/offline-search.service';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { LanguageSwitcherComponent } from '../../../../shared/components/language-switcher/language-switcher.component';
import { ROLES } from '@/app/shared/constants/roles';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, IconComponent, LanguageSwitcherComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    public translate: TranslateService,
    private offlineSearchService: OfflineSearchService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    // Initialize offline search in background (non-blocking)
    this.initializeOfflineSearch();
  }

  private async initializeOfflineSearch() {
    try {
      // Check if images are already cached
      const count = await this.offlineSearchService.getCachedImageCount();
      if (count === 0) {
        // Start fetching in background (don't await - non-blocking)
        this.offlineSearchService.initialize().catch(error => {
          console.log('Background offline search initialization:', error);
          // Silently fail - user can still use login
        });
      }
    } catch (error) {
      // Silently fail - user can still use login
      console.log('Offline search check failed:', error);
    }
  }

  navigateToOfflineSearch() {
    this.router.navigate(['/offline-search']);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      
      const { email, password } = this.loginForm.value;
      const success = await this.authService.login(email, password);
      
      if (success) {
        const role = this.authService.getUserRole();
        this.router.navigate([role === ROLES.ADMIN ? '/admin' : '/search']);
      } else {
        this.translate.get('auth.invalidCredentials').subscribe(msg => {
          this.errorMessage = msg;
        });
      }
      
      this.isLoading = false;
    }
  }
}
