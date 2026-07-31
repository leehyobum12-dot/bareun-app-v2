// domains/restaurant/pages/Home.jsx
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MobileFrame from '@/shared/ui/MobileFrame';
import SodiumBadge from '@/shared/ui/SodiumBadge';
import CertBadge from '@/shared/ui/CertBadge';
import EmptyState from '@/shared/ui/EmptyState';
import { SkeletonCard } from '@/shared/ui/Skeleton';
import Button from '@/shared/ui/Button';
import { useToast } from '@/app/providers/ToastProvider';
import { useAuth } from '@/domains/auth';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { DISTRICTS, EMD_BY_DISTRICT, BIZ_TYPE } from '@/shared/constants/region';
import { DISEASE_CATEGORIES } from '@/domains/onboarding/constants';
import { RestaurantApi } from '../api/restaurant.api';
import { buildAvoidTags } from '../lib/avoidTags';
import { distanceKm, getCurrentPosition } from '@/core/utils/geo';
import { isSafeUrl } from '@/core/security/validators';
import { PAGE_SIZE } from '../constants';
import './Home.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [restaurants, setRestaurants] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 500);
  const [district, setDistrict] = useState('전체 지역');
  const [emd, setEmd] = useState('전체 동네');
  const [bizType, setBizType] = useState('전체');
  const [userLoc, setUserLoc] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef(null);

  const filters = useMemo(() => ({
    district: district !== '전체 지역' ? district : null,
    emd: district !== '전체 지역' && emd !== '전체 동네' ? emd : null,
    bizType: bizType !== '전체' ? bizType : null,
    avoidTags: buildAvoidTags(user?.healthProfile),
    keyword: debounced.trim() || null,
  }), [district, emd, bizType, debounced, user?.healthProfile]);

  const load = useCallback(async (p, reset = false) => {
    if (userLoc && p > 0) return;
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const list = userLoc
        ? await RestaurantApi.listNearby({ lat: userLoc[0], lng: userLoc[1], filters, page: p })
        : await RestaurantApi.listByFilter({ filters, page: p });
      setRestaurants(prev => (reset ? list : [...prev, ...list]));
      setHasMore(userLoc ? false : list.length === PAGE_SIZE);
      setPage(p);
      if (reset) setMarkers(await RestaurantApi.listMarkers({ filters }));
    } catch (e) {
      toast.error(e.message || '식당을 불러오지 못했습니다.');
      setHasMore(false);
    } finally {
      setLoading(false); setLoadingMore(false);
    }
  }, [filters, userLoc, toast]);

  useEffect(() => { load(0, true); }, [load]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore || loading || userLoc) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) load(page + 1); },
      { rootMargin: '200px' }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [page, hasMore, loadingMore, loading, load, userLoc]);

  const locate = async () => {
    try {
      const loc = await getCurrentPosition();
      setUserLoc(loc);
      toast.success('현재 위치를 불러왔습니다.');
    } catch (e) { toast.error(e.message); }
  };

  const diseases = user?.healthProfile?.diseases ?? [];
  const diseaseColor = diseases.length
    ? DISEASE_CATEGORIES.find(c => c.diseases.includes(diseases[0]))?.color ?? 'var(--brand-600)'
    : 'var(--brand-600)';

  return (
    <MobileFrame>
      <div className="home">
        {/* ── 헤더 ── */}
        <header className={`home-header ${scrolled ? 'scrolled' : ''}`}>
          <div className="home-header-inner">
            <div className="brand">
              <span className="brand-mark">🏮</span>
              <div><strong>바른인증식당</strong><em>건강한 외식을 위한 추천</em></div>
            </div>
            <button className="home-mypage" onClick={() => navigate('/mypage')}>마이페이지</button>
          </div>
        </header>

        {/* ── 오늘의 식단 가이드: 이 앱의 정체성을 여는 첫 화면 ── */}
        <section className="guide reveal">
          <p className="guide-date">
            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
          <h1 className="guide-title">
            {diseases.length > 0
              ? <><em style={{ color: diseaseColor }}>{diseases.join('·')}</em> 관리 중이신<br />{user?.name}님을 위한 식탁</>
              : <>오늘은 <em>{user?.name}</em>님을 위한<br />순한 한 끼를 골랐어요</>}
          </h1>
          <div className="guide-meter" aria-hidden>
            <div className="guide-meter-track"><i /></div>
            <p>오늘 추천 기준 · 나트륨 <b>800mg 이하</b> 우선</p>
          </div>
          {diseases.length > 0 && (
            <div className="guide-tags">
              <span className="guide-tags-label">나의 건강 필터</span>
              {diseases.map(d => <span key={d} className="guide-tag">{d}</span>)}
            </div>
          )}
        </section>

        {/* ── 검색 ── */}
        <div className="search reveal" style={{ '--d': '60ms' }}>
          <span className="search-ico">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="맛집, 메뉴를 검색해보세요" aria-label="식당 검색" />
          {search && <button className="search-clear" onClick={() => setSearch('')} aria-label="지우기">✕</button>}
        </div>

        {/* ── 지역 + 업종 ── */}
        <div className="filterbar reveal" style={{ '--d': '100ms' }}>
          <select value={district} onChange={e => { setDistrict(e.target.value); setEmd('전체 동네'); }} aria-label="지역">
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {district !== '전체 지역' && (
            <select value={emd} onChange={e => setEmd(e.target.value)} aria-label="동네">
              {EMD_BY_DISTRICT[district]?.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          )}
          <button className={`locate ${userLoc ? 'on' : ''}`} onClick={locate} aria-label="내 위치">⌖</button>
        </div>

        <nav className="scroll-x chips-row reveal" style={{ '--d': '140ms' }} aria-label="업종">
          {BIZ_TYPE.map(t => (
            <button key={t} className={`chip ${bizType === t ? 'on' : ''}`} onClick={() => setBizType(t)}>{t}</button>
          ))}
        </nav>

        {/* ── 지도 ── */}
        <div className="map-wrap reveal" style={{ '--d': '180ms' }}>
          <MapContainer center={userLoc ?? [33.4996, 126.5312]} zoom={12} style={{ width: '100%', height: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {userLoc && <Marker position={userLoc}><Popup>내 위치</Popup></Marker>}
            {markers.map(m => (m.lat && m.lng) && (
              <Marker key={m.id} position={[m.lat, m.lng]}><Popup closeButton={false}><strong>{m.store_name}</strong></Popup></Marker>
            ))}
          </MapContainer>
        </div>

        {/* ── 피드 ── */}
        <div className="feed">
          <div className="feed-head">
            <h2>필터링 안심 식당</h2>
            <span>{restaurants.length}곳</span>
          </div>

          {loading ? (
            <>{[0, 1, 2].map(i => <SkeletonCard key={i} />)}</>
          ) : restaurants.length === 0 ? (
            debounced
              ? <EmptyState icon="🔍" title={`'${search}' 검색 결과가 없어요`} description="다른 키워드로 검색해 보세요." />
              : <EmptyState icon="🍽️" title="조건에 맞는 식당이 없어요" description="동네를 바꾸거나 건강 필터를 확인해 보세요."
                  actionLabel="전체 지역으로" onAction={() => { setDistrict('전체 지역'); setEmd('전체 동네'); setBizType('전체'); }} />
          ) : (
            restaurants.map((r, i) => {
              const dist = userLoc && r.lat && r.lng
                ? distanceKm(userLoc[0], userLoc[1], r.lat, r.lng).toFixed(1) + 'km' : r.si;
              return (
                <article key={r.id} className="card card-hover r-card reveal" style={{ '--d': `${Math.min(i, 8) * 45}ms` }}>
                  <div className="r-card-top">
                    <div className="r-card-emoji">🍲</div>
                    <div className="r-card-body">
                      <div className="r-card-name-row">
                        <h3>{r.store_name}</h3>
                        <span className="r-card-dist">🚶 {dist}</span>
                      </div>
                      <p className="r-card-addr">📍 {r.road_name || `${r.si} ${r.emd}`}</p>
                      <p className="r-card-menu">{r.main_menu}</p>
                    </div>
                  </div>
                  <div className="r-card-badges">
                    <div className="r-card-badges-left">
                      <SodiumBadge sodium={r.est_sodium_mg} isMeasurable={r.is_measurable} />
                      {(r.certs ?? '').split(',').map(c => c.trim()).filter(Boolean).map(c => <CertBadge key={c} cert={c} />)}
                    </div>
                    <span className="r-card-biz">{r.biz_type}</span>
                  </div>
                  <div className="r-card-actions">
                    <Button variant="ghost" className="r-card-btn" disabled={!isSafeUrl(r.naver_url)}
                      onClick={() => isSafeUrl(r.naver_url) && window.open(r.naver_url, '_blank', 'noopener,noreferrer')}>
                      📅 예약하기
                    </Button>
                    <Button className="r-card-btn" disabled={!r.lat || !r.lng}
                      onClick={() => r.lat && r.lng && window.open(`https://map.kakao.com/link/to/${r.store_name},${r.lat},${r.lng}`, '_blank', 'noopener,noreferrer')}>
                      🗺️ 길찾기
                    </Button>
                  </div>
                </article>
              );
            })
          )}

          {loadingMore && <SkeletonCard />}
          {hasMore && !loading && <div ref={sentinelRef} style={{ height: 10 }} />}
          {!hasMore && restaurants.length > 0 && <p className="feed-end">마지막 식당입니다 🍽️</p>}
        </div>

        <p className="disclaimer">
          ⚠️ 본 서비스는 공공데이터 기반 필터링 정보이며, 의학적 진단·처방을 대신할 수 없습니다. 취식 전 담당 의사와 상의하십시오.
        </p>
      </div>
    </MobileFrame>
  );
}