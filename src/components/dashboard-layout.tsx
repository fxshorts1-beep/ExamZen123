
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { ExamZenLogo } from "./icons";
import { LogOut, Settings, LayoutDashboard, PlusCircle, CheckSquare, UserCog, Users, FileCheck, BookCopy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  PlusCircle,
  CheckSquare,
  UserCog,
  Users,
  FileCheck,
  BookCopy,
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
  isActive?: boolean;
};

type DashboardLayoutProps = {
  children: React.ReactNode;
  navItems: NavItem[];
  userName: string;
  userRole: string;
};

export function DashboardLayout({ children, navItems, userName, userRole }: DashboardLayoutProps) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <ExamZenLogo className="w-8 h-8 text-primary" />
            <span className="text-lg font-semibold font-headline">ExamZen</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => {
               const Icon = iconMap[item.icon];
               return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                  >
                    <Link href={item.href}>
                      {Icon && <Icon />}
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="justify-start w-full gap-2 p-2 h-auto">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://placehold.co/40x40.png`} alt={userName} data-ai-hint="profile picture" />
                  <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="font-medium">{userName}</p>
                  <p className="text-xs text-muted-foreground">{userRole}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userName.split(' ').join('.').toLowerCase()}@examzen.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                 <Link href={`/profile?role=${userRole.toLowerCase()}`}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Profile Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
               <DropdownMenuItem asChild>
                <Link href="/">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/80 backdrop-blur-sm z-20">
           <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="text-xl md:text-2xl font-semibold font-headline">
                    {navItems.find(item => pathname.startsWith(item.href))?.label || 'Dashboard'}
                </h1>
           </div>
          <div className="flex items-center gap-4">
             <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
