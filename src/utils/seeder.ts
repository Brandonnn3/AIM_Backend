import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../modules/user/user.model';
// Load environment variables
dotenv.config();

// TODO : Seeder kivabe run kore shikhte hobe .. 

// Sample data for default users
const usersData = [
  {
    first_name: 'Super',
    last_name: 'Admin',
    email: 'superadmin@gmail.com',
    password: '$2a$08$cUQ3uMdbQjlyDF/dgn5mNuEt9fLJZqq8TaT9aKabrFuG5wND3/mPO', // Hashed password
    phone: '1234567890',
    branch: 'Engineering',
    specialty: 'Software Development',
    current_status: 'Active Duty',
    status: 'Active',
    instagram: 'johndoe',
    visibility: 'visible',
    matched_with_instagram: false,
    description: 'Software engineer with 5 years of experience.',
    role: 'super_admin',
    isEmailVerified: true,
    isDeleted: false,
    isOnline: false,
    isResetPassword: false,
    secondary_email: 'john.doe.secondary@gmail.com',
    approved: true,
  },
  {
    first_name: 'Testing',
    last_name: 'admin',
    email: 'adminh@gmail.com',
    password: '$2a$08$cUQ3uMdbQjlyDF/dgn5mNuEt9fLJZqq8TaT9aKabrFuG5wND3/mPO', // Hashed password
    phone: '0987654321',
    branch: 'Marketing',
    specialty: 'Digital Marketing',
    current_status: 'Active Duty',
    status: 'Active',
    instagram: 'janesmith',
    visibility: 'visible',
    matched_with_instagram: false,
    description: 'Digital marketer with expertise in SEO and social media.',
    role: 'admin',
    isEmailVerified: true,
    isDeleted: false,
    isOnline: false,
    isResetPassword: false,
    secondary_email: 'jane.smith.secondary@gmail.com',
    approved: true,
  },
  {
    first_name: 'Testing',
    last_name: 'Mentor',
    email: 'mentor@gmail.com',
    password: '$2a$08$cUQ3uMdbQjlyDF/dgn5mNuEt9fLJZqq8TaT9aKabrFuG5wND3/mPO', // Hashed password
    phone: '1122334455',
    profile_image: {
      imageUrl: 'https://example.com/alice.jpg',
      file: { filename: 'alice.jpg', size: 1024, mimetype: 'image/jpeg' },
    },
    branch: 'Finance',
    specialty: 'Investment Banking',
    current_status: 'Active Duty',
    status: 'Active',
    instagram: 'alicejohnson',
    visibility: 'visible',
    matched_with_instagram: false,
    description: 'Investment banker with a focus on mergers and acquisitions.',
    role: 'mentor',
    isEmailVerified: true,
    isDeleted: false,
    isOnline: false,
    isResetPassword: false,
    secondary_email: 'alice.johnson.secondary@gmail.com',
    approved: true,
  },
  {
    first_name: 'Testing',
    last_name: 'Mentee',
    email: 'bob.brown@gmail.com',
    password: '$2a$08$cUQ3uMdbQjlyDF/dgn5mNuEt9fLJZqq8TaT9aKabrFuG5wND3/mPO', // Hashed password
    phone: '5566778899',
    branch: 'Human Resources',
    specialty: 'Talent Acquisition',
    current_status: 'Active Duty',
    status: 'Active',
    instagram: 'bobbrown',
    visibility: 'visible',
    matched_with_instagram: false,
    description:
      'HR professional specializing in talent acquisition and retention.',
    role: 'mentee',
    isEmailVerified: true,
    isDeleted: false,
    isOnline: false,
    isResetPassword: false,
    secondary_email: 'bob.brown.secondary@gmail.com',
    approved: true,
  },
];

// Function to drop the entire database
const dropDatabase = async () => {
  try {
    await mongoose.connection.dropDatabase();
    console.log('------------> Database dropped successfully! <------------');
  } catch (err) {
    console.error('Error dropping database:', err);
  }
};

// Function to seed users
const seedUsers = async () => {
  try {
    await User.deleteMany();
    await User.insertMany(usersData);
    console.log('Users seeded successfully!');
  } catch (err) {
    console.error('Error seeding users:', err);
  }
};

// Connect to MongoDB
const connectToDatabase = async () => {
  try {
    const dbUrl = process.env.MONGODB_URL;
    if (!dbUrl) throw new Error('MONGODB_URL not set in environment variables');

    await mongoose.connect(dbUrl);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1); // Exit process with failure
  }
};

// Main function to seed the database
const seedDatabase = async () => {
  try {
    await connectToDatabase();
    await dropDatabase();
    await seedUsers();
    console.log('--------------> Database seeding completed <--------------');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    mongoose.disconnect().then(() => console.log('Disconnected from MongoDB'));
  }
};

// Execute seeding
seedDatabase();
