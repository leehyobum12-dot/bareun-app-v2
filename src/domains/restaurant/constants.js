export const PAGE_SIZE = 20

/*
 * [보안 계약] 손님 공개 조회용 컬럼 화이트리스트
 *
 * ⚠️ 이 목록은 아래 DB 객체와 "반드시" 일치해야 합니다.
 *   - get_nearby_restaurants() RETURNS TABLE
 *   - (도입 시) restaurants_public 뷰
 * 민감/내부 컬럼(owner_id, is_verified, is_closed, confidence_score 등)은
 * 절대 추가하지 않습니다. 새 컬럼 추가 전 "손님에게 안전한가?"를 검토하세요.
 */
export const RESTAURANT_PUBLIC_COLUMNS = [
  'id', 'store_name', 'biz_type', 'phone',
  'road_name', 'lot_num', 'si', 'emd', 'lat', 'lng',
  'main_menu', 'est_sodium_mg', 'is_measurable', 'certs', 'naver_url',
  'business_days', 'open_time', 'close_time', 'closed_days',
].join(', ');