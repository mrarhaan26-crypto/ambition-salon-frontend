import { CommonModule } from '@angular/common';
import { Component, inject, HostListener } from '@angular/core';
import { EnterpriseDrawerService } from '../../core/layouts/enterprise-drawer.service';
import { NotificationDrawerComponent } from './notification-drawer.component';
import { AiAssistantDrawerComponent } from './ai-assistant-drawer.component';
import { QuickViewDrawerComponent } from './quick-view-drawer.component';
import { QuickEditDrawerComponent } from './quick-edit-drawer.component';
import { QuickCreateDrawerComponent } from './quick-create-drawer.component';

@Component({
  selector: 'app-enterprise-drawer',
  standalone: true,
  imports: [CommonModule, NotificationDrawerComponent, AiAssistantDrawerComponent, QuickViewDrawerComponent, QuickEditDrawerComponent, QuickCreateDrawerComponent],
  template: `
    <!-- Right Drawer -->
    <div class="ed-overlay" *ngIf="drawerSvc.isRightOpen()" (click)="drawerSvc.close('right')"></div>
    <div class="ed-drawer ed-right" *ngIf="drawerSvc.isRightOpen()" [class.ed-open]="drawerSvc.isRightOpen()">
      <div class="ed-inner">
        <div class="ed-header">
          <h3 class="ed-title">{{ drawerSvc.activeDrawer()?.title }}</h3>
          <button class="ed-close" (click)="drawerSvc.close('right')">&times;</button>
        </div>
        <div class="ed-body">
          <ng-content></ng-content>
        </div>
      </div>
    </div>

    <!-- Bottom Drawer (mobile) -->
    <div class="ed-overlay ed-overlay-bottom" *ngIf="drawerSvc.isBottomOpen()" (click)="drawerSvc.close('bottom')"></div>
    <div class="ed-drawer ed-bottom" *ngIf="drawerSvc.isBottomOpen()" [class.ed-open]="drawerSvc.isBottomOpen()">
      <div class="ed-handle"></div>
      <div class="ed-inner">
        <div class="ed-header">
          <h3 class="ed-title">{{ drawerSvc.activeDrawer()?.title }}</h3>
          <button class="ed-close" (click)="drawerSvc.close('bottom')">&times;</button>
        </div>
        <div class="ed-body">
          <ng-content></ng-content>
        </div>
      </div>
    </div>

    <!-- Notification Drawer -->
    <app-notification-drawer
      [visible]="drawerSvc.isNotificationOpen()"
      (close)="drawerSvc.close('notification')">
    </app-notification-drawer>

    <!-- AI Assistant Drawer -->
    <app-ai-assistant-drawer
      [visible]="drawerSvc.isAiAssistantOpen()"
      (close)="drawerSvc.close('ai-assistant')">
    </app-ai-assistant-drawer>

    <!-- Quick View Drawer -->
    <app-quick-view-drawer
      [visible]="drawerSvc.isQuickViewOpen()"
      (close)="drawerSvc.close('quick-view')">
    </app-quick-view-drawer>

    <!-- Quick Edit Drawer -->
    <app-quick-edit-drawer
      [visible]="drawerSvc.isQuickEditOpen()"
      (close)="drawerSvc.close('quick-edit')">
    </app-quick-edit-drawer>

    <!-- Quick Create Drawer -->
    <app-quick-create-drawer
      [visible]="drawerSvc.isQuickCreateOpen()"
      (close)="drawerSvc.close('quick-create')">
    </app-quick-create-drawer>
  `,
  styles: [`
    .ed-overlay{position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:900;animation:ed-fade-in .2s}
    .ed-overlay-bottom{z-index:1100}
    .ed-drawer{position:fixed;background:white;z-index:1000;display:flex;flex-direction:column;transition:transform .25s cubic-bezier(.4,0,.2,1)}
    .ed-right{top:0;right:0;bottom:0;width:480px;max-width:100vw;box-shadow:-4px 0 24px rgba(0,0,0,.1);transform:translateX(100%)}
    .ed-right.ed-open{transform:translateX(0)}
    .ed-bottom{left:0;right:0;bottom:0;max-height:85vh;border-radius:20px 20px 0 0;box-shadow:0 -4px 24px rgba(0,0,0,.12);transform:translateY(100%)}
    .ed-bottom.ed-open{transform:translateY(0)}
    .ed-handle{width:40px;height:4px;background:#d1d5db;border-radius:4px;margin:10px auto 0}
    .ed-inner{display:flex;flex-direction:column;flex:1;overflow:hidden}
    .ed-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #e5e7eb;flex-shrink:0}
    .ed-title{margin:0;font-size:16px;font-weight:700}
    .ed-close{background:none;border:0;font-size:24px;color:#6b7280;cursor:pointer;padding:0;line-height:1;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:background .15s}
    .ed-close:hover{background:#f3f4f6;color:#111}
    .ed-body{flex:1;overflow-y:auto;padding:20px}
    @media(max-width:768px){.ed-right{width:100vw}}
    @keyframes ed-fade-in{from{opacity:0}to{opacity:1}}
  `]
})
export class EnterpriseDrawerComponent {
  protected drawerSvc = inject(EnterpriseDrawerService);

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.drawerSvc.isOpen()) {
      this.drawerSvc.close();
    }
  }
}