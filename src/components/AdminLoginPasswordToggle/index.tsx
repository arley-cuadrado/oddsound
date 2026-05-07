'use client'

import { useEffect } from 'react'

function enhancePasswordField() {
  const passwordInput = document.querySelector<HTMLInputElement>(
    'input[name="password"], input[type="password"]',
  )

  if (!passwordInput || passwordInput.dataset.passwordToggleReady === 'true') return

  const wrapper = passwordInput.parentElement
  if (!wrapper) return

  passwordInput.dataset.passwordToggleReady = 'true'
  wrapper.style.position = 'relative'
  passwordInput.style.paddingRight = '5rem'

  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.textContent = 'Show'
  toggle.setAttribute('aria-label', 'Show password')
  toggle.style.position = 'absolute'
  toggle.style.right = '0.75rem'
  toggle.style.top = '50%'
  toggle.style.transform = 'translateY(-50%)'
  toggle.style.background = 'transparent'
  toggle.style.border = '0'
  toggle.style.padding = '0'
  toggle.style.fontSize = '0.875rem'
  toggle.style.cursor = 'pointer'
  toggle.style.color = 'inherit'

  toggle.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password'
    passwordInput.type = isHidden ? 'text' : 'password'
    toggle.textContent = isHidden ? 'Hide' : 'Show'
    toggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password')
  })

  wrapper.appendChild(toggle)
}

export default function AdminLoginPasswordToggle() {
  useEffect(() => {
    enhancePasswordField()

    const observer = new MutationObserver(() => {
      enhancePasswordField()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [])

  return null
}
