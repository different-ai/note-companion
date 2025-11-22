import React, { useCallback, useState, useRef } from 'react';
import { Attachment, AttachmentHandlerProps } from '../types/attachments';
import { logger } from '../../../../services/logger';

const DEFAULT_MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const DEFAULT_ACCEPTED_TYPES = ['image/*'];

export const AttachmentHandler: React.FC<AttachmentHandlerProps> = ({
  onAttachmentsChange,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (files: FileList | null) => {
    if (!files) return;

    const newAttachments: Attachment[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      // Check file size
      if (file.size > maxFileSize) {
        errors.push(`${file.name} exceeds the maximum file size of ${maxFileSize / 1024 / 1024}MB`);
        continue;
      }

      // Check file type
      const isAcceptedType = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          const baseType = type.split('/')[0];
          return file.type.startsWith(baseType);
        }
        return file.type === type;
      });

      if (!isAcceptedType) {
        errors.push(`${file.name} is not an accepted file type`);
        continue;
      }

      try {
        // Convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          id: `${file.name}-${Date.now()}`,
          name: file.name,
          contentType: file.type,
          url: base64,
          size: file.size,
        });
      } catch (err) {
        logger.error('Error processing file:', err);
        errors.push(`Error processing ${file.name}`);
      }
    }

    if (errors.length > 0) {
      setError(errors.join('\n'));
    } else {
      setError(null);
    }

    const updatedAttachments = [...attachments, ...newAttachments];
    setAttachments(updatedAttachments);
    onAttachmentsChange(updatedAttachments);
  }, [attachments, maxFileSize, acceptedTypes, onAttachmentsChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  }, [handleFileChange]);

  const handleRemove = useCallback((id: string) => {
    const updatedAttachments = attachments.filter(att => att.id !== id);
    setAttachments(updatedAttachments);
    onAttachmentsChange(updatedAttachments);
  }, [attachments, onAttachmentsChange]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="relative">
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer
          ${isDragging 
            ? 'border-[--interactive-accent] bg-[--background-modifier-hover]' 
            : 'border-[--background-modifier-border] hover:border-[--interactive-accent]'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFileChange(e.target.files)}
        />
        
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-[--text-muted]"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-sm text-[--text-muted] mt-2">
            {isDragging ? (
              'Drop files here...'
            ) : (
              <>
                <span>Drag and drop files, or </span>
                <span className="text-[--text-accent]">browse</span>
              </>
            )}
          </div>
          <div className="text-xs text-[--text-faint] mt-1">
            Maximum file size: {maxFileSize / 1024 / 1024}MB
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-2 text-sm text-[--text-error]">
          {error}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mt-4 space-y-2">
          {attachments.map(attachment => (
            <AttachmentPreview
              key={attachment.id}
              attachment={attachment}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const AttachmentPreview: React.FC<{ attachment: Attachment; onRemove: (id: string) => void }> = ({
  attachment,
  onRemove,
}) => {
  return (
    <div className="flex items-center justify-between p-2 bg-[--background-secondary]">
      <div className="flex items-center space-x-2">
        {attachment.contentType.startsWith('image/') ? (
          <img
            src={attachment.url}
            alt={attachment.name}
            className="h-8 w-8 object-cover rounded"
          />
        ) : (
          <div className="h-8 w-8 flex items-center justify-center bg-[--background-modifier-border] rounded">
            <svg
              className="h-4 w-4 text-[--text-muted]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[--text-normal] truncate">
            {attachment.name}
          </div>
          <div className="text-xs text-[--text-muted]">
            {(attachment.size / 1024).toFixed(1)} KB
          </div>
        </div>
      </div>
      <button
        onClick={() => onRemove(attachment.id)}
        className="p-1 hover:bg-[--background-modifier-hover] rounded-full"
      >
        <svg
          className="h-4 w-4 text-[--text-muted]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}; 