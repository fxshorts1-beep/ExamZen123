
'use server';
/**
 * @fileOverview Question management flows for creating and retrieving test questions.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/db';
import { Question } from '@/lib/types';

// Base schema for a question
const QuestionBaseSchema = z.object({
  id: z.string(),
  test_id: z.string(),
  question_text: z.string(),
  marks: z.coerce.number().int().positive(),
  type: z.enum(['mcq', 'subjective']),
  image_url: z.string().optional(),
});

// Schema for Multiple Choice Questions, extending the base
const McqQuestionSchema = QuestionBaseSchema.extend({
  type: z.literal('mcq'),
  options: z.array(z.string()).min(2, "MCQ must have at least 2 options."),
  correct_answer: z.string(),
});

// Schema for Subjective Questions, extending the base
const SubjectiveQuestionSchema = QuestionBaseSchema.extend({
  type: z.literal('subjective'),
  answer_format: z.enum(['text', 'image']),
});

// Union schema for any question type
export const QuestionOutputSchema = z.union([McqQuestionSchema, SubjectiveQuestionSchema]);
export type QuestionOutput = z.infer<typeof QuestionOutputSchema>;


// Input schema for creating a question
const CreateQuestionInputSchema = z.object({
  test_id: z.string(),
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
    if (data.type === 'subjective') {
        return !!data.answer_format;
    }
    return true;
}, {
    message: "Subjective questions require an answer format.",
    path: ['answer_format'],
});

export type CreateQuestionInput = z.infer<typeof CreateQuestionInputSchema>;


// Flow for creating a question
const createQuestionFlow = ai.defineFlow({
    name: 'createQuestionFlow',
    inputSchema: CreateQuestionInputSchema,
    outputSchema: QuestionOutputSchema,
}, async (input) => {
    // The schema validation on input already ensures data integrity
    const newQuestion = await db.createQuestion(input as Omit<Question, 'id'>);
    return newQuestion as QuestionOutput;
});

export async function createQuestion(input: CreateQuestionInput): Promise<QuestionOutput> {
    return createQuestionFlow(input);
}


// Flow for getting questions for a specific test
const getQuestionsByTestFlow = ai.defineFlow({
    name: 'getQuestionsByTestFlow',
    inputSchema: z.object({ testId: z.string() }),
    outputSchema: z.array(QuestionOutputSchema),
}, async ({ testId }) => {
    const questions = await db.getQuestionsByTest(testId);
    return questions as QuestionOutput[];
});

export async function getQuestionsByTest(testId: string): Promise<QuestionOutput[]> {
    return getQuestionsByTestFlow({ testId });
}
