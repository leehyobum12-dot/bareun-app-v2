// shared/ui/SodiumBadge.jsx — 도메인의 상징. 신호등 로직 유지 + 토큰 정제
const LEVELS = [
  { max: 800, cls: 'na-safe', label: '안전' },      // WHO 1일 2000mg 기준
  { max: 1500, cls: 'na-warn', label: '주의' },
  { max: Infinity, cls: 'na-danger', label: '위험' },
];

export default function SodiumBadge({ sodium, isMeasurable = true }) {
  if (!isMeasurable || sodium == null || Number.isNaN(Number(sodium))) {
    return <span className="na-badge na-unknown"><span className="dot" />측정 불가</span>;
  }
  const lv = LEVELS.find(l => Number(sodium) < l.max) ?? LEVELS[2];
  return (
    <span className={`na-badge ${lv.cls}`} title={`나트륨 ${lv.label} 등급`}>
      <span className="dot" />{lv.label} <b>{Number(sodium).toLocaleString('ko-KR')}mg</b>
    </span>
  );
}