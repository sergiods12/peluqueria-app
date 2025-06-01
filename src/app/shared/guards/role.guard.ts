import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service'; // Correct path

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const expectedRoles = route.data['roles'] as Array<'CLIENTE' | 'EMPLEADO' | 'ADMIN'>;

  if (!authService.isLoggedIn()) {
    router.navigate(['/auth/login']);
    return false;
  }

  const currentUser = authService.getCurrentUser();
  if (!currentUser || !expectedRoles || expectedRoles.length === 0) {
    // No user or no roles defined for the route, deny access or handle as appropriate
    router.navigate(['/auth/login']); // Or an unauthorized page
    return false;
  }

  const hasRole = expectedRoles.some(role => authService.hasRole(role));

  if (hasRole) {
    return true;
  } else {
    // Redirect to a suitable page if role not matched (e.g., home or unauthorized)
    // For simplicity, redirecting to login or a generic dashboard if available
    if (currentUser.rol === 'CLIENTE') router.navigate(['/cliente']);
    else if (currentUser.rol === 'EMPLEADO' || currentUser.rol === 'ADMIN') router.navigate(['/empleado']);
    else router.navigate(['/auth/login']);
    return false;
  }
};