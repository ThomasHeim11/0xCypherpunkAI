import { Plugin } from '@elizaos/core';
import { SecurityScanningService } from '../core/security-scanning-service.js';
import { KnowledgeBaseService } from '../core/knowledge-base-service.js';
import { SoloditRAGService } from '../services/solodit-rag-service.js';
import { securityAnalysisPlugin } from './security-analysis-plugin.js';
import { githubAuthRoutes } from '../api/github-auth-api.js';
import { githubApiRoutes } from '../api/github-scan-api.js';

/**
 * 🔐 0xCypherpunkAI Security Plugin
 *
 * Master security plugin that orchestrates the complete cyberpunk-themed
 * multi-agent smart contract security auditing system.
 */
export const cypherpunkSecurityPlugin: Plugin = {
  name: '0xCypherpunkAI',
  description:
    'Elite multi-agent smart contract security auditing platform with RAG-powered analysis',

  // Inherit all actions and providers from the security analysis plugin
  actions: securityAnalysisPlugin.actions,
  providers: securityAnalysisPlugin.providers,
  evaluators: securityAnalysisPlugin.evaluators,

  // Register all security services
  services: [SecurityScanningService, KnowledgeBaseService, SoloditRAGService],

  // Add API routes for GitHub integration and scan results
  routes: [
    ...githubAuthRoutes,
    ...githubApiRoutes,
    {
      path: '/api/results/:scanId',
      type: 'GET',
      public: true,
      handler: async (req, res, runtime) => {
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

          res.json(result);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'An unknown error occurred.';
          res.status(500).json({ error: message });
        }
      },
    },
  ],

  async init(_config: Record<string, string>, _runtime): Promise<void> {
    console.log('🌆 Initializing 0xCypherpunkAI Security Platform...');
    console.log('');

    console.log('🎭 SPECIALIZED AGENT SWARM:');
    console.log('  1. ⚡ Static Code Agent - Reentrancy, overflow/underflow, unchecked calls');
    console.log('  2. 🛡️  DeFi Risk Agent - Flash loans, oracle manipulation, liquidity risks');
    console.log('  3. 🔐 Access Control Agent - Privilege escalation, missing modifiers');
    console.log('  4. ⚡ Gas Efficiency Agent - Expensive operations, optimization opportunities');
    console.log('  5. 🎯 Attack Surface Agent - External calls, fallback function misuse');
    console.log('  6. 🔄 Upgradeability Agent - Proxy patterns, storage slot corruption');
    console.log('  7. 🔮 Oracle Manipulation Agent - Price feed spoofing, timestamp misuse');
    console.log('  8. 💰 MEV Agent - Front-running, sandwich attacks, MEV extraction');
    console.log('  9. 🪙  Tokenomics Agent - Unlimited minting, approval race conditions');
    console.log('  10. 📦 Dependency Risk Agent - Vulnerable libraries, outdated versions');
    console.log('  11. ⚠️  Dangerous Functions Agent - delegatecall, tx.origin, selfdestruct');
    console.log('');

    console.log('🧠 KNOWLEDGE SYSTEMS:');
    console.log('  • RAG Knowledge Base: 44,000+ audit reports');
    console.log('  • Solodit Intelligence: Specialized vulnerability patterns');
    console.log('  • Real-time GitHub Scanning: Repository security analysis');
    console.log('  • Multi-agent Consensus: 60% voting threshold');
    console.log('');

    console.log('🔌 CORE SERVICES:');
    console.log('  • SecurityScanningService: Multi-agent coordination & consensus');
    console.log('  • KnowledgeBaseService: RAG over comprehensive audit database');
    console.log('  • SoloditRAGService: Specialized vulnerability intelligence');
    console.log('');

    console.log('🌐 API ENDPOINTS:');
    console.log('  • /api/auth/github - GitHub OAuth authentication');
    console.log('  • /api/auth/github/callback - OAuth callback handler');
    console.log('  • /api/github/repos - List user repositories');
    console.log('  • /api/github/repo-contents - Browse repository contents');
    console.log('  • /api/scan/github - Initiate GitHub repository scan');
    console.log('  • /api/results/:scanId - Fetch scan results');
    console.log('');

    console.log('⚙️  SECURITY CONFIGURATION:');
    console.log('  • Consensus Threshold: 60%');
    console.log('  • Critical Threshold: 80%');
    console.log('  • Agent Specializations: 11 security domains');
    console.log('  • RAG Embeddings: Semantic vulnerability search');
    console.log('  • Audit Logging: Comprehensive security tracking');
    console.log('');

    console.log('🚀 0xCypherpunkAI Platform Ready!');
    console.log('💡 Use elizaos start to deploy the security agent swarm');
    console.log('');
  },
};

export default cypherpunkSecurityPlugin;
