import type { SetOption as CookieOptions } from 'cookies'
import type { IncomingMessage, ServerResponse } from 'http'
import Stream from 'stream'
import mime from 'mime-types'
import contentDisposition, { Options as ContentDispositionOptions } from 'content-disposition'

import { RequestInfo } from '.'
import { Json } from '../core/types'

export type Value = string | number

export type Values = {
  [key: string]: Value
}

export type Status = {
  code: number
  message?: string
}

export type Headers = {
  [key: string]: Value
}

export type Cookies = {
  [key: string]: {
    value: Value | null
    options?: CookieOptions
  }
}

export type SharedResponseInfo = {
  status?: Status
  headers?: Headers
  cookies?: Cookies
}

export type JsonBody = {
  type: 'json'
  value: Json
}

export type TextBody = {
  type: 'text'
  value: string
}

export type HtmlBody = {
  type: 'html'
  value: string
}

export type EmptyBody = {
  type: 'empty'
  value: null
}

export type RedirectBody = {
  type: 'redirect'
  useBasename: boolean
  value: string
}

export type StreamBody = {
  type: 'stream'
  value: Stream
}

export type BufferBody = {
  type: 'buffer'
  value: Buffer
}

export type RawBody = {
  type: 'raw'
  value: string
}

export type FileBody = {
  type: 'file'
  value: string
}

export type CustomBodyHandler = (arg: {
  req: IncomingMessage
  res: ServerResponse
  requestInfo: RequestInfo
  responseInfo: Omit<ResponseInfo, 'body'>
  basename: string
}) => any

export type CustomBody = {
  type: 'custom'
  handler: CustomBodyHandler
}

export type Body =
  | JsonBody
  | TextBody
  | HtmlBody
  | EmptyBody
  | RedirectBody
  | StreamBody
  | BufferBody
  | FileBody
  | RawBody
  | CustomBody

export type BodyMap = {
  [V in Body as V['type']]: V
}

export type ResponseInfo = {
  status?: Status
  headers?: Headers
  cookies?: Cookies
  body?: Body
  vary?: string[]
}

export const json = (value: Json): ResponseInfo => {
  return {
    body: {
      type: 'json',
      value,
    },
  }
}

export const text = (value: string): ResponseInfo => {
  return {
    body: {
      type: 'text',
      value,
    },
  }
}

export const html = (value: string): ResponseInfo => {
  return {
    body: {
      type: 'html',
      value,
    },
  }
}

export const empty = (): ResponseInfo => {
  return {
    body: {
      type: 'empty',
      value: null,
    },
  }
}

export const raw = (value: string): ResponseInfo => {
  return {
    body: {
      type: 'raw',
      value: value,
    },
  }
}

export const redirect = (url: string, useBasename: boolean = true): ResponseInfo => {
  return {
    body: {
      type: 'redirect',
      value: url,
      useBasename,
    },
  }
}

export const custom = (handler: CustomBodyHandler): ResponseInfo => {
  return {
    body: {
      type: 'custom',
      handler,
    },
  }
}

export const stream = (stream: Stream): ResponseInfo => {
  return {
    body: {
      type: 'stream',
      value: stream,
    },
  }
}

export const buffer = (buffer: Buffer): ResponseInfo => {
  return {
    body: {
      type: 'buffer',
      value: buffer,
    },
  }
}

export const file = (filename: string): ResponseInfo => {
  return {
    body: {
      type: 'file',
      value: filename,
    },
  }
}

export const attachment = (
  filename?: string,
  options?: ContentDispositionOptions
): ResponseInfo => {
  return headers({
    'Content-Disposition': contentDisposition(filename, options),
  })
}

export const status = (code: number, message: string = ''): ResponseInfo => {
  return {
    status: {
      code,
      message,
    },
  }
}

export const headers = (headers: Headers): ResponseInfo => {
  return {
    headers,
  }
}

export const header = (name: string, value: Value): ResponseInfo => {
  return headers({ [name]: value })
}

export const type = (type: string): ResponseInfo => {
  let contentType = mime.contentType(type)

  if (contentType === false) {
    return headers({})
  }

  return headers({
    'Content-Type': contentType,
  })
}

export const cookies = (
  config: { [key: string]: Value | null },
  options?: CookieOptions
): ResponseInfo => {
  let cookies = {} as Cookies

  Object.entries(config).forEach(([name, value]) => {
    cookies[name] = {
      value,
      options,
    }
  })

  return {
    cookies,
  }
}

export const cookie = (
  name: string,
  value: Value | null,
  options?: CookieOptions
): ResponseInfo => {
  return cookies({ [name]: value }, options)
}

export const vary = (...fileds: string[]): ResponseInfo => {
  return {
    vary: fileds,
  }
}

export const merge = (...responses: ResponseInfo[]) => {
  let result = {} as ResponseInfo

  responses.forEach((response) => {
    if (response.body) {
      result.body = response.body
    }

    if (response.status) {
      result.status = Object.assign({}, result.status, response.status)
    }

    if (response.headers) {
      result.headers = Object.assign({}, result.headers, response.headers)
    }

    if (response.cookies) {
      result.cookies = Object.assign({}, result.cookies, response.cookies)
    }

    if (response.vary) {
      result.vary = [...(result.vary ?? []), ...response.vary]
    }
  })

  return result
}

