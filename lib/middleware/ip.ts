interface HeaderSource {
  get(name: string): string | null;
}

interface ClientIpOptions {
  peerIp?: string | null;
  trustProxyHeaders?: boolean;
}

interface RequestIpSource {
  headers: HeaderSource;
  ip?: string | null;
}

function shouldTrustProxyHeaders(explicit?: boolean): boolean {
  if (typeof explicit === 'boolean') {
    return explicit;
  }

  return process.env.TRUST_PROXY_HEADERS === 'true';
}

function normalizeIp(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function getClientIp(
  headers: HeaderSource,
  options: ClientIpOptions = {}
): string {
  const peerIp = normalizeIp(options.peerIp);
  if (peerIp) {
    return peerIp;
  }

  if (!shouldTrustProxyHeaders(options.trustProxyHeaders)) {
    return 'unknown';
  }

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map((ip) => ip.trim());
    if (ips.length > 0 && ips[0]) {
      return ips[0];
    }
  }

  return 'unknown';
}

export function getClientIpFromRequest(
  request: RequestIpSource,
  options: Omit<ClientIpOptions, 'peerIp'> = {}
): string {
  return getClientIp(request.headers, {
    peerIp: request.ip,
    trustProxyHeaders: options.trustProxyHeaders
  });
}

export function getRateLimitKey(
  headers: HeaderSource,
  bucket: string,
  options: ClientIpOptions = {}
): string {
  return `${getClientIp(headers, options)}:${bucket}`;
}

export function getRateLimitKeyFromRequest(
  request: RequestIpSource,
  bucket: string,
  options: Omit<ClientIpOptions, 'peerIp'> = {}
): string {
  return `${getClientIpFromRequest(request, options)}:${bucket}`;
}
