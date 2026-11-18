'use client';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface Props {
  snapshots: any[];
}

export default function AnalyticsCharts({ snapshots }: Props) {
  const precisionRecallData = (snapshots ?? []).map((s: any) => ({
    date: (s?.period ?? '').slice(5),
    Precision: parseFloat(((s?.precision ?? 0) * 100).toFixed(1)),
    Recall: parseFloat(((s?.recall ?? 0) * 100).toFixed(1)),
    'False Warning': parseFloat(((s?.falseWarningRate ?? 0) * 100).toFixed(1)),
  }));

  const latencyData = (snapshots ?? []).map((s: any) => ({
    date: (s?.period ?? '').slice(5),
    Latency: parseFloat((s?.meanLatencyMs ?? 0).toFixed(1)),
  }));

  const volumeData = (snapshots ?? []).map((s: any) => ({
    date: (s?.period ?? '').slice(5),
    Events: s?.totalEvents ?? 0,
    Warnings: s?.totalWarnings ?? 0,
  }));

  const responseData = (snapshots ?? []).map((s: any) => ({
    date: (s?.period ?? '').slice(5),
    'Response Rate': parseFloat(((s?.driverResponseRate ?? 0) * 100).toFixed(1)),
  }));

  return (
    <div className="grid grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Precision & Recall Trend</CardTitle>
          <CardDescription className="text-xs">30-day daily values (%)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={precisionRecallData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tickLine={false} tick={{ fontSize: 10 }} domain={[50, 100]} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Precision" stroke="#60B5FF" fill="#60B5FF" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="Recall" stroke="#80D8C3" fill="#80D8C3" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="False Warning" stroke="#FF6363" fill="#FF6363" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Mean Processing Latency</CardTitle>
          <CardDescription className="text-xs">Milliseconds, daily</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Latency" stroke="#FF9149" fill="#FF9149" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Event & Warning Volume</CardTitle>
          <CardDescription className="text-xs">Daily totals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="Events" fill="#A19AD3" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Warnings" fill="#FF90BB" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Driver Response Rate</CardTitle>
          <CardDescription className="text-xs">% of drivers who stopped after warning</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={responseData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tickLine={false} tick={{ fontSize: 10 }} domain={[40, 100]} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Response Rate" stroke="#72BF78" fill="#72BF78" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
