export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // KPIs
    const snapshots = await prisma.analyticsSnapshot.findMany({ orderBy: { period: 'asc' } });
    const latest = snapshots[snapshots.length - 1];
    const prev = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

    const totalWarnings = await prisma.warning.count();
    const totalEvents = await prisma.sensorEvent.count();
    const pendingReviews = await prisma.reviewAction.count({ where: { action: 'pending' } });
    const totalDrivers = await prisma.driver.count();

    const kpis = [
      {
        metric: 'precision',
        label: 'Precision',
        value: latest?.precision ?? 0,
        format: 'percent',
        delta: prev ? ((latest?.precision ?? 0) - prev.precision) : 0,
        delta_label: 'vs yesterday',
        good_when: 'up',
        spark: snapshots.slice(-14).map((s: any) => s.precision),
      },
      {
        metric: 'recall',
        label: 'Recall',
        value: latest?.recall ?? 0,
        format: 'percent',
        delta: prev ? ((latest?.recall ?? 0) - prev.recall) : 0,
        delta_label: 'vs yesterday',
        good_when: 'up',
        spark: snapshots.slice(-14).map((s: any) => s.recall),
      },
      {
        metric: 'false_warning',
        label: 'False Warning Rate',
        value: latest?.falseWarningRate ?? 0,
        format: 'percent',
        delta: prev ? ((latest?.falseWarningRate ?? 0) - prev.falseWarningRate) : 0,
        delta_label: 'vs yesterday',
        good_when: 'down',
        spark: snapshots.slice(-14).map((s: any) => s.falseWarningRate),
      },
      {
        metric: 'response_rate',
        label: 'Driver Response Rate',
        value: latest?.driverResponseRate ?? 0,
        format: 'percent',
        delta: prev ? ((latest?.driverResponseRate ?? 0) - prev.driverResponseRate) : 0,
        delta_label: 'vs yesterday',
        good_when: 'up',
        spark: snapshots.slice(-14).map((s: any) => s.driverResponseRate),
      },
      {
        metric: 'latency',
        label: 'Mean Latency',
        value: latest?.meanLatencyMs ?? 0,
        format: 'number',
        delta: prev ? ((latest?.meanLatencyMs ?? 0) - prev.meanLatencyMs) : 0,
        delta_label: 'vs yesterday',
        good_when: 'down',
        spark: snapshots.slice(-14).map((s: any) => s.meanLatencyMs),
      },
      {
        metric: 'escalations',
        label: 'Escalation Volume',
        value: latest?.escalationVolume ?? 0,
        format: 'integer',
        delta: prev ? ((latest?.escalationVolume ?? 0) - prev.escalationVolume) : 0,
        delta_label: 'vs yesterday',
        good_when: 'down',
        spark: snapshots.slice(-14).map((s: any) => s.escalationVolume),
      },
    ];

    // Trend data for the hero chart (precision + recall over time)
    const perfTrend = snapshots.map((s: any) => ({
      month: s.period,
      precision: parseFloat((s.precision * 100).toFixed(1)),
      recall: parseFloat((s.recall * 100).toFixed(1)),
      false_warning: parseFloat((s.falseWarningRate * 100).toFixed(1)),
    }));

    // Events by type
    const eventsByType = await prisma.sensorEvent.groupBy({
      by: ['eventType'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    const eventTypeData = eventsByType.map((e: any) => ({
      category: (e.eventType ?? '').replace(/_/g, ' '),
      value: e._count?.id ?? 0,
    }));

    // Warning outcomes
    const warningOutcomes = await prisma.warning.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    const warningOutcomeData = warningOutcomes.map((w: any) => ({
      category: w.status ?? 'unknown',
      value: w._count?.id ?? 0,
    }));

    // Driver risk levels
    const driverRisks = await prisma.driver.groupBy({
      by: ['riskLevel'],
      _count: { id: true },
    });
    const driverRiskData = driverRisks.map((d: any) => ({
      category: d.riskLevel ?? 'unknown',
      value: d._count?.id ?? 0,
    }));

    // Volume trend
    const volumeTrend = snapshots.map((s: any) => ({
      month: s.period,
      events: s.totalEvents,
      warnings: s.totalWarnings,
    }));

    // Latency trend
    const latencyTrend = snapshots.map((s: any) => ({
      month: s.period,
      latency: parseFloat(s.meanLatencyMs.toFixed(1)),
    }));

    // Driver table
    const drivers = await prisma.driver.findMany({
      select: {
        name: true,
        vehicleId: true,
        vehicleType: true,
        totalEvents: true,
        totalWarnings: true,
        riskLevel: true,
        status: true,
      },
      orderBy: { totalWarnings: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      data_as_of: new Date().toISOString(),
      data: {
        kpis,
        perf_trend: perfTrend,
        event_types: eventTypeData,
        warning_outcomes: warningOutcomeData,
        driver_risks: driverRiskData,
        volume_trend: volumeTrend,
        latency_trend: latencyTrend,
        drivers,
      },
    });
  } catch (err: any) {
    console.error('Dashboard API error:', err);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
