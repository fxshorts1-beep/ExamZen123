import { DashboardLayout } from "@/components/dashboard-layout";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { href: "/student/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/student/results", label: "My Results", icon: "CheckSquare" },
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      userName="Alex Doe"
      userRole="Student"
    >
      {children}
    </DashboardLayout>
  );
}
