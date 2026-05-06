import { NextRequest } from "next/server";
import { courseSchema } from "@/lib/schema";
import { buildOlxFiles } from "@/lib/olx/builder";
import { packTarGz } from "@/lib/olx/tar";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const jsonRaw = form.get("course");
  if (typeof jsonRaw !== "string") {
    return Response.json({ error: "missing 'course' field" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonRaw);
  } catch {
    return Response.json({ error: "course is not valid JSON" }, { status: 400 });
  }

  const result = courseSchema.safeParse(parsed);
  if (!result.success) {
    return Response.json({ error: "schema", issues: result.error.issues }, { status: 400 });
  }

  const assets = new Map<string, Buffer>();
  for (const [key, val] of form.entries()) {
    if (key === "course") continue;
    if (val instanceof File) {
      const buf = Buffer.from(await val.arrayBuffer());
      assets.set(val.name, buf);
    }
  }

  const { files, missingAssets } = buildOlxFiles(result.data, assets);
  if (missingAssets.length > 0) {
    return Response.json(
      { error: "missing_assets", missing: missingAssets },
      { status: 400 },
    );
  }

  const stream = packTarGz(files);
  const filename = `${result.data.course.courseCode}-${result.data.course.run}.tar.gz`;
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
