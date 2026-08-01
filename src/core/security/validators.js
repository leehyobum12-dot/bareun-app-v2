// core/security/validators.js
export const isPhone = v => !v || /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(v);
export const isBizNumber = v => /^\d{3}-?\d{2}-?\d{5}$/.test(v);
export const sanitizeText = (v, max = 100) => String(v ?? '').trim().slice(0, max);
export const isSafeUrl = url => typeof url === 'string' && /^https?:\/\//i.test(url);
export function validateImageFile(file, maxMB = 5) {
  const MAX_SIZE = maxMB * 1024 * 1024
  const ALLOWED = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
  if (file.size > MAX_SIZE) return `${maxMB}MB 이하의 이미지만 업로드 가능합니다.`
  if (!ALLOWED.includes(file.type)) return 'JPG, PNG, WEBP 형식만 업로드 가능합니다.'
  return null
}