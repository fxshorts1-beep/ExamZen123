
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getTests, deleteTest, TestOutput as Test } from "@/ai/flows/test-flow";
import { getUserById, UserOutput } from "@/ai/flows/user-flow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type TestWithTeacher = Test & { teacherName: string };

export default function ManageTestsPage() {
  const [tests, setTests] = useState<TestWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState<TestWithTeacher | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  async function fetchTests() {
    try {
      setLoading(true);
      const fetchedTests = await getTests();
      const testsWithTeachers = await Promise.all(
        fetchedTests.map(async (test) => {
          const teacher = await getUserById(test.created_by);
          return { ...test, teacherName: teacher?.username || "Unknown" };
        })
      );
      setTests(testsWithTeachers);
    } catch (error) {
      console.error("Failed to fetch tests:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch tests." });
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
        <CardHeader>
          <CardTitle>Manage All Tests</CardTitle>
          <CardDescription>View and manage all tests created by teachers across the platform.</CardDescription>
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
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium">{test.title}</TableCell>
                    <TableCell>{test.subject}</TableCell>
                    <TableCell>{test.teacherName}</TableCell>
                    <TableCell className="text-right">
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
