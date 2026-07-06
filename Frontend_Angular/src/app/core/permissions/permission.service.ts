import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private cache: any = null;

  getPermissions(): Observable<any> {
    if (this.cache) return of(this.cache);
    return this.http.get(`${environment.apiUrl}/permissions/me`).pipe(
      tap((d: any) => this.cache = d)
    );
  }

  clearCache() { this.cache = null; }

  can(permission: string): boolean {
    if (!this.cache) return true;
    return !!(this.cache as any)[permission];
  }

  isAdmin(): boolean {
    return this.cache?.isAdmin ?? true;
  }

  getRole(): string {
    return this.cache?.role || 'OWNER';
  }
}
