import { logger } from '@elizaos/core';
import axios from 'axios';
import { URLSearchParams } from 'url';
import { Request, Response, Router } from 'express';

interface GitHubTokenResponse {
  access_token: string;
  scope: string;
  token_type: string;
}

// Function to get frontend URL based on request headers
function getFrontendUrl(req: Request): string {
  // Get the referer header first (most reliable for OAuth flows)
  const referer = req.get('referer') || req.get('origin');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return `${refererUrl.protocol}//${refererUrl.host}`;
    } catch (e) {
      // Fall through to other methods
    }
  }

  // Check environment variable
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }

  // Dynamic detection based on request
  const host = req.get('host');
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';

  if (!host) {
    return 'http://localhost:3000'; // Ultimate fallback
  }

  // For localhost development, try to detect frontend port
  if (host.includes('localhost')) {
    const [, backendPort] = host.split(':');
    // If backend is on 3001, frontend is likely on 3000
    // If backend is on different port, try common frontend ports
    const frontendPort =
      backendPort === '3001'
        ? '3000'
        : backendPort === '8080'
          ? '3000'
          : backendPort === '5000'
            ? '3000'
            : '3000';
    return `${protocol}://localhost:${frontendPort}`;
  }

  // Production: remove api/backend subdomains
  const cleanHost = host.replace(/^(api\.|backend\.)/g, '');
  return `${protocol}://${cleanHost}`;
}

// Redirects the user to GitHub's authorization page
async function handleGitHubLogin(req: Request, res: Response) {
  const host = req.get('host');
  if (!host) {
    return res.status(500).send('Error: Server host configuration is missing.');
  }
  const protocol = req.protocol;
  const redirectUri = `${protocol}://${host}/api/auth/github/callback`;

  const githubClientId = process.env.GITHUB_CLIENT_ID;
  if (!githubClientId) {
    return res.status(500).send('Error: GITHUB_CLIENT_ID environment variable is not set.');
  }

  const params = new URLSearchParams({
    client_id: githubClientId,
    redirect_uri: redirectUri,
    scope: 'repo', // Request access to public and private repos
    state: 'a_random_string_for_security', // Should be a random, unguessable string
  }).toString();
  const githubAuthUrl = `https://github.com/login/oauth/authorize?${params}`;
  res.redirect(githubAuthUrl);
}

// Handles the callback from GitHub after user authorization
async function handleGitHubCallback(req: Request, res: Response) {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).send('Error: No valid code received from GitHub.');
  }

  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!githubClientId || !githubClientSecret) {
    return res.status(500).send('Error: GitHub OAuth environment variables are not set.');
  }

  try {
    const tokenResponse = await axios.post<GitHubTokenResponse>(
      'https://github.com/login/oauth/access_token',
      {
        client_id: githubClientId,
        client_secret: githubClientSecret,
        code,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      throw new Error('Failed to retrieve access token from GitHub.');
    }

    // Redirect back to the frontend with the token in the query string
    const frontendUrl = getFrontendUrl(req);
    res.redirect(`${frontendUrl}?github_token=${access_token}`);
  } catch (error: unknown) {
    logger.error('GitHub OAuth callback failed:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).send(`An error occurred during GitHub authentication: ${message}`);
  }
}

export function authRouter(): Router {
  const router = Router();

  // GitHub OAuth routes
  router.get('/github', (req: Request, res: Response) => {
    handleGitHubLogin(req, res);
  });
  router.get('/github/callback', (req: Request, res: Response) => {
    handleGitHubCallback(req, res);
  });

  return router;
}
 