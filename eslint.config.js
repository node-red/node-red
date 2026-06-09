module.exports = [
    {
        ignores: ["node_modules/**", "!packages/node_modules/**"]
    },
    {
        files: ["packages/node_modules/@node-red/editor-client/src/js/**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "script"
        },
        rules: {
            "curly": ["error", "all"],
            "guard-for-in": "error",
            "no-extend-native": "error",
            "no-irregular-whitespace": "error",
            "wrap-iife": ["error", "inside"],
            "indent": ["error", 4, { "SwitchCase": 1 }]
        }
    }
];
