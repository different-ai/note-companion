import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Button } from '../../components/Button';
import { ThemedView } from '../../components/ThemedView';
import { ThemedText } from '../../components/ThemedText';
import { MaterialIcons } from '@expo/vector-icons';
import { useSemanticColor } from '@/hooks/useThemeColor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UsageStatus } from '@/components/usage-status';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const primaryColor = useSemanticColor('primary');
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isFetchingInfo, setIsFetchingInfo] = useState(true);

  useEffect(() => {
    const fetchCustomerInfo = async () => {
      setIsFetchingInfo(true);
      try {
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
      } catch (e) {
        console.error("Failed to fetch customer info:", e);
      } finally {
        setIsFetchingInfo(false);
      }
    };

    fetchCustomerInfo();
  }, []);

  useEffect(() => {
    const listener = (info: CustomerInfo) => {
      setCustomerInfo(info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  const hasProAccess = customerInfo?.activeSubscriptions?.length > 0;

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: confirmDeleteAccount
        }
      ],
      { cancelable: true }
    );
  };

  const confirmDeleteAccount = async () => {
    try {
      await user?.delete();
      await signOut();
    } catch (error) {
      console.error("Error deleting account:", error);
      Alert.alert(
        "Error",
        "There was a problem deleting your account. Please try again later."
      );
    }
  };

  const handleManageSubscription = () => {
    Alert.alert("Manage Subscription", "Subscription management not yet implemented.");
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView variant="elevated" style={[styles.header, { paddingTop: Math.max(20, insets.top) }]}>
        <View style={styles.titleContainer}>
          <MaterialIcons name="settings" size={28} color={primaryColor} style={styles.icon} />
          <ThemedText type="heading" style={styles.headerTitle}>Settings</ThemedText>
        </View>
        <ThemedText colorName="textSecondary" type="label" style={styles.headerSubtitle}>
          Manage your account and preferences
        </ThemedText>
      </ThemedView>
      
      <ScrollView style={styles.contentContainer}>
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Account</ThemedText>
          
          <ThemedView variant="elevated" style={styles.card}>
            <View style={styles.userInfo}>
              <MaterialIcons name="account-circle" size={40} color={primaryColor} />
              <View style={styles.userDetails}>
                <ThemedText type="defaultSemiBold">{user?.fullName || user?.username}</ThemedText>
                <ThemedText colorName="textSecondary" type="caption">{user?.primaryEmailAddress?.emailAddress}</ThemedText>
              </View>
            </View>
          </ThemedView>
        </View>

        {/* Account Status Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Account Status</ThemedText>
          
          <ThemedView variant="elevated" style={styles.card}>
            {isFetchingInfo ? (
              <ActivityIndicator color={primaryColor} />
            ) : (
              <View style={styles.subscriptionInfoContainer}>
                <View style={styles.subscriptionTextContainer}>
                  <ThemedText type="defaultSemiBold">Subscription</ThemedText>
                  <ThemedText colorName="textSecondary">
                    {hasProAccess ? "Pro Access Active" : "Free Tier"}
                  </ThemedText>
                </View>
                {!hasProAccess ? (
                  <Button 
                    variant="primary"
                    onPress={() => router.push("/(modals)/paywall")}
                    style={styles.upgradeButton}
                  >
                    Upgrade to Pro
                  </Button>
                ) : (
                  <Button 
                    variant="secondaryOutline"
                    onPress={handleManageSubscription}
                    style={styles.manageButton}
                  >
                    Manage
                  </Button>
                )}
              </View>
            )}
          </ThemedView>

          <UsageStatus />
          
          <ThemedView variant="elevated" style={styles.infoCard}>
            <MaterialIcons name="info-outline" size={20} color={primaryColor} style={styles.infoIcon} />
            <ThemedText colorName="textSecondary" style={styles.infoText}>
              This is a companion app for Note Companion AI service. Your account status reflects the features available to you.
            </ThemedText>
          </ThemedView>
        </View>
        
        {/* Bottom buttons */}
        <View style={styles.bottomActions}>
          <Button
            onPress={() => signOut()}
            variant="secondary" 
            textStyle={{color: '#333333', fontWeight: '600'}}
          >
            Sign Out
          </Button>
        </View>
        
        {/* Danger Zone Section */}
        <View style={styles.dangerSection}>
          <ThemedText type="subtitle" style={styles.dangerTitle}>Danger Zone</ThemedText>
          <ThemedView style={styles.dangerCard}>
            <ThemedText style={styles.dangerText}>
              Deleting your account will permanently remove all your data and cannot be undone.
            </ThemedText>
            <Button
              onPress={handleDeleteAccount}
              variant="danger" 
              style={styles.deleteButton}
            >
              Delete Account
            </Button>
          </ThemedView>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderRadius: 0,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
        marginBottom: 0,
      },
      android: {
        elevation: 2,
        marginBottom: 4,
      },
    }),
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
  },
  headerTitle: {
    fontWeight: '700',
  },
  headerSubtitle: {
    marginBottom: 8,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginTop: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: 12,
  },
  subscriptionInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  upgradeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 0,
  },
  manageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 0,
    borderColor: '#CCCCCC',
    borderWidth: 1,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  signOutButton: {
    marginTop: 10,
    borderRadius: 12,
    minHeight: 50,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  bottomActions: {
    paddingVertical: 20,
    marginTop: 10,
  },
  dangerSection: {
    marginTop: 10,
    marginBottom: 40,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  dangerTitle: {
    color: '#E53E3E',
    marginBottom: 16,
  },
  dangerCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 62, 62, 0.3)',
    backgroundColor: 'rgba(254, 215, 215, 0.1)',
  },
  dangerText: {
    marginBottom: 20,
    fontSize: 14,
    lineHeight: 20,
  },
  deleteButton: {
    borderRadius: 12,
    minHeight: 48,
    backgroundColor: '#E53E3E',
    marginTop: 8,
  },
});