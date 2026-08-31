import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { getCustomDesignRequests } from '@/lib/services/custom-designs'

export async function GET() {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const requests = await getCustomDesignRequests()
    return NextResponse.json(requests)
  } catch (error: unknown) {
    console.error('API /api/admin/custom-designs error:', error)
    return NextResponse.json({ error: 'Failed to fetch custom design requests' }, { status: 500 })
  }
}
