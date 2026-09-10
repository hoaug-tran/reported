import {
  IAuthProvider,
  ExternalUserProfile,
  OAuthTokens,
} from "./auth-provider.interface.js";
import { config } from "../../../config/index.js";
import { AppError } from "../../../middleware/error.js";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfoResponse {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  picture?: string;
}

export class GoogleAuthProvider implements IAuthProvider {
  readonly id = "google";
  readonly name = "Google";

  isConfigured(): boolean {
    return Boolean(
      config.oauth.google.clientId && config.oauth.google.clientSecret,
    );
  }

  getAuthorizationUrl(
    state: string,
    _intent: "login" | "link",
    _extraScopes: string[] = [],
    redirectUri?: string,
  ): string {
    const scopes = ["openid", "email", "profile"];
    const effectiveRedirectUri = redirectUri || config.oauth.google.redirectUri;

    const params = new URLSearchParams({
      client_id: config.oauth.google.clientId,
      redirect_uri: effectiveRedirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      state,
      access_type: "offline",
      prompt: "consent",
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri?: string): Promise<OAuthTokens> {
    const effectiveRedirectUri = redirectUri || config.oauth.google.redirectUri;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.oauth.google.clientId,
        client_secret: config.oauth.google.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: effectiveRedirectUri,
      }).toString(),
    });

    if (!res.ok) {
      throw new AppError(
        400,
        "OAUTH_TOKEN_EXCHANGE_FAILED",
        "Failed to exchange Google authorization code",
      );
    }

    const data = (await res.json()) as GoogleTokenResponse;
    if (data.error) {
      throw new AppError(
        400,
        "OAUTH_ERROR",
        data.error_description || data.error,
      );
    }

    const scopes = data.scope
      ? data.scope.split(" ")
      : ["openid", "email", "profile"];

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scopes,
    };
  }

  async getUserProfile(accessToken: string): Promise<ExternalUserProfile> {
    const userRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!userRes.ok) {
      throw new AppError(
        400,
        "OAUTH_USER_PROFILE_FAILED",
        "Failed to fetch Google user profile",
      );
    }

    const user = (await userRes.json()) as GoogleUserInfoResponse;
    const username = user.email
      ? user.email.split("@")[0]
      : `google_${user.sub.slice(0, 8)}`;

    return {
      id: user.sub,
      username,
      displayName: user.name || user.given_name || username,
      email: user.email || `${username}@gmail.com`,
      emailVerified: Boolean(user.email_verified),
      avatarUrl: user.picture,
    };
  }
}
