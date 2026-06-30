import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <section class="auth-page">
      <form class="card auth-card" (ngSubmit)="submit()">
        <h1>Login</h1>
        <p>Access your Ambition workspace.</p>

        <input name="email" [(ngModel)]="email" placeholder="Email" type="email" required>
        <input name="password" [(ngModel)]="password" placeholder="Password" type="password" required>

        <button class="btn btn-primary" type="submit" [disabled]="loading">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>

        <p class="error" *ngIf="error">{{ error }}</p>

        <a routerLink="/forgot-password">Forgot password?</a>
        <a routerLink="/register">Create account</a>
      </form>
    </section>
  `,
  styles: [`
    .auth-page{min-height:100vh;display:grid;place-items:center;background:#f7f7f7}
    .auth-card{width:min(420px,calc(100% - 32px));display:grid;gap:16px}
    input{padding:14px;border:1px solid #ddd;border-radius:12px}
    .error{color:#b91c1c;margin:0}
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = false;
  error = '';

  submit() {
    this.error = '';
    this.loading = true;

    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => this.router.navigate(['/app']),
      error: (err) => {
        this.error = err?.error?.message || 'Login failed';
        this.loading = false;
      },
    });
  }
}
