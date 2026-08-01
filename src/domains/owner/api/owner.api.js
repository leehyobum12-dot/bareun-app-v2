import { from, rpc, run } from '@/core/lib/api'
import { supabase } from '@/core/lib/supabase'

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
        .eq('is_closed', false)          // ★ 폐업 가게 제외
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
  async submitRegistration({ userId, storePayload, bizRegFile, certFiles, initialStoreId }) {
    const uploaded = []
    try {
      /*
       * [수정] restaurants 테이블에 없는 필드 분리
       * biz_reg_number는 owner_verifications 전용이므로
       * restaurants 저장 시 제외해야 400 에러 방지
       */
      const { biz_reg_number, ...restaurantPayload } = storePayload

      /*
     * [지연 claim] claim 모드면 소유권 선점 (멱등 RPC)
     * - StoreSearch는 더 이상 claim을 호출하지 않음 → 여기서 확정
     * - 재제출(initialStoreId 있고 이미 owner)이어도 멱등이라 no-op
     * - 이 호출 직후 F5/뒤로가기를 맞아도 owner_id + pending이 일관되게 존재
     *   → 라운지가 'pending'으로 열려 "계속 작성/연동 취소"로 탈출 가능 (데드락 없음)
     */
      if (initialStoreId) {
        await rpc('claim_restaurant', { p_restaurant_id: initialStoreId }, '가게 연동에 실패했습니다.')
      }

      // 1) 사업자등록증 업로드
      const bizExt = bizRegFile.name.split('.').pop()
      const bizPath = `${userId}/biz/${generateUuid()}.${bizExt}`
      const { error: bizErr } = await supabase.storage.from('business_docs').upload(bizPath, bizRegFile)
      if (bizErr) throw new Error(`사업자등록증 업로드 실패: ${bizErr.message}`)
      uploaded.push(bizPath)

      // 2) 인증서 업로드
      const certUrls = {}
      for (const [cert, file] of Object.entries(certFiles)) {
        const ext = file.name.split('.').pop()
        const path = `${userId}/certs/${generateUuid()}.${ext}`
        const { error: certErr } = await supabase.storage.from('business_docs').upload(path, file)
        if (certErr) throw new Error(`${cert} 증명서 업로드 실패: ${certErr.message}`)
        certUrls[cert] = path
        uploaded.push(path)
      }

      // 3) 식당 데이터 저장 ← restaurantPayload 사용 (biz_reg_number 제외)
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

      // 4) 심사 레코드: 기존 pending UPDATE, 없으면 INSERT ← biz_reg_number 사용
      const { data: existing } = await run(
        from('owner_verifications')
          .select('id')
          .eq('restaurant_id', storeId)
          .eq('owner_id', userId)
          .eq('status', 'pending')
          .limit(1),
        '심사 상태를 확인하지 못했습니다.'
      )

      if (existing && existing.length > 0) {
        await run(
          from('owner_verifications')
            .update({
              biz_reg_number,                    // ← 분리된 필드 사용
              biz_reg_url: bizPath,
              cert_urls: certUrls,
              status: 'pending',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing[0].id),
          '심사 접수에 실패했습니다.'
        )
      } else {
        await run(
          from('owner_verifications')
            .insert({
              restaurant_id: storeId,
              owner_id: userId,
              biz_reg_number,                    // ← 분리된 필드 사용
              biz_reg_url: bizPath,
              cert_urls: certUrls,
              status: 'pending',
            }),
          '심사 접수에 실패했습니다.'
        )
      }

      return storeId
    } catch (e) {
      if (uploaded.length) await supabase.storage.from('business_docs').remove(uploaded)
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
    return rpc(
      'cancel_claim',
      { p_restaurant_id: restaurantId },
      '연동 취소에 실패했습니다.'
    )
  },
}