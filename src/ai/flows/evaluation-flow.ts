
'use server';
/**
 * @fileOverview Flows for evaluating student submissions.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/db';
import { QuestionOutput, QuestionOutputSchema, getQuestionsByTest } from './question-flow';
import { UserOutput, UserOutputSchema, getUserById } from './user-flow';
import { TestOutput, TestOutputSchema, getTestById } from './test-flow';

const AnswerSchema = z.object({
  id: z.string(),
  question_id: z.string(),
  answer_text: z.string().nullable(),
  answer_image_url: z.string().nullable().optional(),
});

const SubmissionEvaluationSchema = z.object({
  id: z.string(),
  submitted_at: z.date(),
  status: z.enum(['Pending', 'Graded']),
  final_score: z.number().nullable(),
  mcq_score: z.number().nullable(),
  answers: z.array(AnswerSchema),
});

const QuestionStatsSchema = z.object({
  questionId: z.string(),
  skipPercentage: z.number(),
});

const EvaluationDataSchema = z.object({
  submission: SubmissionEvaluationSchema,
  student: UserOutputSchema,
  test: TestOutputSchema,
  questions: z.array(QuestionOutputSchema),
  questionStats: z.array(QuestionStatsSchema),
});

export type EvaluationData = z.infer<typeof EvaluationDataSchema>;

const getEvaluationDataFlow = ai.defineFlow({
    name: 'getEvaluationDataFlow',
    inputSchema: z.object({ submissionId: z.string() }),
    outputSchema: EvaluationDataSchema,
}, async ({ submissionId }) => {
    const submission = await db.getSubmissionById(submissionId);
    if (!submission) throw new Error('Submission not found.');

    const [student, test, questions, answers, allSubmissions] = await Promise.all([
        getUserById(submission.student_id),
        getTestById(submission.test_id),
        getQuestionsByTest(submission.test_id),
        db.getAnswersBySubmission(submissionId),
        db.getSubmissionsByTest(submission.test_id),
    ]);

    if (!student || !test) throw new Error('Associated student or test not found.');
    
    // Calculate skip statistics for each question
    const questionStats = await Promise.all(questions.map(async (q) => {
        let skipCount = 0;
        for (const sub of allSubmissions) {
            const subAnswers = await db.getAnswersBySubmission(sub.id);
            const answer = subAnswers.find(a => a.question_id === q.id);
            if (!answer || (answer.answer_text === null && !answer.answer_image_url)) {
                skipCount++;
            }
        }
        return {
            questionId: q.id,
            skipPercentage: allSubmissions.length > 0 ? (skipCount / allSubmissions.length) * 100 : 0,
        };
    }));


    return {
        submission: {
            ...submission,
            answers: answers.map(a => ({
                id: a.id,
                question_id: a.question_id,
                answer_text: a.answer_text,
                answer_image_url: a.answer_image_url,
            })),
        },
        student,
        test,
        questions,
        questionStats,
    };
});


export async function getEvaluationData(submissionId: string): Promise<EvaluationData> {
    return getEvaluationDataFlow({ submissionId });
}


const GradeSubmissionInputSchema = z.object({
    submissionId: z.string(),
    finalScore: z.number().min(0).max(100),
});

const gradeSubmissionFlow = ai.defineFlow({
    name: 'gradeSubmissionFlow',
    inputSchema: GradeSubmissionInputSchema,
    outputSchema: z.boolean(),
}, async ({ submissionId, finalScore }) => {
    await db.updateSubmission(submissionId, {
        final_score: finalScore,
        status: 'Graded',
    });
    return true;
});

export async function gradeSubmission(input: z.infer<typeof GradeSubmissionInputSchema>): Promise<boolean> {
    return gradeSubmissionFlow(input);
}
