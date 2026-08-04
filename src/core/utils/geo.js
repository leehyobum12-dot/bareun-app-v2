// src/core/utils/geo.js
//
// [v3.2] YAGNI 원칙 적용
//
// 제거됨: distanceKm()
//   - PostGIS ST_Distance가 DB에서 distance_meters를 반환하므로 중복 계산 불필요
//   - get_nearby_restaurants RPC가 이미 정렬된 결과와 거리 정보 제공
//
// 출처: Kent Beck "Extreme Programming Explained" - YAGNI 원칙

import { AppError } from '@/core/lib/api';

/**
 * 현재 위치 가져오기
 *
 * @returns {Promise<[number, number]>} [위도, 경도]
 * @throws {AppError} 위치 권한 거부 또는 지원 안 됨
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new AppError('이 기기에서는 위치 정보를 사용할 수 없습니다.'));
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve([pos.coords.latitude, pos.coords.longitude]),
      () => reject(new AppError('위치 권한을 허용해 주세요. 설정에서 변경할 수 있습니다.')),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  });
}