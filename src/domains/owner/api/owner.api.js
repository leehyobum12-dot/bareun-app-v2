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
    const { data } = await from('restaurants').select('*').eq('owner_id', ownerId).order('id', { ascending: false }).limit(1)
    return data?.[0] ?? null
  },
  async getVerificationStatus(restaurantId) {
    const { data } = await from('owner_verifications').select('status').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(1)
    return data?.[0]?.status ?? 'approved'
  },
  async searchPublicStores(keyword) {
    const { data, error } = await from('restaurants').select('*')
      .ilike('store_name', `%${keyword}%`).is('owner_id', null).eq('is_closed', false).eq('is_verified', true).limit(20)
    if (error) throw error
    return data ?? []
  },
  async claimStore(restaurantId) {
    return rpc('claim_restaurant', { p_restaurant_id: restaurantId }, '가게 연동에 실패했습니다.')
  },
  async submitRegistration({ userId, storePayload, bizRegFile, certFiles, initialStoreId }) {
    const uploaded = []
    try {
      const bizExt = bizRegFile.name.split('.').pop()
      const bizPath = `${userId}/biz/${generateUuid()}.${bizExt}`
      const { error: bizErr } = await supabase.storage.from('business_docs').upload(bizPath, bizRegFile)
      if (bizErr) throw new Error(`사업자등록증 업로드 실패: ${bizErr.message}`)
      uploaded.push(bizPath)

      const certUrls = {}
      for (const [cert, file] of Object.entries(certFiles)) {
        const ext = file.name.split('.').pop()
        const path = `${userId}/certs/${generateUuid()}.${ext}`
        const { error: certErr } = await supabase.storage.from('business_docs').upload(path, file)
        if (certErr) throw new Error(`${cert} 증명서 업로드 실패: ${certErr.message}`)
        certUrls[cert] = path; uploaded.push(path)
      }

      let storeId = initialStoreId
      if (initialStoreId) {
        const { error } = await from('restaurants').update(storePayload).eq('id', initialStoreId)
        if (error) throw new Error(`가게 정보 수정 실패: ${error.message}`)
      } else {
        const { data, error } = await from('restaurants').insert([storePayload]).select().single()
        if (error) throw new Error(`가게 정보 저장 실패: ${error.message}`)
        storeId = data.id
      }

      const { error: vErr } = await from('owner_verifications').insert({
        restaurant_id: storeId, owner_id: userId,
        biz_reg_number: storePayload.biz_reg_number,
        biz_reg_url: bizPath, cert_urls: certUrls, status: 'pending',
      })
      if (vErr) throw new Error(`심사 접수 실패: ${vErr.message}`)
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
}