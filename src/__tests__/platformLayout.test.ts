import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isNativePlatform, isAndroid, isWeb } from '../utils/platform'

vi.mock('@capacitor/core', () => {
  return {
    Capacitor: {
      isNativePlatform: vi.fn(() => false),
      getPlatform: vi.fn(() => 'web'),
    },
  }
})

describe('Platform-Specific Architecture & Separation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('correctly detects standard Web platform by default', () => {
    expect(isNativePlatform()).toBe(false)
    expect(isAndroid()).toBe(false)
    expect(isWeb()).toBe(true)
  })

  it('correctly detects native Android platform when running in Capacitor', async () => {
    const { Capacitor } = await import('@capacitor/core')
    ;(Capacitor.isNativePlatform as any).mockReturnValue(true)
    ;(Capacitor.getPlatform as any).mockReturnValue('android')

    expect(isNativePlatform()).toBe(true)
    expect(isAndroid()).toBe(true)
    expect(isWeb()).toBe(false)
  })

  it('keeps desktop website layout safe when on web platform', async () => {
    const { Capacitor } = await import('@capacitor/core')
    ;(Capacitor.isNativePlatform as any).mockReturnValue(false)
    ;(Capacitor.getPlatform as any).mockReturnValue('web')

    expect(isAndroid()).toBe(false)
    expect(isWeb()).toBe(true)
    if (typeof document !== 'undefined') {
      expect(document.body.classList.contains('platform-android')).toBe(false)
    }
  })
})
