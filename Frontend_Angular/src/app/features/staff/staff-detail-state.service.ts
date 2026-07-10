import { Injectable, signal, computed, inject } from '@angular/core';
import { StaffService } from './staff.service';
import { catchError, of } from 'rxjs';
import type { Staff, StaffAttendance, StaffScheduleSlot } from './staff.models';

export interface StaffDetailState {
  staff: Staff | null;
  schedule: StaffScheduleSlot[];
  attendance: StaffAttendance[];
  loading: boolean;
  error: string | null;
  staffId: string | null;
}

@Injectable({ providedIn: 'root' })
export class StaffDetailStateService {
  private staffService = inject(StaffService);

  private state = signal<StaffDetailState>({
    staff: null,
    schedule: [],
    attendance: [],
    loading: false,
    error: null,
    staffId: null,
  });

  readonly staff = computed(() => this.state().staff);
  readonly schedule = computed(() => this.state().schedule);
  readonly attendance = computed(() => this.state().attendance);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly staffId = computed(() => this.state().staffId);

  readonly staffName = computed(() => this.staff()?.fullName || 'Unknown Staff');
  readonly staffRole = computed(() => this.staff()?.role || '');
  readonly staffEmail = computed(() => this.staff()?.email || '');
  readonly staffPhone = computed(() => this.staff()?.phone || '');
  readonly staffSpecialization = computed(() => this.staff()?.specialization || '');
  readonly staffBranch = computed(() => this.staff()?.branchName || '');
  readonly staffIsActive = computed(() => this.staff()?.isActive ?? true);

  load(staffId: string): void {
    if (this.state().staffId === staffId && this.state().staff) return;
    this.state.update(s => ({ ...s, loading: true, error: null, staffId }));
    this.staffService.getById(staffId).pipe(
      catchError(err => {
        this.state.update(s => ({ ...s, loading: false, error: err.message || 'Failed to load staff', staff: null }));
        return of(null);
      })
    ).subscribe(staff => {
      if (!staff) return;
      this.state.update(s => ({ ...s, staff, loading: false }));
    });
  }

  refresh(): void {
    const id = this.staffId();
    if (id) {
      this.state.update(s => ({ ...s, staffId: null }));
      this.load(id);
    }
  }

  clear(): void {
    this.state.set({ staff: null, schedule: [], attendance: [], loading: false, error: null, staffId: null });
  }
}
