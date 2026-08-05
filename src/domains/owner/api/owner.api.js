// src/domains/owner/api/owner.api.js

import { from, rpc, run } from '@/core/lib/api'
import { supabase } from '@/core/lib/supabase'
import { CERT_NAME_TO_KEY } from '@/shared/constants/cert'

const generateUuid = () => {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) => (
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> (c / 4)).toString(16)
  ));
};

export const OwnerApi = {
  async getMyStore(ownerId) {
    const { data } = await run(
      from('restaurants').select('*')
        .eq('owner_id', ownerId)
        .eq('is_closed', false)
        .order('id', { ascending: false }).limit(1),
      '내 매장 정보를 불러오지 못했습니다.'
    )
    return data?.[0] ?? null
  },

  async getVerificationStatus(restaurantId) {
    const { data } = await run(
      from('owner_verifications').select('status').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(1),
      '인증 상태를 불러오지 못했습니다.'
    )
    return data?.[0]?.status ?? 'approved'
  },

  async searchPublicStores(keyword) {
    const { data } = await run(
      from('restaurants').select('*')
        .ilike('store_name', `%${keyword}%`).is('owner_id', null).eq('is_closed', false).eq('is_verified', true).limit(20),
      '가게 검색에 실패했습니다.'
    )
    return data ?? []
  },

  async claimStore(restaurantId) {
    return rpc('claim_restaurant', { p_restaurant_id: restaurantId }, '가게 연동에 실패했습니다.')
  },

  /**
   * [v3.2 수정] 가게 등록 신청
   * 
   * 변경 사항:
   * 1. cert_urls → cert_paths 컬럼명 변경
   * 2. 한글 배지 이름 → 영문 DB 키 자동 변환
   */
  async submitRegistration({ userId, storePayload, bizRegFile, certFiles, initialStoreId }) {
    const uploaded = []
    try {
      const { biz_reg_number, ...restaurantPayload } = storePayload

      if (initialStoreId) {
        await rpc('claim_restaurant', { p_restaurant_id: initialStoreId }, '가게 연동에 실패했습니다.')
      }

      // 1) 사업자등록증 업로드
      const bizExt = bizRegFile.name.split('.').pop()
      const bizPath = `${userId}/biz/${generateUuid()}.${bizExt}`
      const { error: bizErr } = await supabase.storage.from('business_docs').upload(bizPath, bizRegFile)
      if (bizErr) throw new Error(`사업자등록증 업로드 실패: ${bizErr.message}`)
      uploaded.push(bizPath)

      // 2) 배지 인증서 업로드 (한글 이름 → 영문 키 변환)
      const certPaths = {
        food_safety: null,
        model_restaurant: null,
        low_sodium: null,
        safe_restaurant: null,
      }

      if (certFiles && typeof certFiles === 'object') {
        for (const [certName, file] of Object.entries(certFiles)) {
          // 한글 이름을 영문 DB 키로 변환
          const dbKey = CERT_NAME_TO_KEY[certName]
          
          if (!dbKey) {
            console.warn(`[OwnerApi] 알 수 없는 인증 이름 무시: ${certName}`)
            continue
          }

          if (!file) continue

          const ext = file.name.split('.').pop()
          const path = `${userId}/certs/${generateUuid()}.${ext}`
          const { error: certErr } = await supabase.storage.from('business_docs').upload(path, file)
          if (certErr) throw new Error(`${certName} 증명서 업로드 실패: ${certErr.message}`)
          
          certPaths[dbKey] = path
          uploaded.push(path)
        }
      }

      // 3) 식당 데이터 저장
      let storeId = initialStoreId
      if (initialStoreId) {
        await run(
          from('restaurants').update(restaurantPayload).eq('id', initialStoreId),
          '가게 정보 수정에 실패했습니다.'
        )
      } else {
        const { data, error } = await from('restaurants').insert([restaurantPayload]).select().single()
        if (error) throw new Error(`가게 정보 저장 실패: ${error.message}`)
        storeId = data.id
      }

      // 4) [v3.2 CTO 권장] upsert를 사용한 심사 레코드 저장 (동시성 및 UNIQUE 충돌 방지)
      // 기존 pending 레코드가 있으면 업데이트, 없으면 생성
      const { error: verErr } = await from('owner_verifications').upsert(
        {
          restaurant_id: storeId,
          owner_id: userId,
          biz_reg_number,
          biz_reg_url: bizPath,
          cert_paths: certPaths,
          status: 'pending',
          updated_at: new Date().toISOString(),
        },
        { 
          onConflict: 'restaurant_id,owner_id', // UNIQUE 제약 조건 기준
          ignoreDuplicates: false // 기존 데이터 덮어쓰기
        }
      )

      if (verErr) {
        console.error('[OwnerApi] 심사 레코드 저장 실패:', verErr)
        throw new Error(`심사 접수에 실패했습니다: ${verErr.message}`)
      }

      return storeId
    } catch (e) {
      if (uploaded.length) {
        const { error: removeErr } = await supabase.storage.from('business_docs').remove(uploaded)
        if (removeErr) console.error('[OwnerApi] Storage 파일 정리 실패:', removeErr)
      }
      throw e
    }
  },

  async updateMenu(storeId, payload) {
    return run(from('restaurants').update(payload).eq('id', storeId), '메뉴 저장에 실패했습니다.')
  },

  async updateStoreInfo(storeId, payload) {
    return run(from('restaurants').update(payload).eq('id', storeId), '가게 정보 수정에 실패했습니다.')
  },

  async disconnectStore(storeId, action) {
    return rpc('disconnect_store', { p_store_id: storeId, p_action: action }, '처리 중 오류가 발생했습니다.')
  },

  async cancelClaim(restaurantId) {
  // 1) 삭제 대상 파일 경로 수집 (RPC가 행을 지우기 전에)
  const { data: ver } = await supabase
    .from('owner_verifications')
    .select('biz_reg_url, cert_paths')
    .eq('restaurant_id', restaurantId)
    .maybeSingle()

  const result = await rpc('cancel_claim', { p_restaurant_id: restaurantId }, '연동 취소에 실패했습니다.')

  // 2) Storage 정리 (best-effort)
  if (ver) {
    const paths = [ver.biz_reg_url, ...Object.values(ver.cert_paths || {})]
      .filter((p) => typeof p === 'string' && p)
    if (paths.length) {
      const { error } = await supabase.storage.from('business_docs').remove(paths)
      if (error) console.warn('[OwnerApi] Storage 정리 실패:', error)
    }
  }
  return result
},
}