import {
  IAuthProvider,
  ExternalUserProfile,
  OAuthTokens,
} from "./auth-provider.interface.js";
import { config } from "../../../config/index.js";
import { AppError } from "../../../middleware/error.js";

interface GitHubTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
}

interface GitHubEmailItem {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility?: string | null;
}

export class GitHubAuthProvider implements IAuthProvider {
  readonly id = "github";
  readonly name = "GitHub";

  isConfigured(): boolean {
    return Boolean(
      config.oauth.github.clientId && config.oauth.github.clientSecret,
    );
  }

  getAuthorizationUrl(
    state: string,
    intent: "login" | "link",
    extraScopes: string[] = [],
    redirectUri?: string,
  ): string {
    const baseScopes = ["read:user", "user:email", "repo"];

    const allScopes = Array.from(new Set([...baseScopes, ...extraScopes]));
    const effectiveRedirectUri = redirectUri || config.oauth.github.redirectUri;

    const params = new URLSearchParams({
      client_id: config.oauth.github.clientId,
      redirect_uri: effectiveRedirectUri,
      scope: allScopes.join(" "),
      state,
      allow_signup: "true",
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri?: string): Promise<OAuthTokens> {
    const effectiveRedirectUri = redirectUri || config.oauth.github.redirectUri;

    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: config.oauth.github.clientId,
        client_secret: config.oauth.github.clientSecret,
        code,
        redirect_uri: effectiveRedirectUri,
      }),
    });

    if (!res.ok) {
      throw new AppError(
        400,
        "OAUTH_TOKEN_EXCHANGE_FAILED",
        "Failed to exchange GitHub authorization code",
      );
    }

    const data = (await res.json()) as GitHubTokenResponse;
    if (data.error) {
      throw new AppError(
        400,
        "OAUTH_ERROR",
        data.error_description || data.error,
      );
    }

    const scopes = data.scope
      ? data.scope.split(",").map((s: string) => s.trim())
      : ["read:user", "user:email"];

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scopes,
    };
  }

  async getUserProfile(accessToken: string): Promise<ExternalUserProfile> {
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Reported-App",
      },
    });

    if (!userRes.ok) {
      throw new AppError(
        400,
        "OAUTH_USER_PROFILE_FAILED",
        "Failed to fetch GitHub user profile",
      );
    }

    const user = (await userRes.json()) as GitHubUserResponse;
    let email = user.email;
    let emailVerified = false;

    if (!email) {
      try {
        const emailsRes = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "Reported-App",
          },
        });
        if (emailsRes.ok) {
          const emails = (await emailsRes.json()) as GitHubEmailItem[];
          const primary = emails.find((e) => e.primary) || emails[0];
          if (primary) {
            email = primary.email;
            emailVerified = Boolean(primary.verified);
          }
        }
      } catch (err: unknown) {
        console.warn("Could not fetch GitHub user emails:", err);
      }
    } else {
      emailVerified = true;
    }

    return {
      id: String(user.id),
      username: user.login,
      displayName: user.name || user.login,
      email: email || `${user.login}@users.noreply.github.com`,
      emailVerified,
      avatarUrl: user.avatar_url,
      bio: user.bio,
    };
  }
}
