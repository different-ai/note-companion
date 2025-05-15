'use client';

import { Plus, Minus } from "lucide-react";
import { useState } from "react";

const FaqItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-border rounded-lg">
      <button
        className="w-full px-6 py-4 flex items-center justify-between text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-semibold">{question}</span>
        {isOpen ? (
          <Minus className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Plus className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-4">
          <p 
            className="text-muted-foreground whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: answer }}
          />
        </div>
      )}
    </div>
  );
};

export function FaqSection() {
  return (
    <section className="w-full py-24 bg-muted/50">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-3xl font-bold text-center mb-12">FAQ</h2>
        <div className="space-y-6">
          <FaqItem
            question="How to use the plugin?"
            answer={`<strong>Getting Started</strong>
1. Install the plugin from Obsidian's community plugins
2. Choose your preferred plan
3. You're all set!

<strong>Learn More</strong>
• <a href="https://github.com/different-ai/file-organizer-2000/blob/master/README.md#a-ai-organizer" class="text-accent underline hover:no-underline">Read our documentation</a> for core features and setup guide

<strong>Video Tutorials</strong>
• Check out our <a href="https://www.youtube.com/playlist?list=PLgRcC-DFR5jcwwg0Dr3gNZrkZxkztraKE" class="text-accent underline hover:no-underline">comprehensive video tutorials</a> for detailed walkthroughs`}
          />
          <FaqItem
            question="Which models can I use?"
            answer={`<strong>Cloud Service</strong>
• With a subscription, you get access to GPT-4.1-mini model. It's the best all-around model for performance.

<strong>Lifetime Access</strong>
• GPT-4.1-mini configured by default
• Option to setup other openAI compatible models:
  - Anthropic
  - Gemini
  - Groq


<strong>Self-Hosted Option</strong>
• Use any local model of your choice
• Currently supports Ollama local models
• Note: Some configuration may be required

<strong>Coming Soon</strong>
• Full experience powered by local models (Deepseek)
• Enhanced local model support`}
          />
          <FaqItem
            question="Is there a free version?"
            answer="Yes! You can self-host the plugin for free. We also offer a 7-day free trial for our managed service if you prefer a no-hassle experience.
            If you get enough value out of the plugin, please consider supporting the product. This is an open source initiative developed by two brothers and we are 100% self-funded. Any contribution helps us continue to maintain and improve the plugin. ❤️"
            
          />
          <FaqItem
            question="Privacy Policy & Contact"
            answer={`Privacy is super important to us. Here's a quick rundown of how we handle your information:

<strong>Your Files</strong>
  Your files are processed through OpenAI's GPT-4.1-mini when using the cloud-hosted version.
  Unlike with a Chat GPT subscription, your prompts are not saved or stored anywhere other than your computer.

<strong>Your Data</strong>
  We use Clerk for authentication, so your login details are safe and secure. Stripe handles all payments, ensuring your payment information is protected.

<strong>Contact Us</strong>
  Have questions or concerns about your privacy? Reach out to us at:
  • Email: ben@notecompanion.ai
  • Discord: ben@notecompanion.ai`}
          />
        </div>
      </div>
    </section>
  );
}  