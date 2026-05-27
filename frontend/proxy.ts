import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js 16 Proxy Convention
 * This replaces the deprecated middleware.ts file.
 * It is used for network-level tasks like logging, authentication, and redirects.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // EXCLUDE static files, images, and internal next.js requests from logging
  const isExcluded = 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/static') ||
    pathname.includes('.') || // Extension-based (e.g. .png, .ico, .js, .css)
    pathname === '/favicon.ico' ||
    pathname.includes('/api/'); // Exclude internal API calls to avoid double logging if preferred

  if (!isExcluded) {
    const start = Date.now();
    const response = await NextResponse.next();
    const duration = Date.now() - start;
    
    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    const method = request.method;
    const ip = request.ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const status = response.status;
    
    // Using String.fromCharCode(27) for the escape character (more robust)
    const ESC = String.fromCharCode(27);
    const color = method === 'GET' ? `${ESC}[32m` : `${ESC}[33m`;
    const reset = `${ESC}[0m`;
    
    console.log(`${color}[${timestamp}] ${ip} ${method} ${pathname} ${status} in ${duration}ms${reset}`);
    return response;
  }

  return NextResponse.next();
}

// Ensure it runs on all relevant paths
export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};
