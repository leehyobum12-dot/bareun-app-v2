// src/core/utils/openLink.js

import { Capacitor } from '@capacitor/core'

/* 범용 외부 웹 링크 (예약하기 등) */
export async function openExternalLink(url) {
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url })
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

/*
 * 자동차 길찾기 — 설치된 지도 앱 우선, 없으면 웹
 * - 네이티브: canOpenUrl 로 앱 설치 확인 → 앱 스킴 실행
 * - 웹/PWA: 앱 설치 확인 불가 → 카카오맵 웹 딥링크
 */
export async function openDriveNavigation({ name, lat, lng }) {
  const enc = encodeURIComponent(name)
  const kakaoApp  = `kakaomap://route?ep=${lat},${lng}&by=CAR`
  const kakaoWeb = `https://map.kakao.com/link/drive/${enc},${lat},${lng}`
  const naverApp  = `nmap://route/car?dlat=${lat}&dlng=${lng}&dname=${enc}&appname=com.bareun.restaurant`

  if (Capacitor.isNativePlatform()) {
    const { App } = await import('@capacitor/app')
    if ((await App.canOpenUrl({ url: kakaoApp })).value) return App.openUrl({ url: kakaoApp })
    if ((await App.canOpenUrl({ url: naverApp })).value) return App.openUrl({ url: naverApp })
    const { Browser } = await import('@capacitor/browser')
    return Browser.open({ url: kakaoWeb })
  }

  // 웹/PWA: 카카오맵 웹 딥링크
  window.open(kakaoWeb, '_blank', 'noopener,noreferrer')
}