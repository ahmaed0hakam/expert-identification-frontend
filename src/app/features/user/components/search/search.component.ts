import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { DropdownComponent, DropdownOption } from '../../../../shared/components/dropdown/dropdown.component';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '@/app/shared/services/toast.service';
import { HeicService } from '@/app/shared/services/heic.service';
import { IMAGE_MIME_PREFIX, JPEG_MIME_TYPE, JPEG_EXTENSION, IMAGE_ACCEPT_ATTRIBUTE } from '@/app/shared/constants/file-types';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, FormsModule, IconComponent, DropdownComponent],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {
  selectedImage: string | null = null;
  selectedFile: File | null = null;
  isSearching = false;
  isProcessing = false;
  imageAcceptAttribute = IMAGE_ACCEPT_ATTRIBUTE;
  selectedFolderId: number | null = null;
  folders: any[] = [];
  isLoadingFolders = false;
  
  // Computed for dropdown options
  get folderOptions(): DropdownOption[] {
    return this.folders.map(folder => ({
      value: folder.id,
      label: `${folder.name} (${folder.image_count || 0} ${this.translate.instant('user.images')})`
    }));
  }

  constructor(
    private apiService: ApiService,
    private router: Router,
    public translate: TranslateService,
    private toastService: ToastService,
    private heicService: HeicService
  ) {}

  async ngOnInit() {
    await this.loadFolders();
  }

  async loadFolders() {
    this.isLoadingFolders = true;
    try {
      const response = await firstValueFrom(this.apiService.getGalleryFolders(0, 100));
      this.folders = response?.folders || [];
    } catch (error) {
      console.error('Failed to load folders:', error);
    } finally {
      this.isLoadingFolders = false;
    }
  }

  onFolderSelected(value: string | number | null) {
    if (value === null || value === undefined) {
      this.selectedFolderId = null;
    } else {
      this.selectedFolderId = typeof value === 'number' ? value : parseInt(value.toString(), 10);
    }
  }

  async captureImage() {
    try {
      // Clear previous selection and set processing state
      this.selectedImage = null;
      this.selectedFile = null;
      this.isProcessing = true;

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      
      // Convert data URL to File
      if (image.dataUrl) {
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        
        // Create a File from the blob to check if it's HEIC
        const tempFile = new File([blob], 'captured-image', { type: blob.type });
        
        // Process file using shared service - converts HEIC to JPEG if needed
        const fileToUse = await this.heicService.processImageFile(tempFile, blob.type);
        
        // Update preview with processed image
        const reader = new FileReader();
        reader.onload = (e: any) => {
          if (e.target?.result) {
            this.selectedImage = e.target.result;
          }
        };
        reader.readAsDataURL(fileToUse);
        
        this.selectedFile = fileToUse;
        this.isProcessing = false;
        console.log('File from camera:', {
          name: fileToUse.name,
          type: fileToUse.type,
          size: fileToUse.size
        });
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
        firstValueFrom(this.translate.get('errors.captureFailed')).then((msg: string) => {
          this.toastService.error(msg);
        }).catch(() => {
          // Fallback if translation doesn't exist
          this.toastService.error('Failed to capture image');
        });
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
        
        // Create a File from the blob and process it using shared service
        const tempFile = new File([blob], 'selected-image', { type: blob.type });
        const fileToUse = await this.heicService.processImageFile(tempFile, blob.type);
        
        // Update preview with processed image
        const reader = new FileReader();
        reader.onload = (e: any) => {
          if (e.target?.result) {
            this.selectedImage = e.target.result;
          }
        };
        reader.readAsDataURL(fileToUse);
        
        this.selectedFile = fileToUse;
        console.log('File from gallery:', {
          name: fileToUse.name,
          type: fileToUse.type,
          size: fileToUse.size
        });
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

    console.log('File selected:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Check if it's an image file or HEIC file
    const isImage = file.type.startsWith(IMAGE_MIME_PREFIX);
    const isHeic = this.heicService.isHeicFile(file);

    console.log('File analysis:', { isImage, isHeic });

    if (!isImage && !isHeic) {
      console.warn('File is not an image or HEIC file');
      return;
    }

    // Clear previous selection and set processing state
    this.selectedFile = null;
    this.selectedImage = null;
    this.isProcessing = true;

    try {
      // Process file - converts HEIC to JPEG if needed
      const fileToUse = await this.heicService.processImageFile(file);
      
      console.log('File processed:', {
        originalName: file.name,
        processedName: fileToUse.name,
        type: fileToUse.type,
        size: fileToUse.size
      });

      // Verify the file is valid before setting it
      if (!fileToUse || fileToUse.size === 0) {
        throw new Error('Invalid file: file is empty');
      }

      // Verify file type
      let finalFile = fileToUse;
      if (!fileToUse.type || !fileToUse.type.startsWith(IMAGE_MIME_PREFIX)) {
        console.warn('File type is not image:', fileToUse.type);
        // Force image/jpeg type if missing
        finalFile = new File([fileToUse], fileToUse.name, {
          type: JPEG_MIME_TYPE,
          lastModified: fileToUse.lastModified
        });
      }

      this.selectedFile = finalFile;
      console.log('File set for search:', {
        name: this.selectedFile?.name,
        type: this.selectedFile?.type,
        size: this.selectedFile?.size
      });
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (e.target?.result) {
          this.selectedImage = e.target.result;
          console.log('Preview created successfully, length:', this.selectedImage?.length || 0);
        } else {
          console.error('FileReader result is empty');
        }
      };
      reader.onerror = (error) => {
        console.error('Error reading file for preview:', error);
        this.toastService.error('Failed to create preview');
      };
      reader.onloadend = () => {
        console.log('FileReader finished, preview URL length:', this.selectedImage?.length || 0);
      };
      reader.readAsDataURL(finalFile);
      this.isProcessing = false;
    } catch (error: any) {
      console.error('Error processing file:', error);
      this.isProcessing = false;
      this.selectedFile = null;
      this.selectedImage = null;
      const errorMessage = error?.message || 'Failed to process image';
      firstValueFrom(this.translate.get('errors.heicConversionFailed')).then((msg: string) => {
        this.toastService.error(msg || errorMessage);
      }).catch(() => {
        this.toastService.error(errorMessage);
      });
    }
  }

  async search() {
    if (!this.selectedFile) {
      console.error('No file selected for search');
      return;
    }

    // Verify file before sending
    if (this.selectedFile.size === 0) {
      console.error('File is empty');
      firstValueFrom(this.translate.get('errors.invalidFile')).then((msg: string) => {
        this.toastService.error(msg || 'Invalid file: file is empty');
      });
      return;
    }

    // Verify file type
    if (!this.selectedFile.type || !this.selectedFile.type.startsWith(IMAGE_MIME_PREFIX)) {
      console.error('File type is invalid:', this.selectedFile.type);
      firstValueFrom(this.translate.get('errors.invalidFile')).then((msg: string) => {
        this.toastService.error(msg || 'Invalid file type');
      });
      return;
    }

    console.log('Searching with file:', {
      name: this.selectedFile.name,
      type: this.selectedFile.type,
      size: this.selectedFile.size
    });

    this.isSearching = true;
    
    try {
      // Use the file directly - don't recreate it from ArrayBuffer as that can corrupt it
      // The file should already be properly converted if it was HEIC
      const searchFile = this.selectedFile;

      console.log('Sending file to API:', {
        name: searchFile.name,
        type: searchFile.type,
        size: searchFile.size
      });

      // Basic validation: ensure it's an image type
      // The backend accepts any image/* type, so we just check the MIME type
      if (!searchFile.type || !searchFile.type.startsWith(IMAGE_MIME_PREFIX)) {
        throw new Error('Invalid file: file is not an image');
      }

      const results = await this.apiService.searchImage(searchFile, this.selectedFolderId || undefined).toPromise();
      
      // Store results and navigate
      if (results) {
        sessionStorage.setItem('searchResults', JSON.stringify(results));
        // Check if we're in admin context or user context
        const currentPath = this.router.url;
        if (currentPath.startsWith('/admin')) {
          this.router.navigate(['/admin/search/results']);
        } else {
          this.router.navigate(['/search/results']);
        }
      }
    } catch (error: any) {
      console.error('Search error:', error);
      let errorMessage = 'Search failed';
      
      if (error?.error) {
        // Try to extract detailed error message
        if (error.error.detail) {
          errorMessage = error.error.detail;
        } else if (error.error.message) {
          errorMessage = error.error.message;
        } else if (typeof error.error === 'string') {
          errorMessage = error.error;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      console.error('Full error object:', error);
      console.error('Error message:', errorMessage);
      
      firstValueFrom(this.translate.get('errors.searchFailed')).then((msg: string) => {
        this.toastService.error(msg + ': ' + errorMessage);
      });
    } finally {
      this.isSearching = false;
    }
  }

  clearSelection() {
    this.selectedImage = null;
    this.selectedFile = null;
    this.isProcessing = false;
  }

  navigateToOfflineSearch() {
    this.router.navigate(['/offline-search']);
  }
}
