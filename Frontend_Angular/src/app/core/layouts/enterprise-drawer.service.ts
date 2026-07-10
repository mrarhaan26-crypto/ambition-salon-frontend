import { Injectable, signal, computed } from '@angular/core';

export type DrawerType = 'right' | 'bottom' | 'notification' | 'ai-assistant' | 'quick-view' | 'quick-edit' | 'quick-create';

export interface DrawerConfig {
  type: DrawerType;
  title: string;
  data?: Record<string, unknown>;
  width?: string;
  height?: string;
}

@Injectable({ providedIn: 'root' })
export class EnterpriseDrawerService {
  private stack = signal<DrawerConfig[]>([]);

  readonly activeDrawer = computed(() => this.stack()[this.stack().length - 1] ?? null);
  readonly isOpen = computed(() => this.stack().length > 0);
  readonly drawerCount = computed(() => this.stack().length);
  readonly isRightOpen = computed(() => this.stack().some(d => d.type === 'right'));
  readonly isBottomOpen = computed(() => this.stack().some(d => d.type === 'bottom'));
  readonly isNotificationOpen = computed(() => this.stack().some(d => d.type === 'notification'));
  readonly isAiAssistantOpen = computed(() => this.stack().some(d => d.type === 'ai-assistant'));
  readonly isQuickViewOpen = computed(() => this.stack().some(d => d.type === 'quick-view'));
  readonly isQuickEditOpen = computed(() => this.stack().some(d => d.type === 'quick-edit'));
  readonly isQuickCreateOpen = computed(() => this.stack().some(d => d.type === 'quick-create'));

  open(config: DrawerConfig): void {
    this.stack.update(s => [...s, config]);
  }

  close(type?: DrawerType): void {
    if (type) {
      this.stack.update(s => s.filter(d => d.type !== type));
    } else {
      this.stack.update(s => s.slice(0, -1));
    }
  }

  closeAll(): void {
    this.stack.set([]);
  }
}