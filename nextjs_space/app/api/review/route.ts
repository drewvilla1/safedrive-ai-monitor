export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const reviews = await prisma.reviewAction.findMany({
      include: {
        driver: { select: { name: true, vehicleId: true, riskLevel: true } },
        warning: {
          select: { warningText: true, severity: true, status: true, createdAt: true,
            riskScore: { select: { score: true, confidence: true, factors: true, missingData: true } }
          },
        },
        reviewer: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ reviews });
  } catch (err: any) {
    console.error('Review API error:', err);
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, action, notes } = body ?? {};
    if (!id || !action) return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });

    const updated = await prisma.reviewAction.update({
      where: { id },
      data: {
        action,
        notes: notes ?? undefined,
        reviewerId: session.user.id,
      },
    });

    return NextResponse.json({ review: updated });
  } catch (err: any) {
    console.error('Review update error:', err);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}
