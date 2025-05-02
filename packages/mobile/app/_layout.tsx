import "react-native-gesture-handler";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, router, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState, useCallback } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform, ActivityIndicator, View, AppState } from "react-native";
import * as Linking from "expo-linking";
import { processSharedFile, cleanupSharedFile } from "@/utils/share-handler";
import * as FileSystem from "expo-file-system";
import { AuthProvider, useAuth } from "@/providers/auth";
import Purchases, { CustomerInfo } from "react-native-purchases";
import Paywall from "./(paywall)/paywall";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// --- Helper Hook for URL Handling ---
function useUrlHandler() {
  const [urlToProcess, setUrlToProcess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true; // Track mounted state within the hook

    // Get initial URL
    Linking.getInitialURL().then((url) => {
      if (isMounted && url) {
        // console.log('[useUrlHandler] Initial URL received:', url);
        setUrlToProcess(url);
      }
    });

    // Subscribe to subsequent URL events
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (isMounted) {
        // console.log('[useUrlHandler] URL event received:', url);
        setUrlToProcess(url);
      }
    });

    // Handle AppState changes for Android potentially missed initial URL
    const handleAppStateChange = (nextAppState: string) => {
      if (Platform.OS === "android" && nextAppState === "active") {
        Linking.getInitialURL().then((url) => {
          if (isMounted && url) {
            // console.log('[useUrlHandler] Initial URL refetched on active:', url);
            // Only set if it wasn't processed already (basic check)
            if (url !== urlToProcess) {
              setUrlToProcess(url);
            }
          }
        });
      }
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      isMounted = false;
      subscription.remove();
      appStateSubscription.remove();
    };
  }, []); // Run only once on mount

  // Function to clear the URL after processing
  const clearUrl = useCallback(() => {
    setUrlToProcess(null);
  }, []);

  return { urlToProcess, clearUrl };
}

// --- Helper for File Existence Check ---
async function findExistingFilePath(originalUrl: string): Promise<string> {
  // console.log('[findExistingFilePath] Checking original:', originalUrl);
  const originalInfo = await FileSystem.getInfoAsync(originalUrl);
  if (originalInfo.exists) {
    return originalUrl;
  }

  // console.log('[findExistingFilePath] Original not found, decoding and checking alternatives');
  const decodedUrl = decodeURIComponent(decodeURIComponent(originalUrl));
  const alternativePaths = [
    decodedUrl,
    originalUrl.replace("file://", ""), // Common issue on some platforms
    originalUrl.replace(/%2520/g, "%20"), // Handle double-encoded spaces
  ];

  for (const path of alternativePaths) {
    // console.log('[findExistingFilePath] Trying alternative:', path);
    try {
      // Add try-catch around getInfoAsync as it can fail on invalid URIs
      const altFileInfo = await FileSystem.getInfoAsync(path);
      if (altFileInfo.exists) {
        // console.log('[findExistingFilePath] Found at:', path);
        return path;
      }
    } catch (e) {
      console.warn(`[findExistingFilePath] Error checking path ${path}:`, e);
    }
  }

  throw new Error(
    `File not found at original path: ${originalUrl} or alternatives`
  );
}

// --- Main Layout Component ---
function RootLayoutNav() {
  // Add type assertion for user as a temporary workaround
  const { isLoaded: isAuthLoaded, isSignedIn, user } = useAuth() as any; // +user for RC
  console.log('[Layout] Auth State:', { isAuthLoaded, isSignedIn, userId: user?.id });
  const [isFontLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  console.log('[Layout] Font State:', { isFontLoaded });
  const { urlToProcess, clearUrl } = useUrlHandler();
  const router = useRouter();
  const [isProcessingShare, setIsProcessingShare] = useState(false);
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Determine if the app core is ready (fonts, auth)
  const isAppReady = isFontLoaded && isAuthLoaded;

  // --- RevenueCat entitlement guard (modal) ---
  useEffect(() => {
    console.log('[Layout] RevenueCat Effect: Running');
    if (!isFontLoaded || !isAuthLoaded) {
      console.log('[Layout] RevenueCat Effect: Waiting for Fonts/Auth');
      return; // wait for core
    }
    console.log('[Layout] RevenueCat Effect: Fonts/Auth Ready, Initializing RC...');

    const apiKey = process.env.EXPO_PUBLIC_RC_API_KEY;

    if (!apiKey) {
      console.error("[Layout] RevenueCat Effect: EXPO_PUBLIC_RC_API_KEY is missing!");
      return; 
    }

    // Define the update listener function first
    const update = async (customerInfo: CustomerInfo) => {
      try {
        const hasPro = customerInfo.activeSubscriptions.length > 0;
        console.log(`[Layout] RevenueCat Update: User ${hasPro ? 'HAS' : 'does NOT have'} pro subscription.`); 
      } catch (e) {
        console.warn("[customerInfo update handler] failed:", e);
      }
    };

    // Function to configure and fetch initial info
    const initializeAndFetchInfo = async () => {
      try {
        console.log('[Layout] RevenueCat Effect: Configuring Purchases...');
        await Purchases.configure({
          apiKey: apiKey, 
          // Use asserted user type
          appUserID: user?.id, 
        });
        console.log('[Layout] RevenueCat Effect: Configure SUCCESS');

        // Fetch info AFTER successful configuration
        try {
          console.log('[Layout] RevenueCat Effect: Fetching initial CustomerInfo...');
          const info = await Purchases.getCustomerInfo();
          console.log('[Layout] RevenueCat Effect: Fetch CustomerInfo SUCCESS');
          update(info); // Call update with the fetched info
        } catch (fetchError) {
          console.error("[Layout] RevenueCat Effect: Fetch CustomerInfo FAILED:", fetchError);
        }

      } catch (configError) {
        console.error("[Layout] RevenueCat Effect: Configure FAILED:", configError);
      }
    };

    // Call the initialization function
    initializeAndFetchInfo();

    // Add the listener (now that 'update' is defined in this scope)
    console.log('[Layout] RevenueCat Effect: Adding listener');
    // addCustomerInfoUpdateListener doesn't return a subscription object to remove
    // Pass the original listener function 'update' to remove it
    Purchases.addCustomerInfoUpdateListener(update); 

    // Cleanup function
    return () => {
      console.log('[Layout] RevenueCat Effect: Removing listener');
      // Pass the *same function instance* to remove the listener
      Purchases.removeCustomerInfoUpdateListener(update); 
    };
  }, [isFontLoaded, isAuthLoaded, user?.id]);

  // Effect to hide splash screen once fonts are loaded
  useEffect(() => {
    if (isFontLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isFontLoaded]);

  // Effect to mark navigation as ready (can be expanded if Expo Router has a specific readiness hook)
  useEffect(() => {
    // Assuming navigation is ready shortly after the component mounts and auth is loaded
    if (isAppReady) {
      const timer = setTimeout(() => setIsNavigationReady(true), 100); // Small delay remains reasonable here
      return () => clearTimeout(timer);
    }
  }, [isAppReady]);

  // --- URL Processing Logic ---
  const handleIncomingURL = useCallback(
    async (url: string) => {
      // console.log('\n[RootLayout] ===== Starting URL Processing =====');
      // console.log('[RootLayout] Raw incoming URL:', url);
      setIsProcessingShare(true); // Show loading indicator

      try {
        // Handle direct file URLs
        if (url.startsWith("file://")) {
          // console.log('\n[RootLayout] === Processing File URL ===');
          try {
            const accessibleUri = await findExistingFilePath(url);
            const decodedUrl = decodeURIComponent(accessibleUri); // Decode the final path
            const fileName = decodedUrl.split("/").pop() || "shared-file";

            // Determine mime type (basic example, might need refinement)
            let mimeType = "application/octet-stream";
            if (fileName.toLowerCase().endsWith(".pdf"))
              mimeType = "application/pdf";
            // Add more image types if needed
            else if (/\.(jpg|jpeg|png|gif|bmp|webp|heic)$/i.test(fileName))
              mimeType = "image/*"; // Generic image type

            const sharedFile = { uri: accessibleUri, mimeType, name: fileName };
            // console.log('[RootLayout] Shared file object:', JSON.stringify(sharedFile, null, 2));

            const fileData = await processSharedFile(sharedFile);
            // console.log('[RootLayout] Processed file data:', JSON.stringify(fileData, null, 2));
            // console.log('[RootLayout] Navigating to (tabs) with file data');
            router.replace({
              pathname: "/(tabs)",
              params: { sharedFile: JSON.stringify(fileData) },
            });
          } catch (innerError) {
            console.error(
              "[RootLayout] Error processing file:// URL:",
              innerError
            );
            router.replace("/(tabs)"); // Navigate home on error
          }
          return; // Exit after handling file URL
        }

        // Handle custom scheme URLs (e.g., notecompanion://share?...)
        const { scheme, path, queryParams } = Linking.parse(url);
        // console.log('[RootLayout] Parsed App URL:', { scheme, path, queryParams });

        if (
          path === "share" ||
          (scheme === "notecompanion" && queryParams?.uri)
        ) {
          // Adjust condition based on actual use
          // console.log('[RootLayout] Processing share path/params');
          try {
            if (queryParams?.uri) {
              const uri = decodeURIComponent(queryParams.uri as string);
              const type = queryParams.type as string;
              const name = queryParams.name as string;
              const sharedFile = { uri, mimeType: type, name };

              // console.log('[RootLayout] Shared file data (from params):', sharedFile);
              const fileData = await processSharedFile(sharedFile);
              // console.log('[RootLayout] Processed file data:', fileData);
              // console.log('[RootLayout] Navigating to share screen');
              router.replace({
                pathname: "/(tabs)/share",
                params: { sharedFile: JSON.stringify(fileData) },
              });

              // Clean up temporary files if needed (Android specific)
              if (Platform.OS === "android" && uri.includes("content://")) {
                // console.log('[RootLayout] Cleaning up Android temporary file');
                await cleanupSharedFile(uri);
              }
            } else if (queryParams?.text) {
              // console.log('[RootLayout] Processing shared text');
              const textData = {
                text: decodeURIComponent(queryParams.text as string),
                mimeType: "text/plain",
                name: "shared-text.txt",
              };
              // console.log('[RootLayout] Text data:', textData);
              // console.log('[RootLayout] Navigating to (tabs) with text data');
              router.replace({
                pathname: "/(tabs)",
                params: { sharedFile: JSON.stringify(textData) },
              }); // Navigate to main tabs for text
            } else {
              console.warn(
                "[RootLayout] Share path called without valid params (uri or text)"
              );
              router.replace("/(tabs)");
            }
          } catch (innerError) {
            console.error(
              "[RootLayout] Error processing share path:",
              innerError
            );
            router.replace("/(tabs)"); // Navigate home on error
          }
        } else {
          console.warn(
            "[RootLayout] Unknown URL path or scheme, navigating home:",
            url
          );
          router.replace("/(tabs)");
        }
      } catch (error) {
        console.error(
          "[RootLayout] Unhandled error in handleIncomingURL:",
          error
        );
        router.replace("/(tabs)"); // Navigate home on error
      } finally {
        setIsProcessingShare(false); // Hide loading indicator
        clearUrl(); // Mark URL as processed
      }
    },
    [router, clearUrl]
  ); // Add dependencies

  // Effect to process URL when app is ready and URL is available
  useEffect(() => {
    if (isAppReady && isNavigationReady && urlToProcess) {
      // console.log(`[RootLayout] App ready, processing URL: ${urlToProcess}`);
      handleIncomingURL(urlToProcess);
    }
  }, [isAppReady, isNavigationReady, urlToProcess, handleIncomingURL]);

  // Effect for initial routing based on auth state when app is ready
  useEffect(() => {
    if (
      !isAppReady ||
      !isNavigationReady ||
      urlToProcess ||
      isProcessingShare
    ) {
      // Wait until app is ready, navigation is ready, and no URL is being processed
      return;
    }

    // TODO: Replace this with a reliable method to get the current route segment in Expo Router v4+
    // const currentRoute = router. ????
    // console.log("[RootLayout] Auth state loaded. Signed In:", isSignedIn); // Add currentRoute here if available

    if (isSignedIn) {
      // Check if not already in the '(tabs)' group before navigating
      // if (currentRoute does not start with '/(tabs)') {
      // console.log("[RootLayout] User is signed in. Ensuring navigation to (tabs).");
      router.replace("/(tabs)");
      // }
    } else {
      // Check if not already in the '(auth)' group or sign-in screen before navigating
      // if (currentRoute is not '/sign-in' and does not start with '/(auth)') {
      // console.log("[RootLayout] User is signed out. Ensuring navigation to sign-in.");
      router.replace("/sign-in"); // Adjust if your sign-in route is different
      // }
    }
  }, [
    isAppReady,
    isNavigationReady,
    isSignedIn,
    router,
    urlToProcess,
    isProcessingShare,
  ]);

  // --- Render Logic ---

  // Show loading indicator while app core is loading or processing share
  console.log('[Layout] Render Check:', { isAppReady, isProcessingShare });
  if (!isAppReady || isProcessingShare) {
    console.log('[Layout] Render: Showing Loading Indicator/Splash');
    // Keep the splash screen visible while loading fonts/auth initially
    // Show ActivityIndicator only if processing a share action *after* initial load
    if (isProcessingShare && isAppReady) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: DefaultTheme.colors.background,
          }}
        >
          <ActivityIndicator size="large" color={DefaultTheme.colors.primary} />
        </View>
      );
    }
    return null; // Keep splash screen visible otherwise
  }

  // Clerk key check
  if (!CLERK_PUBLISHABLE_KEY) {
    // This should ideally be caught during build or startup, but keep check
    throw new Error("Missing CLERK_PUBLISHABLE_KEY env variable");
  }

  // Render main layout
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={DefaultTheme}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: "#f5f5f5" },
              headerTintColor: "#000",
              headerTitleStyle: { fontWeight: "600" },
            }}
          >
            {/* Define screens */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            {/* Define modal group */}
            <Stack.Screen name="(modals)" options={{ presentation: 'modal', headerShown: false }} />
            {/* Add other stack screens like modals if needed */}
            {/* <Stack.Screen name="modal" options={{ presentation: 'modal' }} /> */}
          </Stack>
          <StatusBar style="dark" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// --- Final Export with Auth Provider ---
export default function RootLayout() {
  // Clerk Provider wraps the navigation
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
