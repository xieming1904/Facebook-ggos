module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'airbnb-base'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // 自定义规则
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    
    // 代码风格
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'space-before-function-paren': ['error', 'never'],
    'keyword-spacing': ['error', { before: true, after: true }],
    'space-infix-ops': 'error',
    'eol-last': ['error', 'always'],
    'no-trailing-spaces': 'error',
    
    // 变量和函数
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    'arrow-parens': ['error', 'as-needed'],
    'func-names': 'off',
    'function-paren-newline': ['error', 'consistent'],
    
    // 对象和数组
    'object-shorthand': 'error',
    'prefer-destructuring': ['error', {
      array: true,
      object: true
    }, {
      enforceForRenamedProperties: false
    }],
    'no-array-constructor': 'error',
    'no-new-object': 'error',
    
    // 字符串
    'prefer-template': 'error',
    'template-curly-spacing': 'error',
    'no-useless-concat': 'error',
    
    // 控制流
    'no-else-return': 'error',
    'no-lonely-if': 'error',
    'no-unneeded-ternary': 'error',
    'no-nested-ternary': 'error',
    'yoda': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    
    // 异步处理
    'prefer-promise-reject-errors': 'error',
    'no-async-promise-executor': 'error',
    'require-await': 'error',
    'no-await-in-loop': 'warn',
    
    // 导入/导出
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: [
        '**/*.test.js',
        '**/*.spec.js',
        '**/tests/**',
        '**/jest.config.js',
        '**/webpack.config.js'
      ]
    }],
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index'
      ],
      'newlines-between': 'always'
    }],
    
    // Node.js 特定
    'no-process-env': 'off',
    'no-process-exit': 'error',
    'global-require': 'off',
    
    // 安全相关
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // 性能相关
    'no-loop-func': 'error',
    'no-extend-native': 'error',
    'no-iterator': 'error',
    'no-proto': 'error',
    
    // 错误处理
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',
    
    // MongoDB/Mongoose 特定
    'no-underscore-dangle': ['error', {
      allow: ['_id', '__v', '_doc']
    }],
    
    // 测试相关
    'jest/no-disabled-tests': 'off',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error'
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true
      },
      plugins: ['jest'],
      rules: {
        'no-console': 'off',
        'import/no-extraneous-dependencies': 'off'
      }
    },
    {
      files: ['src/scripts/**/*.js'],
      rules: {
        'no-console': 'off',
        'no-process-exit': 'off'
      }
    }
  ],
  ignorePatterns: [
    'node_modules/',
    'client/',
    'dist/',
    'coverage/',
    '*.min.js'
  ]
};