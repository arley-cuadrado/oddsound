'use client'

import type { PayloadAdminBarProps, PayloadMeUser } from '@payloadcms/admin-bar'

import { cn } from '@/utilities/ui'
import { getClientSideURL } from '@/utilities/getURL'
import { useRouter, useSelectedLayoutSegments } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import './index.scss'

const baseClass = 'admin-bar'

const collectionLabels = {
  pages: {
    plural: 'Lanzamientos',
    singular: 'Lanzamiento',
  },
  posts: {
    plural: 'Posts',
    singular: 'Post',
  },
  projects: {
    plural: 'Proyectos',
    singular: 'Proyecto',
  },
}

const Title: React.FC = () => <span>Dashboard</span>

type LocalizedPayloadAdminBarProps = PayloadAdminBarProps

const LocalizedPayloadAdminBar: React.FC<LocalizedPayloadAdminBarProps> = (props) => {
  const {
    id: docID,
    adminPath = '/dashboard',
    apiPath = '/api',
    authCollectionSlug = 'users',
    className,
    classNames,
    cmsURL = 'http://localhost:3000',
    collectionLabels,
    collectionSlug,
    createProps,
    divProps,
    editProps,
    logo,
    logoProps,
    logoutProps,
    onAuthChange,
    onPreviewExit,
    preview,
    previewProps,
    style,
    userProps,
  } = props

  const [user, setUser] = useState<PayloadMeUser>()

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const meRequest = await fetch(`${cmsURL}${apiPath}/${authCollectionSlug}/me`, {
          credentials: 'include',
          method: 'get',
        })
        const meResponse = (await meRequest.json()) as { user?: PayloadMeUser }
        setUser(meResponse.user || null)
      } catch (error) {
        console.warn(error)
      }
    }

    void fetchMe()
  }, [adminPath, apiPath, authCollectionSlug, cmsURL])

  useEffect(() => {
    if (typeof onAuthChange === 'function') {
      onAuthChange(user)
    }
  }, [onAuthChange, user])

  if (!user) return null

  const { id: userID } = user
  const typedUser = user as PayloadMeUser & { role?: null | string; userType?: null | string }
  const isCreatorUser = typedUser?.role === 'creator'
  const isFanUser = typedUser?.userType === 'consumer' || typedUser?.userType === 'fan'

  if (isFanUser) return null

  const handleCreatorLogout = async () => {
    try {
      await fetch('/creator-api/logout', {
        credentials: 'include',
        method: 'POST',
      })
    } finally {
      window.location.href = '/creator/login'
    }
  }

  return (
    <div className={className} id="payload-admin-bar" style={style}>
      <a
        className={classNames?.logo}
        href={`${cmsURL}${adminPath}`}
        rel="noopener noreferrer"
        target="_blank"
        {...logoProps}
      >
        {logo || 'Payload CMS'}
      </a>

      <div className={classNames?.controls} {...divProps}>
        {collectionSlug && docID ? (
          <a
            className={classNames?.edit}
            href={`${cmsURL}${adminPath}/collections/${collectionSlug}/${docID}`}
            rel="noopener noreferrer"
            target="_blank"
            {...editProps}
          >
            <span>{`Editar ${collectionLabels?.singular || 'página'}`}</span>
          </a>
        ) : null}

        {collectionSlug ? (
          <a
            className={classNames?.create}
            href={`${cmsURL}${adminPath}/collections/${collectionSlug}/create`}
            rel="noopener noreferrer"
            target="_blank"
            {...createProps}
          >
            <span>{collectionLabels?.singular || 'página'}</span>
          </a>
        ) : null}

        {preview ? (
          <button className={classNames?.preview} onClick={onPreviewExit} type="button" {...previewProps}>
            Salir del modo vista previa
          </button>
        ) : null}
      </div>

      {isCreatorUser ? (
        <button className={classNames?.logout} onClick={handleCreatorLogout} type="button" {...logoutProps}>
          <span>Cerrar sesión</span>
        </button>
      ) : (
        <a
          className={classNames?.logout}
          href={`${cmsURL}${adminPath}/logout`}
          rel="noopener noreferrer"
          target="_blank"
          {...logoutProps}
        >
          <span>Cerrar sesión</span>
        </a>
      )}
    </div>
  )
}

export const AdminBar: React.FC<{
  adminBarProps?: PayloadAdminBarProps
}> = (props) => {
  const { adminBarProps } = props || {}
  const segments = useSelectedLayoutSegments()
  const [show, setShow] = useState(false)
  const collection = (
    collectionLabels[segments?.[1] as keyof typeof collectionLabels] ? segments[1] : 'pages'
  ) as keyof typeof collectionLabels
  const router = useRouter()

  const onAuthChange = React.useCallback((user: PayloadMeUser) => {
    const typedUser = user as PayloadMeUser & { userType?: null | string }
    const isFanUser = typedUser?.userType === 'consumer' || typedUser?.userType === 'fan'
    setShow(Boolean(user?.id) && !isFanUser)
  }, [])

  useEffect(() => {
    const root = document.documentElement

    root.style.setProperty('--admin-bar-offset', show ? '40px' : '0px')

    return () => {
      root.style.setProperty('--admin-bar-offset', '0px')
    }
  }, [show])

  return (
    <div
      className={cn(
        baseClass,
        'fixed inset-x-0 top-0 z-50 bg-background py-2 text-foreground transition-colors',
        {
        block: show,
        hidden: !show,
      })}
      style={{ fontSize: '13px' }}
    >
      <div className="container">
        <LocalizedPayloadAdminBar
          {...adminBarProps}
          className="py-2 text-inherit"
          classNames={{
            controls: 'font-medium text-inherit',
            create: 'text-inherit',
            edit: 'text-inherit',
            logout: 'text-inherit',
            logo: 'text-inherit',
            preview: 'text-inherit',
            user: 'text-inherit',
          }}
          cmsURL={getClientSideURL()}
          collectionSlug={collection}
          collectionLabels={{
            plural: collectionLabels[collection]?.plural || 'Lanzamientos',
            singular: collectionLabels[collection]?.singular || 'Lanzamiento',
          }}
          divProps={{
            style: {
              alignItems: 'center',
              display: 'flex',
              fontSize: '13px',
              flexGrow: 1,
              flexShrink: 1,
              justifyContent: 'flex-end',
              marginRight: '10px',
            },
          }}
          logo={<Title />}
          logoProps={{
            style: {
              alignItems: 'center',
              color: 'inherit',
              display: 'flex',
              fontSize: '13px',
              flexShrink: 0,
              height: '20px',
              marginRight: '10px',
              textDecoration: 'none',
            },
          }}
          onAuthChange={onAuthChange}
          onPreviewExit={() => {
            fetch('/next/exit-preview').then(() => {
              router.push('/')
              router.refresh()
            })
          }}
          previewProps={{
            style: {
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '13px',
              marginLeft: '10px',
              padding: 0,
            },
          }}
          style={{
            backgroundColor: 'transparent',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
            position: 'relative',
            zIndex: 'unset',
          }}
          userProps={{
            style: {
              color: 'inherit',
              display: 'block',
              marginRight: '10px',
              minWidth: '50px',
              overflow: 'hidden',
              textDecoration: 'none',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          }}
        />
      </div>
    </div>
  )
}
