
import { Collection, ObjectId } from 'mongodb';
import { connectToDatabase } from './mongodb';
import type { User, Test, Submission, Answer, Question } from './types';

// Helper to get a collection
async function getCollection<T extends Document>(collectionName: string): Promise<Collection<T>> {
  const { db } = await connectToDatabase();
  return db.collection<T>(collectionName);
}


// Helper to convert MongoDB's ObjectId to a string for our types
function mapId<T extends { _id?: ObjectId }>(doc: T): Omit<T, '_id'> & { id: string } {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id!.toString() };
}

// Helper to convert string ID to ObjectId for queries
function toObjectId(id: string): ObjectId {
    try {
        return new ObjectId(id);
    } catch (error) {
        throw new Error(`Invalid ID format: ${id}`);
    }
}

export const db = {
  // User methods
  getUsers: async (): Promise<User[]> => {
    const usersCollection = await getCollection<any>('users');
    const users = await usersCollection.find().toArray();
    return users.map(mapId);
  },
  getUsersByRole: async (role: 'teacher' | 'student' | 'admin'): Promise<User[]> => {
    const usersCollection = await getCollection<any>('users');
    const users = await usersCollection.find({ role }).toArray();
    return users.map(mapId);
  },
  getUserByEmail: async (email: string): Promise<User | null> => {
    const usersCollection = await getCollection<any>('users');
    const user = await usersCollection.findOne({ email });
    return user ? mapId(user) : null;
  },
  getUserById: async (id: string): Promise<User | null> => {
    const usersCollection = await getCollection<any>('users');
    if (!ObjectId.isValid(id)) {
      return null;
    }
    const user = await usersCollection.findOne({ _id: toObjectId(id) });
    return user ? mapId(user) : null;
  },
  createUser: async (data: Omit<User, 'id'>): Promise<User> => {
    const usersCollection = await getCollection<any>('users');
    const result = await usersCollection.insertOne({ ...data });
    const insertedId = result.insertedId;
    const newUser = await usersCollection.findOne({_id: insertedId});
    if (!newUser) throw new Error("Failed to create and retrieve user.");
    return mapId(newUser);
  },
  updateUser: async (id: string, data: Partial<Omit<User, 'id' | 'role'>>): Promise<User> => {
    const usersCollection = await getCollection<any>('users');
    const result = await usersCollection.findOneAndUpdate(
      { _id: toObjectId(id) },
      { $set: data },
      { returnDocument: 'after' }
    );
    if (!result) throw new Error("User not found");
    return mapId(result);
  },

  // Test methods
  getTests: async (): Promise<Test[]> => {
    const testsCollection = await getCollection<any>('tests');
    const tests = await testsCollection.find().toArray();
    return tests.map(mapId);
  },
  getTestsByTeacher: async (teacherId: string): Promise<Test[]> => {
    const testsCollection = await getCollection<any>('tests');
    const tests = await testsCollection.find({ created_by: teacherId }).toArray();
    return tests.map(mapId);
  },
  getTestById: async (id: string): Promise<Test | null> => {
    const testsCollection = await getCollection<any>('tests');
    const test = await testsCollection.findOne({ _id: toObjectId(id) });
    return test ? mapId(test) : null;
  },
  createTest: async (data: Omit<Test, 'id'>): Promise<Test> => {
    const testsCollection = await getCollection<any>('tests');
    const result = await testsCollection.insertOne({ ...data });
    const newTest = await testsCollection.findOne({_id: result.insertedId});
    if (!newTest) throw new Error("Failed to create and retrieve test.");
    return mapId(newTest);
  },
  deleteTest: async (testId: string): Promise<boolean> => {
    const testOid = toObjectId(testId);
    
    const submissionsCollection = await getCollection<any>('submissions');
    const submissionsToDelete = await submissionsCollection.find({ test_id: testId }).project({ _id: 1 }).toArray();
    const submissionIds = submissionsToDelete.map(s => s._id.toString());

    if (submissionIds.length > 0) {
      const answersCollection = await getCollection<any>('answers');
      await answersCollection.deleteMany({ submission_id: { $in: submissionIds } });
      
      await submissionsCollection.deleteMany({ test_id: testId });
    }
    
    const questionsCollection = await getCollection<any>('questions');
    await questionsCollection.deleteMany({ test_id: testId });
    
    const testsCollection = await getCollection<any>('tests');
    const result = await testsCollection.deleteOne({ _id: testOid });

    return result.deletedCount === 1;
  },


  // Question methods
  getQuestionsByTest: async (testId: string): Promise<Question[]> => {
    const questionsCollection = await getCollection<any>('questions');
    const questions = await questionsCollection.find({ test_id: testId }).toArray();
    return questions.map(mapId);
  },
  createQuestion: async (data: Omit<Question, 'id'>): Promise<Question> => {
    const questionsCollection = await getCollection<any>('questions');
    const result = await questionsCollection.insertOne({ ...data });
    const newQuestion = await questionsCollection.findOne({_id: result.insertedId});
    if (!newQuestion) throw new Error("Failed to create question.");
    return mapId(newQuestion);
  },

  // Submission methods
  getSubmissionsByTest: async (testId: string): Promise<Submission[]> => {
    const submissionsCollection = await getCollection<any>('submissions');
    const submissions = await submissionsCollection.find({ test_id: testId }).toArray();
    return submissions.map(mapId);
  },
   getSubmissionsByStudent: async (studentId: string): Promise<Submission[]> => {
    const submissionsCollection = await getCollection<any>('submissions');
    const submissions = await submissionsCollection.find({ student_id: studentId }).toArray();
    return submissions.map(mapId);
  },
  getSubmissionById: async (id: string): Promise<Submission | null> => {
    const submissionsCollection = await getCollection<any>('submissions');
    const submission = await submissionsCollection.findOne({ _id: toObjectId(id) });
    return submission ? mapId(submission) : null;
  },
  createSubmission: async (data: Omit<Submission, 'id' | 'answers'> & { answers: Omit<Answer, 'id' | 'submission_id'>[] }): Promise<Submission> => {
    const submissionsCollection = await getCollection<any>('submissions');
    const answersCollection = await getCollection<any>('answers');

    const { answers, ...submissionData } = data;
    
    const submissionResult = await submissionsCollection.insertOne({ ...submissionData });
    const submissionId = submissionResult.insertedId.toString();

    if (answers && answers.length > 0) {
        const answersWithSubmissionId = answers.map(ans => ({
            ...ans,
            submission_id: submissionId
        }));
        await answersCollection.insertMany(answersWithSubmissionId);
    }
    const newSubmission = await submissionsCollection.findOne({_id: submissionResult.insertedId});
    if(!newSubmission) throw new Error("Failed to create submission");

    return mapId(newSubmission);
  },
  updateSubmission: async (id: string, data: Partial<Omit<Submission, 'id' | 'answers'>>): Promise<Submission> => {
    const submissionsCollection = await getCollection<any>('submissions');
    const result = await submissionsCollection.findOneAndUpdate(
      { _id: toObjectId(id) },
      { $set: data },
      { returnDocument: 'after' }
    );
    if (!result) throw new Error("Submission not found");
    return mapId(result);
  },

  // Answer methods
  getAnswersBySubmission: async (submissionId: string): Promise<Answer[]> => {
    const answersCollection = await getCollection<any>('answers');
    const answers = await answersCollection.find({ submission_id: submissionId }).toArray();
    return answers.map(mapId);
  },
};
