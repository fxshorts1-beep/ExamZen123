
import { Db, MongoClient } from 'mongodb'
import { seedAdminUser } from './seed';

const MONGODB_URI = process.env.MONGODB_URI!
const DB_NAME = process.env.DB_NAME!

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

if (!DB_NAME) {
  throw new Error('Please define the DB_NAME environment variable inside .env.local')
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  const client = new MongoClient(MONGODB_URI);

  await client.connect();
  const db = client.db(DB_NAME);

  // Seed the database with the admin user if it doesn't exist
  await seedAdminUser(db);

  cachedClient = client
  cachedDb = db

  return { client, db }
}
