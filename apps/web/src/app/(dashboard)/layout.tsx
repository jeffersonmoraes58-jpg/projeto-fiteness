import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { MobileNav } from '@/components/dashboard/mobile-nav';
import { SubscriptionGate } from '@/components/dashboard/subscription-gate';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SubscriptionGate>
      <div className="min-h-screen bg-background flex">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-h-screen lg:pl-64 min-w-0">
          <DashboardHeader />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden pb-20 lg:pb-8">
            {children}
          </main>
          <MobileNav />
        </div>
      </div>
    </SubscriptionGate>
  );
}
