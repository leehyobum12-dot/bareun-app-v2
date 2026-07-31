// shared/ui/CertBadge.jsx
const CERT_TOKENS = {
  '나트륨줄이기': { bg: 'var(--safe-100)', color: 'var(--safe-600)', label: '나트륨 줄이기' },
  '안심식당':     { bg: 'var(--info-100)', color: 'var(--info-600)', label: '안심식당' },
  '모범음식점':   { bg: 'var(--warn-100)', color: 'var(--warn-600)', label: '모범음식점' },
  '위생등급제':   { bg: 'var(--brand-50)', color: 'var(--brand-600)', label: '위생등급 우수' },
};
export default function CertBadge({ cert }) {
  const t = CERT_TOKENS[cert] ?? { bg: '#EFEAE4', color: 'var(--ink-500)', label: cert };
  return <span className="cert-badge" style={{ background: t.bg, color: t.color }}>{t.label}</span>;
}