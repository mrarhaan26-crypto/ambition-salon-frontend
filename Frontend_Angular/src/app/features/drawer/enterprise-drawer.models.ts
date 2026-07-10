import type { DrawerType } from '../../core/layouts/enterprise-drawer.service';

export interface DrawerPanelData {
  type: DrawerType;
  title: string;
  data?: Record<string, unknown>;
}