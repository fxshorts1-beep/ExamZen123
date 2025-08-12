
import { DashboardLayout } from "@/components/dashboard-layout";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { href: "/teacher/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/teacher/tests", label: "Manage Tests", icon: "BookCopy" },
    { href: "/teacher/submitted", label: "Submitted", icon: "FileCheck" },
    { href: "/teacher/tests/create", label: "Create Test", icon: "PlusCircle" },
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      userName="Prof. Eleanor"
      userRole="Teacher"
    >
      {children}
    </DashboardLayout>
  );
}
