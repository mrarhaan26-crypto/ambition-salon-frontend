import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingDetailStateService } from './booking-detail-state.service';

interface FileDocument {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'document' | 'consent' | 'invoice' | 'receipt' | 'medical';
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
  version: number;
}

@Component({
  selector: 'app-booking-files-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="files-section" role="region" aria-label="Booking files">
      <header class="section-header">
        <h3 class="header-title">File Attachments</h3>
        <p class="header-subtitle">Documents, consent forms, invoices, receipts, and medical files</p>
      </header>

      <div *ngIf="loading()" class="state-box loading" role="status">
        <div class="spinner" aria-hidden="true"></div>
        <p>Loading files…</p>
      </div>

      <div *ngIf="error()" class="state-box error" role="alert">
        <span class="state-icon" aria-hidden="true">⚠️</span>
        <p>{{ error() }}</p>
      </div>

      <ng-container *ngIf="!loading() && !error()">
        <div class="upload-bar">
          <button class="upload-btn" disabled title="File upload not yet available">
            <span aria-hidden="true">📤</span> Upload File
          </button>
          <p class="upload-note">File storage integration is pending. Upload PDFs, images, consent forms, invoices, and receipts here.</p>
        </div>

        <div class="toolbar">
          <div class="search-box">
            <span class="search-icon" aria-hidden="true">🔍</span>
            <input type="text" class="search-input" placeholder="Search files…" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" aria-label="Search files">
          </div>
          <div class="filter-chips">
            <button *ngFor="let ft of fileTypes" class="filter-chip" [class.active]="activeFilter() === ft.id" (click)="setFilter(ft.id)">
              {{ ft.label }}
              <span class="filter-count">{{ ft.count }}</span>
            </button>
          </div>
          <button class="sort-btn" (click)="toggleSort()" [attr.aria-label]="'Sort by ' + sortField() + ', ' + sortDir()">
            Sort {{ sortField() }} {{ sortDir() === 'asc' ? '↑' : '↓' }}
          </button>
        </div>

        <div *ngIf="filteredFiles().length === 0" class="state-box empty" role="status">
          <span class="state-icon" aria-hidden="true">📁</span>
          <p>No files found</p>
          <span class="state-hint">{{ searchQuery() ? 'Try a different search term' : 'Upload documents for this booking' }}</span>
        </div>

        <div *ngIf="filteredFiles().length > 0" class="file-table" role="list">
          <div *ngFor="let file of filteredFiles()" class="file-row" role="listitem"
            (click)="previewFile(file)"
            (keydown.enter)="previewFile(file)"
            tabindex="0"
            [attr.aria-label]="'File: ' + file.name">
            <div class="file-icon" [class]="'icon-' + file.type" aria-hidden="true">
              {{ getFileIcon(file.type) }}
            </div>
            <div class="file-info">
              <p class="file-name">{{ file.name }}</p>
              <span class="file-meta">{{ file.uploadedBy }} · {{ formatSize(file.sizeBytes) }} · {{ file.uploadedAt }} · v{{ file.version }}</span>
            </div>
            <div class="file-type-badge">{{ getTypeLabel(file.type) }}</div>
            <button class="file-download" disabled title="Download not available" (click)="$event.stopPropagation()" aria-label="Download {{ file.name }}">⬇</button>
          </div>
        </div>
      </ng-container>

      <div *ngIf="previewFileData" class="preview-overlay" (click)="closePreview()" role="dialog" aria-modal="true" aria-label="File preview">
        <div class="preview-card" (click)="$event.stopPropagation()" role="document">
          <div class="preview-header">
            <h4>{{ previewFileData.name }}</h4>
            <button class="preview-close" (click)="closePreview()" aria-label="Close preview">✕</button>
          </div>
          <div class="preview-body">
            <div class="preview-file-icon-large" aria-hidden="true">{{ getFileIcon(previewFileData.type) }}</div>
            <div class="preview-details">
              <div class="detail-row"><span>Type</span><strong>{{ getTypeLabel(previewFileData.type) }}</strong></div>
              <div class="detail-row"><span>Size</span><strong>{{ formatSize(previewFileData.sizeBytes) }}</strong></div>
              <div class="detail-row"><span>Version</span><strong>{{ previewFileData.version }}</strong></div>
              <div class="detail-row"><span>Uploaded by</span><strong>{{ previewFileData.uploadedBy }}</strong></div>
              <div class="detail-row"><span>Uploaded at</span><strong>{{ previewFileData.uploadedAt }}</strong></div>
            </div>
            <div class="preview-actions">
              <button class="action-btn" disabled>⬇ Download</button>
              <button class="action-btn secondary" disabled>🔄 Replace</button>
              <button class="action-btn secondary" disabled>🗑 Delete</button>
            </div>
            <p class="integration-note">File preview, download, replace, and delete will be available once file storage is connected.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .files-section{padding:0 4px;max-width:960px}
    .section-header{margin-bottom:20px}
    .header-title{margin:0;font-size:18px;font-weight:800;color:var(--text-strong,#111827)}
    .header-subtitle{margin:4px 0 0;font-size:13px;color:var(--text-soft,#64748b)}

    .state-box{text-align:center;padding:40px 20px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);border-radius:14px;margin:16px 0}
    .state-icon{font-size:32px;display:block;margin-bottom:8px}
    .state-hint{display:block;margin-top:4px;font-size:12px;color:var(--text-soft,#94a3b8)}
    .state-box.loading{display:flex;align-items:center;justify-content:center;gap:12px}
    .spinner{width:20px;height:20px;border:2px solid var(--border-subtle,#e5e7eb);border-top-color:var(--accent,#6366f1);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}

    .upload-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;background:var(--surface-muted,#f8fafc);border:1px dashed var(--border-subtle,#d1d5db);border-radius:12px;margin-bottom:20px}
    .upload-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:10px;border:none;background:var(--accent,#6366f1);color:#fff;font-weight:700;font-size:13px;cursor:not-allowed;opacity:.5}
    .upload-note{font-size:12px;color:var(--text-soft,#94a3b8);flex:1;min-width:160px}

    .toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px}
    .search-box{position:relative;flex:1;min-width:180px}
    .search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;pointer-events:none}
    .search-input{width:100%;padding:9px 12px 9px 34px;border:1px solid var(--border-subtle,#e5e7eb);border-radius:10px;font-size:13px;background:var(--surface-card,#fff);color:var(--text-strong,#111827);outline:none}
    .search-input:focus{border-color:var(--accent,#6366f1);box-shadow:0 0 0 3px rgba(99,102,241,.1)}
    .filter-chips{display:flex;gap:4px;flex-wrap:wrap}
    .filter-chip{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:16px;border:1px solid var(--border-subtle,#e5e7eb);background:var(--surface-card,#fff);font-size:12px;font-weight:600;color:var(--text-soft,#64748b);cursor:pointer;transition:all .15s}
    .filter-chip:hover{border-color:var(--accent,#6366f1);color:var(--accent,#6366f1)}
    .filter-chip.active{background:var(--accent,#6366f1);color:#fff;border-color:var(--accent,#6366f1)}
    .filter-count{font-size:10px;opacity:.7}
    .sort-btn{padding:5px 12px;border-radius:8px;border:1px solid var(--border-subtle,#e5e7eb);background:var(--surface-card,#fff);font-size:12px;font-weight:600;color:var(--text-soft,#64748b);cursor:pointer;white-space:nowrap}
    .sort-btn:hover{border-color:var(--accent,#6366f1);color:var(--accent,#6366f1)}

    .file-table{display:flex;flex-direction:column;gap:4px}
    .file-row{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb);cursor:pointer;transition:all .15s}
    .file-row:hover{background:var(--surface-muted,#f8fafc);border-color:var(--accent,#6366f1)}
    .file-row:focus-visible{outline:2px solid var(--accent,#6366f1);outline-offset:2px}
    .file-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
    .file-icon.icon-pdf{background:#fef2f2;color:#dc2626}
    .file-icon.icon-image{background:#f0fdf4;color:#16a34a}
    .file-icon.icon-document{background:#eff6ff;color:#2563eb}
    .file-icon.icon-consent{background:#fefce8;color:#eab308}
    .file-icon.icon-invoice{background:#f5f3ff;color:#7c3aed}
    .file-icon.icon-receipt{background:#f0fdfa;color:#0d9488}
    .file-icon.icon-medical{background:#fff1f2;color:#e11d48}
    .file-info{flex:1;min-width:0}
    .file-name{margin:0;font-size:13px;font-weight:700;color:var(--text-strong,#111827);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .file-meta{font-size:11px;color:var(--text-soft,#94a3b8)}
    .file-type-badge{padding:2px 10px;border-radius:6px;font-size:10px;font-weight:700;background:var(--surface-muted,#f1f5f9);color:var(--text-soft,#64748b);text-transform:uppercase;letter-spacing:.4px;flex-shrink:0}
    .file-download{padding:6px 10px;border-radius:8px;border:1px solid var(--border-subtle,#e5e7eb);background:var(--surface-card,#fff);cursor:not-allowed;opacity:.4;font-size:14px;flex-shrink:0}

    .preview-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
    .preview-card{background:var(--surface-card,#fff);border-radius:18px;max-width:540px;width:100%;max-height:90vh;overflow-y:auto}
    .preview-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border-subtle,#e5e7eb)}
    .preview-header h4{margin:0;font-size:15px;font-weight:800;color:var(--text-strong,#111827)}
    .preview-close{background:none;border:none;font-size:18px;cursor:pointer;padding:4px;color:var(--text-soft,#64748b);border-radius:6px}
    .preview-close:hover{background:var(--surface-muted,#f1f5f9)}
    .preview-body{padding:20px 24px 24px;text-align:center}
    .preview-file-icon-large{font-size:48px;margin-bottom:16px}
    .preview-details{text-align:left;margin-bottom:16px}
    .detail-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-subtle,#f1f5f9);font-size:13px}
    .detail-row span{color:var(--text-soft,#64748b)}
    .preview-actions{display:flex;gap:8px;justify-content:center;margin-bottom:14px;flex-wrap:wrap}
    .action-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:10px;border:none;font-weight:700;font-size:13px;cursor:not-allowed;opacity:.5;background:var(--surface-muted,#e5e7eb);color:var(--text-soft,#64748b)}
    .action-btn.secondary{background:var(--surface-card,#fff);border:1px solid var(--border-subtle,#e5e7eb)}
    .integration-note{font-size:12px;color:var(--text-soft,#94a3b8);padding:10px 14px;background:var(--surface-muted,#f8fafc);border-radius:8px;border:1px dashed var(--border-subtle,#d1d5db);text-align:left}
  `]
})
export class BookingFilesSectionComponent {
  private state = inject(BookingDetailStateService);

  readonly loading = computed(() => false);
  readonly error = computed(() => null as string | null);

  readonly searchQuery = signal('');
  readonly activeFilter = signal('all');
  readonly sortField = signal<'name' | 'date' | 'size'>('date');
  readonly sortDir = signal<'asc' | 'desc'>('desc');
  previewFileData: FileDocument | null = null;

  readonly fileTypes = signal([
    { id: 'all', label: 'All', count: 0 },
    { id: 'pdf', label: 'PDF', count: 0 },
    { id: 'image', label: 'Image', count: 0 },
    { id: 'document', label: 'Document', count: 0 },
    { id: 'consent', label: 'Consent', count: 0 },
    { id: 'invoice', label: 'Invoice', count: 0 },
    { id: 'receipt', label: 'Receipt', count: 0 },
    { id: 'medical', label: 'Medical', count: 0 },
  ]);

  readonly files = signal<FileDocument[]>([]);

  readonly filteredFiles = computed(() => {
    let result = this.files();
    const search = this.searchQuery().toLowerCase();
    if (search) result = result.filter(f => f.name.toLowerCase().includes(search));
    const filter = this.activeFilter();
    if (filter !== 'all') result = result.filter(f => f.type === filter);
    const field = this.sortField();
    const dir = this.sortDir();
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (field === 'name') cmp = a.name.localeCompare(b.name);
      else if (field === 'date') cmp = a.uploadedAt.localeCompare(b.uploadedAt);
      else if (field === 'size') cmp = a.sizeBytes - b.sizeBytes;
      return dir === 'asc' ? cmp : -cmp;
    });
    return result;
  });

  constructor() {
    this.updateCounts();
  }

  private updateCounts(): void {
    const all = this.files();
    for (const ft of this.fileTypes()) {
      if (ft.id === 'all') ft.count = all.length;
      else ft.count = all.filter(f => f.type === ft.id).length;
    }
  }

  setFilter(id: string): void {
    this.activeFilter.set(id);
  }

  toggleSort(): void {
    const fields: Array<'name' | 'date' | 'size'> = ['date', 'name', 'size'];
    const idx = fields.indexOf(this.sortField());
    const nextField = fields[(idx + 1) % fields.length];
    if (nextField === this.sortField()) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(nextField);
      this.sortDir.set('desc');
    }
  }

  previewFile(file: FileDocument): void {
    this.previewFileData = file;
  }

  closePreview(): void {
    this.previewFileData = null;
  }

  getFileIcon(type: string): string {
    const icons: Record<string, string> = {
      pdf: '📄', image: '🖼', document: '📝', consent: '📋',
      invoice: '🧾', receipt: '💰', medical: '🏥',
    };
    return icons[type] || '📄';
  }

  getTypeLabel(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
}
