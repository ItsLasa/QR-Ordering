import { redirect } from 'next/navigation';
import { getCurrentUserWithRestaurant } from '@/lib/auth';
import { DashboardNav } from '@/components/DashboardNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserWithRestaurant();

  if (!user || !user.restaurant) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNav
        restaurant={user.restaurant as any}
        userEmail={user.email}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
