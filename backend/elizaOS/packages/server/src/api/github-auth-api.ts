import { IAgentRuntime, logger, Route } from '@elizaos/core';
import axios from 'axios';
import { URLSearchParams } from 'url';
import { Request, Response } from 'express';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'YOUR_GITHUB_CLIENT_ID';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'YOUR_GITHUB_CLIENT_SECRET';

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

interface GitHubTokenResponse {
  access_token: string;
  scope: string;
  token_type: string;
}

// Redirects the user to GitHub's authorization page
async function handleGitHubLogin(req: Request, res: Response, _runtime: IAgentRuntime) {
  const host = req.get('host');
  if (!host) {
    // Cannot generate a dynamic redirect URI without the host.
    return res.status(500).send('Error: Server host configuration is missing.');
  }
  const protocol = req.protocol;
  const redirectUri = `${protocol}://${host}/api/auth/github/callback`;

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'repo', // Request access to public and private repos
    state: 'a_random_string_for_security', // Should be a random, unguessable string
  }).toString();
  const githubAuthUrl = `https://github.com/login/oauth/authorize?${params}`;
  res.redirect(githubAuthUrl);
}

// Handles the callback from GitHub after user authorization
async function handleGitHubCallback(req: Request, res: Response, _runtime: IAgentRuntime) {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).send('Error: No valid code received from GitHub.');
  }

  // TODO: Validate the 'state' parameter to prevent CSRF attacks

  try {
    const tokenResponse = await axios.post<GitHubTokenResponse>(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
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
    // In a production app, use a more secure method like httpOnly cookies.
    const frontendUrl = getFrontendUrl(req);
    res.redirect(`${frontendUrl}?github_token=${access_token}`);
  } catch (error: unknown) {
    logger.error('GitHub OAuth callback failed:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).send(`An error occurred during GitHub authentication: ${message}`);
  }
}

export const githubAuthRoutes: Route[] = [
  {
    path: '/api/auth/github',
    type: 'GET',
    handler: handleGitHubLogin as any,
    public: true,
  },
  {
    path: '/api/auth/github/callback',
    type: 'GET',
    handler: handleGitHubCallback as any,
    public: true,
  },
];
