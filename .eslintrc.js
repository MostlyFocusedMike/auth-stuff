module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es6": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 2018
    },
    rules: {
        "indent": ["error", 4],
        "no-unused-vars": ["warn", { "vars": "local", "args": "none" }],
        "no-plusplus": 0,
        "max-len": ["warn", 180],
        "one-var": 0,
        "no-console": "off",
        "arrow-body-style": "off",
        "class-methods-use-this": "off",
        "import/prefer-default-export": "off",
        "arrow-parens": "off",
        "global-require": "off",
    },
};