'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  BarChart3, Target, Crosshair, AlertTriangle, Activity,
  Clock, Users, TrendingUp, Loader2, Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const AnalyticsCharts = dynamic(() => import('./analytics-charts'), { ssr: false });

interface AnalyticsData {
  snapshots: any[];
  groundTruthEval: {
    tp: number; fp: number; tn: number; fn: number; total: number;
    precision: number; recall: number; accuracy: number; f1: number;
  };
  responseStats: {
    total: number; responded: number; rate: number; avgResponseTimeMs: number;
  };
  repeatedDistractions: { name: string; totalWarnings: number; totalEvents: number; riskLevel: string }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d: any) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-destructive">Failed to load analytics data.</p>;
  }

  const gt = data?.groundTruthEval;
  const rs = data?.responseStats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Analytics & Performance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Synthetic evaluation results and performance metrics for the distracted-driving detection system
        </p>
        <Badge variant="outline" className="mt-2 text-amber-600 border-amber-500/30 bg-amber-500/10 text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          All metrics are computed from synthetic labeled data
        </Badge>
      </div>

      {/* Ground truth eval KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase">Precision</span>
            </div>
            <p className="text-3xl font-mono font-bold">{((gt?.precision ?? 0) * 100).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">TP / (TP + FP)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Crosshair className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase">Recall</span>
            </div>
            <p className="text-3xl font-mono font-bold">{((gt?.recall ?? 0) * 100).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">TP / (TP + FN)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase">F1 Score</span>
            </div>
            <p className="text-3xl font-mono font-bold">{((gt?.f1 ?? 0) * 100).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">Harmonic mean</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase">Response Rate</span>
            </div>
            <p className="text-3xl font-mono font-bold">{((rs?.rate ?? 0) * 100).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">Drivers who stopped</p>
          </CardContent>
        </Card>
      </div>

      {/* Confusion matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ground Truth Confusion Matrix</CardTitle>
          <CardDescription>Synthetic labeled evaluation over {gt?.total ?? 0} events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-mono font-bold text-green-600">{gt?.tp ?? 0}</p>
              <p className="text-xs text-green-600">True Positives</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-mono font-bold text-red-500">{gt?.fp ?? 0}</p>
              <p className="text-xs text-red-500">False Positives</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-mono font-bold text-red-500">{gt?.fn ?? 0}</p>
              <p className="text-xs text-red-500">False Negatives</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-mono font-bold text-green-600">{gt?.tn ?? 0}</p>
              <p className="text-xs text-green-600">True Negatives</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <AnalyticsCharts snapshots={data?.snapshots ?? []} />

      {/* Response stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-mono font-bold">{((rs?.avgResponseTimeMs ?? 0) / 1000).toFixed(1)}s</p>
            <p className="text-xs text-muted-foreground">Avg response time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-mono font-bold">{rs?.responded ?? 0}/{rs?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">Warnings acknowledged</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-mono font-bold">{(data?.repeatedDistractions ?? []).length}</p>
            <p className="text-xs text-muted-foreground">Repeat offenders (&gt;2 warnings)</p>
          </CardContent>
        </Card>
      </div>

      {/* Repeated distractions table */}
      {(data?.repeatedDistractions ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Repeated Distraction Events</CardTitle>
            <CardDescription>Drivers with more than 2 warnings (synthetic data)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {(data?.repeatedDistractions ?? []).map((d: any) => (
                <div key={d?.name} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm">{d?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{d?.totalEvents ?? 0} events</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs">{d?.totalWarnings ?? 0} warnings</Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        d?.riskLevel === 'high' ? 'text-red-500 border-red-500/30' :
                        d?.riskLevel === 'medium' ? 'text-amber-500 border-amber-500/30' :
                        'text-green-500 border-green-500/30'
                      )}
                    >
                      {d?.riskLevel ?? 'unknown'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
