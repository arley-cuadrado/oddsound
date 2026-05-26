import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { es } from '@payloadcms/translations/languages/es'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Profiles } from './collections/Profiles'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { oddsoundVercelBlobStorage } from './plugins/oddsoundVercelBlob'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const hasSMTPConfig = Boolean(process.env.SMTP_HOST && process.env.SMTP_PASS)
const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN)
const shouldVerifySMTPTransport =
  hasSMTPConfig && process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production'

export default buildConfig({
  serverURL: getServerSideURL(),
  routes: {
    admin: '/dashboard',
  },
  admin: {
    routes: {
      logout: '/role-logout',
    },
    meta: {
      icons: {
        icon: '/favicon-light.ico',
      },
    },
    components: {
      afterLogin: ['@/components/CreatorRegisterLink'],
      afterDashboard: ['@/components/BeforeDashboard'],
      afterNavLinks: ['@/components/EmailPreviewNavLink', '@/components/ScheduledPublishesNavLink'],
      graphics: {
        Icon: '@/components/AdminIcon',
        Logo: '@/components/AdminLogo',
      },
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeLogin: ['@/components/BeforeLogin'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Móvil',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tableta',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Escritorio',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  email: nodemailerAdapter({
    defaultFromAddress: process.env.EMAIL_FROM_ADDRESS || 'hello@oddsound.co',
    defaultFromName: process.env.EMAIL_FROM_NAME || 'oddsound',
    skipVerify: !shouldVerifySMTPTransport,
    ...(hasSMTPConfig
      ? {
          transportOptions: {
            auth: {
              pass: process.env.SMTP_PASS,
              user: process.env.SMTP_USER || 'resend',
            },
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || '465'),
            secure: Number(process.env.SMTP_PORT || '465') === 465,
          },
        }
      : {
          transportOptions: {
            jsonTransport: true,
          } as any,
        }),
  }),
  collections: [Pages, Posts, Media, Categories, Profiles, Users],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer],
  i18n: {
    fallbackLanguage: 'es',
    supportedLanguages: {
      es,
    },
  },
  plugins: [
    ...plugins,
    ...(hasBlobToken
      ? [
          oddsoundVercelBlobStorage({
            clientUploads: true,
            collections: {
              media: true,
            },
            token: process.env.BLOB_READ_WRITE_TOKEN || '',
          }),
        ]
      : []),
  ],
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    autoRun: [
      {
        cron: '* * * * *',
        limit: 50,
        queue: 'default',
      },
    ],
    tasks: [],
  },
})
