declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PAYLOAD_SECRET: string
      DATABASE_URL: string
      NEXT_PUBLIC_SERVER_URL?: string
      VERCEL_ENV?: 'development' | 'preview' | 'production'
      VERCEL_URL?: string
      VERCEL_BRANCH_URL?: string
      VERCEL_PROJECT_PRODUCTION_URL?: string
      SUPER_ADMIN_EMAILS?: string
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}
