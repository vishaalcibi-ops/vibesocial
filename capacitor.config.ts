import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.vibesocial.app',
  appName: 'VibeSocial',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'accounts.google.com',
      '*.google.com',
      '*.googleusercontent.com',
      '*.gstatic.com',
      'vibesocial-app-906a8.firebaseapp.com',
      '*.firebaseapp.com',
    ],
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#000000',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#000000',
      showSpinner: false,
    },
  },
}

export default config
