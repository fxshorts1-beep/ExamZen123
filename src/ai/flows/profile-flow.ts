
'use server';
/**
 * @fileOverview A flow for getting user info to display on the profile page.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getUserById } from './user-flow';

const ProfileInputSchema = z.object({
  userId: z.string(),
});

const ProfileOutputSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.string(),
  profile_pic_url: z.string().optional(),
  class: z.string().optional(),
  section: z.string().optional(),
});

export type ProfileOutput = z.infer<typeof ProfileOutputSchema>;

// This flow just wraps getUserById for now, but could be expanded later
// with more profile-specific logic.
const getProfileFlow = ai.defineFlow(
  {
    name: 'getProfileFlow',
    inputSchema: ProfileInputSchema,
    outputSchema: z.union([ProfileOutputSchema, z.null()]),
  },
  async ({ userId }) => {
    const user = await getUserById(userId);
    if (!user) {
      return null;
    }
    return user;
  }
);

export async function getProfile(userId: string): Promise<ProfileOutput | null> {
  return getProfileFlow({ userId });
}
