import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { WINKEL_OOP } from "@/lib/winkel/oop";

/* Verfris die Supabase-sessie op die gegateerde markte-roetes sodat
   bedienerkant-getUser() nie op 'n verstreke token struikel nie. */
export async function middleware(request: NextRequest) {
  /* Die winkel-roetes het geen sessie nodig nie; hulle is hier net vir die
     toe-winkel-herleiding. 307, nie 308 nie: die winkel kom terug. */
  const pad = request.nextUrl.pathname;
  if (pad === "/winkel" || pad.startsWith("/winkel/")) {
    if (WINKEL_OOP || pad === "/winkel/bevestig") return NextResponse.next();
    return NextResponse.redirect(new URL("/", request.url), 307);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (all) => {
          all.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          all.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/markte", "/markte/:path*", "/profiel", "/auth/:path*", "/api/markte/chat", "/winkel", "/winkel/:path*"],
};
