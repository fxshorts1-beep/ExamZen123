import { z } from 'zod';

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
