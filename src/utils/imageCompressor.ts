/**
 * Utility to compress client-selected image files to lightweight, high-resolution Data URLs.
 * Enables zero-server, instant image uploading directly compatible with Firestore and browser display.
 */
export interface CompressedImageResult {
  dataUrl: string
  originalSize: number
  compressedSize: number
  width: number
  height: number
}

export const compressImageFile = (
  file: File,
  maxDimension = 1200,
  initialQuality = 0.82
): Promise<CompressedImageResult> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file must be an image (JPEG, PNG, WebP, etc.).'))
      return
    }

    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Failed to read image file.'))

    reader.onload = (e) => {
      const img = new Image()

      img.onerror = () => reject(new Error('Failed to decode image data.'))

      img.onload = () => {
        let width = img.width
        let height = img.height

        // Calculate proportional scale
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          // Fallback to raw data URL if canvas 2D context is not available
          const rawDataUrl = e.target?.result as string
          resolve({
            dataUrl: rawDataUrl,
            originalSize: file.size,
            compressedSize: rawDataUrl.length,
            width: img.width,
            height: img.height,
          })
          return
        }

        // Draw image smoothly
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        let quality = initialQuality
        let dataUrl = canvas.toDataURL('image/jpeg', quality)

        // Ensure payload stays under 350KB so it comfortably fits in Firestore (1MB max limit)
        if (dataUrl.length > 350 * 1024) {
          quality = 0.65
          dataUrl = canvas.toDataURL('image/jpeg', quality)
        }

        resolve({
          dataUrl,
          originalSize: file.size,
          compressedSize: Math.round((dataUrl.length * 3) / 4), // Approximate binary bytes
          width,
          height,
        })
      }

      img.src = e.target?.result as string
    }

    reader.readAsDataURL(file)
  })
}
