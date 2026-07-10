import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface ResourceElement {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: 'available' | 'occupied' | 'maintenance' | 'blocked';
  rotation: number;
  assignedTo?: string;
  notes?: string;
}

interface FloorPlan {
  id: string;
  name: string;
  width: number;
  height: number;
  elements: ResourceElement[];
  createdAt: string;
  updatedAt: string;
}

interface ResourceType {
  type: string;
  label: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
  color: string;
}

@Component({
  selector: 'app-resource-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="resource-map-container">
      <!-- Header -->
      <header class="rm-header">
        <div class="rm-header-content">
          <div class="rm-header-left">
            <div class="rm-logo">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="10" fill="url(#logoGrad)"/>
                <path d="M12 14h16v2H12zm0 5h12v2H12zm0 5h16v2H12z" fill="white" opacity="0.9"/>
                <defs>
                  <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40">
                    <stop stop-color="#6366f1"/>
                    <stop offset="1" stop-color="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div class="rm-title-group">
              <h1 class="rm-title">Resource Map</h1>
              <p class="rm-subtitle">Enterprise Visual Floor Plan Management</p>
            </div>
          </div>
          <div class="rm-header-actions">
            <button class="rm-btn rm-btn-ghost" (click)="undo()" title="Undo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 7v6h6M21 17a9 9 0 00-9-9 9 9 0 00-6.69 3L3 13"/>
              </svg>
            </button>
            <button class="rm-btn rm-btn-ghost" (click)="redo()" title="Redo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 7v6h-6M3 17a9 9 0 019-9 9 9 0 016.69 3L21 13"/>
              </svg>
            </button>
            <div class="rm-divider"></div>
            <button class="rm-btn rm-btn-ghost" (click)="zoomIn()" title="Zoom In">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/>
              </svg>
            </button>
            <span class="rm-zoom-level">{{ zoomLevel }}%</span>
            <button class="rm-btn rm-btn-ghost" (click)="zoomOut()" title="Zoom Out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/>
              </svg>
            </button>
            <div class="rm-divider"></div>
            <button class="rm-btn rm-btn-primary" (click)="saveFloorPlan()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
              </svg>
              Save
            </button>
            <button class="rm-btn rm-btn-outline" (click)="exportFloorPlan()">Export</button>
          </div>
        </div>
      </header>

      <div class="rm-body">
        <!-- Resource Palette -->
        <aside class="rm-palette">
          <div class="rm-panel">
            <h3 class="rm-panel-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Resource Palette
            </h3>
            <div class="rm-palette-grid">
              <div *ngFor="let rt of resourceTypes"
                   class="rm-palette-item"
                   [class.rm-palette-selected]="selectedPaletteType === rt.type"
                   (click)="selectPaletteType(rt)"
                   draggable="true"
                   (dragstart)="onDragStart($event, rt)">
                <div class="rm-palette-icon" [style.background]="rt.color">
                  <span class="rm-palette-emoji">{{ rt.icon }}</span>
                </div>
                <span class="rm-palette-label">{{ rt.label }}</span>
              </div>
            </div>
          </div>

          <!-- Status Legend -->
          <div class="rm-panel">
            <h3 class="rm-panel-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              Status Legend
            </h3>
            <div class="rm-legend">
              <div class="rm-legend-item">
                <span class="rm-legend-dot rm-status-available"></span>
                <span>Available</span>
              </div>
              <div class="rm-legend-item">
                <span class="rm-legend-dot rm-status-occupied"></span>
                <span>Occupied</span>
              </div>
              <div class="rm-legend-item">
                <span class="rm-legend-dot rm-status-maintenance"></span>
                <span>Maintenance</span>
              </div>
              <div class="rm-legend-item">
                <span class="rm-legend-dot rm-status-blocked"></span>
                <span>Blocked</span>
              </div>
            </div>
          </div>
        </aside>

        <!-- Canvas Area -->
        <main class="rm-canvas-wrapper">
          <!-- Floor Plan Selector -->
          <div class="rm-floor-selector">
            <select class="rm-select" [(ngModel)]="currentFloorPlanId" (change)="onFloorPlanChange()">
              <option *ngFor="let fp of floorPlans" [value]="fp.id">{{ fp.name }}</option>
            </select>
            <button class="rm-btn rm-btn-sm rm-btn-ghost" (click)="createNewFloorPlan()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Floor
            </button>
          </div>

          <!-- Canvas -->
          <div class="rm-canvas-container"
               #canvasContainer
               (drop)="onDrop($event)"
               (dragover)="onDragOver($event)"
               (mousedown)="onCanvasMouseDown($event)"
               (mousemove)="onCanvasMouseMove($event)"
               (mouseup)="onCanvasMouseUp($event)">
            <div class="rm-canvas"
                 [style.transform]="'scale(' + (zoomLevel / 100) + ')'"
                 [style.width.px]="800"
                 [style.height.px]="600">
              <!-- Grid Background -->
              <svg class="rm-grid-bg" width="800" height="600">
                <defs>
                  <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(99,102,241,0.08)" stroke-width="0.5"/>
                  </pattern>
                  <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                    <rect width="100" height="100" fill="url(#smallGrid)"/>
                    <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(99,102,241,0.15)" stroke-width="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)"/>
              </svg>

              <!-- Resource Elements -->
              <div *ngFor="let elem of currentElements"
                   class="rm-element"
                   [class.rm-element-selected]="selectedElement?.id === elem.id"
                   [class.rm-element-occupied]="elem.status === 'occupied'"
                   [class.rm-element-maintenance]="elem.status === 'maintenance'"
                   [class.rm-element-blocked]="elem.status === 'blocked'"
                   [style.left.px]="elem.x"
                   [style.top.px]="elem.y"
                   [style.width.px]="elem.width"
                   [style.height.px]="elem.height"
                   [style.transform]="'rotate(' + elem.rotation + 'deg)'"
                   (mousedown)="onElementMouseDown($event, elem)"
                   (dblclick)="editElement(elem)">
                <div class="rm-element-header">
                  <span class="rm-element-icon">{{ getResourceIcon(elem.type) }}</span>
                  <span class="rm-element-label">{{ elem.label }}</span>
                </div>
                <div class="rm-element-body">
                  <span class="rm-element-type">{{ elem.type }}</span>
                  <span class="rm-element-status" [class]="'rm-status-' + elem.status">
                    {{ elem.status }}
                  </span>
                </div>
                <!-- Resize Handles -->
                <div class="rm-resize-handle rm-resize-nw" (mousedown)="onResizeStart($event, elem, 'nw')"></div>
                <div class="rm-resize-handle rm-resize-ne" (mousedown)="onResizeStart($event, elem, 'ne')"></div>
                <div class="rm-resize-handle rm-resize-sw" (mousedown)="onResizeStart($event, elem, 'sw')"></div>
                <div class="rm-resize-handle rm-resize-se" (mousedown)="onResizeStart($event, elem, 'se')"></div>
              </div>

              <!-- Drop Zone Indicator -->
              <div *ngIf="isDraggingOver" class="rm-drop-indicator"
                   [style.left.px]="dropPreview.x"
                   [style.top.px]="dropPreview.y">
                <span>Drop here</span>
              </div>
            </div>
          </div>

          <!-- Canvas Coordinates -->
          <div class="rm-coordinates">
            X: {{ mousePos.x | number:'1.0-0' }} &nbsp;|&nbsp; Y: {{ mousePos.y | number:'1.0-0' }}
          </div>
        </main>

        <!-- Properties Panel -->
        <aside class="rm-properties" *ngIf="selectedElement">
          <div class="rm-panel">
            <h3 class="rm-panel-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
              Element Properties
            </h3>

            <div class="rm-prop-group">
              <label class="rm-prop-label">Label</label>
              <input class="rm-input" [(ngModel)]="selectedElement.label" (ngModelChange)="onPropertyChange()"/>
            </div>

            <div class="rm-prop-group">
              <label class="rm-prop-label">Type</label>
              <select class="rm-select" [(ngModel)]="selectedElement.type" (ngModelChange)="onPropertyChange()">
                <option *ngFor="let rt of resourceTypes" [value]="rt.type">{{ rt.label }}</option>
              </select>
            </div>

            <div class="rm-prop-row">
              <div class="rm-prop-group rm-prop-half">
                <label class="rm-prop-label">X Position</label>
                <input class="rm-input" type="number" [(ngModel)]="selectedElement.x" (ngModelChange)="onPropertyChange()"/>
              </div>
              <div class="rm-prop-group rm-prop-half">
                <label class="rm-prop-label">Y Position</label>
                <input class="rm-input" type="number" [(ngModel)]="selectedElement.y" (ngModelChange)="onPropertyChange()"/>
              </div>
            </div>

            <div class="rm-prop-row">
              <div class="rm-prop-group rm-prop-half">
                <label class="rm-prop-label">Width</label>
                <input class="rm-input" type="number" [(ngModel)]="selectedElement.width" (ngModelChange)="onPropertyChange()"/>
              </div>
              <div class="rm-prop-group rm-prop-half">
                <label class="rm-prop-label">Height</label>
                <input class="rm-input" type="number" [(ngModel)]="selectedElement.height" (ngModelChange)="onPropertyChange()"/>
              </div>
            </div>

            <div class="rm-prop-group">
              <label class="rm-prop-label">Rotation</label>
              <input class="rm-input" type="range" min="0" max="360" [(ngModel)]="selectedElement.rotation" (ngModelChange)="onPropertyChange()"/>
              <span class="rm-prop-value">{{ selectedElement.rotation }}°</span>
            </div>

            <div class="rm-prop-group">
              <label class="rm-prop-label">Status</label>
              <div class="rm-status-buttons">
                <button *ngFor="let s of statusOptions"
                        class="rm-status-btn"
                        [class]="'rm-status-btn-' + s.value"
                        [class.rm-status-btn-active]="selectedElement.status === s.value"
                        (click)="setStatus(selectedElement, s.value)">
                  {{ s.label }}
                </button>
              </div>
            </div>

            <div class="rm-prop-group">
              <label class="rm-prop-label">Assigned To</label>
              <input class="rm-input" [(ngModel)]="selectedElement.assignedTo" placeholder="Staff member name" (ngModelChange)="onPropertyChange()"/>
            </div>

            <div class="rm-prop-group">
              <label class="rm-prop-label">Notes</label>
              <textarea class="rm-textarea" [(ngModel)]="selectedElement.notes" placeholder="Additional notes..." (ngModelChange)="onPropertyChange()"></textarea>
            </div>

            <div class="rm-prop-actions">
              <button class="rm-btn rm-btn-danger" (click)="deleteElement()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
                Delete
              </button>
              <button class="rm-btn rm-btn-ghost" (click)="duplicateElement()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                Duplicate
              </button>
            </div>
          </div>
        </aside>

        <!-- Resource List Sidebar -->
        <aside class="rm-sidebar">
          <div class="rm-panel">
            <h3 class="rm-panel-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              Resource List
              <span class="rm-badge">{{ currentElements.length }}</span>
            </h3>

            <div class="rm-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input class="rm-search-input" placeholder="Search resources..." [(ngModel)]="searchQuery" (ngModelChange)="filterResources()"/>
            </div>

            <div class="rm-resource-list">
              <div *ngFor="let elem of filteredElements"
                   class="rm-resource-item"
                   [class.rm-resource-item-selected]="selectedElement?.id === elem.id"
                   (click)="selectElement(elem)">
                <div class="rm-resource-info">
                  <span class="rm-resource-icon">{{ getResourceIcon(elem.type) }}</span>
                  <div class="rm-resource-details">
                    <span class="rm-resource-name">{{ elem.label }}</span>
                    <span class="rm-resource-meta">{{ elem.type }} • ({{ elem.x }}, {{ elem.y }})</span>
                  </div>
                </div>
                <span class="rm-resource-status-dot" [class]="'rm-status-' + elem.status"></span>
              </div>

              <div *ngIf="filteredElements.length === 0" class="rm-empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
                </svg>
                <p>No resources found</p>
                <span>Drag items from the palette to add</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <!-- Toast Notification -->
      <div class="rm-toast" *ngIf="toastMessage" [class.rm-toast-visible]="toastVisible">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        {{ toastMessage }}
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      background: #0f0f23;
      color: #e2e8f0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow: hidden;
    }

    /* ===== HEADER ===== */
    .rm-header {
      background: rgba(15, 15, 35, 0.95);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(99, 102, 241, 0.15);
      padding: 0 24px;
      height: 64px;
      position: relative;
      z-index: 100;
    }

    .rm-header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.5), transparent);
    }

    .rm-header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 100%;
      max-width: 100%;
    }

    .rm-header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .rm-logo {
      display: flex;
      align-items: center;
      filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.4));
    }

    .rm-title-group {
      display: flex;
      flex-direction: column;
    }

    .rm-title {
      font-size: 20px;
      font-weight: 700;
      background: linear-gradient(135deg, #818cf8, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 0;
      line-height: 1.2;
    }

    .rm-subtitle {
      font-size: 11px;
      color: #64748b;
      margin: 0;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .rm-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .rm-divider {
      width: 1px;
      height: 24px;
      background: rgba(99, 102, 241, 0.2);
      margin: 0 4px;
    }

    .rm-zoom-level {
      font-size: 12px;
      color: #94a3b8;
      min-width: 40px;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    /* ===== BUTTONS ===== */
    .rm-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      outline: none;
      white-space: nowrap;
    }

    .rm-btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    .rm-btn-primary {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }

    .rm-btn-primary:hover {
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.5);
      transform: translateY(-1px);
    }

    .rm-btn-outline {
      background: transparent;
      color: #94a3b8;
      border: 1px solid rgba(99, 102, 241, 0.3);
    }

    .rm-btn-outline:hover {
      border-color: rgba(99, 102, 241, 0.6);
      color: #e2e8f0;
      background: rgba(99, 102, 241, 0.1);
    }

    .rm-btn-ghost {
      background: transparent;
      color: #94a3b8;
    }

    .rm-btn-ghost:hover {
      background: rgba(99, 102, 241, 0.1);
      color: #e2e8f0;
    }

    .rm-btn-danger {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .rm-btn-danger:hover {
      background: rgba(239, 68, 68, 0.25);
      border-color: rgba(239, 68, 68, 0.5);
    }

    /* ===== BODY LAYOUT ===== */
    .rm-body {
      display: flex;
      height: calc(100vh - 64px);
      overflow: hidden;
    }

    /* ===== PALETTE SIDEBAR ===== */
    .rm-palette {
      width: 220px;
      background: rgba(15, 15, 35, 0.8);
      border-right: 1px solid rgba(99, 102, 241, 0.1);
      display: flex;
      flex-direction: column;
      gap: 1px;
      overflow-y: auto;
      flex-shrink: 0;
    }

    .rm-palette-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 4px;
    }

    .rm-palette-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 12px 8px;
      border-radius: 10px;
      background: rgba(30, 30, 60, 0.5);
      border: 1px solid rgba(99, 102, 241, 0.1);
      cursor: grab;
      transition: all 0.2s ease;
      user-select: none;
    }

    .rm-palette-item:hover {
      background: rgba(99, 102, 241, 0.1);
      border-color: rgba(99, 102, 241, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .rm-palette-item:active {
      cursor: grabbing;
      transform: scale(0.95);
    }

    .rm-palette-selected {
      background: rgba(99, 102, 241, 0.15) !important;
      border-color: rgba(99, 102, 241, 0.5) !important;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    }

    .rm-palette-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    .rm-palette-emoji {
      filter: grayscale(0.2);
    }

    .rm-palette-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
    }

    /* ===== LEGEND ===== */
    .rm-legend {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .rm-legend-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: #94a3b8;
    }

    .rm-legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* ===== PANELS ===== */
    .rm-panel {
      padding: 16px;
      background: rgba(20, 20, 45, 0.6);
      backdrop-filter: blur(10px);
    }

    .rm-panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
      margin: 0 0 14px 0;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(99, 102, 241, 0.1);
    }

    .rm-badge {
      margin-left: auto;
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 700;
    }

    /* ===== CANVAS ===== */
    .rm-canvas-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      background: #0a0a1a;
    }

    .rm-floor-selector {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: rgba(15, 15, 35, 0.8);
      border-bottom: 1px solid rgba(99, 102, 241, 0.1);
      z-index: 10;
    }

    .rm-canvas-container {
      flex: 1;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      background:
        radial-gradient(ellipse at 20% 50%, rgba(99, 102, 241, 0.05) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 50%),
        #0a0a1a;
      position: relative;
    }

    .rm-canvas {
      position: relative;
      background: rgba(15, 15, 35, 0.9);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 12px;
      box-shadow:
        0 0 0 1px rgba(99, 102, 241, 0.1),
        0 20px 60px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
      transform-origin: center center;
      transition: transform 0.1s ease;
    }

    .rm-grid-bg {
      position: absolute;
      top: 0;
      left: 0;
      border-radius: 12px;
      pointer-events: none;
    }

    .rm-coordinates {
      position: absolute;
      bottom: 12px;
      left: 12px;
      background: rgba(15, 15, 35, 0.9);
      backdrop-filter: blur(10px);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      color: #64748b;
      font-variant-numeric: tabular-nums;
      border: 1px solid rgba(99, 102, 241, 0.1);
    }

    /* ===== RESOURCE ELEMENTS ===== */
    .rm-element {
      position: absolute;
      background: rgba(30, 30, 60, 0.9);
      border: 2px solid rgba(99, 102, 241, 0.3);
      border-radius: 10px;
      cursor: move;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: box-shadow 0.2s ease, border-color 0.2s ease;
      animation: elementFadeIn 0.3s ease;
    }

    @keyframes elementFadeIn {
      from {
        opacity: 0;
        transform: scale(0.8);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .rm-element:hover {
      border-color: rgba(99, 102, 241, 0.6);
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.2);
      z-index: 10;
    }

    .rm-element-selected {
      border-color: #818cf8 !important;
      box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.3), 0 8px 32px rgba(99, 102, 241, 0.3) !important;
      z-index: 20;
    }

    .rm-element-occupied {
      border-color: rgba(251, 191, 36, 0.5);
      background: rgba(60, 40, 10, 0.8);
    }

    .rm-element-maintenance {
      border-color: rgba(139, 92, 246, 0.5);
      background: rgba(40, 20, 60, 0.8);
    }

    .rm-element-blocked {
      border-color: rgba(239, 68, 68, 0.5);
      background: rgba(60, 15, 15, 0.8);
    }

    .rm-element-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid rgba(99, 102, 241, 0.1);
    }

    .rm-element-icon {
      font-size: 14px;
    }

    .rm-element-label {
      font-size: 11px;
      font-weight: 600;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rm-element-body {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px;
      flex: 1;
    }

    .rm-element-type {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      font-weight: 600;
    }

    .rm-element-status {
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .rm-status-available {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }

    .rm-status-occupied {
      background: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
    }

    .rm-status-maintenance {
      background: rgba(139, 92, 246, 0.15);
      color: #8b5cf6;
    }

    .rm-status-blocked {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    /* ===== RESIZE HANDLES ===== */
    .rm-resize-handle {
      position: absolute;
      width: 10px;
      height: 10px;
      background: #818cf8;
      border: 2px solid #0f0f23;
      border-radius: 2px;
      z-index: 5;
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .rm-element:hover .rm-resize-handle,
    .rm-element-selected .rm-resize-handle {
      opacity: 1;
    }

    .rm-resize-nw { top: -5px; left: -5px; cursor: nw-resize; }
    .rm-resize-ne { top: -5px; right: -5px; cursor: ne-resize; }
    .rm-resize-sw { bottom: -5px; left: -5px; cursor: sw-resize; }
    .rm-resize-se { bottom: -5px; right: -5px; cursor: se-resize; }

    /* ===== DROP INDICATOR ===== */
    .rm-drop-indicator {
      position: absolute;
      width: 120px;
      height: 80px;
      border: 2px dashed rgba(99, 102, 241, 0.5);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(99, 102, 241, 0.05);
      pointer-events: none;
      animation: dropPulse 1s ease infinite;
    }

    .rm-drop-indicator span {
      font-size: 11px;
      color: #818cf8;
      font-weight: 600;
    }

    @keyframes dropPulse {
      0%, 100% { border-color: rgba(99, 102, 241, 0.3); }
      50% { border-color: rgba(99, 102, 241, 0.7); }
    }

    /* ===== PROPERTIES PANEL ===== */
    .rm-properties {
      width: 280px;
      background: rgba(15, 15, 35, 0.8);
      border-left: 1px solid rgba(99, 102, 241, 0.1);
      overflow-y: auto;
      flex-shrink: 0;
      animation: slideIn 0.2s ease;
    }

    @keyframes slideIn {
      from { transform: translateX(20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .rm-prop-group {
      margin-bottom: 14px;
    }

    .rm-prop-label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .rm-prop-row {
      display: flex;
      gap: 10px;
    }

    .rm-prop-half {
      flex: 1;
    }

    .rm-prop-value {
      font-size: 11px;
      color: #94a3b8;
      margin-left: 8px;
      font-variant-numeric: tabular-nums;
    }

    .rm-input {
      width: 100%;
      padding: 8px 12px;
      background: rgba(30, 30, 60, 0.6);
      border: 1px solid rgba(99, 102, 241, 0.15);
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 13px;
      outline: none;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .rm-input:focus {
      border-color: rgba(99, 102, 241, 0.5);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .rm-input[type="range"] {
      padding: 0;
      height: 6px;
      -webkit-appearance: none;
      background: rgba(99, 102, 241, 0.2);
      border-radius: 3px;
      border: none;
      margin-top: 4px;
    }

    .rm-input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #818cf8;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(99, 102, 241, 0.4);
    }

    .rm-select {
      width: 100%;
      padding: 8px 12px;
      background: rgba(30, 30, 60, 0.6);
      border: 1px solid rgba(99, 102, 241, 0.15);
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 13px;
      outline: none;
      cursor: pointer;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .rm-select:focus {
      border-color: rgba(99, 102, 241, 0.5);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .rm-textarea {
      width: 100%;
      padding: 8px 12px;
      background: rgba(30, 30, 60, 0.6);
      border: 1px solid rgba(99, 102, 241, 0.15);
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 13px;
      outline: none;
      resize: vertical;
      min-height: 60px;
      font-family: inherit;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .rm-textarea:focus {
      border-color: rgba(99, 102, 241, 0.5);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .rm-status-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }

    .rm-status-btn {
      padding: 6px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      cursor: pointer;
      border: 1px solid transparent;
      background: rgba(30, 30, 60, 0.5);
      color: #94a3b8;
      transition: all 0.2s ease;
    }

    .rm-status-btn:hover {
      background: rgba(50, 50, 80, 0.5);
    }

    .rm-status-btn-available.rm-status-btn-active {
      background: rgba(34, 197, 94, 0.2);
      border-color: rgba(34, 197, 94, 0.5);
      color: #22c55e;
    }

    .rm-status-btn-occupied.rm-status-btn-active {
      background: rgba(251, 191, 36, 0.2);
      border-color: rgba(251, 191, 36, 0.5);
      color: #fbbf24;
    }

    .rm-status-btn-maintenance.rm-status-btn-active {
      background: rgba(139, 92, 246, 0.2);
      border-color: rgba(139, 92, 246, 0.5);
      color: #8b5cf6;
    }

    .rm-status-btn-blocked.rm-status-btn-active {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.5);
      color: #ef4444;
    }

    .rm-prop-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(99, 102, 241, 0.1);
    }

    .rm-prop-actions .rm-btn {
      flex: 1;
      justify-content: center;
    }

    /* ===== RESOURCE LIST SIDEBAR ===== */
    .rm-sidebar {
      width: 260px;
      background: rgba(15, 15, 35, 0.8);
      border-left: 1px solid rgba(99, 102, 241, 0.1);
      overflow-y: auto;
      flex-shrink: 0;
    }

    .rm-search {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 0 12px 0;
      color: #64748b;
    }

    .rm-search-input {
      flex: 1;
      padding: 8px 12px;
      background: rgba(30, 30, 60, 0.6);
      border: 1px solid rgba(99, 102, 241, 0.15);
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 12px;
      outline: none;
      transition: all 0.2s ease;
    }

    .rm-search-input:focus {
      border-color: rgba(99, 102, 241, 0.5);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .rm-resource-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: calc(100vh - 200px);
      overflow-y: auto;
    }

    .rm-resource-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
    }

    .rm-resource-item:hover {
      background: rgba(99, 102, 241, 0.08);
      border-color: rgba(99, 102, 241, 0.15);
    }

    .rm-resource-item-selected {
      background: rgba(99, 102, 241, 0.12) !important;
      border-color: rgba(99, 102, 241, 0.3) !important;
    }

    .rm-resource-info {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .rm-resource-icon {
      font-size: 16px;
      flex-shrink: 0;
    }

    .rm-resource-details {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .rm-resource-name {
      font-size: 12px;
      font-weight: 600;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rm-resource-meta {
      font-size: 10px;
      color: #64748b;
    }

    .rm-resource-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .rm-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      text-align: center;
    }

    .rm-empty-state p {
      font-size: 13px;
      color: #94a3b8;
      margin: 12px 0 4px 0;
    }

    .rm-empty-state span {
      font-size: 11px;
      color: #64748b;
    }

    /* ===== TOAST ===== */
    .rm-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 10px;
      color: #22c55e;
      font-size: 13px;
      font-weight: 500;
      backdrop-filter: blur(20px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1000;
    }

    .rm-toast-visible {
      transform: translateY(0);
      opacity: 1;
    }

    /* ===== SCROLLBAR ===== */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    ::-webkit-scrollbar-track {
      background: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background: rgba(99, 102, 241, 0.2);
      border-radius: 3px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: rgba(99, 102, 241, 0.4);
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 1200px) {
      .rm-sidebar {
        width: 220px;
      }
      .rm-properties {
        width: 240px;
      }
      .rm-palette {
        width: 180px;
      }
    }
  `]
})
export class ResourceMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;

  resourceTypes: ResourceType[] = [
    { type: 'CHAIR', label: 'Chair', icon: '💇', defaultWidth: 80, defaultHeight: 70, color: 'rgba(99,102,241,0.2)' },
    { type: 'ROOM', label: 'Room', icon: '🚪', defaultWidth: 140, defaultHeight: 120, color: 'rgba(139,92,246,0.2)' },
    { type: 'MIRROR', label: 'Mirror', icon: '🪞', defaultWidth: 60, defaultHeight: 80, color: 'rgba(14,165,233,0.2)' },
    { type: 'SINK', label: 'Sink', icon: '🚰', defaultWidth: 50, defaultHeight: 50, color: 'rgba(20,184,166,0.2)' },
    { type: 'MACHINE', label: 'Machine', icon: '⚙️', defaultWidth: 70, defaultHeight: 70, color: 'rgba(249,115,22,0.2)' },
    { type: 'SPA_ROOM', label: 'Spa Room', icon: '🧖', defaultWidth: 160, defaultHeight: 140, color: 'rgba(168,85,247,0.2)' },
    { type: 'VIP_ROOM', label: 'VIP Room', icon: '👑', defaultWidth: 150, defaultHeight: 130, color: 'rgba(234,179,8,0.2)' },
    { type: 'EQUIPMENT', label: 'Equipment', icon: '🔧', defaultWidth: 60, defaultHeight: 60, color: 'rgba(107,114,128,0.2)' }
  ];

  statusOptions = [
    { value: 'available' as const, label: 'Available' },
    { value: 'occupied' as const, label: 'Occupied' },
    { value: 'maintenance' as const, label: 'Maintenance' },
    { value: 'blocked' as const, label: 'Blocked' }
  ];

  floorPlans: FloorPlan[] = [];
  currentFloorPlanId = '';
  currentElements: ResourceElement[] = [];
  filteredElements: ResourceElement[] = [];
  selectedElement: ResourceElement | null = null;
  selectedPaletteType = '';

  zoomLevel = 100;
  searchQuery = '';
  toastMessage = '';
  toastVisible = false;

  mousePos = { x: 0, y: 0 };
  dropPreview = { x: 0, y: 0 };
  isDraggingOver = false;
  isDragging = false;
  isResizing = false;
  dragOffset = { x: 0, y: 0 };
  resizeDir = '';
  resizeStart = { x: 0, y: 0, w: 0, h: 0, ex: 0, ey: 0 };

  private undoStack: ResourceElement[][] = [];
  private redoStack: ResourceElement[][] = [];
  private toastTimer: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadFloorPlans();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  loadFloorPlans(): void {
    this.floorPlans = [
      {
        id: 'fp-1',
        name: 'Ground Floor',
        width: 800,
        height: 600,
        elements: [
          { id: 'e1', type: 'CHAIR', label: 'Chair 1', x: 60, y: 60, width: 80, height: 70, status: 'available', rotation: 0 },
          { id: 'e2', type: 'CHAIR', label: 'Chair 2', x: 180, y: 60, width: 80, height: 70, status: 'occupied', rotation: 0, assignedTo: 'Priya' },
          { id: 'e3', type: 'MIRROR', label: 'Mirror 1', x: 60, y: 160, width: 60, height: 80, status: 'available', rotation: 0 },
          { id: 'e4', type: 'SINK', label: 'Wash Station', x: 200, y: 160, width: 50, height: 50, status: 'available', rotation: 0 },
          { id: 'e5', type: 'ROOM', label: 'Treatment Room A', x: 400, y: 60, width: 140, height: 120, status: 'occupied', rotation: 0, assignedTo: 'Anita' },
          { id: 'e6', type: 'SPA_ROOM', label: 'Spa Suite', x: 400, y: 240, width: 160, height: 140, status: 'available', rotation: 0 },
          { id: 'e7', type: 'VIP_ROOM', label: 'VIP Lounge', x: 600, y: 60, width: 150, height: 130, status: 'maintenance', rotation: 0, notes: 'AC repair scheduled' },
          { id: 'e8', type: 'MACHINE', label: 'Steam Unit', x: 180, y: 240, width: 70, height: 70, status: 'available', rotation: 0 },
          { id: 'e9', type: 'EQUIPMENT', label: 'Trolley 1', x: 300, y: 240, width: 60, height: 60, status: 'available', rotation: 0 },
          { id: 'e10', type: 'CHAIR', label: 'Chair 3', x: 60, y: 340, width: 80, height: 70, status: 'blocked', rotation: 0, notes: 'Under sanitization' }
        ],
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-07-09T08:30:00Z'
      },
      {
        id: 'fp-2',
        name: 'First Floor',
        width: 800,
        height: 600,
        elements: [
          { id: 'f1', type: 'CHAIR', label: 'Styling Chair 1', x: 80, y: 80, width: 80, height: 70, status: 'available', rotation: 0 },
          { id: 'f2', type: 'CHAIR', label: 'Styling Chair 2', x: 200, y: 80, width: 80, height: 70, status: 'occupied', rotation: 0, assignedTo: 'Ravi' },
          { id: 'f3', type: 'MIRROR', label: 'Full Mirror', x: 80, y: 180, width: 60, height: 80, status: 'available', rotation: 0 },
          { id: 'f4', type: 'SPA_ROOM', label: 'Ayurveda Room', x: 400, y: 100, width: 160, height: 140, status: 'available', rotation: 0 }
        ],
        createdAt: '2026-02-20T14:00:00Z',
        updatedAt: '2026-07-08T16:45:00Z'
      }
    ];

    this.currentFloorPlanId = this.floorPlans[0].id;
    this.loadCurrentElements();
  }

  loadCurrentElements(): void {
    const plan = this.floorPlans.find(fp => fp.id === this.currentFloorPlanId);
    this.currentElements = plan ? [...plan.elements] : [];
    this.filteredElements = [...this.currentElements];
    this.selectedElement = null;
  }

  onFloorPlanChange(): void {
    this.loadCurrentElements();
  }

  selectPaletteType(rt: ResourceType): void {
    this.selectedPaletteType = this.selectedPaletteType === rt.type ? '' : rt.type;
  }

  getResourceIcon(type: string): string {
    const rt = this.resourceTypes.find(r => r.type === type);
    return rt ? rt.icon : '📦';
  }

  /* ===== DRAG & DROP ===== */
  onDragStart(event: DragEvent, rt: ResourceType): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', rt.type);
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
    this.isDraggingOver = true;

    const container = this.canvasContainer.nativeElement;
    const rect = container.getBoundingClientRect();
    const canvasRect = container.querySelector('.rm-canvas')?.getBoundingClientRect();

    if (canvasRect) {
      const scale = this.zoomLevel / 100;
      this.dropPreview.x = (event.clientX - canvasRect.left) / scale;
      this.dropPreview.y = (event.clientY - canvasRect.top) / scale;
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver = false;

    const type = event.dataTransfer?.getData('text/plain');
    if (!type) return;

    const rt = this.resourceTypes.find(r => r.type === type);
    if (!rt) return;

    const container = this.canvasContainer.nativeElement;
    const canvasRect = container.querySelector('.rm-canvas')?.getBoundingClientRect();
    if (!canvasRect) return;

    const scale = this.zoomLevel / 100;
    const x = Math.round((event.clientX - canvasRect.left) / scale - rt.defaultWidth / 2);
    const y = Math.round((event.clientY - canvasRect.top) / scale - rt.defaultHeight / 2);

    this.addElement(rt, x, y);
  }

  addElement(rt: ResourceType, x: number, y: number): void {
    this.pushUndo();
    const elem: ResourceElement = {
      id: 'e-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      type: rt.type,
      label: rt.label + ' ' + (this.currentElements.filter(e => e.type === rt.type).length + 1),
      x: Math.max(0, x),
      y: Math.max(0, y),
      width: rt.defaultWidth,
      height: rt.defaultHeight,
      status: 'available',
      rotation: 0
    };
    this.currentElements.push(elem);
    this.filterResources();
    this.selectedElement = elem;
    this.showToast('Resource added: ' + elem.label);
  }

  /* ===== MOUSE EVENTS ===== */
  onCanvasMouseDown(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('.rm-element')) return;
    this.selectedElement = null;
  }

  onCanvasMouseMove(event: MouseEvent): void {
    const container = this.canvasContainer?.nativeElement;
    if (!container) return;

    const canvasRect = container.querySelector('.rm-canvas')?.getBoundingClientRect();
    if (!canvasRect) return;

    const scale = this.zoomLevel / 100;
    this.mousePos.x = Math.round((event.clientX - canvasRect.left) / scale);
    this.mousePos.y = Math.round((event.clientY - canvasRect.top) / scale);

    if (this.isDragging && this.selectedElement) {
      this.pushUndo();
      this.selectedElement.x = Math.max(0, Math.round(this.mousePos.x - this.dragOffset.x));
      this.selectedElement.y = Math.max(0, Math.round(this.mousePos.y - this.dragOffset.y));
      this.filterResources();
    }

    if (this.isResizing && this.selectedElement) {
      const dx = this.mousePos.x - this.resizeStart.x;
      const dy = this.mousePos.y - this.resizeStart.y;
      const el = this.selectedElement;

      switch (this.resizeDir) {
        case 'se':
          el.width = Math.max(40, this.resizeStart.w + dx);
          el.height = Math.max(40, this.resizeStart.h + dy);
          break;
        case 'sw':
          el.x = this.resizeStart.ex + dx;
          el.width = Math.max(40, this.resizeStart.w - dx);
          el.height = Math.max(40, this.resizeStart.h + dy);
          break;
        case 'ne':
          el.width = Math.max(40, this.resizeStart.w + dx);
          el.y = this.resizeStart.ey + dy;
          el.height = Math.max(40, this.resizeStart.h - dy);
          break;
        case 'nw':
          el.x = this.resizeStart.ex + dx;
          el.y = this.resizeStart.ey + dy;
          el.width = Math.max(40, this.resizeStart.w - dx);
          el.height = Math.max(40, this.resizeStart.h - dy);
          break;
      }
    }
  }

  onCanvasMouseUp(event: MouseEvent): void {
    this.isDragging = false;
    this.isResizing = false;
  }

  onElementMouseDown(event: MouseEvent, elem: ResourceElement): void {
    event.stopPropagation();
    this.selectedElement = elem;

    const scale = this.zoomLevel / 100;
    const canvasRect = this.canvasContainer.nativeElement.querySelector('.rm-canvas')?.getBoundingClientRect();
    if (canvasRect) {
      this.dragOffset.x = (event.clientX - canvasRect.left) / scale - elem.x;
      this.dragOffset.y = (event.clientY - canvasRect.top) / scale - elem.y;
    }
    this.isDragging = true;
  }

  onResizeStart(event: MouseEvent, elem: ResourceElement, dir: string): void {
    event.stopPropagation();
    event.preventDefault();
    this.selectedElement = elem;
    this.isResizing = true;
    this.resizeDir = dir;

    const scale = this.zoomLevel / 100;
    const canvasRect = this.canvasContainer.nativeElement.querySelector('.rm-canvas')?.getBoundingClientRect();
    if (canvasRect) {
      this.resizeStart.x = (event.clientX - canvasRect.left) / scale;
      this.resizeStart.y = (event.clientY - canvasRect.top) / scale;
    }
    this.resizeStart.w = elem.width;
    this.resizeStart.h = elem.height;
    this.resizeStart.ex = elem.x;
    this.resizeStart.ey = elem.y;
  }

  selectElement(elem: ResourceElement): void {
    this.selectedElement = elem;
  }

  editElement(elem: ResourceElement): void {
    this.selectedElement = elem;
  }

  /* ===== PROPERTIES ===== */
  onPropertyChange(): void {
    this.filterResources();
  }

  setStatus(elem: ResourceElement, status: 'available' | 'occupied' | 'maintenance' | 'blocked'): void {
    this.pushUndo();
    elem.status = status;
  }

  deleteElement(): void {
    if (!this.selectedElement) return;
    this.pushUndo();
    this.currentElements = this.currentElements.filter(e => e.id !== this.selectedElement!.id);
    this.filterResources();
    this.showToast('Resource deleted');
    this.selectedElement = null;
  }

  duplicateElement(): void {
    if (!this.selectedElement) return;
    this.pushUndo();
    const clone: ResourceElement = {
      ...this.selectedElement,
      id: 'e-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      label: this.selectedElement.label + ' (Copy)',
      x: this.selectedElement.x + 20,
      y: this.selectedElement.y + 20
    };
    this.currentElements.push(clone);
    this.filterResources();
    this.selectedElement = clone;
    this.showToast('Resource duplicated');
  }

  /* ===== ZOOM ===== */
  zoomIn(): void {
    this.zoomLevel = Math.min(200, this.zoomLevel + 10);
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(30, this.zoomLevel - 10);
  }

  /* ===== UNDO / REDO ===== */
  pushUndo(): void {
    this.undoStack.push(JSON.parse(JSON.stringify(this.currentElements)));
    if (this.undoStack.length > 50) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(): void {
    if (this.undoStack.length === 0) return;
    this.redoStack.push(JSON.parse(JSON.stringify(this.currentElements)));
    this.currentElements = this.undoStack.pop()!;
    this.filterResources();
    this.showToast('Undo');
  }

  redo(): void {
    if (this.redoStack.length === 0) return;
    this.undoStack.push(JSON.parse(JSON.stringify(this.currentElements)));
    this.currentElements = this.redoStack.pop()!;
    this.filterResources();
    this.showToast('Redo');
  }

  /* ===== SEARCH ===== */
  filterResources(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredElements = q
      ? this.currentElements.filter(e =>
          e.label.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q) ||
          e.status.toLowerCase().includes(q) ||
          (e.assignedTo && e.assignedTo.toLowerCase().includes(q))
        )
      : [...this.currentElements];
  }

  /* ===== SAVE / EXPORT ===== */
  saveFloorPlan(): void {
    const plan = this.floorPlans.find(fp => fp.id === this.currentFloorPlanId);
    if (plan) {
      plan.elements = [...this.currentElements];
      plan.updatedAt = new Date().toISOString();
    }
    this.showToast('Floor plan saved successfully');
  }

  exportFloorPlan(): void {
    const plan = this.floorPlans.find(fp => fp.id === this.currentFloorPlanId);
    if (!plan) return;

    const data = JSON.stringify({ ...plan, elements: this.currentElements }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.name.replace(/\s+/g, '_')}_floor_plan.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Floor plan exported');
  }

  createNewFloorPlan(): void {
    const name = prompt('Enter floor plan name:');
    if (!name) return;

    const newPlan: FloorPlan = {
      id: 'fp-' + Date.now(),
      name,
      width: 800,
      height: 600,
      elements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.floorPlans.push(newPlan);
    this.currentFloorPlanId = newPlan.id;
    this.loadCurrentElements();
    this.showToast('Floor plan created: ' + name);
  }

  /* ===== TOAST ===== */
  showToast(message: string): void {
    this.toastMessage = message;
    this.toastVisible = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
      setTimeout(() => { this.toastMessage = ''; }, 300);
    }, 2500);
  }
}
