import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EnterpriseCrmService } from './enterprise-crm.service';
import {
  CrmClient, CrmDashboardSummary, MedicalNote, Allergy, SkinType, HairType,
  CustomerImage, VisitTimelineEntry, FamilyMember, CommunicationRecord,
  ReferralRecord, CustomerSegment, FollowUpTask, AiSuggestion, DocumentRecord,
  ImportResult, ExportPayload, CrmPaginatedResponse,
} from './enterprise-crm.models';

@Component({
  selector: 'app-enterprise-crm',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="crm">
      <div class="head">
        <div>
          <h1>Enterprise CRM</h1>
          <p>Complete client relationship management with 360° view.</p>
        </div>
        <div class="head-actions">
          <button class="primary" (click)="activeTab = 'export'">Export</button>
          <button class="primary" (click)="activeTab = 'import'">Import</button>
        </div>
      </div>

      <div class="crm-tabs">
        <button *ngFor="let tab of tabs" [class.active]="activeTab === tab.key" (click)="activeTab = tab.key">{{ tab.label }}</button>
      </div>

      <ng-container [ngSwitch]="activeTab">
        <ng-container *ngSwitchCase="'overview'">
          <div class="loading" *ngIf="summaryLoading"><div class="spinner"></div><span>Loading summary...</span></div>
          <div class="error" *ngIf="summaryError">
            <strong>Failed to load summary.</strong><p>{{ summaryError }}</p><button (click)="loadSummary()">Retry</button>
          </div>
          <ng-container *ngIf="!summaryLoading && !summaryError && summary">
            <div class="kpi-row">
              <div class="kpi"><strong>{{ summary.totalClients }}</strong><span>Total Clients</span></div>
              <div class="kpi"><strong>{{ summary.newClientsThisMonth }}</strong><span>New This Month</span></div>
              <div class="kpi"><strong>{{ summary.activeClients }}</strong><span>Active</span></div>
              <div class="kpi"><strong>{{ summary.vipClients }}</strong><span>VIP</span></div>
              <div class="kpi"><strong>{{ summary.birthdaysThisMonth }}</strong><span>Birthdays 🎂</span></div>
              <div class="kpi"><strong>{{ summary.anniversaryThisMonth }}</strong><span>Anniversary 🎉</span></div>
              <div class="kpi"><strong>{{ summary.pendingReferrals }}</strong><span>Pending Referrals</span></div>
              <div class="kpi"><strong>{{ summary.unreadFollowUps }}</strong><span>Open Follow-ups</span></div>
            </div>
          </ng-container>

          <div class="toolbar">
            <input [(ngModel)]="search" (input)="onSearch()" placeholder="Search by name, phone, email..." class="filter-input">
            <button class="clear-search-btn" *ngIf="search" (click)="clearSearch()">✕</button>
            <select [(ngModel)]="segmentFilter" (change)="loadClients()" class="filter-select">
              <option value="">All Segments</option>
              <option *ngFor="let s of segments" [value]="s.name">{{ s.name }} ({{ s.clientCount }})</option>
            </select>
            <select [(ngModel)]="vipFilter" (change)="loadClients()" class="filter-select">
              <option value="">All Clients</option>
              <option value="vip">VIP Only</option>
              <option value="blacklisted">Blacklisted</option>
              <option value="highRisk">High Risk</option>
            </select>
          </div>

          <div class="loading" *ngIf="clientsLoading"><div class="spinner"></div><span>Loading clients...</span></div>
          <div class="error" *ngIf="clientsError">
            <strong>Failed to load clients.</strong><p>{{ clientsError }}</p><button (click)="loadClients()">Retry</button>
          </div>
          <div class="empty" *ngIf="!clientsLoading && !clientsError && clients.length === 0">
            <p>No clients found.</p>
            <span class="empty-hint" *ngIf="search">Try a different search term.</span>
          </div>
          <div class="grid" *ngIf="!clientsLoading && !clientsError && clients.length > 0">
            <div class="card" *ngFor="let c of clients" (click)="selectClient(c)">
              <div class="card-top">
                <div class="avatar" [class.birthday]="isBirthdayMonth(c.dateOfBirth)" [class.vip]="c.isVip">{{ (c.fullName || '?').charAt(0).toUpperCase() }}</div>
                <div class="card-info">
                  <h3>{{ c.fullName }}</h3>
                  <span class="contact-line" *ngIf="c.phone">{{ c.phone }}</span>
                  <span class="contact-line" *ngIf="c.email">{{ c.email }}</span>
                </div>
              </div>
              <div class="card-indicators">
                <span class="indicator badge-birthday" *ngIf="isBirthdayMonth(c.dateOfBirth)" title="Birthday this month">🎂 Birthday</span>
                <span class="indicator badge-vip" *ngIf="c.isVip" title="VIP">⭐ VIP</span>
                <span class="indicator badge-blacklist" *ngIf="c.isBlacklisted" title="Blacklisted">🚫 Blacklist</span>
                <span class="indicator badge-risk" *ngIf="c.riskScore && c.riskScore >= 70" title="High risk">⚠️ Risk {{ c.riskScore }}</span>
                <span class="indicator badge-segment" *ngIf="c.segment" [title]="c.segment">{{ c.segment }}</span>
              </div>
              <div class="stats">
                <span><strong>{{ c.totalVisits || 0 }}</strong> visits</span>
                <span><strong>{{ (c.totalSpend || 0) | currency }}</strong> spend</span>
                <span><strong>{{ c.loyaltyPoints || 0 }}</strong> pts</span>
              </div>
            </div>
          </div>
          <div class="pagination-bar" *ngIf="!clientsLoading && !clientsError && total > 0">
            <span>{{ total }} client{{ total === 1 ? '' : 's' }} — Page {{ page }} of {{ totalPages }}</span>
            <div class="pagination-controls">
              <select [(ngModel)]="limit" (change)="page = 1; loadClients()" class="page-size-select">
                <option [value]="12">12 / page</option>
                <option [value]="24">24 / page</option>
                <option [value]="48">48 / page</option>
                <option [value]="96">96 / page</option>
              </select>
              <button [disabled]="page <= 1" (click)="goToPage(page - 1)">← Prev</button>
              <span class="page-indicator">{{ page }}</span>
              <button [disabled]="page >= totalPages" (click)="goToPage(page + 1)">Next →</button>
            </div>
          </div>
        </ng-container>

        <ng-container *ngSwitchCase="'client360'">
          <div *ngIf="!selectedClient" class="empty"><p>Select a client from the Overview tab to view their 360° profile.</p></div>
          <ng-container *ngIf="selectedClient">
            <div class="client-hero">
              <div class="hero-avatar" [class.birthday]="isBirthdayMonth(selectedClient.dateOfBirth)">
                {{ (selectedClient.fullName || '?').charAt(0).toUpperCase() }}
              </div>
              <div class="hero-info">
                <h2>{{ selectedClient.fullName }}</h2>
                <p>{{ selectedClient.phone }} {{ selectedClient.email ? '· ' + selectedClient.email : '' }}</p>
                <div class="hero-badges">
                  <span class="badge badge-vip" *ngIf="selectedClient.isVip">⭐ VIP</span>
                  <span class="badge badge-blacklist" *ngIf="selectedClient.isBlacklisted">🚫 Blacklisted</span>
                  <span class="badge badge-segment" *ngIf="selectedClient.segment">{{ selectedClient.segment }}</span>
                  <span class="badge badge-lead" *ngIf="selectedClient.leadSource">📢 {{ selectedClient.leadSource }}</span>
                </div>
              </div>
              <div class="hero-stats">
                <div><strong>{{ selectedClient.totalVisits || 0 }}</strong> Visits</div>
                <div><strong>{{ (selectedClient.totalSpend || 0) | currency }}</strong> Spend</div>
                <div><strong>{{ selectedClient.loyaltyPoints || 0 }}</strong> Points</div>
              </div>
              <button class="close-hero" (click)="selectedClient = null">✕</button>
            </div>

            <div class="sub-tabs">
              <button *ngFor="let st of clientSubTabs" [class.active]="activeClientTab === st.key" (click)="activeClientTab = st.key">{{ st.label }}</button>
            </div>

            <ng-container [ngSwitch]="activeClientTab">
              <div *ngSwitchCase="'profile'" class="detail-section">
                <div class="detail-card">
                  <h3>Contact Information</h3>
                  <div class="info-grid">
                    <div><span>Phone</span><span>{{ selectedClient.phone || '—' }}</span></div>
                    <div><span>Email</span><span>{{ selectedClient.email || '—' }}</span></div>
                    <div><span>Date of Birth</span><span>{{ selectedClient.dateOfBirth ? (selectedClient.dateOfBirth | date:'MMM dd, yyyy') + ' (' + getAgeString(selectedClient.dateOfBirth) + ')' : '—' }}</span></div>
                    <div><span>Gender</span><span>{{ selectedClient.gender || '—' }}</span></div>
                    <div><span>City</span><span>{{ selectedClient.city || '—' }}</span></div>
                    <div><span>Address</span><span>{{ selectedClient.address || '—' }}</span></div>
                    <div><span>Lead Source</span><span>{{ selectedClient.leadSource || '—' }}</span></div>
                    <div><span>Marketing Consent</span><span>{{ selectedClient.marketingConsent ? '✅ Yes' : '❌ No' }}</span></div>
                    <div><span>Risk Score</span><span><span class="risk-badge" [class.high]="(selectedClient.riskScore || 0) >= 70" [class.medium]="(selectedClient.riskScore || 0) >= 40 && (selectedClient.riskScore || 0) < 70" [class.low]="(selectedClient.riskScore || 0) < 40">{{ selectedClient.riskScore ?? '—' }}</span></span></div>
                  </div>
                </div>
              </div>

              <div *ngSwitchCase="'medical'" class="detail-section">
                <div class="detail-card">
                  <h3>Medical Notes</h3>
                  <div class="loading-mini" *ngIf="medicalLoading"><div class="mini-spinner"></div></div>
                  <div class="empty-mini" *ngIf="!medicalLoading && medicalNotes.length === 0">No medical notes recorded.</div>
                  <div class="item-list" *ngIf="!medicalLoading && medicalNotes.length > 0">
                    <div class="item" *ngFor="let m of medicalNotes">
                      <strong>{{ m.condition || 'General Note' }}</strong>
                      <p>{{ m.notes }}</p>
                      <span class="item-meta">{{ m.recordedAt | date:'mediumDate' }}</span>
                      <button class="item-del" (click)="deleteMedical(m.id)">✕</button>
                    </div>
                  </div>
                  <div class="inline-form">
                    <input [(ngModel)]="medicalForm.condition" placeholder="Condition" class="form-input-sm">
                    <input [(ngModel)]="medicalForm.notes" placeholder="Notes" class="form-input-sm">
                    <button class="btn-sm" (click)="saveMedical()">Add</button>
                  </div>
                </div>

                <div class="detail-card">
                  <h3>Allergies</h3>
                  <div class="loading-mini" *ngIf="allergyLoading"><div class="mini-spinner"></div></div>
                  <div class="empty-mini" *ngIf="!allergyLoading && allergies.length === 0">No allergies recorded.</div>
                  <div class="item-list" *ngIf="!allergyLoading && allergies.length > 0">
                    <div class="item" *ngFor="let a of allergies">
                      <strong>{{ a.allergen }}</strong>
                      <span class="severity" [class]="'sev-' + a.severity">{{ a.severity | uppercase }}</span>
                      <p *ngIf="a.reaction">{{ a.reaction }}</p>
                      <button class="item-del" (click)="deleteAllergy(a.id)">✕</button>
                    </div>
                  </div>
                  <div class="inline-form">
                    <input [(ngModel)]="allergyForm.allergen" placeholder="Allergen" class="form-input-sm">
                    <select [(ngModel)]="allergyForm.severity" class="form-input-sm">
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                    <input [(ngModel)]="allergyForm.reaction" placeholder="Reaction" class="form-input-sm">
                    <button class="btn-sm" (click)="saveAllergy()">Add</button>
                  </div>
                </div>

                <div class="detail-card">
                  <h3>Skin Type</h3>
                  <div class="inline-form" *ngIf="!currentSkinType; else skinDisplay">
                    <input [(ngModel)]="skinForm.skinType" placeholder="Skin type" class="form-input-sm">
                    <input [(ngModel)]="skinForm.concerns" placeholder="Concerns" class="form-input-sm">
                    <input [(ngModel)]="skinForm.notes" placeholder="Notes" class="form-input-sm">
                    <button class="btn-sm" (click)="saveSkinType()">Save</button>
                  </div>
                  <ng-template #skinDisplay>
                    <div class="item">
                      <strong>{{ currentSkinType!.skinType }}</strong>
                      <p *ngIf="currentSkinType!.concerns">Concerns: {{ currentSkinType!.concerns }}</p>
                      <p *ngIf="currentSkinType!.notes">{{ currentSkinType!.notes }}</p>
                      <button class="btn-sm" (click)="currentSkinType = null; skinForm.skinType = ''">Edit</button>
                    </div>
                  </ng-template>
                </div>

                <div class="detail-card">
                  <h3>Hair Type</h3>
                  <div class="inline-form" *ngIf="!currentHairType; else hairDisplay">
                    <input [(ngModel)]="hairForm.hairType" placeholder="Hair type" class="form-input-sm">
                    <input [(ngModel)]="hairForm.texture" placeholder="Texture" class="form-input-sm">
                    <input [(ngModel)]="hairForm.porosity" placeholder="Porosity" class="form-input-sm">
                    <input [(ngModel)]="hairForm.concerns" placeholder="Concerns" class="form-input-sm">
                    <button class="btn-sm" (click)="saveHairType()">Save</button>
                  </div>
                  <ng-template #hairDisplay>
                    <div class="item">
                      <strong>{{ currentHairType!.hairType }}</strong>
                      <p *ngIf="currentHairType!.texture">Texture: {{ currentHairType!.texture }}</p>
                      <p *ngIf="currentHairType!.porosity">Porosity: {{ currentHairType!.porosity }}</p>
                      <p *ngIf="currentHairType!.concerns">{{ currentHairType!.concerns }}</p>
                      <button class="btn-sm" (click)="currentHairType = null; hairForm.hairType = ''">Edit</button>
                    </div>
                  </ng-template>
                </div>
              </div>

              <div *ngSwitchCase="'images'" class="detail-section">
                <div class="detail-card">
                  <h3>Customer Images ({{ customerImages.length }})</h3>
                  <div class="image-grid">
                    <div class="img-item" *ngFor="let img of customerImages">
                      <img [src]="img.imageUrl" [alt]="img.caption || 'Client image'">
                      <div class="img-info">
                        <span>{{ img.caption || 'No caption' }}</span>
                        <span class="img-date">{{ img.uploadedAt | date:'shortDate' }}</span>
                      </div>
                      <button class="item-del" (click)="deleteImage(img.id)">✕</button>
                    </div>
                  </div>
                  <div class="empty-mini" *ngIf="!imagesLoading && customerImages.length === 0">No images uploaded.</div>
                </div>
              </div>

              <div *ngSwitchCase="'family'" class="detail-section">
                <div class="detail-card">
                  <h3>Family Members</h3>
                  <div class="item-list">
                    <div class="item" *ngFor="let f of familyMembers">
                      <strong>{{ f.fullName }}</strong>
                      <span class="badge badge-relation">{{ f.relationship }}</span>
                      <p *ngIf="f.phone">{{ f.phone }}</p>
                      <p *ngIf="f.email">{{ f.email }}</p>
                      <button class="item-del" (click)="deleteFamily(f.id)">✕</button>
                    </div>
                  </div>
                  <div class="empty-mini" *ngIf="!familyLoading && familyMembers.length === 0">No family members added.</div>
                  <div class="inline-form">
                    <input [(ngModel)]="familyForm.fullName" placeholder="Full name" class="form-input-sm">
                    <input [(ngModel)]="familyForm.relationship" placeholder="Relationship" class="form-input-sm">
                    <input [(ngModel)]="familyForm.phone" placeholder="Phone" class="form-input-sm">
                    <button class="btn-sm" (click)="saveFamily()">Add</button>
                  </div>
                </div>
              </div>

              <div *ngSwitchCase="'timeline'" class="detail-section">
                <div class="detail-card">
                  <h3>Visit Timeline</h3>
                  <div class="timeline">
                    <div class="tl-entry" *ngFor="let t of timeline">
                      <div class="tl-icon" [class]="'tl-' + t.type">●</div>
                      <div class="tl-content">
                        <strong>{{ t.title }}</strong>
                        <p *ngIf="t.description">{{ t.description }}</p>
                        <span class="tl-date">{{ t.date | date:'MMM dd, yyyy h:mm a' }}</span>
                        <span class="tl-type badge">{{ t.type }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="empty-mini" *ngIf="timeline.length === 0">No timeline entries.</div>
                </div>
              </div>

              <div *ngSwitchCase="'aisuggestions'" class="detail-section">
                <div class="detail-card">
                  <h3>AI Suggestions</h3>
                  <div class="suggestions">
                    <div class="suggestion" *ngFor="let s of aiSuggestions" [class.dismissed]="s.isDismissed">
                      <div class="sug-header">
                        <span class="badge badge-ai">{{ s.type }}</span>
                        <span class="confidence">{{ s.confidence }}% confidence</span>
                        <span class="priority" [class]="'pri-' + s.priority">{{ s.priority }}</span>
                      </div>
                      <strong>{{ s.title }}</strong>
                      <p>{{ s.description }}</p>
                      <button *ngIf="!s.isDismissed" class="btn-sm" (click)="dismissSuggestion(s.id)">Dismiss</button>
                    </div>
                  </div>
                  <div class="empty-mini" *ngIf="aiSuggestions.length === 0">No AI suggestions available.</div>
                </div>
              </div>
            </ng-container>
          </ng-container>
        </ng-container>

        <ng-container *ngSwitchCase="'segments'">
          <div class="segment-header">
            <div class="kpi-row">
              <div class="kpi"><strong>{{ segments.length }}</strong><span>Segments</span></div>
              <div class="kpi"><strong>{{ summary?.vipClients || 0 }}</strong><span>VIP Clients</span></div>
              <div class="kpi"><strong>{{ summary?.blacklistedClients || 0 }}</strong><span>Blacklisted</span></div>
              <div class="kpi"><strong>{{ summary?.highRiskClients || 0 }}</strong><span>High Risk</span></div>
              <div class="kpi"><strong>{{ summary?.averageRiskScore || 0 }}</strong><span>Avg Risk Score</span></div>
            </div>
          </div>

          <div class="segment-grid">
            <div class="segment-card" *ngFor="let seg of segments">
              <div class="seg-color" [style.background]="seg.color || '#6366f1'"></div>
              <div class="seg-body">
                <h3>{{ seg.name }}</h3>
                <p>{{ seg.description }}</p>
                <div class="seg-stats">
                  <span><strong>{{ seg.clientCount }}</strong> clients</span>
                  <span><strong>{{ seg.avgSpend | currency }}</strong> avg spend</span>
                </div>
                <div class="seg-actions">
                  <button class="btn-sm" (click)="editSegment(seg)">Edit</button>
                  <button class="btn-sm btn-danger-sm" (click)="deleteSeg(seg.id)">Delete</button>
                </div>
              </div>
            </div>
          </div>
          <button class="primary" (click)="openSegmentForm()" style="margin-top:16px">+ Create Segment</button>

          <div class="drawer-overlay drawer-centered" *ngIf="showSegmentForm" (click)="closeSegmentForm()">
            <div class="create-panel" (click)="$event.stopPropagation()">
              <div class="drawer-header"><h2>{{ editingSegmentId ? 'Edit Segment' : 'Create Segment' }}</h2><button class="close-btn" (click)="closeSegmentForm()">✕</button></div>
              <div class="drawer-body">
                <form (ngSubmit)="saveSegment()" class="create-form">
                  <label>Name</label>
                  <input name="segName" [(ngModel)]="segmentForm.name" required class="form-input">
                  <label>Description</label>
                  <textarea name="segDesc" [(ngModel)]="segmentForm.description" class="form-input form-textarea" rows="2"></textarea>
                  <label>Color</label>
                  <input name="segColor" [(ngModel)]="segmentForm.color" type="color" class="form-input">
                  <div class="drawer-actions">
                    <button type="button" (click)="closeSegmentForm()">Cancel</button>
                    <button type="submit" class="btn-primary">Save</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ng-container>

        <ng-container *ngSwitchCase="'communication'">
          <div *ngIf="!selectedClient" class="empty"><p>Select a client from Overview to view communication history.</p></div>
          <ng-container *ngIf="selectedClient">
            <div class="detail-card">
              <h3>Communication History</h3>
              <div class="toolbar">
                <select [(ngModel)]="commTypeFilter" (change)="loadCommunications()" class="filter-select">
                  <option value="">All Types</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="call">Call</option>
                </select>
                <select [(ngModel)]="commDirection" (change)="loadCommunications()" class="filter-select">
                  <option value="">All</option>
                  <option value="outbound">Outbound</option>
                  <option value="inbound">Inbound</option>
                </select>
              </div>
              <div class="comm-list">
                <div class="comm-item" *ngFor="let comm of communications">
                  <div class="comm-icon">
                    <span *ngIf="comm.type === 'whatsapp'">💬</span>
                    <span *ngIf="comm.type === 'email'">📧</span>
                    <span *ngIf="comm.type === 'sms'">📱</span>
                    <span *ngIf="comm.type === 'call'">📞</span>
                  </div>
                  <div class="comm-body">
                    <div class="comm-header">
                      <span class="badge" [class]="'badge-' + comm.type">{{ comm.type | uppercase }}</span>
                      <span class="comm-direction" [class.inbound]="comm.direction === 'inbound'">{{ comm.direction === 'inbound' ? '→ Inbound' : '← Outbound' }}</span>
                      <span class="badge" [class]="'badge-' + comm.status">{{ comm.status }}</span>
                    </div>
                    <strong *ngIf="comm.subject">{{ comm.subject }}</strong>
                    <p *ngIf="comm.message">{{ comm.message }}</p>
                    <span class="comm-date">{{ comm.sentAt | date:'MMM dd, yyyy h:mm a' }}</span>
                  </div>
                </div>
              </div>
              <div class="empty-mini" *ngIf="communications.length === 0">No communication records found.</div>
            </div>
            <div class="detail-card">
              <h3>Send Message</h3>
              <div class="inline-form">
                <select [(ngModel)]="sendCommType" class="form-input-sm">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
                <input [(ngModel)]="sendCommSubject" placeholder="Subject (optional)" *ngIf="sendCommType === 'email'" class="form-input-sm">
                <textarea [(ngModel)]="sendCommMessage" placeholder="Message" class="form-input form-textarea" rows="2"></textarea>
                <button class="btn-sm" (click)="sendCommunication()" [disabled]="!sendCommMessage.trim()">Send</button>
              </div>
            </div>
          </ng-container>
        </ng-container>

        <ng-container *ngSwitchCase="'referrals'">
          <div *ngIf="!selectedClient" class="empty"><p>Select a client from Overview to manage their referrals.</p></div>
          <ng-container *ngIf="selectedClient">
            <div class="detail-card">
              <h3>Referral Program</h3>
              <div class="referral-code" *ngIf="selectedClient.referralCode">
                <span>Referral Code: <strong>{{ selectedClient.referralCode }}</strong></span>
              </div>
              <div class="item-list">
                <div class="item" *ngFor="let r of referrals">
                  <div class="ref-info">
                    <strong>{{ r.referredName || 'Pending' }}</strong>
                    <span *ngIf="r.referredPhone">{{ r.referredPhone }}</span>
                  </div>
                  <span class="badge" [class]="'badge-' + r.status">{{ r.status }}</span>
                  <span *ngIf="r.rewardValue" class="reward">+{{ r.rewardValue | currency }}</span>
                  <span class="item-meta">{{ r.createdAt | date:'shortDate' }}</span>
                </div>
              </div>
              <div class="empty-mini" *ngIf="referrals.length === 0">No referrals yet.</div>
              <div class="inline-form">
                <input [(ngModel)]="referralForm.referredName" placeholder="Referred name" class="form-input-sm">
                <input [(ngModel)]="referralForm.referredPhone" placeholder="Phone" class="form-input-sm">
                <button class="btn-sm" (click)="createReferral()">Add Referral</button>
              </div>
            </div>
          </ng-container>
        </ng-container>

        <ng-container *ngSwitchCase="'tasks'">
          <div class="detail-card">
            <h3>Follow-up Tasks</h3>
            <div class="toolbar">
              <select [(ngModel)]="taskFilterStatus" (change)="loadTasks()" class="filter-select">
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div class="task-list">
              <div class="task-item" *ngFor="let t of tasks" [class.completed]="t.status === 'completed'">
                <div class="task-check">
                  <input type="checkbox" [checked]="t.status === 'completed'" (change)="toggleTask(t)">
                </div>
                <div class="task-body">
                  <strong>{{ t.title }}</strong>
                  <p *ngIf="t.description">{{ t.description }}</p>
                  <div class="task-meta">
                    <span class="badge" [class]="'pri-' + t.priority">{{ t.priority }}</span>
                    <span *ngIf="t.clientName">Client: {{ t.clientName }}</span>
                    <span>Due: {{ t.dueDate | date:'MMM dd' }}</span>
                    <span class="task-date">Created: {{ t.createdAt | date:'shortDate' }}</span>
                  </div>
                </div>
                <button class="item-del" (click)="deleteTask(t.id)">✕</button>
              </div>
            </div>
            <div class="empty-mini" *ngIf="tasks.length === 0">No follow-up tasks.</div>
          </div>
          <div class="detail-card">
            <h3>Create Follow-up</h3>
            <div class="inline-form">
              <input [(ngModel)]="taskForm.title" placeholder="Title" class="form-input-sm">
              <input [(ngModel)]="taskForm.description" placeholder="Description" class="form-input-sm">
              <input [(ngModel)]="taskForm.dueDate" type="date" class="form-input-sm">
              <select [(ngModel)]="taskForm.priority" class="form-input-sm">
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <button class="btn-sm" (click)="createTask()" [disabled]="!taskForm.title.trim()">Add</button>
            </div>
          </div>
        </ng-container>

        <ng-container *ngSwitchCase="'documents'">
          <div *ngIf="!selectedClient" class="empty"><p>Select a client to view their documents.</p></div>
          <ng-container *ngIf="selectedClient">
            <div class="detail-card">
              <h3>Documents ({{ documents.length }})</h3>
              <div class="doc-grid">
                <div class="doc-item" *ngFor="let d of documents">
                  <div class="doc-icon">
                    <span *ngIf="d.fileType.includes('pdf')">📄</span>
                    <span *ngIf="d.fileType.includes('image')">🖼️</span>
                    <span *ngIf="!d.fileType.includes('pdf') && !d.fileType.includes('image')">📁</span>
                  </div>
                  <div class="doc-body">
                    <strong>{{ d.name }}</strong>
                    <span class="doc-meta">{{ (d.fileSize / 1024).toFixed(1) }} KB · {{ d.uploadedAt | date:'shortDate' }}</span>
                    <span *ngIf="d.category" class="badge">{{ d.category }}</span>
                  </div>
                  <a [href]="d.fileUrl" target="_blank" class="btn-sm">View</a>
                  <button class="item-del" (click)="deleteDoc(d.id)">✕</button>
                </div>
              </div>
              <div class="empty-mini" *ngIf="documents.length === 0">No documents uploaded.</div>
            </div>
          </ng-container>
        </ng-container>

        <ng-container *ngSwitchCase="'export'">
          <div class="detail-card">
            <h3>Export Clients</h3>
            <div class="create-form">
              <label>Format</label>
              <select [(ngModel)]="exportPayload.format" class="form-select">
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </select>
              <label>Include Images</label>
              <input type="checkbox" [(ngModel)]="exportPayload.includeImages" class="form-checkbox">
              <label>Date Range</label>
              <div class="inline-form">
                <input [(ngModel)]="exportPayload.dateFrom" type="date" placeholder="From" class="form-input-sm">
                <input [(ngModel)]="exportPayload.dateTo" type="date" placeholder="To" class="form-input-sm">
              </div>
              <div class="drawer-actions" style="margin-top:12px">
                <button class="btn-primary" (click)="doExport()">Export</button>
              </div>
            </div>
          </div>
        </ng-container>

        <ng-container *ngSwitchCase="'import'">
          <div class="detail-card">
            <h3>Import Clients</h3>
            <p>Upload a CSV or Excel file with client data.</p>
            <input type="file" (change)="onFileSelected($event)" accept=".csv,.xlsx,.xls" class="form-input">
            <div class="drawer-actions" style="margin-top:12px">
              <button class="btn-primary" (click)="doImport()" [disabled]="!importFile">Import</button>
            </div>
            <div class="import-result" *ngIf="importResult">
              <p>✅ {{ importResult.imported }} imported, {{ importResult.skipped }} skipped ({{ importResult.totalRows }} total)</p>
              <div *ngIf="importResult.errors.length > 0">
                <strong>Errors:</strong>
                <p *ngFor="let e of importResult.errors">Row {{ e.row }}: {{ e.message }}</p>
              </div>
            </div>
          </div>
        </ng-container>
      </ng-container>
    </section>
  `,
  styles: [`
    .crm{display:grid;gap:20px;max-width:1200px}
    .head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
    .head-actions{display:flex;gap:8px}
    h1{font-size:34px;margin:0}
    p{color:#6b7280;margin:6px 0 0;font-size:14px}
    .primary{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:#0b0b0b;color:white;font-size:14px;white-space:nowrap;transition:opacity .2s}
    .primary:hover{opacity:.85}
    .crm-tabs{display:flex;gap:4px;flex-wrap:wrap;background:#f3f4f6;padding:4px;border-radius:16px;overflow-x:auto}
    .crm-tabs button{padding:10px 18px;border:0;border-radius:12px;font-weight:700;font-size:13px;cursor:pointer;background:transparent;color:#6b7280;transition:all .2s;white-space:nowrap}
    .crm-tabs button.active{background:white;color:#0b0b0b;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .crm-tabs button:hover:not(.active){color:#374151}
    .sub-tabs{display:flex;gap:4px;flex-wrap:wrap;background:#f3f4f6;padding:4px;border-radius:12px}
    .sub-tabs button{padding:8px 14px;border:0;border-radius:10px;font-weight:600;font-size:12px;cursor:pointer;background:transparent;color:#6b7280;transition:all .2s;white-space:nowrap}
    .sub-tabs button.active{background:white;color:#0b0b0b;box-shadow:0 2px 8px rgba(0,0,0,.06)}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:#6b7280;min-height:320px}
    
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d;margin:8px 0}
    .error button{margin-top:12px;background:#0b0b0b;color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    .empty{padding:48px 24px;text-align:center;color:#6b7280;background:white;border-radius:24px;border:1px solid #e5e7eb}
    .empty p{margin:0;font-size:15px}
    .kpi-row{display:flex;gap:10px;flex-wrap:wrap}
    .kpi{flex:1;min-width:120px;background:white;border:1px solid #e5e7eb;border-radius:16px;padding:16px;text-align:center}
    .kpi strong{display:block;font-size:28px;color:#111827}
    .kpi span{font-size:12px;color:#6b7280;font-weight:600}
    .toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .filter-input{flex:1;min-width:200px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;outline:none;transition:border-color .2s}
    .filter-input:focus{border-color:#0b0b0b}
    .filter-select{padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;background:white;outline:none;cursor:pointer}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;min-height:320px;align-content:start}
    .card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;transition:box-shadow .2s;cursor:pointer}
    .card:hover{box-shadow:0 12px 35px rgba(15,23,42,.08)}
    .card-top{display:flex;gap:14px;align-items:center;min-width:0}
    .avatar{width:44px;height:44px;border-radius:50%;background:#0b0b0b;color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;flex-shrink:0}
    .avatar.birthday{background:#eab308}
    .avatar.vip{background:#92400e}
    .card-info{flex:1;min-width:0}
    .card-info h3{margin:0;font-size:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .contact-line{display:block;font-size:12px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .card-indicators{display:flex;gap:4px;flex-wrap:wrap;margin:10px 0 4px}
    .indicator{font-size:11px;font-weight:700;padding:2px 8px;border-radius:8px;background:#f3f4f6;color:#6b7280}
    .badge-birthday{background:#fefce8;color:#a16207}
    .badge-vip{background:#fef3c7;color:#92400e}
    .badge-blacklist{background:#fef2f2;color:#dc2626}
    .badge-risk{background:#fef2f2;color:#991b1b}
    .badge-segment{background:#e0e7ff;color:#4338ca}
    .stats{display:flex;gap:6px;margin:10px 0}
    .stats span{flex:1;background:#f8fafc;border-radius:10px;padding:8px;font-size:12px;color:#6b7280;text-align:center}
    .stats span strong{display:block;font-size:14px;color:#111827}
    .pagination-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;background:white;border-radius:16px;border:1px solid #e5e7eb;padding:12px 18px;font-size:13px;color:#6b7280;font-weight:600}
    .pagination-controls{display:flex;align-items:center;gap:8px}
    .page-size-select{padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px;font-size:12px;font-weight:600;background:white;outline:none;cursor:pointer}
    .pagination-controls button{border:1px solid #e5e7eb;border-radius:10px;padding:8px 14px;font-weight:700;cursor:pointer;background:white;font-size:12px;transition:all .2s;min-width:80px}
    .pagination-controls button:disabled{opacity:.4;cursor:default}
    .pagination-controls button:hover:not(:disabled){border-color:#0b0b0b;background:#f9fafb}
    .page-indicator{font-size:14px;font-weight:800;min-width:28px;text-align:center;background:#0b0b0b;color:white;border-radius:8px;padding:4px 0}
    .client-hero{display:flex;gap:16px;align-items:center;background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px;flex-wrap:wrap}
    .hero-avatar{width:56px;height:56px;border-radius:50%;background:#0b0b0b;color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:24px;flex-shrink:0}
    .hero-avatar.birthday{background:#eab308}
    .hero-info{flex:1;min-width:160px}
    .hero-info h2{margin:0;font-size:22px}
    .hero-info p{font-size:13px;color:#6b7280;margin:4px 0 0}
    .hero-badges{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px}
    .hero-stats{display:flex;gap:16px}
    .hero-stats div{text-align:center}
    .hero-stats strong{display:block;font-size:20px}
    .hero-stats div:not(:last-child){padding-right:16px;border-right:1px solid #e5e7eb}
    .close-hero{border:0;background:transparent;font-size:24px;cursor:pointer;color:#6b7280;padding:0;line-height:1;flex-shrink:0}
    .badge{display:inline-block;font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700;text-transform:uppercase}
    .badge-vip{background:#fef3c7;color:#92400e}
    .badge-blacklist{background:#fef2f2;color:#dc2626}
    .badge-segment,.badge-ai{background:#e0e7ff;color:#4338ca}
    .badge-lead{background:#f3e8ff;color:#7c3aed}
    .badge-relation{background:#f0fdf4;color:#16a34a}
    .badge-whatsapp{background:#f0fdf4;color:#059669}
    .badge-email{background:#dbeafe;color:#1d4ed8}
    .badge-sms{background:#f3e8ff;color:#7c3aed}
    .badge-call{background:#fef3c7;color:#92400e}
    .badge-sent{background:#dbeafe;color:#1d4ed8}
    .badge-delivered,.badge-received{background:#f0fdf4;color:#16a34a}
    .badge-read{background:#e0e7ff;color:#4338ca}
    .badge-failed{background:#fef2f2;color:#dc2626}
    .badge-pending{background:#fefce8;color:#a16207}
    .badge-converted{background:#f0fdf4;color:#16a34a}
    .badge-rewarded{background:#fef3c7;color:#92400e}
    .badge-expired{background:#f3f4f6;color:#6b7280}
    .detail-section{display:grid;gap:16px}
    .detail-card{background:white;border:1px solid #e5e7eb;border-radius:22px;padding:20px}
    .detail-card h3{font-size:13px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:0 0 12px;letter-spacing:.05em}
    .info-grid{display:grid;gap:2px}
    .info-grid > div{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px}
    .info-grid > div span:first-child{color:#6b7280;font-weight:600}
    .info-grid > div span:last-child{text-align:right;max-width:60%;word-break:break-word}
    .risk-badge{padding:2px 10px;border-radius:12px;font-weight:700;font-size:12px}
    .risk-badge.high{background:#fef2f2;color:#991b1b}
    .risk-badge.medium{background:#fefce8;color:#a16207}
    .risk-badge.low{background:#f0fdf4;color:#16a34a}
    .loading-mini{display:flex;padding:12px 0;justify-content:center}
    .mini-spinner{width:16px;height:16px;border:2px solid #e5e7eb;border-top-color:#0b0b0b;border-radius:50%;animation:spin .7s linear infinite}
    .empty-mini{padding:16px 0;font-size:13px;color:#9ca3af;text-align:center}
    .item-list{display:grid;gap:2px}
    .item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;flex-wrap:wrap}
    .item strong{min-width:100px}
    .item p{margin:0;color:#6b7280;font-size:12px;flex:1}
    .item-meta,.comm-date,.tl-date{font-size:11px;color:#9ca3af;margin-left:auto}
    .item-del{border:0;background:transparent;color:#dc2626;cursor:pointer;font-size:14px;padding:4px;flex-shrink:0}
    .inline-form{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}
    .form-input-sm{padding:8px 12px;border:1px solid #e5e7eb;border-radius:10px;font-size:13px;outline:none;flex:1;min-width:120px;background:white}
    .form-input-sm:focus{border-color:#0b0b0b}
    .btn-sm{padding:8px 16px;border:0;border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;background:#0b0b0b;color:white;transition:opacity .2s;white-space:nowrap}
    .btn-sm:hover{opacity:.8}
    .btn-danger-sm{background:#fee2e2;color:#991b1b}
    .severity{font-size:10px;padding:2px 8px;border-radius:8px;font-weight:700}
    .sev-mild{background:#f0fdf4;color:#16a34a}
    .sev-moderate{background:#fefce8;color:#a16207}
    .sev-severe{background:#fef2f2;color:#dc2626}
    .image-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}
    .img-item{position:relative;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
    .img-item img{width:100%;height:120px;object-fit:cover}
    .img-info{padding:8px 10px;font-size:11px;color:#6b7280}
    .img-info span{display:block}
    .img-date{font-size:10px;color:#9ca3af}
    .img-item .item-del{position:absolute;top:4px;right:4px;background:rgba(255,255,255,.9);border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center}
    .timeline{display:grid;gap:4px}
    .tl-entry{display:flex;gap:12px;padding:8px 0;border-left:2px solid #e5e7eb;padding-left:16px;margin-left:8px}
    .tl-icon{font-size:10px;flex-shrink:0;color:#6b7280}
    .tl-icon.tl-booking{color:#1d4ed8}
    .tl-icon.tl-sale{color:#16a34a}
    .tl-icon.tl-note{color:#f59e0b}
    .tl-icon.tl-form{color:#8b5cf6}
    .tl-icon.tl-wallet{color:#059669}
    .tl-icon.tl-loyalty{color:#eab308}
    .tl-icon.tl-task{color:#ec4899}
    .tl-icon.tl-communication{color:#6366f1}
    .tl-content strong{display:block;font-size:14px}
    .tl-content p{margin:2px 0;font-size:12px;color:#6b7280}
    .tl-type{font-size:9px;margin-left:8px}
    .suggestions{display:grid;gap:12px}
    .suggestion{background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:14px}
    .suggestion.dismissed{opacity:.5}
    .sug-header{display:flex;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap}
    .confidence{font-size:11px;color:#6b7280}
    .priority{font-size:10px;padding:2px 8px;border-radius:8px;font-weight:700}
    .pri-low{background:#f0fdf4;color:#16a34a}
    .pri-medium{background:#fefce8;color:#a16207}
    .pri-high,.pri-urgent{background:#fef2f2;color:#dc2626}
    .segment-header{margin-bottom:8px}
    .segment-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
    .segment-card{background:white;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;display:flex}
    .seg-color{width:6px;flex-shrink:0}
    .seg-body{padding:16px;flex:1}
    .seg-body h3{margin:0 0 4px;font-size:16px}
    .seg-body p{font-size:12px;color:#6b7280;margin:0 0 10px}
    .seg-stats{display:flex;gap:12px;margin-bottom:10px}
    .seg-stats span{font-size:12px;color:#6b7280}
    .seg-stats strong{color:#111827}
    .seg-actions{display:flex;gap:8px}
    .comm-list{display:grid;gap:2px}
    .comm-item{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f3f4f6}
    .comm-icon{font-size:20px;flex-shrink:0;width:28px;text-align:center}
    .comm-body{flex:1;min-width:0}
    .comm-header{display:flex;gap:6px;align-items:center;margin-bottom:4px;flex-wrap:wrap}
    .comm-direction{font-size:11px;color:#6b7280;font-weight:600}
    .comm-direction.inbound{color:#059669}
    .comm-body strong{display:block;font-size:13px}
    .comm-body p{margin:2px 0;font-size:12px;color:#6b7280}
    .referral-code{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;margin-bottom:12px;font-size:14px}
    .ref-info{flex:1;min-width:0}
    .ref-info strong{display:block}
    .reward{color:#16a34a;font-weight:700;font-size:13px}
    .task-list{display:grid;gap:2px}
    .task-item{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f3f4f6;align-items:flex-start}
    .task-item.completed{opacity:.5}
    .task-check{padding-top:2px}
    .task-check input{width:18px;height:18px;cursor:pointer}
    .task-body{flex:1;min-width:0}
    .task-body strong{display:block;font-size:14px}
    .task-body p{margin:2px 0;font-size:12px;color:#6b7280}
    .task-meta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:4px;font-size:11px;color:#6b7280}
    .task-date{color:#9ca3af}
    .doc-grid{display:grid;gap:8px}
    .doc-item{display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #f3f4f6}
    .doc-icon{font-size:24px;flex-shrink:0}
    .doc-body{flex:1;min-width:0}
    .doc-body strong{display:block;font-size:13px}
    .doc-meta{font-size:11px;color:#9ca3af}
    .doc-item .btn-sm{font-size:11px;padding:6px 12px}
    .create-form{display:grid;gap:10px}
    .form-input,.form-select{padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;outline:none;background:white;transition:border-color .2s}
    .form-input:focus,.form-select:focus{border-color:#0b0b0b}
    .form-textarea{resize:vertical;font-family:inherit;min-height:60px}
    .form-checkbox{width:18px;height:18px;cursor:pointer;margin:0}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;z-index:50}
    .drawer-centered{justify-content:center;align-items:center}
    .drawer-header{display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:white;z-index:1}
    .drawer-header h2{margin:0;font-size:20px}
    .close-btn{border:0;background:transparent;font-size:28px;cursor:pointer;color:#6b7280;padding:0;line-height:1}
    .create-panel{background:white;border-radius:24px;width:min(520px,90%);max-height:90vh;overflow-y:auto;animation:fadeIn .2s ease}
    @keyframes fadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
    .drawer-body{padding:24px 28px;display:grid;gap:16px}
    .drawer-actions{display:flex;gap:10px}
    .drawer-actions button{flex:1;border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer;font-size:13px}
    .btn-primary{background:#0b0b0b;color:white}
    .import-result{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:16px;margin-top:16px;font-size:13px}
    .import-result strong{display:block;margin-top:8px;color:#991b1b}
    .clear-search-btn{border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;font-weight:700;cursor:pointer;background:white;font-size:13px;line-height:1;transition:all .2s;flex-shrink:0}
    .clear-search-btn:hover{border-color:#dc2626;color:#dc2626}
    @media(max-width:1000px){.grid{grid-template-columns:repeat(2,1fr)}.head{display:grid;gap:14px}.hero-stats{width:100%}.hero-stats div:first-child{padding-left:0}}
    @media(max-width:640px){.grid{grid-template-columns:1fr}.kpi-row{grid-template-columns:repeat(2,1fr)}.kpi{min-width:0}.toolbar{flex-direction:column}.filter-input{min-width:0}.inline-form{flex-direction:column}.inline-form .form-input-sm{min-width:0;width:100%}}
  `]
})
export class EnterpriseCrmComponent {
  private api = inject(EnterpriseCrmService);

  tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'client360', label: 'Client 360°' },
    { key: 'segments', label: 'Segments' },
    { key: 'communication', label: 'Communication' },
    { key: 'referrals', label: 'Referrals' },
    { key: 'tasks', label: 'Tasks & Follow-up' },
    { key: 'documents', label: 'Documents' },
    { key: 'export', label: 'Export' },
    { key: 'import', label: 'Import' },
  ];
  activeTab = 'overview';

  clientSubTabs = [
    { key: 'profile', label: 'Profile' },
    { key: 'medical', label: 'Medical & Allergies' },
    { key: 'images', label: 'Images' },
    { key: 'family', label: 'Family' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'aisuggestions', label: 'AI Suggestions' },
  ];
  activeClientTab = 'profile';

  summary: CrmDashboardSummary | null = null;
  summaryLoading = false;
  summaryError = '';
  clients: CrmClient[] = [];
  clientsLoading = false;
  clientsError = '';
  search = '';
  page = 1;
  limit = 24;
  total = 0;
  totalPages = 1;
  segmentFilter = '';
  vipFilter = '';
  private searchTimer: any = null;

  selectedClient: CrmClient | null = null;
  segments: CustomerSegment[] = [];
  communications: CommunicationRecord[] = [];
  referrals: ReferralRecord[] = [];
  tasks: FollowUpTask[] = [];
  documents: DocumentRecord[] = [];
  customerImages: CustomerImage[] = [];
  medicalNotes: MedicalNote[] = [];
  allergies: Allergy[] = [];
  currentSkinType: SkinType | null = null;
  currentHairType: HairType | null = null;
  familyMembers: FamilyMember[] = [];
  timeline: VisitTimelineEntry[] = [];
  aiSuggestions: AiSuggestion[] = [];

  medicalLoading = false;
  allergyLoading = false;
  imagesLoading = false;
  familyLoading = false;

  activeClientId = '';

  medicalForm = { condition: '', notes: '' };
  allergyForm = { allergen: '', severity: 'mild' as 'mild' | 'moderate' | 'severe', reaction: '' };
  skinForm = { skinType: '', concerns: '', notes: '' };
  hairForm = { hairType: '', texture: '', porosity: '', concerns: '' };
  familyForm = { fullName: '', relationship: '', phone: '' };

  commTypeFilter = '';
  commDirection = '';
  sendCommType = 'whatsapp';
  sendCommSubject = '';
  sendCommMessage = '';

  referralForm = { referredName: '', referredPhone: '' };

  taskFilterStatus = '';
  taskForm = { title: '', description: '', dueDate: '', priority: 'medium' };

  showSegmentForm = false;
  editingSegmentId = '';
  segmentForm = { name: '', description: '', color: '#6366f1' };

  importFile: File | null = null;
  importResult: ImportResult | null = null;

  exportPayload: ExportPayload = {
    includeFields: ['fullName', 'phone', 'email', 'totalVisits', 'totalSpend'],
    format: 'csv',
    includeImages: false,
  };

  ngOnInit() {
    this.loadSummary();
    this.loadClients();
    this.loadSegments();
    this.loadTasks();
  }

  loadSummary() {
    this.summaryLoading = true;
    this.summaryError = '';
    this.api.getSummary().subscribe({
      next: (s) => { this.summary = s; this.summaryLoading = false; },
      error: (e) => { this.summaryLoading = false; this.summaryError = e.error?.message || 'Failed to load summary.'; },
    });
  }

  loadClients() {
    this.clientsLoading = true;
    this.clientsError = '';
    const filters: Record<string, unknown> = { search: this.search, page: this.page, limit: this.limit };
    if (this.segmentFilter) filters['segment'] = this.segmentFilter;
    if (this.vipFilter === 'vip') filters['isVip'] = true;
    else if (this.vipFilter === 'blacklisted') filters['isBlacklisted'] = true;
    else if (this.vipFilter === 'highRisk') filters['riskScoreMin'] = 70;
    this.api.getClients(filters as any).subscribe({
      next: (res) => { this.clients = res.items; this.total = res.total; this.totalPages = res.totalPages; this.page = res.page; this.clientsLoading = false; },
      error: (e) => { this.clientsLoading = false; this.clientsError = e.error?.message || 'Failed to load clients.'; },
    });
  }

  loadSegments() {
    this.api.getSegments().subscribe({ next: (s) => { this.segments = s; }, error: () => {} });
  }

  loadTasks() {
    const clientId = this.selectedClient?.id;
    const params = clientId ? { clientId } as any : undefined;
    this.api.getFollowUpTasks(clientId).subscribe({ next: (t) => { this.tasks = t; }, error: () => {} });
  }

  selectClient(client: CrmClient) {
    this.selectedClient = client;
    this.activeTab = 'client360';
    this.activeClientTab = 'profile';
    this.activeClientId = client.id;
    this.loadClientData();
  }

  loadClientData() {
    if (!this.activeClientId) return;

    this.api.getMedicalNotes(this.activeClientId).subscribe({ next: (d) => { this.medicalNotes = d; this.medicalLoading = false; }, error: () => { this.medicalLoading = false; } });
    this.api.getAllergies(this.activeClientId).subscribe({ next: (d) => { this.allergies = d; this.allergyLoading = false; }, error: () => { this.allergyLoading = false; } });
    this.api.getSkinType(this.activeClientId).subscribe({ next: (d) => { this.currentSkinType = d; }, error: () => {} });
    this.api.getHairType(this.activeClientId).subscribe({ next: (d) => { this.currentHairType = d; }, error: () => {} });
    this.api.getCustomerImages(this.activeClientId).subscribe({ next: (d) => { this.customerImages = d; this.imagesLoading = false; }, error: () => { this.imagesLoading = false; } });
    this.api.getFamilyMembers(this.activeClientId).subscribe({ next: (d) => { this.familyMembers = d; this.familyLoading = false; }, error: () => { this.familyLoading = false; } });
    this.api.getTimeline(this.activeClientId).subscribe({ next: (d) => { this.timeline = d; }, error: () => {} });
    this.api.getAiSuggestions(this.activeClientId).subscribe({ next: (d) => { this.aiSuggestions = d; }, error: () => {} });
    this.api.getReferrals(this.activeClientId).subscribe({ next: (d) => { this.referrals = d; }, error: () => {} });
    this.api.getDocuments(this.activeClientId).subscribe({ next: (d) => { this.documents = d; }, error: () => {} });
    this.loadCommunications();
  }

  loadCommunications() {
    if (!this.activeClientId) return;
    const params: Record<string, unknown> = {};
    if (this.commTypeFilter) params['type'] = this.commTypeFilter;
    if (this.commDirection) params['direction'] = this.commDirection;
    this.api.getCommunicationHistory(this.activeClientId, params as any).subscribe({ next: (d) => { this.communications = d; }, error: () => {} });
  }

  sendCommunication() {
    if (!this.activeClientId || !this.sendCommMessage.trim()) return;
    this.api.sendCommunication(this.activeClientId, {
      type: this.sendCommType as 'whatsapp' | 'email' | 'sms',
      subject: this.sendCommSubject || undefined,
      message: this.sendCommMessage,
    }).subscribe({ next: () => { this.sendCommMessage = ''; this.sendCommSubject = ''; this.loadCommunications(); }, error: () => {} });
  }

  saveMedical() {
    if (!this.activeClientId) return;
    this.api.saveMedicalNote(this.activeClientId, this.medicalForm).subscribe({ next: () => { this.medicalForm = { condition: '', notes: '' }; this.loadClientData(); }, error: () => {} });
  }

  deleteMedical(id: string) {
    if (!this.activeClientId) return;
    this.api.deleteMedicalNote(this.activeClientId, id).subscribe({ next: () => { this.loadClientData(); }, error: () => {} });
  }

  saveAllergy() {
    if (!this.activeClientId) return;
    this.api.saveAllergy(this.activeClientId, this.allergyForm).subscribe({ next: () => { this.allergyForm = { allergen: '', severity: 'mild', reaction: '' }; this.loadClientData(); }, error: () => {} });
  }

  deleteAllergy(id: string) {
    if (!this.activeClientId) return;
    this.api.deleteAllergy(this.activeClientId, id).subscribe({ next: () => { this.loadClientData(); }, error: () => {} });
  }

  saveSkinType() {
    if (!this.activeClientId) return;
    this.api.saveSkinType(this.activeClientId, this.skinForm).subscribe({ next: () => { this.skinForm = { skinType: '', concerns: '', notes: '' }; this.loadClientData(); }, error: () => {} });
  }

  saveHairType() {
    if (!this.activeClientId) return;
    this.api.saveHairType(this.activeClientId, this.hairForm).subscribe({ next: () => { this.hairForm = { hairType: '', texture: '', porosity: '', concerns: '' }; this.loadClientData(); }, error: () => {} });
  }

  deleteImage(id: string) {
    if (!this.activeClientId) return;
    if (!confirm('Delete this image?')) return;
    this.api.deleteCustomerImage(this.activeClientId, id).subscribe({ next: () => { this.loadClientData(); }, error: () => {} });
  }

  saveFamily() {
    if (!this.activeClientId) return;
    this.api.saveFamilyMember(this.activeClientId, this.familyForm).subscribe({ next: () => { this.familyForm = { fullName: '', relationship: '', phone: '' }; this.loadClientData(); }, error: () => {} });
  }

  deleteFamily(id: string) {
    if (!this.activeClientId) return;
    this.api.deleteFamilyMember(this.activeClientId, id).subscribe({ next: () => { this.loadClientData(); }, error: () => {} });
  }

  createReferral() {
    if (!this.activeClientId) return;
    this.api.createReferral(this.activeClientId, this.referralForm).subscribe({ next: () => { this.referralForm = { referredName: '', referredPhone: '' }; this.loadClientData(); }, error: () => {} });
  }

  createTask() {
    this.api.createFollowUpTask({ ...this.taskForm, clientId: this.selectedClient?.id, clientName: this.selectedClient?.fullName } as any).subscribe({
      next: () => { this.taskForm = { title: '', description: '', dueDate: '', priority: 'medium' }; this.loadTasks(); },
      error: () => {},
    });
  }

  toggleTask(task: FollowUpTask) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    this.api.updateFollowUpTask(task.id, { status: newStatus } as any).subscribe({ next: () => { this.loadTasks(); }, error: () => {} });
  }

  deleteTask(id: string) {
    this.api.deleteFollowUpTask(id).subscribe({ next: () => { this.loadTasks(); }, error: () => {} });
  }

  dismissSuggestion(id: string) {
    if (!this.activeClientId) return;
    this.api.dismissAiSuggestion(this.activeClientId, id).subscribe({ next: () => { this.loadClientData(); }, error: () => {} });
  }

  deleteDoc(id: string) {
    if (!this.activeClientId) return;
    if (!confirm('Delete this document?')) return;
    this.api.deleteDocument(this.activeClientId, id).subscribe({ next: () => { this.loadClientData(); }, error: () => {} });
  }

  openSegmentForm() { this.showSegmentForm = true; this.editingSegmentId = ''; this.segmentForm = { name: '', description: '', color: '#6366f1' }; }
  closeSegmentForm() { this.showSegmentForm = false; }
  editSegment(seg: CustomerSegment) { this.editingSegmentId = seg.id; this.segmentForm = { name: seg.name, description: seg.description || '', color: seg.color || '#6366f1' }; this.showSegmentForm = true; }

  saveSegment() {
    if (this.editingSegmentId) {
      this.api.updateSegment(this.editingSegmentId, this.segmentForm).subscribe({ next: () => { this.closeSegmentForm(); this.loadSegments(); }, error: () => {} });
    } else {
      this.api.createSegment(this.segmentForm).subscribe({ next: () => { this.closeSegmentForm(); this.loadSegments(); }, error: () => {} });
    }
  }

  deleteSeg(id: string) {
    if (!confirm('Delete this segment?')) return;
    this.api.deleteSegment(id).subscribe({ next: () => { this.loadSegments(); }, error: () => {} });
  }

  doExport() {
    this.api.exportClients(this.exportPayload).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clients_export.${this.exportPayload.format}`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {},
    });
  }

  onFileSelected(event: Event) {
    const el = event.target as HTMLInputElement;
    if (el.files && el.files.length > 0) this.importFile = el.files[0];
  }

  doImport() {
    if (!this.importFile) return;
    const fd = new FormData();
    fd.append('file', this.importFile);
    this.api.importClients(fd).subscribe({
      next: (r) => { this.importResult = r; this.loadClients(); },
      error: () => {},
    });
  }

  isBirthdayMonth(dob: string | null | undefined): boolean {
    if (!dob) return false;
    const d = new Date(dob);
    return d.getMonth() === new Date().getMonth();
  }

  getAgeString(dob: string): string {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age + ' yrs';
  }

  onSearch() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page = 1; this.loadClients(); }, 300);
  }

  clearSearch() { this.search = ''; this.page = 1; this.loadClients(); }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.loadClients();
  }
}
