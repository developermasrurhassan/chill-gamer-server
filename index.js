const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const user = require('./routes/user');
app.use('/', user);


app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});