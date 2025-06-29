import { IAgentRuntime, logger, Plugin, Route } from '@elizaos/core';
// import { SoloditRAGService } from '../services/solodit-rag-service.js';
// import { KnowledgeBaseService } from '../core/knowledge-base-service.js';
import { SecurityScanningService } from '../core/security-scanning-service.js';
import { CacheService } from '../core/cache-service.js';
import { securityAnalysisPlugin } from './security-analysis-plugin.js';
import { githubAuthRoutes } from '../api/github-auth-api.js';

let hasInitialized = false;

const allApiRoutes: Route[] = [
  ...githubAuthRoutes,
  {
    path: '/api/results/:scanId',
    type: 'GET',
    public: true,
    handler: async (req, res, runtime: IAgentRuntime) => {
      try {
        const { scanId } = req.params;
        const securityService = runtime.getService<SecurityScanningService>(
          SecurityScanningService.serviceType
        );

        if (!securityService) {
          return res.status(503).json({ error: 'SecurityScanningService not available' });
        }

        const result = await securityService.getScanResult(scanId);
        if (!result) {
          return res.status(404).json({ error: 'Scan not found' });
        }

        res.json({ success: true, data: result });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        logger.error(`[GET /api/results/:scanId] Error: ${message}`);
        res.status(500).json({ error: message });
      }
    },
  },
  {
    path: '/api/cache/stats',
    type: 'GET',
    public: true,
    handler: async (_req, res, runtime: IAgentRuntime) => {
      try {
        const cacheService = runtime.getService<CacheService>(CacheService.serviceType);

        if (!cacheService) {
          return res.status(503).json({ error: 'CacheService not available' });
        }

        const stats = cacheService.getStats();
        res.json({ success: true, data: stats });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        logger.error(`[GET /api/cache/stats] Error: ${message}`);
        res.status(500).json({ error: message });
      }
    },
  },
];

/**
 * 🕵️‍♂️ 0xCypherpunkAI Security Main Plugin
 * This is the master plugin that orchestrates the entire security scanning platform.
 * It brings together the security analysis agents and the core scanning services.
 */
export const cypherpunkSecurityPlugin: Plugin = {
  name: 'cypherpunk-security-main',
  description: 'The main orchestrator for the 0xCypherpunkAI security scanning platform.',

  // This plugin depends on the security analysis plugin to provide the agent actions/providers
  dependencies: [securityAnalysisPlugin.name],

  // Register the core services for the platform
  services: [SecurityScanningService, CacheService],

  // All actions and providers are now consolidated in the security-analysis-plugin
  // to keep this main plugin clean and focused on orchestration.
  actions: [],
  providers: [],

  // This plugin has a higher priority to ensure its services are started first.
  priority: 100,

  // Add API routes for GitHub integration and scan results
  routes: allApiRoutes,

  async init(_config: Record<string, string>, _runtime): Promise<void> {
    if (hasInitialized) {
      return;
    }
    hasInitialized = true;
    logger.info('🚀 0xCypherpunkAI Platform Initializing...');
  },
};

export default cypherpunkSecurityPlugin;
