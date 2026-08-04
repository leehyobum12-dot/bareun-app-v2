// shared/ui/CertBadge.jsx
import { CERT_TOKENS, CERT_ICONS } from '@/shared/constants/cert'

/**
 * [v3.2] 배지 인증 뱃지 컴포넌트
 * 
 * Single Source of Truth: shared/constants/cert.js
 * 
 * @param {string} cert - 한글 배지 이름 (예: '식품안심업소')
 * @param {boolean} showIcon - 아이콘 표시 여부 (기본: false)
 */
export default function CertBadge({ cert, showIcon = false }) {
  const t = CERT_TOKENS[cert] ?? { 
    bg: '#EFEAE4', 
    color: 'var(--ink-500)', 
    icon: '🏷️' 
  }
  
  return (
    <span 
      className="cert-badge" 
      style={{ background: t.bg, color: t.color }}
      title={cert}
    >
      {showIcon && <span style={{ marginRight: 4 }}>{t.icon}</span>}
      {cert}
    </span>
  )
}