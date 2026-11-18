'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity, Pause, Play, Smartphone, Eye, Car, AlertTriangle,
  Gauge, ArrowRight, Users, MapPin, Clock, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface StreamEvent {
  id: string;
  timestamp: string;
  driver: string;
  scenario: string;
  sensor: { eventType: string; confidence: number; duration: number };
  telematics: { speed: number | null; laneDrift: number | null; isMoving: boolean; passengerPresent: boolean };
  risk: { score: number; confidence: number; exceededThreshold: boolean; factors: any[]; missingData: string[] };
  warning: { category: string; text: string; severity: number } | null;
}

const EVENT_ICONS: Record<string, any> = {
  phone_handling: Smartphone,
  screen_on: Smartphone,
  texting: Smartphone,
  gaze_off_road: Eye,
  hands_off_wheel: Car,
};

function getRiskColor(score: number) {
  if (score >= 70) return 'text-red-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-green-500';
}

function getRiskBg(score: number) {
  if (score >= 70) return 'bg-red-500/10 border-red-500/30';
  if (score >= 40) return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-green-500/10 border-green-500/30';
}

export default function MonitorPage() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<StreamEvent | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const startStream = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    fetch('/api/monitor/stream', { signal: controller.signal })
      .then((res) => {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function read(): Promise<void> {
          if (!reader) return Promise.resolve();
          return reader.read().then(({ done, value }) => {
            if (done) { setIsStreaming(false); return; }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const event = JSON.parse(line.slice(6));
                  setEvents((prev) => [event, ...(prev ?? []).slice(0, 99)]);
                } catch {}
              }
            }
            return read();
          });
        }
        return read();
      })
      .catch(() => setIsStreaming(false));
  }, []);

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const highRiskCount = (events ?? []).filter((e: StreamEvent) => (e?.risk?.score ?? 0) >= 70).length;
  const warningCount = (events ?? []).filter((e: StreamEvent) => e?.warning != null).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Live Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time view of simulated in-cabin sensor and vehicle telematics streams
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono text-xs">
            {(events ?? []).length} events
          </Badge>
          {isStreaming ? (
            <Button onClick={stopStream} variant="destructive" size="sm">
              <Pause className="h-4 w-4 mr-1" /> Pause
            </Button>
          ) : (
            <Button onClick={startStream} size="sm">
              <Play className="h-4 w-4 mr-1" /> Start
            </Button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{(events ?? []).length}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{highRiskCount}</p>
              <p className="text-xs text-muted-foreground">High Risk</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{warningCount}</p>
              <p className="text-xs text-muted-foreground">Warnings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Gauge className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">
                {isStreaming ? 'LIVE' : 'PAUSED'}
              </p>
              <p className="text-xs text-muted-foreground">Stream Status</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Event feed */}
        <div className="col-span-7">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Event Feed
                {isStreaming && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]" ref={scrollRef}>
                {(events ?? []).length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>Press <strong>Start</strong> to begin the live stream</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(events ?? []).map((event: StreamEvent) => {
                      const Icon = EVENT_ICONS[event?.sensor?.eventType] ?? Activity;
                      return (
                        <button
                          key={event?.id}
                          onClick={() => setSelectedEvent(event)}
                          className={cn(
                            'w-full text-left p-3 rounded-lg border transition-colors',
                            selectedEvent?.id === event?.id ? 'ring-2 ring-primary' : '',
                            getRiskBg(event?.risk?.score ?? 0)
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span className="font-medium text-sm">{event?.driver ?? 'Unknown'}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {(event?.sensor?.eventType ?? '').replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn('font-mono text-sm font-bold', getRiskColor(event?.risk?.score ?? 0))}>
                                {event?.risk?.score ?? 0}
                              </span>
                              {event?.warning && (
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Gauge className="h-3 w-3" />
                              {event?.telematics?.speed != null ? `${event.telematics.speed} mph` : 'N/A'}
                            </span>
                            <span className="flex items-center gap-1">
                              {event?.telematics?.isMoving ? <Car className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                              {event?.telematics?.isMoving ? 'Moving' : 'Stopped'}
                            </span>
                            {event?.telematics?.passengerPresent && (
                              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Passenger</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {event?.sensor?.duration?.toFixed?.(1) ?? '0'}s
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Event detail panel */}
        <div className="col-span-5">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Event Detail</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEvent ? (
                <div className="space-y-4">
                  {/* Risk score */}
                  <div className="text-center">
                    <p className={cn('text-5xl font-mono font-bold', getRiskColor(selectedEvent?.risk?.score ?? 0))}>
                      {selectedEvent?.risk?.score ?? 0}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Risk Score</p>
                    <p className="text-xs text-muted-foreground">
                      Confidence: {((selectedEvent?.risk?.confidence ?? 0) * 100).toFixed(0)}%
                    </p>
                  </div>

                  {/* Sensor data */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Sensor Data</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Event Type</span>
                        <span className="font-mono">{(selectedEvent?.sensor?.eventType ?? '').replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Confidence</span>
                        <span className="font-mono">{((selectedEvent?.sensor?.confidence ?? 0) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration</span>
                        <span className="font-mono">{selectedEvent?.sensor?.duration?.toFixed?.(1) ?? '0'}s</span>
                      </div>
                    </div>
                  </div>

                  {/* Telematics data */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Telematics</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Speed</span>
                        <span className="font-mono">{selectedEvent?.telematics?.speed != null ? `${selectedEvent.telematics.speed} mph` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Lane Drift</span>
                        <span className="font-mono">{selectedEvent?.telematics?.laneDrift != null ? `${selectedEvent.telematics.laneDrift}m` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Moving</span>
                        <span className="font-mono">{selectedEvent?.telematics?.isMoving ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Passenger</span>
                        <span className="font-mono">{selectedEvent?.telematics?.passengerPresent ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Risk factors */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Risk Factors</h4>
                    <div className="space-y-1">
                      {(selectedEvent?.risk?.factors ?? []).map((f: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="truncate mr-2">{f?.description ?? ''}</span>
                          <span className={cn('font-mono', (f?.contribution ?? 0) > 0 ? 'text-red-500' : 'text-green-500')}>
                            {(f?.contribution ?? 0) > 0 ? '+' : ''}{f?.contribution ?? 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Missing data */}
                  {(selectedEvent?.risk?.missingData ?? []).length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Missing Data</h4>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        {(selectedEvent?.risk?.missingData ?? []).join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Warning */}
                  {selectedEvent?.warning && (
                    <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                      <h4 className="text-xs font-semibold text-primary mb-1">Warning Issued</h4>
                      <p className="text-sm italic">"{selectedEvent.warning.text}"</p>
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {selectedEvent.warning.category?.replace?.(/_/g, ' ')}
                      </Badge>
                    </div>
                  )}

                  {/* Scenario */}
                  <div className="text-center">
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      Scenario: {selectedEvent?.scenario?.replace?.(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  <ArrowRight className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Select an event to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
