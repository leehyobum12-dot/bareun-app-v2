// src/domains/restaurant/api/restaurant.api.js

import { rpc, from } from '@/core/lib/api';
import { PAGE_SIZE, RESTAURANT_PUBLIC_COLUMNS } from '../constants';

/**
 * [계약] 페이지는 이 객체만 압니다.
 * 자체 서버 이관 시 이 파일만 REST 구현으로 교체하세요.
 * 
 * [v3.2 수정 사항]
 * - listNearby에 p_radius_meters 파라미터 추가 (DB 함수 시그니처와 일치)
 */
export const RestaurantApi = {
  /**
   * [v3.2 수정] 주변 식당 조회 (PostGIS 반경 검색)
   * p_radius_meters 파라미터 추가로 사용자 반경 조정 가능
   */
  async listNearby({ lat, lng, filters, page, radiusMeters = 3000 }) {
    return rpc('get_nearby_restaurants', {
      user_lat: lat, 
      user_lng: lng,
      p_radius_meters: radiusMeters,  // ✅ 추가: 기본 3km
      p_si: filters.district, 
      p_emd: filters.emd,
      p_biz: filters.bizType, 
      p_avoid: filters.avoidTags, 
      p_keyword: filters.keyword,
    }, '식당 목록을 불러오지 못했습니다.');
  },

  /* [7-c-1b] 인바운드 딥링크용 단건 조회 */
  async getById(id) {
    const { data, error } = await from('restaurants')
      .select(RESTAURANT_PUBLIC_COLUMNS)
      .eq('id', id)
      .eq('is_verified', true)
      .eq('is_closed', false)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  /**
   * 필터 기반 식당 목록 조회 (위치 무관)
   */
  async listByFilter({ filters, page }) {
    let q = from('restaurants')
      .select(RESTAURANT_PUBLIC_COLUMNS)
      .eq('is_verified', true)
      .eq('is_closed', false);

    if (filters.district) q = q.eq('si', filters.district);
    if (filters.emd) q = q.eq('emd', filters.emd);
    if (filters.bizType) q = q.like('biz_type', `%${filters.bizType}%`);
    if (filters.avoidTags?.length) {
      const avoidSet = `{${filters.avoidTags.join(',')}}`;
      q = q.or(`avoid_tags.is.null,avoid_tags.not.ov.${avoidSet}`);
    }
    if (filters.keyword) {
      q = q.or(`store_name.ilike.%${filters.keyword}%,main_menu.ilike.%${filters.keyword}%`);
    }

    const { data, error } = await q
      .order('id')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw error;
    return data ?? [];
  },

  /**
   * 지도 마커용 경량 조회
   */
  async listMarkers({ filters }) {
    let q = from('restaurants')
      .select('id, lat, lng, store_name')
      .eq('is_verified', true)
      .eq('is_closed', false);

    if (filters.district) q = q.eq('si', filters.district);
    if (filters.emd) q = q.eq('emd', filters.emd);
    if (filters.bizType) q = q.like('biz_type', `%${filters.bizType}%`);
    if (filters.avoidTags?.length) {
      const avoidSet = `{${filters.avoidTags.join(',')}}`;
      q = q.or(`avoid_tags.is.null,avoid_tags.not.ov.${avoidSet}`);
    }
    if (filters.keyword) {
      q = q.or(`store_name.ilike.%${filters.keyword}%,main_menu.ilike.%${filters.keyword}%`);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },
};