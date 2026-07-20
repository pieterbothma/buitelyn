import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { loadInvoiceData } from "@/lib/invoice-data";
import { invoicePdfBuffer } from "@/lib/invoice-pdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ fout: "verbode" }, { status: 401 });

  const data = await loadInvoiceData(sb, id);
  if (!data) return NextResponse.json({ fout: "nie gevind" }, { status: 404 });

  const buffer = await invoicePdfBuffer(data);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${data.nommer}.pdf"`,
    },
  });
}
