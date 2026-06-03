import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { Role } from '@/lib/roles';
import { canManageInventory, canResolveIssues } from '@/lib/roles';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/dashboard/store(.*)',
  '/dashboard/stores(.*)',
  '/store(.*)',
]);

// Routes restricted to store_admin + super_admin
const isStoreAdminRoute = createRouteMatcher([
  '/dashboard/products(.*)',
  '/dashboard/inventory(.*)',
]);

// Routes restricted to super_admin only
const isSuperAdminRoute = createRouteMatcher(['/dashboard/admin(.*)', '/dashboard/onboarding(.*)']);

// Requires Clerk session token template with: { "metadata": "{{user.public_metadata}}" }
// Set this up at: Clerk Dashboard → Sessions → Customize session token
export const proxy = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  if (isStoreAdminRoute(request) || isSuperAdminRoute(request)) {
    const { sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: Role } | undefined)?.role;

    if (isSuperAdminRoute(request) && !canResolveIssues(role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (isStoreAdminRoute(request) && !canManageInventory(role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/api/(.*)',
  ],
};
