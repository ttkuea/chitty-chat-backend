const express = require('express');
const bodyParser = require('body-parser');
const Group = require('./db/group');
const User = require('./db/user');
const ObjectID = require('mongodb').ObjectID;

const app = express();
app.use(require('morgan')('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept'
    );
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
    next();
});

const connectDB = require('./db/connection');
connectDB();

//SOCKET
const groupRoom = 'g_broadcast_room';

//TEST API---------
app.get('/', (req, res) => res.send("Hello world from " + process.env.ROLE));
app.get('/flap', (req, res) => {io.sockets.emit('login response', 'borad castttt'), res.send('fuck')})

//User APIs
app.get('/api/all-user', async(req,res) => {
    const users = await User.find();
    res.json(users);
});
app.post('/api/register', async(req,res) => { //body {username: string, password: string}
    const queryuser = await User.findOne({username: req.body.username});
    if (queryuser == null){
        const payload = req.body;
        const user = new User(payload);
        await user.save();
        res.status(201).send({message: "Register OK"}).end();
    } else {
        res.status(400).send({message: "Invalid username"}).end();
    }


});

app.post('/api/login', async(req,res) => { //body {username: string, password: string}
    const user = await User.findOne({username: req.body.username});
    console.log(user);
    if (user != null){
        if (user.password === req.body.password){
            res.status(200).send({message: "Login Success", user}).end();
        } else {
            res.status(400).send({message: "Invalid username or password"}).end();
        }
    } else {
        res.status(400).send({message: "Invalid username or password"}).end();
    }
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

app.get('/api/exit-group/:groupName/:username', async(req,res) => {
    // console.log(req.params.groupName, req.params.username);
    await exitGroup(req.params.groupName, req.params.username);
    res.status(200).send({message:"exit group OK"}).end();
})

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

const usernameMemo = {};

async function getUsername(userId) {
    if (userId in usernameMemo) return usernameMemo[userId];
    return usernameMemo[userId] = (await User.findOne({_id: userId})).username;
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
        const msg = groupMessages[message].toObject();
        let username = await getUsername(msg.sender);
        msg.sender = username; // frontend don't use username instead of objectId

        if (msg.timestamp > lastRead){
            messages.Unread.push(msg);
        }else{
            messages.Read.push(msg)
        }
    }
    console.log(messages);
    return messages;   
};

async function updateMyLastRead(groupName, username) {
    const group = await Group.findOne({ groupName: groupName }); //UNTEST
    const user = await User.findOne({ username: username });
    await Group.updateOne(
        { groupName: groupName, "members.userId": user._id },
        { $set: { "members.$.lastRead": new Date() } } //set my own last read to NOW
    );
}

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
    return +new Date;
};

// async function joinGroup(groupName, username) {
//     const user = await User.findOne({ username: username });
//     console.log(user);
//     let payload = { userId: user._id, lastRead: new Date("1970-01-01T00:00:00Z"), joinedSince: new Date() };
//     console.log(payload);
//     await Group.update(
//         { groupName: groupName },
//         { $push: { members: payload } }
//     );
// }

async function exitGroup(groupName, username){
    const user = await User.findOne({username});
    console.log(user._id);
    await Group.update(
        {groupName: groupName},
        {$pull: { members: {userId: user._id}}}
    );
    console.log("exit group OK");
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
        joinGroup(req.groupName, req.username).then(() => {
            getAllGroup().then((groups) => {
                io.to(groupRoom).emit('server_emitGroupInfo', groups);
            });   
        });
    })

    socket.on('client_enterGroup', (req) => {
        socket.join(req.groupName);
        getGroupMessage(req.groupName, req.username).then( (res) => {
            socket.emit('server_emitOnEnterGroup', res);} );
        console.log(socket.id + " in rooms: " + req.groupName);
    })

    socket.on('client_leaveGroup', (req) => {
        
        socket.leave(req.groupName);
        updateMyLastRead(req.groupName, req.username)
        console.log(socket.id + " out rooms: " + req.groupName);
    })

    socket.on('client_sendMsg', (req) => {
        console.log(req.message + " " + req.groupName + " " + req.sender)
        sendMessage(req.groupName, req.sender, req.message).then( res => {
            io.to(req.groupName).emit('server_emitChat',
                {
                    sender: req.sender,
                    message: req.message,
                    timestamp: res
                })
        });
        
    })

    socket.on('client_exitGroup', (req) => {
        exitGroup(req.groupName, req.username);
        socket.leave(req.groupName);
        console.log(req.username + " permanent exit from " + req.groupName);
        getAllGroup().then((groups) => {
            io.to(groupRoom).emit('server_emitGroupInfo', groups);
        });
    })



    // socket.on('client_exitGroupInfo', (req) => {
    //     console.log('socket exit groupInfo: ', socket.id);
    // })
    
});