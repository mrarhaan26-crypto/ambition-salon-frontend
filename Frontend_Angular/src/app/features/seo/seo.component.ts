import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SeoService } from './seo.service';
import { SeoPage } from './seo.models';

@Component({
  selector: 'app-seo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head"><div><h1>SEO</h1><p>Search engine optimization metadata management.</p></div><button class="primary" (click)="openForm()">+ Add Page</button></div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Loading...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load.</strong><p>{{ error }}</p><button (click)="load()">Retry</button></div>

      <ng-container *ngIf="!loading && !error">
        <div class="toolbar">
          <button class="btn-outline" (click)="generateSitemap()" [disabled]="sitemapBusy">{{ sitemapBusy ? 'Generating...' : 'Generate Sitemap' }}</button>
          <span class="msg" *ngIf="sitemapResult">{{ sitemapResult }}</span>
        </div>
        <div class="empty" *ngIf="items.length===0"><p>No SEO pages configured.</p></div>
        <div class="seo-list" *ngIf="items.length>0">
          <div class="seo-card" *ngFor="let s of items" [class.noindex]="s.noIndex">
            <div class="seo-head">
              <strong>{{ s.route }}</strong>
              <span class="noindex-badge" *ngIf="s.noIndex">noindex</span>
            </div>
            <div class="seo-field"><label>Title</label><span>{{ s.title }}</span></div>
            <div class="seo-field"><label>Description</label><span>{{ s.description }}</span></div>
            <div class="seo-field" *ngIf="s.keywords"><label>Keywords</label><span>{{ s.keywords }}</span></div>
            <div class="seo-actions">
              <button (click)="editItem(s)">Edit</button>
              <button class="btn-remove" (click)="confirmDelete(s)">Delete</button>
            </div>
          </div>
        </div>
      </ng-container>
    </section>

    <div class="drawer-overlay" *ngIf="showForm" (click)="closeForm()">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        <div class="drawer-header"><h2>{{ editingId ? 'Edit SEO' : 'New SEO Page' }}</h2><button class="close-btn" (click)="closeForm()">&times;</button></div>
        <div class="drawer-body">
          <div class="form-group"><label>Route</label><input [(ngModel)]="form.route" placeholder="e.g. /services"></div>
          <div class="form-group"><label>Title</label><input [(ngModel)]="form.title" placeholder="Page title"></div>
          <div class="form-group"><label>Meta Description</label><textarea [(ngModel)]="form.description" placeholder="Meta description"></textarea></div>
          <div class="form-group"><label>Keywords (comma-separated)</label><input [(ngModel)]="form.keywords" placeholder="salon, haircut, beauty"></div>
          <div class="form-group"><label>OG Title</label><input [(ngModel)]="form.ogTitle" placeholder="Open Graph title"></div>
          <div class="form-group"><label>OG Description</label><textarea [(ngModel)]="form.ogDescription" placeholder="Open Graph description"></textarea></div>
          <div class="form-group"><label>OG Image URL</label><input [(ngModel)]="form.ogImage" placeholder="https://..."></div>
          <div class="form-group"><label>Canonical URL</label><input [(ngModel)]="form.canonicalUrl" placeholder="https://yoursalon.com/page"></div>
          <div class="form-group"><label>Schema Markup (JSON-LD)</label><textarea [(ngModel)]="form.schemaMarkup" placeholder='{"@context":"https://schema.org"}' rows="4"></textarea></div>
          <div class="form-group"><label><input type="checkbox" [(ngModel)]="form.noIndex"> No Index (hide from search engines)</label></div>
          <div class="msg" *ngIf="formMsg">{{ formMsg }}</div>
          <div class="drawer-actions"><button (click)="closeForm()">Cancel</button><button class="btn-primary" (click)="save()" [disabled]="formBusy">{{ formBusy ? 'Saving...' : (editingId ? 'Update' : 'Create') }}</button></div>
        </div>
      </div>
    </div>

    <div class="drawer-overlay drawer-centered" *ngIf="showDelete" (click)="showDelete=false">
      <div class="confirm-panel" (click)="$event.stopPropagation()"><h3>Delete</h3><p>{{ deleteMsg }}</p>
        <div class="confirm-actions"><button (click)="showDelete=false">Cancel</button><button class="btn-danger" (click)="doDelete()">Delete</button></div>
      </div>
    </div>
  `,
  styles: [`
    .page{display:grid;gap:24px}
    .head{display:flex;justify-content:space-between;align-items:flex-start}
    h1{font-size:34px;margin:0}p{color:#6b7280;margin:6px 0 0}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white}
    .primary:disabled{opacity:.5;cursor:default}
    .btn-outline{border:1px solid #e5e7eb;border-radius:12px;padding:10px 16px;font-weight:700;cursor:pointer;background:white;color:#374151}
    .btn-outline:disabled{opacity:.4;cursor:default}
    .btn-remove{background:#fee2e2!important;color:#991b1b!important}
    .loading,.error{text-align:center;padding:48px}
    .spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .toolbar{display:flex;gap:12px;align-items:center}
    .msg{padding:8px 14px;background:#f0fdf4;border-radius:10px;color:#16a34a;font-weight:700;font-size:13px}
    .empty{padding:48px;text-align:center;color:#6b7280;background:white;border:1px solid #e5e7eb;border-radius:24px}
    .seo-list{display:grid;gap:8px}
    .seo-card{background:white;border:1px solid #e5e7eb;border-radius:16px;padding:18px;display:grid;gap:6px}
    .seo-card.noindex{opacity:.65}
    .seo-head{display:flex;gap:8px;align-items:center}
    .seo-head strong{font-family:monospace;font-size:14px;color:#0b0b0b}
    .noindex-badge{font-size:9px;font-weight:700;padding:2px 8px;border-radius:12px;background:#fef2f2;color:#991b1b}
    .seo-field{display:grid;grid-template-columns:100px 1fr;gap:8px;font-size:13px}
    .seo-field label{font-weight:700;color:#374151}
    .seo-field span{color:#6b7280;word-break:break-all}
    .seo-actions{display:flex;gap:6px;margin-top:4px}
    .seo-actions button{border:1px solid #e5e7eb;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer;background:white;font-size:11px}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:50}
    .drawer-centered{justify-content:center;align-items:center}
    .drawer-panel{background:white;width:min(520px,100%);max-height:100vh;overflow-y:auto;animation:slideIn .25s ease}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white}
    .drawer-header h2{margin:0}.close-btn{font-size:28px;cursor:pointer;color:#6b7280;border:0;background:transparent}
    .drawer-body{padding:24px 28px;display:grid;gap:16px}
    .form-group{display:grid;gap:6px}
    .form-group label{font-size:13px;font-weight:700;color:#374151}
    .form-group input,.form-group textarea{padding:14px;border:1px solid #e5e7eb;border-radius:14px}
    .form-group textarea{min-height:60px;resize:vertical}
    .drawer-actions{display:flex;gap:10px}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    .btn-primary{background:#0b0b0b;color:white}
    .confirm-panel{background:white;border-radius:24px;padding:28px;width:min(420px,90%)}
    .confirm-actions{display:flex;gap:10px;margin-top:12px}
    .confirm-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    .btn-danger{background:#fee2e2;color:#991b1b}
    @media(max-width:900px){.drawer-panel{width:100%}}
  `]
})
export class SeoComponent {
  private api = inject(SeoService);
  items: SeoPage[] = [];
  loading = true; error = '';
  showForm = false; editingId = '';
  form: any = { route: '', title: '', description: '', keywords: '', ogTitle: '', ogDescription: '', ogImage: '', canonicalUrl: '', schemaMarkup: '', noIndex: false };
  formMsg = ''; formBusy = false;
  sitemapBusy = false; sitemapResult = '';
  showDelete = false; deleteMsg = ''; deleteAction: (() => void) | null = null;

  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    this.api.getPages().subscribe({ next: d => { this.items = d; this.loading = false; }, error: () => { this.error = 'SEO pages unavailable.'; this.loading = false; } });
  }
  openForm() { this.editingId = ''; this.form = { route: '', title: '', description: '', keywords: '', ogTitle: '', ogDescription: '', ogImage: '', canonicalUrl: '', schemaMarkup: '', noIndex: false }; this.formMsg = ''; this.showForm = true; }
  closeForm() { this.showForm = false; }
  editItem(s: SeoPage) {
    this.editingId = s.id;
    this.form = { route: s.route, title: s.title, description: s.description, keywords: s.keywords, ogTitle: s.ogTitle, ogDescription: s.ogDescription, ogImage: s.ogImage, canonicalUrl: s.canonicalUrl, schemaMarkup: s.schemaMarkup, noIndex: s.noIndex };
    this.showForm = true;
  }
  save() {
    this.formBusy = true; this.formMsg = '';
    const obs = this.editingId ? this.api.update(this.editingId, this.form) : this.api.create(this.form);
    obs.subscribe({ next: () => { this.closeForm(); this.formBusy = false; this.load(); }, error: () => { this.formMsg = 'Failed to save.'; this.formBusy = false; } });
  }
  generateSitemap() {
    this.sitemapBusy = true; this.sitemapResult = '';
    this.api.generateSitemap().subscribe({ next: (d) => { this.sitemapResult = `Sitemap generated: ${d.url}`; this.sitemapBusy = false; }, error: () => { this.sitemapResult = 'Failed to generate sitemap.'; this.sitemapBusy = false; } });
  }
  confirmDelete(s: SeoPage) { this.deleteMsg = `Delete SEO for "${s.route}"?`; this.deleteAction = () => { this.api.remove(s.id).subscribe({ next: () => { this.showDelete = false; this.load(); } }); }; this.showDelete = true; }
  doDelete() { if (this.deleteAction) this.deleteAction(); }
}
