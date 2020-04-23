const mongoose = require('mongoose');

const URI = process.env.MONGO_URI;

const connectDB = async() => {
    await mongoose.connect(URI, {
        useUnifiedTopology: true,
        useNewUrlParser: true
    });
    console.log('DB has been connected!');
}

module.exports = connectDB;