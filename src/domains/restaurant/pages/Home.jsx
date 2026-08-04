// domains/restaurant/pages/Home.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
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
import { DISTRICTS, EMD_BY_DISTRICT } from '@/shared/constants/region';
import { BIZ_TYPE } from '@/shared/constants/tag';
import { DISEASE_CATEGORIES } from '@/domains/onboarding/constants';
import { RestaurantApi } from '../api/restaurant.api';
import { buildAvoidTags } from '../lib/avoidTags';
import { getCurrentPosition } from '@/core/utils/geo';
import { isSafeUrl } from '@/core/security/validators';
import { PAGE_SIZE } from '../constants';
import { useFilterStore } from '../stores/filterStore';
import './Home.css';
import DirectionsModal from '../components/DirectionsModal';
import { openExternalLink } from '@/core/utils/openLink';
import RestaurantDetailModal from '../components/RestaurantDetailModal';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { storeId } = useParams();
  const toast = useToast();

  // [Zustand] 필터 상태 — 컴포넌트 내부에서 호출
  const { search, district, emd, bizType, setSearch, setDistrict, setEmd, setBizType, reset } = useFilterStore();
  const debounced = useDebounce(search, 500);

  // [useState] 필터 외 UI 상태
  const [userLoc, setUserLoc] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef(null);
  const [directionsTarget, setDirectionsTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);

  const filters = useMemo(() => ({
    district: district !== '전체 지역' ? district : null,
    emd: district !== '전체 지역' && emd !== '전체 동네' ? emd : null,
    bizType: bizType !== '전체' ? bizType : null,
    avoidTags: buildAvoidTags(user?.healthProfile),
    keyword: debounced.trim() || null,
  }), [district, emd, bizType, debounced, user?.healthProfile]);

  /*
   * [TanStack Query] 식당 목록 — 무한 스크롤
   * - queryKey에 filters/userLoc 포함 → 필터 변경 시 자동 리페치
   * - getNextPageParam: userLoc 모드(근처)는 페이지네이션 없음
   * - 5분 캐시 (staleTime), 2회 재시도 (retry)
   */
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['restaurants', filters, userLoc],
    queryFn: ({ pageParam = 0 }) =>
      userLoc
        ? RestaurantApi.listNearby({ lat: userLoc[0], lng: userLoc[1], filters, page: pageParam })
        : RestaurantApi.listByFilter({ filters, page: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      if (userLoc) return undefined;
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
  });

  const restaurants = data?.pages.flat() ?? [];

  /*
   * [TanStack Query] 지도 마커 — 별도 쿼리
   * - filters만 의존 (userLoc 무관)
   * - 식당 목록과 독립적으로 캐싱
   */
  const { data: markers = [] } = useQuery({
    queryKey: ['markers', filters],
    queryFn: () => RestaurantApi.listMarkers({ filters }),
  });

  // 에러 토스트
  useEffect(() => {
    if (isError) toast.error(error?.message || '식당을 불러오지 못했습니다.');
  }, [isError, error, toast]);

  // 스크롤 감지 (헤더 그림자)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /*
 * [7-c-1b] URL → 상세 모달 동기화 (인바운드 딥링크)
 * - /r/:storeId 진입 시 해당 식당의 상세 모달 자동 open
 * - 목록에 있으면 재조회 없이 사용, 없으면(다른 지역/페이지) 단건 조회
 */
  useEffect(() => {
    if (!storeId) { setDetailTarget(null); return; }
    const found = restaurants.find(r => String(r.id) === String(storeId));
    if (found) { setDetailTarget(found); return; }
    RestaurantApi.getById(storeId)
      .then(r => r ? setDetailTarget(r) : toast.error('식당을 찾을 수 없습니다.'))
      .catch(() => toast.error('식당을 불러오지 못했습니다.'));
  }, [storeId, restaurants, toast]);

  /*
   * [TanStack Query] IntersectionObserver → fetchNextPage
   * - hasNextPage / isFetchingNextPage 자동 관리
   * - userLoc 모드에서는 무한 스크롤 비활성
   */
  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage || isFetchingNextPage || isLoading || userLoc) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) fetchNextPage(); },
      { rootMargin: '200px' }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage, userLoc]);

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

        {/* ── 오늘의 식단 가이드 ── */}
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
          <select value={district} onChange={e => setDistrict(e.target.value)} aria-label="지역">
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

          {isLoading ? (
            <>{[0, 1, 2].map(i => <SkeletonCard key={i} />)}</>
          ) : restaurants.length === 0 ? (
            debounced
              ? <EmptyState icon="🔍" title={`'${search}' 검색 결과가 없어요`} description="다른 키워드로 검색해 보세요." />
              : <EmptyState icon="🍽️" title="조건에 맞는 식당이 없어요" description="동네를 바꾸거나 건강 필터를 확인해 보세요."
                actionLabel="전체 지역으로" onAction={() => reset()} />
          ) : (
            restaurants.map((r, i) => {
              // ✅ DB의 distance_meters 활용 (PostGIS ST_Distance)
              const dist = r.distance_meters != null
                ? r.distance_meters < 1000
                  ? `${Math.round(r.distance_meters)}m`
                  : `${(r.distance_meters / 1000).toFixed(1)}km`
                : r.si;
              return (
                <article key={r.id} className="card card-hover r-card reveal" style={{ '--d': `${Math.min(i, 8) * 45}ms` }}>
                  {/* ① 뱃지 좌상 / 업종 우상 */}
                  <div className="r-card-badges r-card-badges-top">
                    <div className="r-card-badges-left">
                      <SodiumBadge sodium={r.est_sodium_mg} isMeasurable={r.is_measurable} />
                      {(r.certs ?? '').split(',').map(c => c.trim()).filter(Boolean).map(c => <CertBadge key={c} cert={c} />)}
                    </div>
                    <span className="r-card-biz">{r.biz_type}</span>
                  </div>

                  {/* ② 이름 + 거리 + 주소 축약 1줄 */}
                  <div className="r-card-top">
                    <div className="r-card-emoji">🍲</div>
                    <div className="r-card-body">
                      <div className="r-card-name-row">
                        <h3>{r.store_name}</h3>
                        <span className="r-card-dist">🚶 {dist}</span>
                      </div>
                      <p className="r-card-addr">📍 {r.emd ? `${r.si ?? ''} ${r.emd}`.trim() : (r.road_name || r.si)}</p>
                      <p className="r-card-menu">{r.main_menu}</p>
                    </div>
                  </div>

                  {/* ③ 가게 상세보기 — full-width, 예약/길찾기 위 */}
                  <Button variant="ghost" block className="r-card-detail" onClick={() => navigate(`/r/${r.id}`)}>
                    가게 상세보기
                  </Button>

                  {/* ④ 예약 / 길찾기 2열 */}
                  <div className="r-card-actions">
                    <Button variant="ghost" className="r-card-btn" disabled={!isSafeUrl(r.naver_url)}
                      onClick={() => isSafeUrl(r.naver_url) && openExternalLink(r.naver_url)}>
                      📅 예약하기
                    </Button>
                    <Button className="r-card-btn" disabled={!r.lat || !r.lng}
                      onClick={() => r.lat && r.lng && setDirectionsTarget(r)}>
                      🗺️ 길찾기
                    </Button>
                  </div>
                </article>
              );
            })
          )}

          {isFetchingNextPage && <SkeletonCard />}
          {hasNextPage && !isLoading && <div ref={sentinelRef} style={{ height: 10 }} />}
          {!hasNextPage && restaurants.length > 0 && <p className="feed-end">마지막 식당입니다 🍽️</p>}
        </div>

        <p className="disclaimer">
          ⚠️ 본 서비스는 공공데이터 기반 필터링 정보이며, 의학적 진단·처방을 대신할 수 없습니다. 취식 전 담당 의사와 상의하십시오.
        </p>
      </div>

      {directionsTarget && (
        <DirectionsModal
          restaurant={directionsTarget}
          userLoc={userLoc}
          onClose={() => setDirectionsTarget(null)}
        />
      )}

      {detailTarget && (
        <RestaurantDetailModal
          restaurant={detailTarget}
          onClose={() => navigate('/')}
          onDirections={(r) => { navigate('/'); setDirectionsTarget(r); }}
        />
      )}
    </MobileFrame>
  );
}