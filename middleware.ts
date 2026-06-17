import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

// Gate the whole app behind a session. Public: /login and the auth API.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (session) return NextResponse.next();

  // Unauthenticated
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

// Run on everything except Next internals and static assets in /public.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|tinymce/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|json|xml|txt|map|woff|woff2|ttf)$).*)",
  ],
};
