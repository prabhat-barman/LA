import { Platform } from "react-native";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { appleAuth } from "@invertase/react-native-apple-authentication";
import Config from "../config/Config";
import { API_ENDPOINTS } from "../config/apiConfig";
import apiClient from "./apiClient";
import { logger } from "./logger";
import { setItem } from "../utils/secureStorage";

// Initialize Google Sign-in config
export const configureGoogleSignIn = () => {
  try {
    GoogleSignin.configure({
      scopes: ["https://www.googleapis.com/auth/user.gender.read"],
      webClientId: Config.GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
      iosClientId: Config.GOOGLE_IOS_CLIENT_ID,
    });
  } catch (error) {
    logger.error(error, "Failed to configure Google Sign-In");
  }
};

/**
 * Handles the full Google Sign-In flow
 */
export const signInWithGoogle = async (): Promise<{ success: boolean; user?: any; error?: string }> => {
  try {
    // 1. Ensure configuration is loaded
    configureGoogleSignIn();

    // 2. Check Play Services on Android
    if (Platform.OS === "android") {
      await GoogleSignin.hasPlayServices();
    }

    // 3. Initiate Google OAuth Dialog
    await GoogleSignin.signIn();

    // 4. Retrieve OAuth tokens
    const tokens = await GoogleSignin.getTokens();
    const accessToken = tokens.accessToken;

    if (!accessToken) {
      throw new Error("No access token retrieved from Google");
    }

    // 5. Send credential to the backend using FormData
    const formData = new FormData();
    formData.append("credential", accessToken);

    const response = await apiClient.post(API_ENDPOINTS.GOOGLE_LOGIN, formData);
    
    // Normalize inconsistent backend wraps
    const data = response.data?.original || response.data;
    
    if (data && data.access_token) {
      await setItem("user_token", data.access_token);
      await setItem("user_data", JSON.stringify(data.user || {}));
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data?.message || "Google Sign-In failed" };
    }
  } catch (error: any) {
    // Clean up sign-in state on error
    try {
      await GoogleSignin.signOut();
    } catch {}

    // Map common Google error codes
    let errorMessage = "Google Sign-In failed";
    if (error.message && error.message.includes("getTokens requires a user to be signed in")) {
      errorMessage = "Google Sign-In session could not be established. Please select an account to sign in.";
    } else if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      errorMessage = "Google login was cancelled.";
    } else if (error.code === statusCodes.IN_PROGRESS) {
      errorMessage = "Google login is already in progress.";
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      errorMessage = "Google Play Services not available or outdated.";
    } else {
      errorMessage = error.message || errorMessage;
    }
    return { success: false, error: errorMessage };
  }
};

/**
 * Handles the full Apple Sign-In flow (iOS Only)
 */
export const signInWithApple = async (): Promise<{ success: boolean; user?: any; error?: string }> => {
  try {
    if (Platform.OS !== "ios") {
      return { success: false, error: "Apple Sign-In is only supported on iOS devices" };
    }

    // 1. Check native support
    if (!appleAuth.isSupported) {
      return { success: false, error: "Apple Sign-In is not supported on this device" };
    }

    // 2. Perform native Apple request sheet
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    const { email, fullName, user: appleUser, identityToken, authorizationCode } = appleAuthRequestResponse;
    const firstName = fullName?.givenName && fullName.givenName !== "null" ? fullName.givenName : "";
    const lastName = fullName?.familyName && fullName.familyName !== "null" ? fullName.familyName : "";

    if (!identityToken) {
      throw new Error("No identity token retrieved from Apple");
    }

    // 3. Prepare payload for the backend as JSON (not FormData)
    const applePayload = {
      email: email || "",
      name: `${firstName} ${lastName}`.trim(),
      apple_id: appleUser,
      identityToken,
      access_token: identityToken,
      id_token: identityToken,
      token: identityToken,
      code: authorizationCode,
      type: "apple",
    };

    const response = await apiClient.post(API_ENDPOINTS.APPLE_LOGIN, applePayload);

    // Normalize inconsistent backend wraps
    const data = response.data?.original || response.data;

    // Apple privacy relay fix - preserving actual email locally if backend returned a relay address
    if (data && data.user && email && data.user.email?.includes("privaterelay.appleid.com")) {
      data.user.originalEmail = email;
    }

    if (data && data.access_token) {
      await setItem("user_token", data.access_token);
      await setItem("user_data", JSON.stringify(data.user || {}));
      
      // Silent updateName trigger if name is missing in Apple Response
      if (!data.user?.first_name && (firstName || lastName)) {
        try {
          await apiClient.post(API_ENDPOINTS.UPDATE_NAME, {
            first_name: firstName,
            last_name: lastName,
          });
        } catch (nameError) {
          logger.warn("Silent profile name update failed:", nameError);
        }
      }

      return { success: true, user: data.user };
    } else {
      return { success: false, error: data?.message || "Apple Sign-In failed" };
    }
  } catch (error: any) {
    let errorMessage = "Apple Sign-In failed";
    
    // Map common Apple error codes
    if (error.code === appleAuth.Error.CANCELED) {
      return { success: false, error: "Apple login cancelled by user" };
    } else if (error.code === 1000 || String(error.message).includes("1000")) {
      errorMessage = "Apple ID not signed in. Please sign in to iCloud on your device.";
    } else {
      errorMessage = error.message || errorMessage;
    }
    return { success: false, error: errorMessage };
  }
};
