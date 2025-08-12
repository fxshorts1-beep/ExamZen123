
import type { Db } from 'mongodb';

export async function seedAdminUser(db: Db) {
    const usersCollection = db.collection('users');
    const adminEmail = 'admin@example.com';
    const adminExists = await usersCollection.findOne({ email: adminEmail });

    if (!adminExists) {
        console.log('Admin user not found, creating one...');
        await usersCollection.insertOne({
            username: 'Admin User',
            email: adminEmail,
            password: 'password', // In a real app, this should be hashed
            role: 'admin',
            status: 'active',
        });
        console.log('Admin user created successfully.');
    }
}
