
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye } from "lucide-react";
import { getAllSubmissionsByTeacher, SubmissionDetails } from "@/ai/flows/submission-flow";
import { useToast } from "@/hooks/use-toast";

// In a real app, you would get this from the user's session
const MOCK_TEACHER_ID = "663d2740984534f369d7a87d";

export default function SubmittedPage() {
  const [submissions, setSubmissions] = useState<SubmissionDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const fetchedSubmissions = await getAllSubmissionsByTeacher(MOCK_TEACHER_ID);
        setSubmissions(fetchedSubmissions);
      } catch (error) {
        console.error("Failed to fetch submissions:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load submissions." });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">All Submissions</CardTitle>
        <CardDescription>Review all student submissions across all your tests.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading submissions...</p>
        ) : submissions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No submissions received yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Submitted On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={sub.student.profile_pic_url} alt={sub.student.username} data-ai-hint="profile picture" />
                        <AvatarFallback>{sub.student.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div>{sub.student.username}</div>
                        <div className="text-xs text-muted-foreground">{sub.student.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{sub.test?.title}</TableCell>
                  <TableCell>{sub.submitted_at.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={sub.status === 'Graded' ? 'default' : 'secondary'} className={sub.status === 'Graded' ? 'bg-green-600/80 hover:bg-green-600' : ''}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {sub.final_score !== null ? `${sub.final_score}%` : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/teacher/submissions/${sub.id}/evaluate`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Evaluate
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
