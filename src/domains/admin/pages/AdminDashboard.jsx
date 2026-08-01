import { useState, useEffect } from 'react'
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
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    setLoading(true)
    try { setItems(await AdminApi.getPendingVerifications()) }
    catch { toast.error('심사 목록을 불러오지 못했습니다.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, []) // eslint-disable-line

  const viewDoc = async (path, title) => {
    try { setPreview({ url: await AdminApi.getSignedUrl(path), title }) }
    catch { toast.error('이미지를 불러오지 못했습니다.') }
  }

  const setStatus = async (item, approve) => {
    const msg = approve
      ? `[${item.restaurants?.store_name}] 식당을 승인할까요?\n승인 시 손님 앱에 즉시 노출됩니다.`
      : '이 서류를 반려할까요?'
    if (!window.confirm(msg)) return
    setBusyId(item.id)
    try {
      approve ? await AdminApi.approve(item) : await AdminApi.reject(item)
      toast.success(`${approve ? '승인' : '반려'} 처리되었습니다.`)
      setItems((prev) => prev.filter((v) => v.id !== item.id))
      setPreview(null)
    } catch (e) { toast.error(e.message) }
    finally { setBusyId(null) }
  }

  return (
    <MobileFrame>
      <header className="ad-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <h1>최고 관리자 센터 👑</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ border: 0, background: 'var(--bg, #f5f5f5)', color: 'var(--ink-700, #555)', padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            🔄 새로고침
          </button>
          <button onClick={() => navigate('/?guest=1')} style={{ border: 0, background: 'var(--bg, #f5f5f5)', color: 'var(--ink-700, #555)', padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
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
                  📭 사업자등록증 미제출 (반려 후 재제출 유도)
                </Button>
              )}
              {item.cert_urls && Object.keys(item.cert_urls).length > 0 ? (
                <div className="ad-certs">
                  <p>선택 증명서 확인</p>
                  {Object.entries(item.cert_urls)
                    .filter(([, path]) => !!path)
                    .map(([name, path]) => (
                      <Button key={name} variant="ghost" block size="sm" onClick={() => viewDoc(path, name)} style={{ marginBottom: 6 }}>
                        📎 {name}
                      </Button>
                    ))}
                </div>
              ) : null}

              <div className="ad-actions">
                <Button variant="danger-ghost" style={{ flex: 1 }} disabled={busyId === item.id} onClick={() => setStatus(item, false)}>반려</Button>
                <Button style={{ flex: 1 }} disabled={busyId === item.id} onClick={() => setStatus(item, true)}>승인 (권한 부여)</Button>
              </div>
            </article>
          ))
        )}
      </main>

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
    </MobileFrame>
  )
}