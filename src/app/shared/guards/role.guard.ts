// src/app/shared/guards/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const expectedRoles = route.data['roles'] as Array<'CLIENTE' | 'EMPLEADO' | 'ADMIN'>;

  if (!authService.isLoggedIn()) {
    authService.redirectUrl = state.url;
    router.navigate(['/auth/login']);
    return false;
  }

  const currentUser = authService.getCurrentUser();

  if (!currentUser || !expectedRoles || expectedRoles.length === 0) {
    router.navigate(['/auth/login']); // Or an unauthorized page
    return false;
  }

  const hasRequiredRole = expectedRoles.some(role => authService.hasRole(role));

  if (hasRequiredRole) {
    return true;
  } else {
    // Redirect to a suitable page if role not matched
    // This could be a generic 'unauthorized' page or back to their respective dashboards
    if (currentUser.rol === 'CLIENTE') {
        router.navigate(['/cliente']);
    } else if (currentUser.rol === 'EMPLEADO' || currentUser.rol === 'ADMIN') {
        router.navigate(['/empleado']);
    } else {
        router.navigate(['/auth/login']);
    }
    return false;
  }
};