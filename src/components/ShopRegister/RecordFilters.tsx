'use client'

import { useListQuery } from '@payloadcms/ui'
import Link from 'next/link'
import { useState } from 'react'
import {
  emptyRegisterDateFilter,
  readRegisterDateFilter,
  registerDateWhere,
  registerPageSizes,
  replaceRegisterDateWhere,
  type RegisterDateFilter,
} from '@/commerce/registerFilters'
import './record-filters.css'

export default function RecordFilters() {
  const { query } = useListQuery()
  const serializedWhere = JSON.stringify(query.where || {})
  return <RecordFilterControls key={serializedWhere} initialWhere={serializedWhere} />
}

function RecordFilterControls({ initialWhere }: { initialWhere: string }) {
  const { query, data, refineListData, handlePerPageChange } = useListQuery()
  const [filter, setFilter] = useState(() => readRegisterDateFilter(JSON.parse(initialWhere)))
  const [error, setError] = useState('')
  const limit = Number(query.limit || data?.limit || 15)
  const sizes = Array.from(new Set([...registerPageSizes, limit])).sort((a, b) => a - b)
  const update = (value: Partial<RegisterDateFilter>) =>
    setFilter((current) => ({ ...current, ...value }))

  return (
    <section className="register-filters" aria-label="Filtros de registros">
      <Link href="/dashboard/shop-register">← Shop Register</Link>
      <form
        className="register-filters__form"
        onSubmit={async (event) => {
          event.preventDefault()
          try {
            const where = replaceRegisterDateWhere(query.where, registerDateWhere(filter))
            setError('')
            await refineListData({ where, page: 1 })
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'No se pudo aplicar el filtro.')
          }
        }}
      >
        <label>
          Registros por página
          <select
            value={limit}
            onChange={(event) => void handlePerPageChange?.(Number(event.target.value))}
          >
            {sizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fecha
          <select
            value={filter.field}
            onChange={(event) =>
              update({ field: event.target.value as RegisterDateFilter['field'] })
            }
          >
            <option value="createdAt">Creación</option>
            <option value="updatedAt">Última actualización</option>
          </select>
        </label>
        <label>
          Periodo
          <select
            value={filter.period}
            onChange={(event) =>
              update({
                period: event.target.value as RegisterDateFilter['period'],
                value: '',
                end: '',
              })
            }
          >
            <option value="all">Todas las fechas</option>
            <option value="day">Día</option>
            <option value="month">Mes</option>
            <option value="year">Año</option>
            <option value="range">Intervalo</option>
          </select>
        </label>
        {filter.period !== 'all' && (
          <label>
            {filter.period === 'range' ? 'Desde' : 'Seleccionar fecha'}
            <input
              required
              type={
                filter.period === 'month' ? 'month' : filter.period === 'year' ? 'number' : 'date'
              }
              min={
                filter.period === 'year'
                  ? '1000'
                  : filter.period === 'month'
                    ? '1000-01'
                    : '1000-01-01'
              }
              max={
                filter.period === 'year'
                  ? '9998'
                  : filter.period === 'month'
                    ? '9998-12'
                    : '9998-12-31'
              }
              value={filter.value}
              onChange={(event) => update({ value: event.target.value })}
            />
          </label>
        )}
        {filter.period === 'range' && (
          <label>
            Hasta
            <input
              required
              type="date"
              min="1000-01-01"
              max="9998-12-31"
              value={filter.end}
              onChange={(event) => update({ end: event.target.value })}
            />
          </label>
        )}
        <button type="submit">Aplicar fecha</button>
        <button
          type="button"
          onClick={() => {
            setFilter({ ...emptyRegisterDateFilter })
            setError('')
            void refineListData({ where: replaceRegisterDateWhere(query.where, null), page: 1 })
          }}
        >
          Limpiar fecha
        </button>
      </form>
      <p>
        El buscador de la tabla consulta nombres, referencias o texto disponible según el registro.
        Fechas en hora de Colombia (UTC−05:00).
      </p>
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
