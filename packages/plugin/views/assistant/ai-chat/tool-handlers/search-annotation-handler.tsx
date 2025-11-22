import React from 'react';

interface SearchResult {
  segment: {
    startIndex?: number;
    endIndex: number;
    text: string;
  };
  groundingChunkIndices: number[];
  confidenceScores: number[];
}

interface WebSource {
  web: {
    uri: string;
    title: string;
  };
}

interface SearchAnnotationProps {
  annotation: {
    type: 'search-results';
    groundingMetadata: {
      webSearchQueries: string[];
      searchEntryPoint: {
        renderedContent: string;
      };
      groundingChunks: WebSource[];
      groundingSupports: SearchResult[];
    };
  };
}

export const SearchAnnotationHandler: React.FC<SearchAnnotationProps> = ({
  annotation,
}) => {
  const { groundingMetadata } = annotation;
  if (!groundingMetadata?.groundingSupports?.length) return null;

  return (
    <div className="flex flex-col gap-2 p-4 bg-[--background-primary-alt] m-2">
      <div className="text-[--text-muted] text-sm">Search Results:</div>
      {groundingMetadata.groundingSupports.map((result, index) => {
        const sources = result.groundingChunkIndices.map(idx => {
          const chunk = groundingMetadata.groundingChunks[idx]?.web;
          return chunk ? { title: chunk.title, uri: chunk.uri } : null;
        }).filter(Boolean);
        
        const maxScore = Math.max(...result.confidenceScores);
        
        return (
          <div 
            key={index} 
            className="flex flex-col gap-1 p-2 rounded bg-[--background-primary] border border-[--background-modifier-border]"
          >
            <div className="flex justify-between items-center">
              <span className="text-[--text-accent] text-sm">
                {sources.map((source, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && ', '}
                    <a 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {source.title}
                    </a>
                  </React.Fragment>
                ))}
              </span>
              <span className="text-[--text-muted] text-xs">
                Score: {(maxScore * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-[--text-normal] text-sm whitespace-pre-wrap">
              {result.segment.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}; 