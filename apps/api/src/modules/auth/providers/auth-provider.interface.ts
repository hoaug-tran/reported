export interface ExternalUserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  avatarUrl?: string;
  bio?: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scopes: string[];
}

export interface IAuthProvider {
  id: string;
  name: string;
  isConfigured(): boolean;
  getAuthorizationUrl(state: string, intent: 'login' | 'link', extraScopes?: string[]): string;
  exchangeCode(code: string): Promise<OAuthTokens>;
  getUserProfile(accessToken: string): Promise<ExternalUserProfile>;
}

