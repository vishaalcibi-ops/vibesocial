import { Capacitor } from '@capacitor/core'

/**
 * Platform detection using official Capacitor APIs.
 * Ensures clean separation between native Android app and normal browser web apps.
 */
export const isNativePlatform = (): boolean => {
  try {
    return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export const isAndroid = (): boolean => {
  try {
    return isNativePlatform() && Capacitor.getPlatform() === 'android'
  } catch {
    return false
  }
}

export const isWeb = (): boolean => {
  return !isNativePlatform()
}
