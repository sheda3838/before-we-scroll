import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { Readable } from "stream";
import { getCompletionsCollection, getCompletionPhotosBucket } from "@/lib/mongodb";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // 1. Validate completion ObjectId format
    if (!id || !ObjectId.isValid(id)) {
      return new NextResponse(null, { status: 404 });
    }

    // 2. Fetch parent completion document
    const collection = await getCompletionsCollection();
    const doc = await collection.findOne(
      { _id: new ObjectId(id) },
      {
        projection: {
          "feedback.shareFeedbackPublicly": 1,
          "feedback.sharePhotoPublicly": 1,
          photo: 1,
        },
      }
    );

    if (!doc) {
      return new NextResponse(null, { status: 404 });
    }

    // 3. Strict consent verification:
    // Both shareFeedbackPublicly AND sharePhotoPublicly must be true,
    // and photo metadata with gridFsFileId must exist.
    const shareFeedback = Boolean(doc.feedback?.shareFeedbackPublicly);
    const sharePhoto = Boolean(doc.feedback?.sharePhotoPublicly);
    const photoMeta = doc.photo;

    if (!shareFeedback || !sharePhoto || !photoMeta?.gridFsFileId) {
      return new NextResponse(null, { status: 404 });
    }

    const rawGridFsId = photoMeta.gridFsFileId;
    let gridFsObjectId: ObjectId;
    try {
      gridFsObjectId = typeof rawGridFsId === "string" ? new ObjectId(rawGridFsId) : rawGridFsId;
    } catch {
      return new NextResponse(null, { status: 404 });
    }

    // 4. Retrieve GridFS file
    const bucket = await getCompletionPhotosBucket();
    const files = await bucket.find({ _id: gridFsObjectId }).limit(1).toArray();

    if (!files || files.length === 0) {
      return new NextResponse(null, { status: 404 });
    }

    const fileDoc = files[0];
    const mimeType = photoMeta.mimeType || (fileDoc.metadata?.mimeType as string) || "image/jpeg";

    // 5. Open stream and return binary response
    const nodeStream = bucket.openDownloadStream(gridFsObjectId);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(fileDoc.length),
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    console.error("[GET /api/public/completions/[id]/photo] Error:", err);
    return new NextResponse(null, { status: 404 });
  }
}
