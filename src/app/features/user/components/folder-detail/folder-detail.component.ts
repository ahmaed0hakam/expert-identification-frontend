import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ImageDetailModalComponent, ImageDetail } from '../../../../shared/components/image-detail-modal/image-detail-modal.component';
import { HttpClient } from '@angular/common/http';
import { Subject, firstValueFrom, EMPTY, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, tap, catchError, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

interface Image {
  id: number;
  title: string;
  description: string;
  category: string;
  semantic_description: string;
  proxy_url: string;
  chroma_id: string | null;
  has_catalog: boolean;
  catalog_filename: string | null;
  created_at: string | null;
}

interface Folder {
  id: number;
  name: string;
  description: string | null;
}

@Component({
  selector: 'app-folder-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, FormsModule, IconComponent, ImageDetailModalComponent],
  templateUrl: './folder-detail.component.html',
  styleUrls: ['./folder-detail.component.css']
})
export class FolderDetailComponent implements OnInit, OnDestroy {
  // Services
  private apiService = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  public translate = inject(TranslateService);
  private toastService = inject(ToastService);

  // Signals for reactive state
  folderId = signal<number | null>(null);
  folder = signal<Folder | null>(null);
  searchTerm = signal('');
  currentPage = signal(0);
  pageSize = signal(20);
  isLoading = signal(false);
  
  // Image detail modal state
  showImageDetail = signal(false);
  selectedImageDetail = signal<ImageDetail | null>(null);
  selectedImageDetailUrl = signal('');

  // Image URLs map
  private imageUrls = new Map<number, string>();

  // RxJS subjects for reactive updates
  private searchSubject = new Subject<string>();
  private pageSubject = new Subject<number>();
  private destroy$ = new Subject<void>();

  // Computed values
  totalPages = computed(() => {
    const total = this.imagesData()?.total ?? 0;
    return Math.ceil(total / this.pageSize());
  });

  // Debounced search term
  private debouncedSearch$ = this.searchSubject.pipe(
    startWith(''),
    debounceTime(300),
    distinctUntilChanged()
  );

  // Observable for images data
  private imagesData$ = combineLatest([
    this.folderId,
    this.debouncedSearch$,
    this.pageSubject.pipe(startWith(0), distinctUntilChanged())
  ]).pipe(
    switchMap(([folderId = null, searchTerm = '', page = 0]) => {
      if (!folderId) {
        return EMPTY;
      }
      
      this.isLoading.set(true);
      return this.apiService.getFolderImages(
        folderId as unknown as number,
        page * this.pageSize(),
        this.pageSize(),
        searchTerm
      ).pipe(
        tap({
          next: (response) => {
            if (response) {
              this.folder.set(response.folder);
              this.loadImageUrls(response.images || []);
            }
            this.isLoading.set(false);
          },
          error: (error) => {
            console.error('Failed to load images:', error);
            this.isLoading.set(false);
            firstValueFrom(this.translate.get('errors.loadFailed')).then((msg: string) => {
              this.toastService.error(msg);
            });
          }
        }),
        catchError((error) => {
          this.isLoading.set(false);
          firstValueFrom(this.translate.get('errors.loadFailed')).then((msg: string) => {
            this.toastService.error(msg);
          });
          return EMPTY;
        })
      );
    }),
    takeUntil(this.destroy$)
  );

  // Convert Observable to Signal
  imagesData = toSignal(this.imagesData$, { initialValue: null });

  // Computed signal for images array
  images = computed(() => this.imagesData()?.images ?? []);

  // Computed signal for total count
  total = computed(() => this.imagesData()?.total ?? 0);

  ngOnInit() {
    // Get folder ID from route
    this.route.params.subscribe(params => {
      const id = parseInt(params['id'], 10);
      if (id) {
        this.folderId.set(id);
        this.pageSubject.next(0);
      } else {
        this.router.navigate(['/gallery']);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    // Clean up blob URLs
    this.imageUrls.forEach(url => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    });
    this.imageUrls.clear();
  }

  onSearchInput() {
    this.currentPage.set(0);
    this.pageSubject.next(0);
    this.searchSubject.next(this.searchTerm());
  }

  clearSearch() {
    this.searchTerm.set('');
    this.currentPage.set(0);
    this.searchSubject.next('');
    this.pageSubject.next(0);
  }

  goBack() {
    this.router.navigate(['/search/gallery']);
  }

  async loadImageUrls(images: Image[]) {
    const imagesToLoad = images.filter(image => !this.imageUrls.has(image.id));
    const batchSize = 5;
    
    for (let i = 0; i < imagesToLoad.length; i += batchSize) {
      const batch = imagesToLoad.slice(i, i + batchSize);
      await Promise.all(batch.map(image => this.loadSingleImageUrl(image.id)));
    }
  }

  private async loadSingleImageUrl(imageId: number): Promise<void> {
    try {
      const url = this.apiService.getImageProxy(imageId);
      const blob = await firstValueFrom(this.http.get(url, { responseType: 'blob' }));
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        this.imageUrls.set(imageId, objectUrl);
      }
    } catch (error) {
      console.error(`Failed to load image ${imageId}:`, error);
      this.imageUrls.set(imageId, '');
    }
  }

  getImageUrl(image: Image): string {
    return this.imageUrls.get(image.id) || '';
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

  showImageDetails(image: Image) {
    this.selectedImageDetail.set({
      id: image.id,
      title: image.title,
      description: image.description,
      category: image.category,
      proxy_url: image.proxy_url,
      chroma_id: image.chroma_id,
      created_at: image.created_at
    });
    this.selectedImageDetailUrl.set(this.getImageUrl(image));
    this.showImageDetail.set(true);
  }

  closeImageDetail() {
    this.showImageDetail.set(false);
    this.selectedImageDetail.set(null);
    this.selectedImageDetailUrl.set('');
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
      this.pageSubject.next(page);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages() - 1) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  previousPage() {
    if (this.currentPage() > 0) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  trackById(index: number, image: Image): number {
    return image.id;
  }
}
