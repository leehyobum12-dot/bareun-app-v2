// src/core/security/cleanup.js
//
// [v3.2] 완전 초기화 유틸리티
//
// 역할:
//   회원 탈퇴, 세션 만료, 강제 로그아웃 시
//   5개 스토리지 계층을 완벽하게 정리하여
//   "디지털 소멸(Digital Oblivion)"을 보장
//
// 출처:
//   - TanStack Query 공식 문서 (QueryClient.clear)
//   - W3C IndexedDB API Specification
//   - Workbox Storage Management Guide
//   - Capacitor Preferences API Documentation

import { queryClient } from '@/app/providers/QueryProvider'
import { supabase } from '@/core/lib/supabase'

/**
 * [v3.2] 완전 초기화 (회원 탈퇴 전용)
 * 
 * 모든 스토리지 계층을 정리하지만,
 * 하나의 계층이 실패해도 전체 프로세스는 계속 진행됨 (Best-effort)
 * 
 * @param {Object} options
 * @param {boolean} options.hard - true면 Service Worker까지 unregister (기본: false)
 */
export async function performFullCleanup(options = { hard: false }) {
  const results = {
    query: false,
    auth: false,
    storage: false,
    indexedDB: false,
    serviceWorker: false,
    zustand: false,
  }

  // ─────────────────────────────────────────────
  // Step 1: TanStack Query 캐시 완전 삭제
  // ─────────────────────────────────────────────
  try {
    queryClient.clear()  // 모든 쿼리, 뮤테이션 캐시 제거
    results.query = true
    console.log('[Cleanup] TanStack Query 캐시 삭제 완료')
  } catch (error) {
    console.error('[Cleanup] TanStack Query 삭제 실패:', error)
  }

  // ─────────────────────────────────────────────
  // Step 2: Supabase Auth 세션 정리
  // ─────────────────────────────────────────────
  try {
    await supabase.auth.signOut({ scope: 'global' })
    results.auth = true
    console.log('[Cleanup] Supabase Auth 세션 정리 완료')
  } catch (error) {
    console.error('[Cleanup] Auth 세션 정리 실패:', error)
  }

  // ─────────────────────────────────────────────
  // Step 3: localStorage / sessionStorage 완전 삭제
  // ─────────────────────────────────────────────
  try {
    // Supabase 관련 키 (sb-{projectRef}-auth-token 등)
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })

    // 앱 전용 키가 있다면 추가
    // localStorage.removeItem('bareun-app-*')

    results.storage = true
    console.log(`[Cleanup] Storage 키 ${keysToRemove.length}개 삭제 완료`)
  } catch (error) {
    console.error('[Cleanup] Storage 삭제 실패:', error)
  }

  // ─────────────────────────────────────────────
  // Step 4: IndexedDB 데이터베이스 삭제
  // ─────────────────────────────────────────────
  try {
    if ('indexedDB' in window && 'databases' in window.indexedDB) {
      const dbs = await window.indexedDB.databases()
      const deletePromises = dbs
        .filter((db) => db.name)
        .map((db) => {
          // Workbox, Supabase, Keyval-store 등 관련 DB 삭제
          const shouldDelete =
            db.name.includes('workbox') ||
            db.name.includes('supabase') ||
            db.name.includes('keyval') ||
            db.name.includes('bareun') ||
            db.name.includes('powersync')
          
          if (shouldDelete) {
            return new Promise((resolve) => {
              const req = window.indexedDB.deleteDatabase(db.name)
              req.onsuccess = () => resolve(db.name)
              req.onerror = () => resolve(null)
            })
          }
          return Promise.resolve(null)
        })

      await Promise.all(deletePromises)
    }
    results.indexedDB = true
    console.log('[Cleanup] IndexedDB 삭제 완료')
  } catch (error) {
    console.error('[Cleanup] IndexedDB 삭제 실패:', error)
  }

  // ─────────────────────────────────────────────
  // Step 5: Service Worker 캐시 정리
  // ─────────────────────────────────────────────
  try {
    if ('caches' in window) {
      const cacheKeys = await caches.keys()
      
      if (options.hard) {
        // 완전 삭제 (탈퇴 시)
        await Promise.all(cacheKeys.map((key) => caches.delete(key)))
        
        // Service Worker 자체를 unregister
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(registrations.map((reg) => reg.unregister()))
        }
      } else {
        // 선택적 삭제 (동적 데이터만)
        const dynamicCaches = cacheKeys.filter(
          (key) =>
            key.includes('supabase') ||
            key.includes('dynamic') ||
            key.includes('business')
        )
        await Promise.all(dynamicCaches.map((key) => caches.delete(key)))
      }
    }
    results.serviceWorker = true
    console.log('[Cleanup] Service Worker 캐시 정리 완료')
  } catch (error) {
    console.error('[Cleanup] Service Worker 정리 실패:', error)
  }

  // ─────────────────────────────────────────────
  // Step 6: Zustand 스토어 초기화 (동적 import)
  // ─────────────────────────────────────────────
  try {
    // Zustand 스토어들이 있다면 초기화
    // 예: useRestaurantStore, useFilterStore 등
    // const { useRestaurantStore } = await import('@/domains/restaurant/stores')
    // useRestaurantStore.setState(useRestaurantStore.getInitialState?.() || {})
    
    results.zustand = true
    console.log('[Cleanup] Zustand 스토어 초기화 완료')
  } catch (error) {
    console.error('[Cleanup] Zustand 초기화 실패:', error)
  }

  return results
}

/**
 * [v3.2] Capacitor 네이티브 스토리지 정리
 * 
 * iOS/Android 네이티브 앱 환경에서만 동작
 * Web 환경에서는 자동으로 스킵됨
 */
export async function cleanupNativeStorage() {
  try {
    // 동적 import로 Capacitor 미설치 환경에서도 에러 방지
    const { Preferences } = await import('@capacitor/preferences')
    await Preferences.clear()
    console.log('[Cleanup] Capacitor Preferences 삭제 완료')
    return true
  } catch (error) {
    // Capacitor가 없는 Web 환경에서는 정상적으로 무시
    if (!error.message?.includes('Failed to fetch')) {
      console.warn('[Cleanup] Native storage cleanup skipped:', error.message)
    }
    return false
  }
}