import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { OfflineSearchLayoutComponent } from '../../../../shared/layouts/offline-search-layout/offline-search-layout.component';
import { ImageDetailModalComponent, ImageDetail } from '../../../../shared/components/image-detail-modal/image-detail-modal.component';
import { ToastComponent } from '../../../../shared/components/toast/toast.component';
import { OfflineSearchService, OfflineSearchResult } from '../../../../core/services/offline-search.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '@/app/shared/services/toast.service';
import { HeicService } from '@/app/shared/services/heic.service';
import { IMAGE_MIME_PREFIX, IMAGE_ACCEPT_ATTRIBUTE } from '@/app/shared/constants/file-types';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-offline-search',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, IconComponent, OfflineSearchLayoutComponent, ImageDetailModalComponent],
  templateUrl: './offline-search.component.html',
  styleUrls: ['./offline-search.component.css']
})
export class OfflineSearchComponent implements OnInit {
  selectedImage: string | null = null;
  selectedFile: File | null = null;
  isSearching = false;
  isProcessing = false;
  isInitializing = false;
  initializationProgress = 0;
  cachedImageCount = 0;
  searchResults: OfflineSearchResult[] = [];
  filteredResults: OfflineSearchResult[] = [];
  searchQuery = '';
  imageAcceptAttribute = IMAGE_ACCEPT_ATTRIBUTE;
  
  // Image detail modal
  showImageDetail = false;
  selectedImageDetail: ImageDetail | null = null;
  selectedImageDetailUrl = '';

  constructor(
    private offlineSearchService: OfflineSearchService,
    private router: Router,
    public translate: TranslateService,
    private toastService: ToastService,
    private heicService: HeicService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    // Initialize offline search service and fetch images
    await this.initializeOfflineSearch();
  }

  async initializeOfflineSearch() {
    try {
      this.isInitializing = true;
      this.initializationProgress = 0;

      // Initialize service (will fetch images if needed)
      await this.offlineSearchService.initialize();

      // Get cached image count
      this.cachedImageCount = await this.offlineSearchService.getCachedImageCount();
      
      this.initializationProgress = 100;
    } catch (error: any) {
      console.error('Failed to initialize offline search:', error);
      const errorMessage = error?.message || 'Failed to initialize offline search';
      this.toastService.error(errorMessage);
    } finally {
      this.isInitializing = false;
    }
  }

  async captureImage() {
    try {
      this.selectedImage = null;
      this.selectedFile = null;
      this.isProcessing = true;
      this.searchResults = [];

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      
      if (image.dataUrl) {
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const tempFile = new File([blob], 'captured-image', { type: blob.type });
        const fileToUse = await this.heicService.processImageFile(tempFile, blob.type);
        
        const reader = new FileReader();
        reader.onload = (e: any) => {
          if (e.target?.result) {
            this.selectedImage = e.target.result;
          }
        };
        reader.readAsDataURL(fileToUse);
        
        this.selectedFile = fileToUse;
        this.isProcessing = false;
      } else {
        this.isProcessing = false;
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      this.isProcessing = false;
      this.selectedImage = null;
      this.selectedFile = null;
      
      // Check if error is due to user cancellation
      // Capacitor Camera throws "User cancelled" or similar messages when cancelled
      const errorMessage = error?.message || error?.toString() || '';
      const isCancelled = errorMessage.toLowerCase().includes('cancel') || 
                          errorMessage.toLowerCase().includes('cancelled') ||
                          errorMessage.toLowerCase().includes('user cancelled');
      
      // Only show error if it's not a cancellation
      if (!isCancelled) {
        this.toastService.error('Failed to capture image');
      }
    }
  }

  async selectFromGallery() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      this.selectedImage = image.dataUrl || null;
      
      if (image.dataUrl) {
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const tempFile = new File([blob], 'selected-image', { type: blob.type });
        const fileToUse = await this.heicService.processImageFile(tempFile, blob.type);
        
        const reader = new FileReader();
        reader.onload = (e: any) => {
          if (e.target?.result) {
            this.selectedImage = e.target.result;
          }
        };
        reader.readAsDataURL(fileToUse);
        
        this.selectedFile = fileToUse;
      }
    } catch (error: any) {
      console.error('Gallery error:', error);
      this.selectedFile = null;
      this.selectedImage = null;
      const errorMessage = error?.message || 'Failed to select image from gallery';
      this.toastService.error(errorMessage);
    }
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    const isImage = file.type.startsWith(IMAGE_MIME_PREFIX);
    const isHeic = this.heicService.isHeicFile(file);

    if (!isImage && !isHeic) {
      return;
    }

    this.selectedFile = null;
    this.selectedImage = null;
    this.searchResults = [];
    this.isProcessing = true;

    try {
      const fileToUse = await this.heicService.processImageFile(file);
      
      if (!fileToUse || fileToUse.size === 0) {
        throw new Error('Invalid file: file is empty');
      }

      let finalFile = fileToUse;
      if (!fileToUse.type || !fileToUse.type.startsWith(IMAGE_MIME_PREFIX)) {
        finalFile = new File([fileToUse], fileToUse.name, {
          type: 'image/jpeg',
          lastModified: fileToUse.lastModified
        });
      }

      this.selectedFile = finalFile;
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (e.target?.result) {
          this.selectedImage = e.target.result;
        }
      };
      reader.onerror = (error) => {
        console.error('Error reading file for preview:', error);
        this.toastService.error('Failed to create preview');
      };
      reader.readAsDataURL(finalFile);
      this.isProcessing = false;
    } catch (error: any) {
      console.error('Error processing file:', error);
      this.isProcessing = false;
      this.selectedFile = null;
      this.selectedImage = null;
      const errorMessage = error?.message || 'Failed to process image';
      this.toastService.error(errorMessage);
    }
  }

  async search() {
    if (!this.selectedFile) {
      return;
    }

    if (this.selectedFile.size === 0) {
      this.toastService.error('Invalid file: file is empty');
      return;
    }

    if (!this.selectedFile.type || !this.selectedFile.type.startsWith(IMAGE_MIME_PREFIX)) {
      this.toastService.error('Invalid file type');
      return;
    }

    this.isSearching = true;
    this.searchResults = [];
    
    try {
      const results = await this.offlineSearchService.searchOffline(
        this.selectedFile,
        30, // maxDistance
        20  // limit
      );
      
      this.searchResults = results;
      this.filteredResults = results;
      this.searchQuery = ''; // Reset search query

      if (results.length === 0) {
        this.toastService.info(`No similar images found (searched ${this.cachedImageCount} indexed images)`);
      } else {
        this.toastService.success(`Found ${results.length} similar image(s)`);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      let errorMessage = 'Search failed';
      
      if (error?.message) {
        errorMessage = error.message;
      }
      
      this.toastService.error('Search failed: ' + errorMessage);
    } finally {
      this.isSearching = false;
    }
  }

  clearSelection() {
    this.selectedImage = null;
    this.selectedFile = null;
    this.isProcessing = false;
    this.searchResults = [];
    this.filteredResults = [];
    this.searchQuery = '';
  }


  filterResults() {
    if (!this.searchQuery.trim()) {
      this.filteredResults = this.searchResults;
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.filteredResults = this.searchResults.filter(result => 
      result.title.toLowerCase().includes(query) ||
      (result.description && result.description.toLowerCase().includes(query)) ||
      (result.category && result.category.toLowerCase().includes(query))
    );
  }

  showImageDetails(result: OfflineSearchResult) {
    this.selectedImageDetail = {
      id: result.id,
      title: result.title,
      description: result.description,
      category: result.category,
      proxy_url: result.proxy_url
    };
    this.selectedImageDetailUrl = result.imageData || '';
    this.showImageDetail = true;
  }

  closeImageDetail() {
    this.showImageDetail = false;
    this.selectedImageDetail = null;
    this.selectedImageDetailUrl = '';
  }
}
