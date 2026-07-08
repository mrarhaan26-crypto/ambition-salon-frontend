import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CrmClient, CrmPaginatedResponse, CrmDashboardSummary,
  MedicalNote, Allergy, SkinType, HairType, CustomerImage,
  VisitTimelineEntry, FamilyMember, CommunicationRecord,
  ReferralRecord, CustomerSegment, FollowUpTask, AiSuggestion,
  DocumentRecord, ImportResult, ExportPayload,
} from './enterprise-crm.models';

@Injectable({ providedIn: 'root' })
export class EnterpriseCrmService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/crm';
  private clientUrl = environment.apiUrl + '/clients';

  getSummary(): Observable<CrmDashboardSummary> {
    return this.http.get<CrmDashboardSummary>(`${this.apiUrl}/summary`);
  }

  getClients(params?: { search?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: string; segment?: string; riskScoreMin?: number; riskScoreMax?: number; isVip?: boolean; isBlacklisted?: boolean; leadSource?: string; tags?: string }): Observable<CrmPaginatedResponse<CrmClient>> {
    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);
    if (params?.segment) httpParams = httpParams.set('segment', params.segment);
    if (params?.riskScoreMin !== undefined) httpParams = httpParams.set('riskScoreMin', params.riskScoreMin);
    if (params?.riskScoreMax !== undefined) httpParams = httpParams.set('riskScoreMax', params.riskScoreMax);
    if (params?.isVip !== undefined) httpParams = httpParams.set('isVip', params.isVip);
    if (params?.isBlacklisted !== undefined) httpParams = httpParams.set('isBlacklisted', params.isBlacklisted);
    if (params?.leadSource) httpParams = httpParams.set('leadSource', params.leadSource);
    if (params?.tags) httpParams = httpParams.set('tags', params.tags);
    return this.http.get<CrmPaginatedResponse<CrmClient>>(`${this.apiUrl}/clients`, { params: httpParams });
  }

  getClient(id: string): Observable<CrmClient> {
    return this.http.get<CrmClient>(`${this.clientUrl}/${id}`);
  }

  updateClient(id: string, data: Partial<CrmClient>): Observable<CrmClient> {
    return this.http.patch<CrmClient>(`${this.clientUrl}/${id}`, data);
  }

  getMedicalNotes(clientId: string): Observable<MedicalNote[]> {
    return this.http.get<MedicalNote[]>(`${this.clientUrl}/${clientId}/medical-notes`);
  }

  saveMedicalNote(clientId: string, data: Partial<MedicalNote>): Observable<MedicalNote> {
    return this.http.post<MedicalNote>(`${this.clientUrl}/${clientId}/medical-notes`, data);
  }

  deleteMedicalNote(clientId: string, noteId: string): Observable<void> {
    return this.http.delete<void>(`${this.clientUrl}/${clientId}/medical-notes/${noteId}`);
  }

  getAllergies(clientId: string): Observable<Allergy[]> {
    return this.http.get<Allergy[]>(`${this.clientUrl}/${clientId}/allergies`);
  }

  saveAllergy(clientId: string, data: Partial<Allergy>): Observable<Allergy> {
    return this.http.post<Allergy>(`${this.clientUrl}/${clientId}/allergies`, data);
  }

  deleteAllergy(clientId: string, allergyId: string): Observable<void> {
    return this.http.delete<void>(`${this.clientUrl}/${clientId}/allergies/${allergyId}`);
  }

  getSkinType(clientId: string): Observable<SkinType | null> {
    return this.http.get<SkinType | null>(`${this.clientUrl}/${clientId}/skin-type`);
  }

  saveSkinType(clientId: string, data: Partial<SkinType>): Observable<SkinType> {
    return this.http.post<SkinType>(`${this.clientUrl}/${clientId}/skin-type`, data);
  }

  getHairType(clientId: string): Observable<HairType | null> {
    return this.http.get<HairType | null>(`${this.clientUrl}/${clientId}/hair-type`);
  }

  saveHairType(clientId: string, data: Partial<HairType>): Observable<HairType> {
    return this.http.post<HairType>(`${this.clientUrl}/${clientId}/hair-type`, data);
  }

  getCustomerImages(clientId: string): Observable<CustomerImage[]> {
    return this.http.get<CustomerImage[]>(`${this.clientUrl}/${clientId}/images`);
  }

  uploadCustomerImage(clientId: string, data: FormData): Observable<CustomerImage> {
    return this.http.post<CustomerImage>(`${this.clientUrl}/${clientId}/images`, data);
  }

  deleteCustomerImage(clientId: string, imageId: string): Observable<void> {
    return this.http.delete<void>(`${this.clientUrl}/${clientId}/images/${imageId}`);
  }

  getTimeline(clientId: string, params?: { type?: string; from?: string; to?: string; limit?: number }): Observable<VisitTimelineEntry[]> {
    let httpParams = new HttpParams();
    if (params?.type) httpParams = httpParams.set('type', params.type);
    if (params?.from) httpParams = httpParams.set('from', params.from);
    if (params?.to) httpParams = httpParams.set('to', params.to);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    return this.http.get<VisitTimelineEntry[]>(`${this.clientUrl}/${clientId}/timeline`, { params: httpParams });
  }

  getFamilyMembers(clientId: string): Observable<FamilyMember[]> {
    return this.http.get<FamilyMember[]>(`${this.clientUrl}/${clientId}/family`);
  }

  saveFamilyMember(clientId: string, data: Partial<FamilyMember>): Observable<FamilyMember> {
    return this.http.post<FamilyMember>(`${this.clientUrl}/${clientId}/family`, data);
  }

  deleteFamilyMember(clientId: string, memberId: string): Observable<void> {
    return this.http.delete<void>(`${this.clientUrl}/${clientId}/family/${memberId}`);
  }

  getCommunicationHistory(clientId: string, params?: { type?: string; direction?: string; from?: string; to?: string }): Observable<CommunicationRecord[]> {
    let httpParams = new HttpParams();
    if (params?.type) httpParams = httpParams.set('type', params.type);
    if (params?.direction) httpParams = httpParams.set('direction', params.direction);
    if (params?.from) httpParams = httpParams.set('from', params.from);
    if (params?.to) httpParams = httpParams.set('to', params.to);
    return this.http.get<CommunicationRecord[]>(`${this.clientUrl}/${clientId}/communications`, { params: httpParams });
  }

  sendCommunication(clientId: string, data: { type: 'whatsapp' | 'email' | 'sms'; subject?: string; message: string; templateId?: string }): Observable<CommunicationRecord> {
    return this.http.post<CommunicationRecord>(`${this.clientUrl}/${clientId}/communications`, data);
  }

  getReferrals(clientId: string): Observable<ReferralRecord[]> {
    return this.http.get<ReferralRecord[]>(`${this.clientUrl}/${clientId}/referrals`);
  }

  createReferral(clientId: string, data: Partial<ReferralRecord>): Observable<ReferralRecord> {
    return this.http.post<ReferralRecord>(`${this.clientUrl}/${clientId}/referrals`, data);
  }

  getSegments(): Observable<CustomerSegment[]> {
    return this.http.get<CustomerSegment[]>(`${this.apiUrl}/segments`);
  }

  createSegment(data: Partial<CustomerSegment>): Observable<CustomerSegment> {
    return this.http.post<CustomerSegment>(`${this.apiUrl}/segments`, data);
  }

  updateSegment(id: string, data: Partial<CustomerSegment>): Observable<CustomerSegment> {
    return this.http.patch<CustomerSegment>(`${this.apiUrl}/segments/${id}`, data);
  }

  deleteSegment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/segments/${id}`);
  }

  getFollowUpTasks(clientId?: string): Observable<FollowUpTask[]> {
    const params = clientId ? new HttpParams().set('clientId', clientId) : undefined;
    return this.http.get<FollowUpTask[]>(`${this.apiUrl}/follow-ups`, { params });
  }

  createFollowUpTask(data: Partial<FollowUpTask>): Observable<FollowUpTask> {
    return this.http.post<FollowUpTask>(`${this.apiUrl}/follow-ups`, data);
  }

  updateFollowUpTask(id: string, data: Partial<FollowUpTask>): Observable<FollowUpTask> {
    return this.http.patch<FollowUpTask>(`${this.apiUrl}/follow-ups/${id}`, data);
  }

  deleteFollowUpTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/follow-ups/${id}`);
  }

  getAiSuggestions(clientId: string): Observable<AiSuggestion[]> {
    return this.http.get<AiSuggestion[]>(`${this.clientUrl}/${clientId}/ai-suggestions`);
  }

  dismissAiSuggestion(clientId: string, suggestionId: string): Observable<void> {
    return this.http.patch<void>(`${this.clientUrl}/${clientId}/ai-suggestions/${suggestionId}/dismiss`, {});
  }

  getDocuments(clientId: string): Observable<DocumentRecord[]> {
    return this.http.get<DocumentRecord[]>(`${this.clientUrl}/${clientId}/documents`);
  }

  uploadDocument(clientId: string, data: FormData): Observable<DocumentRecord> {
    return this.http.post<DocumentRecord>(`${this.clientUrl}/${clientId}/documents`, data);
  }

  deleteDocument(clientId: string, docId: string): Observable<void> {
    return this.http.delete<void>(`${this.clientUrl}/${clientId}/documents/${docId}`);
  }

  exportClients(payload: ExportPayload): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/export`, payload, { responseType: 'blob' });
  }

  importClients(data: FormData): Observable<ImportResult> {
    return this.http.post<ImportResult>(`${this.apiUrl}/import`, data);
  }
}
