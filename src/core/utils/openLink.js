// src/core/utils/openLink.js (신규)

import { Capacitor } from '@capacitor/core'

/**
 * 외부 링크 열기
 * - 네이티브: @capacitor/browser (인앱 브라우저)
 * - 웹: window.open (새 탭)
 */
export async function openExternalLink(url) {
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url })
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}