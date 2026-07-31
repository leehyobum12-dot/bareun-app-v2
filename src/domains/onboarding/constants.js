export const DISEASE_CATEGORIES = [
  { id: 'circulatory', name: '순환기계 질환', icon: '🫀', color: '#C73325', bg: '#FBE2DE', diseases: ['고혈압', '고지혈증', '심장질환', '뇌혈관질환'] },
  { id: 'metabolic', name: '대사성 질환', icon: '🩸', color: '#B26A00', bg: '#FCEFD3', diseases: ['당뇨'] },
  { id: 'musculoskeletal', name: '근골격계 질환', icon: '🦴', color: '#1F6FB2', bg: '#E1EEF9', diseases: ['골관절염', '류마티스 관절염', '골다공증'] },
  { id: 'tumor', name: '종양·신장 질환', icon: '🎗️', color: '#6B4E9E', bg: '#EFE9F8', diseases: ['암', '만성콩팥병'] },
]

export const STAGE_QUESTIONS = {
  '고혈압': {
    title: '고혈압 단계를 선택해 주세요', subtitle: '혈압 수치를 기준으로 선택해 주세요',
    options: [
      { id: 'stage1', label: '1단계 고혈압', desc: '수축기 140~159', icon: '🟡' },
      { id: 'stage2', label: '2단계 고혈압', desc: '수축기 160 이상', icon: '🔴' },
    ],
  },
  '당뇨': {
    title: '당뇨 단계를 선택해 주세요', subtitle: '혈당 조절 방법을 기준으로 선택해 주세요',
    options: [
      { id: 'grade1', label: '1등급 (경증)', desc: '식이요법·운동으로 관리 가능', icon: '🟡' },
      { id: 'grade2', label: '2등급 (중증)', desc: '인슐린 또는 약물 치료 중', icon: '🔴' },
    ],
  },
}

export const DISEASES_WITH_STAGES = Object.keys(STAGE_QUESTIONS)