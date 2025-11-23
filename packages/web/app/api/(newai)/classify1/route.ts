// app/app/api/(ai)/classify/route.ts
import { NextResponse, NextRequest } from "next/server";
import { classifyDocument } from "../aiService";
import { handleAuthorizationV2 } from "@/lib/handleAuthorization";
import { incrementAndLogTokenUsage } from "@/lib/incrementAndLogTokenUsage";
import { getModel } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await handleAuthorizationV2(request);
    const { content, fileName, templateNames } = await request.json();
    const model = getModel(process.env.MODEL_NAME);
    const response = await classifyDocument(
      content,
      fileName,
      templateNames,
      model
    );
    // increment tokenUsage
    const tokens = response.usage.totalTokens;
    console.log("incrementing token usage classify", userId, tokens);
    await incrementAndLogTokenUsage(userId, tokens);
    const documentType = response.object.documentType;
    return NextResponse.json({ documentType });
  } catch (error) {
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
  }
}
