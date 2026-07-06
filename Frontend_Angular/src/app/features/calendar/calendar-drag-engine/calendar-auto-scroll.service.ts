import { Injectable, NgZone } from '@angular/core';

export interface AutoScrollConfig {
  edgeThickness: number;
  maxSpeed: number;
  acceleration: number;
  interval: number;
}

const DEFAULT_CONFIG: AutoScrollConfig = {
  edgeThickness: 48,
  maxSpeed: 20,
  acceleration: 1,
  interval: 16,
};

export interface ScrollDirection {
  x: number;
  y: number;
}

@Injectable({ providedIn: 'root' })
export class AutoScrollService {
  private config: AutoScrollConfig = { ...DEFAULT_CONFIG };
  private scrollTarget: HTMLElement | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentSpeed: ScrollDirection = { x: 0, y: 0 };
  private isScrolling = false;

  private getClientRect = () => ({ left: 0, right: 0, top: 0, bottom: 0 });

  attach(element: HTMLElement, config?: Partial<AutoScrollConfig>): void {
    this.scrollTarget = element;
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  detach(): void {
    this.stop();
    this.scrollTarget = null;
  }

  update(clientX: number, clientY: number): ScrollDirection {
    if (!this.scrollTarget) return { x: 0, y: 0 };

    const rect = this.scrollTarget.getBoundingClientRect();
    const edge = this.config.edgeThickness;

    const dir: ScrollDirection = { x: 0, y: 0 };

    if (clientX < rect.left + edge) {
      const dist = rect.left + edge - clientX;
      dir.x = -Math.min(this.config.maxSpeed, dist / edge * this.config.maxSpeed);
    } else if (clientX > rect.right - edge) {
      const dist = clientX - (rect.right - edge);
      dir.x = Math.min(this.config.maxSpeed, dist / edge * this.config.maxSpeed);
    }

    if (clientY < rect.top + edge) {
      const dist = rect.top + edge - clientY;
      dir.y = -Math.min(this.config.maxSpeed, dist / edge * this.config.maxSpeed);
    } else if (clientY > rect.bottom - edge) {
      const dist = clientY - (rect.bottom - edge);
      dir.y = Math.min(this.config.maxSpeed, dist / edge * this.config.maxSpeed);
    }

    this.currentSpeed = dir;

    if ((dir.x !== 0 || dir.y !== 0) && !this.isScrolling) {
      this.startScrollLoop();
    } else if (dir.x === 0 && dir.y === 0 && this.isScrolling) {
      this.stopScrollLoop();
    }

    return dir;
  }

  stop(): void {
    this.stopScrollLoop();
    this.currentSpeed = { x: 0, y: 0 };
  }

  private startScrollLoop(): void {
    if (this.intervalId !== null) return;
    this.isScrolling = true;
    this.intervalId = setInterval(() => {
      this.tick();
    }, this.config.interval);
  }

  private stopScrollLoop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isScrolling = false;
  }

  private tick(): void {
    if (!this.scrollTarget) return;
    const el = this.scrollTarget;
    el.scrollLeft += Math.round(this.currentSpeed.x);
    el.scrollTop += Math.round(this.currentSpeed.y);
  }
}
