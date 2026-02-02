import { Component, signal, computed, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { DropdownComponent, DropdownOption } from '../../../../shared/components/dropdown/dropdown.component';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { HeicService } from '../../../../shared/services/heic.service';
import { IMAGE_MIME_PREFIX, JPEG_MIME_TYPE, IMAGE_ACCEPT_ATTRIBUTE } from '../../../../shared/constants/file-types';
import { Observable, of, forkJoin, EMPTY, from } from 'rxjs';
import { switchMap, catchError, tap, finalize, map } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

interface FileWithMetadata {
  file: File;
  catalogFile?: File;  // Optional catalog file
  title: string;
  description: string;
  category: string;
  previewUrl?: string;
}

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, IconComponent, DropdownComponent],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent implements OnInit {
  // File type constants
  imageAcceptAttribute = IMAGE_ACCEPT_ATTRIBUTE;

  // Signals for state management
  selectedFiles = signal<FileWithMetadata[]>([]);
  isUploading = signal<boolean>(false);
  isGeneratingEmbeddings = signal<boolean>(false);
  uploadProgress = signal<number>(0);
  uploadResult = signal<any | null>(null);
  
  // Default metadata signals
  defaultTitle = signal<string>('');
  defaultDescription = signal<string>('');
  defaultCategory = signal<string>('');
  selectedFolderId = signal<number | null>(null);
  folders = signal<any[]>([]);
  isLoadingFolders = signal<boolean>(false);
  
  // Computed for dropdown options
  folderOptions = computed<DropdownOption[]>(() => {
    const foldersList = this.folders();
    return foldersList.map(folder => ({
      value: folder.id,
      label: `${folder.name} (${folder.image_count || 0} ${this.translate.instant('user.images')})`
    }));
  });
  showCreateFolderModal = signal<boolean>(false);
  newFolderName = signal<string>('');
  newFolderDescription = signal<string>('');

  // Computed signals for derived state
  hasFiles = computed(() => this.selectedFiles().length > 0);
  canUpload = computed(() => 
    this.hasFiles() && !this.isUploading() && !this.isGeneratingEmbeddings()
  );
  showResult = computed(() => 
    this.uploadResult() !== null && !this.isGeneratingEmbeddings() && !this.isUploading()
  );
  isProcessing = computed(() => this.isUploading() || this.isGeneratingEmbeddings());

  private navigationScheduled = false;

  constructor(
    private apiService: ApiService,
    private router: Router,
    public translate: TranslateService,
    private toastService: ToastService,
    private heicService: HeicService
  ) {
    // Effect to handle navigation after successful upload
    effect(() => {
      const result = this.uploadResult();
      const isGenerating = this.isGeneratingEmbeddings();
      const isUploading = this.isUploading();
      
      if (result && !isGenerating && !isUploading && !this.navigationScheduled) {
        this.navigationScheduled = true;
        // Navigate after a delay
        setTimeout(() => {
          this.router.navigate(['/admin']);
        }, 2000);
      }
    });
  }

  async ngOnInit() {
    await this.loadFolders();
  }

  async loadFolders() {
    this.isLoadingFolders.set(true);
    try {
      const response = await firstValueFrom(this.apiService.getAllFolders(0, 100));
      this.folders.set(response?.folders || []);
    } catch (error) {
      console.error('Failed to load folders:', error);
    } finally {
      this.isLoadingFolders.set(false);
    }
  }

  async createFolder() {
    const name = this.newFolderName().trim();
    if (!name) {
      firstValueFrom(this.translate.get('errors.enterFolderName')).then(msg => {
        this.toastService.warning(msg || 'Please enter a folder name');
      });
      return;
    }

    try {
      const folder = await firstValueFrom(
        this.apiService.createFolder(name, this.newFolderDescription().trim() || undefined)
      );
      // Reload folders
      await this.loadFolders();
      // Select the newly created folder
      this.selectedFolderId.set(folder.id);
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
    }
  }

  cancelCreateFolder() {
    this.showCreateFolderModal.set(false);
    this.newFolderName.set('');
    this.newFolderDescription.set('');
  }

  onFolderSelected(value: string | number | null) {
    if (value === null || value === undefined) {
      this.selectedFolderId.set(null);
    } else {
      this.selectedFolderId.set(typeof value === 'number' ? value : parseInt(value.toString(), 10));
    }
  }

  onFilesSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    
    // Filter for image files and HEIC files
    const imageFiles = files.filter(file => 
      file.type.startsWith(IMAGE_MIME_PREFIX) || this.heicService.isHeicFile(file)
    );
    
    // Check for invalid file types
    const invalidFiles = files.filter(file => 
      !file.type.startsWith(IMAGE_MIME_PREFIX) && !this.heicService.isHeicFile(file)
    );
    
    if (invalidFiles.length > 0) {
      const invalidFileNames = invalidFiles.map(f => f.name).join(', ');
      const supportedTypes = 'image/* (JPG, PNG, GIF, HEIC, HEIF, etc.)';
      firstValueFrom(this.translate.get('errors.invalidFileType')).then((msg: string) => {
        this.toastService.error(`${msg} (${invalidFileNames}). ${supportedTypes}`);
      }).catch(() => {
        this.toastService.error(`Invalid file type: ${invalidFileNames}. Supported formats: ${supportedTypes}`);
      });
    }
    
    if (imageFiles.length === 0) {
      return;
    }

    // Process files: convert HEIC to JPEG, then clone for mobile compatibility
    const fileReadObservables = imageFiles.map(file => {
      // First, check if it's a HEIC file and convert it
      if (this.heicService.isHeicFile(file)) {
        return from(this.heicService.convertHeicToJpeg(file)).pipe(
          switchMap(convertedFile => 
            this.readFileAsBlob$(convertedFile).pipe(
              map(blob => {
                const clonedFile = new File([blob], convertedFile.name, { 
                  type: JPEG_MIME_TYPE, 
                  lastModified: convertedFile.lastModified 
                });
                const previewUrl = URL.createObjectURL(clonedFile);
                return {
                  file: clonedFile,
                  title: this.defaultTitle() || convertedFile.name.replace(/\.[^/.]+$/, ''),
                  description: this.defaultDescription(),
                  category: this.defaultCategory(),
                  previewUrl: previewUrl
                } as FileWithMetadata;
              })
            )
          ),
          catchError(error => {
            console.error('Error processing HEIC file:', error);
            firstValueFrom(this.translate.get('errors.heicConversionFailed')).then(msg => {
              this.toastService.error(msg || 'Failed to convert HEIC image');
            }).catch(() => {
              this.toastService.error('Failed to convert HEIC image');
            });
            return EMPTY;
          })
        );
      } else {
        // Regular image file - clone as before
        return this.readFileAsBlob$(file).pipe(
          map(blob => {
            const clonedFile = new File([blob], file.name, { 
              type: file.type, 
              lastModified: file.lastModified 
            });
            return {
              file: clonedFile,
              title: this.defaultTitle() || file.name.replace(/\.[^/.]+$/, ''),
              description: this.defaultDescription(),
              category: this.defaultCategory()
            } as FileWithMetadata;
          }),
          catchError(error => {
            console.error('Error reading file:', error);
            // Fallback to original file if cloning fails
            const previewUrl = URL.createObjectURL(file);
            return of({
              file: file,
              title: this.defaultTitle() || file.name.replace(/\.[^/.]+$/, ''),
              description: this.defaultDescription(),
              category: this.defaultCategory(),
              previewUrl: previewUrl
            } as FileWithMetadata);
          })
        );
      }
    });

    // Process all files in parallel
    forkJoin(fileReadObservables).subscribe({
      next: (processedFiles) => {
        // Filter out any empty results from failed conversions
        const validFiles = processedFiles.filter(f => f !== null && f !== undefined);
        if (validFiles.length > 0) {
          this.selectedFiles.update(current => [...current, ...validFiles]);
        }
        // Clear the input to allow selecting the same file again
        event.target.value = '';
      },
      error: (error) => {
        console.error('Error processing files:', error);
        event.target.value = '';
      }
    });
  }

  private readFileAsBlob$(file: File): Observable<Blob> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = () => {
        const blob = new Blob([reader.result as ArrayBuffer], { type: file.type });
        observer.next(blob);
        observer.complete();
      };
      reader.onerror = (error) => {
        observer.error(error);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  removeFile(index: number) {
    this.selectedFiles.update(files => {
      const updated = [...files];
      const removed = updated.splice(index, 1);
      // Clean up preview URL to prevent memory leaks
      if (removed[0]?.previewUrl) {
        URL.revokeObjectURL(removed[0].previewUrl);
      }
      return updated;
    });
  }

  applyDefaultsToAll() {
    const title = this.defaultTitle();
    const description = this.defaultDescription();
    const category = this.defaultCategory();
    
    this.selectedFiles.update(files => 
      files.map(item => ({
        ...item,
        title: title || item.title,
        description: description || item.description,
        category: category || item.category
      }))
    );
  }

  updateFileTitle(index: number, title: string) {
    this.selectedFiles.update(files => {
      const updated = [...files];
      updated[index] = { ...updated[index], title };
      return updated;
    });
  }

  updateFileDescription(index: number, description: string) {
    this.selectedFiles.update(files => {
      const updated = [...files];
      updated[index] = { ...updated[index], description };
      return updated;
    });
  }

  updateFileCategory(index: number, category: string) {
    this.selectedFiles.update(files => {
      const updated = [...files];
      updated[index] = { ...updated[index], category };
      return updated;
    });
  }

  onCatalogFileSelected(event: any, index: number) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFiles.update(files => {
        const updated = [...files];
        updated[index] = { ...updated[index], catalogFile: file };
        return updated;
      });
    }
    // Reset input to allow selecting the same file again
    event.target.value = '';
  }

  removeCatalogFile(index: number) {
    this.selectedFiles.update(files => {
      const updated = [...files];
      updated[index] = { ...updated[index], catalogFile: undefined };
      return updated;
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  upload() {
    const files = this.selectedFiles();
    
    if (files.length === 0) {
      return;
    }

    // Validate that all files have titles
    const missingTitles = files.filter(item => !item.title.trim());
    if (missingTitles.length > 0) {
      firstValueFrom(this.translate.get('errors.enterTitleForAll')).then(msg => {
        this.toastService.warning(msg);
      });
      return;
    }

    // Validate files are still accessible (important for mobile)
    const invalidFiles = files.filter(item => {
      try {
        return !item.file || item.file.size === 0;
      } catch {
        return true;
      }
    });

    if (invalidFiles.length > 0) {
      firstValueFrom(this.translate.get('errors.uploadFailed')).then(msg => {
        this.toastService.error(msg + ' Some files are no longer accessible. Please reselect them.');
      });
      return;
    }

    // Reset state
    this.isUploading.set(true);
    this.isGeneratingEmbeddings.set(false);
    this.uploadProgress.set(0);
    this.uploadResult.set(null);
    this.navigationScheduled = false;

    // Step 1: Upload images using RxJS
    this.apiService.uploadImagesWithMetadata(files, this.selectedFolderId() || undefined).pipe(
      tap(() => this.uploadProgress.set(50)),
      switchMap((result) => {
        this.uploadResult.set(result);
        
        // Step 2: Automatically generate embeddings for uploaded images
        if (result?.images && result.images.length > 0) {
          this.isGeneratingEmbeddings.set(true);
          const imageIds = result.images.map((img: any) => img.id);
          
          return this.apiService.generateEmbeddings(imageIds).pipe(
            tap(() => this.uploadProgress.set(100)),
            map(() => ({ success: true, result })),
            catchError((embeddingError: any) => {
              console.error('Embedding generation error:', embeddingError);
              this.uploadProgress.set(100);
              firstValueFrom(this.translate.get('admin.uploadedButEmbeddingFailed')).then(msg => {
                this.toastService.warning(msg);
              });
              return of({ success: false, result, embeddingError });
            })
          );
        } else {
          this.uploadProgress.set(100);
          return of({ success: true, result });
        }
      }),
      catchError((error: any) => {
        console.error('Upload error:', error);
        if (error?.error?.message) {
          console.error('Server error:', error.error.message);
        }
        if (error?.message) {
          console.error('Error message:', error.message);
        }
        
        firstValueFrom(this.translate.get('errors.uploadFailed')).then(msg => {
          this.toastService.error(msg);
        });
        
        return EMPTY;
      }),
      finalize(() => {
        this.isUploading.set(false);
        this.isGeneratingEmbeddings.set(false);
      })
    ).subscribe({
      next: (response) => {
        if (response.success) {
          // Show success message
          firstValueFrom(this.translate.get('admin.uploadAndIndexComplete')).then(msg => {
            this.toastService.success(msg, 5000);
          });
          
          // Clear selected files and reset form
          // Clean up preview URLs
          this.selectedFiles().forEach(item => {
            if (item.previewUrl) {
              URL.revokeObjectURL(item.previewUrl);
            }
          });
          this.selectedFiles.set([]);
          this.defaultTitle.set('');
          this.defaultDescription.set('');
          this.defaultCategory.set('');
          // Keep folder selection for next upload
        }
      }
    });
  }

  // This method is kept for backward compatibility but is no longer used
  // Embeddings are now generated automatically after upload
  generateEmbeddings() {
    this.isGeneratingEmbeddings.set(true);

    this.apiService.generateEmbeddings().pipe(
      finalize(() => this.isGeneratingEmbeddings.set(false))
    ).subscribe({
      next: () => {
        firstValueFrom(this.translate.get('admin.embeddingsGenerated')).then(msg => {
          this.toastService.success(msg);
        });
        this.router.navigate(['/admin']);
      },
      error: (error) => {
        console.error('Embedding generation error:', error);
        firstValueFrom(this.translate.get('errors.uploadFailed')).then(msg => {
          this.toastService.error(msg);
        });
      }
    });
  }
}
