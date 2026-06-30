import { Component } from '@angular/core';
import { UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [UpperCasePipe],
  template: `
    <section class="section">
      <div class="container">
        <span class="badge">{{ title | uppercase }}</span>
        <h1>{{ title }}</h1>
        <p>This page is included in Step 21 foundation and ready for full production content.</p>
        <div class="card">
          <h3>{{ title }} Foundation</h3>
          <p>Next milestones will expand this page with full UI, copy and functionality.</p>
        </div>
      </div>
    </section>
  `
})
export class PageComponent {
  title = 'Page';
}