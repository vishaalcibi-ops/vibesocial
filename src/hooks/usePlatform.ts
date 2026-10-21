import { useState, useEffect } from 'react'
import { isAndroid, isNativePlatform, isWeb } from '../utils/platform'

export interface PlatformState {
  isAndroid: boolean
  isNative: boolean
  isWeb: boolean
  platform: 'android' | 'ios' | 'web'
}

export const usePlatform = (): PlatformState => {
  const [platformState] = useState<PlatformState>(() => {
    const android = isAndroid()
    const native = isNativePlatform()
    return {
      isAndroid: android,
      isNative: native,
      isWeb: isWeb(),
      platform: android ? 'android' : native ? 'ios' : 'web',
    }
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (platformState.isAndroid) {
      document.body.classList.add('platform-android')
      document.documentElement.classList.add('platform-android')
    } else {
      document.body.classList.remove('platform-android')
      document.documentElement.classList.remove('platform-android')
      document.body.classList.add('platform-web')
      document.documentElement.classList.add('platform-web')
    }
  }, [platformState.isAndroid])

  return platformState
}
