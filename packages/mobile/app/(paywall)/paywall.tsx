import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { useAuth } from "@/providers/auth";

// ensure this ENV is set via EAS secrets or .env
// Check for API Key existence
const RC_API_KEY = process.env.EXPO_PUBLIC_RC_API_KEY;

export default function Paywall() {
  const { user } = useAuth() as any; // Using any assertion consistent with _layout.tsx
  const [monthly, setMonthly] = useState<PurchasesPackage>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // State to hold error messages

  // initialise and fetch offerings
  useEffect(() => {
    const initializeAndFetch = async () => {
      setError(null); // Reset error on retry/mount
      // Ensure API Key exists before configuring
      if (!RC_API_KEY) {
        console.error("[Paywall] EXPO_PUBLIC_RC_API_KEY is missing!");
        setError("Subscription service is unavailable.");
        setLoading(false);
        return;
      }
      
      try {
        console.log("[Paywall] Configuring Purchases...");
        // Use try/catch for configure as well
        await Purchases.configure({ apiKey: RC_API_KEY, appUserID: user?.id });
        console.log("[Paywall] Configure SUCCESS. Fetching offerings...");
        
        const offerings = await Purchases.getOfferings();
        console.log("[Paywall] Offerings fetched:", offerings.current);
        if (offerings.current && offerings.current.monthly) {
          setMonthly(offerings.current.monthly);
        } else {
          console.warn("[Paywall] No 'current' or 'monthly' offering found.");
          setError("Subscription options are currently unavailable.");
        }
      } catch (e: any) {
        console.error("[Paywall] Failed to configure Purchases or fetch offerings:", e);
        if (e.code === 'CredentialsError') { // Example specific error check
            setError("Subscription service configuration error.");
        } else if (e.message?.includes(" fetching offerings")) { // Check based on previous error message
            setError("Could not load subscription products from the store. Please check your connection or try again later.");
        } else {
            setError("Could not load subscription options. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };
    
    initializeAndFetch();
  }, [user?.id]); // Re-run if user ID changes

  const buy = async () => {
    if (!monthly) return;
    try {
      const { customerInfo } = await Purchases.purchasePackage(monthly);
      if (customerInfo.activeSubscriptions.length) {
        alert("🎉 upgraded!");
      }
    } catch (e: any) {
      if (!e.userCancelled) alert(e.message);
    }
  };

  // --- Render Logic ---

  // Determine button text and state
  const isLoadingOrError = loading || !!error || !monthly;
  let buttonText = "Upgrade to Pro";
  if (monthly?.product?.priceString) {
    buttonText = `upgrade · ${monthly.product.priceString}`;
  }

  return (
    <View style={styles.paywallContainer}>
      {/* Title and Subtitle always shown */}
      <Text style={styles.titleText}>note companion pro</Text>
      <Text style={styles.subtitleText}>unlimited tokens • priority ocr • gpt‑4 vision</Text>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.statusText}>Loading Subscription...</Text>
        </View>
      )}

      {/* Error Message - Display inline */}
      {error && !loading && (
        <View style={styles.statusContainer}>
           <Text style={styles.errorText}>Error</Text>
           <Text style={[styles.statusText, { color: styles.errorText.color }]}>{error}</Text>
        </View>
      )}
      
      {/* Offer Unavailable Message - Display inline */}
      {!monthly && !loading && !error && (
         <View style={styles.statusContainer}>
           <Text style={styles.errorText}>Unavailable</Text>
           <Text style={styles.statusText}>No subscription plans are currently configured.</Text>
        </View>
      )}

      {/* Buy Button - Always shown, disabled if needed */}
      <TouchableOpacity 
        onPress={buy} 
        style={[styles.buyButton, isLoadingOrError && styles.disabledButton]} // Apply disabled style
        disabled={isLoadingOrError} // Disable touch interaction
      >
        <Text style={styles.buyButtonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
}

// Add some basic styling
const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    padding: 20,
    backgroundColor: 'white',
  },
  paywallContainer: {
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    padding: 24,
    backgroundColor: 'white', // Example background
  },
  statusContainer: { // Added container for status/error messages
    alignItems: 'center',
    marginBottom: 20, // Space before the button
    paddingHorizontal: 10, // Prevent text overflowing edges
  },
  statusText: {
    marginTop: 10,
    color: "#666",
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E53E3E', // Red color for errors
    marginBottom: 5,
    textAlign: 'center',
  },
  titleText: {
    fontSize: 24, 
    fontWeight: "600", 
    marginBottom: 8,
  },
  subtitleText: {
    color: "#666", 
    marginBottom: 24,
    textAlign: 'center',
  },
  buyButton: {
    backgroundColor: "#10b981", 
    paddingHorizontal: 32, 
    paddingVertical: 12, 
    borderRadius: 12,
  },
  buyButtonText: {
    color: "#fff", 
    fontWeight: "600",
  },
  disabledButton: { // Style for disabled button
    backgroundColor: '#cccccc', // Greyed out
    opacity: 0.7,
  },
});