import { IAuthProvider } from "./auth-provider.interface.js";
import { GitHubAuthProvider } from "./github-auth.provider.js";
import { GitLabAuthProvider } from "./gitlab-auth.provider.js";
import { GoogleAuthProvider } from "./google-auth.provider.js";
import { AppError } from "../../../middleware/error.js";

class AuthProviderRegistry {
  private providers = new Map<string, IAuthProvider>();

  constructor() {
    this.register(new GitHubAuthProvider());
    this.register(new GitLabAuthProvider());
    this.register(new GoogleAuthProvider());
  }

  register(provider: IAuthProvider): void {
    this.providers.set(provider.id.toLowerCase(), provider);
  }

  get(providerId: string): IAuthProvider {
    const id = providerId.toLowerCase();
    const provider = this.providers.get(id);
    if (!provider) {
      throw new AppError(
        400,
        "UNSUPPORTED_PROVIDER",
        `Provider '${providerId}' is not supported`,
      );
    }

    if (!provider.isConfigured()) {
      throw new AppError(
        400,
        "PROVIDER_NOT_CONFIGURED",
        `OAuth provider '${provider.name}' is not configured on this server. Missing CLIENT_ID and CLIENT_SECRET.`,
      );
    }

    return provider;
  }

  getAll(): Array<{ id: string; name: string; isConfigured: boolean }> {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
      isConfigured: p.isConfigured(),
    }));
  }
}

export const authProviders = new AuthProviderRegistry();
