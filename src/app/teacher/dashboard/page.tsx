
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, PlusCircle, Book, MoreVertical, Trash2, FileCheck } from "lucide-react";
import { getTeacherTests, deleteTest } from "@/ai/flows/test-flow";
import { TestOutput as Test } from "@/ai/flows/test-flow";
import { getQuestionsByTest } from "@/ai/flows/question-flow";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// In a real app, you would get the logged-in teacher's ID from the session
const MOCK_TEACHER_ID = "663d2740984534f369d7a87d";

type TestWithQuestionCount = Test & { questionCount: number };

const subjectImageMap: Record<string, string> = {
    "Maths": "/subjects/maths.jpg",
    "Science": "/subjects/science.jpg",
    "SST": "/subjects/sst.jpg",
    "Hindi": "/subjects/hindi.jpg",
    "English": "/subjects/english.jpg",
};


export default function TeacherDashboard() {
  const [tests, setTests] = useState<TestWithQuestionCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState<TestWithQuestionCount | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  async function fetchTests() {
    try {
      setLoading(true);
      const fetchedTests = await getTeacherTests(MOCK_TEACHER_ID);
      const testsWithCounts = await Promise.all(
        fetchedTests.map(async (test) => {
          const questions = await getQuestionsByTest(test.id);
          return { ...test, questionCount: questions.length };
        })
      );
      setTests(testsWithCounts);
    } catch (error) {
      console.error("Failed to fetch tests:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch tests.'});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTests();
  }, []);

  const handleDeleteTest = async () => {
    if (!selectedTest) return;
    try {
      await deleteTest(selectedTest.id);
      toast({ title: "Test Deleted", description: `"${selectedTest.title}" has been removed.` });
      fetchTests(); // Refresh the list
    } catch (error: any) {
       toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedTest(null);
    }
  };

  const TestCardSkeleton = () => (
    <Card className="flex flex-col overflow-hidden">
      <Skeleton className="h-40 w-full" />
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full mt-2" />
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
      <CardFooter className="bg-muted/50 p-4">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );

  return (
    <>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold font-headline">My Tests</h2>
            <p className="text-muted-foreground mt-1">Manage your created tests and view student submissions.</p>
          </div>
          <Button asChild>
            <Link href="/teacher/tests/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Test
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <TestCardSkeleton key={i} />)}
          </div>
        ) : tests.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tests.map((test, index) => (
              <Card 
                key={test.id} 
                className="flex flex-col overflow-hidden animate-slide-in-up"
                style={{ animationDelay: `${index * 100}ms`}}
              >
                  <div className="relative h-40 w-full">
                      <Image
                          src={subjectImageMap[test.subject] || "https://placehold.co/600x400.png"}
                          alt={test.subject}
                          fill
                          className="object-cover"
                          data-ai-hint={`${test.subject} illustration`}
                          onError={(e) => {
                            e.currentTarget.src = "https://placehold.co/600x400.png";
                          }}
                      />
                  </div>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="font-headline">{test.title}</CardTitle>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                    <MoreVertical className="h-4 w-4"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={`/teacher/tests/${test.id}/submissions`}>
                                        <FileCheck className="mr-2 h-4 w-4" />
                                        View Submissions
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => {
                                        setSelectedTest(test);
                                        setIsDeleteDialogOpen(true);
                                    }}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  <CardDescription className="line-clamp-2 h-[40px]">{test.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                      <Book className="mr-1.5 h-4 w-4" />
                      <span>{test.subject}</span>
                    </div>
                  <div className="flex items-center text-sm text-muted-foreground space-x-4">
                    <div className="flex items-center">
                      <FileText className="mr-1.5 h-4 w-4" />
                      <span>{test.questionCount} Questions</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="mr-1.5 h-4 w-4" />
                      <span>{test.time_limit} mins</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2 bg-muted/50 p-4">
                  <Button asChild className="flex-1">
                    <Link href={`/teacher/tests/${test.id}/submissions`}>View Submissions</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg animate-fade-in">
            <h3 className="text-xl font-semibold">No tests created yet</h3>
            <p className="text-muted-foreground mt-2 mb-4">Get started by creating your first test.</p>
            <Button asChild>
              <Link href="/teacher/tests/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Test
              </Link>
            </Button>
          </div>
        )}
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedTest?.title}" and all its submissions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTest} className={buttonVariants({ variant: "destructive" })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
