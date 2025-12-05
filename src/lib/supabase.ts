import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
	if (_supabase) return _supabase

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

	if (!url || !anonKey) {
		// Not configured — return null and allow callers to handle fallback.
		// Avoid throwing here so the app can start even without env vars.
		// Console.warn for developer visibility.
		// eslint-disable-next-line no-console
		console.warn('Supabase not configured: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing')
		return null
	}

	_supabase = createClient(url, anonKey)
	return _supabase
}

export default getSupabase
