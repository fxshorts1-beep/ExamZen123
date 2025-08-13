import { z } from 'zod';

export const TestOutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    subject: z.string(),
    time_limit: z.number(),
    created_by: z.string(),
});
