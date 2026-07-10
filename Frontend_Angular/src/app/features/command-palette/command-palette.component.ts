import { CommonModule } from '@angular/common';
import { Component, inject, HostListener, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommandPaletteService } from './command-palette.service';
import { EnterpriseDrawerService } from '../../core/layouts/enterprise-drawer.service';
import { COMMAND_PALETTE_ITEMS, type CommandPaletteItem } from './command-palette.models';

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cp-overlay" *ngIf="svc.isOpen()" (click)="svc.close()"></div>
    <div class="cp-palette" *ngIf="svc.isOpen()" [class.cp-open]="svc.isOpen()">
      <div class="cp-inner">
        <div class="cp-search-wrap">
          <span class="cp-search-icon">&#128269;</span>
          <input class="cp-input" [(ngModel)]="query" (keydown.arrow-down)="onArrowDown($event)" (keydown.arrow-up)="onArrowUp($event)" (keydown.enter)="onEnter()" placeholder="Type a command..." autofocus #inputEl />
          <kbd class="cp-hint">ESC</kbd>
        </div>
        <div class="cp-results">
          <div class="cp-group" *ngIf="navigationItems.length > 0">
            <div class="cp-group-title">Navigation</div>
            <button class="cp-item" *ngFor="let item of navigationItems; let i = index" [class.cp-item-selected]="selectedIndex === items.indexOf(item)" (click)="execute(item)" (mouseenter)="selectedIndex = items.indexOf(item)">
              <span class="cp-item-icon" [innerHTML]="item.icon"></span>
              <div class="cp-item-info">
                <span class="cp-item-label">{{ item.label }}</span>
                <span class="cp-item-desc">{{ item.description }}</span>
              </div>
              <kbd class="cp-item-shortcut" *ngIf="item.id === 'go-dashboard'">Ctrl+1</kbd>
              <kbd class="cp-item-shortcut" *ngIf="item.id === 'go-calendar'">Ctrl+2</kbd>
            </button>
          </div>
          <div class="cp-group" *ngIf="actionItems.length > 0">
            <div class="cp-group-title">Actions</div>
            <button class="cp-item" *ngFor="let item of actionItems; let i = index; trackBy: trackById" [class.cp-item-selected]="selectedIndex === items.indexOf(item)" (click)="execute(item)" (mouseenter)="selectedIndex = items.indexOf(item)">
              <span class="cp-item-icon" [innerHTML]="item.icon"></span>
              <div class="cp-item-info">
                <span class="cp-item-label">{{ item.label }}</span>
                <span class="cp-item-desc">{{ item.description }}</span>
              </div>
            </button>
          </div>
          <div class="cp-group" *ngIf="aiItems.length > 0">
            <div class="cp-group-title">AI</div>
            <button class="cp-item" *ngFor="let item of aiItems; let index = i" [class.cp-item-selected]="selectedIndex === items.indexOf(item)" (click)="execute(item)" (mouseenter)="selectedIndex = items.indexOf(item)">
              <span class="cp-item-icon" [innerHTML]="item.icon"></span>
              <div class="cp-item-info">
                <span class="cp-item-label">{{ item.label }}</span>
                <span class="cp-item-desc">{{ item.description }}</span>
              </div>
            </button>
          </div>
          <div class="cp-empty" *ngIf="items.length === 0 && query.length > 0">
            No commands match "{{ query }}"
          </div>
        </div>
        <div class="cp-footer">
          <span><kbd>&uarr;</kbd><kbd>&darr;</kbd> navigate</span>
          <span><kbd>Enter</kbd> select</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cp-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1200;animation:cp-fade .15s}
    .cp-palette{position:fixed;top:15%;left:50%;transform:translateX(-50%);width:580px;max-width:94vw;max-height:60vh;background:white;border-radius:16px;z-index:1210;box-shadow:0 20px 60px rgba(0,0,0,.2);display:flex;flex-direction:column;overflow:hidden;animation:cp-slide .2s ease-out}
    .cp-inner{display:flex;flex-direction:column;max-height:60vh}
    .cp-search-wrap{display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid #e5e7eb;gap:10px;flex-shrink:0}
    .cp-search-icon{font-size:18px;color:#9ca3af}
    .cp-input{flex:1;border:0;outline:none;font-size:16px;color:#111}
    .cp-input::placeholder{color:#9ca3af}
    .cp-hint{padding:2px 8px;background:#f3f4f6;border-radius:6px;font-size:12px;color:#6b7280;font-family:monospace}
    .cp-results{overflow-y:auto;flex:1}
    .cp-group{padding:8px 0}
    .cp-group-title{padding:6px 16px 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af}
    .cp-item{display:flex;align-items:center;gap:12px;width:100%;padding:10px 16px;border:0;background:none;text-align:left;cursor:pointer;transition:background .1s;font-family:inherit}
    .cp-item:hover,.cp-item-selected{background:#f3f4f6}
    .cp-item-icon{width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:#f3f4f6;border-radius:8px;font-size:16px;flex-shrink:0}
    .cp-item-info{flex:1;min-width:0}
    .cp-item-label{display:block;font-size:14px;font-weight:600;color:#111}
    .cp-item-desc{display:block;font-size:12px;color:#6b7280;margin-top:1px}
    .cp-item-shortcut{padding:2px 6px;background:#e5e7eb;border-radius:4px;font-size:11px;color:#6b7280;font-family:monospace;flex-shrink:0}
    .cp-empty{padding:32px 16px;text-align:center;color:#9ca3af;font-size:14px}
    .cp-footer{display:flex;gap:16px;padding:8px 16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;flex-shrink:0}
    .cp-footer kbd{padding:1px 5px;background:#f3f4f6;border-radius:4px;font-family:monospace;font-size:11px;color:#6b7280;margin:0 2px}
    @keyframes cp-fade{from{opacity:0}to{opacity:1}}
    @keyframes cp-slide{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
  `]
})
export class CommandPaletteComponent {
  public svc = inject(CommandPaletteService);
  private router = inject(Router);
  private drawerSvc = inject(EnterpriseDrawerService);

  query = signal('');
  selectedIndex = 0;

  get items(): CommandPaletteItem[] {
    const q = this.query().toLowerCase();
    if (!q) return COMMAND_PALETTE_ITEMS;
    return COMMAND_PALETTE_ITEMS.filter(i =>
      i.label.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
    );
  }

  get navigationItems(): CommandPaletteItem[] { return this.items.filter(i => i.category === 'navigation'); }
  get actionItems(): CommandPaletteItem[] { return this.items.filter(i => i.category === 'actions'); }
  get aiItems(): CommandPaletteItem[] { return this.items.filter(i => i.category === 'ai'); }

  onArrowDown(e: Event): void {
    e.preventDefault();
    this.selectedIndex = Math.min(this.selectedIndex + 1, this.items.length - 1);
  }

  onArrowUp(e: Event): void {
    e.preventDefault();
    this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
  }

  onEnter(): void {
    const item = this.items[this.selectedIndex];
    if (item) this.execute(item);
  }

  execute(item: CommandPaletteItem): void {
    this.svc.close();
    if (item.action.startsWith('/')) {
      this.router.navigateByUrl('/app' + item.action);
    } else if (item.action === 'new-booking') {
      this.router.navigateByUrl('/app/calendar');
    } else if (item.action === 'search-client') {
      this.router.navigateByUrl('/app/clients');
    } else if (item.action === 'open-ai-assistant') {
      this.drawerSvc.open({ type: 'ai-assistant', title: 'AI Assistant' });
    }
  }

  trackBy(index: number, item: CommandPaletteItem): string {
    return item.id;
  }

  @HostListener('document:keydown.control.k', ['$event'])
  handleCtrlK(event: KeyboardEvent): void {
    event.preventDefault();
    this.svc.toggle();
    if (this.svc.isOpen()) {
      setTimeout(() => {
        const input = document.querySelector('.cp-input') as HTMLInputElement;
        input?.focus();
      }, 100);
    }
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.svc.isOpen()) {
      this.svc.close();
    }
  }
}
