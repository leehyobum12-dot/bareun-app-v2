import { supabase } from '@/core/lib/supabase'

export const AuthApi = {
  async signInWithOAuth(provider) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
        queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
      },
    })
    if (error) throw error
  },
}