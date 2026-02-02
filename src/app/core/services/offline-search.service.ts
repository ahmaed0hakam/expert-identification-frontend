import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface OfflineImage {
  id: number;
  title: string;
  description: string;
  category: string;
  proxy_url: string;
  chroma_id: string | null;
  hash: string; // Perceptual hash
  imageData?: string; // Base64 image data for offline display
  createdAt?: string;
}

export interface OfflineSearchResult {
  id: number;
  title: string;
  description: string;
  category: string;
  proxy_url: string;
  distance: number; // Hamming distance
  imageData?: string;
}

const DB_NAME = 'OfflineImageSearchDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';

@Injectable({
  providedIn: 'root'
})
export class OfflineSearchService {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private isInitializing = false;

  constructor(private apiService: ApiService) {}

  /**
   * Initialize IndexedDB and fetch images if needed
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.isInitializing) {
      // Wait for ongoing initialization
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isInitializing = true;

    try {
      // Open IndexedDB
      this.db = await this.openDatabase();
      
      // Check if we have images cached
      const count = await this.getImageCount();
      
      if (count === 0) {
        // First time - fetch all images from backend
        await this.fetchAndCacheImages();
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize offline search:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Open IndexedDB database
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('hash', 'hash', { unique: false });
        }
      };
    });
  }

  /**
   * Fetch all images from backend and cache them
   */
  private async fetchAndCacheImages(): Promise<void> {
    try {
      const response = await firstValueFrom(this.apiService.getAllImagesPublic());
      const images = response.images || [];

      if (!this.db) {
        this.db = await this.openDatabase();
      }

      // Process images in batches to avoid blocking
      const batchSize = 10;
      for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);
        
        // Process batch: fetch images and compute hashes first
        const processedImages = await Promise.all(
          batch.map(async (img: any) => {
            try {
              // Fetch image and compute hash
              const imageData = await this.fetchImageAsBase64(img.proxy_url);
              
              // Skip if image fetch failed
              if (!imageData || imageData.trim() === '') {
                console.warn(`Skipping image ${img.id}: Failed to fetch image data`);
                return null;
              }

              const hash = await this.computePerceptualHash(imageData);

              return {
                id: img.id,
                title: img.title,
                description: img.description || '',
                category: img.category || '',
                proxy_url: img.proxy_url,
                chroma_id: img.chroma_id,
                hash: hash,
                imageData: imageData,
                createdAt: img.created_at
              } as OfflineImage;
            } catch (error) {
              console.error(`Failed to process image ${img.id}:`, error);
              return null;
            }
          })
        );

        // Filter out null values (failed images)
        const validImages = processedImages.filter((img): img is OfflineImage => img !== null);

        // Store all valid images in a single transaction
        if (validImages.length > 0) {
          await this.storeImagesInTransaction(validImages);
        }

        // Small delay between batches to avoid blocking UI
        if (i + batchSize < images.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    } catch (error) {
      console.error('Failed to fetch and cache images:', error);
      throw error;
    }
  }

  /**
   * Store images in IndexedDB within a transaction
   */
  private async storeImagesInTransaction(images: OfflineImage[]): Promise<void> {
    if (!this.db) {
      this.db = await this.openDatabase();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      let completed = 0;
      let hasError = false;

      images.forEach((image) => {
        const request = store.put(image);
        request.onsuccess = () => {
          completed++;
          if (completed === images.length && !hasError) {
            resolve();
          }
        };
        request.onerror = () => {
          if (!hasError) {
            hasError = true;
            reject(request.error);
          }
        };
      });

      // Handle transaction completion
      transaction.oncomplete = () => {
        if (!hasError && completed === images.length) {
          resolve();
        }
      };
      transaction.onerror = () => {
        if (!hasError) {
          hasError = true;
          reject(transaction.error);
        }
      };
    });
  }

  /**
   * Fetch image as base64 string
   */
  private async fetchImageAsBase64(proxyUrl: string): Promise<string> {
    try {
      // Get API URL from environment
      let apiUrl = environment.apiUrl;
      
      // Remove trailing slash if present
      apiUrl = apiUrl.replace(/\/$/, '');
      
      // If proxyUrl already starts with /api, remove /api from apiUrl to avoid duplication
      if (proxyUrl.startsWith('/api/')) {
        // Remove /api from apiUrl if it ends with /api
        apiUrl = apiUrl.replace(/\/api$/, '');
      }
      
      const fullUrl = proxyUrl.startsWith('http') 
        ? proxyUrl 
        : `${apiUrl}${proxyUrl}`;
      
      const response = await fetch(fullUrl, {
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Validate blob is an image
      if (!blob.type.startsWith('image/')) {
        throw new Error(`Invalid image type: ${blob.type}`);
      }
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert image to base64'));
          }
        };
        reader.onerror = () => reject(new Error('FileReader error while converting image'));
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error(`Failed to fetch image from ${proxyUrl}:`, error);
      // Throw error instead of returning empty string so caller can handle it
      throw error;
    }
  }

  /**
   * Get count of cached images
   */
  private async getImageCount(): Promise<number> {
    if (!this.db) {
      this.db = await this.openDatabase();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Compute perceptual hash for an image (DCT-based pHash)
   */
  async computePerceptualHash(imageDataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Validate input
      if (!imageDataUrl || imageDataUrl.trim() === '') {
        reject(new Error('Invalid image data URL: empty or null'));
        return;
      }

      // Check if it's a valid data URL
      if (!imageDataUrl.startsWith('data:') && !imageDataUrl.startsWith('http://') && !imageDataUrl.startsWith('https://')) {
        reject(new Error('Invalid image data URL format'));
        return;
      }

      const img = new Image();
      
      // Set timeout for image loading (10 seconds)
      const timeout = setTimeout(() => {
        reject(new Error('Image loading timeout'));
      }, 10000);

      img.onload = async () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Resize to 32x32 for DCT
          const hashSize = 32;
          canvas.width = hashSize;
          canvas.height = hashSize;
          ctx.drawImage(img, 0, 0, hashSize, hashSize);

          // Get image data and convert to grayscale
          const imageData = ctx.getImageData(0, 0, hashSize, hashSize);
          const grayscale = this.toGrayscale(imageData.data, hashSize);

          // Apply DCT
          const dct = this.dct2D(grayscale, hashSize);

          // Extract top-left 8x8 region (low frequency components)
          const lowFreq = this.extractLowFrequency(dct, hashSize, 8);

          // Compute median
          const median = this.computeMedian(lowFreq);

          // Generate hash bits
          const hashBits = lowFreq.map(value => value > median);

          // Convert to hex string
          const hash = this.bitsToHex(hashBits);
          resolve(hash);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load image: ${imageDataUrl.substring(0, 50)}...`));
      };
      
      // Set crossOrigin for external images
      if (imageDataUrl.startsWith('http://') || imageDataUrl.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }
      
      img.src = imageDataUrl;
    });
  }

  /**
   * Convert image data to grayscale
   */
  private toGrayscale(data: Uint8ClampedArray, size: number): number[][] {
    const grayscale: number[][] = [];
    for (let y = 0; y < size; y++) {
      grayscale[y] = [];
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        // Luminance formula: 0.299*R + 0.587*G + 0.114*B
        grayscale[y][x] = 0.299 * r + 0.587 * g + 0.114 * b;
      }
    }
    return grayscale;
  }

  /**
   * 2D Discrete Cosine Transform
   */
  private dct2D(matrix: number[][], size: number): number[][] {
    const dct: number[][] = [];
    const sqrt2 = Math.sqrt(2);

    for (let u = 0; u < size; u++) {
      dct[u] = [];
      for (let v = 0; v < size; v++) {
        let sum = 0;
        for (let i = 0; i < size; i++) {
          for (let j = 0; j < size; j++) {
            const cos1 = Math.cos((2 * i + 1) * u * Math.PI / (2 * size));
            const cos2 = Math.cos((2 * j + 1) * v * Math.PI / (2 * size));
            sum += matrix[i][j] * cos1 * cos2;
          }
        }
        const cu = u === 0 ? 1 / sqrt2 : 1;
        const cv = v === 0 ? 1 / sqrt2 : 1;
        dct[u][v] = (2 / size) * cu * cv * sum;
      }
    }
    return dct;
  }

  /**
   * Extract low frequency components (top-left region)
   */
  private extractLowFrequency(dct: number[][], size: number, extractSize: number): number[] {
    const lowFreq: number[] = [];
    for (let i = 0; i < extractSize; i++) {
      for (let j = 0; j < extractSize; j++) {
        lowFreq.push(dct[i][j]);
      }
    }
    return lowFreq;
  }

  /**
   * Compute median of array
   */
  private computeMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Convert boolean array to hexadecimal string
   */
  private bitsToHex(bits: boolean[]): string {
    let hex = '';
    for (let i = 0; i < bits.length; i += 4) {
      let nibble = 0;
      for (let j = 0; j < 4 && i + j < bits.length; j++) {
        if (bits[i + j]) {
          nibble |= 1 << (3 - j);
        }
      }
      hex += nibble.toString(16);
    }
    return hex;
  }

  /**
   * Calculate Hamming distance between two hashes
   */
  private hammingDistance(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) {
      return 999999; // Large number for different lengths
    }

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      const val1 = parseInt(hash1[i], 16);
      const val2 = parseInt(hash2[i], 16);
      const xor = val1 ^ val2;
      distance += this.countBits(xor);
    }
    return distance;
  }

  /**
   * Count number of set bits in a number
   */
  private countBits(n: number): number {
    let count = 0;
    while (n > 0) {
      count += n & 1;
      n >>= 1;
    }
    return count;
  }

  /**
   * Search for similar images offline
   */
  async searchOffline(imageFile: File, maxDistance: number = 30, limit: number = 20): Promise<OfflineSearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.db) {
      this.db = await this.openDatabase();
    }

    // Convert file to data URL
    const imageDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read image file'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });

    // Compute hash for query image
    const queryHash = await this.computePerceptualHash(imageDataUrl);

    // Get all images from IndexedDB
    const allImages = await this.getAllCachedImages();

    // Search for similar images
    const results: OfflineSearchResult[] = [];
    for (const img of allImages) {
      const distance = this.hammingDistance(queryHash, img.hash);
      if (distance <= maxDistance) {
        results.push({
          id: img.id,
          title: img.title,
          description: img.description,
          category: img.category,
          proxy_url: img.proxy_url,
          distance: distance,
          imageData: img.imageData
        });
      }
    }

    // Sort by distance and limit results
    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, limit);
  }

  /**
   * Get all cached images from IndexedDB
   */
  private async getAllCachedImages(): Promise<OfflineImage[]> {
    if (!this.db) {
      this.db = await this.openDatabase();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get count of cached images
   */
  async getCachedImageCount(): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.getImageCount();
  }

  /**
   * Clear all cached images (for testing/debugging)
   */
  async clearCache(): Promise<void> {
    if (!this.db) {
      this.db = await this.openDatabase();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        this.isInitialized = false;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
}
