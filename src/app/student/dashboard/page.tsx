
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, BookOpen, ArrowRight } from "lucide-react";
import { getTests, TestOutput } from "@/ai/flows/test-flow";
import { getUserById } from "@/ai/flows/user-flow";
import { useToast } from "@/hooks/use-toast";

type TestWithTeacher = TestOutput & { teacherName: string };

export default function StudentDashboard() {
  const [availableTests, setAvailableTests] = useState<TestWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchTests() {
      try {
        setLoading(true);
        const tests = await getTests();
        const testsWithTeachers = await Promise.all(
          tests.map(async (test) => {
            const teacher = await getUserById(test.created_by);
            return {
              ...test,
              teacherName: teacher?.username || "Unknown Teacher",
            };
          })
        );
        setAvailableTests(testsWithTeachers);
      } catch (error) {
        console.error("Failed to fetch tests:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load available tests." });
      } finally {
        setLoading(false);
      }
    }
    fetchTests();
  }, [toast]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold font-headline">Available Tests</h2>
        <p className="text-muted-foreground">Here are the tests available for you to take. Good luck!</p>
      </div>

      {loading ? (
        <p>Loading tests...</p>
      ) : availableTests.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {availableTests.map((test, index) => (
            <Card 
              key={test.id} 
              className="flex flex-col animate-slide-in-up"
              style={{ animationDelay: `${index * 100}ms`}}
            >
              <CardHeader>
                <CardTitle className="font-headline">{test.title}</CardTitle>
                <CardDescription className="line-clamp-2 h-[40px]">{test.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex items-center text-sm text-muted-foreground space-x-4">
                  <div className="flex items-center">
                    <Clock className="mr-1.5 h-4 w-4" />
                    <span>{test.time_limit} mins</span>
                  </div>
                  <div className="flex items-center">
                    <BookOpen className="mr-1.5 h-4 w-4" />
                    <span>{test.teacherName}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/student/exam/${test.id}`}>
                    Start Test
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <h3 className="text-xl font-semibold">No Tests Available</h3>
          <p className="text-muted-foreground mt-2">Check back later for new tests.</p>
        </div>
      )}
    </div>
  );
}
