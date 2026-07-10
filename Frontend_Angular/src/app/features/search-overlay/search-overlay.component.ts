import { CommonModule } from '@angular/common';
import { Component, inject, HostListener, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SearchOverlayService } from './search-overlay.service';

@Component({
  selector: 'app-search-overlay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="so-overlay" *ngIf="svc.isOpen()" (click)="svc.close()"></div>
    <div class="so-panel" *ngIf="svc.isOpen()" [class.so-open]="svc.isOpen()">
      <div class="so-bar">
        <span class="so-icon">&#128269;</span>
        <input class="so-input" [(ngModel)]="query" (input)="onInput()" placeholder="Search clients, bookings, staff, services..." autofocus #inputEl />
        <kbd class="so-hint">ESC</kbd>
      </div>
      <div class="so-hints">
        <span>Search across <strong>Clients</strong>, <strong>Bookings</strong>, <strong>Staff</strong>, <strong>Services</strong></span>
      </div>
      <div class="so-body">
        <div class="so-empty" *ngIf="!query">
          <span class="so-empty-icon">&#128270;</span>
          <p>Type to search across the entire salon system</p>
        </div>
        <div class="so-recent" *ngIf="!query">
          <div class="so-recent-title">Quick Links</div>
          <button class="so-recent-item" (click)="navigate('/app/clients')">&#128101; Clients</button>
          <button class="so-recent-item" (click)="navigate('/app/calendar')">&#128197; Calendar</button>
          <button class="so-recent-item" (click)="navigate('/app/reports')">&#128200; Reports</button>
          <button class="so-recent-item" (click)="navigate('/app/global-search')">&#128269; Advanced Search</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .so-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:1250;animation:so-fade .15s}
    .so-panel{position:fixed;top:12%;left:50%;transform:translateX(-50%);width:560px;max-width:94vw;background:white;border-radius:16px;z-index:1260;box-shadow:0 20px 60px rgba(0,0,0,.18);display:flex;flex-direction:column;overflow:hidden;animation:so-slide .2s ease-out}
    .so-bar{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #e5e7eb}
    .so-icon{font-size:18px;color:#9ca3af}
    .so-input{flex:1;border:0;outline:none;font-size:16px;color:#111}
    .so-input::placeholder{color:#aaa}
    .so-hint{padding:2px 8px;background:#f3f4f6;border-radius:6px;font-size:12px;color:#6b7280;font-family:monospace}
    .so-hints{padding:8px 18px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6}
    .so-body{flex:1;overflow-y:auto;max-height:50vh}
    .so-empty{display:flex;flex-direction:column;align-items:center;padding:40px 20px;text-align:center;color:#9ca3af}
    .so-empty-icon{font-size:36px;margin-bottom:8px}
    .so-empty p{margin:0;font-size:14px}
    .so-recent{padding:12px 18px}
    .so-recent-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:8px}
    .so-recent-item{display:block;width:100%;padding:8px 12px;border:0;background:none;text-align:left;font-size:14px;color:#374151;cursor:pointer;border-radius:8px;transition:background .1s;font-family:inherit}
    .so-recent-item:hover{background:#f3f4f6}
    @keyframes so-fade{from{opacity:0}to{opacity:1}}
    @keyframes so-slide{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
  `]
})
export class SearchOverlayComponent {
  svc = inject(SearchOverlayService);
  private router = inject(Router);

  query = '';
  searching = signal(false);

  onInput(): void {
    if (this.query.length >= 2) {
      this.searching.set(true);
      setTimeout(() => this.searching.set(false), 300);
    }
  }

  navigate(path: string): void {
    this.svc.close();
    this.router.navigateByUrl(path);
  }

  @HostListener('document:keydown.control.slash', ['$event'])
  handleCtrlSlash(event: KeyboardEvent): void {
    event.preventDefault();
    this.svc.toggle();
    setTimeout(() => {
      (document.querySelector('.so-input') as HTMLInputElement)?.focus();
    }, 100);
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.svc.isOpen()) {
      this.svc.close();
    }
  }
}