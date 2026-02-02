import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ROLES } from '@/app/shared/constants/roles';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const currentUser = authService.getCurrentUserSync();
      
      if (currentUser?.role === ROLES.ADMIN) {
        router.navigate(['/admin']);
      } else {
        router.navigate(['/search']);
      }
      return false;
    }
    
    return true;
}
