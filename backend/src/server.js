const express = require('express');
const bodyParser = require('body-parser');
const Group = require('./db/group');
const User = require('./db/user');

const app = express();
app.use(require('morgan')('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const connectDB = require('./db/connection');
connectDB();

//TEST API---------
app.get('/', (req, res) => res.send("Hello world from " + process.env.ROLE));

//User APIs
app.get('/api/user', async(req,res) => {
    const users = await User.find();
    res.json(users);
});
app.post('/api/register', async(req,res) => { //body {username: string, password: string}
    const payload = req.body;
    const user = new User(payload);
    await user.save();
    res.status(201).send({message:"Register OK"}).end();
});

//Group APIs
app.get('/api/group', async(req,res) => { //getAllGroups
    const groups = await Group.find();
    res.json(groups);
});
app.post('/api/create-group', async(req,res) => { //body {groupName: string}
    let payload = req.body;
    payload.messages = [];
    payload.members = [];
    const group = new Group(payload);
    await group.save();
    res.status(201).send({message:"Create group OK"}).end();
});
app.get('/api/:groupName', async(req,res) => { //getGroupByGroupName
    const group = await Group.findOne({groupName: req.params.groupName});
    res.json(group);
});
app.get('/api/join-group/:groupName/:user', async(req,res) => {
    const user = await User.findOne({username:req.params.user});
    console.log(user);
    let payload = { userId: user._id, lastRead: new Date("1970-01-01T00:00:00Z"), joinedSince: new Date()};
    console.log(payload);
    await Group.update(
        {groupName: req.params.groupName},
        {$push: {members: payload}}
    );
    res.status(201).send({message:"join group OK"}).end();
});

//Message APIs
app.get('/api/msg/:groupName', async(req,res) => { //getAllGroupMsg
    const group = await Group.findOne({groupName: req.params.groupName});
    res.json({messages: group.messages});
});

app.post('/api/send-msg/:groupName/:sender', async(req,res) => { // body{message: string}
    let payload = req.body;
    const user = await User.findOne({username:req.params.sender});
    payload.sender = user._id;
    payload.timestamp = new Date();
    console.log(payload);
    await Group.update(
        {groupName: req.params.groupName, "members.userId": user._id},
        {
            $push: {messages: payload},
            $set: {"members.$.lastRead": new Date()} //set my own last read to NOW
        }
    );
    res.status(201).send({message:"send message OK"}).end();
});

//-----------------

//USABLE FUNCTIONS
async function getAllUser() {
    const users = await User.find();
    return users;
};

function createUser(username, password){
    const payload = {username, password}
    const user = new User(payload);
    await user.save();
};

async function getAllGroup(){
    const groups = await Group.find();
    return groups;
};

async function getGroupByGroupName(groupName) {
    const group = await Group.findOne({groupName: groupName});
    return group;
};

async function createGroup(groupName, userName) { //group creator's username
    const payload = {groupName, messages:[], members:[]};
    const group = new Group(payload);
    await group.save();
    joinGroup(groupName, userName);
};

async function joinGroup(groupName, userName) {
    const user = await User.findOne({username:userName});
    console.log(user);
    let payload = { userId: user._id, lastRead: new Date("1970-01-01T00:00:00Z"), joinedSince: new Date()};
    console.log(payload);
    await Group.update(
        {groupName: groupName},
        {$push: {members: payload}}
    );
};

async function getGroupMessage(groupName) {
    const group = await Group.findOne({groupName: groupName});
    res.json({messages: group.messages});
};

async function sendMessage(groupName, sender, message) {
    let payload = {message};
    const user = await User.findOne({username: sender});
    payload.sender = user._id;
    payload.timestamp = new Date();
    console.log(payload);
    await Group.update(
        {groupName: groupName, "members.userId": user._id},
        {
            $push: {messages: payload},
            $set: {"members.$.lastRead": new Date()} //set my own last read to NOW
        }
    );
    console.log("Send msg OK");
};

//-----------------


const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log("Chitty chat is listening on port", port);
})
