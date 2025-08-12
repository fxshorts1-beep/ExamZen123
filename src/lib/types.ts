

export type User = {
  id: string;
  username: string;
  email: string;
  password?: string;
  role: 'teacher' | 'student' | 'admin';
  profile_pic_url?: string;
  status?: 'active' | 'banned' | 'muted' | 'locked';
  class?: string; // e.g., "10", "12"
  section?: string; // e.g., "A", "B"
};

export type Test = {
  id: string;
  title: string;
  description: string;
  time_limit: number; // in minutes
  created_by: string; // teacher user id
  subject: string;
};

export type Question = {
  id: string;
  test_id: string;
  question_text: string;
  type: 'mcq' | 'subjective';
  marks: number;
  answer_format?: 'text' | 'image'; // For subjective questions
  options?: string[]; // For MCQ
  correct_answer?: string; // For MCQ
  image_url?: string;
};

export type Answer = {
  id: string;
  submission_id: string;
  question_id: string;
  answer_text: string | null; // null if skipped
  answer_image_url?: string | null; // For subjective image uploads
  is_correct?: boolean; // For MCQ, auto-graded
};

export type Submission = {
  id: string;
  test_id: string;
  student_id: string;
  submitted_at: Date;
  mcq_score: number | null;
  final_score: number | null;
  status: 'Pending' | 'Graded';
};
