import { Service, IAgentRuntime, logger, asUUID } from '@elizaos/core';
import axios from 'axios';
import { VulnerabilityFinding, AgentVote, ScanResult, ScanRequest } from './types.js';
import { VoteEngine } from './vote-engine.js';
import { KnowledgeBaseService, AuditReport } from './knowledge-base-service.js';

/**
 * Core Security Scanning Service
 * Orchestrates the 11 security agents and manages the scanning pipeline
 */
export class SecurityScanningService extends Service {
  public static serviceType = 'SECURITY_SCANNING';

  private voteEngine!: VoteEngine;
  private activeScans = new Map<string, ScanResult>();

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
      // Update status
      scan.status = 'SCANNING';
      scan.progress = 10;

      // Step 1: Fetch contract code
      const contractCode = await this.fetchContractCode(request);
      scan.progress = 20;

      // Step 2: Trigger each specialized agent and collect initial findings
      // Dynamically get all registered agent IDs from the runtime
      const agents = await this.runtime.getAgents();
      const agentIds = agents.map((a) => a.id).filter((id) => !!id) as string[];
      logger.info(`Discovered ${agentIds.length} agents for scanning.`);

      const agentPromises = agentIds.map((agentId) =>
        this.triggerAgentAnalysis(scanId, agentId, contractCode)
      );
      const findingsArrays = await Promise.all(agentPromises);
      scan.findings = findingsArrays.flat();
      scan.progress = 70;

      // Step 3: Enter voting phase
      scan.status = 'VOTING';
      scan.progress = 80;

      // Each finding needs votes. The vote engine handles this internally.
      // We will simply wait for a timeout.
      this.voteEngine.startVoteTimeout(scanId, () => {
        this.finalizeScan(scanId);
      });
    } catch (error) {
      logger.error(`Scan execution failed for ${scanId}:`, error);
      scan.status = 'FAILED';
      scan.progress = 100;
    }
  }

  /**
   * Fetch contract code from GitHub or on-chain
   */
  private async fetchContractCode(request: ScanRequest): Promise<string> {
    if (request.type === 'GITHUB') {
      return this.fetchFromGitHub(request.githubRepo!, request.githubPath, request.accessToken);
    } else {
      return this.fetchFromChain(request.contractAddress!, request.chain!);
    }
  }

  private async fetchFromGitHub(repo: string, path = '', accessToken?: string): Promise<string> {
    logger.info(`📁 Fetching from GitHub: ${repo}${path ? '/' + path : ''}`);
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
    const headers = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${accessToken || this.runtime.getSetting('GITHUB_TOKEN')}`,
    };

    try {
      const response = await axios.get(apiUrl, { headers });
      const data = response.data;

      if (Array.isArray(data)) {
        // It's a directory, find all .sol files and concatenate them
        const solFiles = data.filter((item) => item.type === 'file' && item.name.endsWith('.sol'));
        if (solFiles.length === 0) {
          throw new Error('No Solidity (.sol) files found in the specified directory.');
        }

        let combinedCode = `// Fetched from ${repo} - ${solFiles.length} files combined\n\n`;
        for (const file of solFiles) {
          const fileContent = await this.fetchGitHubFileContent(file.url, headers);
          combinedCode += `// --- File: ${file.path} ---\n\n${fileContent}\n\n`;
        }
        return combinedCode;
      } else if (data.type === 'file') {
        // It's a single file
        if (!data.name.endsWith('.sol')) {
          throw new Error('The specified file is not a Solidity (.sol) file.');
        }
        return this.decodeBase64(data.content);
      } else {
        throw new Error(`Unsupported content type: ${data.type}`);
      }
    } catch (error) {
      logger.error('Error fetching from GitHub:', error);
      throw new Error(`Failed to fetch code from GitHub repository ${repo}.`);
    }
  }

  private async fetchGitHubFileContent(url: string, headers: any): Promise<string> {
    const response = await axios.get(url, { headers });
    return this.decodeBase64(response.data.content);
  }

  private decodeBase64(content: string): string {
    return Buffer.from(content, 'base64').toString('utf-8');
  }

  private async fetchFromChain(address: string, chain: string): Promise<string> {
    // TODO: Implement on-chain source fetching via Chainlink Functions
    logger.info(`⛓️ Fetching contract source: ${address} on ${chain}`);

    // Placeholder implementation
    return `// Contract source for ${address} on ${chain}
// Source would be fetched via Chainlink Functions or block explorer APIs`;
  }

  /**
   * Trigger analysis by a specific agent and get initial findings
   */
  private async triggerAgentAnalysis(
    scanId: string,
    agentId: string,
    contractCode: string
  ): Promise<VulnerabilityFinding[]> {
    try {
      logger.info(`🤖 Triggering ${agentId} analysis for scan ${scanId}`);

      const knowledgeService = this.runtime.getService<KnowledgeBaseService>(
        KnowledgeBaseService.serviceType
      );
      if (!knowledgeService) {
        logger.warn(`KnowledgeBaseService not available for agent ${agentId}. Skipping RAG.`);
        return [];
      }

      // 1. Use RAG to get relevant knowledge
      const relevantKnowledge: AuditReport[] = await knowledgeService.search(
        contractCode,
        agentId,
        5
      );

      const ragContext = relevantKnowledge
        .map((r: AuditReport) => `[Reference: ${r.source} - ${r.metadata.title}]\n${r.content}`)
        .join('\n\n---\n\n');

      // 2. Construct a specialized prompt for the agent
      const agentPersona = this.getAgentPersona(agentId);
      const prompt = `
        You are an AI-powered smart contract security auditor named ${agentId}.
        ${agentPersona}

        Your task is to analyze the following Solidity contract for vulnerabilities based on your specialization.
        Use the provided reference information from past audit reports to inform your analysis.

        **Reference Information:**
        ---
        ${ragContext}
        ---

        **Contract Code to Analyze:**
        \`\`\`solidity
        ${contractCode}
        \`\`\`

        Based on your analysis, identify potential vulnerabilities. For each vulnerability found, provide:
        - A "title" for the vulnerability (e.g., "Reentrancy in withdraw function").
        - A detailed "description" of the issue and its potential impact.
        - A "recommendation" on how to fix the vulnerability.
        - A "location" object with "file" (use "contract.sol") and "line" number.
        - A "severity" (one of: "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO").
        - A "confidence" score from 0.0 to 1.0 representing how certain you are of this finding.

        Format your response as a JSON array of objects, where each object represents a vulnerability finding.
        Example:
        [
          {
            "title": "Reentrancy in withdraw()",
            "description": "The withdraw function does not follow the checks-effects-interactions pattern, allowing for potential reentrancy attacks.",
            "recommendation": "Use the checks-effects-interactions pattern by moving the state update before the external call.",
            "location": { "file": "contract.sol", "line": 42 },
            "severity": "HIGH",
            "confidence": 0.95
          }
        ]
        If no vulnerabilities are found, return an empty array [].
      `;

      // 3. Call the LLM via the runtime
      const llmResponse = await this.runtime.useModel('TEXT_LARGE', { prompt });

      // 4. Parse the response
      let findings: any[] = [];
      if (typeof llmResponse === 'string') {
        try {
          // Find the JSON block in the response
          const jsonMatch = llmResponse.match(/\[.*\]/s);
          if (jsonMatch) {
            findings = JSON.parse(jsonMatch[0]);
          } else {
            logger.warn(`No valid JSON array found in LLM response for ${agentId}.`, {
              response: llmResponse,
            });
            return [];
          }
        } catch (e) {
          logger.error(`Failed to parse LLM response for ${agentId}`, {
            error: e,
            response: llmResponse,
          });
          return []; // Return empty if parsing fails
        }
      }

      // 5. Format into VulnerabilityFinding objects
      return findings.map(
        (f: any, index: number): VulnerabilityFinding => ({
          id: `${scanId}-${agentId}-${index}`,
          type: agentId.replace('-agent', ''),
          title: f.title,
          description: f.description,
          recommendation: f.recommendation,
          location: f.location || { file: 'contract.sol' },
          severity: (f.severity?.toUpperCase() as VulnerabilityFinding['severity']) || 'INFO',
          confidence: (f.confidence || 0) * 100,
        })
      );
    } catch (error) {
      logger.error(`Error during analysis for agent ${agentId} on scan ${scanId}:`, error);
      return []; // Return empty array on error to not fail the whole scan
    }
  }

  private getAgentPersona(agentId: string): string {
    const personas: Record<string, string> = {
      'reentrancy-agent':
        'Your specialization is detecting reentrancy vulnerabilities, including issues related to the checks-effects-interactions pattern and unsafe external calls.',
      'access-control-agent':
        'You specialize in access control, identifying issues like improper authorization, privilege escalation, and insecure function modifiers (e.g., ownable, onlyAdmin).',
      'arithmetic-agent':
        'Your expertise is in mathematical vulnerabilities, such as integer overflow/underflow and precision loss.',
      'flashloan-agent':
        'You are an expert in DeFi exploits, focusing on vulnerabilities related to flash loans, oracle manipulation, and economic attacks.',
      'governance-agent':
        'You specialize in governance and DAO vulnerabilities, including voting manipulation, centralization risks, and proposal execution flaws.',
      'security-orchestrator':
        'You are a general security auditor, looking for a broad range of common vulnerabilities and best practice violations.',
    };
    return personas[agentId] || 'You are a general smart contract security auditor.';
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
   * Finalize the scan after the voting period ends
   */
  private async finalizeScan(scanId: string): Promise<void> {
    const scan = this.activeScans.get(scanId);
    if (!scan || scan.status !== 'VOTING') return;

    logger.info(`Finalizing scan ${scanId}...`);

    let totalConfidence = 0;
    let confirmedFindings = 0;

    for (const finding of scan.findings) {
      const result = this.voteEngine.getFinalResult(finding.id);
      if (result.finalDecision === 'CONFIRMED') {
        finding.confidence = result.confidenceScore;
        totalConfidence += result.confidenceScore;
        confirmedFindings++;
      }
    }

    // Filter out rejected findings
    scan.findings = scan.findings.filter(
      (f) => this.voteEngine.getFinalResult(f.id).finalDecision === 'CONFIRMED'
    );

    scan.finalConfidenceScore = confirmedFindings > 0 ? totalConfidence / confirmedFindings : 0;
    scan.totalVotes = scan.agentVotes.length;
    scan.status = 'COMPLETED';
    scan.progress = 100;
    scan.completedAt = new Date();
    scan.consensusReached = scan.findings.length > 0;

    logger.info(
      `✅ Scan ${scanId} completed. Found ${scan.findings.length} confirmed vulnerabilities.`
    );

    // Clean up vote engine state for this scan's findings
    scan.findings.forEach((f) => this.voteEngine.clearVotes(f.id));
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

  get capabilityDescription(): string {
    return 'Orchestrates a multi-agent security audit on smart contracts from GitHub or on-chain, managing the entire lifecycle from code fetching to final consensus-based vulnerability reporting.';
  }
}
