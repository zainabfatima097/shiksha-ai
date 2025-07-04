
'use client';

import { useAuth } from '@/hooks/use-auth';
import { redirect } from 'next/navigation';
import { LoadingSpinner } from '@/components/loading-spinner';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
      return (
          <div className="flex items-center justify-center h-screen bg-background">
            <LoadingSpinner className="h-12 w-12" />
          </div>
      );
  }

  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
}
