import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  Text,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TextDocumentViewer } from './text-document-viewer';

const { width } = Dimensions.get('window');

interface FilePreviewProps {
  fileUrl?: string;
  mimeType?: string;
  fileName?: string;
  textContent?: string;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ 
  fileUrl, 
  mimeType = '', 
  fileName = '',
  textContent,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!fileUrl && !textContent) {
    return (
      <View style={styles.container}>
        <MaterialIcons name="insert-drive-file" size={48} color="#8E8E93" />
        <Text style={styles.noFileText}>No file available for preview</Text>
      </View>
    );
  }

  const isImage = mimeType?.toLowerCase().includes('image');
  const isText = mimeType?.toLowerCase().includes('text') || mimeType?.toLowerCase().includes('markdown');

  // For preview dimensions
  const previewWidth = width - 40; // Accounting for padding
  const previewHeight = previewWidth * 1.4; // Reasonable aspect ratio

  const handleLoadComplete = () => {
    setLoading(false);
  };

  const handleError = (errorObj: object) => {
    console.error('Error loading file:', errorObj);
    setLoading(false);
    setError('Failed to load file preview');
  };

  const renderPreview = () => {
    if (isImage) {
      // Image Preview
      return (
        <View style={styles.fileContainer}>
          <Image
            source={{ uri: fileUrl }}
            style={[styles.imagePreview, { width: previewWidth, height: previewHeight }]}
            onLoad={handleLoadComplete}
            onError={({ nativeEvent: { error } }) => {
              console.error('Image error:', error);
              setLoading(false);
              setError('Failed to load image preview');
            }}
            resizeMode="contain"
          />
          {loading && (
            <View style={[styles.loadingOverlay, { width: previewWidth, height: previewHeight }]}>
              <ActivityIndicator size="large" color="rgb(159, 122, 234)" />
              <Text style={styles.loadingText}>Loading image...</Text>
            </View>
          )}
        </View>
      );
    } else if (isText && textContent) {
      // Text/Markdown Preview
      return (
        <TextDocumentViewer
          content={textContent}
          title={fileName}
          metadata={{
            source: fileUrl,
          }}
        />
      );
    } else {
      // Generic file preview
      return (
        <View style={styles.genericContainer}>
          <MaterialIcons name="insert-drive-file" size={64} color="rgb(159, 122, 234)" />
          <Text style={styles.fileNameText} numberOfLines={2}>
            {fileName || 'File preview not available'}
          </Text>
          <Text style={styles.mimeTypeText}>{mimeType || 'Unknown format'}</Text>
        </View>
      );
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <>
          <View style={styles.previewHeader}>
            <MaterialIcons 
              name={
                isImage ? "image" 
                : isText ? "description"
                : "insert-drive-file"
              } 
              size={24} 
              color="rgb(159, 122, 234)" 
            />
            <Text style={styles.previewHeaderText}>
              {isImage ? 'Image Preview' 
              : isText ? 'Text Preview'
              : 'File Preview'}
            </Text>
          </View>
          {renderPreview()}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(251, 244, 234)',
  },
  contentContainer: {
    padding: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  previewHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#1a1a1a',
  },
  fileContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'rgb(255, 250, 240)',
  },
  imagePreview: {
    backgroundColor: 'rgb(255, 250, 240)',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(251, 244, 234, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  genericContainer: {
    width: width - 40,
    height: (width - 40) * 1.4,
    backgroundColor: 'rgb(255, 250, 240)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  fileNameText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  mimeTypeText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    color: '#FF3B30',
  },
  noFileText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    color: '#8E8E93',
  },
}); 