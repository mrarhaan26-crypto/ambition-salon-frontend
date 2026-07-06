import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CalendarView } from './calendar.constants';
import { CalendarToolbarComponent } from './calendar-toolbar.component';
import { CalendarSidebarComponent } from './calendar-sidebar.component';
import { CalendarGridComponent } from './calendar-grid.component';

@Component({
  selector: 'app-calendar-shell',
  standalone: true,
  imports: [CommonModule, CalendarToolbarComponent, CalendarSidebarComponent, CalendarGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="calendar-page" role="application" aria-label="Calendar">
      <app-calendar-toolbar
        [view]="view"
        [currentDate]="currentDate"
        [searchQuery]="searchQuery"
        (goToday)="goToday()"
        (prev)="navigate(-1)"
        (next)="navigate(1)"
        (viewChange)="setView($event)"
        (searchChange)="onSearchChange($event)"
        (refresh)="onRefresh()"
        (settings)="onSettings()"
      >
      </app-calendar-toolbar>

      <div class="calendar-layout" [class.sidebar-collapsed]="sidebarCollapsed">
        <app-calendar-sidebar
          [collapsed]="sidebarCollapsed"
          [currentDate]="currentDate"
          (toggle)="toggleSidebar()"
          (dateSelected)="onDateSelected($event)"
        >
        </app-calendar-sidebar>

        <app-calendar-grid
          [view]="view"
          [currentDate]="currentDate"
          [loading]="loading"
          [empty]="empty"
        >
        </app-calendar-grid>
      </div>
    </section>
  `,
  styles: [`
    .calendar-page {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--soft, #f7f7f7);
      border-radius: 16px;
      overflow: hidden;
    }
    .calendar-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    app-calendar-grid {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 16px;
    }
    app-calendar-sidebar {
      flex-shrink: 0;
    }
    @media (max-width: 1024px) {
      .calendar-layout.sidebar-collapsed app-calendar-sidebar {
        width: 40px;
        min-width: 40px;
      }
    }
    @media (max-width: 768px) {
      app-calendar-grid { padding: 8px; }
    }
  `]
})
export class CalendarShellComponent {
  view: CalendarView = 'month';
  currentDate = new Date();
  sidebarCollapsed = false;
  loading = false;
  empty = true;
  searchQuery = '';

  goToday(): void {
    this.currentDate = new Date();
  }

  navigate(direction: -1 | 1): void {
    const d = new Date(this.currentDate);
    if (this.view === 'day') {
      d.setDate(d.getDate() + direction);
    } else if (this.view === 'week') {
      d.setDate(d.getDate() + 7 * direction);
    } else {
      d.setMonth(d.getMonth() + direction);
    }
    this.currentDate = d;
  }

  setView(v: CalendarView): void {
    this.view = v;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onDateSelected(date: Date): void {
    this.currentDate = date;
    this.view = 'day';
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
  }

  onRefresh(): void {
    // placeholder
  }

  onSettings(): void {
    // placeholder
  }
}
