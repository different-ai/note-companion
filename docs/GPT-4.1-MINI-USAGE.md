# Using GPT-4.1-Mini in Note Companion

## Overview

Note Companion uses OpenAI's GPT-4.1-Mini model as its default AI model for all intelligent features including file organization, note enhancement, and AI chat functionality.

## Model Features

**GPT-4.1-Mini** is optimized for:
- Fast response times
- Cost-effective operations
- Reliable note organization
- Accurate content classification
- Efficient summarization

## Configuration

### Environment Setup

To use GPT-4.1-Mini, you need to configure your OpenAI API key:

1. **For Cloud Users**: API access is handled automatically with your subscription
2. **For Self-Hosted Users**: Add your OpenAI API key to your environment:
   ```bash
   OPENAI_API_KEY=your-api-key-here
   ```

### Optional Base URL Configuration

If you're using a proxy or alternative OpenAI-compatible endpoint:
```bash
OPENAI_API_BASE=https://your-custom-endpoint.com/v1
```

## How It's Used

### 1. File Organization
When you add files to your inbox folder, GPT-4.1-Mini:
- Analyzes file content
- Determines appropriate categories
- Suggests folder destinations
- Generates relevant tags

### 2. Note Enhancement
The model enhances your notes by:
- Formatting content for better readability
- Adding contextual metadata
- Creating summaries
- Extracting key points

### 3. AI Chat
In the AI chat interface, GPT-4.1-Mini:
- Answers questions about your notes
- Helps find related content
- Generates new ideas based on your vault
- Performs actions through available tools

### 4. Special Features
- **Audio Transcription**: Converts speech to text, then uses GPT-4.1-Mini for formatting
- **OCR Processing**: Extracts text from images, then enhances with AI
- **YouTube Summaries**: Fetches transcripts and creates concise summaries

## Usage Examples

### Basic File Organization
```
1. Drop a file into your inbox folder
2. Note Companion uses GPT-4.1-Mini to analyze it
3. File is automatically moved to the appropriate folder
```

### AI Chat Commands
```
User: "Summarize my meeting notes from today"
GPT-4.1-Mini: Analyzes recent notes and provides a summary

User: "Find all notes about project X"
GPT-4.1-Mini: Searches vault and returns relevant results
```

## Performance Tips

1. **Batch Processing**: Process multiple files at once for efficiency
2. **Clear File Names**: Descriptive names help the AI make better decisions
3. **Structured Content**: Well-formatted input leads to better organization

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Verify your OpenAI API key is valid
   - Check you have sufficient API credits
   - Ensure no typos in environment configuration

2. **Slow Processing**
   - Check your internet connection
   - Consider processing fewer files at once
   - Verify API endpoint is accessible

3. **Unexpected Results**
   - Review your custom prompts (if any)
   - Check file content is readable
   - Ensure files aren't corrupted

## Cost Considerations

GPT-4.1-Mini is designed to be cost-effective:
- Approximately 10x cheaper than GPT-4
- Suitable for high-volume processing
- Efficient token usage

For self-hosted users, monitor your OpenAI API usage to manage costs.

## Advanced Configuration

### Custom Prompts
You can customize how GPT-4.1-Mini processes your notes by modifying prompt templates in the plugin settings.

### API Limits
Default rate limits:
- Requests per minute: Based on your OpenAI tier
- Token limits: Automatically managed by the plugin

## Future Updates

The model configuration is designed to be flexible. While currently using GPT-4.1-Mini exclusively, the architecture supports easy updates if needed.