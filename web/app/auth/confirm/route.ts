import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const supabase = await supabaseServer();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      const doel = type === "recovery" ? "/markte?stel-wagwoord=1" : "/markte";
      return NextResponse.redirect(new URL(doel, request.url));
    }
  }

  // Terugval: PKCE-kodevloei (Supabase se verstek-verify-herleiding).
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/markte", request.url));
  }

  return NextResponse.redirect(new URL("/markte?fout=teken-in", request.url));
}
