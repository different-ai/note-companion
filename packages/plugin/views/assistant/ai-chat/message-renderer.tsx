import React from "react";
import { motion } from "framer-motion";
import { Avatar } from "./avatar";
import { AIMarkdown } from "./ai-message-renderer";
import { UserMarkdown } from "./user-message-renderer";
import { Message } from "ai";
import { usePlugin } from "../provider";
import { Attachment } from "./types/attachments";
import { AppendButton } from "./components/append-button";
import { CopyButton } from "./components/copy-button";

interface MessageRendererProps {
  message: Message & {
    experimental_attachments?: Attachment[];
  };
}

export const MessageRenderer: React.FC<MessageRendererProps> = ({
  message,
}) => {
  const plugin = usePlugin();

  if (message.toolInvocations) {
    return null;
  }
  if (message.content.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="flex items-start mb-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Avatar role={message.role as "user" | "assistant"} />
      <div className="flex-grow">
        <motion.div className="text-[--text-normal] w-full">
          {message.role === "user" ? (
            <UserMarkdown content={message.content} />
          ) : (
            <AIMarkdown content={message.content} app={plugin.app} />
          )}
        </motion.div>

        {message.role === "assistant" && (
          <div className="relative flex justify-end mt-2 space-x-2 mr-3">
            <AppendButton content={message.content} />
            <CopyButton content={message.content} />
          </div>
        )}

        {message.experimental_attachments &&
          message.experimental_attachments.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {message.experimental_attachments.map((attachment, index) => (
                <div
                  key={`${attachment.name || index}`}
                  className="relative group"
                >
                  {attachment.contentType?.startsWith("image/") ? (
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center bg-[--background-secondary]">
                      <svg
                        className="h-8 w-8 text-[--text-muted]"
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
                  {attachment.url && (
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <a
                        href={attachment.url}
                        download={attachment.name}
                        className="text-white text-sm bg-black bg-opacity-75 px-3 py-1 rounded-full"
                      >
                        Download
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
      </div>
    </motion.div>
  );
};
