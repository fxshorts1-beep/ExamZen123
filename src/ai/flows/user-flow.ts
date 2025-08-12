
'use server';
/**
 * @fileOverview User management flows for registration and login.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/db';
import { User } from '@/lib/types';

// Schema for user registration (only students)
const RegisterStudentInputSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  role: z.literal('student'),
  password: z.string(),
  class: z.string(),
  section: z.string(),
});
export type RegisterStudentInput = z.infer<typeof RegisterStudentInputSchema>;

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
export type UserOutput = z.infer<typeof UserOutputSchema>;


// Schema for user login
const LoginUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginUserInput = z.infer<typeof LoginUserInputSchema>;

// Flow for student registration
const registerStudentFlow = ai.defineFlow(
  {
    name: 'registerStudentFlow',
    inputSchema: RegisterStudentInputSchema,
    outputSchema: UserOutputSchema,
  },
  async (input) => {
    const existingUser = await db.getUserByEmail(input.email);
    if (existingUser) {
      throw new Error('User with this email already exists.');
    }
    // Explicitly set the role to student for security
    const newUser = await db.createUser({ ...input, role: 'student' });
    return newUser;
  }
);

export async function registerStudent(input: RegisterStudentInput): Promise<UserOutput> {
  return registerStudentFlow(input);
}

// Schema for creating a teacher (admin only)
const CreateTeacherInputSchema = z.object({
    username: z.string(),
    email: z.string().email(),
});
export type CreateTeacherInput = z.infer<typeof CreateTeacherInputSchema>;

// Flow for creating a teacher
const createTeacherFlow = ai.defineFlow({
    name: 'createTeacherFlow',
    inputSchema: CreateTeacherInputSchema,
    outputSchema: UserOutputSchema,
}, async (input) => {
    const existingUser = await db.getUserByEmail(input.email);
    if (existingUser) {
        throw new Error('Teacher with this email already exists.');
    }
    const newTeacher = await db.createUser({ ...input, role: 'teacher', password: 'password' }); // Default password
    return newTeacher;
});

export async function createTeacher(input: CreateTeacherInput): Promise<UserOutput> {
    return createTeacherFlow(input);
}


// Flow for user login
const loginUserFlow = ai.defineFlow(
  {
    name: 'loginUserFlow',
    inputSchema: LoginUserInputSchema,
    outputSchema: z.union([UserOutputSchema, z.null()]),
  },
  async (input) => {
    const user = await db.getUserByEmail(input.email);
    if (!user || user.password !== input.password) {
        return null;
    }
    return user;
  }
);

export async function loginUser(input: LoginUserInput): Promise<UserOutput | null> {
    return loginUserFlow(input);
}

// Flow to get all teachers
const getTeachersFlow = ai.defineFlow({
    name: 'getTeachersFlow',
    inputSchema: z.void(),
    outputSchema: z.array(UserOutputSchema),
}, async () => {
    const teachers = await db.getUsersByRole('teacher');
    return teachers;
});

export async function getTeachers(): Promise<UserOutput[]> {
    return getTeachersFlow();
}

// Flow to get all students
const getStudentsFlow = ai.defineFlow({
    name: 'getStudentsFlow',
    inputSchema: z.void(),
    outputSchema: z.array(UserOutputSchema),
}, async () => {
    const students = await db.getUsersByRole('student');
    return students;
});

export async function getStudents(): Promise<UserOutput[]> {
    return getStudentsFlow();
}


// Schema for updating a user's profile
const UpdateUserInputSchema = z.object({
  id: z.string(),
  username: z.string().optional(),
  email: z.string().email().optional(),
  profile_pic_url: z.string().optional(),
});
export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;

// Flow for updating a user
const updateUserFlow = ai.defineFlow({
    name: 'updateUserFlow',
    inputSchema: UpdateUserInputSchema,
    outputSchema: UserOutputSchema,
}, async ({ id, ...updateData }) => {
    const updatedUser = await db.updateUser(id, updateData);
    return updatedUser;
});

export async function updateUser(input: UpdateUserInput): Promise<UserOutput> {
    return updateUserFlow(input);
}

// Schema for updating password
const UpdatePasswordInputSchema = z.object({
  userId: z.string(),
  currentPassword: z.string(),
  newPassword: z.string(),
});
export type UpdatePasswordInput = z.infer<typeof UpdatePasswordInputSchema>;

// Flow for updating password
const updatePasswordFlow = ai.defineFlow({
    name: 'updatePasswordFlow',
    inputSchema: UpdatePasswordInputSchema,
    outputSchema: z.boolean(),
}, async ({ userId, currentPassword, newPassword }) => {
    const user = await db.getUserById(userId);
    if (!user || user.password !== currentPassword) {
        throw new Error('Current password is not correct.');
    }
    await db.updateUser(userId, { password: newPassword });
    return true;
});

export async function updatePassword(input: UpdatePasswordInput): Promise<boolean> {
    return updatePasswordFlow(input);
}


// Flow for getting a user by ID
const getUserByIdFlow = ai.defineFlow({
    name: 'getUserByIdFlow',
    inputSchema: z.object({ id: z.string() }),
    outputSchema: z.union([UserOutputSchema, z.null()]),
}, async ({ id }) => {
    const user = await db.getUserById(id);
    return user;
});

export async function getUserById(id: string): Promise<UserOutput | null> {
    return getUserByIdFlow({ id });
}


// Admin actions
const UpdateUserStatusInputSchema = z.object({
    userId: z.string(),
    status: z.enum(['active', 'banned', 'muted', 'locked']),
});

const updateUserStatusFlow = ai.defineFlow({
    name: 'updateUserStatusFlow',
    inputSchema: UpdateUserStatusInputSchema,
    outputSchema: UserOutputSchema,
}, async ({ userId, status }) => {
    const updatedUser = await db.updateUser(userId, { status });
    return updatedUser;
});

export async function updateUserStatus(input: z.infer<typeof UpdateUserStatusInputSchema>): Promise<UserOutput> {
    return updateUserStatusFlow(input);
}

const AdminUpdatePasswordInputSchema = z.object({
    userId: z.string(),
    newPassword: z.string(),
});

const adminUpdatePasswordFlow = ai.defineFlow({
    name: 'adminUpdatePasswordFlow',
    inputSchema: AdminUpdatePasswordInputSchema,
    outputSchema: z.boolean(),
}, async ({ userId, newPassword }) => {
    await db.updateUser(userId, { password: newPassword });
    return true;
});

export async function adminUpdatePassword(input: z.infer<typeof AdminUpdatePasswordInputSchema>): Promise<boolean> {
    return adminUpdatePasswordFlow(input);
}
