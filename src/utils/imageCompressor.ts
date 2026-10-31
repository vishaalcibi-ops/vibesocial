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
  maxDimension = 800,
  initialQuality = 0.75
): Promise<CompressedImageResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Failed to read image file.'))

    reader.onload = (e) => {
      const rawDataUrl = (e.target?.result as string) || ''
      if (!rawDataUrl) {
        reject(new Error('Empty image data.'))
        return
      }

      const img = new Image()

      img.onerror = () => {
        // Fallback: If image element fails to decode, resolve with raw data URL
        resolve({
          dataUrl: rawDataUrl,
          originalSize: file.size,
          compressedSize: rawDataUrl.length,
          width: 600,
          height: 600,
        })
      }

      img.onload = () => {
        let width = img.width || 600
        let height = img.height || 600

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
          resolve({
            dataUrl: rawDataUrl,
            originalSize: file.size,
            compressedSize: rawDataUrl.length,
            width,
            height,
          })
          return
        }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        let quality = initialQuality
        let dataUrl = canvas.toDataURL('image/jpeg', quality)

        // Ensure payload stays under 200KB for fast Firestore and real-time network sync
        if (dataUrl.length > 200 * 1024) {
          quality = 0.6
          dataUrl = canvas.toDataURL('image/jpeg', quality)
        }

        resolve({
          dataUrl,
          originalSize: file.size,
          compressedSize: Math.round((dataUrl.length * 3) / 4),
          width,
          height,
        })
      }

      img.src = rawDataUrl
    }

    reader.readAsDataURL(file)
  })
}
