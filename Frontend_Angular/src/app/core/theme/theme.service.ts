import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private renderer: Renderer2;
  private current: ThemeMode = 'light';
  private readonly STORAGE_KEY = 'ambition-theme';

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    const saved = localStorage.getItem(this.STORAGE_KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark') {
      this.apply(saved);
    } else {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      this.apply(prefersDark ? 'dark' : 'light');
    }
  }

  get mode(): ThemeMode {
    return this.current;
  }

  toggle(): ThemeMode {
    const next: ThemeMode = this.current === 'light' ? 'dark' : 'light';
    this.apply(next);
    return next;
  }

  private apply(mode: ThemeMode): void {
    this.current = mode;
    if (mode === 'dark') {
      this.renderer.addClass(document.documentElement, 'dark');
    } else {
      this.renderer.removeClass(document.documentElement, 'dark');
    }
    localStorage.setItem(this.STORAGE_KEY, mode);
  }
}
