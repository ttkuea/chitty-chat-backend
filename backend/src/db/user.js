const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const userSchema = new Schema({
    // _id: Schema.Types.ObjectId,
    username: String,
    password: String,
    // displayName: String
});
module.exports = User = mongoose.model('User', userSchema);