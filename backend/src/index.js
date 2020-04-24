const express = require('express');
const bodyParser = require('body-parser');
const Members = require('./db/member');

const app = express();
app.use(require('morgan')('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const connectDB = require('./db/connection');
connectDB();

//TEST API---------
app.get('/', (req, res) => res.send("Hello world from " + process.env.ROLE));
app.post('/api/members', async(req, res) => {
    const payload = req.body;
    payload.joinedSince = new Date();
    payload.lastRead = new Date();
    const members = new Members(payload);
    await members.save();
    res.status(201).send({message:"Add members OK"}).end();
});

app.get('/api/members', async(req, res) => {
    const members = await Members.find();
    res.json(members);
});
//-----------------

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log("Chitty chat is listening on port", port);
})