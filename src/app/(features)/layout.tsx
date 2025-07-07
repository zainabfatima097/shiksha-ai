'use client';

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

export default function AppLayout({ children }: { children: React.ReactNode }) {

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
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
