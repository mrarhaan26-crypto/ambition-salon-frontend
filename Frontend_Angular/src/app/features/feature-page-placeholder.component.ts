import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-feature-page-placeholder',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1 class="page-title">{{ title }}</h1>
          <p class="page-subtitle">{{ description }}</p>
        </div>
      </div>
      <div class="header-actions">
        <a class="btn btn-secondary" [routerLink]="parentRoute">Back to {{ parentLabel }}</a>
      </div>
    </div>
    <section class="page-body">
      <div class="placeholder-card">
        <div class="placeholder-icon">{{ icon }}</div>
        <strong>TODO:</strong> {{ todo }}
      </div>
    </section>
  `,
  styles: [`
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
    .header-content { display: flex; align-items: center; gap: 16px; }
    .page-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
    .page-subtitle { margin: 0; color: #6b7280; font-size: 14px; }
    .header-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
    .btn-secondary { background: #fff; color: #374151; border-color: #d1d5db; }
    .btn-secondary:hover { background: #f9fafb; }
    .page-body { padding: 0; }
    .placeholder-card { text-align: center; padding: 48px 24px; background: #f9fafb; border-radius: 12px; border: 1px dashed #d1d5db; color: #6b7280; font-size: 14px; }
    .placeholder-icon { font-size: 48px; margin-bottom: 16px; }
  `]
})
export class FeaturePagePlaceholderComponent {
  private route = inject(ActivatedRoute);
  title = '';
  description = '';
  todo = '';
  icon = '📄';
  parentRoute = '/app';
  parentLabel = 'Dashboard';

  constructor() {
    const data = this.route.snapshot.data;
    this.title = data['title'] || 'Page';
    this.description = data['description'] || '';
    this.todo = data['todo'] || 'Replace with enterprise-page-header and full implementation.';
    this.icon = data['icon'] || '📄';
    this.parentRoute = data['parentRoute'] || '/app';
    this.parentLabel = data['parentLabel'] || 'Dashboard';
  }
}
