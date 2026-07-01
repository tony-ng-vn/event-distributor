/**
 * Clerk proxy — runs on every page and API request (Next.js 16+ convention).
 *
 * Reads session cookies so auth() and currentUser() work in API routes.
 * Public routes (feed, ingest) still work without sign-in; Accept requires auth.
 *
 * matcher: skip static files (_next, images, favicon) for performance.
 */
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
