import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookingDetailStateService } from './booking-detail-state.service';

interface GalleryCategory {
  id: string;
  label: string;
  count: number;
}

interface PhotoPlaceholder {
  id: string;
  category: 'before' | 'after' | 'progress' | 'general';
  caption: string;
  uploadedBy: string;
  uploadedAt: string;
  tags: string[];
}

@Component({
  selector: 'app-booking-photos-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="photos-section" role="region" aria-label="Booking photos">
      <header class="section-header">
        <div class="header-top">
          <h3 class="header-title">Photo Gallery</h3>
          <span class="photo-count" *ngIf="!loading()">{{ photos().length }} photos</span>
        </div>
        <p class="header-subtitle">Before and after photos, progress images, and client media</p>
      </header>

      <div *ngIf="loading()" class="state-box loading" role="status">
        <div class="spinner" aria-hidden="true"></div>
        <p>Loading gallery…</p>
      </div>

      <div *ngIf="error()" class="state-box error" role="alert">
        <span class="state-icon" aria-hidden="true">⚠️</span>
        <p>{{ error() }}</p>
      </div>

      <ng-container *ngIf="!loading() && !error()">
        <div class="category-tabs" role="tablist" aria-label="Photo categories">
          <button *ngFor="let cat of categories"
            class="category-tab"
            [class.active]="activeCategory() === cat.id"
            (click)="setCategory(cat.id)"
            role="tab"
            [attr.aria-selected]="activeCategory() === cat.id">
            {{ cat.label }}
            <span class="cat-count">{{ cat.count }}</span>
          </button>
        </div>

        <div class="upload-bar">
          <button class="upload-btn" disabled title="Photo upload not yet available">
            <span aria-hidden="true">📤</span> Upload Photos
          </button>
          <p class="upload-note">File storage integration is pending. Upload will be enabled once connected.</p>
        </div>

        <div *ngIf="filteredPhotos().length === 0" class="state-box empty" role="status">
          <span class="state-icon" aria-hidden="true">🖼️</span>
          <p>No {{ activeCategory() === 'all' ? '' : activeCategory() }} photos yet</p>
          <span class="state-hint">Upload before/after and progress photos for this booking</span>
        </div>

        <div *ngIf="filteredPhotos().length > 0" class="photo-grid" role="list">
          <div *ngFor="let photo of filteredPhotos()" class="photo-card" role="listitem"
            (click)="previewPhoto(photo)"
            (keydown.enter)="previewPhoto(photo)"
            tabindex="0"
            [attr.aria-label]="'Photo: ' + photo.caption">
            <div class="photo-thumb" [style.background]="getCategoryColor(photo.category)">
              <span class="photo-thumb-icon" aria-hidden="true">📷</span>
              <span class="photo-category-badge">{{ photo.category }}</span>
            </div>
            <div class="photo-info">
              <p class="photo-caption">{{ photo.caption }}</p>
              <span class="photo-meta">{{ photo.uploadedBy }} · {{ photo.uploadedAt }}</span>
              <div class="photo-tags" *ngIf="photo.tags.length">
                <span class="tag" *ngFor="let tag of photo.tags">{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <div *ngIf="previewPhotoData" class="preview-overlay" (click)="closePreview()" role="dialog" aria-modal="true" aria-label="Photo preview">
        <div class="preview-card" (click)="$event.stopPropagation()" role="document">
          <button class="preview-close" (click)="closePreview()" aria-label="Close preview">✕</button>
          <div class="preview-image-area" [style.background]="getCategoryColor(previewPhotoData.category)">
            <span class="preview-image-icon" aria-hidden="true">📷</span>
          </div>
          <div class="preview-details">
            <h4>{{ previewPhotoData.caption }}</h4>
            <div class="preview-meta">
              <span>Category: <strong>{{ previewPhotoData.category }}</strong></span>
              <span>Uploaded by: <strong>{{ previewPhotoData.uploadedBy }}</strong></span>
              <span>Date: <strong>{{ previewPhotoData.uploadedAt }}</strong></span>
            </div>
            <div class="preview-tags" *ngIf="previewPhotoData.tags.length">
              <span class="tag" *ngFor="let tag of previewPhotoData.tags">{{ tag }}</span>
            </div>
            <div class="preview-actions">
              <button class="action-btn" disabled title="Download not available">⬇ Download</button>
              <button class="action-btn secondary" disabled title="Delete not available">🗑 Delete</button>
            </div>
            <p class="integration-note">Full preview, zoom, side-by-side comparison, and download will be available once photo storage is connected.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .photos-section{padding:0 4px;max-width:960px}
    .section-header{margin-bottom:20px}
    .header-top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
    .header-title{margin:0;font-size:18px;font-weight:800;color:var(--text-strong,#111827)}
    .photo-count{font-size:13px;color:var(--text-soft,#64748b);background:var(--surface-muted,#f1f5f9);padding:4px 12px;border-radius:20px;font-weight:600}
    .header-subtitle{margin:4px 0 0;font-size:13px;color:var(--text-soft,#64748b)}

    .state-box{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;margin:16px 0}
    .state-icon{font-size:32px;display:block;margin-bottom:8px}
    .state-hint{display:block;margin-top:4px;font-size:12px;color:var(--text-soft,#94a3b8)}
    .state-box.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .state-box.error{color:var(--text-error,#dc2626)}

    .category-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
    .category-tab{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:20px;border:1px solid var(--border-subtle,#e5e7eb);background:var(--surface-card,#fff);font-size:13px;font-weight:600;color:var(--text-soft,#64748b);cursor:pointer;transition:all .15s}
    .category-tab:hover{border-color:var(--accent,#6366f1);color:var(--accent,#6366f1)}
    .category-tab.active{background:var(--accent,#6366f1);color:#fff;border-color:var(--accent,#6366f1)}
    .cat-count{font-size:11px;opacity:.7;background:var(--surface-muted,rgba(0,0,0,.08));padding:1px 6px;border-radius:10px;font-weight:700}
    .category-tab.active .cat-count{background:rgba(255,255,255,.2)}

    .upload-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;background:var(--surface-muted,#f8fafc);border:1px dashed var(--border-subtle,#d1d5db);border-radius:12px;margin-bottom:20px}
    .upload-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:10px;border:none;background:var(--accent,#6366f1);color:#fff;font-weight:700;font-size:13px;cursor:not-allowed;opacity:.5}
    .upload-note{font-size:12px;color:var(--text-soft,#94a3b8);flex:1;min-width:160px}

    .photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
    .photo-card{border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;overflow:hidden;background:var(--surface-card,#fff);cursor:pointer;transition:transform .15s,box-shadow .15s}
    .photo-card:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(15,23,42,.08)}
    .photo-card:focus-visible{outline:2px solid var(--accent,#6366f1);outline-offset:2px}
    .photo-thumb{height:140px;display:flex;align-items:center;justify-content:center;position:relative}
    .photo-thumb-icon{font-size:36px;opacity:.6}
    .photo-category-badge{position:absolute;top:8px;right:8px;padding:2px 8px;border-radius:8px;background:rgba(0,0,0,.4);color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
    .photo-info{padding:10px 12px 12px}
    .photo-caption{margin:0;font-size:13px;font-weight:700;color:var(--text-strong,#111827);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .photo-meta{display:block;font-size:11px;color:var(--text-soft,#94a3b8);margin-top:2px}
    .photo-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
    .tag{font-size:10px;padding:2px 8px;border-radius:6px;background:var(--surface-muted,#f1f5f9);color:var(--text-soft,#64748b);font-weight:600}

    .preview-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
    .preview-card{background:var(--surface-card,#fff);border-radius:18px;max-width:640px;width:100%;max-height:90vh;overflow-y:auto;position:relative}
    .preview-close{position:absolute;top:12px;right:12px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;z-index:1}
    .preview-image-area{height:260px;display:flex;align-items:center;justify-content:center}
    .preview-image-icon{font-size:56px;opacity:.5}
    .preview-details{padding:20px 24px 24px}
    .preview-details h4{margin:0 0 12px;font-size:16px;font-weight:800;color:var(--text-strong,#111827)}
    .preview-meta{display:flex;flex-direction:column;gap:4px;margin-bottom:12px;font-size:13px;color:var(--text-soft,#64748b)}
    .preview-tags{margin-bottom:16px}
    .preview-actions{display:flex;gap:8px;margin-bottom:14px}
    .action-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:10px;border:none;font-weight:700;font-size:13px;cursor:not-allowed;opacity:.5;background:var(--surface-muted,#e5e7eb);color:var(--text-soft,#64748b)}
    .action-btn.secondary{background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb)}
    .integration-note{font-size:12px;color:var(--text-soft,#94a3b8);padding:10px 14px;background:var(--surface-muted,#f8fafc);border-radius:8px;border:1px dashed var(--border-subtle,#d1d5db)}
  `]
})
export class BookingPhotosSectionComponent {
  private state = inject(BookingDetailStateService);

  readonly loading = computed(() => false);
  readonly error = computed(() => null as string | null);

  activeCategory = signal('all');
  previewPhotoData: PhotoPlaceholder | null = null;

  readonly categories: GalleryCategory[] = [
    { id: 'all', label: 'All Photos', count: 0 },
    { id: 'before', label: 'Before', count: 0 },
    { id: 'after', label: 'After', count: 0 },
    { id: 'progress', label: 'Progress', count: 0 },
    { id: 'general', label: 'General', count: 0 },
  ];

  readonly photos = signal<PhotoPlaceholder[]>([]);

  readonly filteredPhotos = computed(() => {
    const cat = this.activeCategory();
    if (cat === 'all') return this.photos();
    return this.photos().filter(p => p.category === cat);
  });

  constructor() {
    this.updateCounts();
  }

  private updateCounts(): void {
    const all = this.photos();
    for (const cat of this.categories) {
      if (cat.id === 'all') cat.count = all.length;
      else cat.count = all.filter(p => p.category === cat.id).length;
    }
  }

  setCategory(id: string): void {
    this.activeCategory.set(id);
  }

  previewPhoto(photo: PhotoPlaceholder): void {
    this.previewPhotoData = photo;
  }

  closePreview(): void {
    this.previewPhotoData = null;
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      before: 'linear-gradient(135deg,#667eea,#764ba2)',
      after: 'linear-gradient(135deg,#11998e,#38ef7d)',
      progress: 'linear-gradient(135deg,#f093fb,#f5576c)',
      general: 'linear-gradient(135deg,#4facfe,#00f2fe)',
    };
    return colors[category] || colors.general;
  }
}

