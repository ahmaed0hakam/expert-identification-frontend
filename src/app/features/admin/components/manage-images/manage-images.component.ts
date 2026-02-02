import { Component, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { DropdownComponent, DropdownOption } from '../../../../shared/components/dropdown/dropdown.component';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ImageDetailModalComponent, ImageDetail } from '../../../../shared/components/image-detail-modal/image-detail-modal.component';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';
import { HttpClient } from '@angular/common/http';
import { Subject, firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, tap } from 'rxjs/operators';

interface Image {
  id: number;
  title: string;
  description: string;
  category: string;
  proxy_url: string;
  chroma_id: string | null;
  has_catalog?: boolean;
  catalog_filename?: string;
  folder_id?: number | null;
  folder?: { id: number; name: string } | null;
  created_at: string | null;
}

interface Folder {
  id: number;
  name: string;
  description: string | null;
  image_count?: number;
}

@Component({
  selector: 'app-manage-images',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, IconComponent, ImageDetailModalComponent, ConfirmModalComponent, DropdownComponent],
  templateUrl: './manage-images.component.html',
  styleUrls: ['./manage-images.component.css']
})
export class ManageImagesComponent implements OnInit, OnDestroy {
  images: Image[] = [];
  imageUrls: Map<number, string> = new Map();
  isLoading = true;
  total = 0;
  currentPage = 0;
  pageSize = 20;
  searchTerm = '';

  editingImage: Image | null = null;
  editTitle: string = '';
  editDescription: string = '';
  editCategory: string = '';
  editFolderId: number | null = null;
  isSaving = false;
  isDeleting = false;
  deletingImageId: number | null = null;

  // Catalog management
  isDeletingCatalog = false;
  deletingCatalogId: number | null = null;
  isUploadingCatalog = false;
  uploadingCatalogId: number | null = null;

  // Bulk delete
  selectedImages = new Set<number>();
  isBulkDeleting = false;

  // Image detail modal
  showImageDetail = false;
  selectedImageDetail: ImageDetail | null = null;
  selectedImageDetailUrl = '';

  // Delete confirmation modal
  showDeleteConfirm = false;
  imageToDelete: number | null = null;
  deleteConfirmTitle = '';
  deleteConfirmMessage = '';
  isBulkDeleteMode = false;

  // Folder management
  folders: Folder[] = [];
  selectedFolder: Folder | null = null;
  isLoadingFolders = false;
  isAssigningFolder = false;
  assigningImageId: number | null = null;
  viewMode: 'folders' | 'images' | 'unassigned' = 'folders'; // Track if showing folders, images, or unassigned images
  showCreateFolderModal = false;
  newFolderName = '';
  newFolderDescription = '';
  isCreatingFolder = false;
  unassignedImagesCount = 0;
  isLoadingUnassignedCount = false;
  folderOptions = computed<DropdownOption[]>(() => {
    const imagesText = this.translate.instant('user.images');
    return this.folders.map(folder => ({ 
      value: folder.id, 
      label: `${folder.name} (${folder.image_count || 0} ${imagesText})` 
    }));
  });

  // RxJS subjects for search debouncing
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private http: HttpClient,
    public translate: TranslateService,
    private toastService: ToastService
  ) { }

  ngOnInit() {
    // Load folders first
    this.loadFolders();
    // Load unassigned images count
    this.loadUnassignedImagesCount();

    // Set up debounced search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((searchTerm: string) => {
        this.currentPage = 0; // Reset to first page when searching
        if (this.viewMode === 'images' && this.selectedFolder) {
          return this.loadFolderImagesObservable(searchTerm);
        } else if (this.viewMode === 'unassigned') {
          return this.loadUnassignedImagesObservable(searchTerm);
        }
        return this.loadImagesObservable(searchTerm);
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    // Clean up blob URLs
    this.imageUrls.forEach(url => {
      if (url) URL.revokeObjectURL(url);
    });
    this.imageUrls.clear();
  }

  async loadFolders() {
    this.isLoadingFolders = true;
    try {
      const response = await firstValueFrom(this.apiService.getAllFolders(0, 1000, this.searchTerm));
      this.folders = response.folders || [];
    } catch (error) {
      console.error('Failed to load folders:', error);
      firstValueFrom(this.translate.get('errors.loadFailed')).then((msg: string) => {
        this.toastService.error(msg);
      });
    } finally {
      this.isLoadingFolders = false;
    }
  }

  async loadUnassignedImagesCount() {
    this.isLoadingUnassignedCount = true;
    try {
      const response = await firstValueFrom(this.apiService.getUnassignedImages(0, 1));
      this.unassignedImagesCount = response?.total || 0;
    } catch (error) {
      console.error('Failed to load unassigned images count:', error);
    } finally {
      this.isLoadingUnassignedCount = false;
    }
  }

  openFolder(folder: Folder) {
    this.selectedFolder = folder;
    this.viewMode = 'images';
    this.currentPage = 0;
    this.searchTerm = '';
    this.loadFolderImages();
  }

  openUnassignedImages() {
    this.selectedFolder = null;
    this.viewMode = 'unassigned';
    this.currentPage = 0;
    this.searchTerm = '';
    this.loadUnassignedImages();
  }

  goBackToFolders() {
    this.viewMode = 'folders';
    this.selectedFolder = null;
    this.images = [];
    this.currentPage = 0;
    this.searchTerm = '';
    this.selectedImages.clear();
    // Refresh unassigned count when going back
    this.loadUnassignedImagesCount();
  }

  loadFolderImagesObservable(searchTerm: string = '') {
    if (!this.selectedFolder) return this.loadImagesObservable(searchTerm);

    this.isLoading = true;
    return this.apiService.getFolderImages(
      this.selectedFolder.id,
      this.currentPage * this.pageSize,
      this.pageSize,
      searchTerm
    ).pipe(
      tap({
        next: (response) => {
          if (response) {
            this.images = response.images || [];
            this.total = response.total || 0;
            this.loadImageUrls().catch(error => {
              console.error('Failed to load image URLs:', error);
            });
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load folder images:', error);
          this.isLoading = false;
          firstValueFrom(this.translate.get('errors.loadFailed')).then((msg: string) => {
            this.toastService.error(msg);
          });
        }
      })
    );
  }

  loadUnassignedImagesObservable(searchTerm: string = '') {
    this.isLoading = true;
    return this.apiService.getUnassignedImages(
      this.currentPage * this.pageSize,
      this.pageSize,
      searchTerm
    ).pipe(
      tap({
        next: (response) => {
          if (response) {
            this.images = response.images || [];
            this.total = response.total || 0;
            this.loadImageUrls().catch(error => {
              console.error('Failed to load image URLs:', error);
            });
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load unassigned images:', error);
          this.isLoading = false;
          firstValueFrom(this.translate.get('errors.loadFailed')).then((msg: string) => {
            this.toastService.error(msg);
          });
        }
      })
    );
  }

  async loadFolderImages() {
    if (!this.selectedFolder) return;
  
    this.isLoading = true;
  
    // 1. Memory Management: Revoke old blob URLs to prevent leaks
    this.imageUrls.forEach(url => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    this.imageUrls.clear();
  
    try {
      // 2. Fetch fresh data with current pagination/search
      const response = await firstValueFrom(this.apiService.getFolderImages(
        this.selectedFolder.id,
        this.currentPage * this.pageSize,
        this.pageSize,
        this.searchTerm
      ));
  
      if (response) {
        this.images = response.images || [];
        this.total = response.total || 0;
        // 3. Re-generate URLs from the new blobs
        await this.loadImageUrls();
      }
    } catch (error) {
      console.error('Folder refresh failed', error);
      this.toastService.error(this.translate.instant('errors.loadFailed'));
    } finally {
      this.isLoading = false;
    }
  }

  async loadUnassignedImages() {
    this.isLoading = true;
    
    // Clean up existing blobs
    this.imageUrls.forEach(url => {
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    this.imageUrls.clear();
  
    try {
      const response = await firstValueFrom(this.apiService.getUnassignedImages(
        this.currentPage * this.pageSize,
        this.pageSize,
        this.searchTerm
      ));
      if (response) {
        this.images = response.images || [];
        this.total = response.total || 0;
        this.unassignedImagesCount = response.total || 0; // Sync the count
        await this.loadImageUrls();
      }
    } catch (error) {
      console.error('Unassigned refresh failed', error);
    } finally {
      this.isLoading = false;
    }
  }

  loadImagesObservable(searchTerm: string = '') {
    this.isLoading = true;
    return this.apiService.getImages(
      this.currentPage * this.pageSize,
      this.pageSize,
      searchTerm
    ).pipe(
      tap({
        next: (response) => {
          if (response) {
            this.images = response.images || [];
            this.total = response.total || 0;
            this.loadImageUrls().catch(error => {
              console.error('Failed to load image URLs:', error);
            });
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load images:', error);
          this.isLoading = false;
          firstValueFrom(this.translate.get('errors.loadFailed')).then((msg: string) => {
            this.toastService.error(msg);
          });
        }
      })
    );
  }

  async loadImages() {
    if (this.viewMode === 'images' && this.selectedFolder) {
      await this.loadFolderImages();
      return;
    } else if (this.viewMode === 'unassigned') {
      await this.loadUnassignedImages();
      return;
    }

    this.isLoading = true;
    try {
      const response = await firstValueFrom(this.apiService.getImages(
        this.currentPage * this.pageSize,
        this.pageSize,
        this.searchTerm
      ));
      if (response) {
        this.images = response.images || [];
        this.total = response.total || 0;
        this.loadImageUrls().catch(error => {
          console.error('Failed to load image URLs:', error);
        });
      }
    } catch (error) {
      console.error('Failed to load images:', error);
      firstValueFrom(this.translate.get('errors.loadFailed')).then((msg: string) => {
        this.toastService.error(msg);
      });
    } finally {
      this.isLoading = false;
    }
  }

  onSearchInput() {
    // Emit search term to subject for debouncing
    if (this.viewMode === 'images' && this.selectedFolder) {
      this.searchSubject.next(this.searchTerm);
    } else if (this.viewMode === 'unassigned') {
      this.searchSubject.next(this.searchTerm);
    } else {
      // For folders view, reload folders with search
      this.loadFolders();
    }
  }

  clearSearch() {
    this.searchTerm = '';
    this.currentPage = 0;
    if (this.viewMode === 'images' && this.selectedFolder) {
      this.loadFolderImages();
    } else if (this.viewMode === 'unassigned') {
      this.loadUnassignedImages();
    } else {
      this.loadFolders();
    }
  }

  async loadImageUrls() {
    // Clear old URLs for images that are no longer in the list
    const currentImageIds = new Set(this.images.map(img => img.id));
    const urlsToRemove: number[] = [];

    this.imageUrls.forEach((url, imageId) => {
      if (!currentImageIds.has(imageId)) {
        // Image was deleted, clean up
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
        urlsToRemove.push(imageId);
      }
    });

    // Remove deleted image URLs
    urlsToRemove.forEach(id => this.imageUrls.delete(id));

    // Batch image loading to avoid overwhelming the server
    const imagesToLoad = this.images.filter(image => {
      const existingUrl = this.imageUrls.get(image.id);
      // Always reload to ensure fresh images (prevents cache issues)
      // But skip if already loading or recently loaded
      return !existingUrl || existingUrl === '';
    });

    const batchSize = 10; // Increased batch size for better performance

    // Load images in parallel batches for faster loading
    for (let i = 0; i < imagesToLoad.length; i += batchSize) {
      const batch = imagesToLoad.slice(i, i + batchSize);
      await Promise.all(batch.map(image => this.loadImageUrl(image)));

      // Small delay between batches to avoid blocking UI
      if (i + batchSize < imagesToLoad.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }

  async loadImageUrl(image: Image): Promise<void> {
    try {
      // Revoke old URL if it exists
      const oldUrl = this.imageUrls.get(image.id);
      if (oldUrl && oldUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl);
      }

      const url = this.apiService.getImageProxy(image.id);

      // Add cache-busting parameter to prevent browser cache issues
      // Use image ID and timestamp to ensure fresh images
      const cacheBuster = `t=${Date.now()}&id=${image.id}`;
      const urlWithCache = url + (url.includes('?') ? '&' : '?') + cacheBuster;

      // HttpClient will automatically add auth header via AuthInterceptor
      const blob = await firstValueFrom(this.http.get(urlWithCache, {
        responseType: 'blob',
        // Add headers to prevent caching
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }));

      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        this.imageUrls.set(image.id, objectUrl);
      }
    } catch (error) {
      console.error(`Failed to load image ${image.id}:`, error);
      // Set empty string to show placeholder
      this.imageUrls.set(image.id, '');
    }
  }

  getImageUrl(image: Image): string {
    return this.imageUrls.get(image.id) || '';
  }

  startEdit(image: Image) {
    this.editingImage = { ...image };
    this.editTitle = image.title;
    this.editDescription = image.description || '';
    this.editCategory = image.category || '';
    this.editFolderId = image.folder_id || null;
  }

  cancelEdit() {
    this.editingImage = null;
    this.editTitle = '';
    this.editDescription = '';
    this.editCategory = '';
    this.editFolderId = null;
  }

  async saveEdit() {
    if (!this.editingImage) return;

    this.isSaving = true;
    const oldFolderId = this.editingImage.folder_id;
    const newFolderId = this.editFolderId;
    const folderChanged = oldFolderId !== newFolderId;
    
    try {
      // Update image metadata
      await this.apiService.updateImage(this.editingImage.id, {
        title: this.editTitle,
        description: this.editDescription,
        category: this.editCategory
      }).toPromise();

      // Update folder assignment if changed
      if (folderChanged) {
        await this.apiService.updateImageFolder(this.editingImage.id, newFolderId).toPromise();
      }

      // If folder changed, handle removal from current view
      if (folderChanged) {
        // If viewing a specific folder and image moved to different folder (or unassigned)
        if (this.viewMode === 'images' && this.selectedFolder) {
          if (newFolderId !== this.selectedFolder.id) {
            // Image moved to different folder - remove from current view
            this.images = this.images.filter(img => img.id !== this.editingImage!.id);
            this.total = Math.max(0, this.total - 1);
            
            // Clean up image URL
            const imageUrl = this.imageUrls.get(this.editingImage.id);
            if (imageUrl && imageUrl.startsWith('blob:')) {
              URL.revokeObjectURL(imageUrl);
            }
            this.imageUrls.delete(this.editingImage.id);
          }
        }
        // If viewing unassigned images and image assigned to a folder
        else if (this.viewMode === 'unassigned') {
          if (newFolderId !== null) {
            // Image assigned to folder - remove from unassigned view
            this.images = this.images.filter(img => img.id !== this.editingImage!.id);
            this.total = Math.max(0, this.total - 1);
            this.unassignedImagesCount = Math.max(0, this.unassignedImagesCount - 1);
            
            // Clean up image URL
            const imageUrl = this.imageUrls.get(this.editingImage.id);
            if (imageUrl && imageUrl.startsWith('blob:')) {
              URL.revokeObjectURL(imageUrl);
            }
            this.imageUrls.delete(this.editingImage.id);
          } else if (oldFolderId !== null) {
            // Image unassigned from a folder - should already be in view, just update
            const index = this.images.findIndex(img => img.id === this.editingImage!.id);
            if (index !== -1) {
              this.images[index].folder_id = null;
              this.images[index].folder = null;
            }
          }
        }
        
        // Refresh folder counts
        await this.loadFolders();
        await this.loadUnassignedImagesCount();
      } else {
        // Folder didn't change, just update local image
        const index = this.images.findIndex(img => img.id === this.editingImage!.id);
        if (index !== -1) {
          this.images[index].title = this.editTitle;
          this.images[index].description = this.editDescription;
          this.images[index].category = this.editCategory;
        }
      }

      this.cancelEdit();
      firstValueFrom(this.translate.get('admin.imageUpdated')).then((msg: string) => {
        this.toastService.success(msg);
      });
    } catch (error) {
      console.error('Failed to update image:', error);
      firstValueFrom(this.translate.get('errors.updateFailed')).then((msg: string) => {
        this.toastService.error(msg);
      });
    } finally {
      this.isSaving = false;
    }
  }

  downloadCatalog(image: Image) {
    if (!image.has_catalog || !image.id) {
      return;
    }

    this.apiService.downloadCatalogAdmin(image.id).subscribe({
      next: (blob) => {
        const filename = image.catalog_filename || `catalog_${image.id}.pdf`;
        this.apiService.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('Error downloading catalog:', error);
        firstValueFrom(this.translate.get('errors.downloadFailed')).then(msg => {
          this.toastService.error(msg);
        });
      }
    });
  }

  onCatalogFileSelected(event: Event, imageId: number) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.uploadCatalog(imageId, file);
      // Reset input so same file can be selected again
      input.value = '';
    }
  }

  async uploadCatalog(imageId: number, catalogFile: File) {
    this.isUploadingCatalog = true;
    this.uploadingCatalogId = imageId;

    try {
      const response = await this.apiService.uploadCatalogAdmin(imageId, catalogFile).toPromise();

      // Update local image
      const image = this.images.find(img => img.id === imageId);
      if (image) {
        image.has_catalog = true;
        image.catalog_filename = response.catalog_filename;
      }

      firstValueFrom(this.translate.get('admin.catalogUploaded')).then((msg: string) => {
        this.toastService.success(msg);
      });
    } catch (error: any) {
      console.error('Failed to upload catalog:', error);
      let errorMessage = 'Failed to upload catalog file';
      if (error?.error?.detail) {
        errorMessage = error.error.detail;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      }
      firstValueFrom(this.translate.get('errors.uploadFailed')).then((msg: string) => {
        this.toastService.error(msg + ': ' + errorMessage);
      });
    } finally {
      this.isUploadingCatalog = false;
      this.uploadingCatalogId = null;
    }
  }

  async deleteCatalog(imageId: number) {
    this.isDeletingCatalog = true;
    this.deletingCatalogId = imageId;

    try {
      await this.apiService.deleteCatalogAdmin(imageId).toPromise();

      // Update local image
      const image = this.images.find(img => img.id === imageId);
      if (image) {
        image.has_catalog = false;
        image.catalog_filename = undefined;
      }

      firstValueFrom(this.translate.get('admin.catalogDeleted')).then((msg: string) => {
        this.toastService.success(msg);
      });
    } catch (error) {
      console.error('Failed to delete catalog:', error);
      firstValueFrom(this.translate.get('errors.deleteFailed')).then((msg: string) => {
        this.toastService.error(msg);
      });
    } finally {
      this.isDeletingCatalog = false;
      this.deletingCatalogId = null;
    }
  }

  async deleteImage(imageId: number) {
    this.imageToDelete = imageId;
    this.isBulkDeleteMode = false;

    // Get translated messages
    const deleteText = await firstValueFrom(this.translate.get('common.delete'));
    this.deleteConfirmTitle = deleteText;

    const messageTemplate = await firstValueFrom(this.translate.get('admin.deleteConfirm'));
    this.deleteConfirmMessage = messageTemplate;
    this.showDeleteConfirm = true;
  }

  async confirmDelete() {
    if (this.isBulkDeleteMode) {
      await this.performBulkDelete();
    } else if (this.imageToDelete !== null) {
      await this.performDeleteImage(this.imageToDelete);
    }
    this.closeDeleteConfirm();
  }

  async performDeleteImage(imageId: number) {
    // Clean up image URL before deleting
    const imageUrl = this.imageUrls.get(imageId);
    if (imageUrl && imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }
    this.imageUrls.delete(imageId);

    this.isDeleting = true;
    this.deletingImageId = imageId;

    try {
      await this.apiService.deleteImage(imageId).toPromise();

      // Clean up image URL before removing from list
      const imageUrl = this.imageUrls.get(imageId);
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
      this.imageUrls.delete(imageId);

      // Remove from local list
      this.images = this.images.filter(img => img.id !== imageId);
      this.total--;
      this.selectedImages.delete(imageId);

      firstValueFrom(this.translate.get('admin.imageDeleted')).then((msg: string) => {
        this.toastService.success(msg);
      });
    } catch (error) {
      console.error('Failed to delete image:', error);
      firstValueFrom(this.translate.get('errors.deleteFailed')).then((msg: string) => {
        this.toastService.error(msg);
      });
    } finally {
      this.isDeleting = false;
      this.deletingImageId = null;
    }
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm = false;
    this.imageToDelete = null;
    this.deleteConfirmTitle = '';
    this.deleteConfirmMessage = '';
    this.isBulkDeleteMode = false;
  }

  // Bulk delete methods
  toggleImageSelection(imageId: number) {
    if (this.selectedImages.has(imageId)) {
      this.selectedImages.delete(imageId);
    } else {
      this.selectedImages.add(imageId);
    }
  }

  toggleSelectAll() {
    if (this.selectedImages.size === this.images.length) {
      this.selectedImages.clear();
    } else {
      this.images.forEach(img => this.selectedImages.add(img.id));
    }
  }

  get isAllSelected(): boolean {
    return this.images.length > 0 && this.selectedImages.size === this.images.length;
  }

  get hasSelectedImages(): boolean {
    return this.selectedImages.size > 0;
  }

  async bulkDelete() {
    if (this.selectedImages.size === 0) return;

    this.isBulkDeleteMode = true;

    // Get translated messages
    const deleteText = await firstValueFrom(this.translate.get('common.delete'));
    this.deleteConfirmTitle = deleteText;

    const messageTemplate = await firstValueFrom(this.translate.get('admin.bulkDeleteConfirm'));
    this.deleteConfirmMessage = messageTemplate.replace('{{count}}', this.selectedImages.size.toString());
    this.showDeleteConfirm = true;
  }

  async performBulkDelete() {
    this.isBulkDeleting = true;
    const imageIds = Array.from(this.selectedImages);

    try {
      // Delete all selected images in a single bulk request
      const response = await this.apiService.bulkDeleteImages(imageIds).toPromise();

      const deletedCount = response?.deleted_count || imageIds.length;

      // Clean up image URLs for deleted images
      imageIds.forEach(id => {
        const imageUrl = this.imageUrls.get(id);
        if (imageUrl && imageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(imageUrl);
        }
        this.imageUrls.delete(id);
      });

      // Remove from local list
      this.images = this.images.filter(img => !this.selectedImages.has(img.id));
      this.total -= deletedCount;
      this.selectedImages.clear();

      firstValueFrom(this.translate.get('admin.bulkDeleteSuccess')).then((msg: string) => {
        this.toastService.success(msg.replace('{{count}}', deletedCount.toString()));
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
      firstValueFrom(this.translate.get('errors.deleteFailed')).then((msg: string) => {
        this.toastService.error(msg);
      });
    } finally {
      this.isBulkDeleting = false;
    }
  }

  // Image detail methods
  showImageDetails(image: Image) {
    this.selectedImageDetail = {
      id: image.id,
      title: image.title,
      description: image.description,
      category: image.category,
      proxy_url: image.proxy_url,
      chroma_id: image.chroma_id,
      created_at: image.created_at,
      has_catalog: image.has_catalog,
      catalog_filename: image.catalog_filename
    };
    this.selectedImageDetailUrl = this.getImageUrl(image);
    this.showImageDetail = true;
  }

  getCatalogDownloadHandler() {
    return {
      downloadCatalog: (imageId: number, filename?: string) => {
        this.apiService.downloadCatalogAdmin(imageId).subscribe({
          next: (blob) => {
            const finalFilename = filename || `catalog_${imageId}.pdf`;
            this.apiService.downloadFile(blob, finalFilename);
          },
          error: (error) => {
            console.error('Error downloading catalog:', error);
            firstValueFrom(this.translate.get('errors.downloadFailed')).then(msg => {
              this.toastService.error(msg);
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

  get totalPages(): number {
    return Math.ceil(this.total / this.pageSize);
  }

  async goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      if (this.viewMode === 'images' && this.selectedFolder) {
        await this.loadFolderImages();
      } else if (this.viewMode === 'unassigned') {
        await this.loadUnassignedImages();
      } else {
        await this.loadImages();
      }
    }
  }

  async nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      await this.goToPage(this.currentPage + 1);
    }
  }

  async previousPage() {
    if (this.currentPage > 0) {
      await this.goToPage(this.currentPage - 1);
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCBmaWxsPSIjZGRkIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIvPjx0ZXh0IGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBkeT0iMTAuNSIgZm9udC13ZWlnaHQ9ImJvbGQiIHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
    }
  }

  getFolderName(folderId: number | null | undefined): string {
    if (!folderId) return '';
    const folder = this.folders.find(f => f.id === folderId);
    return folder ? folder.name : '';
  }

  async assignImageToFolder(imageId: number, folderId: number | null) {
    this.isAssigningFolder = true;
    this.assigningImageId = imageId;
    const image = this.images.find(img => img.id === imageId);
    const oldFolderId = image?.folder_id || null;
    
    try {
      await firstValueFrom(this.apiService.updateImageFolder(imageId, folderId));
      
      // Update local image
      if (image) {
        image.folder_id = folderId;
        if (folderId) {
          const folder = this.folders.find(f => f.id === folderId);
          if (folder) {
            image.folder = { id: folder.id, name: folder.name };
          }
        } else {
          image.folder = null;
        }
      }

      // Handle removal from current view based on view mode
      if (this.viewMode === 'images' && this.selectedFolder) {
        // Viewing a specific folder
        if (folderId !== this.selectedFolder.id) {
          // Image moved to different folder (or unassigned) - remove from current view
          this.images = this.images.filter(img => img.id !== imageId);
          this.total = Math.max(0, this.total - 1);
          
          // Clean up image URL
          const imageUrl = this.imageUrls.get(imageId);
          if (imageUrl && imageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(imageUrl);
          }
          this.imageUrls.delete(imageId);
        }
      } else if (this.viewMode === 'unassigned') {
        // Viewing unassigned images
        if (folderId !== null) {
          // Image assigned to folder - remove from unassigned view
          this.images = this.images.filter(img => img.id !== imageId);
          this.total = Math.max(0, this.total - 1);
          this.unassignedImagesCount = Math.max(0, this.unassignedImagesCount - 1);
          
          // Clean up image URL
          const imageUrl = this.imageUrls.get(imageId);
          if (imageUrl && imageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(imageUrl);
          }
          this.imageUrls.delete(imageId);
        }
      }

      // Refresh folder counts to update the UI
      await this.loadFolders();
      await this.loadUnassignedImagesCount();

      firstValueFrom(this.translate.get('admin.folderAssigned')).then((msg: string) => {
        this.toastService.success(msg);
      });
    } catch (error) {
      console.error('Failed to assign folder:', error);
      firstValueFrom(this.translate.get('errors.updateFailed')).then((msg: string) => {
        this.toastService.error(msg);
      });
    } finally {
      this.isAssigningFolder = false;
      this.assigningImageId = null;
    }
  }

  parseInt(value: string): number {
    return parseInt(value, 10);
  }

  async createFolder() {
    const name = this.newFolderName.trim();
    if (!name) {
      firstValueFrom(this.translate.get('errors.enterFolderName')).then(msg => {
        this.toastService.warning(msg || 'Please enter a folder name');
      });
      return;
    }

    this.isCreatingFolder = true;
    try {
      await firstValueFrom(
        this.apiService.createFolder(name, this.newFolderDescription.trim() || undefined)
      );
      // Reload folders
      await this.loadFolders();
      // Close modal
      this.showCreateFolderModal = false;
      this.newFolderName = '';
      this.newFolderDescription = '';

      firstValueFrom(this.translate.get('admin.folderCreated')).then(msg => {
        this.toastService.success(msg || 'Folder created successfully');
      });
    } catch (error: any) {
      console.error('Failed to create folder:', error);
      const errorMsg = error?.error?.detail || error?.message || 'Failed to create folder';
      this.toastService.error(errorMsg);
    } finally {
      this.isCreatingFolder = false;
    }
  }

  cancelCreateFolder() {
    this.showCreateFolderModal = false;
    this.newFolderName = '';
    this.newFolderDescription = '';
  }

  onFolderSelected(event: any) {
    // Check if event is an object with a value property (from your DropdownComponent)
    if (event && typeof event === 'object' && 'value' in event) {
      this.editFolderId = event.value;
    } else {
      // If the event itself is the value (or null/undefined)
      this.editFolderId = event !== undefined ? event : null;
    }
  }
}
