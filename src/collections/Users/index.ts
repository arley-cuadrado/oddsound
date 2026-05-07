import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'
import { anyone } from '@/access/anyone'
import { isAdmin } from '@/access/isAdmin'
import { isAdminOrSelf } from '@/access/isAdminOrSelf'
import { isAdminUser } from '@/utilities/isAdminUser'
import { createProfile } from './hooks/createProfile'
import { ensureCreatorDefaults } from './hooks/ensureCreatorDefaults'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: authenticated,
    create: isAdmin,
    delete: isAdmin,
    read: isAdminOrSelf,
    update: isAdminOrSelf,
  },
  admin: {
    defaultColumns: ['name', 'email', 'role', 'accountType'],
    hidden: ({ user }) => !isAdminUser(user as { role?: null | string } | null | undefined),
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'creator',
      admin: {
        condition: (_data, siblingData) => siblingData?.role !== 'admin',
      },
      options: [
        {
          label: 'Admin',
          value: 'admin',
        },
        {
          label: 'Creator',
          value: 'creator',
        },
      ],
      required: true,
    },
    {
      name: 'adminRoleLabel',
      type: 'text',
      virtual: true,
      defaultValue: 'Admin',
      admin: {
        condition: (_data, siblingData) => siblingData?.role === 'admin',
        description: 'This account is administrative and cannot be changed to creator.',
        readOnly: true,
      },
      label: 'Role',
    },
    {
      name: 'accountType',
      type: 'select',
      defaultValue: 'artist',
      admin: {
        condition: (_data, siblingData) => siblingData?.role !== 'admin',
      },
      options: [
        {
          label: 'Artist',
          value: 'artist',
        },
        {
          label: 'Band',
          value: 'band',
        },
        {
          label: 'Label',
          value: 'label',
        },
      ],
      required: true,
    },
    {
      name: 'profile',
      type: 'relationship',
      relationTo: 'profiles',
      access: {
        create: ({ req: { user } }) => isAdminUser(user),
        read: ({ req: { user } }) => isAdminUser(user),
        update: ({ req: { user } }) => isAdminUser(user),
      },
      admin: {
        hidden: true,
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
  hooks: {
    afterOperation: [createProfile],
    beforeChange: [ensureCreatorDefaults],
  },
  timestamps: true,
}
