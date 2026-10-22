/**
 * Bakes CSS filter and text overlay directly into an image using HTML5 Canvas.
 * Returns a high-quality JPEG data URL.
 */
export async function bakeStoryCanvas(
  dataUrlOrImageUrl: string,
  filterCss: string = 'none',
  textOverlay?: {
    text: string
    color: string
    bgColor: string
    fontSize: number
  } | null
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(dataUrlOrImageUrl)
          return
        }

        // Set dimensions (cap to 1080x1920 or native size)
        const maxWidth = 1080
        const maxHeight = 1920
        let w = img.naturalWidth || img.width
        let h = img.naturalHeight || img.height

        if (w > maxWidth || h > maxHeight) {
          const ratio = Math.min(maxWidth / w, maxHeight / h)
          w = Math.round(w * ratio)
          h = Math.round(h * ratio)
        }

        canvas.width = w
        canvas.height = h

        // Apply filter
        if (filterCss && filterCss !== 'none') {
          ctx.filter = filterCss
        }

        // Draw image
        ctx.drawImage(img, 0, 0, w, h)
        // Reset filter for text
        ctx.filter = 'none'

        // Draw text overlay if present
        if (textOverlay && textOverlay.text.trim()) {
          const text = textOverlay.text.trim()
          const fontSize = Math.max(24, Math.round(w * 0.055))
          ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'

          const centerX = w / 2
          const centerY = h / 2

          // Measure text
          const metrics = ctx.measureText(text)
          const textWidth = metrics.width
          const paddingX = fontSize * 0.7
          const boxWidth = textWidth + paddingX * 2
          const boxHeight = fontSize * 1.5
          const boxX = centerX - boxWidth / 2
          const boxY = centerY - boxHeight / 2
          const radius = fontSize * 0.4

          // Draw rounded pill background
          if (textOverlay.bgColor && textOverlay.bgColor !== 'transparent') {
            ctx.fillStyle = textOverlay.bgColor
            ctx.beginPath()
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius)
            ctx.fill()
          } else {
            // Text shadow for readability when transparent
            ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
            ctx.shadowBlur = 10
            ctx.shadowOffsetX = 0
            ctx.shadowOffsetY = 2
          }

          // Draw text
          ctx.fillStyle = textOverlay.color || '#ffffff'
          ctx.fillText(text, centerX, centerY)
        }

        const bakedDataUrl = canvas.toDataURL('image/jpeg', 0.88)
        resolve(bakedDataUrl)
      } catch (err) {
        console.warn('Canvas baking failed, fallback to original:', err)
        resolve(dataUrlOrImageUrl)
      }
    }
    img.onerror = () => {
      resolve(dataUrlOrImageUrl)
    }
    img.src = dataUrlOrImageUrl
  })
}
