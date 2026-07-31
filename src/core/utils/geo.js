// core/utils/geo.js
import { AppError } from '@/core/lib/api';

export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371, toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new AppError('이 기기에서는 위치 정보를 사용할 수 없습니다.'));
    navigator.geolocation.getCurrentPosition(
      pos => resolve([pos.coords.latitude, pos.coords.longitude]),
      () => reject(new AppError('위치 권한을 허용해 주세요. 설정에서 변경할 수 있습니다.')),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  });
}