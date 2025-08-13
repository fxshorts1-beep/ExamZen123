
"use client";
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import StudentLayout from '../student/layout';
import TeacherLayout from '../teacher/layout';
import AdminLayout from '../admin/layout';

function ProfileLayoutContent({ children }: { children: React.ReactNode }) {
    const params = useSearchParams();
    const role = params.get('role') || 'student'; // Default to student if no role
    
    // In a real app, you'd get the user from session and determine the role
    // For now, we use a query param to switch between layouts for demo purposes

    if (role === 'teacher') {
        return <TeacherLayout>{children}</TeacherLayout>;
    }
    if (role === 'admin') {
        return <AdminLayout>{children}</AdminLayout>;
    }
    return <StudentLayout>{children}</StudentLayout>;
}


export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileLayoutContent>
        {children}
      </ProfileLayoutContent>
    </Suspense>
  );
}
