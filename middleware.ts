export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/dashboard/:path*', '/aube/:path*', '/cv-builder/:path*', '/letters/:path*', '/rise/:path*'],
};
