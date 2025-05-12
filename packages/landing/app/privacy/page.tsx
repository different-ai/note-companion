import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      <div className="prose lg:prose-xl">
        <p className="mb-4">
          This Privacy Policy describes how Note Companion AI collects and uses your information.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">Information We Collect</h2>
        <p className="mb-4">
          <strong>Account Information:</strong> When you create an account, we collect your email address and basic profile information.
        </p>
        <p className="mb-4">
          <strong>Usage Data:</strong> We collect information about how you use our service, including features accessed and token usage.
        </p>
        <p className="mb-4">
          <strong>Your Content:</strong> We process the notes, documents, and files you upload or create to provide our service.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">How We Use Your Information</h2>
        <p className="mb-4">
          We use your information to:
        </p>
        <ul className="list-disc pl-5 mb-4">
          <li>Provide and improve our service</li>
          <li>Process and organize your content</li>
          <li>Communicate with you about your account</li>
          <li>Track usage for subscription limits</li>
        </ul>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">Data Storage and Security</h2>
        <p className="mb-4">
          We take reasonable measures to protect your data. Your content is processed securely and we use industry-standard encryption for data in transit.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">Third-Party Services</h2>
        <p className="mb-4">
          We use third-party services to help operate our service, including:
        </p>
        <ul className="list-disc pl-5 mb-4">
          <li>Clerk for authentication</li>
          <li>Vercel for hosting</li>
          <li>OpenAI for AI processing</li>
        </ul>
        <p className="mb-4">
          These services have their own privacy policies that govern how they process your data.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">Your Rights</h2>
        <p className="mb-4">
          You can access, update, or delete your account information at any time. If you delete your account, we will delete your content or make it anonymous within a reasonable time.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">Changes to This Policy</h2>
        <p className="mb-4">
          We may update this policy from time to time. We'll notify you of significant changes via email or through our website.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">Contact Us</h2>
        <p className="mb-6">
          If you have questions about our privacy practices, please contact us at{' '}
          <a href="mailto:ben@notecompanion.ai" className="text-blue-600 hover:underline">
            ben@notecompanion.ai
          </a>.
        </p>
        
        <div className="text-sm text-gray-600 mt-8 border-t pt-4">
          Last updated: {new Date().toISOString().split('T')[0]}
        </div>
      </div>
    </div>
  );
}  