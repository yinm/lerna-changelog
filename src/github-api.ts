const path = require("path");

import { Configuration } from "./configuration";
import ConfigurationError from "./configuration-error";
import fetch from "./fetch";

export interface GitHubUserResponse {
  login: string;
  name: string;
  html_url: string;
}

export interface GitHubIssueResponse {
  number: number;
  title: string;
  pull_request?: {
    html_url: string;
  };
  labels: Array<{
    name: string;
  }>;
  user: {
    login: string;
    html_url: string;
  };
}

export default class GithubAPI {
  private cacheDir: string | undefined;
  private auth: string;
  private host: string;
  private apiHost: string;

  constructor(config: Configuration) {
    const { githubEnterpriseUrl } = config;
    const githubHost = githubEnterpriseUrl ? "github-enterprise" : "github";
    this.cacheDir = config.cacheDir && path.join(config.rootPath, config.cacheDir, githubHost);
    this.auth = this.getAuthToken(githubEnterpriseUrl);
    if (!this.auth) {
      throw new ConfigurationError(
        "Must provide GITHUB_AUTH (if you use GitHub Enterprise, must provide GITHUB_ENTERPRISE_AUTH to env and githubEnterpriseUrl to config)"
      );
    }
    this.host = this.githubHost(githubEnterpriseUrl);
    this.apiHost = this.githubAPIHost(githubEnterpriseUrl);
  }

  public getBaseIssueUrl(repo: string): string {
    return `${this.host}${repo}/issues/`;
  }

  public async getIssueData(repo: string, issue: string): Promise<GitHubIssueResponse> {
    return this._fetch(`${this.apiHost}repos/${repo}/issues/${issue}`);
  }

  public async getUserData(login: string): Promise<GitHubUserResponse> {
    return this._fetch(`${this.apiHost}users/${login}`);
  }

  private async _fetch(url: string): Promise<any> {
    const res = await fetch(url, {
      cacheManager: this.cacheDir,
      headers: {
        Authorization: `token ${this.auth}`,
      },
    });
    const parsedResponse = await res.json();
    if (res.ok) {
      return parsedResponse;
    }
    throw new ConfigurationError(`Fetch error: ${res.statusText}.\n${JSON.stringify(parsedResponse)}`);
  }

  private getAuthToken(githubEnterpriseUrl: string): string {
    if (githubEnterpriseUrl) {
      return process.env.GITHUB_ENTERPRISE_AUTH || "";
    }

    return process.env.GITHUB_AUTH || "";
  }

  private githubHost(githubEnterpriseUrl: string): string {
    return githubEnterpriseUrl ? githubEnterpriseUrl : "https://github.com/";
  }

  private githubAPIHost(githubEnterpriseUrl: string): string {
    return githubEnterpriseUrl ? `${githubEnterpriseUrl}api/v3/` : "https://api.github.com/";
  }
}
