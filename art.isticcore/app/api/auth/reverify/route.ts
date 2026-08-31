import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { password } = await request.json()
    if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 })

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    })

    if (error) return NextResponse.json({ error: 'Invalid password' }, { status: 401 })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Reverify error:', e)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
