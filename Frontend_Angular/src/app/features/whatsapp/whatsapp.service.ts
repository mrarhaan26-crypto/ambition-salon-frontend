import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WhatsAppSettings, WhatsAppTemplate } from './whatsapp.models';

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/whatsapp';

  getSettings(): Observable<WhatsAppSettings> {
    return this.http.get<WhatsAppSettings>(`${this.baseUrl}/settings`);
  }

  updateSettings(body: Partial<WhatsAppSettings>): Observable<WhatsAppSettings> {
    return this.http.patch<WhatsAppSettings>(`${this.baseUrl}/settings`, body);
  }

  getTemplates(): Observable<WhatsAppTemplate[]> {
    return this.http.get<WhatsAppTemplate[]>(`${this.baseUrl}/templates`);
  }

  createTemplate(body: Partial<WhatsAppTemplate>): Observable<WhatsAppTemplate> {
    return this.http.post<WhatsAppTemplate>(`${this.baseUrl}/templates`, body);
  }

  updateTemplate(id: string, body: Partial<WhatsAppTemplate>): Observable<WhatsAppTemplate> {
    return this.http.patch<WhatsAppTemplate>(`${this.baseUrl}/templates/${id}`, body);
  }

  deleteTemplate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/templates/${id}`);
  }
}
