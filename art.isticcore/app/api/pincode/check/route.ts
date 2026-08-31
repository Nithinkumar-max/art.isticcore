import { NextRequest, NextResponse } from 'next/server'
import { checkPincodeServiceability } from '@/lib/services/pincodes'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pincode = searchParams.get('pincode')

    if (!pincode) {
      return NextResponse.json({ error: 'Pincode is required' }, { status: 400 })
    }

    const result = await checkPincodeServiceability(pincode)
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('API /api/pincode/check error:', error)
    return NextResponse.json({ error: 'Failed to verify pincode' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pincode } = body

    if (!pincode) {
      return NextResponse.json({ error: 'Pincode is required' }, { status: 400 })
    }

    const result = await checkPincodeServiceability(pincode)
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('API /api/pincode/check POST error:', error)
    return NextResponse.json({ error: 'Failed to verify pincode' }, { status: 500 })
  }
}
