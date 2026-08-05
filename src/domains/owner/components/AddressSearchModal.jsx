// src/domains/owner/components/AddressSearchModal.jsx
import { useRef, useState, useEffect } from 'react'
import Button from '@/shared/ui/Button'
import { geocodeAddress } from '@/core/lib/geocode'

/**
 * [v3.2] 공용 주소 검색 모달
 * 
 * 사용처:
 * - StoreRegistration.jsx (신규 등록)
 * - StoreEdit.jsx (심사 후 수정)
 * 
 * 기능:
 * 1. Daum Postcode API로 주소 검색
 * 2. Naver Maps Geocode로 lat/lng 자동 변환
 * 3. 도로명주소와 지번주소를 모두 반환
 * 
 * 출처:
 * - Daum Postcode API: https://postcode.map.daum.net/guide
 * - Naver Maps Geocoding: https://navermaps.github.io/node.js/
 */
export default function AddressSearchModal({ isOpen, onClose, onComplete }) {
    const postcodeRef = useRef(null)
    const [isProcessing, setIsProcessing] = useState(false)

    useEffect(() => {
        if (!isOpen) return

        const loadPostcode = () => {
            if (postcodeRef.current) postcodeRef.current.innerHTML = ''

            new window.daum.Postcode({
                oncomplete: async (data) => {
                    setIsProcessing(true)

                    const result = {
                        road_name: data.roadAddress || '',
                        lot_num: data.jibunAddress || '',
                        si: data.sido || '',
                        emd: data.bname || '',
                        lat: null,
                        lng: null,
                    }

                    // ✅ [v3.2.2] 서버 측 Geocoding (Edge Function 경유)
                    //    - window.naver JS SDK 의존성 제거
                    //    - Secrets로 키 관리, 화이트리스트 무관
                    try {
                        const { lat, lng } = await geocodeAddress(data.roadAddress || data.jibunAddress)
                        result.lat = lat
                        result.lng = lng
                    } catch (error) {
                        console.error('[AddressSearchModal] Geocode 실패:', error)
                    }

                    setIsProcessing(false)
                    onComplete(result)
                    onClose()
                },
                width: '100%',
                height: '100%',
            }).embed(postcodeRef.current)
        }

        if (window.daum?.Postcode) { load(); return }

        const scriptSrc = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
        const existing = document.querySelector(`script[src="${scriptSrc}"]`)
        if (existing) { existing.addEventListener('load', loadPostcode, { once: true }); return }
        const script = document.createElement('script')
        script.src = scriptSrc
        script.onload = loadPostcode
        document.body.appendChild(script)
    }, [isOpen, onComplete, onClose])

    if (!isOpen) return null

    return (
        <div className="ow-addrmodal open" onClick={onClose}>
            <div className="ow-addrmodal-card" role="dialog" aria-modal="true" aria-label="주소 검색"
                onClick={(e) => e.stopPropagation()}>
                <div className="ow-addrmodal-head">
                    <strong>{isProcessing ? '좌표 변환 중...' : '도로명 주소 검색'}</strong>
                    <Button variant="ghost" onClick={onClose} aria-label="닫기"
                        style={{ minWidth: 'auto', padding: '8px 12px', position: 'absolute', top: 12, right: 12 }}>
                        ✕
                    </Button>
                </div>
                <div ref={postcodeRef} className="ow-addrmodal-body" />
            </div>
        </div>
    )
}