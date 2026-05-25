import axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { getBaseUrl } from "../config/appVariantConfig";
import { getItem, removeItem } from "../utils/secureStorage";
import { logger } from "./logger";
import { resetToSignIn } from "./navigationService";

let logoutSuppressed = false;

export const resetLogoutSuppression = () => {
  logoutSuppressed = false;
};

export const startManualLogout = () => {
  logoutSuppressed = true;
};

// Guards against firing the session-expired flow multiple times when several
// parallel requests all receive 401 at the same instant.
let sessionExpiring = false;

/**
 * Wipes the local auth artifacts and resets navigation to SignIn. Called when
 * the server responds with 401 to an authenticated request — i.e. the JWT we
 * sent is no longer valid (expired/revoked).
 */
const handleSessionExpired = async () => {
  if (sessionExpiring) return;
  sessionExpiring = true;
  // Block any further outgoing requests until the SignIn screen is mounted —
  // otherwise in-flight code paths might fire follow-up calls that also 401.
  logoutSuppressed = true;
  try {
    await Promise.all([
      removeItem("user_token"),
      removeItem("user_data"),
      removeItem("dashboard_data_cache"),
      removeItem("timezone_synced"),
      removeItem("device_token_registered"),
      // Subscription cache key (kept in sync with `BACKEND_SUBSCRIPTION_STORAGE_KEY`
      // in `utils/subscriptionValidator.ts`).
      removeItem("backend_active_subscription"),
    ]);
  } catch (e) {
    logger.warn("Session expiration cleanup failed:", e);
  } finally {
    resetToSignIn();
    // Allow subsequent (post-login) traffic after a short cool-down so a fresh
    // login flow can run without being blocked by the suppression flag above.
    setTimeout(() => {
      sessionExpiring = false;
      logoutSuppressed = false;
    }, 1500);
  }
};

const apiClient = axios.create({
  timeout: 100000, // 100 seconds
});

// Request Interceptor
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (logoutSuppressed) {
      return Promise.reject(new Error("API blocked due to session expiration"));
    }

    // Set base URL dynamically based on current variant config
    config.baseURL = getBaseUrl();

    // Read user token from secure storage and apply to authorization headers
    const token = await getItem("user_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Normalization of Multi-Status
    if (response.status === 207) {
      response.status = 200;
      if (response.data) {
        response.data._is_restricted = true;
      }
    }
    return response;
  },
  async (error) => {
    if (error.response) {
      // 401 Unauthorized handling.
      // We only auto-logout if the failing request actually carried a Bearer
      // token — otherwise this would trigger on legitimate login/signup
      // failures (which return 401 for wrong credentials).
      if (error.response.status === 401) {
        const sentAuthHeader = Boolean(
          error.config?.headers?.Authorization,
        );
        if (sentAuthHeader) {
          // Fire-and-forget: clears storage and resets the navigation stack
          // to SignIn. Multiple parallel 401s converge on a single run.
          handleSessionExpired();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
