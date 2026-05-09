import mongoose from 'mongoose';
import 'dotenv/config';
import User from './models/userModel.js';

const makeAdmin = async () => {
  try {
    const email = process.argv[2];
    
    if (!email) {
      console.log('❌ Please provide an email address.');
      console.log('Usage: node makeAdmin.js <email>');
      process.exit(1);
    }

    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB');

    const user = await User.findOne({ email });

    if (!user) {
      console.log(`❌ User with email ${email} not found.`);
      process.exit(1);
    }

    user.isAdmin = true;
    await user.save();

    console.log(`🎉 Success! User ${email} is now an ADMIN.`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

makeAdmin();
