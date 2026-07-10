import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-notification-drawer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="nd-overlay" *ngIf="visible" (click)="close.emit()"></div>
    <div class="nd-drawer" *ngIf="visible" [class.nd-open]="visible">
      <div class="nd-header">
        <h3>Notifications</h3>
        <button class="nd-close" (click)="close.emit()">&times;</button>
      </div>
      <div class="nd-body">
        <div class="nd-empty">
          <span class="nd-empty-icon">&#128276;</span>
          <p>No notifications yet.</p>
          <span class="nd-empty-sub">Notifications will appear here when triggered.</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nd-overlay{position:fixed;inset:0;background:rgba(0,0,0,.25);z-index:1050;animation:nd-fade .2s}
    .nd-drawer{position:fixed;top:0;right:0;bottom:0;width:380px;max-width:100vw;background:white;z-index:1060;display:flex;flex-direction:column;box-shadow:-4px 0 24px rgba(0,0,0,.12);transform:translateX(100%);transition:transform .25s cubic-bezier(.4,0,.2,1)}
    .nd-drawer.nd-open{transform:translateX(0)}
    .nd-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #e5e7eb;flex-shrink:0}
    .nd-header h3{margin:0;font-size:16px;font-weight:700}
    .nd-close{background:none;border:0;font-size:24px;color:#6b7280;cursor:pointer;line-height:1;padding:4px}
    .nd-body{flex:1;overflow-y:auto;padding:20px}
    .nd-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;text-align:center;color:#9ca3af}
    .nd-empty-icon{font-size:40px;margin-bottom:12px}
    .nd-empty p{margin:0 0 4px;font-size:15px;color:#6b7280}
    .nd-empty-sub{font-size:13px}
    @keyframes nd-fade{from{opacity:0}to{opacity:1}}
  `]
})
export class NotificationDrawerComponent {
  @Input() visible = false;
  @Output() close = new EventEmitter<void>();
}