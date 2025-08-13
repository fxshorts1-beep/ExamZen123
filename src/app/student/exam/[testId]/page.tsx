
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, UploadCloud, Badge } from "lucide-react";
import { Input } from "@/components/ui/input";
import { QuestionOutput, getQuestionsByTest } from "@/ai/flows/question-flow";
import { getTestById, TestOutput } from "@/ai/flows/test-flow";
import { submitTest } from "@/ai/flows/submission-flow";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const MOCK_STUDENT_ID = "663d2740984534f369d7a87e";

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

type Answer = {
    text?: string;
    image?: {
        file: File;
        preview: string;
        base64: string;
    } | null;
}

export default function ExamPage({ params }: { params: { testId: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [testData, setTestData] = useState<(TestOutput & {questions: QuestionOutput[]}) | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showTimeoutAlert, setShowTimeoutAlert] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchTestData() {
      try {
        setLoading(true);
        const [testDetails, questions] = await Promise.all([
            getTestById(params.testId),
            getQuestionsByTest(params.testId)
        ]);

        if (!testDetails) {
            toast({ variant: "destructive", title: "Error", description: "Test not found." });
            router.push('/student/dashboard');
            return;
        }
        
        setTestData({ ...testDetails, questions });
        setTimeLeft(testDetails.time_limit * 60);

      } catch (error) {
        console.error("Failed to load test:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load the test." });
        router.push('/student/dashboard');
      } finally {
        setLoading(false);
      }
    }
    fetchTestData();
  }, [params.testId, router, toast]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      if (!isSubmitting) submitExam(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => (prevTime ? prevTime - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isSubmitting]);

  const handleTextChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: {...prev[questionId], text: value }}));
  };

  const handleImageChange = async (questionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({ variant: "destructive", title: "File too large", description: "Image size cannot exceed 5MB." });
        return;
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast({ variant: "destructive", title: "Invalid file type", description: "Please upload a JPG, JPEG, or PNG file."});
        return;
      }
      
      const preview = URL.createObjectURL(file);
      const base64 = await toBase64(file);
      setAnswers((prev) => ({ ...prev, [questionId]: {...prev[questionId], image: { file, preview, base64 } }}));
    }
  };
  
  const submitExam = async (isTimeout: boolean = false) => {
    if (isSubmitting || !testData) return;
    setIsSubmitting(true);

    const processedAnswers = Object.entries(answers).map(([questionId, answer]) => {
      return { 
        questionId, 
        text: answer.text, 
        imageUrl: answer.image?.base64 
      };
    });

    try {
        await submitTest({
            testId: params.testId,
            studentId: MOCK_STUDENT_ID,
            answers: processedAnswers,
        });

        if (isTimeout) {
            setShowTimeoutAlert(true);
        } else {
            toast({
                title: "Submission Successful!",
                description: "Your test has been submitted. Good luck!",
            });
            router.push("/student/results");
        }
    } catch (error: any) {
        console.error("Failed to submit exam:", error);
        toast({ variant: "destructive", title: "Submission Failed", description: error.message });
        setIsSubmitting(false); // Allow retry if submission fails
    }
  }

  const progress = useMemo(() => {
    if(timeLeft === null || !testData) return 100;
    return (timeLeft / (testData.time_limit * 60)) * 100;
  }, [timeLeft, testData]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if(loading || !testData || timeLeft === null) {
    return <div className="flex items-center justify-center h-full">Loading test...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="sticky top-0 z-10">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">{testData.title}</CardTitle>
          <div className="flex justify-between items-center pt-2">
            <CardDescription>Answer all questions to the best of your ability.</CardDescription>
            <div className="flex items-center gap-2 font-mono text-lg font-semibold text-destructive">
                <Clock className="h-5 w-5"/>
                <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Progress value={progress} className="h-1 rounded-none"/>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {testData.questions.map((q, index) => (
          <Card key={q.id}>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="font-headline text-xl">Question {index + 1}</CardTitle>
                    <Badge variant="secondary">{q.marks} Mark{q.marks > 1 ? 's' : ''}</Badge>
                </div>
              <CardDescription>{q.question_text}</CardDescription>
               {q.image_url && (
                <div className="mt-4">
                  <Image
                    src={q.image_url}
                    alt={`Question ${index + 1}`}
                    width={400}
                    height={250}
                    className="rounded-md object-cover"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent>
              {q.type === 'mcq' ? (
                <RadioGroup onValueChange={(value) => handleTextChange(q.id, value)}>
                  {q.options?.map((option, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`${q.id}-${i}`} />
                      <Label htmlFor={`${q.id}-${i}`}>{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-4">
                  {q.answer_format === 'text' && (
                     <Textarea
                        placeholder="Type your answer here..."
                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                        className="resize-none"
                        rows={5}
                    />
                  )}

                  {q.answer_format === 'image' && (
                    <div className="flex flex-col items-center justify-center w-full">
                      <label htmlFor={`dropzone-${q.id}`} className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50">
                        {answers[q.id]?.image?.preview ? (
                            <Image src={answers[q.id]!.image!.preview} alt="Image preview" width={300} height={150} className="object-contain h-full w-full p-2" />
                        ) : (
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-muted-foreground">PNG, JPG or JPEG (MAX. 5MB)</p>
                          </div>
                        )}
                        <Input 
                            id={`dropzone-${q.id}`}
                            type="file" 
                            className="hidden" 
                            accept=".jpg,.jpeg,.png"
                            onChange={(e) => handleImageChange(q.id, e)}
                         />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button size="lg" onClick={() => submitExam(false)} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Exam'}
        </Button>
      </div>
      
       <AlertDialog open={showTimeoutAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Time's Up!</AlertDialogTitle>
            <AlertDialogDescription>
              The timer for this exam has run out. Your answers have been automatically submitted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => router.push('/student/results')}>View Results</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
