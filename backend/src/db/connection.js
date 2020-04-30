require('dotenv').config()

const mongoose = require('mongoose');

const URI = process.env.MONGO_URI;
console.log("URI is ", URI);

const connectDB = async() => {
    await mongoose.connect(URI, {
        useUnifiedTopology: true,
        useNewUrlParser: true
    });
    console.log(`connected to ${URI}`);
}

module.exports = connectDB;