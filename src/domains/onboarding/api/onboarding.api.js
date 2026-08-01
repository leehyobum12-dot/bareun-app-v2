// src/domains/onboarding/api/onboarding.api.js

import { from, run } from '@/core/lib/api'

export const OnboardingApi = {
  /**
   * 약관 동의 저장
   *
   * [C-2 수정 사항]
   * - upsert → update 변경 (handle_new_user 트리거가 이미 INSERT 수행)
   * - user_type 제거 (기존 역할 유지, owner 강등 방지)
   * - email/nickname/provider 제거 (트리거가 이미 설정)
   * - profile 파라미터 제거 (불필요한 의존성)
   */
  async saveTermsAgreement(userId) {
    const { data, error } = await run(
      from('profiles')
        .update({
          terms_agreed: true,
          location_agreed: true,
          privacy_agreed: true,
          disclaimer_agreed: true,
          agreed_version: 'v1.0',
          agreed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('id')
        .maybeSingle(),
      '약관 동의 저장에 실패했습니다.'
    )

    // .maybeSingle() → 결과 없으면 { data: null, error: null }
    // 트리거가 프로필을 생성하지 못한 예외 상황 방어
    if (!data && !error) {
      throw new Error('프로필이 존재하지 않습니다. 다시 로그인해 주세요.')
    }
  },

  /**
   * 건강 정보 저장 + 온보딩 완료
   *
   * [기존 로직 유지]
   * - user_type을 건드리지 않으므로 C-2 영향 없음
   * - updated_at 추가 (원본에 누락)
   */
  async saveHealthProfile(userId, { diseases, stages }) {
    const hasHealthData =
      (Array.isArray(diseases) && diseases.length > 0) ||
      Object.keys(stages || {}).length > 0

    if (!hasHealthData) {
      return run(
        from('profiles')
          .update({
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId),
        '온보딩 완료 처리에 실패했습니다.'
      )
    }

    const payload = { id: userId, diseases, stages, health_data_agreed: true }

    await run(
      from('user_health').upsert([payload], { onConflict: 'id' }),
      '건강 정보 저장에 실패했습니다.'
    )

    await run(
      from('profiles')
        .update({
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId),
      '온보딩 완료 처리에 실패했습니다.'
    )
  },
}