/**
 * File type constants for image processing
 */

// HEIC/HEIF MIME types
export const HEIC_MIME_TYPES = [
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence'
] as const;

// HEIC/HEIF file extensions
export const HEIC_EXTENSIONS = ['.heic', '.heif', '.hif'] as const;

// HEIC brand identifiers (magic numbers in ftyp box)
export const HEIC_BRANDS = ['heic', 'heif', 'mif1', 'msf1'] as const;

// JPEG MIME type
export const JPEG_MIME_TYPE = 'image/jpeg';

// JPEG magic numbers (first two bytes)
export const JPEG_MAGIC_NUMBERS = {
  FIRST: 0xFF,
  SECOND: 0xD8
} as const;

// Generic image MIME type prefix
export const IMAGE_MIME_PREFIX = 'image/';

// Generic binary MIME type
export const OCTET_STREAM_MIME_TYPE = 'application/octet-stream';

// JPEG file extension
export const JPEG_EXTENSION = '.jpg';

// File accept attribute for image inputs (includes HEIC)
export const IMAGE_ACCEPT_ATTRIBUTE = 'image/*,.heic,.heif,.hif';

// HEIC to JPEG conversion quality (0-1)
export const HEIC_CONVERSION_QUALITY = 0.92;

// HEIC ftyp box offset
export const HEIC_FTYP_OFFSET = 4;

// Minimum bytes needed to check HEIC content
export const HEIC_CONTENT_CHECK_BYTES = 12;

// Minimum bytes needed to check JPEG magic numbers
export const JPEG_MAGIC_CHECK_BYTES = 4;

// Regex pattern for HEIC file extension replacement
export const HEIC_EXTENSION_REGEX = /\.(heic|heif|hif)$/i;
