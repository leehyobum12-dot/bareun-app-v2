import { from, rpc, run } from '@/core/lib/api'
import { supabase } from '@/core/lib/supabase'

export const AccountApi = {
  async withdraw(user) {
    if (user.userType === 'owner') {
      const { data: verifications } = await run(
        from('owner_verifications').select('biz_reg_url, cert_urls').eq('owner_id', user.id),
        '소유자 인증 정보를 불러오지 못했습니다.'
      )
      const files = []
      ;(verifications ?? []).forEach((v) => {
        if (v.biz_reg_url) files.push(v.biz_reg_url)
        if (v.cert_urls) Object.values(v.cert_urls).forEach((u) => files.push(u))
      })
      if (files.length) {
        const { error } = await supabase.storage.from('business_docs').remove(files)
        if (error) throw error
      }
    }
    await rpc('delete_user_account', {}, '탈퇴 처리 중 문제가 발생했습니다.')
  },
  async upgradeToOwner(userId) {
    await run(
      from('profiles').update({ user_type: 'owner', onboarding_completed: true }).eq('id', userId),
      '회원 등급 변경에 실패했습니다.'
    )
  },
}