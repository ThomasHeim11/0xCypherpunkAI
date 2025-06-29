import { Service, IAgentRuntime, logger, Agent } from '@elizaos/core';
import axios from 'axios';
import { VulnerabilityFinding, AgentVote, ScanResult, ScanRequest } from './types.js';
import { VoteEngine } from './vote-engine.js';
// import { KnowledgeBaseService } from './knowledge-base-service.js';
import { performGeneralHeuristicAnalysis } from '../plugins/security-analysis-plugin.js';

/**
 * Core Security Scanning Service
 * Orchestrates the 11 security agents and manages the scanning pipeline
 */
export class SecurityScanningService extends Service {
  public static serviceType = 'SECURITY_SCANNING';

  private voteEngine!: VoteEngine;
  private activeScans = new Map<string, ScanResult>();
  private githubCache = new Map<
    string,
    { data: { path: string; content: string }[]; timestamp: number }
  >();
  private readonly GITHUB_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
  }

  /**
   * Static start method following ElizaOS service pattern
   */
  static async start(runtime: IAgentRuntime): Promise<Service> {
    const service = new SecurityScanningService(runtime);
    await service.initialize();
    return service;
  }

  /**
   * Static stop method
   */
  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService<SecurityScanningService>(
      SecurityScanningService.serviceType
    );
    if (service) {
      await service.stop();
    }
  }

  /**
   * Initialize the service
   */
  private async initialize(): Promise<void> {
    const agents = await this.runtime.getAgents();

    this.voteEngine = new VoteEngine({
      consensusThreshold: 0.6, // 60% consensus threshold
      // We will require votes from at least half the available agents
      minimumVotes: Math.floor(agents.length / 2) || 1,
      timeoutMinutes: 5, // 5 minute timeout for voting
      weightingEnabled: false,
    });

    setInterval(() => {
      this.processTimeouts();
    }, 30000); // Check every 30 seconds

    logger.info('🔐 Security Scanning Service started');
  }

  async stop(): Promise<void> {
    logger.info('🔐 Security Scanning Service stopped');
  }

  /**
   * Initiate a comprehensive security scan
   */
  async startScan(request: ScanRequest): Promise<string> {
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info(`🚀 Starting security scan ${scanId}`, {
      type: request.type,
      target: request.contractAddress || request.githubRepo,
    });

    const scanResult: ScanResult = {
      scanId,
      contractAddress: request.contractAddress,
      githubRepo: request.githubRepo,
      githubPath: request.githubPath,
      chain: request.chain,
      status: 'PENDING',
      progress: 0,
      findings: [],
      agentVotes: [],
      finalConfidenceScore: 0,
      totalVotes: 0,
      consensusReached: false,
      timestamp: new Date(),
    };

    this.activeScans.set(scanId, scanResult);

    // Start the scanning process asynchronously
    this.executeScan(scanId, request).catch((error) => {
      logger.error(`Scan ${scanId} failed:`, error);
      const scan = this.activeScans.get(scanId);
      if (scan) {
        scan.status = 'FAILED';
        scan.progress = 100;
      }
    });

    return scanId;
  }

  /**
   * Execute the multi-agent scanning process
   */
  private async executeScan(scanId: string, request: ScanRequest): Promise<void> {
    const scan = this.activeScans.get(scanId);
    if (!scan) return;

    try {
      // Update status and progress
      scan.status = 'SCANNING';
      scan.progress = 5;
      logger.info(`📝 Scan ${scanId}: Initializing scan process... (5%)`);

      // Step 1: Fetch contract files
      logger.info(`📁 Scan ${scanId}: Fetching contract files...`);
      const files = await this.fetchContractFiles(request);
      scan.progress = 15;
      logger.info(`✅ Scan ${scanId}: Fetched ${files.length} contract files. (15%)`);

      scan.progress = 30; // Skip RAG verification progress

      // Step 3: Get available agents
      const allAgents = await this.runtime.getAgents();
      logger.info(
        `[Pre-filter] Discovered ${allAgents.length} total agents available on the server.`
      );

      // HACKATHON FIX: Explicitly select the 3 most critical agents for speed and precision
      const targetAgentNames = [
        'Static Code Agent',
        'Access Control Agent',
        'Dangerous Functions Agent',
      ];

      const agents = allAgents.filter((agent) =>
        targetAgentNames.some((name) => agent.name?.includes(name))
      );

      if (agents.length !== 3) {
        logger.warn(
          `Expected to find 3 target agents, but found ${agents.length}. Proceeding with available agents.`
        );
      }

      const agentIds = agents.map((a) => a.id).filter((id) => !!id) as string[];
      logger.info(
        `🤖 Scan ${scanId}: Filtering down to ${agentIds.length} high-precision agents for analysis.`
      );

      scan.progress = 35;
      logger.info(`⚙️  Scan ${scanId}: Analysis setup complete. (35%)`);

      // Set concurrency limit
      const CONCURRENCY_LIMIT = 3;

      // Step 4: Multi-agent analysis with PARALLEL execution for speed
      logger.info(
        `🚀 Scan ${scanId}: Starting PARALLEL agent analysis (max ${CONCURRENCY_LIMIT} concurrent)...`
      );
      const analysisResults: { agentId: string; findings: VulnerabilityFinding[] }[] = [];

      // Process agents in batches of 3 for speed while managing memory
      const agentBatches: Partial<Agent>[][] = [];
      for (let i = 0; i < agents.length; i += CONCURRENCY_LIMIT) {
        agentBatches.push(agents.slice(i, i + CONCURRENCY_LIMIT));
      }

      let completedAgents = 0;
      for (const batch of agentBatches) {
        // Process each batch in parallel
        const batchPromises = batch.map(async (agent) => {
          const agentId = agent.id || `agent-unidentified`;
          const agentName = agent.name || 'Unknown Agent';
          try {
            logger.info(`🤖 Triggering ${agentName} (${agentId}) analysis for scan ${scanId}`);
            const findings = await this.triggerAgentAnalysis(scanId, agentId, agentName, files);
            return { agentId, findings };
          } catch (error) {
            logger.error(
              `Error during analysis for agent ${agentName} (${agentId}) on scan ${scanId}:`,
              error
            );
            return { agentId, findings: [] };
          }
        });

        // Wait for all agents in this batch to complete
        const batchResults = await Promise.all(batchPromises);
        analysisResults.push(...batchResults);

        completedAgents += batch.length;
        scan.progress = Math.min(35 + (completedAgents / agents.length) * 50, 85);

        logger.info(
          `✅ Scan ${scanId}: Batch completed - ${completedAgents}/${agents.length} agents done (${Math.round(scan.progress)}%)`
        );

        // Small pause between batches to prevent overwhelming the system
        if (completedAgents < agents.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second pause
        }
      }

      const allFindings = analysisResults.flatMap((r) => r.findings);

      logger.info(
        `🏁 Scan ${scanId}: All ${agents.length} agents completed analysis. Found ${allFindings.length} total findings (85%)`
      );
      scan.progress = 85;

      // Step 5: Agent voting and consensus with confidence scoring
      logger.info(`🗳️ Scan ${scanId}: Entering agent voting and consensus phase... (90%)`);
      const finalResults = await this.performAgentVoting(analysisResults, scanId);
      scan.progress = 95;
      logger.info(`👍 Scan ${scanId}: Voting complete. (95%)`);

      scan.findings = finalResults.confirmedFindings;
      scan.finalConfidenceScore = finalResults.averageConfidence;
      scan.totalVotes = finalResults.totalVotes;
      scan.status = 'COMPLETED';
      scan.progress = 100;
      scan.completedAt = new Date();
      scan.consensusReached = finalResults.confirmedFindings.length > 0;

      logger.info(
        `🎉 Scan ${scanId} completed. Found ${scan.findings.length} confirmed vulnerabilities. (100%)`
      );

      // Clean up vote engine state for this scan's findings
      scan.findings.forEach((f) => this.voteEngine.clearVotes(f.id));
    } catch (error) {
      logger.error(`❌ Scan execution failed for ${scanId}:`, error);
      scan.status = 'FAILED';
      scan.progress = 100;
    }
  }

  /**
   * Fetch contract files from GitHub or on-chain
   */
  private async fetchContractFiles(
    request: ScanRequest
  ): Promise<{ path: string; content: string }[]> {
    const { githubRepo, githubPath, contractAddress, chain, accessToken } = request;

    if (githubRepo) {
      return this.fetchFromGitHub(githubRepo, githubPath, accessToken);
    }
    if (contractAddress && chain) {
      // This path returns a single "file" for now
      const content = await this.fetchFromChain(contractAddress, chain);
      return [{ path: `${contractAddress}.sol`, content }];
    }

    throw new Error('Either GitHub repository or contract address/chain must be provided.');
  }

  private async fetchFromGitHub(
    repo: string,
    path = '',
    accessToken?: string
  ): Promise<{ path: string; content: string }[]> {
    const cacheKey = `github-repo:${repo}:${path || 'root'}`;
    const cachedItem = this.githubCache.get(cacheKey);

    if (cachedItem && Date.now() - cachedItem.timestamp < this.GITHUB_CACHE_TTL) {
      logger.info(`✅ [Cache HIT] Returning cached content for ${repo}/${path || 'root'}`);
      return cachedItem.data;
    }

    logger.info(`⬇️ [Cache MISS] Fetching fresh content for ${repo}/${path || 'root'}`);
    const files = await this.performGitHubFetch(repo, path, accessToken);

    this.githubCache.set(cacheKey, { data: files, timestamp: Date.now() });

    return files;
  }

  private async performGitHubFetch(
    repo: string,
    path = '',
    accessToken?: string
  ): Promise<{ path: string; content: string }[]> {
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
    const headers: any = {
      'User-Agent': '0xCypherpunkAI',
      Accept: 'application/vnd.github.v3+json',
    };
    if (accessToken) {
      headers.Authorization = `token ${accessToken}`;
    } else {
      logger.warn(`GitHub API request for ${repo} is unauthenticated. Rate limits may be lower.`);
    }

    try {
      const response = await axios.get(apiUrl, { headers });
      const data = response.data;

      if (Array.isArray(data)) {
        // It's a directory, so we fetch all contents recursively.
        const promises = data.map((item: any) => {
          if (item.type === 'dir') {
            // Recurse into subdirectory
            return this.performGitHubFetch(repo, item.path, accessToken);
          } else if (item.type === 'file' && item.name.endsWith('.sol') && item.download_url) {
            // Fetch .sol file content directly
            return this.fetchGitHubFileContent(item.download_url, headers).then((content) => ({
              path: item.path,
              content,
            }));
          }
          return Promise.resolve(null);
        });

        const results = await Promise.all(promises);
        // Flatten the array of arrays and filter out nulls
        return results.flat().filter((file) => file !== null) as {
          path: string;
          content: string;
        }[];
      } else if (data.type === 'file' && data.name.endsWith('.sol')) {
        // It's a single file
        const content = await this.fetchGitHubFileContent(data.download_url, headers);
        return [{ path: data.path, content }];
      }
      return [];
    } catch (error: any) {
      if (error.response) {
        logger.error(
          `GitHub API error for ${repo} at path ${path}: ${error.response.status} ${error.response.statusText}`,
          { data: error.response.data }
        );
      } else {
        logger.error(`Failed to fetch from GitHub repo ${repo} at path ${path}:`, error);
      }
      throw new Error(`Could not fetch from GitHub: ${error.message}`);
    }
  }

  private async fetchGitHubFileContent(url: string, headers: any): Promise<string> {
    const response = await axios.get(url, { headers });
    return response.data; // download_url provides raw content
  }

  private async fetchFromChain(address: string, chain: string): Promise<string> {
    // TODO: Implement on-chain source fetching via Chainlink Functions
    logger.info(`⛓️ Fetching contract source: ${address} on ${chain}`);

    // Placeholder implementation
    return `// Contract source for ${address} on ${chain}
// Source would be fetched via Chainlink Functions or block explorer APIs`;
  }

  /**
   * Trigger analysis by a specific security agent (optimized for speed)
   */
  private async triggerAgentAnalysis(
    scanId: string,
    agentId: string,
    agentName: string,
    files: { path: string; content: string }[]
  ): Promise<VulnerabilityFinding[]> {
    try {
      // Use the new general heuristic analysis for all agents
      const findings = await performGeneralHeuristicAnalysis(files, this.runtime);

      // Add a scan-specific ID to each finding to ensure uniqueness
      return findings.map((finding) => ({
        ...finding,
        // The finding ID is already unique from the analysis plugin, but we prepend the scanID
        // to guarantee it's unique across all scans.
        id: `${scanId}-${finding.id}`,
      }));
    } catch (error) {
      logger.error(
        `❌ Agent ${agentName} (${agentId}) analysis failed for scan ${scanId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  /**
   * Submit a vote from an agent for a specific finding
   */
  async submitAgentVote(scanId: string, vote: AgentVote): Promise<void> {
    const scan = this.activeScans.get(scanId);
    if (!scan) {
      throw new Error(`Scan not found: ${scanId}`);
    }

    scan.agentVotes.push(vote);
    this.voteEngine.submitVote(vote);

    // Let's check for consensus after each vote
    const finding = scan.findings.find((f) => f.id === vote.findingId);
    if (finding) {
      // However, for a more responsive UI, we could check and update progress.
      const findingVotes = this.voteEngine.getVotes(vote.findingId);
      const agents = await this.runtime.getAgents();
      if (findingVotes.length >= agents.length) {
        // All agents have voted on this finding
      }
    }
  }

  /**
   * Get the result of a specific scan
   */
  getScanResult(scanId: string): ScanResult | null {
    return this.activeScans.get(scanId) || null;
  }

  /**
   * Get all currently active scans
   */
  getActiveScans(): ScanResult[] {
    return Array.from(this.activeScans.values());
  }

  /**
   * Periodically check for timed out scans
   */
  private processTimeouts(): void {
    // This is handled by the VoteEngine's timeout callback now
  }

  /**
   * Perform agent voting and consensus on findings
   */
  private async performAgentVoting(
    analysisResults: { agentId: string; findings: VulnerabilityFinding[] }[],
    scanId: string
  ): Promise<{
    confirmedFindings: VulnerabilityFinding[];
    averageConfidence: number;
    totalVotes: number;
  }> {
    logger.info(`🗳️ Starting agent voting for scan ${scanId}...`);

    // Group similar findings by type and severity for voting
    const findingGroups = new Map<string, VulnerabilityFinding[]>();
    let totalFindings = 0;

    for (const result of analysisResults) {
      for (const finding of result.findings) {
        const groupKey = `${finding.type}-${finding.severity}`;
        if (!findingGroups.has(groupKey)) {
          findingGroups.set(groupKey, []);
        }
        findingGroups.get(groupKey)!.push(finding);
        totalFindings++;
      }
    }

    logger.info(
      `📊 Grouped ${totalFindings} findings into ${findingGroups.size} categories for voting`
    );

    const confirmedFindings: VulnerabilityFinding[] = [];
    let totalConfidence = 0;
    let confirmedCount = 0;

    // Voting threshold: 60% of agents must agree on a finding
    const consensusThreshold = 0.6;
    const totalAgents = analysisResults.length;
    const requiredVotes = Math.ceil(totalAgents * consensusThreshold);

    for (const [groupKey, findings] of findingGroups) {
      const voteCount = findings.length;
      const votePercentage = voteCount / totalAgents;

      if (voteCount >= requiredVotes) {
        // Finding has consensus - select the one with highest confidence
        const bestFinding = findings.reduce((best, current) =>
          current.confidence > best.confidence ? current : best
        );

        // Calculate group confidence based on consensus strength
        const consensusStrength = Math.min(votePercentage / consensusThreshold, 1.0);
        const finalConfidence = Math.round(bestFinding.confidence * consensusStrength);

        const confirmedFinding: VulnerabilityFinding = {
          ...bestFinding,
          confidence: finalConfidence,
          id: `${scanId}-confirmed-${confirmedCount}`,
        };

        confirmedFindings.push(confirmedFinding);
        totalConfidence += finalConfidence;
        confirmedCount++;

        logger.info(
          `✅ Confirmed finding: ${groupKey} (${voteCount}/${totalAgents} votes, ${finalConfidence}% confidence)`
        );
      } else {
        logger.debug(
          `❌ Rejected finding: ${groupKey} (${voteCount}/${totalAgents} votes, below ${requiredVotes} threshold)`
        );
      }
    }

    const averageConfidence = confirmedCount > 0 ? totalConfidence / confirmedCount / 100 : 0;

    logger.info(
      `🎯 Voting complete: ${confirmedFindings.length}/${findingGroups.size} findings confirmed with ${averageConfidence.toFixed(2)} average confidence`
    );

    // Sort the confirmed findings by severity and confidence
    const categoryOrder = (finding: VulnerabilityFinding): number => {
      switch (finding.severity) {
        case 'CRITICAL':
          return 0;
        case 'HIGH':
          return 1;
        case 'MEDIUM':
          return 2;
        case 'LOW':
          // Separate "gas" type findings to appear after other "LOW" severity findings
          return finding.type.includes('gas') ? 4 : 3;
        case 'INFO':
          return 5;
        default:
          return 6;
      }
    };

    const sortedFindings = confirmedFindings.sort((a, b) => {
      const orderA = categoryOrder(a);
      const orderB = categoryOrder(b);

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // If categories are the same, sort by confidence descending
      return b.confidence - a.confidence;
    });

    return {
      confirmedFindings: sortedFindings,
      averageConfidence,
      totalVotes: totalFindings,
    };
  }

  get capabilityDescription(): string {
    return 'Orchestrates a multi-agent security audit on smart contracts from GitHub or on-chain, managing the entire lifecycle from code fetching to final consensus-based vulnerability reporting.';
  }
}
