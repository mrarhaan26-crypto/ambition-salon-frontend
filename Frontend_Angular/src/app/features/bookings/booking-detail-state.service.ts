import { Injectable, signal, computed, inject } from '@angular/core';
import { BookingsService } from './bookings.service';
import type { BookingListItem, PaymentInfo, ClientDetail, ActivityLogEntry } from './bookings.models';
import { catchError, of } from 'rxjs';

export interface BookingDetailState {
  booking: BookingListItem | null;
  payments: PaymentInfo[];
  clientDetail: ClientDetail | null;
  activityLog: ActivityLogEntry[];
  loading: boolean;
  paymentsLoading: boolean;
  error: string | null;
  bookingId: string | null;
}

@Injectable({ providedIn: 'root' })
export class BookingDetailStateService {
  private bookingsService = inject(BookingsService);

  private state = signal<BookingDetailState>({
    booking: null,
    payments: [],
    clientDetail: null,
    activityLog: [],
    loading: false,
    paymentsLoading: false,
    error: null,
    bookingId: null,
  });

  readonly booking = computed(() => this.state().booking);
  readonly payments = computed(() => this.state().payments);
  readonly clientDetail = computed(() => this.state().clientDetail);
  readonly activityLog = computed(() => this.state().activityLog);
  readonly loading = computed(() => this.state().loading);
  readonly paymentsLoading = computed(() => this.state().paymentsLoading);
  readonly error = computed(() => this.state().error);
  readonly bookingId = computed(() => this.state().bookingId);

  readonly clientName = computed(() => this.booking()?.client?.fullName || 'Unknown Client');
  readonly bookingTitle = computed(() => this.booking()?.title || '');
  readonly status = computed(() => this.booking()?.status || 'PENDING');
  readonly totalAmount = computed(() => this.booking()?.totalAmount || 0);
  readonly services = computed(() => this.booking()?.services || []);
  readonly staffName = computed(() => this.booking()?.staff?.fullName || 'Unassigned');
  readonly branchName = computed(() => this.booking()?.branch?.name || '');
  readonly startTime = computed(() => this.booking()?.startTime || '');
  readonly endTime = computed(() => this.booking()?.endTime || '');
  readonly notes = computed(() => this.booking()?.notes || '');

  readonly subtotal = computed(() => this.services().reduce((sum, s) => sum + s.price, 0));
  readonly paid = computed(() => this.payments().filter(p => p.status === 'PAID' || p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0));
  readonly due = computed(() => Math.max(0, this.totalAmount() - this.paid()));

  load(id: string): void {
    if (this.state().bookingId === id && this.state().booking) {
      return;
    }
    this.state.update(s => ({ ...s, loading: true, error: null, bookingId: id }));
    this.bookingsService.getById(id).pipe(
      catchError(err => {
        this.state.update(s => ({ ...s, loading: false, error: err.message || 'Failed to load booking' }));
        return of(null);
      })
    ).subscribe(booking => {
      if (!booking) return;
      this.state.update(s => ({ ...s, booking, loading: false }));
      this.loadPayments(id);
      this.loadClient(booking.clientId);
      this.buildActivityLog(booking);
    });
  }

  refresh(): void {
    const id = this.bookingId();
    if (id) {
      this.state.update(s => ({ ...s, bookingId: null }));
      this.load(id);
    }
  }

  clear(): void {
    this.state.set({
      booking: null, payments: [], clientDetail: null, activityLog: [],
      loading: false, paymentsLoading: false, error: null, bookingId: null,
    });
  }

  private loadPayments(bookingId: string): void {
    this.state.update(s => ({ ...s, paymentsLoading: true }));
    this.bookingsService.getBookingPayments(bookingId).pipe(
      catchError(() => of([] as PaymentInfo[]))
    ).subscribe(payments => {
      this.state.update(s => ({ ...s, payments, paymentsLoading: false }));
    });
  }

  private loadClient(clientId: string): void {
    this.bookingsService.getClientDetail(clientId).pipe(
      catchError(() => of(null as unknown as ClientDetail))
    ).subscribe(clientDetail => {
      this.state.update(s => ({ ...s, clientDetail }));
    });
  }

  private buildActivityLog(booking: BookingListItem): void {
    const log: ActivityLogEntry[] = [];
    log.push({ action: 'Booking created', timestamp: booking.createdAt, user: 'System', details: `Status: ${booking.status}` });
    if (booking.updatedAt !== booking.createdAt) {
      log.push({ action: 'Booking updated', timestamp: booking.updatedAt, user: 'System' });
    }
    this.state.update(s => ({ ...s, activityLog: log }));
  }

  updateBooking(partial: Partial<BookingListItem>): void {
    this.state.update(s => ({
      ...s,
      booking: s.booking ? { ...s.booking, ...partial } : null,
    }));
  }
}
