// src/domains/admin/pages/AdminDashboard.jsx
import { supabase } from '@/core/lib/supabase'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import MobileFrame from '@/shared/ui/MobileFrame'
import Button from '@/shared/ui/Button'
import EmptyState from '@/shared/ui/EmptyState'
import { useToast } from '@/app/providers/ToastProvider'
import { AdminApi } from '../api/admin.api'
import { useNavigate } from 'react-router-dom'
import './admin.css'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [preview, setPreview] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)  // ← 반려 사유 모달 상태
  const [rejectReason, setRejectReason] = useState('')  // ← 반려 사유 입력

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: ['admin', 'pending-verifications'],
    queryFn: AdminApi.getPendingVerifications,
  })

  const viewDoc = async (path, title) => {
    try { 
      setPreview({ url: await AdminApi.getSignedUrl(path), title }) 
    } catch { 
      toast.error('이미지를 불러오지 못했습니다.') 
    }
  }

  // 승인 처리
  const handleApprove = async (item) => {
    const msg = `[${item.restaurants?.store_name}] 식당을 승인할까요?\n승인 시 손님 앱에 즉시 노출됩니다.`
    if (!window.confirm(msg)) return
    setBusyId(item.id)
    try {
      await AdminApi.approve(item)
      toast.success('승인 처리되었습니다.')
      setPreview(null)
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-verifications'] })

      if (item.owner_id) {
        await supabase.functions.invoke('send-push', {
          body: {
            userIds: [item.owner_id],
            title: '가게 승인 완료 🎉',
            body: '바른인증식당에 가게가 등록되었습니다.',
            deeplink: '/owner',
          },
        }).catch(() => { })
      }
    } catch (e) { 
      toast.error(e.message) 
    } finally { 
      setBusyId(null) 
    }
  }

  // 반려 모달 열기
  const openRejectModal = (item) => {
    setRejectModal(item)
    setRejectReason('')
  }

  // 반려 처리 (사유 포함)
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('반려 사유를 입력해 주세요.')
      return
    }

    setBusyId(rejectModal.id)
    try {
      await AdminApi.reject(rejectModal, rejectReason.trim())
      toast.success('반려 처리되었습니다.')
      setRejectModal(null)
      setRejectReason('')
      setPreview(null)
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-verifications'] })

      if (rejectModal.owner_id) {
        await supabase.functions.invoke('send-push', {
          body: {
            userIds: [rejectModal.owner_id],
            title: '가게 심사 반려',
            body: `제출하신 서류가 반려되었습니다.\n사유: ${rejectReason}`,
            deeplink: '/owner',
          },
        }).catch(() => { })
      }
    } catch (e) { 
      toast.error(e.message) 
    } finally { 
      setBusyId(null) 
    }
  }

  // cert_paths를 한글 이름으로 변환하여 표시
  const renderCertButtons = (certPaths) => {
    if (!certPaths || typeof certPaths !== 'object') return null
    
    const entries = Object.entries(certPaths).filter(([, path]) => !!path)
    if (entries.length === 0) return null

    return (
      <div className="ad-certs">
        <p>선택 증명서 확인</p>
        {entries.map(([dbKey, path]) => {
          // DB 키를 한글 이름으로 변환
          const displayName = {
            'food_safety': '식품안심업소',
            'model_restaurant': '모범음식점',
            'low_sodium': '나트륨 줄이기 실천음식점',
            'safe_restaurant': '안심식당',
          }[dbKey] || dbKey

          return (
            <Button 
              key={dbKey} 
              variant="ghost" 
              block 
              size="sm" 
              onClick={() => viewDoc(path, displayName)} 
              style={{ marginBottom: 6 }}
            >
              📎 {displayName}
            </Button>
          )
        })}
      </div>
    )
  }

  return (
    <MobileFrame>
      <header className="ad-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <h1>최고 관리자 센터 👑</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'pending-verifications'] })}
            style={{ border: 0, background: 'var(--bg, #f5f5f5)', color: 'var(--ink-700, #555)', padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            🔄 새로고침
          </button>
          <button
            onClick={() => navigate('/?guest=1')}
            style={{ border: 0, background: 'var(--bg, #f5f5f5)', color: 'var(--ink-700, #555)', padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            손님 모드 🏠
          </button>
        </div>
      </header>
      <main className="ad-main">
        <div className="ad-count reveal">
          <span className="ad-count-num">{items.length}</span>
          <span>건의 서류 심사가 대기 중입니다</span>
        </div>

        {loading ? (
          <div className="ow-loading">불러오는 중…</div>
        ) : items.length === 0 ? (
          <EmptyState icon="✅" title="대기 중인 심사가 없어요" description="모든 서류가 처리되었습니다." />
        ) : (
          items.map((item, i) => (
            <article key={item.id} className="card reveal" style={{ '--d': `${i * 50}ms`, padding: 20 }}>
              <div className="ad-item-head">
                <span className="ad-new">신규 접수</span>
                <span className="ad-date">{new Date(item.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
              <h3 className="ad-store">{item.restaurants?.store_name}</h3>
              <p className="ad-addr">📍 {item.restaurants?.road_name}</p>
              <p className="ad-biz">📋 사업자번호: {item.biz_reg_number}</p>

              {item.biz_reg_url ? (
                <Button variant="ghost" block onClick={() => viewDoc(item.biz_reg_url, '사업자등록증')} style={{ marginBottom: 8 }}>
                  🔍 사업자등록증 확인
                </Button>
              ) : (
                <Button variant="ghost" block disabled style={{ marginBottom: 8, opacity: 0.6 }}>
                  📭 사업자등록증 미제출
                </Button>
              )}
              
              {/* [v3.2 수정] cert_paths 사용 */}
              {renderCertButtons(item.cert_paths)}

              <div className="ad-actions">
                <Button 
                  variant="danger-ghost" 
                  style={{ flex: 1 }} 
                  disabled={busyId === item.id} 
                  onClick={() => openRejectModal(item)}
                >
                  반려
                </Button>
                <Button 
                  style={{ flex: 1 }} 
                  disabled={busyId === item.id} 
                  onClick={() => handleApprove(item)}
                >
                  승인 (권한 부여)
                </Button>
              </div>
            </article>
          ))
        )}
      </main>

      {/* 서류 미리보기 모달 */}
      {preview && (
        <div className="ad-modal" onClick={() => setPreview(null)}>
          <div className="ad-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ad-modal-head">
              <strong>{preview.title}</strong>
              <button className="ad-modal-close" onClick={() => setPreview(null)} aria-label="닫기">✕</button>
            </div>
            <img src={preview.url} alt={preview.title} />
          </div>
        </div>
      )}

      {/* [v3.2 추가] 반려 사유 입력 모달 */}
      {rejectModal && (
        <div className="ad-modal" onClick={() => setRejectModal(null)}>
          <div className="ad-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="ad-modal-head">
              <strong>반려 사유 입력</strong>
              <button className="ad-modal-close" onClick={() => setRejectModal(null)} aria-label="닫기">✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ marginBottom: 12, fontSize: 14, color: 'var(--ink-500)' }}>
                <strong>{rejectModal.restaurants?.store_name}</strong> 식당의 서류를 반려합니다.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="반려 사유를 상세히 입력해 주세요.&#10;예) 사업자등록증의 상호명이 일치하지 않습니다."
                rows={5}
                style={{
                  width: '100%',
                  padding: 12,
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <Button 
                  variant="ghost" 
                  block 
                  onClick={() => setRejectModal(null)}
                >
                  취소
                </Button>
                <Button 
                  variant="danger" 
                  block 
                  disabled={busyId === rejectModal.id || !rejectReason.trim()}
                  onClick={handleReject}
                >
                  {busyId === rejectModal.id ? '처리 중…' : '반려 확정'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MobileFrame>
  )
}