// domains/restaurant/lib/avoidTags.js — 질환↔영양소 매칭 (OCP)
// 새 질환은 여기에 한 줄만 추가하세요. Home.jsx는 절대 수정하지 않습니다.
// ★ 기존 버그 수정: '순환기/대사성'처럼 식당에 존재하지 않는 태그를 밀어넣던 문제를
//   실제 AVOID_TAG_OPTIONS 값으로 바로잡았습니다.
const DISEASE_TO_AVOID = {
  '고혈압': ['고나트륨'], '당뇨': ['단순당'], '고지혈증': ['고지방'],
  '비만': ['단순당', '고지방'], '만성콩팥병': ['고나트륨'],
  '위염': ['자극적'], '통풍': ['자극적'], '대장질환': ['가공육'],
};

export function buildAvoidTags(healthProfile) {
  const tags = new Set();
  (healthProfile?.diseases ?? []).forEach(d => (DISEASE_TO_AVOID[d] ?? []).forEach(t => tags.add(t)));
  return tags.size ? [...tags] : null;
}