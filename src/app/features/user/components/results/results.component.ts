import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ApiService, SearchResult } from '../../../../core/services/api.service';
import { ImageDetailModalComponent, ImageDetail } from '../../../../shared/components/image-detail-modal/image-detail-modal.component';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, IconComponent, ImageDetailModalComponent],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css']
})
export class ResultsComponent implements OnInit, OnDestroy {
  results: SearchResult[] = [];
  filteredResults: SearchResult[] = [];
  imageUrls: Map<number, string> = new Map();
  isLoading = true;
  searchQuery = '';
  // Image detail modal
  showImageDetail = false;
  selectedImageDetail: ImageDetail | null = null;
  selectedImageDetailUrl = '';

  constructor(
    private apiService: ApiService,
    private http: HttpClient,
    private router: Router,
    public translate: TranslateService
  ) {}

  async ngOnInit() {
    const storedResults = sessionStorage.getItem('searchResults');
    if (storedResults) {
      this.results = JSON.parse(storedResults);
      this.filteredResults = this.results;
      this.isLoading = false;
      await this.loadAllImageUrls();
    } else {
      // Check if we're in admin context or user context
      const currentPath = this.router.url;
      if (currentPath.startsWith('/admin')) {
        this.router.navigate(['/admin/search']);
      } else {
        this.router.navigate(['/search']);
      }
    }
  }

  filterResults() {
    if (!this.searchQuery.trim()) {
      this.filteredResults = this.results;
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.filteredResults = this.results.filter(result => 
      result.title.toLowerCase().includes(query) ||
      (result.description && result.description.toLowerCase().includes(query)) ||
      (result.category && result.category.toLowerCase().includes(query))
    );
  }

  async loadAllImageUrls() {
    // Batch image loading to avoid overwhelming the server
    const batchSize = 5; // Load 5 images at a time
    
    for (let i = 0; i < this.results.length; i += batchSize) {
      const batch = this.results.slice(i, i + batchSize);
      await Promise.all(batch.map(result => this.loadSingleImageUrl(result.id)));
    }
  }

  async loadSingleImageUrl(imageId: number): Promise<void> {
    try {
      const url = this.apiService.getImageProxy(imageId);
      const blob = await this.http.get(url, { responseType: 'blob' }).toPromise();
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        this.imageUrls.set(imageId, objectUrl);
      }
    } catch (error) {
      console.error(`Failed to load image ${imageId}:`, error);
      this.imageUrls.set(imageId, ''); // ستظهر الصورة البديلة
    }
  }

  getImageUrl(result: SearchResult): string {
    return this.imageUrls.get(result.id) || '';
  }

  getPlaceholderImage(): string {
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCBmaWxsPSIjZGRkIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIvPjx0ZXh0IGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBkeT0iMTAuNSIgZm9udC13ZWlnaHQ9ImJvbGQiIHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = this.getPlaceholderImage();
    }
  }

  downloadCatalog(result: SearchResult) {
    if (!result.has_catalog || !result.id) {
      return;
    }

    this.apiService.downloadCatalog(result.id).subscribe({
      next: (blob) => {
        const filename = result.catalog_filename || `catalog_${result.id}.pdf`;
        this.apiService.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('Error downloading catalog:', error);
        this.translate.get('errors.downloadFailed').subscribe(msg => {
          alert(msg || 'Failed to download catalog');
        });
      }
    });
  }

  getAccuracyColor(score: number): string {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  goBack() {
    // Check if we're in admin context or user context
    const currentPath = this.router.url;
    if (currentPath.startsWith('/admin')) {
      this.router.navigate(['/admin/search']);
    } else {
      this.router.navigate(['/search']);
    }
  }

  searchAgain() {
    // Clear search results from session storage
    sessionStorage.removeItem('searchResults');
    
    // Navigate to search page
    const currentPath = this.router.url;
    if (currentPath.startsWith('/admin')) {
      this.router.navigate(['/admin/search']);
    } else {
      this.router.navigate(['/search']);
    }
  }

  showImageDetails(result: SearchResult) {
    this.selectedImageDetail = {
      id: result.id,
      title: result.title,
      description: result.description,
      category: result.category,
      proxy_url: result.proxy_url,
      accuracy_score: result.accuracy_score,
      has_catalog: result.has_catalog,
      catalog_filename: result.catalog_filename
    };
    this.selectedImageDetailUrl = this.getImageUrl(result);
    this.showImageDetail = true;
  }

  getCatalogDownloadHandler() {
    return {
      downloadCatalog: (imageId: number, filename?: string) => {
        this.apiService.downloadCatalog(imageId).subscribe({
          next: (blob) => {
            const finalFilename = filename || `catalog_${imageId}.pdf`;
            this.apiService.downloadFile(blob, finalFilename);
          },
          error: (error) => {
            console.error('Error downloading catalog:', error);
            this.translate.get('errors.downloadFailed').subscribe(msg => {
              alert(msg || 'Failed to download catalog');
            });
          }
        });
      }
    };
  }

  closeImageDetail() {
    this.showImageDetail = false;
    this.selectedImageDetail = null;
    this.selectedImageDetailUrl = '';
    }

  ngOnDestroy() {
    // تنظيف الذاكرة كما فعلت في صفحة الإدارة
    this.imageUrls.forEach(url => {
      if (url) URL.revokeObjectURL(url);
    });
    this.imageUrls.clear();
  }
}
