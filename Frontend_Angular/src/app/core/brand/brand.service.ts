import { Injectable, signal } from '@angular/core';

export interface BrandConfig {
  businessName: string;
  shortName: string;
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  faviconUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class BrandService {
  readonly config = signal<BrandConfig>({
    businessName: 'Ambition Unisex Salon',
    shortName: 'AMBITION',
    primaryColor: '#0b0b0b',
    accentColor: '#d4af37',
  });

  update(cfg: Partial<BrandConfig>): void {
    this.config.update(c => ({ ...c, ...cfg }));
  }
}
