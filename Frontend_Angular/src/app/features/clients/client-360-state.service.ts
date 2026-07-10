import { Injectable, signal, computed, inject } from '@angular/core';
import { ClientsService } from './clients.service';
import { BookingsService } from '../bookings/bookings.service';
import { WalletService } from '../wallet/wallet.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { catchError, of } from 'rxjs';
import type { Client } from './client.model';
import type { BookingListItem, PaymentInfo } from '../bookings/bookings.models';

export interface Client360State {
  client: Client | null;
  bookings: BookingListItem[];
  payments: PaymentInfo[];
  loading: boolean;
  error: string | null;
  clientId: string | null;
}

@Injectable({ providedIn: 'root' })
export class Client360StateService {
  private clientsService = inject(ClientsService);
  private bookingsService = inject(BookingsService);
  private walletService = inject(WalletService);
  private loyaltyService = inject(LoyaltyService);

  private state = signal<Client360State>({
    client: null,
    bookings: [],
    payments: [],
    loading: false,
    error: null,
    clientId: null,
  });

  readonly client = computed(() => this.state().client);
  readonly bookings = computed(() => this.state().bookings);
  readonly payments = computed(() => this.state().payments);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly clientId = computed(() => this.state().clientId);

  readonly clientName = computed(() => this.client()?.fullName || 'Unknown Client');
  readonly clientPhone = computed(() => this.client()?.phone || '');
  readonly clientEmail = computed(() => this.client()?.email || '');
  readonly clientGender = computed(() => this.client()?.gender || '');
  readonly clientCity = computed(() => this.client()?.city || '');
  readonly clientDOB = computed(() => this.client()?.dateOfBirth || null);
  readonly createdAt = computed(() => this.client()?.createdAt || '');

  readonly loyaltyPoints = computed(() => this.client()?.loyaltyPoints ?? 0);
  readonly walletBalance = computed(() => this.client()?.walletBalance ?? 0);
  readonly totalVisits = computed(() => this.client()?.totalVisits ?? 0);
  readonly totalSpend = computed(() => this.client()?.totalSpend ?? 0);
  readonly lastVisitAt = computed(() => this.client()?.lastVisitAt || null);

  readonly upcomingBookings = computed(() =>
    this.bookings().filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING' || b.status === 'CHECKED_IN')
  );
  readonly completedBookings = computed(() =>
    this.bookings().filter(b => b.status === 'COMPLETED')
  );
  readonly cancelledBookings = computed(() =>
    this.bookings().filter(b => b.status === 'CANCELLED' || b.status === 'NO_SHOW')
  );
  readonly averageTicket = computed(() =>
    this.completedBookings().length > 0
      ? Math.round(this.completedBookings().reduce((s, b) => s + b.totalAmount, 0) / this.completedBookings().length)
      : 0
  );
  readonly cancellationRate = computed(() => {
    const total = this.bookings().length;
    return total > 0 ? Math.round((this.cancelledBookings().length / total) * 100) : 0;
  });
  readonly noShowRate = computed(() => {
    const total = this.bookings().length;
    const noShows = this.bookings().filter(b => b.status === 'NO_SHOW').length;
    return total > 0 ? Math.round((noShows / total) * 100) : 0;
  });

  load(clientId: string): void {
    if (this.state().clientId === clientId && this.state().client) return;
    this.state.update(s => ({ ...s, loading: true, error: null, clientId }));

    this.clientsService.getClient(clientId).pipe(
      catchError(err => {
        this.state.update(s => ({ ...s, loading: false, error: err.message || 'Failed to load client' }));
        return of(null);
      })
    ).subscribe(client => {
      if (!client) return;
      this.state.update(s => ({ ...s, client, loading: false }));
      this.loadBookings(clientId);
      this.loadPayments(clientId);
    });
  }

  refresh(): void {
    const id = this.clientId();
    if (id) {
      this.state.update(s => ({ ...s, clientId: null }));
      this.load(id);
    }
  }

  clear(): void {
    this.state.set({ client: null, bookings: [], payments: [], loading: false, error: null, clientId: null });
  }

  private loadBookings(clientId: string): void {
    this.bookingsService.getAll({ clientId } as any).pipe(
      catchError(() => of([] as BookingListItem[]))
    ).subscribe(bookings => {
      this.state.update(s => ({ ...s, bookings: Array.isArray(bookings) ? bookings : [] }));
    });
  }

  private loadPayments(clientId: string): void {
    this.state.update(s => ({ ...s, payments: [] }));
  }
}
