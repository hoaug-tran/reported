import { IAuthProvider, ExternalUserProfile, OAuthTokens } from './auth-provider.interface.js';
import { config } from '../../../config/index.js';
import { AppError } from '../../../middleware/error.js';

interface GitLabTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GitLabUserResponse {
  id: number;
  username: string;
  name?: string;
  email?: string;
  confirmed_at?: string;
  avatar_url?: string;
  bio?: string;
}

export class GitLabAuthProvider implements IAuthProvider {
  readonly id = 'gitlab';
  readonly name = 'GitLab';

  isConfigured(): boolean {
    return Boolean(config.oauth.gitlab.clientId && config.oauth.gitlab.clientSecret);
  }

  getAuthorizationUrl(state: string, intent: 'login' | 'link', extraScopes: string[] = []): string {
    const baseScopes = ['read_user', 'openid', 'profile', 'email'];
    const allScopes = Array.from(new Set([...baseScopes, ...extraScopes]));

    const params = new URLSearchParams({
      client_id: config.oauth.gitlab.clientId,
      redirect_uri: config.oauth.gitlab.redirectUri,
      response_type: 'code',
      scope: allScopes.join(' '),
      state
    });

    return `https://gitlab.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const res = await fetch('https://gitlab.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: config.oauth.gitlab.clientId,
        client_secret: config.oauth.gitlab.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.oauth.gitlab.redirectUri
      })
    });

    if (!res.ok) {
      throw new AppError(400, 'OAUTH_TOKEN_EXCHANGE_FAILED', 'Failed to exchange GitLab authorization code');
    }

    const data = (await res.json()) as GitLabTokenResponse;
    if (data.error) {
      throw new AppError(400, 'OAUTH_ERROR', data.error_description || data.error);
    }

    const scopes = data.scope ? data.scope.split(' ') : ['read_user'];

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scopes
    };
  }

  async getUserProfile(accessToken: string): Promise<ExternalUserProfile> {
    const userRes = await fetch('https://gitlab.com/api/v4/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    if (!userRes.ok) {
      throw new AppError(400, 'OAUTH_USER_PROFILE_FAILED', 'Failed to fetch GitLab user profile');
    }

    const user = (await userRes.json()) as GitLabUserResponse;

    return {
      id: String(user.id),
      username: user.username,
      displayName: user.name || user.username,
      email: user.email || `${user.username}@gitlab.com`,
      emailVerified: Boolean(user.confirmed_at || user.email),
      avatarUrl: user.avatar_url,
      bio: user.bio
    };
  }
}

