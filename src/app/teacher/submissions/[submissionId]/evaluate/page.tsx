
"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { getEvaluationData, gradeSubmission, EvaluationData } from "@/ai/flows/evaluation-flow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, AlertTriangle, Pen, Send } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const gradeFormSchema = z.object({
  score: z.coerce.number().min(0, "Score must be at least 0.").max(100, "Score cannot exceed 100."),
});

type GradeFormValues = z.infer<typeof gradeFormSchema>;

export default function EvaluateSubmissionPage({ params }: { params: { submissionId: string } }) {
  const [data, setData] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<GradeFormValues>({
    resolver: zodResolver(gradeFormSchema),
  });

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const evaluationData = await getEvaluationData(params.submissionId);
        setData(evaluationData);
        form.setValue("score", evaluationData.submission.final_score || evaluationData.submission.mcq_score || 0);
      } catch (error: any) {
        console.error("Failed to fetch evaluation data:", error);
        toast({ variant: "destructive", title: "Error", description: error.message });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.submissionId, toast, form]);

  const onGradeSubmit: SubmitHandler<GradeFormValues> = async (values) => {
    if (!data) return;
    try {
      await gradeSubmission({ submissionId: data.submission.id, finalScore: values.score });
      toast({ title: "Grade Submitted", description: "The final score has been updated." });
      router.push(`/teacher/tests/${data.test.id}/submissions`);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Submission Failed", description: error.message });
    }
  };


  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
  if (!data) return <div>Could not load submission data.</div>;

  const { submission, student, test, questions, questionStats } = data;

  const getAnswerForQuestion = (questionId: string) => {
    return submission.answers.find(a => a.question_id === questionId);
  }

  const getStatsForQuestion = (questionId: string) => {
    return questionStats.find(s => s.questionId === questionId);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-headline">Evaluate Submission</h2>
        <p className="text-muted-foreground">Test: {test.title}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
             <Avatar className="h-16 w-16">
                <AvatarImage src={student.profile_pic_url} alt={student.username} />
                <AvatarFallback>{student.username.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <CardTitle>{student.username}</CardTitle>
                <CardDescription>{student.email}</CardDescription>
                <p className="text-xs text-muted-foreground mt-1">Submitted on: {new Date(submission.submitted_at).toLocaleString()}</p>
            </div>
          </div>
          <div className="text-right">
             <p className="text-sm text-muted-foreground">Status</p>
             <Badge variant={submission.status === 'Graded' ? 'default' : 'secondary'} className={submission.status === 'Graded' ? 'bg-green-600 hover:bg-green-700' : ''}>
                {submission.status}
            </Badge>
          </div>
        </CardHeader>
      </Card>
      
      <Separator />

      <div className="space-y-6">
        {questions.map((q, index) => {
            const answer = getAnswerForQuestion(q.id);
            const stats = getStatsForQuestion(q.id);
            const isCorrect = q.type === 'mcq' && answer?.answer_text === q.correct_answer;

            return (
                <Card key={q.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                               <div className="flex items-center gap-3">
                                <CardTitle className="text-xl">Question {index + 1}</CardTitle>
                                <Badge variant="outline">{q.marks} Mark{q.marks > 1 ? 's' : ''}</Badge>
                               </div>
                                <CardDescription className="mt-2">{q.question_text}</CardDescription>
                                {q.image_url && <Image src={q.image_url} alt="Question" width={300} height={150} className="mt-2 rounded-md border" />}
                            </div>
                            {q.type === 'mcq' && (
                                <Badge variant={isCorrect ? "default" : "destructive"} className={isCorrect ? "bg-green-600" : ""}>
                                    {isCorrect ? <CheckCircle className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}
                                    {isCorrect ? 'Correct' : 'Incorrect'}
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                       <div className="bg-muted/50 p-4 rounded-md space-y-2">
                            <p className="text-sm font-semibold">Student's Answer:</p>
                             {(answer?.answer_text || answer?.answer_image_url) ? (
                                <>
                                {answer.answer_text && <p className="text-sm">{answer.answer_text}</p>}
                                {answer.answer_image_url && (
                                    <Image src={answer.answer_image_url} alt="Student's uploaded answer" width={400} height={200} className="rounded-md border" />
                                )}
                                </>
                            ) : (
                                <p className="text-sm text-yellow-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> This question was skipped.</p>
                            )}
                             {q.type === 'mcq' && !isCorrect && (
                                <p className="text-sm text-green-700 font-medium">Correct Answer: {q.correct_answer}</p>
                             )}
                       </div>
                       {stats && (
                        <p className="text-xs text-muted-foreground mt-3 text-right">
                            {stats.skipPercentage.toFixed(0)}% of students skipped this question.
                        </p>
                       )}
                    </CardContent>
                </Card>
            )
        })}
      </div>

       <Separator />
      
       <Card>
        <CardHeader>
          <CardTitle>Final Grade</CardTitle>
          <CardDescription>Review the auto-graded score and assign a final score for the test.</CardDescription>
        </CardHeader>
         <Form {...form}>
            <form onSubmit={form.handleSubmit(onGradeSubmit)}>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="p-4">
                            <FormLabel>Auto-Graded MCQ Score</FormLabel>
                            <p className="text-2xl font-bold">{submission.mcq_score ?? 'N/A'}/100</p>
                            <FormMessage />
                        </Card>
                        <Card className="p-4">
                            <FormField
                                control={form.control}
                                name="score"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Final Score</FormLabel>
                                    <FormControl>
                                         <Input type="number" {...field} className="text-2xl font-bold h-auto p-0 border-none focus-visible:ring-0" />
                                    </FormControl>
                                </FormItem>
                                )}
                            />
                        </Card>
                    </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                     <Send className="mr-2 h-4 w-4" />
                    {form.formState.isSubmitting ? 'Submitting...' : 'Submit Final Grade'}
                  </Button>
                </CardFooter>
            </form>
         </Form>
      </Card>


    </div>
  );
}
