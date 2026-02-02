import { Injectable } from '@angular/core';
import heic2any from 'heic2any';
import {
  HEIC_MIME_TYPES,
  HEIC_EXTENSIONS,
  HEIC_BRANDS,
  JPEG_MIME_TYPE,
  JPEG_MAGIC_NUMBERS,
  IMAGE_MIME_PREFIX,
  OCTET_STREAM_MIME_TYPE,
  JPEG_EXTENSION,
  HEIC_CONVERSION_QUALITY,
  HEIC_FTYP_OFFSET,
  HEIC_CONTENT_CHECK_BYTES,
  JPEG_MAGIC_CHECK_BYTES,
  HEIC_EXTENSION_REGEX
} from '../constants/file-types';

@Injectable({
  providedIn: 'root'
})
export class HeicService {

  /**
   * Checks if a file is a HEIC/HEIF image by MIME type and extension
   */
  isHeicFile(file: File): boolean {
    // Check MIME type
    if (HEIC_MIME_TYPES.includes(file.type.toLowerCase() as typeof HEIC_MIME_TYPES[number])) {
      return true;
    }
    
    // Check file extension (some browsers don't set MIME type correctly)
    const fileName = file.name.toLowerCase();
    return HEIC_EXTENSIONS.some((ext: string) => fileName.endsWith(ext));
  }

  /**
   * Checks if file bytes indicate HEIC format by checking magic numbers
   */
  async isHeicByContent(file: File): Promise<boolean> {
    try {
      const slice = file.slice(0, HEIC_CONTENT_CHECK_BYTES);
      const arrayBuffer = await slice.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // HEIC files start with specific patterns
      // ftyp box at offset 4, then 'heic', 'heif', 'mif1', or 'msf1'
      if (arrayBuffer.byteLength >= HEIC_CONTENT_CHECK_BYTES) {
        const brand = String.fromCharCode(
          uint8Array[HEIC_FTYP_OFFSET],
          uint8Array[HEIC_FTYP_OFFSET + 1],
          uint8Array[HEIC_FTYP_OFFSET + 2],
          uint8Array[HEIC_FTYP_OFFSET + 3]
        );
        
        if (HEIC_BRANDS.includes(brand.toLowerCase() as typeof HEIC_BRANDS[number])) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking HEIC content:', error);
      return false;
    }
  }

  /**
   * Comprehensive HEIC detection - checks type, extension, and content
   */
  async detectHeic(file: File, blobType?: string): Promise<boolean> {
    // First check by type and extension (fast)
    if (this.isHeicFile(file)) {
      return true;
    }

    // Check blob type if provided
    if (blobType && (blobType.includes('heic') || blobType.includes('heif'))) {
      return true;
    }

    // If type is missing or generic, check by content
    const needsContentCheck = !file.type || 
                             !blobType ||
                             file.type === 'application/octet-stream' ||
                             blobType === 'application/octet-stream' ||
                             file.type === JPEG_MIME_TYPE || // Might be mislabeled HEIC
                             blobType === JPEG_MIME_TYPE;

    if (needsContentCheck) {
      return await this.isHeicByContent(file);
    }

    return false;
  }

  /**
   * Converts a HEIC file to JPEG
   */
  async convertHeicToJpeg(file: File): Promise<File> {
    try {
      console.log('Starting HEIC conversion:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // Convert HEIC to JPEG using heic2any
      const result = await heic2any({
        blob: file,
        toType: JPEG_MIME_TYPE,
        quality: HEIC_CONVERSION_QUALITY
      });

      // heic2any can return a Blob or an array of Blobs
      let convertedBlob: Blob;
      if (Array.isArray(result)) {
        convertedBlob = result[0]; // Take the first blob if array
      } else {
        convertedBlob = result as Blob;
      }

      // Ensure the blob is actually a JPEG
      if (!convertedBlob || convertedBlob.size === 0) {
        throw new Error('Conversion resulted in empty file');
      }

      // Read the blob as ArrayBuffer to ensure it's properly formed
      const arrayBuffer = await convertedBlob.arrayBuffer();
      
      // Verify it's a valid JPEG by checking magic numbers
      const uint8Array = new Uint8Array(arrayBuffer.slice(0, JPEG_MAGIC_CHECK_BYTES));
      const isJPEG = uint8Array[0] === JPEG_MAGIC_NUMBERS.FIRST && 
                     uint8Array[1] === JPEG_MAGIC_NUMBERS.SECOND;
      
      if (!isJPEG) {
        console.error('Converted file does not have JPEG magic numbers!', {
          firstBytes: Array.from(uint8Array).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '),
          arrayBufferLength: arrayBuffer.byteLength
        });
        throw new Error('HEIC conversion failed: result is not a valid JPEG file');
      }

      console.log('JPEG validation passed, magic numbers:', 
        Array.from(uint8Array.slice(0, 2)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));

      // Create a new File object directly from ArrayBuffer with JPEG extension
      const newFileName = file.name.replace(HEIC_EXTENSION_REGEX, JPEG_EXTENSION);
      const convertedFile = new File([arrayBuffer], newFileName, {
        type: JPEG_MIME_TYPE,
        lastModified: file.lastModified
      });

      // Verify file size
      if (convertedFile.size === 0) {
        throw new Error('Converted file is empty');
      }

      console.log('HEIC conversion successful:', {
        originalName: file.name,
        originalSize: file.size,
        originalType: file.type,
        convertedName: convertedFile.name,
        convertedSize: convertedFile.size,
        convertedType: convertedFile.type
      });

      return convertedFile;
    } catch (error) {
      console.error('Error converting HEIC file:', error);
      throw new Error('Failed to convert HEIC image. Please try converting it manually.');
    }
  }

  /**
   * Processes a file - converts HEIC to JPEG if needed, otherwise returns as-is
   */
  async processImageFile(file: File, blobType?: string): Promise<File> {
    const isHeic = await this.detectHeic(file, blobType);
    
    if (isHeic) {
      console.log('HEIC detected, converting to JPEG...');
      return await this.convertHeicToJpeg(file);
    }
    
    // Ensure non-HEIC files have proper image type
    if (!file.type || !file.type.startsWith(IMAGE_MIME_PREFIX)) {
      return new File([file], file.name, {
        type: file.type || JPEG_MIME_TYPE,
        lastModified: file.lastModified
      });
    }
    
    return file;
  }

  /**
   * Validates that a file is a valid JPEG by checking magic numbers
   */
  async validateJpeg(file: File): Promise<boolean> {
    try {
      const slice = file.slice(0, JPEG_MAGIC_CHECK_BYTES);
      const arrayBuffer = await slice.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      return uint8Array[0] === JPEG_MAGIC_NUMBERS.FIRST && 
             uint8Array[1] === JPEG_MAGIC_NUMBERS.SECOND;
    } catch (error) {
      console.error('Error validating JPEG:', error);
      return false;
    }
  }

}
