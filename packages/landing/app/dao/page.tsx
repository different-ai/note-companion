import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Users, 
  Vote, 
  Rocket, 
  ArrowRight, 
  Github, 
  MessageCircle, 
  Twitter,
  CheckCircle2,
  Zap,
  Shield,
  Share2,
  Layers,
  Activity,
  PhoneIcon
} from "lucide-react";

// Metadata is defined in layout.tsx

export default function DaoPage() {
  return (
    <>
      {/* Hero Section */}
      <div className="w-full bg-gradient-to-b from-primary-100 to-transparent pt-12 pb-14">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
            <div className="lg:col-span-3">
              <h1 className="text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                Note Companion DAO
              </h1>
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                Join our community-owned collective to shape the future of knowledge management. 
                Receive rewards, vote on features, and help build a note-taking experience that 
                truly belongs to its users.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="https://t.me/notecompanion" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="bg-primary hover:bg-primary-700 text-white">
                    Join Our Community
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
                <a href="https://www.daos.fun/dao/8iLdHtnZL3aLVRVseT1Rv3cytngqPPoe2hWcouJLd8Gd" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary-50">
                    Get DAO Tokens
                  </Button>
                </a>
              </div>
            </div>
            <div className="lg:col-span-2 flex justify-center">
              <div className="relative w-80 h-80">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary-200 to-primary-100 rounded-full opacity-70 blur-2xl"></div>
                <div className="relative z-10">
                  <Image
                    src="https://framerusercontent.com/images/SqHU6Ili7ACWk8dhvEPmdfXEPDA.png"
                    alt="Note Companion DAO"
                    width={320}
                    height={320}
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Status Callout */}
      <div className="w-full bg-primary-50 py-4 border-y border-primary-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
            <div className="flex items-center mb-2 sm:mb-0">
              <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
              <p className="text-gray-800 font-medium">
                Note Companion is an established product with an active user base
              </p>
            </div>
            <Link href="/" className="sm:ml-2">
              <span className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center transition-colors">
                Visit Product Homepage
                <ArrowRight className="ml-1 h-3 w-3" />
              </span>
            </Link>
          </div>
        </div>
      </div>
      {/* Key Benefits Section */}
      <div className="w-full py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why We're Creating a DAO</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Note Companion has grown from a simple organization tool to a community of passionate 
              knowledge workers. We're transitioning to a Decentralized Autonomous Organization to 
              ensure the project remains community-driven.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white shadow-sm border border-gray-100 p-8 rounded-xl hover:shadow-md transition-shadow duration-200">
              <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center mb-6">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Better Community Service</h3>
              <p className="text-gray-600">
                Direct input from token holders on feature priorities and development direction ensures 
                we build what users actually need.
              </p>
            </div>
            
            <div className="bg-white shadow-sm border border-gray-100 p-8 rounded-xl hover:shadow-md transition-shadow duration-200">
              <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center mb-6">
                <Zap className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Reward Early Supporters</h3>
              <p className="text-gray-600">
                Token holders receive special benefits, discounts on subscriptions, early access to new features, 
                and exclusive airdrops.
              </p>
            </div>
            
            <div className="bg-white shadow-sm border border-gray-100 p-8 rounded-xl hover:shadow-md transition-shadow duration-200">
              <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center mb-6">
                <Rocket className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Beyond Obsidian</h3>
              <p className="text-gray-600">
                Community governance guides our expansion to other platforms and integrations, 
                bringing the power of Note Companion everywhere.
              </p>
            </div>
            
            <div className="bg-white shadow-sm border border-gray-100 p-8 rounded-xl hover:shadow-md transition-shadow duration-200">
              <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center mb-6">
                <Shield className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Long-term Sustainability</h3>
              <p className="text-gray-600">
                Community ownership means the project isn't dependent on any single developer, 
                ensuring Note Companion thrives for years to come.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* How It Works Section */}
      <div className="w-full py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The Note Companion DAO operates through a token-based governance system that gives 
              power to community members while ensuring the project's long-term success.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <Image 
                src="https://framerusercontent.com/images/JYKEtCqETrv0vvMyVUQsN561kT0.png" 
                width={500} 
                height={500} 
                alt="DAO Governance" 
                className="rounded-xl shadow-lg"
              />
            </div>
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Token Distribution</h3>
                  <p className="text-gray-600">
                    Tokens are distributed to early supporters, contributors, and through 
                    future community initiatives, creating a fair ownership model.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Vote className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Voting Rights</h3>
                  <p className="text-gray-600">
                    Token holders can vote on proposals for new features, integrations, and 
                    other project decisions, ensuring everyone has a voice.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Share2 className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Community Benefits</h3>
                  <p className="text-gray-600">
                    Token holders receive special pricing, early access to new features, and 
                    exclusive airdrops as a reward for their participation.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Activity className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Transparent Governance</h3>
                  <p className="text-gray-600">
                    All proposals and voting are publicly visible and auditable, ensuring
                    full transparency in decision-making.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Get Involved Section */}
      <div className="w-full py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Get Involved</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              There are multiple ways to participate in the Note Companion DAO and help shape 
              the future of personal knowledge management.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white shadow-md border border-primary-100 p-8 rounded-xl hover:shadow-lg transition-shadow duration-200">
              <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center mb-6">
                <MessageCircle className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Join Our Community</h3>
              <p className="text-gray-600 mb-5">
                Connect with other Note Companion enthusiasts and stay updated on DAO developments.
              </p>
              <div className="space-y-3">
                <a 
                  href="https://t.me/notecompanion" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-primary-600 hover:text-primary-700 transition-colors duration-200"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Join our Telegram
                </a>
                <a 
                  href="https://x.com/notecompanion" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-primary-600 hover:text-primary-700 transition-colors duration-200"
                >
                  <Twitter className="h-4 w-4 mr-2" />
                  Follow on Twitter
                </a>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 shadow-md border border-primary-200 p-8 rounded-xl hover:shadow-lg transition-shadow duration-200">
              <div className="h-14 w-14 rounded-full bg-white/80 flex items-center justify-center mb-6">
                <Zap className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Join via daos.fun</h3>
              <p className="text-gray-700 mb-5">
                Visit our page on daos.fun to purchase Note Companion DAO tokens and become a community member. This is currently the primary way to join and support the project.
              </p>
              <a 
                href="https://www.daos.fun/dao/8iLdHtnZL3aLVRVseT1Rv3cytngqPPoe2hWcouJLd8Gd" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-white rounded-lg text-primary-600 font-medium hover:bg-primary-50 transition-colors duration-200"
              >
                Get Note Companion DAO Tokens
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </div>

            <div className="bg-white shadow-md border border-primary-100 p-8 rounded-xl hover:shadow-lg transition-shadow duration-200">
              <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center mb-6">
                <Github className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Contribute on GitHub</h3>
              <p className="text-gray-600 mb-5">
                Star our repository, report issues, or contribute code. Active GitHub contributors will be eligible for DAO token rewards and special access privileges.
              </p>
              <div className="space-y-3">
                <a 
                  href="https://github.com/different-ai/file-organizer-2000" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-primary-600 hover:text-primary-700 transition-colors duration-200"
                >
                  <Github className="h-4 w-4 mr-2" />
                  Star on GitHub
                </a>
                <a 
                  href="https://github.com/different-ai/file-organizer-2000/issues" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-primary-600 hover:text-primary-700 transition-colors duration-200"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Report Issues
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Alternative Access Models */}
      <div className="w-full py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Alternative Access Models</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The DAO introduces new ways to access and contribute to Note Companion beyond traditional subscriptions.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white shadow-md border border-primary-100 p-8 rounded-xl hover:shadow-lg transition-shadow duration-200">
              <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center mb-6">
                <Shield className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Token Staking for Access</h3>
              <p className="text-gray-600">
                In addition to traditional subscription and lifetime plans, we'll implement a token staking model. By staking a certain amount of Note Companion DAO tokens, users can gain access to premium features without additional payments.
              </p>
            </div>

            <div className="bg-white shadow-md border border-primary-100 p-8 rounded-xl hover:shadow-lg transition-shadow duration-200">
              <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center mb-6">
                <Users className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Community Contributor Plan</h3>
              <p className="text-gray-600">
                We're introducing a special plan for active community contributors. By participating in governance, providing feedback, or contributing to development, users can earn access to the platform.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Product Roadmap */}
      <div className="w-full py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Product Roadmap</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              With community governance, we're expanding Note Companion in exciting new directions.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white shadow-md border border-primary-100 p-8 rounded-xl hover:shadow-lg transition-shadow duration-200">
              <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center mb-6">
                <Activity className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Model Context Protocol Integration</h3>
              <p className="text-gray-600 mb-4">
                We're implementing <a href="https://www.anthropic.com/news/model-context-protocol" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Model Context Protocol</a> to significantly enhance our AI capabilities.
              </p>
              <p className="text-gray-600">
                This will allow Note Companion to connect with any MCP-compatible AI system, giving users more choice in which models they use and enabling more powerful grounding and context management.
              </p>
            </div>

            <div className="bg-white shadow-md border border-primary-100 p-8 rounded-xl hover:shadow-lg transition-shadow duration-200">
              <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center mb-6">
                <PhoneIcon className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Mobile Companion App</h3>
              <p className="text-gray-600">
                We're developing dedicated mobile apps to bring the power of Note Companion beyond the desktop. Capture thoughts, organize notes, and access your knowledge base wherever you are.
              </p>
            </div>

            <div className="bg-white shadow-md border border-primary-100 p-8 rounded-xl hover:shadow-lg transition-shadow duration-200">
              <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center mb-6">
                <Layers className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Expanded Platform Support</h3>
              <p className="text-gray-600">
                While we started with Obsidian, we're extending Note Companion to support other note-taking platforms and communication tools, including Telegram, Logseq, Notion, and more. Our goal is to create a unified knowledge management experience across all your tools.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Development Timeline */}
      <div className="w-full py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">DAO Development Timeline</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our journey to a fully community-owned project will unfold in several phases.
            </p>
          </div>
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-primary-200"></div>
            
            {/* Phase 1 */}
            <div className="relative mb-16">
              <div className="flex items-center justify-center mb-8">
                <div className="bg-primary-600 text-white w-12 h-12 rounded-full flex items-center justify-center z-10 text-xl font-bold">1</div>
              </div>
              <div className="bg-white shadow-md border border-primary-100 p-8 rounded-xl max-w-xl mx-auto">
                <h3 className="text-2xl font-semibold mb-3 text-primary-600">Community Building</h3>
                <p className="text-gray-600">
                  Growing our Telegram and social media presence to establish a strong community foundation.
                  We're focusing on bringing together passionate users who want to help shape the future of Note Companion.
                </p>
              </div>
            </div>
            
            {/* Phase 2 */}
            <div className="relative mb-16">
              <div className="flex items-center justify-center mb-8">
                <div className="bg-primary-600 text-white w-12 h-12 rounded-full flex items-center justify-center z-10 text-xl font-bold">2</div>
              </div>
              <div className="bg-white shadow-md border border-primary-100 p-8 rounded-xl max-w-xl mx-auto">
                <h3 className="text-2xl font-semibold mb-3 text-primary-600">Initial Token Distribution</h3>
                <p className="text-gray-600">
                  Distributing tokens to early supporters and contributors, establishing the foundation for 
                  community ownership and participation in governance decisions.
                </p>
              </div>
            </div>
            
            {/* Phase 3 */}
            <div className="relative mb-16">
              <div className="flex items-center justify-center mb-8">
                <div className="bg-primary-600 text-white w-12 h-12 rounded-full flex items-center justify-center z-10 text-xl font-bold">3</div>
              </div>
              <div className="bg-white shadow-md border border-primary-100 p-8 rounded-xl max-w-xl mx-auto">
                <h3 className="text-2xl font-semibold mb-3 text-primary-600">Governance Structure</h3>
                <p className="text-gray-600">
                  Implementing voting mechanisms and proposal systems that allow the community to have a direct
                  say in product direction, feature prioritization, and other important decisions.
                </p>
              </div>
            </div>
            
            {/* Phase 4 */}
            <div className="relative">
              <div className="flex items-center justify-center mb-8">
                <div className="bg-primary-600 text-white w-12 h-12 rounded-full flex items-center justify-center z-10 text-xl font-bold">4</div>
              </div>
              <div className="bg-white shadow-md border border-primary-100 p-8 rounded-xl max-w-xl mx-auto">
                <h3 className="text-2xl font-semibold mb-3 text-primary-600">Expanded Development</h3>
                <p className="text-gray-600">
                  Community-driven expansion to new platforms and integrations, taking Note Companion beyond
                  its origins to serve a broader ecosystem of knowledge workers and note-takers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Final CTAs and Guidelines */}
      <div className="w-full py-20 bg-gradient-to-b from-white to-primary-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-white shadow-lg border border-primary-100 p-8 rounded-xl hover:shadow-xl transition-shadow duration-200">
              <h3 className="text-2xl font-semibold mb-4 text-primary-700">Stay Updated</h3>
              <p className="text-gray-600 mb-6">
                This is just the beginning of our journey. Join our community channels to stay informed about the latest developments, token distributions, and governance opportunities.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="https://t.me/notecompanion" target="_blank" rel="noopener noreferrer">
                  <Button className="bg-primary text-white hover:bg-primary-700">
                    Join Our Telegram
                    <MessageCircle className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <a href="https://x.com/notecompanion" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="border-primary text-primary hover:bg-primary-50">
                    Follow on Twitter
                    <Twitter className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>

            <div className="bg-orange-50 shadow-lg border border-orange-200 p-8 rounded-xl">
              <h3 className="text-2xl font-semibold mb-4 text-orange-700">Community Guidelines</h3>
              <div className="bg-white/80 p-5 rounded-lg mb-6 border border-orange-100">
                <p className="text-gray-700 font-medium">
                  <strong>Important:</strong> Please keep DAO and token discussions limited to the dedicated Telegram channel and DAO-specific spaces. Do not discuss or promote tokens in the general Discord server or other community spaces not specifically for DAO activities.
                </p>
              </div>
              <p className="text-gray-600">
                We want to maintain a positive environment for all users, including those who just want to use the Note Companion product without DAO involvement. Violation of these guidelines may result in moderation action.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
