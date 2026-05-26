type BaseRangeResult = {
  headers: Record<string, string>
}

type FullRangeResult = BaseRangeResult & {
  status: 200
  type: 'full'
}

type InvalidRangeResult = BaseRangeResult & {
  status: 416
  type: 'invalid'
}

type PartialRangeResult = BaseRangeResult & {
  rangeEnd: number
  rangeStart: number
  status: 206
  type: 'partial'
}

export type RangeRequestResult = FullRangeResult | InvalidRangeResult | PartialRangeResult

/**
 * Minimal single-range parser used by the Blob adapter so we do not depend on
 * `payload/internal`, which is not a stable public API.
 */
export function getBlobRangeRequestInfo({
  fileSize,
  rangeHeader,
}: {
  fileSize: number
  rangeHeader: null | string
}): RangeRequestResult {
  const baseHeaders = {
    'Accept-Ranges': 'bytes',
  }

  if (!rangeHeader || !rangeHeader.trim()) {
    return {
      headers: baseHeaders,
      status: 200,
      type: 'full',
    }
  }

  const normalizedHeader = rangeHeader.trim()

  if (!normalizedHeader.startsWith('bytes=')) {
    return {
      headers: {
        ...baseHeaders,
        'Content-Range': `bytes */${fileSize}`,
      },
      status: 416,
      type: 'invalid',
    }
  }

  const ranges = normalizedHeader.slice('bytes='.length).split(',')

  if (ranges.length !== 1) {
    return {
      headers: {
        ...baseHeaders,
        'Content-Range': `bytes */${fileSize}`,
      },
      status: 416,
      type: 'invalid',
    }
  }

  const rawRange = ranges[0]?.trim() || ''
  const [rawStart, rawEnd] = rawRange.split('-')

  if (!rawRange.includes('-')) {
    return {
      headers: {
        ...baseHeaders,
        'Content-Range': `bytes */${fileSize}`,
      },
      status: 416,
      type: 'invalid',
    }
  }

  let rangeStart: number
  let rangeEnd: number

  if (rawStart === '') {
    const suffixLength = Number(rawEnd)

    if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
      return {
        headers: {
          ...baseHeaders,
          'Content-Range': `bytes */${fileSize}`,
        },
        status: 416,
        type: 'invalid',
      }
    }

    rangeEnd = fileSize - 1
    rangeStart = Math.max(fileSize - suffixLength, 0)
  } else {
    rangeStart = Number(rawStart)

    if (!Number.isInteger(rangeStart) || rangeStart < 0) {
      return {
        headers: {
          ...baseHeaders,
          'Content-Range': `bytes */${fileSize}`,
        },
        status: 416,
        type: 'invalid',
      }
    }

    if (rawEnd === '') {
      rangeEnd = fileSize - 1
    } else {
      rangeEnd = Number(rawEnd)

      if (!Number.isInteger(rangeEnd) || rangeEnd < 0) {
        return {
          headers: {
            ...baseHeaders,
            'Content-Range': `bytes */${fileSize}`,
          },
          status: 416,
          type: 'invalid',
        }
      }
    }
  }

  if (rangeStart >= fileSize || rangeEnd < rangeStart) {
    return {
      headers: {
        ...baseHeaders,
        'Content-Range': `bytes */${fileSize}`,
      },
      status: 416,
      type: 'invalid',
    }
  }

  rangeEnd = Math.min(rangeEnd, fileSize - 1)

  return {
    headers: {
      ...baseHeaders,
      'Content-Length': String(rangeEnd - rangeStart + 1),
      'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${fileSize}`,
    },
    rangeEnd,
    rangeStart,
    status: 206,
    type: 'partial',
  }
}

