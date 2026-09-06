import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  {
    ignores: [
      '.next/',
      'src/payload-types.ts',
      'src/payload-generated-schema.ts',
      '**/* 2.ts',
      '**/* 2.tsx',
      'src/Header/Component.client.tsx',
      'src/app/(frontend)/home-components/HeaderHome.tsx',
      'src/app/(frontend)/home-components/ReleasesHome.tsx',
      'src/components/Card/index.tsx',
      'tests/helpers/preload-jsdom.cjs',
      'src/providers/Theme/ThemeSelector/index.tsx',
      'src/search/Component.tsx',
    ],
  },
]

export default eslintConfig
