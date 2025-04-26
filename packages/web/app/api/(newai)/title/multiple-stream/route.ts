import { openai } from '@ai-sdk/openai';
import { streamObject } from 'ai';
import { z } from "zod";
import { incrementAndLogTokenUsage } from "@/lib/incrementAndLogTokenUsage";
import { handleAuthorization } from "@/lib/handleAuthorization";
import { NextResponse, NextRequest } from "next/server";
import { getModel } from '@/lib/models';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const titleSchema = z.object({
  names: z.array(z.string().max(60)).length(3),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await handleAuthorization(req);
    const { document, renameInstructions, currentName, vaultTitles } = await req.json();

    const prompt = `As an AI specializing in document analysis, your task is to generate highly specific and unique titles for the given document. Analyze the content thoroughly to identify key elements such as:

    - Main topics or themes
    - Specific projects, products, or initiatives
    - Key stakeholders or entities involved
    - Crucial actions, decisions, or outcomes

    Create 3 distinct titles that capture the essence of the document. Each title should:
    - Be highly specific and unique to the document's content
    - Contain no more than 50 characters
    - Avoid using special characters
    - Be easily searchable and relevant
    - Not follow any predefined patterns or formats

    Additional context:
    Time: ${new Date().toISOString()}
    Current Name: ${currentName}
    Document Content: ${document}

    ${vaultTitles && vaultTitles.length > 0 ? `
      Strongly inspire the structure and tone of the title from this titles list:
    ${vaultTitles.join('\n')}
    ` : ''}

    ${renameInstructions}

    Remember, the goal is to create titles that are instantly informative and distinguishable from other documents.`;

    const modelName = process.env.MODEL_NAME || 'gpt-4.1-mini';
    console.log(`Title generation using model: ${modelName}`);
    
    const result = await streamObject({
      model: getModel(modelName),
      
      schema: titleSchema,
      prompt,
      onFinish: async ({ usage }) => {
        console.log(`Title generation completed with ${usage.totalTokens} tokens`);
        await incrementAndLogTokenUsage(userId, usage.totalTokens);
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.log(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.status || 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}