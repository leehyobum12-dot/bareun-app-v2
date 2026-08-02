
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.bareun.restaurant',
  appName: '바른인증식당',
  webDir: 'dist',

  server: {
    // Android에서 https 스킴 사용 (Supabase Auth PKCE 호환)
    androidScheme: 'https',
  },

  plugins: {
    // 스플래시 스크린
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FFFBF5',
      androidSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: true,
    },

    // 상태바
    StatusBar: {
      style: 'dark',
      backgroundColor: '#FFFBF5',
    },

    // 키보드 (입력 필드 포커스 시 화면 리사이즈)
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },

    // 푸시 알림 (Phase 7-c에서 설정)
    // PushNotifications: {
    //   presentationOptions: ['badge', 'sound', 'alert'],
    // },
  },
}

export default config