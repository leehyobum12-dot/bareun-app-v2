// src/shared/constants/cert.js

/**
 * [v3.2] 배지 인증 상수 (공유)
 * 
 * 사용 도메인:
 * - Owner: StoreRegistration.jsx (배지 선택 UI)
 * - Admin: AdminDashboard.jsx (심사 시 배지 표시)
 * - Restaurant: Home.jsx (손님에게 배지 표시, 향후)
 * 
 * 근거: Feature-Sliced Design 및 도메인 주도 설계(DDD) 원칙
 * 여러 도메인에서 사용되는 개념은 shared 레이어에 위치
 */

/**
 * UI 표시용 배지 옵션 (한글 이름 배열)
 * Owner의 StoreRegistration에서 체크박스로 사용
 */
export const CERT_OPTIONS = [
  '식품안심업소',
  '모범음식점',
  '나트륨 줄이기 실천음식점',
  '안심식당',
]

/**
 * 한글 배지 이름 → DB JSONB 키 매핑
 * 프론트엔드 한글 이름 → Supabase cert_paths JSONB 키
 * 
 * 예시:
 * '식품안심업소' → 'food_safety'
 */
export const CERT_NAME_TO_KEY = {
  '식품안심업소': 'food_safety',
  '모범음식점': 'model_restaurant',
  '나트륨 줄이기 실천음식점': 'low_sodium',
  '안심식당': 'safe_restaurant',
}

/**
 * DB JSONB 키 → 한글 배지 이름 매핑 (역방향)
 * Admin 페이지 등에서 표시용
 * 
 * 예시:
 * 'food_safety' → '식품안심업소'
 */
export const CERT_KEY_TO_NAME = {
  'food_safety': '식품안심업소',
  'model_restaurant': '모범음식점',
  'low_sodium': '나트륨 줄이기 실천음식점',
  'safe_restaurant': '안심식당',
}

/**
 * 배지별 아이콘 매핑 (UI 표시용)
 * 향후 Restaurant 도메인에서 배지 아이콘 표시 시 활용
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