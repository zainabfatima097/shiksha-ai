'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from "next/link";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
} from "@/components/ui/sidebar";
import { NavItems } from "@/components/nav-items";
import AuthGuard from "@/components/auth-guard";
import { LoadingSpinner } from '@/components/loading-spinner';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // When the path changes, we start a transition.
    // Clear any previous timeout that might be lingering.
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    setIsTransitioning(true);

    // Set a timeout to hide the loading indicator. This "bridges" the time
    // it takes for the new page to render, improving perceived performance.
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 400); // A 400ms delay should be sufficient to mask the lag.

    // Cleanup the timeout when the component unmounts.
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [pathname]);

  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen">
          <Sidebar>
            <SidebarHeader>
              <Link href="/lesson-planner" className="block">
                <h1 className="font-headline text-3xl font-bold text-primary px-2 py-1">
                  Shiksha AI
                </h1>
              </Link>
            </SidebarHeader>
            <SidebarContent>
              <NavItems />
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <div className="relative flex-1 h-full">
              {children}
              {isTransitioning && (
                <div
                  className={cn(
                    "absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
                    "animate-in fade-in duration-200"
                  )}
                  aria-live="polite"
                  aria-busy="true"
                >
                  <LoadingSpinner className="h-12 w-12 text-primary" />
                </div>
              )}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
