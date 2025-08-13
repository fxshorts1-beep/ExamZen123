
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Trash2, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTeacherTests, deleteTest, TestOutput as Test } from "@/ai/flows/test-flow";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getQuestionsByTest } from "@/ai/flows/question-flow";

const MOCK_TEACHER_ID = "663d2740984534f369d7a87d";

type TestWithQuestionCount = Test & { questionCount: number };

export default function ManageTeacherTestsPage() {
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

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage My Tests</CardTitle>
            <CardDescription>View, edit, or delete your tests.</CardDescription>
          </div>
           <Button asChild>
            <Link href="/teacher/tests/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Test
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading tests...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Time Limit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium">{test.title}</TableCell>
                    <TableCell>{test.subject}</TableCell>
                    <TableCell>{test.questionCount}</TableCell>
                    <TableCell>{test.time_limit} mins</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/teacher/tests/${test.id}/submissions`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Submissions
                        </Link>
                      </Button>
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setSelectedTest(test);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the test "{selectedTest?.title}" and all its associated questions and student submissions. This action cannot be undone.
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
