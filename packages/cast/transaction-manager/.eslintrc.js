const fs = require('fs');

const prettierOptions = JSON.parse(fs.readFileSync('./.prettierrc', 'utf8'));

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2017,
    ecmaFeatures: {
      modules: true,
    },
    sourceType: 'module',
    project: 'tsconfig.lint.json',
  },
  extends: [
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'prettier/@typescript-eslint',
  ],
  plugins: ['prettier', '@typescript-eslint/eslint-plugin'],
  rules: {
    'prettier/prettier': [1, prettierOptions],
    '@typescript-eslint/explicit-function-return-type': [
      1,
      {
        allowExpressions: true,
        allowHigherOrderFunctions: true,
      },
    ],
    "@typescript-eslint/no-floating-promises": ["error"]
  },
  settings: {
    'import/resolver': {
      // use <root>/tsconfig.json
      typescript: {},
    },
  },
};
