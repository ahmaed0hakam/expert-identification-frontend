import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '../icon/icon.component';

export interface CatalogDownloadHandler {
  downloadCatalog: (imageId: number, filename?: string) => void;
}

export interface ImageDetail {
  id: number;
  title: string;
  description?: string;
  category?: string;
  proxy_url?: string;
  chroma_id?: string | null;
  created_at?: string | null;
  accuracy_score?: number; // For search results
  has_catalog?: boolean;
  catalog_filename?: string;
}

@Component({
  selector: 'app-image-detail-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule, IconComponent],
  template: `
    <!-- Backdrop -->
    <div
      *ngIf="isOpen"
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      (click)="close()"
    >
      <!-- Modal Content -->
      <div
        class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 class="text-xl font-semibold text-gray-800">{{ 'admin.imageDetails' | translate }}</h2>
          <button
            (click)="close()"
            class="p-2 hover:bg-gray-100 rounded-full transition"
            [attr.aria-label]="'common.close' | translate"
          >
            <app-icon name="close" size="24"></app-icon>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Image -->
            <div class="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center min-h-[300px]">
              <img
                *ngIf="imageUrl"
                [src]="imageUrl"
                [alt]="image?.title"
                class="max-w-full max-h-[400px] object-contain"
                (error)="onImageError($event)"
              />
              <div *ngIf="!imageUrl" class="text-gray-400">
                <app-icon name="image" size="48"></app-icon>
              </div>
            </div>

            <!-- Details -->
            <div class="space-y-4">
              <!-- Title -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">
                  {{ 'admin.title' | translate }}
                </label>
                <p class="text-gray-900 text-lg">{{ image?.title || 'N/A' }}</p>
              </div>

              <!-- Catalog Download -->
              <div *ngIf="image?.has_catalog">
                <button
                  (click)="downloadCatalog()"
                  class="btn-primary btn-primary-sm flex items-center gap-1"
                  [title]="image?.catalog_filename || 'Download Catalog'"
                >
                  <app-icon name="download" size="16"></app-icon>
                  <span>{{ 'user.downloadCatalog' | translate }}</span>
                </button>
              </div>

              <!-- Description -->
              <div *ngIf="image?.description">
                <label class="block text-sm font-semibold text-gray-700 mb-1">
                  {{ 'admin.description' | translate }}
                </label>
                <p class="text-gray-600 text-sm leading-relaxed">{{ image?.description }}</p>
              </div>

              <!-- Category -->
              <div *ngIf="image?.category">
                <label class="block text-sm font-semibold text-gray-700 mb-1">
                  {{ 'admin.category' | translate }}
                </label>
                <p class="text-gray-600">{{ image?.category }}</p>
              </div>

              <!-- Indexing Status -->
              <!-- <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">
                  {{ 'admin.indexingStatus' | translate }}
                </label>
                <span
                  *ngIf="image?.chroma_id"
                  class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                  style="background-color: rgba(16, 185, 129, 0.1); color: var(--color-success-dark);"
                >
                  <app-icon name="check" size="16" color="--color-success-dark"></app-icon>
                  {{ 'admin.indexed' | translate }}
                </span>
                <span
                  *ngIf="!image?.chroma_id"
                  class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                  style="background-color: rgba(245, 158, 11, 0.1); color: var(--color-warning-dark);"
                >
                  <app-icon name="warning" size="16" color="--color-warning-dark"></app-icon>
                  {{ 'admin.notIndexed' | translate }}
                </span>
              </div> -->

              <!-- Accuracy Score (for search results) -->
              <div *ngIf="image && image.accuracy_score !== undefined">
                <label class="block text-sm font-semibold text-gray-700 mb-1">
                  {{ 'user.confidence' | translate }}
                </label>
                <div class="flex items-center gap-3">
                  <span class="text-2xl font-bold" style="color: var(--color-primary-600);">{{ image.accuracy_score }}%</span>
                  <div class="flex-1 progress-bar">
                    <div
                      class="progress-fill h-2"
                      [style.width.%]="image.accuracy_score"
                      [ngClass]="getAccuracyColor(image.accuracy_score)"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- Created At -->
              <div *ngIf="image?.created_at">
                <label class="block text-sm font-semibold text-gray-700 mb-1">
                  {{ 'admin.createdAt' | translate }}
                </label>
                <p class="text-gray-600 text-sm">{{ formatDate(image?.created_at) }}</p>
              </div>

              <!-- ID -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">
                  {{ 'admin.imageId' | translate }}
                </label>
                <p class="text-gray-600 text-sm font-mono">#{{ image?.id }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            (click)="close()"
            class="btn-secondary btn-secondary-sm"
          >
            {{ 'common.close' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .progress-bar {
      width: 100%;
      height: 8px;
      background-color: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      transition: width 0.3s ease;
    }

    .bg-green-500 {
      background-color: var(--color-success);
    }

    .bg-yellow-500 {
      background-color: var(--color-warning);
    }

    .bg-red-500 {
      background-color: var(--color-danger);
    }
  `]
})
export class ImageDetailModalComponent {
  @Input() isOpen = false;
  @Input() image: ImageDetail | null = null;
  @Input() imageUrl: string = '';
  @Input() catalogDownloadHandler?: CatalogDownloadHandler;
  @Output() closeModal = new EventEmitter<void>();

  close() {
    this.closeModal.emit();
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCBmaWxsPSIjZGRkIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIvPjx0ZXh0IGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBkeT0iMTAuNSIgZm9udC13ZWlnaHQ9ImJvbGQiIHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
    }
  }

  getAccuracyColor(score: number | undefined): string {
    if (score === undefined) return 'bg-gray-500';
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  downloadCatalog() {
    if (this.image?.id && this.catalogDownloadHandler) {
      this.catalogDownloadHandler.downloadCatalog(this.image.id, this.image.catalog_filename);
    }
  }
}
