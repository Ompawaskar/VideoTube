import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}`);
        console.log("Mongo Db Connected" , connectionInstance.connection.host);
    } catch (error) {
        console.error("Error connecting to MongoDB",error);
        process.exit(1)
    }
}

export default connectDB