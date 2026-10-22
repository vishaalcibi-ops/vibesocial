export interface InstagramFilter {
  id: string
  name: string
  css: string
}

export const INSTAGRAM_FILTERS: InstagramFilter[] = [
  { id: 'normal', name: 'Normal', css: 'none' },
  { id: 'clarendon', name: 'Clarendon', css: 'contrast(1.2) saturate(1.25) brightness(1.05)' },
  { id: 'gingham', name: 'Gingham', css: 'brightness(1.05) hue-rotate(-10deg) sepia(0.15)' },
  { id: 'juno', name: 'Juno', css: 'contrast(1.15) saturate(1.4) brightness(1.08) sepia(0.08)' },
  { id: 'lark', name: 'Lark', css: 'contrast(0.9) brightness(1.12) saturate(1.1)' },
  { id: 'valencia', name: 'Valencia', css: 'contrast(1.08) brightness(1.08) sepia(0.25)' },
  { id: 'moon', name: 'Moon', css: 'grayscale(1) contrast(1.1) brightness(1.1)' },
  { id: 'retro', name: 'Retro', css: 'sepia(0.4) contrast(1.15) brightness(0.95) saturate(1.3)' },
  { id: 'dramatic', name: 'Vivid', css: 'contrast(1.35) saturate(1.5)' },
]
