import { logger, IAgentRuntime, UUID } from '@elizaos/core';
import axios from 'axios';
import { Request, Response, Router } from 'express';
import { SecurityScanningService } from '../core/security-scanning-service.js';

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
  logger.info('[GitHub API] Received request to list repositories.');
  try {
    const token = getGitHubToken(req);
    if (!token) {
      logger.warn('[GitHub API] Unauthorized: GitHub access token was not provided.');
      return res.status(401).json({
        success: false,
        error: { message: 'GitHub access token required', code: 'UNAUTHORIZED' },
      });
    }

    logger.info(`[GitHub API] Auth token received, starting with: ${token.substring(0, 8)}...`);

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

    logger.info(
      `[GitHub API] Successfully fetched ${response.data.length} repositories from GitHub.`
    );

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

    // Get the agents map from the request (injected by the router)
    const agents = (req as any).agents as Map<UUID, IAgentRuntime>;
    if (!agents || agents.size === 0) {
      logger.error('No agents available for security scan');
      return res.status(503).json({
        success: false,
        error: { message: 'No agents available for scanning', code: 'NO_AGENTS_AVAILABLE' },
      });
    }

    // Get the first available runtime for scanning
    const runtime = agents.values().next().value;
    if (!runtime) {
      logger.error('No runtime found in agents map');
      return res.status(503).json({
        success: false,
        error: { message: 'No runtime available', code: 'NO_RUNTIME_AVAILABLE' },
      });
    }

    // Get the SecurityScanningService
    const securityService = runtime.getService<SecurityScanningService>(
      SecurityScanningService.serviceType
    );

    if (!securityService) {
      logger.error('SecurityScanningService not available');
      return res.status(503).json({
        success: false,
        error: { message: 'Security scanning service not available', code: 'SERVICE_UNAVAILABLE' },
      });
    }

    logger.info(`🚀 Starting REAL security scan for repository: ${repository}`, {
      path,
      token: token.substring(0, 8) + '...', // Log only first 8 chars for security
    });

    // Start the real security scan with AI agents
    const scanId = await securityService.startScan({
      type: 'GITHUB',
      githubRepo: repository,
      githubPath: path,
      accessToken: token,
    });

    logger.info(`✅ Security scan initiated with ID: ${scanId}`);

    res.json({
      success: true,
      data: {
        scanId,
        status: 'initiated',
        repository,
        path,
        estimatedDuration: '30-60 seconds',
        message: 'Real AI-powered security scan initiated with 11 specialized agents!',
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

export function githubRouter(agents: Map<UUID, IAgentRuntime>): Router {
  const router = Router();

  // Routes that don't need agents (just GitHub API calls)
  router.get('/repos', (req: Request, res: Response) => {
    handleListRepositories(req, res);
  });
  router.get('/user', (req: Request, res: Response) => {
    handleGetUserProfile(req, res);
  });

  // Routes that need agents (scanning operations)
  router.post('/scan', (req: Request, res: Response) => {
    // Inject agents map only for scanning routes
    (req as any).agents = agents;
    handleStartScan(req, res);
  });

  return router;
}
