'use client';
import { AlertTriangle } from 'lucide-react';

export function SyntheticBanner() {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5 text-center">
      <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" />
        SYNTHETIC DATA — NOT REAL-WORLD SAFETY CLAIMS
        <AlertTriangle className="h-3.5 w-3.5" />
      </p>
    </div>
  );
}
