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

  const { id: userID, email } = user

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

      <a
        className={classNames?.user}
        href={`${cmsURL}${adminPath}/collections/${authCollectionSlug}/${userID}`}
        rel="noopener noreferrer"
        target="_blank"
        {...userProps}
      >
        <span>{email || 'Perfil'}</span>
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
            <span>{`Nuevo ${collectionLabels?.singular || 'página'}`}</span>
          </a>
        ) : null}

        {preview ? (
          <button className={classNames?.preview} onClick={onPreviewExit} type="button" {...previewProps}>
            Salir del modo vista previa
          </button>
        ) : null}
      </div>

      <a
        className={classNames?.logout}
        href={`${cmsURL}${adminPath}/logout`}
        rel="noopener noreferrer"
        target="_blank"
        {...logoutProps}
      >
        <span>Cerrar sesión</span>
      </a>
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
    setShow(Boolean(user?.id))
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
      className={cn(baseClass, 'fixed inset-x-0 top-0 z-50 bg-black py-2 text-white', {
        block: show,
        hidden: !show,
      })}
    >
      <div className="container">
        <LocalizedPayloadAdminBar
          {...adminBarProps}
          className="py-2 text-white"
          classNames={{
            controls: 'font-medium text-white',
            create: 'text-white',
            edit: 'text-white',
            logout: 'text-white',
            logo: 'text-white',
            preview: 'text-white',
            user: 'text-white',
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
              fontSize: 'inherit',
              marginLeft: '10px',
              padding: 0,
            },
          }}
          style={{
            backgroundColor: 'transparent',
            color: '#fff',
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
