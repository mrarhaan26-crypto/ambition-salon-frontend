import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BookingsService } from './bookings.service';
import type { BookingListItem, CreateBookingForm } from './bookings.models';
import type { BookingDrawerDraft, BookingDrawerMode } from './booking-drawer.models';

export interface BookingOperationResult {
  success: boolean;
  booking?: BookingListItem;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class BookingOperationsService {
  private bookingsService = inject(BookingsService);

  create(draft: BookingDrawerDraft, branchId: string): Observable<BookingListItem> {
    const body: CreateBookingForm = {
      clientId: draft.customer.id!,
      staffId: draft.schedule.staffId,
      title: draft.services.map(s => s.name).join(', '),
      startTime: `${draft.schedule.date}T${draft.schedule.startTime}`,
      branchId,
      notes: draft.notes || draft.customer.notes,
      services: draft.services.map(s => ({
        serviceId: s.serviceId,
        name: s.name,
        durationMin: s.durationMin,
        price: s.price,
      })),
    };
    return this.bookingsService.create(body);
  }

  update(bookingId: string, draft: BookingDrawerDraft): Observable<BookingListItem> {
    const body = {
      staffId: draft.schedule.staffId,
      title: draft.services.map(s => s.name).join(', '),
      startTime: `${draft.schedule.date}T${draft.schedule.startTime}`,
      endTime: `${draft.schedule.date}T${draft.schedule.endTime}`,
      notes: draft.notes || draft.customer.notes,
    };
    return this.bookingsService.update(bookingId, body);
  }

  reschedule(bookingId: string, date: string, startTime: string): Observable<BookingListItem> {
    const body = { startTime: `${date}T${startTime}` };
    return this.bookingsService.reschedule(bookingId, body);
  }

  cancel(bookingId: string, reason?: string): Observable<BookingListItem> {
    return this.bookingsService.cancel(bookingId, reason ? { reason } : undefined);
  }

  restore(bookingId: string): Observable<BookingListItem> {
    return this.bookingsService.updateStatus(bookingId, 'CONFIRMED');
  }

  updateStatus(bookingId: string, status: string): Observable<BookingListItem> {
    return this.bookingsService.updateStatus(bookingId, status);
  }

  remove(bookingId: string): Observable<void> {
    return this.bookingsService.remove(bookingId);
  }

  duplicate(bookingId: string): Observable<BookingListItem> {
    return this.bookingsService.getById(bookingId).pipe(
      tap((original) => {
        // duplicate via create with original data
      }),
    );
  }
}
