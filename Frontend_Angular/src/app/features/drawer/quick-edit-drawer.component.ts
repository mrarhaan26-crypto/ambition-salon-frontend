import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-quick-edit-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="qe-overlay" *ngIf="visible" (click)="close.emit()"></div>
    <div class="qe-drawer" *ngIf="visible" [class.qe-open]="visible">
      <div class="qe-header">
        <h3>Quick Edit</h3>
        <button class="qe-close" (click)="close.emit()">&times;</button>
      </div>
      <div class="qe-body">
        <div class="qe-empty">
          <span class="qe-icon">&#9999;</span>
          <p>Quick edit panel</p>
          <span class="qe-sub">Select an item to edit it inline.</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .qe-overlay{position:fixed;inset:0;background:rgba(0,0,0,.25);z-index:1150;animation:qe-fade .2s}
    .qe-drawer{position:fixed;top:0;right:0;bottom:0;width:400px;max-width:100vw;background:white;z-index:1160;display:flex;flex-direction:column;box-shadow:-4px 0 24px rgba(0,0,0,.12);transform:translateX(100%);transition:transform .25s cubic-bezier(.4,0,.2,1)}
    .qe-drawer.qe-open{transform:translateX(0)}
    .qe-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #e5e7eb;flex-shrink:0}
    .qe-header h3{margin:0;font-size:16px;font-weight:700}
    .qe-close{background:none;border:0;font-size:24px;color:#6b7280;cursor:pointer;line-height:1;padding:4px}
    .qe-body{flex:1;overflow-y:auto;padding:20px}
    .qe-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;text-align:center;color:#9ca3af}
    .qe-empty span{font-size:40px;margin-bottom:12px}
    .qe-empty p{margin:0 0 4px;font-size:15px;color:#6b7280}
    .qe-sub{font-size:13px}
    @media(max-width:768px){.qe-drawer{width:100vw}}
    @keyframes qe-fade{from{opacity:0}to{opacity:1}}
  `]
})
export class QuickEditDrawerComponent {
  @Input() visible = false;
  @Output() close = new EventEmitter<void>();
}