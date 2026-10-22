import React, { useRef, useState, useEffect } from 'react'
import { Check, RotateCcw, Trash2, Sparkles, Edit3 } from 'lucide-react'
import type { DrawingStroke } from '../../utils/storyCanvasBaker'

interface StoryDrawingCanvasProps {
  isActive: boolean
  strokes: DrawingStroke[]
  onStrokesChange: (strokes: DrawingStroke[]) => void
  onDone: () => void
}

const PALETTE_COLORS = [
  '#ffffff',
  '#000000',
  '#f43f5e',
  '#f97316',
  '#facc15',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
]

export const StoryDrawingCanvas: React.FC<StoryDrawingCanvasProps> = ({
  isActive,
  strokes,
  onStrokesChange,
  onDone,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#ffffff')
  const [brushType, setBrushType] = useState<'pen' | 'neon' | 'highlighter'>('pen')
  const [strokeSize, setStrokeSize] = useState(6)
  const currentPointsRef = useRef<{ x: number; y: number }[]>([])

  // Redraw canvas whenever strokes change or canvas resizes
  const renderStrokes = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const stroke of strokes) {
      if (!stroke.points || stroke.points.length < 2) continue

      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const actualSize = (stroke.size / 100) * (canvas.width * 0.05)

      if (stroke.brushType === 'highlighter') {
        ctx.globalAlpha = 0.45
        ctx.lineWidth = actualSize * 2.2
        ctx.strokeStyle = stroke.color
      } else if (stroke.brushType === 'neon') {
        ctx.globalAlpha = 1
        ctx.shadowColor = stroke.color
        ctx.shadowBlur = actualSize * 2.2
        ctx.lineWidth = actualSize
        ctx.strokeStyle = '#ffffff'
      } else {
        ctx.globalAlpha = 1
        ctx.lineWidth = actualSize
        ctx.strokeStyle = stroke.color
      }

      ctx.beginPath()
      const p0 = stroke.points[0]
      ctx.moveTo((p0.x / 100) * canvas.width, (p0.y / 100) * canvas.height)

      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i]
        ctx.lineTo((pt.x / 100) * canvas.width, (pt.y / 100) * canvas.height)
      }
      ctx.stroke()
      ctx.restore()
    }
  }

  // Handle responsive canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (parent) {
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
      renderStrokes()
    }
  }, [isActive, strokes])

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    let clientX = 0
    let clientY = 0

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }

    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
  }

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isActive) return
    e.preventDefault()
    setIsDrawing(true)
    const pt = getCanvasCoords(e)
    currentPointsRef.current = [pt]
  }

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isActive || !isDrawing) return
    e.preventDefault()
    const pt = getCanvasCoords(e)
    currentPointsRef.current.push(pt)

    // Render in-progress stroke directly
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const actualSize = (strokeSize / 100) * (canvas.width * 0.05)

    if (brushType === 'highlighter') {
      ctx.globalAlpha = 0.45
      ctx.lineWidth = actualSize * 2.2
      ctx.strokeStyle = selectedColor
    } else if (brushType === 'neon') {
      ctx.globalAlpha = 1
      ctx.shadowColor = selectedColor
      ctx.shadowBlur = actualSize * 2.2
      ctx.lineWidth = actualSize
      ctx.strokeStyle = '#ffffff'
    } else {
      ctx.globalAlpha = 1
      ctx.lineWidth = actualSize
      ctx.strokeStyle = selectedColor
    }

    const pts = currentPointsRef.current
    if (pts.length >= 2) {
      const pPrev = pts[pts.length - 2]
      ctx.beginPath()
      ctx.moveTo((pPrev.x / 100) * canvas.width, (pPrev.y / 100) * canvas.height)
      ctx.lineTo((pt.x / 100) * canvas.width, (pt.y / 100) * canvas.height)
      ctx.stroke()
    }
    ctx.restore()
  }

  const handleEnd = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (currentPointsRef.current.length >= 2) {
      const newStroke: DrawingStroke = {
        points: [...currentPointsRef.current],
        color: selectedColor,
        size: strokeSize,
        brushType,
      }
      onStrokesChange([...strokes, newStroke])
    }
    currentPointsRef.current = []
  }

  const handleUndo = () => {
    if (strokes.length === 0) return
    onStrokesChange(strokes.slice(0, -1))
  }

  const handleClear = () => {
    onStrokesChange([])
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        pointerEvents: isActive ? 'auto' : 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: isActive ? 'crosshair' : 'default',
          touchAction: 'none',
        }}
      />

      {/* Drawing Toolbar Overlay at Top */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 75%, transparent 100%)',
            padding: '16px 14px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 60,
          }}
        >
          {/* Top Actions: Brush types + Undo + Done */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* Pen Brush */}
              <button
                type="button"
                onClick={() => setBrushType('pen')}
                style={{
                  background: brushType === 'pen' ? 'white' : 'rgba(255,255,255,0.15)',
                  color: brushType === 'pen' ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Edit3 size={14} />
                <span>Pen</span>
              </button>

              {/* Neon Brush */}
              <button
                type="button"
                onClick={() => setBrushType('neon')}
                style={{
                  background: brushType === 'neon' ? '#ec4899' : 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  boxShadow: brushType === 'neon' ? '0 0 10px #ec4899' : 'none',
                }}
              >
                <Sparkles size={14} />
                <span>Neon</span>
              </button>

              {/* Highlighter Brush */}
              <button
                type="button"
                onClick={() => setBrushType('highlighter')}
                style={{
                  background: brushType === 'highlighter' ? '#facc15' : 'rgba(255,255,255,0.15)',
                  color: brushType === 'highlighter' ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Marker
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={handleUndo}
                disabled={strokes.length === 0}
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  color: strokes.length > 0 ? 'white' : 'rgba(255,255,255,0.4)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: strokes.length > 0 ? 'pointer' : 'default',
                }}
                title="Undo stroke"
              >
                <RotateCcw size={16} />
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={strokes.length === 0}
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  color: strokes.length > 0 ? '#f87171' : 'rgba(255,255,255,0.4)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: strokes.length > 0 ? 'pointer' : 'default',
                }}
                title="Clear all drawings"
              >
                <Trash2 size={16} />
              </button>

              <button
                type="button"
                onClick={onDone}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Check size={16} strokeWidth={3} />
                <span>Done</span>
              </button>
            </div>
          </div>

          {/* Stroke Size Selector & Color Palette */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {[3, 6, 12].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setStrokeSize(sz)}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: strokeSize === sz ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
                    border: strokeSize === sz ? '1px solid white' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ width: `${sz}px`, height: `${sz}px`, borderRadius: '50%', background: 'white' }} />
                </button>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                overflowX: 'auto',
                padding: '4px 0',
              }}
            >
              {PALETTE_COLORS.map((col) => {
                const isSelected = selectedColor === col
                return (
                  <div
                    key={col}
                    onClick={() => setSelectedColor(col)}
                    style={{
                      width: isSelected ? '26px' : '20px',
                      height: isSelected ? '26px' : '20px',
                      borderRadius: '50%',
                      backgroundColor: col,
                      border: isSelected ? '2px solid white' : '1px solid rgba(255,255,255,0.4)',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 0 8px rgba(255,255,255,0.8)' : 'none',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
