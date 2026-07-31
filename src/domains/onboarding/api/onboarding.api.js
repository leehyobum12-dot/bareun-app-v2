import { from, run } from '@/core/lib/api'

export const OnboardingApi = {
  async saveTermsAgreement(userId, profile) {
    return run(
      from('profiles').upsert({
        id: userId, email: profile?.email ?? '', nickname: profile?.name ?? '',
        provider: profile?.provider ?? '', user_type: 'member',
        terms_agreed: true, location_agreed: true, privacy_agreed: true, disclaimer_agreed: true,
        agreed_version: 'v1.0', agreed_at: new Date().toISOString(),
      }, { onConflict: 'id' }),
      '약관 동의 저장에 실패했습니다.'
    )
  },
  async saveHealthProfile(userId, { diseases, stages }) {
    const hasHealthData = Array.isArray(diseases) && diseases.length > 0 || Object.keys(stages || {}).length > 0
    if (!hasHealthData) {
      return run(
        from('profiles').update({ onboarding_completed: true }).eq('id', userId),
        '온보딩 완료 처리에 실패했습니다.'
      )
    }

    const payload = { id: userId, diseases, stages, health_data_agreed: true }
    await run(
      from('user_health').upsert([payload], { onConflict: 'id' }),
      '건강 정보 저장에 실패했습니다.'
    )
    await run(
      from('profiles').update({ onboarding_completed: true }).eq('id', userId),
      '온보딩 완료 처리에 실패했습니다.'
    )
  },
}