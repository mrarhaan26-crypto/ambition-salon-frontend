import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-quick-view-drawer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="qv-overlay" *ngIf="visible" (click)="close.emit()"></div>
    <div class="qv-drawer" *ngIf="visible" [class.qv-open]="visible">
      <div class="qv-header">
        <h3>Quick View</h3>
        <button class="qv-close" (click)="close.emit()">&times;</button>
      </div>
      <div class="qv-body">
        <div class="qv-empty">
          <span class="qv-icon">&#128065;</span>
          <p>Select an item to preview.</p>
          <span class="qv-sub">Click on a booking, client, or staff member to see details here.</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .qv-overlay{position:fixed;inset:0;background:rgba(0,0,0,.25);z-index:1150;animation:qv-fade .2s}
    .qv-drawer{position:fixed;top:0;right:0;bottom:0;width:420px;max-width:100vw;background:white;z-index:1160;display:flex;flex-direction:column;box-shadow:-4px 0 24px rgba(0,0,0,.12);transform:translateX(100%);transition:transform .25s cubic-bezier(.4,0,.2,1)}
    .qv-drawer.qv-open{transform:translateX(0)}
    .qv-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #e5e7eb;flex-shrink:0}
    .qv-header h3{margin:0;font-size:16px;font-weight:700}
    .qv-close{background:none;border:0;font-size:24px;color:#6b7280;cursor:pointer;line-height:1;padding:4px}
    .qv-body{flex:1;overflow-y:auto;padding:20px}
    .qv-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;text-align:center;color:#9ca3af}
    .qv-empty span{font-size:40px;margin-bottom:12px}
    .qv-empty p{margin:0 0 4px;font-size:15px;color:#6b7280}
    .qv-sub{font-size:13px}
    @media(max-width:768px){.qv-drawer{width:100vw}}
    @keyframes qv-fade{from{opacity:0}to{opacity:1}}
  `]
})
export class QuickViewDrawerComponent {
  @Input() visible = false;
  @Output() close = new EventEmitter<void>();
}