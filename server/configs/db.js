import mongoose from "mongoose";

const connectDB = async ()=>{
  try {
    mongoose.connection.on('connected',()=> console.log("Database Connected")
    );
    await mongoose.connect(`${process.env.MONGODB_URI}/grocify`)
  } catch (error) {
    console.error(error.message);
  }
}

// so that we can use this function in any file
export default connectDB;