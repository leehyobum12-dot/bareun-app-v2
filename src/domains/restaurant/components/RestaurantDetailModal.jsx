import { useState, useEffect } from 'react'
import Button from '@/shared/ui/Button'
import SodiumBadge from '@/shared/ui/SodiumBadge'
import CertBadge from '@/shared/ui/CertBadge'
import { isSafeUrl } from '@/core/security/validators'
import { openExternalLink, openDriveNavigation } from '@/core/utils/openLink'

/*
 * 가게 상세 모달 (옵션 A)
 * - 라우트 페이지 대신 모달로 상세 제공
 * - dir-overlay/dir-card 스타일 재사용 (Home.css)
 * - URL 동기화(/r/:storeId)는 7-c-1b에서 추가
 */
export default function RestaurantDetailModal({ restaurant: r, onClose, onDirections }) {
  const [show, setShow] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setShow(true)) }, [])
  const handleClose = () => { setShow(false); setTimeout(onClose, 300) }

  const certs = (r.certs ?? '').split(',').map(c => c.trim()).filter(Boolean)

  return (
    <div className={`dir-overlay ${show ? 'open' : ''}`} onClick={handleClose}>
      <div className="dir-card" onClick={(e) => e.stopPropagation()}>
        <div className="dir-head">
          <strong>🍲 {r.store_name}</strong>
          <button className="dir-close" onClick={handleClose} aria-label="닫기">✕</button>
        </div>

        <div className="rd-body">
          {/* 뱃지 좌 / 업종 우 */}
          <div className="r-card-badges">
            <div className="r-card-badges-left">
              <SodiumBadge sodium={r.est_sodium_mg} isMeasurable={r.is_measurable} />
              {certs.map(c => <CertBadge key={c} cert={c} />)}
            </div>
            <span className="r-card-biz">{r.biz_type}</span>
          </div>

          {/* 상세 필드 — 방어적 렌더링 (없는 필드는 행 자체가 안 보임) */}
          <dl className="rd-list">
            <div className="rd-row">
              <dt>📍 주소</dt>
              <dd>{r.road_name || `${r.si ?? ''} ${r.emd ?? ''}`.trim()}</dd>
            </div>
            {r.main_menu && (
              <div className="rd-row"><dt>🍽️ 대표 메뉴</dt><dd>{r.main_menu}</dd></div>
            )}
            {r.phone && (
              <div className="rd-row"><dt>📞 연락처</dt><dd>{r.phone}</dd></div>
            )}
            {r.open_time && (
              <div className="rd-row"><dt>⏰ 영업시간</dt><dd>{r.open_time} ~ {r.close_time}</dd></div>
            )}
            {r.closed_days && (
              <div className="rd-row"><dt>🗓️ 휴무</dt><dd>{r.closed_days}</dd></div>
            )}
          </dl>

          {/* 행동 버튼 */}
          <div className="rd-actions">
            <Button block disabled={!isSafeUrl(r.naver_url)}
              onClick={() => isSafeUrl(r.naver_url) && openExternalLink(r.naver_url)}>
              📅 예약하기
            </Button>
            <Button block variant="ghost" disabled={!r.lat || !r.lng}
              onClick={() => r.lat && r.lng && onDirections(r)}>
              🗺️ 길찾기
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}