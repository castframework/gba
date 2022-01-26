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
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
    'prettier/@typescript-eslint',
  ],
  plugins: ['prettier', '@typescript-eslint/eslint-plugin','import'],
  rules: {
    'prettier/prettier': [1, prettierOptions],
    '@typescript-eslint/explicit-function-return-type': [
      1,
      {
        allowExpressions: true,
        allowHigherOrderFunctions: true,
      },
    ],
    '@typescript-eslint/no-parameter-properties': 0,
    "@typescript-eslint/no-floating-promises": ["error"],
    "import/no-extraneous-dependencies" : "error"
  },
  settings: {
    'import/resolver': {
      // use <root>/tsconfig.json
      typescript: {},
    },
  },
};
