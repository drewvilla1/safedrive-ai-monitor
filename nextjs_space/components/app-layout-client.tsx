'use client';

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <main className="ml-60 pt-2 min-h-screen">
      <div className="p-6">
        {children}
      </div>
    </main>
  );
}
