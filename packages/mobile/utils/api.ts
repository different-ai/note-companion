import { API_URL } from '@/constants/config';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UploadedFile {
  id: number;
  name: string;
  mimeType: string;
  blobUrl: string;
  createdAt: string;
  processed: boolean;
  processingStatus: string;
  extractedText?: string;
  userId?: string;
  processType?: string;
  generatedImageUrl?: string;
}

export interface FetchFilesResponse {
  files: UploadedFile[];
  pagination: PaginationData;
}

// Define a type for the raw API response file structure
interface RawFileApiResponse {
  id: number;
  originalName?: string;
  name?: string;
  fileType?: string;
  mimeType?: string;
  blobUrl?: string;
  createdAt?: string;
  status?: string;
  processed?: boolean;
  textContent?: string;
  extractedText?: string;
  userId?: string;
  processType?: string;
  generatedImageUrl?: string;
}

/**
 * Fetches saved files from the server with pagination
 */
export const fetchFiles = async (
  token: string,
  { page = 1, limit = 10 }: PaginationParams
): Promise<FetchFilesResponse> => {
  try {
    const response = await fetch(
      `${API_URL}/api/files?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: 'Failed to fetch files' }));
      throw new Error(errorData.error || 'Failed to fetch files');
    }

    const data = await response.json();
    
    // Transform the server response to match the expected format
    const transformedFiles = data.files.map((file: RawFileApiResponse): UploadedFile => {
      return {
        id: file.id,
        name: file.originalName || file.name || 'Unnamed Note',
        mimeType: file.fileType || file.mimeType || 'text/plain',
        blobUrl: file.blobUrl || '',
        createdAt: file.createdAt || new Date().toISOString(),
        processed: file.status === 'completed' || file.processed === true,
        processingStatus: file.status || (file.processed ? 'completed' : 'processing'),
        extractedText: file.textContent || file.extractedText || '',
        userId: file.userId || '',
        processType: file.processType || 'standard-ocr',
        generatedImageUrl: file.generatedImageUrl
      };
    });

    return {
      files: transformedFiles,
      pagination: data.pagination
    };
  } catch (error) {
    console.error('Error fetching files:', error);
    throw error;
  }
};

/**
 * Deletes a file from the server
 */
export const deleteFile = async (
  fileId: number,
  token: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${API_URL}/api/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: 'Failed to delete file' }));
      throw new Error(errorData.error || 'Failed to delete file');
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
