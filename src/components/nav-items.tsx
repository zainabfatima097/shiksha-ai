"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { BookText, Sheet, ImageIcon, BrainCircuit, Languages } from "lucide-react";

const navItems = [
  { href: "/lesson-planner", icon: BookText, label: "Lesson Planner" },
  { href: "/differentiated-worksheets", icon: Sheet, label: "Worksheets" },
  { href: "/visual-aids", icon: ImageIcon, label: "Visual Aids" },
  { href: "/knowledge-base", icon: BrainCircuit, label: "Knowledge Base" },
  { href: "/local-content", icon: Languages, label: "Local Content" },
];

export function NavItems() {
  const pathname = usePathname();
  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              isActive={pathname.startsWith(item.href)}
              tooltip={item.label}
            >
              <item.icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
