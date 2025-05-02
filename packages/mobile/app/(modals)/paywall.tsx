import React from 'react';
import Paywall from '../(paywall)/paywall'; // Import the existing Paywall component
import { Stack } from 'expo-router';
import { View } from 'react-native';

// This screen renders the Paywall component within a modal presentation context
export default function PaywallModalScreen() {
  return (
    <View style={{ flex: 1 }}>
      {/* Optionally configure the modal header */}
      <Stack.Screen options={{ title: 'Upgrade to Pro', presentation: 'modal' }} />
      <Paywall />
    </View>
  );
} 