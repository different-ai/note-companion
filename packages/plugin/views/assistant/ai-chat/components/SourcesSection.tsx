import React, { useState } from 'react';
import { GroundingMetadata } from '../types/grounding';

interface SourcesSectionProps {
  groundingMetadata: GroundingMetadata | null;
}

interface Source {
  id: number;
  title: string;
  url: string;
  domain: string;
  confidence: number;
}

function extractDomainFromUrl(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return url;
  }
}

function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

export function SourcesSection({ groundingMetadata }: SourcesSectionProps) {
  const [showAll, setShowAll] = useState(false);
  
  if (!groundingMetadata) return null;

  // Extract sources from groundingMetadata
  const sources: Source[] = groundingMetadata.groundingSupports?.map((support, index) => {
    const url = support.segment.text.match(/https?:\/\/[^\s]+/)?.[0] || 'unknown-source';
    const domain = extractDomainFromUrl(url);
    return {
      id: index + 1,
      title: support.segment.text.replace(url, '').trim(),
      url,
      domain,
      confidence: support.confidenceScores?.[0] || 0
    };
  }) || [];

  const displayedSources = showAll ? sources : sources.slice(0, 3);

  return (
    <div className="mt-6 space-y-4 m-2 z-50">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">Sources</h3>
        {sources.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {showAll ? 'Show less' : 'Show all'}
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedSources.map((source) => (
          <div
            key={source.id}
            className="flex items-center p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <div className="flex-shrink-0 mr-4">
              <div className="relative">
                <img
                  src={getFaviconUrl(source.domain)}
                  alt={source.domain}
                  className="w-8 h-8"
                />
                <div className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full text-xs font-medium text-blue-600 dark:text-blue-400">
                  {source.id}
                </div>
              </div>
            </div>
            <div className="flex-grow min-w-0">
              <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline"
                >
                  {source.title || source.domain}
                </a>
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {source.domain}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
