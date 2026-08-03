import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

/**
 * Centralized API error handling.
 *
 * - Attaches the bearer token to every authenticated request.
 * - On 401 we clear the session and bounce to /login (typical token-expiry case).
 * - On every other failure we surface a localized toast and rethrow so callers
 *   can still react (e.g. unset busy flags) without each one re-implementing
 *   error UI. Backend errors arrive as { error: { code, message } } from the
 *   global ExceptionHandlingMiddleware so we lift `message` out preferentially.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const token = auth.token;

  const authed = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      // Login form handles its own messaging.
      const isLogin = req.url.includes('/auth/login');

      if (err.status === 401 && !isLogin) {
        auth.logout();
        router.navigateByUrl('/login');
        toast.warn('انتهت الجلسة، يرجى تسجيل الدخول مجددًا');
      } else if (!isLogin) {
        const msg =
          err.error?.error?.message ??
          err.error?.error ??
          err.error?.message ??
          (err.status === 0 ? 'تعذّر الاتصال بالخادم' : 'حدث خطأ غير متوقع');
        toast.error(msg);
      }
      return throwError(() => err);
    })
  );
};
