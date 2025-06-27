import { logger } from '@elizaos/core';
import axios from 'axios';
import { Request, Response, Router } from 'express';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  language: string | null;
  default_branch: string;
  updated_at: string;
}

interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
}

// Get GitHub access token from request
function getGitHubToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// List user's repositories
async function handleListRepositories(req: Request, res: Response) {
  try {
    const token = getGitHubToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'GitHub access token required', code: 'UNAUTHORIZED' },
      });
    }

    // Fetch user's repositories from GitHub API
    const response = await axios.get<GitHubRepo[]>('https://api.github.com/user/repos', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': '0xCypherpunkAI-Security-Scanner',
      },
      params: {
        sort: 'updated',
        per_page: 100,
        type: 'all', // Include public and private repos
      },
    });

    const repos = response.data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description || 'No description available',
      private: repo.private,
      language: repo.language || 'Unknown',
      html_url: repo.html_url,
      default_branch: repo.default_branch,
      updated_at: repo.updated_at,
    }));

    res.json({
      success: true,
      data: repos,
    });
  } catch (error: any) {
    logger.error('Failed to fetch GitHub repositories:', error);

    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired GitHub token', code: 'GITHUB_UNAUTHORIZED' },
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch repositories', code: 'GITHUB_API_ERROR' },
    });
  }
}

// Get user profile information
async function handleGetUserProfile(req: Request, res: Response) {
  try {
    const token = getGitHubToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'GitHub access token required', code: 'UNAUTHORIZED' },
      });
    }

    const response = await axios.get<GitHubUser>('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': '0xCypherpunkAI-Security-Scanner',
      },
    });

    const user = {
      login: response.data.login,
      id: response.data.id,
      name: response.data.name || response.data.login,
      avatar_url: response.data.avatar_url,
    };

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    logger.error('Failed to fetch GitHub user profile:', error);

    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired GitHub token', code: 'GITHUB_UNAUTHORIZED' },
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch user profile', code: 'GITHUB_API_ERROR' },
    });
  }
}

// Start a security scan for a repository
async function handleStartScan(req: Request, res: Response) {
  try {
    const token = getGitHubToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'GitHub access token required', code: 'UNAUTHORIZED' },
      });
    }

    const { repository, path = '' } = req.body;

    if (!repository) {
      return res.status(400).json({
        success: false,
        error: { message: 'Repository name is required', code: 'MISSING_REPOSITORY' },
      });
    }

    // Generate a unique scan ID
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // For now, we'll just return a mock scan ID
    // In a real implementation, this would:
    // 1. Clone or fetch the repository
    // 2. Start the actual security scan with the AI agents
    // 3. Store scan status in database
    // 4. Process files in the background

    logger.info(`Starting security scan for repository: ${repository}`, {
      scanId,
      path,
      token: token.substring(0, 8) + '...', // Log only first 8 chars for security
    });

    res.json({
      success: true,
      data: {
        scanId,
        status: 'initiated',
        repository,
        path,
        estimatedDuration: '30-60 seconds',
        message: 'Security scan has been initiated. You will receive results shortly.',
      },
    });
  } catch (error: any) {
    logger.error('Failed to start security scan:', error);

    res.status(500).json({
      success: false,
      error: { message: 'Failed to start security scan', code: 'SCAN_START_FAILED' },
    });
  }
}

export function githubRouter(): Router {
  const router = Router();

  // GitHub API routes
  router.get('/repos', (req: Request, res: Response) => {
    handleListRepositories(req, res);
  });
  router.get('/user', (req: Request, res: Response) => {
    handleGetUserProfile(req, res);
  });
  router.post('/scan', (req: Request, res: Response) => {
    handleStartScan(req, res);
  });

  return router;
}
