// src/domains/restaurant/stores/filterStore.js

import { create } from 'zustand'

/*
 * [Zustand] 식당 검색 필터 상태
 *
 * - 컴포넌트 언마운트 후에도 상태 유지 (페이지 이동 후 돌아와도 필터 보존)
 * - setDistrict 시 emd 자동 리셋 (지역 변경 → 동네 초기화)
 * - reset: 전체 필터 초기화 (EmptyState "전체 지역으로" 버튼)
 */
export const useFilterStore = create((set) => ({
  search: '',
  district: '전체 지역',
  emd: '전체 동네',
  bizType: '전체',

  setSearch: (v) => set({ search: v }),
  setDistrict: (v) => set({ district: v, emd: '전체 동네' }),
  setEmd: (v) => set({ emd: v }),
  setBizType: (v) => set({ bizType: v }),
  reset: () => set({ search: '', district: '전체 지역', emd: '전체 동네', bizType: '전체' }),
}))