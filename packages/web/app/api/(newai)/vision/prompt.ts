interface ChatMessageContent {
  type: 'text' | 'image';
  text?: string;
  image?: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: ChatMessageContent[];
}

export const generateMessages = (
  model: string,
  image: string,
  customInstructions: string
): ChatMessage[] => {
  const defaultInstruction = "Extract text from image. If there's a drawing, describe it.";
  const responseInstruction = "Respond with only the extracted text or description.";
  
  // Combine default with custom instructions if provided
  const promptText = customInstructions?.trim() 
    ? `${defaultInstruction} ${customInstructions} ${responseInstruction}`
    : `${defaultInstruction} ${responseInstruction}`;

  console.log(`Vision processing using model: ${model}`);

  switch (model) {
    case "gpt-4.1":
    case "gpt-4.1-mini":
    case "gpt-4o":
    case "claude-3-5-sonnet-20241022":
    default:
      return [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: promptText,
            },
            {
              type: "image",
              image: image,
            },
          ],
        },
      ];
  }
};
