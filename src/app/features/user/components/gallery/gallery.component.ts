import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { HttpClient } from '@angular/common/http';
import { Subject, firstValueFrom, EMPTY, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, tap, catchError, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

interface Folder {
  id: number;
  name: string;
  description: string | null;
  image_count: number;
  created_at: string | null;
}

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, FormsModule, IconComponent, JsonPipe],
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.css']
})
export class GalleryComponent implements OnInit, OnDestroy {
  // Services
  private apiService = inject(ApiService);
  private router = inject(Router);
  public translate = inject(TranslateService);
  private toastService = inject(ToastService);

  // Signals for reactive state
  searchTerm = signal('');
  currentPage = signal(0);
  pageSize = signal(12); // Show 12 folders per page
  isLoading = signal(false);
  showCreateFolderModal = signal(false);
  newFolderName = signal('');
  newFolderDescription = signal('');
  isCreatingFolder = signal(false);

  // RxJS subjects for reactive updates
  private searchSubject = new Subject<string>();
  private pageSubject = new Subject<number>();
  private destroy$ = new Subject<void>();

  // Computed values
  totalPages = computed(() => {
    const total = this.foldersData()?.total ?? 0;
    return Math.ceil(total / this.pageSize());
  });

  // Debounced search term
  private debouncedSearch$ = this.searchSubject.pipe(
    startWith(''),
    debounceTime(300),
    distinctUntilChanged()
  );

  // Observable for folders data - combines search and page
  private foldersData$ = combineLatest([
    this.debouncedSearch$,
    this.pageSubject.pipe(startWith(0), distinctUntilChanged())
  ]).pipe(
    switchMap(([searchTerm, page]) => {
      this.isLoading.set(true);
      return this.apiService.getGalleryFolders(
        page * this.pageSize(),
        this.pageSize(),
        searchTerm
      ).pipe(
        tap({
          next: (response) => {
            console.log('Gallery folders response:', response);
            this.isLoading.set(false);
          },
          error: (error) => {
            console.error('Failed to load folders:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
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
  foldersData = toSignal(this.foldersData$, { initialValue: null });

  // Computed signal for folders array
  folders = computed(() => this.foldersData()?.folders ?? []);

  // Computed signal for total count
  total = computed(() => this.foldersData()?.total ?? 0);

  ngOnInit() {
    // Trigger initial load
    this.pageSubject.next(0);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput() {
    // Reset to first page when searching
    this.currentPage.set(0);
    this.pageSubject.next(0);
    // Emit search term to subject for debouncing
    this.searchSubject.next(this.searchTerm());
  }

  clearSearch() {
    this.searchTerm.set('');
    this.currentPage.set(0);
    this.searchSubject.next('');
    this.pageSubject.next(0);
  }

  openFolder(folder: Folder) {
    // Navigate to folder detail page
    // The route is /search/gallery/:id because gallery is under /search route
    this.router.navigate(['/search/gallery', folder.id]);
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
      // Trigger load for new page
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

  trackById(index: number, folder: Folder): number {
    return folder.id;
  }

  getFolderIcon(folder: Folder): string {
    // Return different icons based on folder content
    if (folder.image_count === 0) return 'folder';
    if (folder.image_count < 10) return 'folder-open';
    return 'archive';
  }

  async createFolder() {
    const name = this.newFolderName().trim();
    if (!name) {
      firstValueFrom(this.translate.get('errors.enterFolderName')).then(msg => {
        this.toastService.warning(msg || 'Please enter a folder name');
      });
      return;
    }

    this.isCreatingFolder.set(true);
    try {
      const folder = await firstValueFrom(
        this.apiService.createFolder(name, this.newFolderDescription().trim() || undefined)
      );
      // Reload folders
      this.pageSubject.next(this.currentPage());
      // Close modal
      this.showCreateFolderModal.set(false);
      this.newFolderName.set('');
      this.newFolderDescription.set('');
      
      firstValueFrom(this.translate.get('admin.folderCreated')).then(msg => {
        this.toastService.success(msg || 'Folder created successfully');
      });
    } catch (error: any) {
      console.error('Failed to create folder:', error);
      const errorMsg = error?.error?.detail || error?.message || 'Failed to create folder';
      this.toastService.error(errorMsg);
    } finally {
      this.isCreatingFolder.set(false);
    }
  }

  cancelCreateFolder() {
    this.showCreateFolderModal.set(false);
    this.newFolderName.set('');
    this.newFolderDescription.set('');
  }
}
