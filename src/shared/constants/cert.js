// src/shared/constants/cert.js
//
// [v3.2] 배지 인증 상수 (Single Source of Truth)
//
// 모든 배지 관련 정보의 단일 출처:
// - UI 표시용 한글 이름
// - DB JSONB 키
// - 아이콘, 색상 토큰, 설명
//
// 이 파일을 수정하면 CertBadge, AdminDashboard, StoreRegistration
// 모든 곳에 자동으로 반영됨

/**
 * UI 표시용 배지 옵션 (한글 이름 배열)
 */
export const CERT_OPTIONS = [
  '식품안심업소',
  '모범음식점',
  '나트륨 줄이기 실천음식점',
  '안심식당',
]

/**
 * 한글 배지 이름 → DB JSONB 키 매핑
 */
export const CERT_NAME_TO_KEY = {
  '식품안심업소': 'food_safety',
  '모범음식점': 'model_restaurant',
  '나트륨 줄이기 실천음식점': 'low_sodium',
  '안심식당': 'safe_restaurant',
}

/**
 * DB JSONB 키 → 한글 배지 이름 매핑 (역방향)
 */
export const CERT_KEY_TO_NAME = {
  'food_safety': '식품안심업소',
  'model_restaurant': '모범음식점',
  'low_sodium': '나트륨 줄이기 실천음식점',
  'safe_restaurant': '안심식당',
}

/**
 * 배지별 아이콘 (UI 표시용)
 */
export const CERT_ICONS = {
  'food_safety': '🛡️',
  'model_restaurant': '🏆',
  'low_sodium': '🧂',
  'safe_restaurant': '✅',
}

/**
 * 배지별 설명 (툴팁용)
 */
export const CERT_DESCRIPTIONS = {
  'food_safety': '식품안전관리인증기준을 충족한 위생 관리 업소',
  'model_restaurant': '위생, 친절도, 환경을 평가받은 모범 음식점',
  'low_sodium': '나트륨 저감화 실천을 인증받은 건강 음식점',
  'safe_restaurant': '생활방역 수칙을 준수하는 안심 식당',
}

/**
 * [v3.2] 배지별 디자인 토큰 (tokens.css 변수 활용)
 * CertBadge 컴포넌트에서 사용
 */
export const CERT_TOKENS = {
  '식품안심업소': { 
    bg: 'var(--safe-100)', 
    color: 'var(--safe-600)', 
    icon: '🛡️' 
  },
  '모범음식점': { 
    bg: 'var(--warn-100)', 
    color: 'var(--warn-600)', 
    icon: '🏆' 
  },
  '나트륨 줄이기 실천음식점': { 
    bg: 'var(--info-100)', 
    color: 'var(--info-600)', 
    icon: '🧂' 
  },
  '안심식당': { 
    bg: 'var(--brand-50)', 
    color: 'var(--brand-600)', 
    icon: '✅' 
  },
}