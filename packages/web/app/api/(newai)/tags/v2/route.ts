import { NextRequest, NextResponse } from "next/server";
import { handleAuthorizationV2 } from "@/lib/handleAuthorization";
import { incrementAndLogTokenUsage } from "@/lib/incrementAndLogTokenUsage";
import { getModel } from "@/lib/models";
import { z } from "zod";
import { generateObject } from "ai";

const tagsSchema = z.object({
  suggestedTags: z.array(z.object({
    score: z.number().min(0).max(100),
    isNew: z.boolean(),
    tag: z.string(),
    reason: z.string(),
  }))
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await handleAuthorizationV2(request);
    const { 
      content, 
      fileName, 
      existingTags = [], 
      customInstructions = "", 
      count = 3 
    } = await request.json();

    const response = await generateObject({
      model: getModel(process.env.MODEL_NAME),
      schema: tagsSchema,
      system: `You are a precise tag generator. Analyze content and suggest ${count} relevant tags.
              ${existingTags.length ? `Consider existing tags: ${existingTags.join(", ")}` : 'Create new tags if needed.'}
              ${customInstructions ? `Follow these custom instructions: ${customInstructions}` : ''}
              
              Guidelines:
              - Prefer existing tags when appropriate (score them higher)
              - Create specific, meaningful new tags when needed
              - Score based on relevance (0-100)
              - Include brief reasoning for each tag
              - Focus on key themes, topics, and document type`,
      prompt: `File: "${fileName}"
              
              Content: """
              ${content}
              """`,
    });

    await incrementAndLogTokenUsage(userId, response.usage.totalTokens);

    // Sort tags by score and format response
    const sortedTags = response.object.suggestedTags
      .sort((a, b) => b.score - a.score)
      .map(tag => ({
        ...tag,
        tag: tag.tag.startsWith('#') ? tag.tag : `#${tag.tag}`,
      }));

    return NextResponse.json({ tags: sortedTags });
  } catch (error) {
    console.error('Tag generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate tags' },
      { status: error.status || 500 }
    );
  }
}