import { Platform, Alert, PermissionsAndroid } from "react-native";
import { useState, useEffect } from "react";
import { logger } from "./logger";
import { check, request, PERMISSIONS, RESULTS } from "react-native-permissions";

export class PermissionManager {
  static async requestMicrophonePermission(
    setHasPermission: (val: boolean) => void,
  ): Promise<boolean> {
    if (Platform.OS === "android") {
      return await PermissionManager.requestAndroidPermissions(
        setHasPermission,
      );
    } else if (Platform.OS === "ios") {
      return await PermissionManager.handleiOSPermissions(setHasPermission);
    }
    return false;
  }

  static async requestAndroidPermissions(
    setHasPermission: (val: boolean) => void,
  ): Promise<boolean> {
    try {
      const androidVersion = Platform.Version as number;
      logger.log("Android version:", androidVersion);

      // For Android 11+ (API 30+), we only need microphone permission
      let permissionsToRequest = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];

      // For older Android versions (below 13), also request storage permissions
      if (androidVersion < 33) {
        permissionsToRequest = [
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ];
      }

      const results = await PermissionsAndroid.requestMultiple(
        permissionsToRequest,
      );
      logger.log("Permission results:", results);

      // Detect if any permission is permanently denied
      const isPermanentlyDenied = Object.values(results).some(
        (status) => status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
      );

      // Check if microphone permission is granted
      const microphoneGranted =
        results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
        PermissionsAndroid.RESULTS.GRANTED;

      let storageGranted = true;
      if (androidVersion < 30) {
        const readStorageGranted =
          results[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const writeStorageGranted =
          results[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] ===
          PermissionsAndroid.RESULTS.GRANTED;
        storageGranted = readStorageGranted && writeStorageGranted;
      }

      if (microphoneGranted && storageGranted) {
        setHasPermission(true);
        return true;
      } else {
        const deniedPermissions: string[] = [];
        if (!microphoneGranted) deniedPermissions.push("Microphone");
        if (!storageGranted) deniedPermissions.push("Storage");

        if (isPermanentlyDenied) {
          Alert.alert(
            "Permission Required",
            `You have permanently denied ${deniedPermissions.join(
              " and ",
            )} permission.\n\nTo continue with the test, please enable it from app settings.`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Open Settings",
                onPress: () => {
                  const { Linking } = require("react-native");
                  Linking.openSettings();
                },
              },
            ],
          );
        } else {
          Alert.alert(
            "Microphone Permission Required",
            `This test requires microphone access to record your speaking responses.\n\nWithout this permission, you cannot proceed with the test.\n\nYou can either try again or manually enable it from Settings.`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Try Again",
                onPress: () =>
                  PermissionManager.requestMicrophonePermission(
                    setHasPermission,
                  ),
              },
              {
                text: "Open Settings",
                onPress: () => {
                  const { Linking } = require("react-native");
                  Linking.openSettings();
                },
              },
            ],
          );
        }
        setHasPermission(false);
        return false;
      }
    } catch (error: any) {
      logger.error("Android permission error:", error);

      // Safety: don't show error if it's just the "not attached to activity" issue
      if (!error.message?.includes("not attached to an Activity")) {
        Alert.alert(
          "Permission Error",
          "An error occurred while requesting permissions. Please try again.",
        );
      }
      setHasPermission(false);
      return false;
    }
  }

  static async handleiOSPermissions(
    setHasPermission: (val: boolean) => void,
  ): Promise<boolean> {
    try {
      let status = await check(PERMISSIONS.IOS.MICROPHONE);
      logger.log("Initial iOS Microphone Status:", status);

      if (status === RESULTS.GRANTED) {
        setHasPermission(true);
        return true;
      }

      if (status === RESULTS.BLOCKED) {
        Alert.alert(
          "Microphone Permission Required",
          "You have denied microphone access. To proceed with the test, please enable it in your phone settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                const { Linking } = require("react-native");
                Linking.openSettings();
              },
            },
          ],
        );
        setHasPermission(false);
        return false;
      }

      // Request permission
      status = await request(PERMISSIONS.IOS.MICROPHONE);
      logger.log("Request iOS Microphone Status:", status);

      if (status === RESULTS.GRANTED) {
        setHasPermission(true);
        return true;
      } else {
        setHasPermission(false);
        return false;
      }
    } catch (error) {
      logger.error("iOS permission error:", error);
      setHasPermission(false);
      return false;
    }
  }

  static async checkExistingPermissions(): Promise<{
    microphone: boolean;
    storage: boolean;
    allGranted: boolean;
  }> {
    if (Platform.OS === "android") {
      try {
        const microphonePermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );

        let storagePermission = true;
        if ((Platform.Version as number) < 30) {
          const readPermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          );
          const writePermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          );
          storagePermission = readPermission && writePermission;
        }

        return {
          microphone: microphonePermission,
          storage: storagePermission,
          allGranted: microphonePermission && storagePermission,
        };
      } catch (error) {
        logger.error("Error checking Android permissions:", error);
        return { microphone: false, storage: false, allGranted: false };
      }
    } else {
      try {
        const status = await check(PERMISSIONS.IOS.MICROPHONE);
        const granted = status === RESULTS.GRANTED;
        return {
          microphone: granted,
          storage: true, // Not required on iOS for internal app recording
          allGranted: granted,
        };
      } catch (error) {
        logger.error("Error checking iOS permissions:", error);
        return { microphone: true, storage: true, allGranted: true };
      }
    }
  }

  // Helper method to initialize permissions on app start
  static async initializePermissions(
    setHasPermission: (val: boolean) => void,
  ): Promise<boolean> {
    const existingPermissions =
      await PermissionManager.checkExistingPermissions();

    if (existingPermissions.allGranted) {
      setHasPermission(true);
      return true;
    } else {
      // Don't auto-request on initialization, let user trigger it
      setHasPermission(false);
      return false;
    }
  }
}

export const useAudioPermissions = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initPermissions = async () => {
      await PermissionManager.initializePermissions(setHasPermission);
      setIsLoading(false);
    };
    initPermissions();
  }, []);

  const requestPermission = async () => {
    setIsLoading(true);
    const result = await PermissionManager.requestMicrophonePermission(
      setHasPermission,
    );
    setIsLoading(false);
    return result;
  };

  const checkPermissions = async () => {
    return await PermissionManager.checkExistingPermissions();
  };

  return {
    hasPermission,
    isLoading,
    requestPermission,
    checkPermissions,
  };
};
