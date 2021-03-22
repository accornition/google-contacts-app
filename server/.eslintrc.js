module.exports = {
    env: {
        commonjs: true,
        es6: true,
        node: true
    },
    extends: "eslint:recommended",
    globals: {},
    parserOptions: {
        ecmaVersion: 2021
    },
    rules: {
        indent: [ "error", 4 ],
        "linebreak-style": [ "error", "windows" ],
        quotes: [ "error", "double" ],
        semi: [ "error", "always" ],
        "array-bracket-spacing": [ "error", "always" ],
        "object-curly-spacing": [ "error", "always" ],
        // "space-in-parens": [ "error", "always" ]
    }
};