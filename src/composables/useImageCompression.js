import imageCompression from 'browser-image-compression'

// Default compression options
const DEFAULT_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1920,
  quality: 0.85
}

/**
 * Composable for client-side image compression
 * @returns {Object} Compression utilities
 */
export function useImageCompression() {
  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size (e.g., "5.2MB")
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + sizes[i]
  }

  /**
   * Create compression status message from compression result
   * @param {Object} result - Compression result object
   * @returns {Object} Status object with message and metadata
   */
  const createCompressionStatus = (result) => {
    if (result.skipped) {
      return {
        message: `Image is already optimized (${formatFileSize(result.originalSize)})`,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        skipped: true
      }
    }
    
    if (result.error) {
      return {
        message: 'Compression failed, uploading original image',
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        error: true
      }
    }
    
    const savings = result.savings
    return {
      message: `Compressed ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} (${savings}% reduction)`,
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      savings
    }
  }

  /**
   * Compress an image file with default options
   * @param {File} file - The image file to compress
   * @param {Function} onProgress - Optional progress callback
   * @returns {Promise<{file: File, originalSize: number, compressedSize: number, compressionRatio: number}>}
   */
  const compressImageWithDefaults = async (file, onProgress = null) => {
    return compressImage(file, {
      ...DEFAULT_COMPRESSION_OPTIONS,
      ...(onProgress && { onProgress })
    })
  }

  /**
   * Compress an image file
   * @param {File} file - The image file to compress
   * @param {Object} options - Compression options (overrides defaults)
   * @param {number} options.maxSizeMB - Maximum file size in MB (default: 0.5)
   * @param {number} options.maxWidthOrHeight - Maximum width or height in pixels (default: 1920)
   * @param {number} options.quality - Image quality 0-1 (default: 0.85)
   * @param {Function} options.onProgress - Progress callback (optional)
   * @returns {Promise<{file: File, originalSize: number, compressedSize: number, compressionRatio: number}>}
   */
  const compressImage = async (file, options = {}) => {
    const {
      maxSizeMB = DEFAULT_COMPRESSION_OPTIONS.maxSizeMB,
      maxWidthOrHeight = DEFAULT_COMPRESSION_OPTIONS.maxWidthOrHeight,
      quality = DEFAULT_COMPRESSION_OPTIONS.quality,
      onProgress = null
    } = options

    // Skip compression for very small files (< 1MB)
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB < 1) {
      console.log(`Image ${file.name} is already small (${formatFileSize(file.size)}), skipping compression`)
      return {
        file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 1,
        skipped: true
      }
    }

    try {
      // Compression options
      const compressionOptions = {
        maxSizeMB,
        maxWidthOrHeight,
        useWebWorker: true, // Use Web Worker to avoid blocking UI
        fileType: 'image/jpeg', // Standardize to JPEG for consistency
        initialQuality: quality,
        alwaysKeepResolution: false
      }

      // Add progress callback if provided
      if (onProgress) {
        compressionOptions.onProgress = onProgress
      }

      console.log(`Compressing image: ${file.name} (${formatFileSize(file.size)})`)
      
      const compressedFile = await imageCompression(file, compressionOptions)
      
      const originalSize = file.size
      const compressedSize = compressedFile.size
      const compressionRatio = compressedSize / originalSize
      const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1)

      console.log(`Compression complete: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${savings}% reduction)`)

      return {
        file: compressedFile,
        originalSize,
        compressedSize,
        compressionRatio,
        savings: parseFloat(savings),
        skipped: false
      }
    } catch (error) {
      console.error('Image compression failed:', error)
      
      // If compression fails, return original file with error flag
      // This allows graceful degradation - upload will still work
      return {
        file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 1,
        error: error.message,
        skipped: false
      }
    }
  }

  /**
   * Compress multiple images
   * @param {File[]} files - Array of image files to compress
   * @param {Object} options - Compression options (same as compressImage)
   * @returns {Promise<Array>} Array of compression results
   */
  const compressImages = async (files, options = {}) => {
    const results = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Add file-specific progress callback if onProgress is provided
      const fileOptions = { ...options }
      if (options.onProgress) {
        fileOptions.onProgress = (progress) => {
          // Calculate overall progress across all files
          const overallProgress = ((i + progress / 100) / files.length) * 100
          options.onProgress(overallProgress, i + 1, files.length, file.name)
        }
      }
      
      const result = await compressImage(file, fileOptions)
      results.push({
        ...result,
        fileName: file.name
      })
    }
    
    return results
  }

  return {
    compressImage,
    compressImageWithDefaults,
    compressImages,
    formatFileSize,
    createCompressionStatus,
    DEFAULT_COMPRESSION_OPTIONS
  }
}


