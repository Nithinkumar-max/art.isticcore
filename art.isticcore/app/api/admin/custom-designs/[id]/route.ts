import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { updateCustomDesignRequest, deleteCustomDesignRequest } from '@/lib/services/custom-designs'

const VALID_STATUSES = ['NEW', 'CONTACTED', 'QUOTED', 'IN_DISCUSSION', 'CONVERTED', 'COMPLETED', 'REJECTED']

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await isAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await request.json()

    const updates: { status?: string; admin_notes?: string; quoted_price?: number } = {}

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
      }
      updates.status = body.status
    }

    if (body.admin_notes !== undefined) {
      updates.admin_notes = body.admin_notes
    }

    if (body.quoted_price !== undefined) {
      updates.quoted_price = body.quoted_price
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const updated = await updateCustomDesignRequest(id, updates)
    return NextResponse.json({ success: true, request: updated })
  } catch (e) {
    console.error('PATCH /api/admin/custom-designs/[id] error:', e)
    return NextResponse.json({ error: 'Failed to update custom design request' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await isAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    await deleteCustomDesignRequest(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/admin/custom-designs/[id] error:', e)
    return NextResponse.json({ error: 'Failed to delete custom design request' }, { status: 500 })
  }
}
