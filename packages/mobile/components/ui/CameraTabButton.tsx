import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Platform,
  AccessibilityRole,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { launchCamera } from '@/utils/camera-handler';
import { useSemanticColor } from '@/hooks/useThemeColor';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

interface CameraTabButtonProps {
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: any;
  children: React.ReactNode;
}

const CameraTabButton: React.FC<CameraTabButtonProps> = ({
  accessibilityLabel = 'Take Photo',
  accessibilityRole = 'button',
  accessibilityState,
  children,
}) => {
  const primaryColor = useSemanticColor('primary');
  const backgroundColor = useSemanticColor('tabBar');
  const router = useRouter();

  const handlePress = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    console.log('Camera button pressed, attempting to launch camera...');

    const capturedFile = await launchCamera();

    if (capturedFile) {
      console.log('Photo captured, navigating to Home with file data.');
      router.push({
        pathname: '/',
        params: { capturedPhoto: JSON.stringify(capturedFile) },
      });
    } else {
      console.log('Camera launch canceled or failed.');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor }]}
      onPress={handlePress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
    >
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CameraTabButton; 