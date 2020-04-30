const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const groupSchema = new Schema({
    // _id: Schema.Types.ObjectId,
    groupName : String,
    messages: [{
        sender: {type: Schema.Types.ObjectId, ref: 'User'},
        message: String,
        timestamp: Date
    }],
    members: [{
        userId: {type: Schema.Types.ObjectId, ref: 'User'},
        lastRead: Date,
        joinedSince: Date
    }]

});
module.exports = Group = mongoose.model('Group', groupSchema);