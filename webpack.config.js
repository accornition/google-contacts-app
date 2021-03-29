const path = require('path');

module.exports = {
    target: "node",
    entry: {
        main: path.resolve(__dirname, './index.js'),
    },
    output: {
        filename: '[name].bundle.js',
        path: path.join(__dirname, 'deploy')
    },
    plugins: [
    ]
}