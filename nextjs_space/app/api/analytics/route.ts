export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const snapshots = await prisma.analyticsSnapshot.findMany({ orderBy: { period: 'asc' } });

    // Ground truth evaluation
    const groundTruth = await prisma.sensorEvent.groupBy({
      by: ['groundTruthLabel'],
      where: { isGroundTruth: true },
      _count: { id: true },
    });

    const gtMap: Record<string, number> = {};
    for (const gt of groundTruth ?? []) {
      if (gt?.groundTruthLabel) {
        gtMap[gt.groundTruthLabel] = gt._count?.id ?? 0;
      }
    }

    const tp = gtMap['true_positive'] ?? 0;
    const fp = gtMap['false_positive'] ?? 0;
    const tn = gtMap['true_negative'] ?? 0;
    const fn = gtMap['false_negative'] ?? 0;
    const total = tp + fp + tn + fn;

    const evalPrecision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const evalRecall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const evalAccuracy = total > 0 ? (tp + tn) / total : 0;
    const evalF1 = (evalPrecision + evalRecall) > 0 ? 2 * (evalPrecision * evalRecall) / (evalPrecision + evalRecall) : 0;

    // Response rate stats
    const warnings = await prisma.warning.findMany({
      select: { activityStoppedAfter: true, responseTimeMs: true },
    });
    const responded = (warnings ?? []).filter((w: any) => w?.activityStoppedAfter === true);
    const avgResponseTime = responded.length > 0
      ? responded.reduce((sum: number, w: any) => sum + (w?.responseTimeMs ?? 0), 0) / responded.length
      : 0;

    // Repeated distractions by driver
    const repeatedByDriver = await prisma.driver.findMany({
      select: { name: true, totalWarnings: true, totalEvents: true, riskLevel: true },
      where: { totalWarnings: { gt: 2 } },
      orderBy: { totalWarnings: 'desc' },
    });

    return NextResponse.json({
      snapshots,
      groundTruthEval: {
        tp, fp, tn, fn, total,
        precision: parseFloat(evalPrecision.toFixed(4)),
        recall: parseFloat(evalRecall.toFixed(4)),
        accuracy: parseFloat(evalAccuracy.toFixed(4)),
        f1: parseFloat(evalF1.toFixed(4)),
      },
      responseStats: {
        total: warnings?.length ?? 0,
        responded: responded.length,
        rate: (warnings?.length ?? 0) > 0 ? parseFloat((responded.length / (warnings?.length ?? 1)).toFixed(4)) : 0,
        avgResponseTimeMs: Math.round(avgResponseTime),
      },
      repeatedDistractions: repeatedByDriver,
    });
  } catch (err: any) {
    console.error('Analytics API error:', err);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
