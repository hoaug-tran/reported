import { ICodeHostProvider } from './code-host-provider.interface.js';
import { GitHubCodeHostProvider } from './github-code-host.provider.js';
import { GitLabCodeHostProvider } from './gitlab-code-host.provider.js';

class CodeHostProviderFactory {
  private providers = new Map<string, ICodeHostProvider>();

  constructor() {
    this.providers.set('github', new GitHubCodeHostProvider());
    this.providers.set('gitlab', new GitLabCodeHostProvider());
  }

  get(providerId: string): ICodeHostProvider {
    const p = this.providers.get(providerId.toLowerCase());
    return p || this.providers.get('github')!;
  }
}

export const codeHostProviders = new CodeHostProviderFactory();

