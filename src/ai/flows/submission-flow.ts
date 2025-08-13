
'use server';
/**
 * @fileOverview Submission management flows for retrieving and creating test submissions.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/db';
import { Answer, Submission, Test, User } from '@/lib/types';
import { getQuestionsByTest } from './question-flow';

// Schema for the output of a submission, including student and test details
const SubmissionDetailsSchema = z.object({
    id: z.string(),
    test_id: z.string(),
    submitted_at: z.string(), // Changed to string
    final_score: z.number().nullable(),
    status: z.enum(['Pending', 'Graded']),
    student: z.object({
        id: z.string(),
        username: z.string(),
        email: z.string(),
        profile_pic_url: z.string().optional(),
    }),
    test: z.object({
        id: z.string(),
        title: z.string(),
    }).optional(),
});

export type SubmissionDetails = z.infer<typeof SubmissionDetailsSchema>;

// Flow for getting submissions for a specific test
const getSubmissionsByTestFlow = ai.defineFlow({
    name: 'getSubmissionsByTestFlow',
    inputSchema: z.object({ testId: z.string() }),
    outputSchema: z.array(SubmissionDetailsSchema),
}, async ({ testId }) => {
    const submissions = await db.getSubmissionsByTest(testId);
    
    const detailedSubmissions = await Promise.all(
        submissions.map(async (submission) => {
            const student = await db.getUserById(submission.student_id);
            if (!student) {
                // Handle case where student is not found, maybe skip or throw
                return null;
            }
            return {
                id: submission.id,
                test_id: submission.test_id,
                submitted_at: submission.submitted_at.toISOString(),
                final_score: submission.final_score,
                status: submission.status,
                student: {
                    id: student.id,
                    username: student.username,
                    email: student.email,
                    profile_pic_url: student.profile_pic_url,
                },
            };
        })
    );

    // Filter out any null results if a student wasn't found
    return detailedSubmissions.filter((sub): sub is SubmissionDetails => sub !== null);
});

export async function getSubmissionsByTest(testId: string): Promise<SubmissionDetails[]> {
    return getSubmissionsByTestFlow({ testId });
}

// Flow for getting all submissions for all tests by a specific teacher
const getAllSubmissionsByTeacherFlow = ai.defineFlow({
    name: 'getAllSubmissionsByTeacherFlow',
    inputSchema: z.object({ teacherId: z.string() }),
    outputSchema: z.array(SubmissionDetailsSchema),
}, async ({ teacherId }) => {
    const teacherTests = await db.getTestsByTeacher(teacherId);
    let allSubmissions: SubmissionDetails[] = [];

    for (const test of teacherTests) {
        const submissions = await db.getSubmissionsByTest(test.id);
        const detailedSubmissions = await Promise.all(
            submissions.map(async (submission) => {
                const student = await db.getUserById(submission.student_id);
                if (!student) return null;
                return {
                    id: submission.id,
                    test_id: submission.test_id,
                    submitted_at: submission.submitted_at.toISOString(),
                    final_score: submission.final_score,
                    status: submission.status,
                    student: {
                        id: student.id,
                        username: student.username,
                        email: student.email,
                        profile_pic_url: student.profile_pic_url,
                    },
                    test: {
                        id: test.id,
                        title: test.title,
                    },
                };
            })
        );
        allSubmissions.push(...detailedSubmissions.filter((sub): sub is SubmissionDetails => sub !== null));
    }

    // Sort submissions by most recent
    allSubmissions.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

    return allSubmissions;
});

export async function getAllSubmissionsByTeacher(teacherId: string): Promise<SubmissionDetails[]> {
    return getAllSubmissionsByTeacherFlow({ teacherId });
}


// Schema for submitting a test
const SubmitTestInputSchema = z.object({
  testId: z.string(),
  studentId: z.string(),
  answers: z.array(z.object({
    questionId: z.string(),
    text: z.string().optional(),
    imageUrl: z.string().optional(),
  })),
});

export type SubmitTestInput = z.infer<typeof SubmitTestInputSchema>;

const submitTestFlow = ai.defineFlow({
    name: 'submitTestFlow',
    inputSchema: SubmitTestInputSchema,
    outputSchema: z.string(),
}, async ({ testId, studentId, answers }) => {
    const questions = await getQuestionsByTest(testId);
    let correctMcqCount = 0;
    let totalMcqCount = 0;

    const answerData: Omit<Answer, 'id' | 'submission_id'>[] = answers.map(ans => {
        const question = questions.find(q => q.id === ans.questionId);
        let isCorrect: boolean | undefined = undefined;

        if (question?.type === 'mcq') {
            totalMcqCount++;
            if (question.correct_answer === ans.text) {
                correctMcqCount++;
                isCorrect = true;
            } else {
                isCorrect = false;
            }
        }
        
        return {
            question_id: ans.questionId,
            answer_text: ans.text || null,
            answer_image_url: ans.imageUrl || null,
            is_correct: isCorrect,
        };
    });
    
    const mcqScore = totalMcqCount > 0 ? Math.round((correctMcqCount / totalMcqCount) * 100) : null;
    
    // Check if there are any subjective questions
    const hasSubjective = questions.some(q => q.type === 'subjective');
    
    const newSubmission = await db.createSubmission({
        test_id: testId,
        student_id: studentId,
        submitted_at: new Date(),
        mcq_score: mcqScore,
        // If only MCQs, the test can be auto-graded
        final_score: !hasSubjective ? mcqScore : null, 
        status: !hasSubjective ? 'Graded' : 'Pending',
        answers: answerData,
    });

    return newSubmission.id;
});

export async function submitTest(input: SubmitTestInput): Promise<string> {
    return submitTestFlow(input);
}


// Flow for getting submissions for a specific student
const getSubmissionsByStudentFlow = ai.defineFlow({
    name: 'getSubmissionsByStudentFlow',
    inputSchema: z.object({ studentId: z.string() }),
    outputSchema: z.array(SubmissionDetailsSchema),
}, async ({ studentId }) => {
    const submissions = await db.getSubmissionsByStudent(studentId);
    
    const detailedSubmissions = await Promise.all(
        submissions.map(async (submission) => {
            const [student, test] = await Promise.all([
                db.getUserById(submission.student_id),
                db.getTestById(submission.test_id),
            ]);
            if (!student || !test) return null;

            return {
                id: submission.id,
                test_id: submission.test_id,
                submitted_at: submission.submitted_at.toISOString(),
                final_score: submission.final_score,
                status: submission.status,
                student: {
                    id: student.id,
                    username: student.username,
                    email: student.email,
                    profile_pic_url: student.profile_pic_url,
                },
                test: {
                    id: test.id,
                    title: test.title,
                }
            };
        })
    );
    return detailedSubmissions.filter((sub): sub is SubmissionDetails => sub !== null)
                              .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
});

export async function getSubmissionsByStudent(studentId: string): Promise<SubmissionDetails[]> {
    return getSubmissionsByStudentFlow({ studentId });
}
