import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createEditorInvitation } from '@/utilities/editorInvites'

const inviteMocks = vi.hoisted(() => ({
  ensureCreatorProfile: vi.fn(),
  findUserByEmail: vi.fn(),
}))

vi.mock('@/utilities/creatorAuth', () => ({
  CROSS_ACCOUNT_EMAIL_CONFLICT_MESSAGE:
    'Este correo ya está asociado a una cuenta de otro tipo dentro de Oddsound.',
  findUserByEmail: inviteMocks.findUserByEmail,
}))

vi.mock('@/utilities/creatorProfiles', () => ({
  ensureCreatorProfile: inviteMocks.ensureCreatorProfile,
}))

describe('createEditorInvitation', () => {
  beforeEach(() => {
    inviteMocks.ensureCreatorProfile.mockReset()
    inviteMocks.findUserByEmail.mockReset()
  })

  it('returns a resend-ready state for existing pending editors', async () => {
    inviteMocks.findUserByEmail.mockResolvedValue({
      _verified: false,
      editorAccess: true,
      email: 'editor@oddsound.co',
      id: 'user-1',
    })

    const result = await createEditorInvitation({
      adminUser: { id: 'admin-1', role: 'admin' },
      email: 'editor@oddsound.co',
      fullName: 'Editor Test',
      password: 'super-secret-password',
      payload: {} as never,
      req: {} as never,
    })

    expect(result).toEqual({
      email: 'editor@oddsound.co',
      message:
        'Este editor ya existe y sigue pendiente de confirmar su correo. Puedes reenviar el enlace desde aquí.',
      ok: false,
      showResend: true,
      status: 'existing_pending_verification',
    })
  })

  it('returns a verified state for existing verified editors', async () => {
    inviteMocks.findUserByEmail.mockResolvedValue({
      _verified: true,
      editorAccess: true,
      email: 'editor@oddsound.co',
      id: 'user-1',
    })

    const result = await createEditorInvitation({
      adminUser: { id: 'admin-1', role: 'admin' },
      email: 'editor@oddsound.co',
      fullName: 'Editor Test',
      password: 'super-secret-password',
      payload: {} as never,
      req: {} as never,
    })

    expect(result.status).toBe('existing_verified')
    expect(result.showResend).toBe(false)
  })

  it('creates the editor and stores optional social links when provided', async () => {
    const payload = {
      create: vi.fn().mockResolvedValue({
        editorAccess: true,
        email: 'editor@oddsound.co',
        id: 'user-1',
        name: 'Editor Test',
        profile: 'profile-1',
        role: 'creator',
        userType: 'creator',
      }),
      update: vi.fn().mockResolvedValue({}),
    }

    inviteMocks.findUserByEmail.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    inviteMocks.ensureCreatorProfile.mockResolvedValue('profile-1')

    const result = await createEditorInvitation({
      adminUser: { id: 'admin-1', role: 'admin' },
      email: 'editor@oddsound.co',
      fullName: 'Editor Test',
      password: 'super-secret-password',
      payload: payload as never,
      req: {} as never,
      socialRows: [
        {
          platform: 'instagram',
          value: '@editor-test',
        },
        {
          platform: 'x',
          value: 'https://x.com/editor-test',
        },
      ],
    })

    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        data: expect.objectContaining({
          editorAccess: true,
          email: 'editor@oddsound.co',
          name: 'Editor Test',
          password: 'super-secret-password',
          role: 'creator',
        }),
      }),
    )
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'profiles',
        data: {
          editorSocials: {
            facebook: '',
            instagram: '@editor-test',
            threads: '',
            x: 'https://x.com/editor-test',
          },
        },
        id: 'profile-1',
      }),
    )
    expect(result.status).toBe('created_and_sent')
    expect(result.ok).toBe(true)
  })
})
