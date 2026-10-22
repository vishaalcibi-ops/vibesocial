/**
 * Bakes CSS filter, drawing strokes, stickers, text overlays, and disclosure badges
 * directly into an image using HTML5 Canvas.
 * Returns a high-quality JPEG data URL.
 */

export interface DrawingStroke {
  points: { x: number; y: number }[]
  color: string
  size: number
  brushType: 'pen' | 'highlighter' | 'neon' | 'eraser'
}

export interface StoryTextOverlay {
  id?: string
  text: string
  color: string
  bgColor: string
  fontSize?: number
  x?: number // percentage 0-100
  y?: number // percentage 0-100
  fontStyle?: 'classic' | 'modern' | 'neon' | 'typewriter' | 'strong'
}

export interface StoryCanvasSticker {
  id: string
  type: string
  x: number // percentage 0-100
  y: number // percentage 0-100
  data: any
}

export interface BakeStoryOptions {
  dataUrlOrImageUrl: string
  filterCss?: string
  drawingStrokes?: DrawingStroke[]
  textOverlays?: StoryTextOverlay[]
  stickers?: StoryCanvasSticker[]
  effect?: string | null
  isAiLabeled?: boolean
  isPaidPartnership?: boolean
}

export async function bakeStoryCanvas(
  dataUrlOrImageUrl: string,
  filterCss: string = 'none',
  singleTextOverlay?: {
    text: string
    color: string
    bgColor: string
    fontSize: number
  } | null,
  extraOptions?: Partial<BakeStoryOptions>
): Promise<string> {
  const options: BakeStoryOptions = {
    dataUrlOrImageUrl,
    filterCss,
    textOverlays: singleTextOverlay && singleTextOverlay.text.trim()
      ? [
          {
            text: singleTextOverlay.text,
            color: singleTextOverlay.color,
            bgColor: singleTextOverlay.bgColor,
            fontSize: singleTextOverlay.fontSize,
            x: 50,
            y: 50,
          },
        ]
      : extraOptions?.textOverlays || [],
    drawingStrokes: extraOptions?.drawingStrokes || [],
    stickers: extraOptions?.stickers || [],
    effect: extraOptions?.effect || null,
    isAiLabeled: extraOptions?.isAiLabeled || false,
    isPaidPartnership: extraOptions?.isPaidPartnership || false,
  }

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

        // Set dimensions (cap to 1080x1920 or native size with 9:16 aspect ratio consideration)
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

        // 1. Draw base image with filter
        if (options.filterCss && options.filterCss !== 'none') {
          ctx.filter = options.filterCss
        }
        ctx.drawImage(img, 0, 0, w, h)
        ctx.filter = 'none'

        // 2. Draw Effect Overlays (sparkles, grain, vhs)
        if (options.effect === 'sparkles' || options.effect === 'gold_dust') {
          drawSparkles(ctx, w, h, options.effect === 'gold_dust' ? '#f59e0b' : '#ffffff')
        } else if (options.effect === 'grain') {
          drawFilmGrain(ctx, w, h)
        } else if (options.effect === 'hearts') {
          drawHeartParticles(ctx, w, h)
        }

        // 3. Draw Drawing Strokes
        if (options.drawingStrokes && options.drawingStrokes.length > 0) {
          for (const stroke of options.drawingStrokes) {
            if (!stroke.points || stroke.points.length < 2) continue

            ctx.save()
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'

            const strokeSize = (stroke.size / 100) * (w * 0.05)

            if (stroke.brushType === 'highlighter') {
              ctx.globalAlpha = 0.45
              ctx.lineWidth = strokeSize * 2.2
              ctx.strokeStyle = stroke.color
            } else if (stroke.brushType === 'neon') {
              ctx.globalAlpha = 1
              ctx.shadowColor = stroke.color
              ctx.shadowBlur = strokeSize * 1.8
              ctx.lineWidth = strokeSize
              ctx.strokeStyle = '#ffffff'
            } else {
              ctx.globalAlpha = 1
              ctx.lineWidth = strokeSize
              ctx.strokeStyle = stroke.color
            }

            ctx.beginPath()
            const p0 = stroke.points[0]
            ctx.moveTo((p0.x / 100) * w, (p0.y / 100) * h)

            for (let i = 1; i < stroke.points.length; i++) {
              const pt = stroke.points[i]
              ctx.lineTo((pt.x / 100) * w, (pt.y / 100) * h)
            }
            ctx.stroke()
            ctx.restore()
          }
        }

        // 4. Draw Badges: Paid Partnership & Made with AI
        if (options.isPaidPartnership) {
          drawPartnershipBanner(ctx, w, h)
        }
        if (options.isAiLabeled) {
          drawAiBadge(ctx, w, h)
        }

        // 5. Draw Stickers (Location, Mention, Poll, Slider, Link, Hashtag, Music, Add Yours, etc.)
        if (options.stickers && options.stickers.length > 0) {
          for (const st of options.stickers) {
            drawSticker(ctx, st, w, h)
          }
        }

        // 6. Draw Text Overlays
        if (options.textOverlays && options.textOverlays.length > 0) {
          for (const txt of options.textOverlays) {
            if (!txt.text || !txt.text.trim()) continue
            drawTextOverlay(ctx, txt, w, h)
          }
        }

        const bakedDataUrl = canvas.toDataURL('image/jpeg', 0.9)
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

function drawPartnershipBanner(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save()
  const fontSize = Math.max(14, Math.round(w * 0.026))
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const bannerText = 'Paid partnership'
  const metrics = ctx.measureText(bannerText)
  const padX = fontSize * 1.2
  const pillW = metrics.width + padX * 2
  const pillH = fontSize * 1.8
  const pillX = w / 2 - pillW / 2
  const pillY = Math.round(h * 0.065)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
  ctx.beginPath()
  ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.fillText(bannerText, w / 2, pillY + pillH / 2)
  ctx.restore()
}

function drawAiBadge(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save()
  const fontSize = Math.max(12, Math.round(w * 0.024))
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  const badgeText = '✨ Made with AI'
  const metrics = ctx.measureText(badgeText)
  const padX = fontSize * 0.9
  const pillW = metrics.width + padX * 2
  const pillH = fontSize * 1.8
  const pillX = Math.round(w * 0.04)
  const pillY = Math.round(h * 0.065)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.beginPath()
  ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2)
  ctx.fill()

  ctx.fillStyle = '#60a5fa'
  ctx.fillText(badgeText, pillX + padX, pillY + pillH / 2)
  ctx.restore()
}

function drawTextOverlay(ctx: CanvasRenderingContext2D, txt: StoryTextOverlay, w: number, h: number) {
  ctx.save()
  const text = txt.text.trim()
  const baseFontSize = txt.fontSize || Math.max(26, Math.round(w * 0.055))
  const fontSize = Math.max(18, Math.round((baseFontSize / 500) * w))

  let fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  if (txt.fontStyle === 'typewriter') fontFamily = '"Courier New", Courier, monospace'
  else if (txt.fontStyle === 'neon') fontFamily = '"Brush Script MT", cursive, sans-serif'
  else if (txt.fontStyle === 'strong') fontFamily = 'Impact, sans-serif'

  ctx.font = `bold ${fontSize}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const centerX = (txt.x !== undefined ? txt.x / 100 : 0.5) * w
  const centerY = (txt.y !== undefined ? txt.y / 100 : 0.5) * h

  const metrics = ctx.measureText(text)
  const textWidth = metrics.width
  const paddingX = fontSize * 0.7
  const boxWidth = textWidth + paddingX * 2
  const boxHeight = fontSize * 1.5
  const boxX = centerX - boxWidth / 2
  const boxY = centerY - boxHeight / 2
  const radius = fontSize * 0.35

  // Background pill
  if (txt.bgColor && txt.bgColor !== 'transparent') {
    ctx.fillStyle = txt.bgColor
    ctx.beginPath()
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius)
    ctx.fill()
  } else {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 2
  }

  if (txt.fontStyle === 'neon') {
    ctx.shadowColor = txt.color || '#ec4899'
    ctx.shadowBlur = 18
  }

  ctx.fillStyle = txt.color || '#ffffff'
  ctx.fillText(text, centerX, centerY)
  ctx.restore()
}

function drawSticker(ctx: CanvasRenderingContext2D, st: StoryCanvasSticker, w: number, h: number) {
  ctx.save()
  const centerX = (st.x / 100) * w
  const centerY = (st.y / 100) * h

  switch (st.type) {
    case 'location': {
      const locationText = st.data?.name || '📍 Current Location'
      const fontSize = Math.max(16, Math.round(w * 0.038))
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, Roboto, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const metrics = ctx.measureText(locationText)
      const pillW = metrics.width + fontSize * 1.8
      const pillH = fontSize * 2.2
      const x = centerX - pillW / 2
      const y = centerY - pillH / 2

      // Gradient background
      const grad = ctx.createLinearGradient(x, y, x + pillW, y)
      grad.addColorStop(0, '#f97316')
      grad.addColorStop(1, '#ec4899')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.roundRect(x, y, pillW, pillH, pillH / 2)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.fillText(locationText, centerX, centerY)
      break
    }

    case 'mention': {
      const mentionText = st.data?.username ? `@${st.data.username}` : '@mention'
      const fontSize = Math.max(16, Math.round(w * 0.04))
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, Roboto, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const metrics = ctx.measureText(mentionText)
      const pillW = metrics.width + fontSize * 1.6
      const pillH = fontSize * 2
      const x = centerX - pillW / 2
      const y = centerY - pillH / 2

      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(x, y, pillW, pillH, 8)
      ctx.fill()

      ctx.fillStyle = '#e1306c'
      ctx.fillText(mentionText, centerX, centerY)
      break
    }

    case 'link': {
      const linkLabel = st.data?.title || st.data?.url || '🔗 LINK'
      const fontSize = Math.max(15, Math.round(w * 0.036))
      ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, Roboto, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const metrics = ctx.measureText(linkLabel)
      const pillW = metrics.width + fontSize * 2
      const pillH = fontSize * 2.2
      const x = centerX - pillW / 2
      const y = centerY - pillH / 2

      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(x, y, pillW, pillH, pillH / 2)
      ctx.fill()

      ctx.fillStyle = '#2563eb'
      ctx.fillText(linkLabel, centerX, centerY)
      break
    }

    case 'poll': {
      const question = st.data?.question || 'Ask a question...'
      const opt1 = st.data?.option1 || 'YES'
      const opt2 = st.data?.option2 || 'NO'
      const cardW = Math.min(w * 0.75, 360)
      const cardH = cardW * 0.55
      const x = centerX - cardW / 2
      const y = centerY - cardH / 2

      // Card body
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(x, y, cardW, cardH, 16)
      ctx.fill()

      // Question
      const qFontSize = Math.max(14, Math.round(cardW * 0.065))
      ctx.font = `bold ${qFontSize}px -apple-system, BlinkMacSystemFont, Roboto, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#111827'
      ctx.fillText(question, centerX, y + cardH * 0.3)

      // Option 1 & 2 buttons
      const btnW = (cardW - 36) / 2
      const btnH = cardH * 0.36
      const btnY = y + cardH * 0.54

      // Option 1
      ctx.fillStyle = '#f3f4f6'
      ctx.beginPath()
      ctx.roundRect(x + 12, btnY, btnW, btnH, 10)
      ctx.fill()
      ctx.fillStyle = '#374151'
      ctx.font = `bold ${Math.round(qFontSize * 0.85)}px sans-serif`
      ctx.fillText(opt1, x + 12 + btnW / 2, btnY + btnH / 2)

      // Option 2
      ctx.fillStyle = '#f3f4f6'
      ctx.beginPath()
      ctx.roundRect(x + 24 + btnW, btnY, btnW, btnH, 10)
      ctx.fill()
      ctx.fillStyle = '#374151'
      ctx.fillText(opt2, x + 24 + btnW + btnW / 2, btnY + btnH / 2)
      break
    }

    case 'slider': {
      const prompt = st.data?.question || 'Rate this'
      const emoji = st.data?.emoji || '😍'
      const cardW = Math.min(w * 0.75, 340)
      const cardH = cardW * 0.42
      const x = centerX - cardW / 2
      const y = centerY - cardH / 2

      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(x, y, cardW, cardH, 16)
      ctx.fill()

      ctx.font = `bold ${Math.round(cardW * 0.065)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#111827'
      ctx.fillText(prompt, centerX, y + cardH * 0.3)

      // Slider bar
      const barW = cardW - 40
      const barH = 10
      const barX = x + 20
      const barY = y + cardH * 0.65
      ctx.fillStyle = '#e5e7eb'
      ctx.beginPath()
      ctx.roundRect(barX, barY, barW, barH, 5)
      ctx.fill()

      // Emoji thumb
      ctx.font = `${Math.round(cardW * 0.12)}px sans-serif`
      ctx.fillText(emoji, centerX, barY + 5)
      break
    }

    case 'hashtag': {
      const tagText = st.data?.tag ? `#${st.data.tag.replace(/^#/, '')}` : '#hashtag'
      const fontSize = Math.max(16, Math.round(w * 0.04))
      ctx.font = `bold ${fontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const metrics = ctx.measureText(tagText)
      const pillW = metrics.width + fontSize * 1.6
      const pillH = fontSize * 2
      const x = centerX - pillW / 2
      const y = centerY - pillH / 2

      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(x, y, pillW, pillH, pillH / 2)
      ctx.fill()

      ctx.fillStyle = '#ec4899'
      ctx.fillText(tagText, centerX, centerY)
      break
    }

    case 'countdown': {
      const title = st.data?.title || 'Countdown'
      const cardW = Math.min(w * 0.72, 320)
      const cardH = cardW * 0.48
      const x = centerX - cardW / 2
      const y = centerY - cardH / 2

      ctx.fillStyle = '#1e1e1e'
      ctx.beginPath()
      ctx.roundRect(x, y, cardW, cardH, 14)
      ctx.fill()

      ctx.font = `bold ${Math.round(cardW * 0.07)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(`⏱️ ${title}`, centerX, y + cardH * 0.32)

      ctx.font = `bold ${Math.round(cardW * 0.12)}px monospace`
      ctx.fillStyle = '#f43f5e'
      ctx.fillText('02 : 14 : 35', centerX, y + cardH * 0.72)
      break
    }

    case 'add_yours': {
      const prompt = st.data?.prompt || 'Drop your favorite photo'
      const cardW = Math.min(w * 0.74, 330)
      const cardH = cardW * 0.48
      const x = centerX - cardW / 2
      const y = centerY - cardH / 2

      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(x, y, cardW, cardH, 16)
      ctx.fill()

      ctx.font = `bold ${Math.round(cardW * 0.058)}px sans-serif`
      ctx.fillStyle = '#ec4899'
      ctx.textAlign = 'center'
      ctx.fillText('📷 ADD YOURS', centerX, y + cardH * 0.3)

      ctx.font = `600 ${Math.round(cardW * 0.055)}px sans-serif`
      ctx.fillStyle = '#1f2937'
      ctx.fillText(prompt, centerX, y + cardH * 0.65)
      break
    }

    case 'custom': {
      const neonText = st.data?.text || 'Love you'
      const fontSize = Math.max(28, Math.round(w * 0.075))
      ctx.font = `bold ${fontSize}px "Brush Script MT", cursive, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = '#ec4899'
      ctx.shadowBlur = 20
      ctx.fillStyle = '#fbcfe8'
      ctx.fillText(neonText, centerX, centerY)
      break
    }

    case 'emoji': {
      const emojiChar = st.data?.emoji || '😍'
      const fontSize = Math.max(48, Math.round(w * 0.12))
      ctx.font = `${fontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(emojiChar, centerX, centerY)
      break
    }

    default:
      break
  }
  ctx.restore()
}

function drawSparkles(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  ctx.save()
  const count = 28
  for (let i = 0; i < count; i++) {
    const sx = (Math.sin(i * 99 + 1) * 0.5 + 0.5) * w
    const sy = (Math.cos(i * 77 + 2) * 0.5 + 0.5) * h
    const size = 3 + (i % 5) * 2

    ctx.fillStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 8

    ctx.beginPath()
    ctx.arc(sx, sy, size / 2, 0, Math.PI * 2)
    ctx.fill()

    // 4-point sparkle cross
    ctx.fillRect(sx - size, sy - 0.75, size * 2, 1.5)
    ctx.fillRect(sx - 0.75, sy - size, 1.5, size * 2)
  }
  ctx.restore()
}

function drawFilmGrain(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save()
  const grainCanvas = document.createElement('canvas')
  grainCanvas.width = 120
  grainCanvas.height = 120
  const gctx = grainCanvas.getContext('2d')
  if (gctx) {
    const idata = gctx.createImageData(120, 120)
    for (let i = 0; i < idata.data.length; i += 4) {
      const noise = Math.random() * 255
      idata.data[i] = noise
      idata.data[i + 1] = noise
      idata.data[i + 2] = noise
      idata.data[i + 3] = 28 // subtle opacity
    }
    gctx.putImageData(idata, 0, 0)
    ctx.globalCompositeOperation = 'overlay'
    const pattern = ctx.createPattern(grainCanvas, 'repeat')
    if (pattern) {
      ctx.fillStyle = pattern
      ctx.fillRect(0, 0, w, h)
    }
  }
  ctx.restore()
}

function drawHeartParticles(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save()
  const hearts = ['❤️', '💖', '✨', '💕', '🔥']
  for (let i = 0; i < 18; i++) {
    const hx = (Math.sin(i * 123 + 4) * 0.45 + 0.5) * w
    const hy = (Math.cos(i * 87 + 3) * 0.45 + 0.5) * h
    const char = hearts[i % hearts.length]
    ctx.font = `${Math.round(w * 0.045)}px sans-serif`
    ctx.shadowColor = 'rgba(236, 72, 153, 0.6)'
    ctx.shadowBlur = 10
    ctx.fillText(char, hx, hy)
  }
  ctx.restore()
}
