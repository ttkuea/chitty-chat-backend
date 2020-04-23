const express = require('express');

const app = express();
app.use(require('morgan')('dev'));


app.get('/', (req, res) => res.send("Hello world from " + process.env.ROLE));

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log("Chitty chat is listening on port", port);
})