import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { NavItems } from "@/components/nav-items";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
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
            <main>{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
