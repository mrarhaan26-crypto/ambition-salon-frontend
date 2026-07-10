import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EnterpriseFeaturePageComponent } from '../../shared/components/enterprise-feature-page/enterprise-feature-page.component';
import { CalendarStateService, CalendarPrefs, ColorMode, DensityMode, CardMode } from './calendar-state.service';
import { VIEWS } from './calendar.constants';

@Component({
  selector: 'app-calendar-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, EnterpriseFeaturePageComponent],
  template: `
    <app-enterprise-feature-page
      themeKey="calendar"
      title="Calendar Settings"
      subtitle="Configure your calendar preferences and defaults"
      icon="📅"
      [breadcrumbs]="[
        { label: 'Calendar', link: '/app/calendar' },
        { label: 'Settings' }
      ]"
    >
      <div class="settings-grid">
        <section class="settings-section">
          <h3 class="settings-section-title">Default View</h3>
          <div class="settings-field">
            <label class="settings-label">Default Calendar View</label>
            <select class="settings-input" [value]="prefs.defaultView" (change)="update('defaultView', $any($event.target).value)">
              <option *ngFor="let v of viewOptions" [value]="v">{{ v | titlecase }}</option>
            </select>
          </div>
          <div class="settings-field">
            <label class="settings-label">Time Slot Interval (minutes)</label>
            <select class="settings-input" [value]="prefs.slotInterval" (change)="update('slotInterval', +$any($event.target).value)">
              <option [value]="15">15 min</option>
              <option [value]="30">30 min</option>
              <option [value]="60">60 min</option>
            </select>
          </div>
        </section>

        <section class="settings-section">
          <h3 class="settings-section-title">Working Hours</h3>
          <div class="settings-field">
            <label class="settings-label">Start Hour</label>
            <select class="settings-input" [value]="prefs.startHour" (change)="update('startHour', +$any($event.target).value)">
              <option *ngFor="let h of hourOptions" [value]="h">{{ h }}:00</option>
            </select>
          </div>
          <div class="settings-field">
            <label class="settings-label">End Hour</label>
            <select class="settings-input" [value]="prefs.endHour" (change)="update('endHour', +$any($event.target).value)">
              <option *ngFor="let h of endHourOptions" [value]="h">{{ h }}:00</option>
            </select>
          </div>
          <div class="settings-field">
            <label class="settings-label">Buffer Between Appointments (minutes)</label>
            <input type="number" class="settings-input" [value]="prefs.bufferMinutes" (change)="update('bufferMinutes', +$any($event.target).value)" min="0" max="120" />
          </div>
        </section>

        <section class="settings-section">
          <h3 class="settings-section-title">Display</h3>
          <div class="settings-field">
            <label class="settings-label">Week Starts On</label>
            <select class="settings-input" [value]="prefs.weekStartsOn" (change)="update('weekStartsOn', +$any($event.target).value)">
              <option [value]="0">Sunday</option>
              <option [value]="1">Monday</option>
            </select>
          </div>
          <div class="settings-field">
            <label class="settings-label">Time Format</label>
            <select class="settings-input" [value]="prefs.timeFormat" (change)="update('timeFormat', $any($event.target).value)">
              <option value="12h">12-hour</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
          <div class="settings-field">
            <label class="settings-label">Density</label>
            <select class="settings-input" [value]="prefs.density" (change)="update('density', $any($event.target).value)">
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="spacious">Spacious</option>
            </select>
          </div>
          <div class="settings-field">
            <label class="settings-label">Appointment Card Mode</label>
            <select class="settings-input" [value]="prefs.cardMode" (change)="update('cardMode', $any($event.target).value)">
              <option value="compact">Compact</option>
              <option value="expanded">Expanded</option>
            </select>
          </div>
          <div class="settings-field">
            <label class="settings-label">Color Mode</label>
            <select class="settings-input" [value]="prefs.colorMode" (change)="update('colorMode', $any($event.target).value)">
              <option value="status">By Status</option>
              <option value="staff">By Staff</option>
              <option value="service">By Service</option>
              <option value="resource">By Resource</option>
              <option value="source">By Source</option>
              <option value="payment">By Payment</option>
              <option value="vip">By VIP</option>
              <option value="branch">By Branch</option>
            </select>
          </div>
        </section>

        <section class="settings-section">
          <h3 class="settings-section-title">Visibility</h3>
          <div class="settings-field settings-toggle">
            <label class="settings-label">Show Weekends</label>
            <input type="checkbox" [checked]="prefs.showWeekends" (change)="update('showWeekends', $any($event.target).checked)" />
          </div>
          <div class="settings-field settings-toggle">
            <label class="settings-label">Show Current Time Indicator</label>
            <input type="checkbox" [checked]="prefs.showCurrentTime" (change)="update('showCurrentTime', $any($event.target).checked)" />
          </div>
          <div class="settings-field settings-toggle">
            <label class="settings-label">Show Working Hours Shading</label>
            <input type="checkbox" [checked]="prefs.showWorkingHours" (change)="update('showWorkingHours', $any($event.target).checked)" />
          </div>
          <div class="settings-field settings-toggle">
            <label class="settings-label">Confirm Before Drag & Drop</label>
            <input type="checkbox" [checked]="prefs.confirmDragDrop" (change)="update('confirmDragDrop', $any($event.target).checked)" />
          </div>
          <div class="settings-field settings-toggle">
            <label class="settings-label">Auto-scroll to Current Time</label>
            <input type="checkbox" [checked]="prefs.autoScroll" (change)="update('autoScroll', $any($event.target).checked)" />
          </div>
        </section>
      </div>
    </app-enterprise-feature-page>
  `,
  styles: [`
    .settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }
    .settings-section { background: #fff; border: 1px solid var(--border, #e5e7eb); border-radius: 12px; padding: 20px; }
    .settings-section-title { font-size: 15px; font-weight: 700; margin: 0 0 16px; color: var(--text, #111); }
    .settings-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
    .settings-field:last-child { margin-bottom: 0; }
    .settings-label { font-size: 12px; font-weight: 600; color: var(--muted, #6b7280); }
    .settings-input { height: 38px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; padding: 0 10px; font-size: 13px; background: #fff; color: var(--text, #111); }
    .settings-input:focus { outline: 2px solid #0ea5e9; outline-offset: -1px; }
    select.settings-input { cursor: pointer; }
    .settings-toggle { flex-direction: row; align-items: center; justify-content: space-between; }
    .settings-toggle input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: #0ea5e9; }
  `]
})
export class CalendarSettingsPageComponent {
  private state = inject(CalendarStateService);
  prefs = this.state.prefs();
  viewOptions = [...VIEWS];
  hourOptions = Array.from({ length: 12 }, (_, i) => i + 6);
  endHourOptions = Array.from({ length: 10 }, (_, i) => i + 12);

  update<K extends keyof CalendarPrefs>(key: K, value: CalendarPrefs[K]): void {
    this.state.updatePrefs({ [key]: value } as any);
    this.prefs = { ...this.state.prefs() };
  }
}
