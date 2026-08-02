// src/domains/restaurant/components/DirectionsModal.jsx

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import Button from '@/shared/ui/Button'
import { useToast } from '@/app/providers/ToastProvider'
import { getDirections } from '../api/directions.api'
import { openDriveNavigation } from '@/core/utils/openLink'

/* 지도 범위를 경로 전체에 자동 맞춤 */
function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50] })
    }
  }, [points, map])
  return null
}

export default function DirectionsModal({ restaurant, userLoc, onClose }) {
  const toast = useToast()
  const [path, setPath] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  /*
   * [애니메이션] 마운트 시 open 클래스 지연 추가 → 슬라이드업 재생
   * 닫을 때 open 제거 → 300ms 후 언마운트
   */
  const [show, setShow] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => setShow(true))
  }, [])

  const handleClose = () => {
    setShow(false)
    setTimeout(onClose, 300)
  }

  useEffect(() => {
    let cancelled = false
    const fetchRoute = async () => {
      if (!userLoc || !restaurant.lat || !restaurant.lng) {
        setLoading(false)
        return
      }
      try {
        const data = await getDirections(
          { lat: userLoc[0], lng: userLoc[1] },
          { lat: restaurant.lat, lng: restaurant.lng }
        )
        if (!cancelled) {
          setPath(data.path)
          setSummary(data.summary)
        }
      } catch (e) {
        if (!cancelled) toast.error('경로를 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchRoute()
    return () => { cancelled = true }
  }, [userLoc, restaurant.lat, restaurant.lng, toast])

  const mapPoints = [
    userLoc,
    [restaurant.lat, restaurant.lng],
    ...path,
  ].filter(Boolean)

  const formatDuration = (ms) => {
    const min = Math.round(ms / 60000)
    if (min < 60) return `${min}분`
    return `${Math.floor(min / 60)}시간 ${min % 60}분`
  }

  const formatDistance = (m) => (m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`)

  return (
    <div className={`dir-overlay ${show ? 'open' : ''}`} onClick={handleClose}>
      <div className="dir-card" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="dir-head">
          <strong>🗺️ {restaurant.store_name}</strong>
          <button className="dir-close" onClick={handleClose} aria-label="닫기">✕</button>
        </div>

        {loading ? (
          <div className="dir-loading">
            <div className="spinner" />
            <p>경로 탐색 중…</p>
          </div>
        ) : !userLoc ? (
          <div className="dir-loading">
            <p>📍 현재 위치를 먼저 불러와 주세요.</p>
            <Button variant="ghost" size="sm" onClick={handleClose} style={{ marginTop: 12 }}>닫기</Button>
          </div>
        ) : (
          <>
            {/* 지도 + 폴리라인 */}
            <div className="dir-map">
              <MapContainer
                center={userLoc}
                zoom={14}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FitBounds points={mapPoints} />

                {/* 현재 위치 마커 */}
                <Marker position={userLoc}>
                  <Popup closeButton={false}>📍 내 위치</Popup>
                </Marker>

                {/* 가게 마커 */}
                <Marker position={[restaurant.lat, restaurant.lng]}>
                  <Popup closeButton={false}>🍲 {restaurant.store_name}</Popup>
                </Marker>

                {/* ★ 경로 폴리라인 */}
                {path.length > 0 && (
                  <Polyline
                    positions={path}
                    pathOptions={{
                      color: '#C63D0F',
                      weight: 5,
                      opacity: 0.85,
                      lineJoin: 'round',
                      lineCap: 'round',
                    }}
                  />
                )}
              </MapContainer>
            </div>

            {/* 예상 시간 / 거리 */}
            {summary && (
              <div className="dir-summary">
                <div className="dir-summary-item">
                  <span className="dir-summary-label">예상 시간</span>
                  <strong>{formatDuration(summary.duration)}</strong>
                </div>
                <div className="dir-summary-divider" />
                <div className="dir-summary-item">
                  <span className="dir-summary-label">거리</span>
                  <strong>{formatDistance(summary.distance)}</strong>
                </div>
              </div>
            )}

            {/* 자동차 길찾기 (외부 브라우저) */}
            <div className="dir-actions">
              <Button
                block
                onClick={() => openDriveNavigation({ name: restaurant.store_name, lat: restaurant.lat, lng: restaurant.lng })}
              >
                🚗 자동차 길찾기 (카카오맵)
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}