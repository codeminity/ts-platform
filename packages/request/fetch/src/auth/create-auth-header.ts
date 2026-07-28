export function createAuthorizationHeader(headers: HeadersInit | undefined, token: string): Headers {
  const h = new Headers(headers)
  h.set('Authorization', `Bearer ${token}`)

  return h
}
