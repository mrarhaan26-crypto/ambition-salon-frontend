import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiMarketingService } from './ai-marketing.service';

@Component({
  selector: 'app-ai-marketing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="head">
        <div>
          <h1>AI Marketing</h1>
          <p>AI-generated campaign suggestions, audience segments, and channel optimization.</p>
        </div>
        <button class="refresh-btn" (click)="loadAll()" [disabled]="loading">Refresh</button>
      </div>

      <div class="loading" *ngIf="loading"><div class="spinner"></div><span>Analyzing marketing data...</span></div>
      <div class="error" *ngIf="error"><strong>Failed to load.</strong><p>{{ error }}</p><button (click)="loadAll()">Retry</button></div>

      <ng-container *ngIf="!loading && !error">
        <div class="panel">
          <h2>AI-Suggested Campaigns</h2>
          <div class="empty" *ngIf="!campaigns?.length"><p>No campaign suggestions yet.</p></div>
          <div class="campaign-list" *ngIf="campaigns?.length">
            <div class="campaign-card" *ngFor="let c of campaigns">
              <div class="camp-head">
                <strong>{{ c.name }}</strong>
                <span class="conf-badge">{{ c.confidence || c.score }}% match</span>
              </div>
              <p>{{ c.description }}</p>
              <div class="camp-meta">
                <span *ngIf="c.targetSegment">Segment: {{ c.targetSegment }}</span>
                <span *ngIf="c.channel">Channel: {{ c.channel }}</span>
                <span *ngIf="c.estimatedReach">Reach: {{ c.estimatedReach }}</span>
              </div>
              <div class="camp-metrics" *ngIf="c.expectedROI">
                <span>Expected ROI: <strong>{{ c.expectedROI }}%</strong></span>
                <span>Budget: <strong>{{ c.suggestedBudget | currency }}</strong></span>
              </div>
            </div>
          </div>
        </div>

        <div class="grid-2">
          <div class="panel">
            <h2>Audience Segments</h2>
            <div class="empty" *ngIf="!segments?.length"><p>No segments available.</p></div>
            <div class="segment-list" *ngIf="segments?.length">
              <div class="segment-row" *ngFor="let s of segments">
                <div class="seg-info">
                  <strong>{{ s.name }}</strong>
                  <span>{{ s.count || 0 }} clients</span>
                </div>
                <div class="seg-details">
                  <span class="seg-tag" *ngFor="let t of (s.tags || [])">{{ t }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="panel">
            <h2>Channel Performance</h2>
            <div class="empty" *ngIf="!channelPerf?.length"><p>No channel data available.</p></div>
            <div class="channel-list" *ngIf="channelPerf?.length">
              <div class="channel-row" *ngFor="let ch of channelPerf">
                <div class="channel-icon">{{ ch.channel === 'email' ? '📧' : ch.channel === 'sms' ? '📱' : ch.channel === 'social' ? '📱' : '🔔' }}</div>
                <div class="channel-info">
                  <strong>{{ ch.channel }}</strong>
                  <div class="bar-wrap"><div class="bar" [style.width.%]="ch.effectiveness"></div></div>
                </div>
                <div class="channel-stats">
                  <span>{{ ch.effectiveness }}% eff.</span>
                  <span>{{ ch.reach || 0 }} reach</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <h2>Content Suggestions</h2>
          <div class="empty" *ngIf="!content?.length"><p>No content suggestions available.</p></div>
          <div class="content-grid" *ngIf="content?.length">
            <div class="content-card" *ngFor="let ct of content">
              <span class="content-type">{{ ct.type }}</span>
              <strong>{{ ct.title }}</strong>
              <p>{{ ct.body || ct.suggestion }}</p>
              <span class="content-channel" *ngIf="ct.channel">Best for: {{ ct.channel }}</span>
            </div>
          </div>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
    h1{font-size:34px;margin:0}
    p{color:var(--muted);margin:6px 0 0}
    .refresh-btn{border:0;border-radius:14px;padding:12px 20px;font-weight:800;cursor:pointer;background:var(--black);color:var(--white)}
    .refresh-btn:disabled{opacity:.5}
    .panel{background:var(--surface);border:1px solid var(--border);border-radius:24px;padding:24px;box-shadow:var(--card-shadow);margin-bottom:18px}
    .panel h2{margin:0 0 16px;font-size:18px}
    .empty{padding:24px;text-align:center;color:var(--muted)}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}
    .campaign-list{display:grid;gap:12px}
    .campaign-card{background:var(--soft);border-radius:16px;padding:16px;border-left:4px solid var(--gold)}
    .camp-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
    .camp-head strong{font-size:15px}
    .conf-badge{font-size:11px;padding:2px 10px;border-radius:10px;background:#d1fae5;color:#065f46;font-weight:600}
    .campaign-card p{margin:0 0 8px;font-size:13px;color:var(--muted)}
    .camp-meta{display:flex;gap:12px;font-size:12px;color:var(--muted);flex-wrap:wrap;margin-bottom:8px}
    .camp-metrics{display:flex;gap:16px;font-size:12px;padding-top:8px;border-top:1px solid var(--border)}
    .camp-metrics strong{font-size:14px}
    .segment-list{display:grid;gap:8px}
    .segment-row{display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--soft);border-radius:12px}
    .seg-info strong{display:block;font-size:14px}
    .seg-info span{font-size:12px;color:var(--muted)}
    .seg-details{display:flex;gap:4px;flex-wrap:wrap}
    .seg-tag{font-size:10px;padding:2px 8px;border-radius:8px;background:var(--surface);color:var(--muted)}
    .channel-list{display:grid;gap:10px}
    .channel-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)}
    .channel-row:last-child{border-bottom:0}
    .channel-icon{font-size:20px;width:30px;text-align:center}
    .channel-info{flex:1}
    .channel-info strong{font-size:14px;text-transform:capitalize;display:block;margin-bottom:4px}
    .bar-wrap{background:var(--soft);border-radius:8px;height:8px;overflow:hidden}
    .bar{height:100%;background:var(--gold);border-radius:8px;transition:width .3s}
    .channel-stats{display:flex;gap:10px;font-size:12px;color:var(--muted);flex-shrink:0}
    .content-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
    .content-card{background:var(--soft);border-radius:16px;padding:16px}
    .content-type{font-size:10px;padding:2px 8px;border-radius:8px;background:var(--surface);font-weight:600;text-transform:uppercase;display:inline-block;margin-bottom:8px}
    .content-card strong{display:block;font-size:14px;margin-bottom:4px}
    .content-card p{margin:0 0 8px;font-size:13px;color:var(--muted)}
    .content-channel{font-size:11px;color:var(--muted)}
    .loading{display:flex;align-items:center;gap:14px;padding:48px;justify-content:center;color:var(--muted)}
    .spinner{width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--black);border-radius:50%;animation:spin .7s linear infinite}
    
    .error{background:#fef2f2;border:1px solid #fecaca;border-radius:24px;padding:24px;text-align:center}
    .error strong{color:#991b1b}.error p{color:#7f1d1d}
    .error button{margin-top:12px;background:var(--black);color:white;border:0;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer}
    @media(max-width:900px){.grid-2{grid-template-columns:1fr}}
  `]
})
export class AiMarketingComponent {
  private api = inject(AiMarketingService);
  loading = true; error = '';
  campaigns: any[] = [];
  segments: any[] = [];
  channelPerf: any[] = [];
  content: any[] = [];

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true; this.error = '';
    let c = 0;
    const done = () => { if (++c >= 4) this.loading = false; };
    this.api.getCampaigns().subscribe({ next: (d) => { this.campaigns = d.data || d || []; done(); }, error: () => done() });
    this.api.getAudienceSegments().subscribe({ next: (d) => { this.segments = d.data || d || []; done(); }, error: () => done() });
    this.api.getChannelPerformance().subscribe({ next: (d) => { this.channelPerf = d.data || d || []; done(); }, error: () => done() });
    this.api.getContentSuggestions().subscribe({ next: (d) => { this.content = d.data || d || []; done(); }, error: () => done() });
  }
}
