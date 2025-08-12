
import { DashboardLayout } from "@/components/dashboard-layout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/admin/teachers", label: "Manage Teachers", icon: "UserCog" },
    { href: "/admin/students", label: "Manage Students", icon: "Users" },
    { href: "/admin/tests", label: "Manage Tests", icon: "BookCopy" },
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      userName="Admin User"
      userRole="Admin"
    >
      {children}
    </DashboardLayout>
  );
}
