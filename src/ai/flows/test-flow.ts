
'use server';
/**
 * @fileOverview Test management flows for creating and retrieving tests.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/db';
import { Test } from '@/lib/types';
import { createQuestion, CreateQuestionInput } from './question-flow';
import { TestOutputSchema } from '../schemas/test-schemas';

const QuestionInputSchema = z.object({
  question_text: z.string(),
  marks: z.coerce.number().int().positive("Marks must be a positive number."),
  type: z.enum(['mcq', 'subjective']),
  answer_format: z.enum(['text', 'image']).optional(),
  options: z.array(z.string()).optional(),
  correct_answer: z.string().optional(),
  image_url: z.string().optional(),
})
.refine(data => {
    if (data.type === 'mcq') {
        return data.options && data.options.length >= 2 && data.correct_answer;
    }
    return true;
}, {
    message: "MCQs require options and a correct answer.",
    path: ['type'],
})
.refine(data => {
    if (data.type === 'subjective') {
        return data.question_text || data.image_url;
    }
    return true;
}, {
    message: "Subjective questions require either text or an image.",
    path: ['type'],
})
.refine(data => {
    if(data.type === 'subjective') {
        return !!data.answer_format;
    }
    return true;
}, {
    message: "Subjective questions require an answer format.",
    path: ['answer_format'],
});


// Schema for creating a test, now including questions
const CreateTestInputSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  subject: z.string().min(3, "Subject is required."),
  time_limit: z.coerce.number().int().positive("Time limit must be a positive number."),
  created_by: z.string(), // teacher ID as string
  questions: z.array(QuestionInputSchema).min(1, "At least one question is required."),
});
export type CreateTestInput = z.infer<typeof CreateTestInputSchema>;


export type TestOutput = z.infer<typeof TestOutputSchema>;

// Flow for creating a test with questions
const createTestFlow = ai.defineFlow({
    name: 'createTestFlow',
    inputSchema: CreateTestInputSchema,
    outputSchema: TestOutputSchema,
}, async (input) => {
    const { questions, ...testData } = input;
    
    // 1. Create the test
    const newTest = await db.createTest(testData);

    // 2. Create all the questions for that test
    for (const question of questions) {
        await createQuestion({
            ...question,
            test_id: newTest.id,
        } as CreateQuestionInput); // Cast to handle the union type
    }

    return newTest as TestOutput;
});

export async function createTest(input: CreateTestInput): Promise<TestOutput> {
    return createTestFlow(input);
}

// Flow for getting tests by teacher
const getTeacherTestsFlow = ai.defineFlow({
    name: 'getTeacherTestsFlow',
    inputSchema: z.object({ teacherId: z.string() }),
    outputSchema: z.array(TestOutputSchema),
}, async ({ teacherId }) => {
    const tests = await db.getTestsByTeacher(teacherId);
    // In a real app, you might want to add more details, like submission counts
    return tests as TestOutput[];
});

export async function getTeacherTests(teacherId: string): Promise<TestOutput[]> {
    return getTeacherTestsFlow({ teacherId });
}

// Flow for getting all tests
const getTestsFlow = ai.defineFlow({
    name: 'getTestsFlow',
    inputSchema: z.void(),
    outputSchema: z.array(TestOutputSchema),
}, async () => {
    const tests = await db.getTests();
    return tests as TestOutput[];
});

export async function getTests(): Promise<TestOutput[]> {
    return getTestsFlow();
}

// Flow for getting a single test by ID
const getTestByIdFlow = ai.defineFlow({
    name: 'getTestByIdFlow',
    inputSchema: z.object({ id: z.string() }),
    outputSchema: TestOutputSchema.nullable(),
}, async ({ id }) => {
    const test = await db.getTestById(id);
    return test as TestOutput | null;
});

export async function getTestById(id: string): Promise<TestOutput | null> {
    return getTestByIdFlow({ id });
}


// Flow for deleting a test
const deleteTestFlow = ai.defineFlow({
    name: 'deleteTestFlow',
    inputSchema: z.object({ testId: z.string() }),
    outputSchema: z.boolean(),
}, async ({ testId }) => {
    await db.deleteTest(testId);
    return true;
});

export async function deleteTest(testId: string): Promise<boolean> {
    return deleteTestFlow({ testId });
}
