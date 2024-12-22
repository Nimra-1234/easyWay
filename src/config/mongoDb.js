
// import mongoose from 'mongoose';

// const connectMongoDB = async (attempts = 5) => {
//     const options = {
//         serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
//         family: 4 // Use IPv4, skip trying IPv6
//     };

//     while (attempts > 0) {
//         try {
//             await mongoose.connect('mongodb://127.0.0.1:27017/gtfs_analysis', options);
//             console.log('MongoDB connected successfully');
//             return; // If successful, exit the function
//         } catch (error) {
//             console.error(`MongoDB connection error: ${error}. Attempts left: ${attempts - 1}`);
//             attempts--;
//             if (attempts === 0) {
//                 console.error('Error: MongoDB connection refused. Please check if MongoDB is running.');
//                 process.exit(1); // Exit after all attempts fail
//             }
//             await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
//         }
//     }
// };

// connectMongoDB();

import mongoose from 'mongoose';

export const connectMongoDB = async (attempts = 5) => {
    const options = {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        family: 4 // Use IPv4, skip trying IPv6
    };

    while (attempts > 0) {
        try {
            await mongoose.connect('mongodb://127.0.0.1:27017/gtfs_analysis', options);
            console.log('MongoDB connected successfully');
            return; // If successful, exit the function
        } catch (error) {
            console.error(`MongoDB connection error: ${error}. Attempts left: ${attempts - 1}`);
            attempts--;
            if (attempts === 0) {
                console.error('Error: MongoDB connection refused. Please check if MongoDB is running.');
                process.exit(1); // Exit after all attempts fail
            }
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
        }
    }
};


