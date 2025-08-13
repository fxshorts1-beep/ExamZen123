
"use client";

import { useState, useEffect } from "react";
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getTeachers, UserOutput as Teacher } from "@/ai/flows/user-flow";
import { getTests, TestOutput as Test } from "@/ai/flows/test-flow";
import { Activity, BookOpen, Users, ArrowUp } from "lucide-react";

// Dynamically import the chart components
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false, loading: () => <p>Loading chart...</p> });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });


export default function AdminDashboard() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for weekly stats
  const weeklyTestsData = [
    { day: "Mon", tests: 4 },
    { day: "Tue", tests: 3 },
    { day: "Wed", tests: 8 },
    { day: "Thu", tests: 5 },
    { day: "Fri", tests: 6 },
    { day: "Sat", tests: 2 },
    { day: "Sun", tests: 1 },
  ];

  const chartConfig = {
    tests: {
      label: "Tests",
      color: "hsl(var(--primary))",
    },
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [fetchedTeachers, fetchedTests] = await Promise.all([
            getTeachers(),
            getTests(),
        ]);
        setTeachers(fetchedTeachers);
        setTests(fetchedTests);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold font-headline">Admin Dashboard</h2>
        <p className="text-muted-foreground">System overview and statistics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-slide-in-up animation-delay-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : teachers.length}</div>
            <p className="text-xs text-muted-foreground">+2 since last month</p>
          </CardContent>
        </Card>
        <Card className="animate-slide-in-up animation-delay-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : tests.length}</div>
            <p className="text-xs text-muted-foreground">+10 since last week</p>
          </CardContent>
        </Card>
         <Card className="animate-slide-in-up animation-delay-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+573</div>
            <p className="text-xs text-muted-foreground">+201 since last hour</p>
          </CardContent>
        </Card>
         <Card className="animate-slide-in-up animation-delay-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submissions This Week</CardTitle>
            <ArrowUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+1,234</div>
            <p className="text-xs text-muted-foreground">+12% from last week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="animate-slide-in-up animation-delay-500">
          <CardHeader>
            <CardTitle>Weekly Test Creation</CardTitle>
            <CardDescription>Number of new tests created each day this week.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <ResponsiveContainer>
                <BarChart data={weeklyTestsData} margin={{ top: 20, right: 20, bottom: 0, left: -20 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="tests" fill="var(--color-tests)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="animate-slide-in-up animation-delay-600">
          <CardHeader>
            <CardTitle>Teacher Activity</CardTitle>
            <CardDescription>Most active teachers based on tests created.</CardDescription>
          </CardHeader>
          <CardContent>
             {loading ? <p>Loading...</p> : (
                 <div className="space-y-4">
                    {teachers.slice(0, 5).map((teacher) => (
                        <div key={teacher.id} className="flex items-center">
                            <div className="flex-1">
                                <p className="text-sm font-medium leading-none">{teacher.username}</p>
                                <p className="text-sm text-muted-foreground">{teacher.email}</p>
                            </div>
                            <div className="ml-auto font-medium">{tests.filter(t => t.created_by === teacher.id).length} tests</div>
                        </div>
                    ))}
                 </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
