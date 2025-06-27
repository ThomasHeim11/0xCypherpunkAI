import { Service, IAgentRuntime, logger } from '@elizaos/core';
import fs from 'fs/promises';
import path from 'path';

export interface SoloditRAGContext {
  totalReports: number;
  protocolsCovered: string[];
  vulnerabilityTypes: string[];
  lastUpdate: Date;
  ragIndexed: boolean;
}

/**
 * 🧠 Solodit RAG Service for specialized vulnerability intelligence
 * Provides advanced search and analysis over Solodit's comprehensive security database
 */
export class SoloditRAGService extends Service {
  public static serviceType = 'SOLODIT_RAG';

  private context: SoloditRAGContext | null = null;
  private knowledgeBase: Map<string, any> = new Map();
  private isInitialized = false;

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
  }

  /**
   * Static start method following ElizaOS service pattern
   */
  static async start(runtime: IAgentRuntime): Promise<Service> {
    const service = new SoloditRAGService(runtime);
    await service.initializeRAGData();
    return service;
  }

  /**
   * Static stop method
   */
  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService<SoloditRAGService>(SoloditRAGService.serviceType);
    if (service) {
      await service.stop();
    }
  }

  async stop(): Promise<void> {
    logger.info('🧠 Solodit RAG Service stopped');
    this.knowledgeBase.clear();
  }

  async initializeRAGData(): Promise<void> {
    if (this.isInitialized) return;

    try {
      logger.info('🧠 Initializing Solodit RAG data for AI agents...');

      // Load existing scraped data if available
      await this.loadExistingData();

      // If no data or data is old, perform scraping
      if (!this.context || this.needsUpdate()) {
        logger.warn('📊 Fresh data needed - run comprehensive scraper first');
        logger.info('💡 Run: bun run scrape-solodit-comprehensive');
      }

      // Index data for RAG
      await this.indexDataForRAG();

      this.isInitialized = true;
      logger.info('✅ Solodit RAG data ready for AI agents');
    } catch (error) {
      logger.error('❌ Failed to initialize Solodit RAG data:', error);
      // Don't throw - allow service to continue with reduced functionality
    }
  }

  private async loadExistingData(): Promise<void> {
    try {
      const summaryPath = path.join(
        process.cwd(),
        'data/solodit_comprehensive/comprehensive_summary.json'
      );
      const summaryData = await fs.readFile(summaryPath, 'utf-8');
      const summary = JSON.parse(summaryData);

      this.context = {
        totalReports: summary.totalReports,
        protocolsCovered: summary.protocols,
        vulnerabilityTypes: summary.vulnerabilityTypes,
        lastUpdate: new Date(summary.timestamp),
        ragIndexed: false,
      };

      logger.info(`📊 Loaded existing data: ${this.context.totalReports} reports`);
    } catch (error) {
      logger.debug('📁 No existing Solodit data found');
      this.context = null;
    }
  }

  private needsUpdate(): boolean {
    if (!this.context) return true;

    // Update if data is older than 24 hours
    const dayInMs = 24 * 60 * 60 * 1000;
    const timeSinceUpdate = Date.now() - this.context.lastUpdate.getTime();

    return timeSinceUpdate > dayInMs;
  }

  private async indexDataForRAG(): Promise<void> {
    logger.info('🔍 Indexing Solodit data for RAG queries...');

    try {
      const dataDir = path.join(process.cwd(), 'data/solodit_comprehensive');

      // Load the vulnerability knowledge base
      const vulnKnowledgePath = path.join(dataDir, 'vulnerability_knowledge_base.txt');
      const vulnKnowledge = await fs.readFile(vulnKnowledgePath, 'utf-8');

      // Load protocol knowledge base
      const protocolKnowledgePath = path.join(dataDir, 'protocol_knowledge_base.txt');
      const protocolKnowledge = await fs.readFile(protocolKnowledgePath, 'utf-8');

      // Load all reports for detailed querying
      const allReportsPath = path.join(dataDir, 'all_reports.json');
      const allReportsData = await fs.readFile(allReportsPath, 'utf-8');
      const allReports = JSON.parse(allReportsData);

      // Index by vulnerability types
      this.knowledgeBase.set('vulnerability_knowledge', vulnKnowledge);
      this.knowledgeBase.set('protocol_knowledge', protocolKnowledge);
      this.knowledgeBase.set('all_reports', allReports);

      // Create specialized indices
      await this.createSpecializedIndices(allReports);

      if (this.context) {
        this.context.ragIndexed = true;
      }

      logger.info('✅ RAG indexing complete');
    } catch (error) {
      logger.error('❌ Failed to index RAG data:', error);
    }
  }

  private async createSpecializedIndices(reports: any[]): Promise<void> {
    // Index by vulnerability type
    const vulnIndex = new Map<string, any[]>();
    const protocolIndex = new Map<string, any[]>();
    const severityIndex = new Map<string, any[]>();

    for (const report of reports) {
      // Vulnerability type indexing
      if (report.vulnerabilities && Array.isArray(report.vulnerabilities)) {
        for (const vuln of report.vulnerabilities) {
          if (!vulnIndex.has(vuln)) {
            vulnIndex.set(vuln, []);
          }
          vulnIndex.get(vuln)!.push(report);
        }
      }

      // Protocol indexing
      if (report.protocol) {
        if (!protocolIndex.has(report.protocol)) {
          protocolIndex.set(report.protocol, []);
        }
        protocolIndex.get(report.protocol)!.push(report);
      }

      // Severity indexing
      if (report.severity) {
        if (!severityIndex.has(report.severity)) {
          severityIndex.set(report.severity, []);
        }
        severityIndex.get(report.severity)!.push(report);
      }
    }

    this.knowledgeBase.set('vuln_index', vulnIndex);
    this.knowledgeBase.set('protocol_index', protocolIndex);
    this.knowledgeBase.set('severity_index', severityIndex);
  }

  // RAG Query Methods for AI Agents

  async queryVulnerabilityType(vulnType: string): Promise<string> {
    const vulnIndex = this.knowledgeBase.get('vuln_index') as Map<string, any[]>;

    if (!vulnIndex || !vulnIndex.has(vulnType)) {
      return `No specific data found for vulnerability type: ${vulnType}`;
    }

    const reports = vulnIndex.get(vulnType)!;
    const topReports = reports.slice(0, 5); // Get top 5 reports

    let response = `Found ${reports.length} reports for ${vulnType} vulnerabilities:\n\n`;

    for (const report of topReports) {
      response += `**${report.title || 'Untitled'}**\n`;
      response += `Protocol: ${report.protocol || 'Unknown'}\n`;
      response += `Severity: ${report.severity || 'Unknown'}\n`;
      response += `Content: ${(report.content || '').substring(0, 200)}...\n`;
      if (report.url) response += `URL: ${report.url}\n`;
      response += '\n';
    }

    return response;
  }

  async queryProtocol(protocol: string): Promise<string> {
    const protocolIndex = this.knowledgeBase.get('protocol_index') as Map<string, any[]>;

    if (!protocolIndex) {
      return 'Protocol index not available';
    }

    // Fuzzy search for protocol
    const protocolKey = Array.from(protocolIndex.keys()).find((key) =>
      key.toLowerCase().includes(protocol.toLowerCase())
    );

    if (!protocolKey) {
      return `No data found for protocol: ${protocol}`;
    }

    const reports = protocolIndex.get(protocolKey)!;
    const vulnTypes = [...new Set(reports.flatMap((r) => r.vulnerabilities || []))];
    const severityBreakdown = reports.reduce(
      (acc, r) => {
        const severity = r.severity || 'Unknown';
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    let response = `**${protocolKey} Security Analysis**\n\n`;
    response += `Total Reports: ${reports.length}\n`;
    response += `Common Vulnerabilities: ${vulnTypes.join(', ')}\n`;
    response += `Severity Distribution: ${JSON.stringify(severityBreakdown)}\n\n`;

    // Add top 3 recent reports
    const recentReports = reports
      .filter((r) => r.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    response += '**Recent Reports:**\n';
    for (const report of recentReports) {
      response += `• ${report.title || 'Untitled'} (${report.severity || 'Unknown'})\n`;
      response += `  ${(report.content || '').substring(0, 150)}...\n\n`;
    }

    return response;
  }

  async searchReports(query: string): Promise<string> {
    const allReports = this.knowledgeBase.get('all_reports') as any[];

    if (!allReports) {
      return 'No reports available for search';
    }

    // Simple text search implementation
    const matchingReports = allReports.filter((report) => {
      const searchText =
        `${report.title || ''} ${report.content || ''} ${report.protocol || ''}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });

    if (matchingReports.length === 0) {
      return `No reports found matching: ${query}`;
    }

    const topMatches = matchingReports.slice(0, 5);
    let response = `Found ${matchingReports.length} reports matching "${query}":\n\n`;

    for (const report of topMatches) {
      response += `**${report.title || 'Untitled'}**\n`;
      response += `Protocol: ${report.protocol || 'Unknown'}\n`;
      response += `Severity: ${report.severity || 'Unknown'}\n`;
      response += `Content: ${(report.content || '').substring(0, 200)}...\n\n`;
    }

    return response;
  }

  getContext(): SoloditRAGContext | null {
    return this.context;
  }

  get capabilityDescription(): string {
    return "Provides specialized search and analysis over Solodit's comprehensive security database with advanced vulnerability intelligence.";
  }
}

export default SoloditRAGService;
 