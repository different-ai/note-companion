import { GeistSans } from 'geist/font/sans';
import Link from 'next/link';
import '../globals.css';
import Image from 'next/image';
import { Toaster } from '@/components/ui/use-toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import Providers from '../providers';
import { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Star, Smartphone, ExternalLink } from 'lucide-react';
import { getGitHubStars } from '@/lib/github';

export const metadata: Metadata = {
  metadataBase: new URL('https://notecompanion.com'),
  title: {
    default: 'Note Companion - Your AI-powered Knowledge Partner',
    template: '%s | Note Companion',
  },
  description:
    'Your AI-powered assistant that turns scattered notes into actionable knowledge. Seamless meeting notes, instant organization, and the smartest AI chat for your Obsidian workflow.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://notecompanion.com',
    siteName: 'Note Companion',
    images: ['/notecompanion.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Note Companion - Your AI-powered Knowledge Partner',
    description:
      'Your AI-powered assistant that turns scattered notes into actionable knowledge. Seamless meeting notes, instant organization, and the smartest AI chat for your Obsidian workflow.',
    images: ['/notecompanion.png'],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const starCount = await getGitHubStars();
  return (
    <html lang="en" className={GeistSans.className} suppressHydrationWarning>
      <body className="bg-background">
        <TooltipProvider>
          <Providers>
            <main className="min-h-screen flex flex-col items-center">
              <div className="flex-1 w-full flex flex-col items-center">
                {/* <div className="w-full bg-gray-900">
                  <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="h-5 w-5 text-purple-400 hidden sm:block" />
                      <p className="text-sm font-medium text-white">
                        <span className="hidden sm:inline bg-purple-500 text-white px-1.5 py-0.5 rounded-md text-xs mr-2">
                          NEW
                        </span>
                        Note Companion Mobile with best-in-class OCR technology
                        is now available
                      </p>
                    </div>
                    <Link
                      href="/mobile"
                      className="text-purple-400 text-sm font-medium hover:text-purple-300 flex items-center"
                    >
                      Learn more <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  </div>
                </div> */}

                <div className="w-full border-b border-gray-700 bg-background backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <div className="mx-auto max-w-7xl px-6 py-4">
                    <div className="flex items-center justify-between">
                      <Link
                        href="/"
                        className="flex items-center gap-2 text-2xl"
                      >
                        <Image
                          src="/notecompanion.png"
                          alt="note companion Logo"
                          width={30}
                          height={30}
                        />
                      </Link>
                      <div className="flex items-center space-x-4">
                        <a
                          href="https://www.youtube.com/watch?v=NQjZcL4sThs&list=PLgRcC-DFR5jdUxbSBuNeymwYTH_FSVxio"
                          className="text-sm text-gray-900 font-semibold"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          tutorials
                        </a>

                        <a
                          href="https://github.com/Nexus-JPF/note-companion"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 bg-[#1F2937] text-white px-3 py-1.5 rounded-full text-sm font-semibold"
                        >
                          <Star className="h-4 w-4" />
                          <span>{starCount}</span>
                        </a>
                        <Link href="https://accounts.notecompanion.ai/sign-up">
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-primary text-white hover:bg-primary/90"
                          >
                            Start
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col w-full">{children}</div>
              </div>
            </main>
            <Toaster />
          </Providers>
        </TooltipProvider>
      </body>
    </html>
  );
}
