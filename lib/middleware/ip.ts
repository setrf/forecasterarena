interface HeaderSource {
  get(name: string): string | null;
}

export function getClientIp(headers: HeaderSource): string {
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

export function getRateLimitKey(headers: HeaderSource, bucket: string): string {
  return `${getClientIp(headers)}:${bucket}`;
}
