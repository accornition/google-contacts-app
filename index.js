require('dotenv').config();

const port = process.env.PORT;

var app = require("./backend/app");

app.listen(port, () => {
    console.log(`Application listening on: http://localhost:${port}`);
});
