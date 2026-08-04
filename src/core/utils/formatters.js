// src/core/utils/formatters.js
//
// [v3.2] 자동 하이픈 포맷팅 유틸리티
// 
// 출처:
// - 한국 인터넷 진흥원(KISA) 전화번호 표준 포맷
// - 국세청 사업자등록번호 표준 형식

/**
 * 전화번호 자동 포맷팅
 * 
 * 지원 형식:
 * - 휴대폰: 010-1234-5678 (3-4-4)
 * - 지역번호: 02-123-4567, 031-123-4567 (2-3-4 또는 3-3-4)
 * - 대표번호: 1588-1234 (4-4)
 * 
 * @param {string} value - 입력값 (하이픈 포함/미포함 모두 가능)
 * @returns {string} 포맷된 전화번호
 */
export function formatPhoneNumber(value) {
  if (!value) return ''
  
  // 숫자만 추출
  const digits = value.replace(/\D/g, '')
  
  // 길이에 따른 포맷팅
  if (digits.length <= 2) return digits
  
  // 02로 시작하는 서울 지역번호 (2-3-4 또는 2-4-4)
  if (digits.startsWith('02')) {
    if (digits.length <= 4) return digits
    if (digits.length <= 7) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`
  }
  
  // 15xx, 16xx, 18xx 대표번호 (4-4)
  if (digits.startsWith('1') && digits.length >= 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}`
  }
  
  // 일반 휴대폰/지역번호 (3-3-4 또는 3-4-4)
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}

/**
 * 사업자등록번호 자동 포맷팅
 * 형식: 123-45-67890 (3-2-5)
 * 
 * @param {string} value - 입력값
 * @returns {string} 포맷된 사업자등록번호
 */
export function formatBizNumber(value) {
  if (!value) return ''
  
  const digits = value.replace(/\D/g, '').slice(0, 10) // 최대 10자리
  
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}

/**
 * 포맷팅된 문자열에서 숫자만 추출 (DB 저장용)
 * @param {string} formatted - 포맷된 문자열
 * @returns {string} 숫자만 있는 문자열
 */
export function stripFormatting(formatted) {
  return formatted?.replace(/\D/g, '') || ''
}