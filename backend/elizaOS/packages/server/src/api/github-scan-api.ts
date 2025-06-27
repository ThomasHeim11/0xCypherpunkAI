import { IAgentRuntime, logger, Route } from '@elizaos/core';
import { SecurityScanningService } from '../core/security-scanning-service.js';
import { ScanRequest } from '../core/types.js';
import axios from 'axios';
import { Request, Response } from 'express';

// Type definitions for GitHub API responses
interface GitHubRepo {
  id: number;
  full_name: string;
  private: boolean;
}

interface GitHubContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
}

async function handleGitHubScan(req: Request, res: Response, runtime: IAgentRuntime) {
  try {
    const securityService = runtime.getService<SecurityScanningService>(
      SecurityScanningService.serviceType
    );
    if (!securityService) {
      return res.status(503).json({ error: 'SecurityScanningService not available' });
    }

    const { githubRepo, githubPath, accessToken, userAddress } = req.body;

    if (!githubRepo || !accessToken) {
      return res.status(400).json({ error: 'Missing required fields: githubRepo, accessToken' });
    }

    const scanRequest: ScanRequest = {
      type: 'GITHUB',
      githubRepo,
      githubPath,
      accessToken,
      userAddress,
    };

    const scanId = await securityService.startScan(scanRequest);
    res.json({ scanId, status: 'initiated' });
  } catch (error: unknown) {
    logger.error('GitHub scan initiation failed:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: message || 'Failed to initiate GitHub scan.' });
  }
}

async function getUserRepos(req: Request, res: Response, _runtime: IAgentRuntime) {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (!accessToken) {
      return res.status(401).json({ error: 'Unauthorized: Missing GitHub token.' });
    }

    const response = await axios.get(
      'https://api.github.com/user/repos?sort=updated&per_page=100',
      {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    const repos = response.data.map((repo: GitHubRepo) => ({
      id: repo.id,
      name: repo.full_name,
      private: repo.private,
    }));

    res.json(repos);
  } catch (error: unknown) {
    logger.error('Failed to fetch user repos:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: message || 'Failed to fetch repositories.' });
  }
}

async function getRepoContents(req: Request, res: Response, _runtime: IAgentRuntime) {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (!accessToken) {
      return res.status(401).json({ error: 'Unauthorized: Missing GitHub token.' });
    }

    const { repo, path = '' } = req.query;
    if (!repo) {
      return res.status(400).json({ error: 'Missing required query parameter: repo' });
    }

    const response = await axios.get(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const contents = response.data.map((item: GitHubContent) => ({
      name: item.name,
      path: item.path,
      type: item.type, // 'file' or 'dir'
    }));

    res.json(contents);
  } catch (error: unknown) {
    logger.error(`Failed to fetch repo contents for ${req.query.repo}:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: message || 'Failed to fetch repository contents.' });
  }
}

export const githubApiRoutes: Route[] = [
  {
    path: '/api/scan/github',
    type: 'POST',
    handler: handleGitHubScan as any,
    public: true,
  },
  {
    path: '/api/github/repos',
    type: 'GET',
    handler: getUserRepos as any,
    public: true,
  },
  {
    path: '/api/github/repo-contents',
    type: 'GET',
    handler: getRepoContents as any,
    public: true,
  },
];
