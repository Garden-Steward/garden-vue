/* eslint-env node */
module.exports = {
    "root": true,
    "extends": [
        "plugin:vue/vue3-essential",
        "eslint:recommended"
    ],
    "env": {
        "browser": true,
        "es2022": true,
        "vue/setup-compiler-macros": true
    },
    "parserOptions": {
        "ecmaVersion": 2022
    },
    "rules": {
        "vue/multi-word-component-names": ["error", {
            "ignores": ["Alert", "Footer", "Gallery", "Nav", "Tiptap", "Toggle", "Switch", "Project"]
        }]
    },
    "overrides": [
        {
            "files": ["*.config.js", "scripts/**/*.js"],
            "env": { "browser": false, "node": true }
        },
        {
            "files": ["src/components/Toggle.vue"],
            "globals": { "defineOptions": "readonly" }
        }
    ]
}
