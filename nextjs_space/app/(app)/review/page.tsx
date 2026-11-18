'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle, CheckCircle, XCircle, ArrowUpCircle, Edit3,
  Loader2, User, Car, Shield, Clock, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ReviewItem {
  id: string;
  driverId: string;
  action: string;
  notes: string | null;
  confidence: number | null;
  eventSummary: string | null;
  createdAt: string;
  driver: { name: string; vehicleId: string; riskLevel: string } | null;
  warning: {
    warningText: string;
    severity: number;
    status: string;
    createdAt: string;
    riskScore: { score: number; confidence: number; factors: string; missingData: string | null } | null;
  } | null;
  reviewer: { name: string | null; email: string | null } | null;
}

const ACTION_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  approved: 'bg-green-500/10 text-green-600 border-green-500/30',
  dismissed: 'bg-muted text-muted-foreground border-border',
  escalated: 'bg-red-500/10 text-red-600 border-red-500/30',
};

export default function ReviewPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [noteText, setNoteText] = useState('');
  const [updating, setUpdating] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/review');
      const data = await res.json();
      setReviews(data?.reviews ?? []);
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleAction = async (id: string, action: string) => {
    setUpdating(true);
    try {
      const res = await fetch('/api/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, notes: noteText || undefined }),
      });
      if (res.ok) {
        toast.success(`Review ${action}`);
        setNoteText('');
        fetchReviews();
      } else {
        toast.error('Failed to update');
      }
    } catch {
      toast.error('Error updating review');
    } finally {
      setUpdating(false);
    }
  };

  const filtered = filter === 'all' ? reviews : (reviews ?? []).filter((r: ReviewItem) => r?.action === filter);
  const pendingCount = (reviews ?? []).filter((r: ReviewItem) => r?.action === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
          <AlertCircle className="h-6 w-6 text-primary" />
          Safety Review Queue
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Escalated cases requiring human review — {pendingCount} pending
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'pending', 'approved', 'dismissed', 'escalated'].map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pending' && pendingCount > 0 && (
              <Badge className="ml-1.5 text-[10px] px-1.5">{pendingCount}</Badge>
            )}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Queue list */}
        <div className="col-span-5">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (filtered ?? []).length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>No reviews match the filter</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {(filtered ?? []).map((item: ReviewItem) => (
                      <button
                        key={item?.id}
                        onClick={() => { setSelected(item); setNoteText(item?.notes ?? ''); }}
                        className={cn(
                          'w-full text-left p-4 hover:bg-muted/50 transition-colors',
                          selected?.id === item?.id && 'bg-muted/50'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{item?.driver?.name ?? 'Unknown'}</span>
                          <Badge variant="outline" className={cn('text-[10px]', ACTION_COLORS[item?.action ?? 'pending'])}>
                            {item?.action ?? 'pending'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {item?.warning?.warningText ?? 'No warning text'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span>Score: {item?.warning?.riskScore?.score ?? 'N/A'}</span>
                          <span>·</span>
                          <span>Severity: {item?.warning?.severity ?? 'N/A'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Detail panel */}
        <div className="col-span-7">
          {selected ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{selected?.driver?.name ?? 'Unknown Driver'}</CardTitle>
                <CardDescription>
                  Vehicle {selected?.driver?.vehicleId ?? 'N/A'} · Risk: {selected?.driver?.riskLevel ?? 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Warning info */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Warning Issued
                  </h4>
                  <p className="text-sm italic">"{selected?.warning?.warningText ?? ''}"</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px]">Severity {selected?.warning?.severity ?? 'N/A'}</Badge>
                    <Badge variant="outline" className="text-[10px]">Status: {selected?.warning?.status ?? 'N/A'}</Badge>
                  </div>
                </div>

                {/* Risk score info */}
                {selected?.warning?.riskScore && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Risk Assessment</h4>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-3xl font-mono font-bold">{selected.warning.riskScore.score}</p>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-mono font-bold">
                          {((selected.warning.riskScore.confidence ?? 0) * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Confidence</p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      {(() => {
                        try {
                          const factors = JSON.parse(selected.warning.riskScore.factors ?? '[]');
                          return (factors ?? []).map((f: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span>{f?.description ?? ''}</span>
                              <span className={cn('font-mono', (f?.contribution ?? 0) > 0 ? 'text-red-500' : 'text-green-500')}>
                                {(f?.contribution ?? 0) > 0 ? '+' : ''}{f?.contribution ?? 0}
                              </span>
                            </div>
                          ));
                        } catch { return null; }
                      })()}
                    </div>
                  </div>
                )}

                {/* Reviewer info */}
                {selected?.reviewer && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    Reviewed by {selected.reviewer.name ?? selected.reviewer.email ?? 'Unknown'}
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-2">
                    <MessageSquare className="h-3 w-3" /> Reviewer Notes
                  </label>
                  <Input
                    placeholder="Add notes about this case..."
                    value={noteText}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNoteText(e.target.value)}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleAction(selected.id, 'approved')}
                    disabled={updating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(selected.id, 'dismissed')}
                    disabled={updating}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Dismiss
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleAction(selected.id, 'escalated')}
                    disabled={updating}
                  >
                    <ArrowUpCircle className="h-4 w-4 mr-1" /> Escalate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-20 text-center text-muted-foreground">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Select a case to review</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
