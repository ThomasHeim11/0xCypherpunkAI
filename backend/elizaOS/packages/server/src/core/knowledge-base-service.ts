import { Service, IAgentRuntime, logger, ModelType } from '@elizaos/core';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';

export interface AuditReport {
  id: string;
  source: string;
  filePath: string;
  content: string;
  embedding?: number[];
  metadata: {
    title?: string;
    contract?: string;
    platform?: string;
    date?: string;
    tags?: string[];
  };
}

/**
 * 🧠 Knowledge Base Service for RAG
 * Loads, processes, and provides semantic search over 44,000+ audit reports.
 */
export class KnowledgeBaseService extends Service {
  public static serviceType = 'KNOWLEDGE_BASE';

  private reports = new Map<string, AuditReport>();
  private isInitialized = false;

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
  }

  /**
   * Static start method following ElizaOS service pattern
   */
  static async start(runtime: IAgentRuntime): Promise<Service> {
    const service = new KnowledgeBaseService(runtime);
    // Defer initialization until the first scan to avoid blocking server startup
    logger.info('🧠 Knowledge Base Service started. Initialization is deferred until first use.');
    return service;
  }

  /**
   * Static stop method
   */
  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService<KnowledgeBaseService>(KnowledgeBaseService.serviceType);
    if (service) {
      await service.stop();
    }
  }

  async stop(): Promise<void> {
    logger.info('🧠 Knowledge Base Service stopped');
    this.reports.clear();
  }

  private async initialize(): Promise<void> {
    try {
      logger.info('Initializing RAG knowledge base...');
      await this.loadReportsFromDataDirectory();
      await this.buildEmbeddingsForNewReports();
      this.isInitialized = true;
      logger.info(`✅ RAG Knowledge Base initialized with ${this.reports.size} reports.`);
    } catch (error) {
      logger.error('Failed to initialize Knowledge Base Service:', error);
    }
  }

  /**
   * Load all audit reports from the comprehensive Solodit data
   */
  private async loadReportsFromDataDirectory(): Promise<void> {
    // Load the comprehensive Solodit reports (46,449 reports)
    const allReportsPath = path.join(
      process.cwd(),
      'scripts/data/solodit_comprehensive/all_reports.json'
    );
    const summaryPath = path.join(
      process.cwd(),
      'scripts/data/solodit_comprehensive/comprehensive_summary.json'
    );

    try {
      // Load the summary first to get stats
      const summaryContent = await fs.readFile(summaryPath, 'utf-8');
      const summary = JSON.parse(summaryContent);
      logger.info(`📊 Loading ${summary.totalReports} comprehensive Solodit audit reports...`);

      // Load all reports
      const reportsContent = await fs.readFile(allReportsPath, 'utf-8');
      const allReports = JSON.parse(reportsContent);

      let loadedCount = 0;
      for (const reportData of allReports) {
        if (!reportData || !reportData.content) continue;

        const reportId = reportData.id || `report_${loadedCount}`;
        const report: AuditReport = {
          id: reportId,
          source: 'solodit_comprehensive',
          filePath: allReportsPath,
          content: reportData.content,
          metadata: {
            title: reportData.title || 'Untitled Audit Report',
            contract: reportData.protocol,
            platform: reportData.platform || 'Unknown',
            date: reportData.timestamp,
            tags: reportData.vulnerabilityTypes || [],
          },
        };

        this.reports.set(reportId, report);
        loadedCount++;
      }

      logger.info(`✅ Loaded ${loadedCount} comprehensive audit reports for RAG analysis`);
      logger.info(
        `📈 Impact breakdown: ${summary.impactBreakdown.critical} critical, ${summary.impactBreakdown.high} high, ${summary.impactBreakdown.medium} medium, ${summary.impactBreakdown.low} low`
      );
    } catch (error) {
      logger.error('Failed to load comprehensive Solodit reports:', error);

      // Fallback to legacy data directory scanning
      const dataPath = path.join(process.cwd(), 'data');
      logger.info(`Falling back to scanning: ${dataPath}`);

      try {
        const reportFiles = await glob(`${dataPath}/**/*.{md,json,txt}`);
        logger.info(`Found ${reportFiles.length} potential report files.`);

        for (const filePath of reportFiles) {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const reportId = path.basename(filePath, path.extname(filePath));

            if (this.reports.has(reportId)) continue;

            const report: AuditReport = {
              id: reportId,
              source: 'legacy_data',
              filePath,
              content,
              metadata: this.extractMetadata(content),
            };
            this.reports.set(reportId, report);
          } catch (fileError) {
            logger.warn(`Failed to load report: ${filePath}`, fileError);
          }
        }
      } catch (fallbackError) {
        logger.error('Failed to scan legacy data directory:', fallbackError);
      }
    }
  }

  /**
   * Build vector embeddings for reports that don't have them
   */
  private async buildEmbeddingsForNewReports(): Promise<void> {
    logger.info('Building vector embeddings for new reports...');
    let newEmbeddingsCount = 0;

    for (const report of this.reports.values()) {
      if (!report.embedding) {
        try {
          // In a real system, we'd check if the embedding exists in the DB first
          const embedding = await this.runtime.useModel(ModelType.TEXT_EMBEDDING, {
            text: `${report.metadata.title || report.id}\n${report.content.substring(0, 4000)}`,
          });
          report.embedding = embedding as number[];

          // TODO: Persist the report and embedding to the database
          // await this.runtime.db.save('audit_reports', report);

          newEmbeddingsCount++;
        } catch (error) {
          logger.error(`Failed to create embedding for report: ${report.id}`, error);
        }
      }
    }

    if (newEmbeddingsCount > 0) {
      logger.info(`Generated embeddings for ${newEmbeddingsCount} new reports.`);
    } else {
      logger.info('All reports are already vectorized.');
    }
  }

  /**
   * Search for relevant audit reports using semantic search
   */
  async search(query: string, _specialization?: string, topK = 5): Promise<AuditReport[]> {
    if (!this.isInitialized) {
      // Lazy initialization on first use
      await this.initialize();
    }

    try {
      const queryEmbedding = await this.runtime.useModel(ModelType.TEXT_EMBEDDING, {
        text: query,
      });

      const scoredReports = Array.from(this.reports.values())
        .filter((report) => report.embedding) // Only search reports with embeddings
        .map((report) => ({
          report,
          score: this.cosineSimilarity(queryEmbedding as number[], report.embedding!),
        }))
        .filter((item) => item.score > 0.7); // Filter by a relevance threshold

      // TODO: Add specialization-based filtering using metadata tags

      scoredReports.sort((a, b) => b.score - a.score);

      return scoredReports.slice(0, topK).map((item) => item.report);
    } catch (error) {
      logger.error('RAG search failed:', error);
      return [];
    }
  }

  /**
   * Extract metadata from report content (simple implementation)
   */
  private extractMetadata(content: string): AuditReport['metadata'] {
    const titleMatch = content.match(/#\s*(.*)/);
    const tagsMatch = content.match(/Tags:\s*(.*)/);
    return {
      title: titleMatch ? titleMatch[1].trim() : 'Untitled Report',
      tags: tagsMatch ? tagsMatch[1].split(',').map((t) => t.trim()) : [],
    };
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  get capabilityDescription(): string {
    return 'Manages and provides semantic search over a knowledge base of 44,000+ smart contract audit reports for Retrieval-Augmented Generation (RAG).';
  }
}

export default KnowledgeBaseService;
 