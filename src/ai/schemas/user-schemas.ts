import { z } from 'zod';

export const UserOutputSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  role: z.enum(['student', 'teacher', 'admin']),
  profile_pic_url: z.string().optional(),
  status: z.enum(['active', 'banned', 'muted', 'locked']).optional().default('active'),
  class: z.string().optional(),
  section: z.string().optional(),
});
