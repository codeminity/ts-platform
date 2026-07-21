import { AxiosHeaders, type AxiosRequestHeaders } from 'axios'

export function createAuthorizationHeader(
  headers: AxiosRequestHeaders,
  token: string
): AxiosHeaders {
  const h = AxiosHeaders.from(headers)
  h.set('Authorization', `Bearer ${token}`)

  return h
}
