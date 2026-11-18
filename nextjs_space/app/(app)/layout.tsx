import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { SyntheticBanner } from '@/components/synthetic-banner';
import { AppLayoutClient } from '@/components/app-layout-client';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="min-h-screen">
      <SyntheticBanner />
      <AppSidebar />
      <AppLayoutClient>{children}</AppLayoutClient>
    </div>
  );
}
