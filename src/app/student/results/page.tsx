
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { getSubmissionsByStudent, SubmissionDetails } from "@/ai/flows/submission-flow";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// In a real app, you would get this from the user's session
const MOCK_STUDENT_ID = "663d2740984534f369d7a87e";

export default function StudentResultsPage() {
  const [submissions, setSubmissions] = useState<SubmissionDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        setLoading(true);
        const data = await getSubmissionsByStudent(MOCK_STUDENT_ID);
        setSubmissions(data);
      } catch (error) {
        console.error("Failed to fetch results:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load your results." });
      } finally {
        setLoading(false);
      }
    }
    fetchSubmissions();
  }, [toast]);

  const TableSkeleton = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Test Title</TableHead>
          <TableHead>Submitted On</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Final Score</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(3)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">My Results</CardTitle>
        <CardDescription>Review your past test submissions and scores.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <TableSkeleton />
        ) : submissions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">You have not submitted any tests yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Title</TableHead>
                <TableHead>Submitted On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Final Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.test?.title || 'N/A'}</TableCell>
                  <TableCell>{new Date(sub.submitted_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={sub.status === 'Graded' ? 'default' : 'secondary'} className={sub.status === 'Graded' ? 'bg-green-600/80 hover:bg-green-600' : ''}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {sub.final_score !== null ? `${sub.final_score}%` : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon" disabled={sub.status !== 'Graded'}>
                      <Link href={`/student/results/${sub.id}`}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View Details</span>
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
