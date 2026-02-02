import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';

export interface QueryAnalysisInfo {
  item_detected: boolean;
  item_type: string;
  description: string;
  confidence: number;
  key_features?: string[];
}

export interface SearchResult {
  id: number;
  title: string;
  description: string;
  category: string;
  accuracy_score: number;
  proxy_url: string;
  has_catalog?: boolean;  // Whether a catalog file exists
  catalog_filename?: string;  // Original catalog filename
  query_analysis?: QueryAnalysisInfo;  // Query image analysis (like bombometter)
  ai_reasoning?: string;  // Why this result is ranked here
  ai_confidence?: number;  // AI confidence score (0-1)
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(
    private http: HttpClient
  ) {}

verifyFirebaseToken(idToken: string): Observable<any> {
    return this.http.post('auth/verify', { id_token: idToken });
  }

  searchImage(file: File, folderId?: number): Observable<SearchResult[]> {
    const formData = new FormData();
    // Append file directly - don't recreate it as that can corrupt the bytes
    formData.append('file', file, file.name);
    
    // Add folder_id if provided
    if (folderId !== undefined && folderId !== null) {
      formData.append('folder_id', folderId.toString());
    }
    
    // Accept-Language header is now handled by ApiInterceptor
    return this.http.post<SearchResult[]>('search/', formData);
  }

  getImageProxy(imageId: number): string {
    // Return relative URL - interceptor will add base URL and auth headers
    // This ensures auth headers are added when used with HttpClient
    return `search/proxy/${imageId}`;
  }

  // Public endpoint for offline caching (no auth required)
  getAllImagesPublic(): Observable<any> {
    return this.http.get('search/public/all');
  }

  // User endpoints - Gallery (now returns folders)
  getGalleryFolders(skip: number = 0, limit: number = 100, search?: string): Observable<any> {
    const params: any = { skip: skip.toString(), limit: limit.toString() };
    if (search && search.trim()) {
      params.search = search.trim();
    }
    return this.http.get('search/gallery', { params });
  }

  // Get images in a specific folder
  getFolderImages(folderId: number, skip: number = 0, limit: number = 100, search?: string): Observable<any> {
    const params: any = { skip: skip.toString(), limit: limit.toString() };
    if (search && search.trim()) {
      params.search = search.trim();
    }
    return this.http.get(`search/gallery/${folderId}/images`, { params });
  }

  // Legacy method for backward compatibility (now returns folders)
  getGalleryImages(skip: number = 0, limit: number = 100, search?: string): Observable<any> {
    return this.getGalleryFolders(skip, limit, search);
  }

  // Admin endpoints
  uploadImages(files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return this.http.post('admin/upload', formData);
  }

  uploadImagesWithMetadata(
    filesWithMetadata: Array<{file: File, catalogFile?: File, title: string, description: string, category: string}>,
    folderId?: number | null
  ): Observable<any> {
    const formData = new FormData();
    
    // Add image files
    filesWithMetadata.forEach((item) => {
      formData.append('files', item.file);
    });
    
    // Add catalog files if any (matched by index)
    const catalogFiles = filesWithMetadata
      .map(item => item.catalogFile)
      .filter((file): file is File => file !== undefined);
    
    if (catalogFiles.length > 0) {
      catalogFiles.forEach((catalogFile) => {
        formData.append('catalog_files', catalogFile);
      });
    }
    
    // Add folder_id if provided
    if (folderId !== undefined && folderId !== null) {
      formData.append('folder_id', folderId.toString());
    }
    
    // Add metadata as JSON string
    const metadata = filesWithMetadata.map(item => ({
      title: item.title,
      description: item.description || '',
      category: item.category || ''
    }));
    formData.append('metadata', JSON.stringify(metadata));
    
    return this.http.post('admin/upload', formData);
  }

  generateEmbeddings(imageIds?: number[]): Observable<any> {
    const body = imageIds ? { image_ids: imageIds } : {};
    return this.http.post('admin/generate-embeddings', body);
  }

  createImage(data: any): Observable<any> {
    return this.http.post('admin/images', null, {
      params: data
    });
  }

  updateImage(imageId: number, data: any): Observable<any> {
    return this.http.put(`admin/images/${imageId}`, data);
  }

  getStats(): Observable<any> {
    return this.http.get('admin/stats');
  }

  // Image management
  getAllImages(skip: number = 0, limit: number = 100, search?: string): Observable<any> {
    const params: any = { skip: skip.toString(), limit: limit.toString() };
    if (search && search.trim()) {
      params.search = search.trim();
    }
    return this.http.get('admin/images', { params });
  }

  // Folder management (admin)
  getAllFolders(skip: number = 0, limit: number = 100, search?: string): Observable<any> {
    const params: any = { skip: skip.toString(), limit: limit.toString() };
    if (search && search.trim()) {
      params.search = search.trim();
    }
    return this.http.get('admin/folders', { params });
  }

  getFolder(folderId: number): Observable<any> {
    return this.http.get(`admin/folders/${folderId}`);
  }

  createFolder(name: string, description?: string): Observable<any> {
    return this.http.post('admin/folders', { name, description });
  }

  updateFolder(folderId: number, name?: string, description?: string): Observable<any> {
    const body: any = {};
    if (name !== undefined) body.name = name;
    if (description !== undefined) body.description = description;
    return this.http.put(`admin/folders/${folderId}`, body);
  }

  deleteFolder(folderId: number): Observable<any> {
    return this.http.delete(`admin/folders/${folderId}`);
  }

  updateImageFolder(imageId: number, folderId: number | null): Observable<any> {
    return this.http.put(`admin/images/${imageId}/folder`, { folder_id: folderId });
  }

  // Get unassigned images (images without folder)
  getUnassignedImages(skip: number = 0, limit: number = 100, search?: string): Observable<any> {
    const params: any = { skip: skip.toString(), limit: limit.toString() };
    if (search && search.trim()) {
      params.search = search.trim();
    }
    return this.http.get('admin/images/unassigned', { params });
  }

  // Alias for getAllImages with search support
  getImages(skip: number = 0, limit: number = 100, search?: string): Observable<any> {
    return this.getAllImages(skip, limit, search);
  }

  getImage(imageId: number): Observable<any> {
    return this.http.get(`admin/images/${imageId}`);
  }

  deleteImage(imageId: number): Observable<any> {
    return this.http.delete(`admin/images/${imageId}`);
  }

  bulkDeleteImages(imageIds: number[]): Observable<any> {
    return this.http.post('admin/images/bulk-delete', {
      image_ids: imageIds
    });
  }

  // User management endpoints
  createUser(userData: { email: string; password: string; role: string; display_name?: string }): Observable<any> {
    return this.http.post('admin/users', userData);
  }

  listUsers(): Observable<any> {
    return this.http.get('admin/users');
  }

  updateUserRole(uid: string, role: string): Observable<any> {
    return this.http.put(`admin/users/${uid}/role`, { role });
  }

  deleteUser(uid: string): Observable<any> {
    return this.http.delete(`admin/users/${uid}`);
  }

  // Catalog download endpoints
  downloadCatalog(imageId: number): Observable<Blob> {
    return this.http.get(`search/catalog/${imageId}`, {
      responseType: 'blob'
    });
  }

  downloadCatalogPublic(imageId: number): Observable<Blob> {
    return this.http.get(`search/public/catalog/${imageId}`, {
      responseType: 'blob'
    });
  }

  downloadCatalogAdmin(imageId: number): Observable<Blob> {
    return this.http.get(`admin/images/${imageId}/catalog`, {
      responseType: 'blob'
    });
  }

  uploadCatalogAdmin(imageId: number, catalogFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('catalog_file', catalogFile);
    return this.http.post(`admin/images/${imageId}/catalog`, formData);
  }

  deleteCatalogAdmin(imageId: number): Observable<any> {
    return this.http.delete(`admin/images/${imageId}/catalog`);
  }

  // Helper method to trigger file download/open
  // Web/Desktop: Downloads the file directly using download attribute
  // Mobile: Opens the file in a new tab/window for viewing (better UX on mobile)
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    
    // Only open in new tab for native Capacitor apps
    // All web browsers (desktop or mobile) should download the file
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      // Native apps: Download file to device (opens in system PDF viewer)
      // Embedded PDF viewing doesn't work well in WebView, so download instead
      this.downloadFileNative(blob, filename);
    } else {
      // Web browser (desktop or mobile web): Always download file directly
      // The download attribute forces download instead of opening
      this.downloadFileWeb(blob, filename, url);
    }
  }

  // Private helper: Downloads file on native apps using Capacitor Filesystem
  // Saves the file to the device, then opens it with the system PDF viewer
  private async downloadFileNative(blob: Blob, filename: string): Promise<void> {
    try {
      // Import Capacitor Filesystem
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove data URL prefix (everything before the comma)
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to convert blob to base64'));
        reader.readAsDataURL(blob);
      });

      // Save file to Documents directory (user-accessible)
      const filePath = `catalogs/${filename}`;
      await Filesystem.writeFile({
        path: filePath,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      });

      // Get the file URI
      const uriResult = await Filesystem.getUri({
        path: filePath,
        directory: Directory.Documents
      });

      // Method 1: Try to open directly with file-opener plugin (opens in PDF viewer)
      try {
        // @ts-ignore - Optional plugin, will be available after npm install
        const { FileOpener } = await import('@capacitor-community/file-opener');
        await FileOpener.open({
          filePath: uriResult.uri,
          contentType: 'application/pdf',
          openWithDefault: true // Try to use default PDF viewer
        });
        return; // Success, exit
      } catch (fileOpenerError) {
        // File opener not available, try Share plugin
      }

      // Method 2: Try Share plugin (shows share dialog, user can choose PDF viewer)
      try {
        const { Share } = await import('@capacitor/share');
        // Use the file URI directly (not converted) for Share plugin
        await Share.share({
          title: filename,
          text: 'Catalog file',
          url: uriResult.uri, // File URI (file:// or content:// URI)
          dialogTitle: 'Open catalog'
        });
        return; // Success, exit
      } catch (shareError) {
        // Share plugin not available or failed
        console.log('Share plugin not available, file saved to Documents directory');
      }

      // If Share plugin fails, file is still saved to Documents directory
      // User can access it via file manager at: Documents/catalogs/filename
      console.log('File saved successfully to Documents directory:', filePath);

    } catch (error) {
      console.error('Error saving file with Capacitor Filesystem:', error);
      // Fallback: try simple blob URL open (may not work in WebView)
      try {
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        // Clean up after a delay
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      } catch (fallbackError) {
        console.error('Fallback download method also failed:', fallbackError);
      }
    }
  }

  // Private helper: Opens PDF in embedded viewer (works with both blob URLs and file URIs)
  private openPdfInApp(url: string, filename: string): void {
    // Remove existing PDF viewer if present
    const existingViewer = document.getElementById('pdf-viewer-container');
    if (existingViewer) {
      existingViewer.remove();
    }

    // Create modal overlay
    const container = document.createElement('div');
    container.id = 'pdf-viewer-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 10000;
      display: flex;
      flex-direction: column;
    `;

    // Header with title and close button
    const header = document.createElement('div');
    header.style.cssText = `
      background: var(--color-primary-800, #92400e);
      color: white;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    `;
    
    const title = document.createElement('h3');
    title.textContent = filename;
    title.style.cssText = 'margin: 0; font-size: 1rem; font-weight: 600;';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0 0.5rem;
      line-height: 1;
    `;
    closeBtn.onclick = () => {
      container.remove();
      // Only revoke if it's a blob URL (starts with blob:)
      if (url.startsWith('blob:')) {
        window.URL.revokeObjectURL(url);
      }
    };
    header.appendChild(closeBtn);
    container.appendChild(header);

    // PDF viewer - use embed instead of iframe for better WebView compatibility
    // Embed works better in Capacitor WebView than iframe for PDFs
    const pdfContainer = document.createElement('div');
    pdfContainer.style.cssText = `
      flex: 1;
      width: 100%;
      background: white;
      position: relative;
      overflow: auto;
    `;
    
    // Use embed tag which works better in WebView for PDFs
    const embed = document.createElement('embed');
    embed.src = url;
    embed.type = 'application/pdf';
    embed.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
    `;
    
    // Fallback message if PDF doesn't load
    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = `
      display: none;
      padding: 2rem;
      text-align: center;
      color: var(--color-gray-600, #6b7280);
    `;
    errorMsg.innerHTML = `
      <p style="margin-bottom: 1rem;">Unable to display PDF in this view.</p>
      <p style="font-size: 0.875rem;">The file has been downloaded to your device.</p>
    `;
    
    // Check if embed loaded after a timeout
    setTimeout(() => {
      // If embed height is 0 or very small, it likely didn't load
      if (embed.offsetHeight < 50) {
        embed.style.display = 'none';
        errorMsg.style.display = 'block';
      }
    }, 2000);
    
    pdfContainer.appendChild(embed);
    pdfContainer.appendChild(errorMsg);
    container.appendChild(pdfContainer);

    // Append to body
    document.body.appendChild(container);

    // Auto-close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.getElementById('pdf-viewer-container')) {
        container.remove();
        window.removeEventListener('keydown', handleEscape);
        if (url.startsWith('blob:')) {
          window.URL.revokeObjectURL(url);
        }
      }
    };
    window.addEventListener('keydown', handleEscape);

    // Clean up blob URL when container is removed (only for blob URLs)
    if (url.startsWith('blob:')) {
      const observer = new MutationObserver(() => {
        if (!document.getElementById('pdf-viewer-container')) {
          window.URL.revokeObjectURL(url);
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true });
    }
  }

  // Private helper: Downloads file on web/desktop browsers
  private downloadFileWeb(blob: Blob, filename: string, url?: string): void {
    const objectUrl = url || window.URL.createObjectURL(blob);
    
    // Create invisible anchor element with download attribute
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename; // Forces download instead of navigation
    link.style.display = 'none';
    
    // Append to body, trigger click, then clean up
    document.body.appendChild(link);
    link.click();
    
    // Clean up DOM element and blob URL
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    }, 100);
  }
}
