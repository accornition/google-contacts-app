const path = require('path');

module.exports = {
    target: "node",
    entry: {
        main: path.resolve(__dirname, './app.js'),
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname)
    },
    plugins: [
    ]
}