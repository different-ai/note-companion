import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert, Image, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UploadedFile } from '@/utils/api';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useSemanticColor } from '@/hooks/useThemeColor';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import * as Haptics from 'expo-haptics';

// Extend UploadedFile type locally for component props if necessary
// Ensure status, processType, generatedImageUrl, textContent are included if used
interface ExtendedUploadedFile extends UploadedFile {
    status?: 'pending' | 'processing' | 'completed' | 'error'; // Assuming base allows only these or undefined
    processType?: string;
    generatedImageUrl?: string;
    textContent?: string;
    featured?: boolean; // Add back featured flag
    // Add other potentially missing fields used in the component if needed
}

// Content moderation check for displaying files
const runContentModeration = async (text: string | undefined): Promise<{
  isAppropriate: boolean;
  contentFlags?: string[];
}> => {
  try {
    // Simple text moderation - can be replaced with a more comprehensive API
    if (!text) return { isAppropriate: true };
    
    const profanityList = [
      'vulgar', 'explicit', 'offensive', 'inappropriate'
    ];
    
    const contentFlags = profanityList.filter(term => 
      text.toLowerCase().includes(term.toLowerCase())
    );
    
    return {
      isAppropriate: contentFlags.length === 0,
      contentFlags: contentFlags.length > 0 ? contentFlags : undefined
    };
  } catch (error) {
    console.error('Error running content moderation:', error);
    // Default to appropriate if the check fails
    return { isAppropriate: true };
  }
};

interface FileCardProps {
  file: ExtendedUploadedFile;
  onDelete: (id: number) => void;
  onView: (file: ExtendedUploadedFile) => void;
}

export function FileCard({ file, onDelete, onView }: FileCardProps) {
  const router = useRouter();
  const [moderation, setModeration] = React.useState<{
    isAppropriate: boolean;
    contentFlags?: string[];
  }>({ isAppropriate: true });
  
  // Get colors from our semantic theme system
  const primaryColor = useSemanticColor('primary');
  const successColor = useSemanticColor('success');
  const dangerColor = useSemanticColor('danger');
  const textColor = useSemanticColor('text');
  const textSecondaryColor = useSemanticColor('textSecondary');
  const warningColor = useSemanticColor('warning');
  const backgroundColor = useSemanticColor('background');
  const cardColor = useSemanticColor('card');
  const borderColor = useSemanticColor('border');
  
  React.useEffect(() => {
    // Run content moderation check
    if (file.extractedText) {
      runContentModeration(file.extractedText)
        .then(result => {
          setModeration(result);
        });
    }
  }, [file.extractedText]);

  // Format date string to a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get appropriate icon based on file type
  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return 'insert-drive-file';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('pdf')) return 'picture-as-pdf';
    if (mimeType.startsWith('audio/')) return 'audiotrack';
    if (mimeType.startsWith('video/')) return 'videocam';
    if (mimeType.startsWith('text/')) return 'article';
    return 'insert-drive-file';
  };

  // Display a snippet of extracted text or the generated image
  const renderContentPreview = () => {
    // If it's a magic diagram and has a generated image URL, show the image
    if (file.processType === 'magic-diagram' && file.generatedImageUrl) {
      return (
        <Image 
          source={{ uri: file.generatedImageUrl }}
          style={styles.generatedImagePreview}
          resizeMode="contain" // Or "cover" depending on desired look
        />
      );
    }
    
    // Otherwise, show text preview
    if (file.extractedText) {
      const preview = file.extractedText.substring(0, 200); // Increased for more content
      return (
        <ThemedText colorName="textSecondary" style={styles.fileContentPreview}>
          {preview.length < file.extractedText.length 
            ? `${preview}...` 
            : preview}
        </ThemedText>
      );
    }
    
    return (
      <ThemedText colorName="textSecondary" style={styles.fileContentPreview}>
        No preview available
      </ThemedText>
    );
  };

  // Handle sharing the file with other apps
  const handleShare = async () => {
    try {
      if (!file.processed) {
        Alert.alert('Note Not Ready', 'Please wait until processing is complete before sharing.');
        return;
      }

      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // --- PRIORITY: MAGIC DIAGRAM HANDLING ---
      if (file.processType === 'magic-diagram' && file.generatedImageUrl) {
        console.log(`Sharing magic diagram: ${file.generatedImageUrl}`);
        const baseName = file.name?.split('.')[0] || 'diagram';
        const tempFileName = `${Date.now()}-${baseName}.png`;
        const localUri = (FileSystem.cacheDirectory || FileSystem.documentDirectory) + tempFileName;

        try {
          console.log(`Downloading generated image to: ${localUri}`);
          const downloadResult = await FileSystem.downloadAsync(
            file.generatedImageUrl,
            localUri
          );
          console.log('Download complete:', downloadResult);

          if (downloadResult?.uri) {
            // Share the downloaded image file
            await Share.share({
              title: file.name || 'Shared Diagram',
              url: downloadResult.uri, // Use URL for local file URI
            });
            console.log('Magic diagram image shared successfully.');
          } else {
            throw new Error('Failed to download generated image for sharing (no URI received)');
          }
        } catch (error: unknown) {
          console.error('Error preparing generated image for sharing:', error);
          const message = error instanceof Error ? error.message : String(error);
          Alert.alert('Share Failed', `Could not prepare the generated image for sharing: ${message}`);
          // Stop here if image sharing failed
          return;
        }
        // Successfully shared image or handled error, stop processing.
        return;
      }
      // --- END MAGIC DIAGRAM HANDLING ---

      // --- ELSE IF: TEXT CONTENT HANDLING (Not a magic diagram) ---
      // Use optional chaining for safety
      const hasTextContent = file.textContent && file.textContent.trim().length > 0;
      if (hasTextContent) {
        console.log('Sharing extracted text content.');
        await Share.share({
          title: file.name || 'Shared Note',
          message: file.textContent as string, // Share text via message
        });
        return; // Stop after sharing text
      }
      // --- END TEXT CONTENT HANDLING ---

      // --- ELSE IF: OTHER FILE TYPE HANDLING (e.g., Original PDF, image) ---
      if (file.blobUrl) {
        console.log(`Sharing original file blob URL: ${file.blobUrl}`);
        try {
          const originalFileName = file.name || `sharedfile-${Date.now()}`;
          const localUri = (FileSystem.cacheDirectory || FileSystem.documentDirectory) + originalFileName;
          console.log(`Attempting to download original file to: ${localUri}`);
          const downloadResumable = FileSystem.createDownloadResumable(
            file.blobUrl,
            localUri
          );
          const downloadResult = await downloadResumable.downloadAsync();

          if (downloadResult?.uri) {
             console.log('Original file downloaded, sharing local URI:', downloadResult.uri);
            await Share.share({
              title: file.name || 'Shared File',
              url: downloadResult.uri, // Share original file via URL
            });
          } else {
            throw new Error('Failed to download original file for sharing');
          }
        } catch (error: unknown) {
          console.error('Error preparing original file for sharing:', error);
          const fallbackMessage = `View my note: ${file.blobUrl}`;
          const message = error instanceof Error ? error.message : String(error);
          console.log('Download failed, falling back to sharing URL string as message.', message);
          // Fallback: Share the blob URL as text message
          await Share.share({
            title: file.name || 'Shared File Link',
            message: fallbackMessage,
          });
        }
        return; // Stop after attempting to share original file
      }
      // --- END OTHER FILE TYPE HANDLING ---

      // --- ELSE: NO SHAREABLE CONTENT ---
      console.log('No shareable content found for this file.');
      Alert.alert('Cannot Share', 'This note has no content available for sharing.');

    } catch (error: unknown) { // Catch errors from Share.share itself
      console.error('Error during Share.share call:', error);
      let message = 'There was a problem sharing this note.';
      let isCancellation = false;

      // Define a type for errors that might have a code property
      interface ErrorWithCode extends Error {
        code?: string | number;
      }

      if (error instanceof Error) {
          message = error.message;
          // Check for common cancellation patterns (might vary slightly by platform/version)
          // Also check for a potential 'code' property
          const potentialCode = (error as ErrorWithCode).code;
          if (message?.includes('cancelled') || message?.includes('Cancel') || potentialCode === 'USER_CANCELED') {
              isCancellation = true;
          }
      } else {
          message = String(error);
      }

      if (isCancellation) {
          console.log('Share action cancelled by user.');
      } else {
          Alert.alert('Share Failed', `There was a problem sharing this note: ${message}`);
      }
    }
  };

  const handleView = () => {
    if (!file.processed) {
      Alert.alert('Note Not Ready', 'Please wait until processing is complete before viewing.');
      return;
    }

    // Add haptic feedback on iOS
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Navigate to the file viewer screen
    router.push({
      pathname: '/file-viewer',
      params: {
        fileUrl: file.blobUrl,
        mimeType: file.mimeType,
        fileName: file.name,
        content: file.extractedText,
      },
    });
  };

  const handleDelete = () => {
    // Add haptic feedback on iOS for destructive actions
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    
    // Show a confirmation dialog
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(file.id),
        },
      ]
    );
  };

  return (
    <View style={styles.cardWrapper}>
      {/* Gradient border overlay */}
      <View style={styles.gradientBorder} />
      
      {/* Card content */}
      <ThemedView 
        variant="card" 
        style={styles.card}
      >
        {/* Popular ribbon - can be conditionally rendered */}
        {file.featured && (
          <View style={styles.ribbon}>
            <ThemedText style={styles.ribbonText} colorName="background">Most Popular</ThemedText>
          </View>
        )}
        
        <View style={styles.fileHeader}>
          <View style={styles.titleContainer}>
            <View style={[styles.fileIcon, { backgroundColor: Platform.OS === 'ios' ? 'rgba(159, 122, 234, 0.15)' : 'rgba(159, 122, 234, 0.1)' }]}>
              <MaterialIcons
                name={getFileIcon(file.mimeType)}
                size={24}
                color="rgb(159, 122, 234)"
              />
            </View>
            <View style={styles.fileInfo}>
              <ThemedText weight="semibold" style={styles.fileName} numberOfLines={1}>
                {file.name}
              </ThemedText>
              <ThemedText colorName="textSecondary" type="caption" style={styles.fileDate}>
                {formatDate(file.createdAt)}
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleShare}
              disabled={!file.processed}
            >
              <MaterialIcons 
                name="share" 
                size={22} 
                color={file.processed ? "#68D391" : "#AAAAAA"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleDelete}
            >
              <MaterialIcons name="delete-outline" size={22} color="#FC8181" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Content area with preview and metadata side by side */}
        <View style={styles.contentContainer}>
          {/* Preview container on the left */}
          {file.extractedText && !moderation.isAppropriate ? (
            <ThemedView 
              style={styles.contentFilteredContainer} 
              colorName="warning"
            >
              <MaterialIcons name="warning" size={18} color={Platform.OS === 'ios' ? '#f59e0b' : '#F6E05E'} />
              <ThemedText style={styles.contentFilteredText}>
                Content flagged for review
              </ThemedText>
            </ThemedView>
          ) : (
            <View style={styles.previewContainer}>
              {file.mimeType?.includes('image') && file.blobUrl ? (
                <Image
                  source={{ uri: file.blobUrl }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
              ) : file.mimeType?.includes('pdf') && file.blobUrl ? (
                <View style={styles.pdfPreviewContainer}>
                  <MaterialIcons name="picture-as-pdf" size={48} color={primaryColor} />
                  <ThemedText colorName="textSecondary" style={styles.pdfPreviewText}>PDF Document</ThemedText>
                </View>
              ) : (
                <View style={styles.noPreviewContainer}>
                  <MaterialIcons name="insert-drive-file" size={48} color={textSecondaryColor} />
                  <ThemedText colorName="textSecondary" style={styles.noPreviewText}>No preview available</ThemedText>
                </View>
              )}
            </View>
          )}

          {/* Metadata container on the right */}
          <View style={styles.metadataContainer}>
            {/* Status badge */}
            {file.processed ? (
              <View style={styles.statusBadge}>
                <MaterialIcons name="check-circle" size={14} color="#fff" />
                <ThemedText style={styles.statusBadgeText}>Ready</ThemedText>
              </View>
            ) : (
              <View style={[styles.statusBadge, styles.processingBadge]}>
                <MaterialIcons name="pending" size={14} color="#fff" />
                <ThemedText style={styles.statusBadgeText}>Processing</ThemedText>
              </View>
            )}
            
            {/* File type */}
            <View style={styles.metadataItem}>
              <MaterialIcons name="insert-drive-file" size={16} color="rgb(159, 122, 234)" />
              <ThemedText colorName="textSecondary" style={styles.metadataText}>
                {file.mimeType?.includes('pdf') ? 'PDF' : 
                file.mimeType?.includes('image') ? 'Image' : 'Text'}
              </ThemedText>
            </View>
            
            {/* Creation date */}
            <View style={styles.metadataItem}>
              <MaterialIcons name="access-time" size={16} color="rgb(159, 122, 234)" />
              <ThemedText colorName="textSecondary" style={styles.metadataText}>
                {formatDate(file.createdAt).split(',')[0]}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Moderation Warning */}        
        {!moderation.isAppropriate && (
          <View style={styles.moderationWarning}>
            <MaterialIcons name="warning" size={16} color={warningColor} />
            <ThemedText style={styles.moderationText} colorName="warning">
              Content Warning: {moderation.contentFlags?.join(', ') || 'Potentially inappropriate'}
            </ThemedText>
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.mainActionButton, !file.processed && styles.disabledButton]}
            onPress={handleView}
            disabled={!file.processed}
          >
            <ThemedText style={styles.mainActionButtonText} colorName="background">
              View Note
            </ThemedText>
            <MaterialIcons name="arrow-right" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    position: 'relative',
    marginBottom: 24,
    marginHorizontal: 8,
    padding: 2,
  },
  gradientBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 0,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  card: {
    borderRadius: 16, 
    padding: 20,
    marginBottom: 0,
    backgroundColor: '#FFFFFF', // Explicit white background for paper-like look
    borderWidth: 0,
    zIndex: 2,
    overflow: 'hidden', // For the ribbon positioning
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.6)',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  ribbon: {
    position: 'absolute',
    top: -14,
    left: '50%',
    transform: [{ translateX: -48 }],
    backgroundColor: 'rgb(159, 122, 234)', // Hard-coded primary color
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  ribbonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  contentFilteredContainer: {
    flex: 3, // Match previewContainer's flex value
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 0,
    backgroundColor: 'rgba(246, 224, 94, 0.1)',
    opacity: 0.9,
    height: 160, // Match previewContainer's height
  },
  contentFilteredText: {
    marginLeft: 8,
    fontSize: 14,
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 8, // Extra space at top for ribbon if needed
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  fileName: {
    fontSize: 18,
    fontWeight: '600',
  },
  fileDate: {
    fontSize: 13,
    marginTop: 4,
  },
  previewContainer: {
    height: 160,
    flex: 3, // Take 3/5 of the available width
    borderRadius: 12,
    borderWidth: 0,
    overflow: 'hidden',
    aspectRatio: 0.7,
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(0,0,0,0.02)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        backgroundColor: '#f8f9fa',
        elevation: 1,
      },
    }),
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pdfPreviewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  pdfPreviewText: {
    marginTop: 8,
    fontSize: 14,
  },
  noPreviewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPreviewText: {
    marginTop: 8,
    fontSize: 14,
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  textPreviewContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    padding: 8,
    backgroundColor: '#FAFAFA',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.05)',
  },
  metadataContainer: {
    flex: 2, // Take 2/5 of the available width
    marginLeft: 12,
    justifyContent: 'center',
  },
  statusBadge: {
    backgroundColor: 'rgb(159, 122, 234)',
    padding: 6,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  processingBadge: {
    backgroundColor: '#F6E05E',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metadataText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    marginTop: 8,
  },
  mainActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgb(159, 122, 234)', // Hard-coded primary color
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  mainActionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    marginRight: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  iconButton: {
    padding: 10,
    marginLeft: 12,
  },
  disabledText: {
    opacity: 0.5,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
  },
  contentContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  generatedImagePreview: {
    width: '100%',
    height: 150, // Adjust height as needed
    borderRadius: 8,
    marginVertical: 8,
    backgroundColor: '#e0e0e0', // Placeholder background
  },
  contentPreviewContainer: {
    marginTop: 12,
    marginBottom: 12,
  },
  moderationWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#F6E05E',
    borderRadius: 8,
  },
  moderationText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18, // Slightly increased line height
  },
  fileContentPreview: {
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});