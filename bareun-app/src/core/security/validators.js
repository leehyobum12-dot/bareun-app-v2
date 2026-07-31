// core/security/validators.js
export const isPhone = v => !v || /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(v);
export const isBizNumber = v => /^\d{3}-?\d{2}-?\d{5}$/.test(v);
export const sanitizeText = (v, max = 100) => String(v ?? '').trim().slice(0, max);
export const isSafeUrl = url => typeof url === 'string' && /^https?:\/\//i.test(url);