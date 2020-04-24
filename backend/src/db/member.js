const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const membersSchema = new Schema({
    username: String,
    joinedSince: Date,
    lastRead: Date
});
module.exports = members = mongoose.model('members', membersSchema);