# Self-Hosting Note Companion

This guide will help you set up your own instance of Note Companion, allowing you to use all features for free with your own AI API keys.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Setup](#quick-setup)
- [Detailed Installation](#detailed-installation)
- [Configuration Options](#configuration-options)
- [Supported AI Providers](#supported-ai-providers)
- [Troubleshooting](#troubleshooting)
- [Updating](#updating)
- [Security Considerations](#security-considerations)

## Prerequisites

- **Node.js** 18 or higher
- **pnpm** package manager (install with `npm install -g pnpm`)
- **Git** for cloning the repository
- **AI API Key** from at least one provider (OpenAI recommended for best results)
- **4GB RAM** minimum on your server/computer
- **Port 3010** available (or configure a different port)

## Quick Setup

The fastest way to get started with self-hosting:

```bash
# 1. Clone the repository
git clone https://github.com/Nexus-JPF/note-companion.git
cd note-companion

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cd packages/web
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env

# 4. Build for self-hosting
pnpm build:self-host

# 5. Start the server
pnpm start
```

Your server will be running at `http://localhost:3010`

## Detailed Installation

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/Nexus-JPF/note-companion.git
cd note-companion

# Install all dependencies
pnpm install
```

### Step 2: Configure Environment Variables

Navigate to the web package:

```bash
cd packages/web
```

Create a `.env` file with your configuration:

```env
# Required: At least one AI provider API key
OPENAI_API_KEY=sk-...your_key_here...

# Optional: Additional AI providers
ANTHROPIC_API_KEY=sk-ant-...your_key_here...
GOOGLE_GENERATIVE_AI_API_KEY=...your_key_here...
GROQ_API_KEY=gsk_...your_key_here...

# Optional: Server configuration
PORT=3010  # Change if needed
NODE_ENV=production

# Optional: For OCR features (handwriting recognition)
GOOGLE_VISION_API_KEY=...your_key_here...
```

#### Getting API Keys

- **OpenAI**: Sign up at [platform.openai.com](https://platform.openai.com), go to API Keys section
- **Anthropic**: Sign up at [console.anthropic.com](https://console.anthropic.com)
- **Google**: Get API keys from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Groq**: Sign up at [console.groq.com](https://console.groq.com)

### Step 3: Build the Application

From the `packages/web` directory:

```bash
# Build specifically for self-hosting (includes all necessary features)
pnpm build:self-host
```

This command:

- Builds the Next.js application
- Configures it for standalone deployment
- Optimizes for self-hosted environment

### Step 4: Start the Server

```bash
# Start the production server
pnpm start
```

The server will start on port 3010 by default. You should see:

```
▲ Next.js 15.x.x
- Local:        http://localhost:3010
- Network:      http://[your-ip]:3010
✓ Ready
```

### Step 5: Configure the Obsidian Plugin

1. Open Obsidian and go to Settings → Note Companion
2. Scroll to "Advanced Settings"
3. Enable "Self-hosting mode"
4. Set the server URL:
   - For local machine: `http://localhost:3010`
   - For network access: `http://[your-server-ip]:3010`
   - For domain with SSL: `https://your-domain.com`
5. Click "Test Connection" to verify

## Configuration Options

### Using Different Ports

If port 3010 is occupied, you can use a different port:

```env
PORT=8080
```

Then update the plugin settings to use `http://localhost:8080`

### Running as a Service

#### Linux (systemd)

Create `/etc/systemd/system/note-companion.service`:

```ini
[Unit]
Description=Note Companion Server
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/note-companion/packages/web
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable note-companion
sudo systemctl start note-companion
```

#### Docker

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install -g pnpm
RUN pnpm install
WORKDIR /app/packages/web
RUN pnpm build:self-host
EXPOSE 3010
CMD ["pnpm", "start"]
```

Build and run:

```bash
docker build -t note-companion .
docker run -p 3010:3010 --env-file packages/web/.env note-companion
```

### Using PM2 (Process Manager)

Install PM2 globally:

```bash
npm install -g pm2
```

Start the application:

```bash
cd packages/web
pm2 start "pnpm start" --name note-companion
pm2 save
pm2 startup  # Follow the instructions to enable auto-start
```

## Supported AI Providers

### OpenAI (Recommended)

Best overall performance and feature support.

- Models: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- Features: All features supported
- Cost: ~$0.01-0.03 per file processed

### Anthropic Claude

Excellent for complex analysis and longer documents.

- Models: Claude 3 Opus, Sonnet, Haiku
- Features: All text features (no vision/OCR)
- Cost: Similar to OpenAI

### Google Gemini

Good balance of features and cost.

- Models: Gemini Pro, Gemini Pro Vision
- Features: All features including vision
- Cost: Free tier available

### Groq

Fastest inference, good for quick processing.

- Models: Llama 3, Mixtral
- Features: Basic text processing
- Cost: Very competitive

### Local Models (Ollama)

Run models completely offline.

1. Install [Ollama](https://ollama.ai)
2. Pull a model: `ollama pull llama3`
3. Set in plugin settings: Model = "llama3", API URL = "http://localhost:11434"

## Troubleshooting

### Common Issues

#### "Cannot connect to server"

- Verify the server is running: `curl http://localhost:3010/api/health`
- Check firewall settings
- Ensure the URL in plugin settings is correct

#### "Invalid API key"

- Double-check your API key in the `.env` file
- Ensure there are no extra spaces or quotes
- Restart the server after changing environment variables

#### "Out of memory"

- Increase Node.js memory limit: `NODE_OPTIONS="--max-old-space-size=4096" pnpm start`
- Consider using a more powerful server

#### "Permission denied"

- Ensure you have write permissions in the installation directory
- On Linux/Mac, you might need to use `sudo` for port numbers below 1024

### Checking Logs

View server logs:

```bash
# If using PM2
pm2 logs note-companion

# If using systemd
journalctl -u note-companion -f

# Direct output
pnpm start 2>&1 | tee server.log
```

## Updating

To update to the latest version:

```bash
cd note-companion
git pull origin master
pnpm install
cd packages/web
pnpm build:self-host
# Restart your server
```

## Security Considerations

### Network Security

1. **Firewall**: Only expose port 3010 to trusted networks
2. **HTTPS**: Use a reverse proxy (nginx/Caddy) with SSL for internet access
3. **Authentication**: The self-hosted version doesn't include authentication by default

### API Key Security

- Never commit `.env` files to version control
- Use environment-specific configurations
- Rotate API keys regularly
- Monitor API usage on provider dashboards

### Example Nginx Configuration

For HTTPS access with nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Advanced Configuration

### Database Setup (Optional)

By default, the self-hosted version uses SQLite. For production use, you can configure PostgreSQL:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/notecompanion
```

### Resource Limits

Configure processing limits in `.env`:

```env
MAX_FILE_SIZE=10485760  # 10MB in bytes
MAX_TOKENS_PER_REQUEST=8000
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=900000  # 15 minutes in ms
```

### Custom Models

You can use custom model endpoints:

```env
CUSTOM_MODEL_ENDPOINT=https://your-model-api.com
CUSTOM_MODEL_API_KEY=your_key
```

Then configure in the plugin settings to use your custom model.

## Getting Help

- **GitHub Issues**: [github.com/Nexus-JPF/note-companion/issues](https://github.com/Nexus-JPF/note-companion/issues)
- **Documentation**: Check the `/docs` folder in the repository
- **Community**: Join our Discord server (link in main README)

## License

The self-hosted version is provided under the MIT License. You're free to modify and distribute it according to the license terms.

---

**Note**: Self-hosting requires technical knowledge and ongoing maintenance. If you prefer a managed solution, consider our cloud service at [notecompanion.ai](https://notecompanion.ai).
