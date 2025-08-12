
"use client";

import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { createTest } from "@/ai/flows/test-flow";
import { PlusCircle, Trash2, UploadCloud, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

const questionSchema = z.object({
  type: z.enum(["mcq", "subjective"], { required_error: "Question type is required." }),
  question_text: z.string(),
  marks: z.coerce.number().int().positive("Marks must be a positive number."),
  image: z.any().optional(),
  image_url: z.string().optional(),
  answer_format: z.enum(["text", "image"]).optional(),
  options: z.array(z.object({ value: z.string().min(1, "Option cannot be empty.") })).optional(),
  correct_answer: z.string().optional(),
}).refine(data => {
    if (data.type === 'subjective') return !!data.question_text || !!data.image_url;
    if (data.type === 'mcq') return !!data.question_text;
    return true;
}, {
  message: "Question text cannot be empty.",
  path: ["question_text"],
}).refine(data => data.type !== 'mcq' || (data.options && data.options.length >= 2), {
    message: "MCQ must have at least 2 options.",
    path: ["options"],
}).refine(data => data.type !== 'mcq' || (!!data.correct_answer && data.options?.some(o => o.value === data.correct_answer)), {
    message: "You must select a valid correct answer for MCQ.",
    path: ["correct_answer"],
}).refine(data => data.type !== 'subjective' || !!data.answer_format, {
    message: "Please select an answer format for subjective questions.",
    path: ["answer_format"],
});

const subjects = ["Maths", "Science", "SST", "Hindi", "English"] as const;

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  subject: z.enum(subjects, { required_error: "Please select a subject." }),
  time_limit: z.coerce.number().int().positive("Time limit must be a positive number."),
  questions: z.array(questionSchema).min(1, "You must add at least one question."),
});

type FormValues = z.infer<typeof formSchema>;

const MOCK_TEACHER_ID = "663d2740984534f369d7a87d";

export default function CreateTestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [previews, setPreviews] = useState<Record<number, string | null>>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      time_limit: 60,
      questions: [],
    },
     mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions"
  });

  const watchQuestions = form.watch("questions");

  const handleQuestionImageChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
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
      setPreviews(prev => ({ ...prev, [index]: URL.createObjectURL(file) }));
    } else {
      setPreviews(prev => ({ ...prev, [index]: null }));
    }
  };
  
  async function onSubmit(values: FormValues) {
    try {
      const formattedQuestions = await Promise.all(values.questions.map(async q => {
        let imageUrl: string | undefined = undefined;
        if (q.image && q.image[0]) {
            imageUrl = await toBase64(q.image[0]);
        }
        return {
            ...q,
            options: q.options?.map(opt => opt.value),
            image_url: imageUrl,
            image: undefined, // remove the file object
        };
    }));

      await createTest({
        ...values,
        created_by: MOCK_TEACHER_ID,
        questions: formattedQuestions,
      });

      toast({
        title: "Test Created Successfully!",
        description: `"${values.title}" is now available.`,
      });
      router.push(`/teacher/dashboard`);

    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Failed to Create Test",
        description: error.message || "An unexpected error occurred.",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-3xl font-bold font-headline">Create New Test</h2>
                <p className="text-muted-foreground">Define test details and add questions all in one place.</p>
            </div>
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating...' : 'Publish Test'}
            </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Test Details */}
            <div className="lg:col-span-1 space-y-6">
                 <Card>
                    <CardHeader><CardTitle>Test Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Test Title</FormLabel>
                                <FormControl><Input placeholder="e.g., Introduction to Calculus" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subject</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a subject"/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {subjects.map(subject => (
                                            <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl><Textarea placeholder="What this test covers." rows={3} {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="time_limit"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Time Limit (minutes)</FormLabel>
                                <FormControl><Input type="number" placeholder="60" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Questions */}
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                       <div>
                         <CardTitle>Questions</CardTitle>
                         <CardDescription>Add at least one question to the test.</CardDescription>
                       </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => append({ type: "mcq", question_text: "", marks: 5, options: [{value: ''}, {value: ''}], correct_answer: undefined, answer_format: undefined })}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Question
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {fields.map((field, index) => (
                            <Card key={field.id} className="p-4 relative bg-muted/20">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}>
                                    <X className="h-4 w-4" />
                                </Button>
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                    <div className="md:col-span-4">
                                        <FormField
                                            control={form.control}
                                            name={`questions.${index}.question_text`}
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Question {index + 1}</FormLabel>
                                                <FormControl><Textarea placeholder="Enter question text..." {...field} rows={2} /></FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                         <FormField
                                            control={form.control}
                                            name={`questions.${index}.type`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Type</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="mcq">MCQ</SelectItem>
                                                        <SelectItem value="subjective">Subjective</SelectItem>
                                                    </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <FormField
                                            control={form.control}
                                            name={`questions.${index}.marks`}
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Marks</FormLabel>
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                                <div className="mt-4">
                                  <FormField
                                    control={form.control}
                                    name={`questions.${index}.image`}
                                    render={({ field: imageField }) => (
                                        <FormItem>
                                        <FormLabel>Optional Question Image</FormLabel>
                                        <FormControl>
                                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50">
                                              {previews[index] ? (
                                                  <Image src={previews[index]!} alt="Preview" width={200} height={120} className="object-contain h-full w-full p-2" />
                                              ) : (
                                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                  <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                                  <p className="text-xs text-muted-foreground">Upload an image (PNG, JPG)</p>
                                              </div>
                                              )}
                                              <Input 
                                                  type="file" className="hidden" accept=".jpg,.jpeg,.png"
                                                  onChange={(e) => {
                                                      imageField.onChange(e.target.files);
                                                      handleQuestionImageChange(e, index);
                                                  }}
                                              />
                                          </label>
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                  />
                                </div>

                                <div className="mt-4">
                                 {watchQuestions[index]?.type === 'subjective' && (
                                     <>
                                        <Separator className="mb-4" />
                                        <FormField
                                            control={form.control}
                                            name={`questions.${index}.answer_format`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Answer Format</FormLabel>
                                                    <FormControl>
                                                        <RadioGroup
                                                            onValueChange={field.onChange}
                                                            defaultValue={field.value}
                                                            className="flex items-center gap-4"
                                                            >
                                                            <FormItem className="flex items-center space-x-2">
                                                                <FormControl>
                                                                <RadioGroupItem value="text" id={`text-${index}`} />
                                                                </FormControl>
                                                                <FormLabel htmlFor={`text-${index}`} className="font-normal">Text</FormLabel>
                                                            </FormItem>
                                                            <FormItem className="flex items-center space-x-2">
                                                                <FormControl>
                                                                <RadioGroupItem value="image" id={`image-${index}`} />
                                                                </FormControl>
                                                                <FormLabel htmlFor={`image-${index}`} className="font-normal">Image Upload</FormLabel>
                                                            </FormItem>
                                                        </RadioGroup>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                     </>
                                 )}

                                {watchQuestions[index]?.type === 'mcq' && (
                                     <div className="mt-4">
                                        <Separator className="mb-4" />
                                        <FormLabel>Options & Correct Answer</FormLabel>
                                         <FormControl>
                                            <Controller
                                                name={`questions.${index}.correct_answer`}
                                                control={form.control}
                                                render={({ field: radioField }) => (
                                                    <RadioGroup onValueChange={radioField.onChange} value={radioField.value} className="space-y-2 mt-2">
                                                        {(watchQuestions[index].options || []).map((opt, optIndex) => (
                                                            <div key={optIndex} className="flex items-center gap-2">
                                                                <FormControl>
                                                                    <RadioGroupItem value={form.watch(`questions.${index}.options.${optIndex}.value`)} />
                                                                </FormControl>
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`questions.${index}.options.${optIndex}.value`}
                                                                    render={({ field }) => (
                                                                        <FormItem className="flex-grow">
                                                                            <FormControl><Input {...field} placeholder={`Option ${optIndex + 1}`} /></FormControl>
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => {
                                                                    const options = form.getValues(`questions.${index}.options`) || [];
                                                                    if(options.length > 2) {
                                                                        const newOptions = options.filter((_, i) => i !== optIndex);
                                                                        form.setValue(`questions.${index}.options`, newOptions);
                                                                    }
                                                                }} disabled={(form.getValues(`questions.${index}.options`)?.length ?? 0) <= 2}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </RadioGroup>
                                                )}
                                            />
                                        </FormControl>
                                        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => {
                                             const options = form.getValues(`questions.${index}.options`) || [];
                                             form.setValue(`questions.${index}.options`, [...options, {value: ''}]);
                                        }}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                                        </Button>
                                        <FormMessage>{form.formState.errors.questions?.[index]?.correct_answer?.message}</FormMessage>
                                     </div>
                                )}
                                </div>
                            </Card>
                        ))}
                         <FormMessage>{form.formState.errors.questions?.root?.message || form.formState.errors.questions?.message}</FormMessage>
                    </CardContent>
                </Card>
            </div>
        </div>
      </form>
    </Form>
  );
}
