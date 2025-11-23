import { NextResponse, NextRequest } from "next/server";
import {  generateText } from "ai";
import { getModel } from "@/lib/models";
import { handleAuthorizationV2 } from "@/lib/handleAuthorizationV2";
import { incrementAndLogTokenUsage } from "@/lib/incrementAndLogTokenUsage";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { userId } = await handleAuthorizationV2(request);
    const model = getModel(process.env.VISION_MODEL_NAME);

    const defaultInstruction = "Extract text from image. If there's a drawing, describe it.";
    const responseInstruction = "Respond with only the extracted text or description.";
    
    const promptText = payload.instructions?.trim() 
      ? `${defaultInstruction} ${payload.instructions} ${responseInstruction}`
      : `${defaultInstruction} ${responseInstruction}`;
    console.log("promptText", promptText);


    const response = await generateText({
      model,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: promptText },
          { type: "image", image: payload.image }
        ],
      }],
    });
    const tokens = response.usage.totalTokens;
    console.log("incrementing token usage vision", userId, tokens);
    await incrementAndLogTokenUsage(userId, tokens);

    return NextResponse.json({ text: response.text });
  } catch (error) {
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
  }
}