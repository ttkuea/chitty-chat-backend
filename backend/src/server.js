const express = require('express');
const bodyParser = require('body-parser');
const Group = require('./db/group');
const User = require('./db/user');
const ObjectID = require('mongodb').ObjectID;

const app = express();
app.use(require('morgan')('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const connectDB = require('./db/connection');
connectDB();

//SOCKET
const groupRoom = 'g_broadcast_room';

//TEST API---------
app.get('/', (req, res) => res.send("Hello world from " + process.env.ROLE));
app.get('/flap', (req, res) => {io.sockets.emit('login response', 'borad castttt'), res.send('fuck')})

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
    joinGroup(req.params.groupName, req.params.user);
    res.status(201).send({message:"join group OK"}).end();
});

//Message APIs
app.get('/api/msg/:groupName', async(req,res) => { //getAllGroupMsg
    const group = await Group.findOne({groupName: req.params.groupName});
    res.json({messages: group.messages});
});

app.get('/api/msg/:groupName/:username', async(req,res) => {
    res.json(await getGroupMessage(req.params.groupName, req.params.username));
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
    io.emit()
});

//-----------------

//USABLE FUNCTIONS
async function getAllUser() {
    const users = await User.find();
    return users;
};

async function createUser(username, password) {
    const payload = {username, password}
    const user = new User(payload);
    await user.save();
};

async function getUsername(userId) {
    return (await User.findOne({_id: userId})).username;
}

async function getAllGroup() {
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

async function getGroupMessage(groupName,userName) { // GetGroupMessage By Username -> 
    // have async problem need to call getGroupMessage.then(fucntion(result) {//do sth}) instead
    const group = await Group.findOne({groupName: groupName});
    const groupMessages = group.messages;
    const groupMembers = group.members;
    const user = await User.findOne({username: userName});

    let lastRead;
    for (let member in groupMembers){
        if (groupMembers[member].userId.equals(user._id)){
            lastRead = group.members[member].lastRead;
        }
    }

    await Group.updateOne(
        {groupName: groupName, "members.userId": user._id},
        { $set: {"members.$.lastRead": new Date()} } //set my own last read to NOW
    );

    let messages = {Read: [], Unread: []};
    for (let message in groupMessages){
        let msg = groupMessages[message];
        msg.username = await getUsername(msg.sender);
        // console.log(msg);
        if (msg.timestamp > lastRead){
            messages.Unread.push(msg);
        }else{
            messages.Read.push(msg)
        }
    }
    // console.log(messages);
    return messages;   
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

async function joinGroup(groupName, username) {
    const user = await User.findOne({ username: username });
    console.log(user);
    let payload = { userId: user._id, lastRead: new Date("1970-01-01T00:00:00Z"), joinedSince: new Date() };
    console.log(payload);
    await Group.update(
        { groupName: groupName },
        { $push: { members: payload } }
    );
}

//-----------------


const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log("Chitty chat is listening on port", port);
})

// const gg = getGroupMessage("group1","user1").then(function(result) {console.log("return msg", result);});  //use then instead if you use this func


//----------------- SOCKET
var io = require('socket.io').listen(server);
io.on('connection', socket => {
    console.log('socket connect: ', socket.id)
    
    socket.on('client_getGroupInfo', (res) => {
        getAllGroup().then((groups) => {
            socket.emit('server_emitGroupInfo',groups)
        });
        
        socket.join(groupRoom);
        
    })

    socket.on('client_createGroup', (req) => {
        
        if (req) {
            createGroup(req.groupName);
        }
        getAllGroup().then((groups) => {
            io.to(groupRoom).emit('server_emitGroupInfo', groups);
        });
        
    })

    socket.on('client_joinGroup', (req) => {
        joinGroup(req.groupName, req.username);
    })

    // socket.on('client_exitGroupInfo', (req) => {
    //     console.log('socket exit groupInfo: ', socket.id);
    // })
    
});