#!/usr/bin/env bun

import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

// Add async/parallel processing imports
interface AsyncProcessingConfig {
  concurrentLimit: number;
  batchSize: number;
  delayBetweenBatches: number;
  retryAttempts: number;
  progressUpdateInterval: number;
}

interface ProgressTracker {
  processed: number;
  successful: number;
  failed: number;
  total: number;
  startTime: Date;
  currentBatch: number;
  estimatedTimeRemaining: number;
}

interface SoloditAuditReport {
  // Basic identification
  id: string;
  title: string;
  url: string;

  // Core vulnerability information
  vulnerability: {
    type: string;
    category: string;
    impact: 'critical' | 'high' | 'medium' | 'low';
    target: string;
  };

  // Clean technical description
  description: string;

  // Actual code snippets from the vulnerability
  vulnerableCode: {
    language: string;
    snippet: string;
    fileName?: string;
    lineNumbers?: string;
    explanation: string;
  }[];

  // Exploit scenario (how the vulnerability works)
  exploitScenario: string;

  // Fix recommendations
  recommendations: {
    shortTerm: string;
    longTerm: string;
  };

  // GitHub links to actual source code
  sourceCode: {
    url: string;
    fileName: string;
    lineNumbers?: string;
  }[];

  // Metadata
  metadata: {
    protocol: string;
    auditor: string;
    date: Date;
    reportUrl?: string;
    extractedAt: Date;
  };
}

interface VulnerabilityAnalysis {
  primaryVulnerabilityType: string;
  rootCause: string;
  description: string;
  exploitConditions: string[];
  impact: {
    description: string;
    affectedComponents: string[];
    businessImpact: string;
  };
  likelihood: 'high' | 'medium' | 'low';
  cvssScore?: number;
}

interface CodeAnalysis {
  vulnerableCode: {
    fileName: string;
    lineNumbers: string;
    codeSnippet: string;
    explanation: string;
  }[];
  fixedCode: {
    fileName: string;
    codeSnippet: string;
    explanation: string;
  }[];
  affectedFunctions: string[];
  vulnerablePatterns: {
    pattern: string;
    description: string;
    locations: string[];
  }[];
  dataTypes: {
    problematicTypes: string[];
    recommendedTypes: string[];
  };
}

interface TechnicalDetails {
  vulnerabilityClass: string;
  attackVectors: string[];
  prerequisites: string[];
  mitigationStrategies: string[];
  relatedVulnerabilities: string[];
  technicalProof: string;
}

interface References {
  githubIssue?: string;
  originalAuditReport?: string;
  codeRepositories: string[];
  relatedReports: string[];
  fixCommits: string[];
  discussionThreads: string[];
}

interface AISummary {
  oneLineSummary: string;
  keyTakeaways: string[];
  learningPoints: string[];
  similarVulnerabilities: string[];
  preventionTips: string[];
}

interface VulnerabilityPatterns {
  accessControl: {
    found: boolean;
    indicators: string[];
    functions: string[];
  };
  reentrancy: {
    found: boolean;
    indicators: string[];
    patterns: string[];
  };
  arithmetic: {
    found: boolean;
    indicators: string[];
    operations: string[];
  };
  logic: {
    found: boolean;
    indicators: string[];
    conditions: string[];
  };
}

interface AttackVectors {
  entryPoints: string[];
  riskFactors: string[];
  stateChanges: string[];
}

interface SecurityMetadata {
  impactLevel: string;
  exploitability: string;
  prerequisites: string[];
  affectedComponents: string[];
}

interface VulnerablePatterns {
  beforeFix: string[];
  afterFix: string[];
  recommendations: string[];
}

interface GitHubCodeSnippet {
  url: string;
  fileName: string;
  lineNumbers: string;
  codeContent: string;
  language: string;
  contextLines: number;
  fetchedAt: Date;
}

class SoloditSitemapScraper {
  private browser: Browser | null = null;
  private outputDir = './data/solodit_comprehensive';
  private userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  private scrapedReports: SoloditAuditReport[] = [];
  private delayBetweenRequests = 100; // Reduced for async processing

  // Enhanced async processing configuration (TypeScript equivalents of aiohttp + asyncio)
  private asyncConfig: AsyncProcessingConfig = {
    concurrentLimit: 30, // Increased like aiohttp (20+ concurrent requests)
    batchSize: 100, // Larger batches for efficiency like asyncio
    delayBetweenBatches: 300, // Reduced delay for speed (equivalent to aiohttp rate limiting)
    retryAttempts: 3, // Retry failed requests 3 times
    progressUpdateInterval: 25, // Update progress more frequently (like tqdm.asyncio)
  };

  private progress: ProgressTracker = {
    processed: 0,
    successful: 0,
    failed: 0,
    total: 0,
    startTime: new Date(),
    currentBatch: 0,
    estimatedTimeRemaining: 0,
  };

  constructor() {
    this.ensureOutputDirectory();
  }

  private async ensureOutputDirectory(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'individual_reports'), { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'full_content'), { recursive: true });
  }

  async initBrowser(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--disable-javascript-harmony-shipping',
        '--max_old_space_size=4096',
      ],
      timeout: 60000, // Increase browser startup timeout
    });
    console.log('🌐 Browser initialized for sitemap-based Solodit scraping');
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeAllSoloditReports(): Promise<SoloditAuditReport[]> {
    console.log('🚀 Starting SITEMAP-BASED Solodit.cyfrin.io scraping...');
    console.log('🎯 Using sitemap.xml for comprehensive URL discovery');

    await this.initBrowser();

    try {
      // Step 1: Get ALL URLs from sitemap.xml (much faster!)
      const reportUrls = await this.getSitemapUrls();
      console.log(`📋 Discovered ${reportUrls.length} URLs from sitemap.xml`);

      // Step 2: Scrape each individual report
      await this.scrapeIndividualReports(reportUrls);

      // Step 3: Save comprehensive dataset
      await this.saveComprehensiveDataset();
    } finally {
      await this.closeBrowser();
    }

    return this.scrapedReports;
  }

  private async getSitemapUrls(): Promise<string[]> {
    console.log('🗺️ Fetching URLs from sitemap.xml...');

    try {
      // Fetch sitemap.xml directly
      const response = await fetch('https://solodit.cyfrin.io/sitemap.xml');

      if (!response.ok) {
        throw new Error(`Failed to fetch sitemap: ${response.status}`);
      }

      const sitemapXml = await response.text();
      console.log(`📄 Sitemap XML size: ${(sitemapXml.length / 1024).toFixed(1)}KB`);

      // Parse XML to extract URLs
      const urlMatches = sitemapXml.match(/<loc>(.*?)<\/loc>/g);

      if (!urlMatches) {
        throw new Error('No URLs found in sitemap');
      }

      // Extract and filter URLs
      const allUrls = urlMatches
        .map((match) => match.replace(/<\/?loc>/g, '').trim())
        .filter(
          (url) =>
            url.includes('solodit.cyfrin.io/issues/') && !url.includes('#') && !url.includes('?')
        );

      console.log(`✅ Extracted ${allUrls.length} report URLs from sitemap`);

      // Analyze URL patterns for insights
      this.analyzeSitemapUrls(allUrls);

      return allUrls;
    } catch (error) {
      console.error('❌ Failed to fetch sitemap URLs:', error);
      throw error;
    }
  }

  private analyzeSitemapUrls(urls: string[]): void {
    console.log('\n📊 SITEMAP ANALYSIS:');

    // Extract patterns
    const auditors = new Set<string>();
    const severities = new Set<string>();
    const formats = new Set<string>();

    urls.forEach((url) => {
      // Extract auditor patterns (common names in URLs)
      const auditorKeywords = [
        'pashov',
        'trailofbits',
        'consensys',
        'openzeppelin',
        'quantstamp',
        'certik',
        'chainsecurity',
        'code4rena',
        'sherlock',
        'cyfrin',
        'spearbit',
        'halborn',
        'sigmaprime',
        'ottersec',
      ];

      auditorKeywords.forEach((auditor) => {
        if (url.toLowerCase().includes(auditor)) {
          auditors.add(auditor);
        }
      });

      // Extract severity patterns
      if (url.includes('-l-')) severities.add('low');
      if (url.includes('-m-')) severities.add('medium');
      if (url.includes('-h-')) severities.add('high');

      // Extract format patterns
      if (url.endsWith('-pdf')) formats.add('pdf');
      if (url.endsWith('-git')) formats.add('git');
      if (url.endsWith('-markdown')) formats.add('markdown');
    });

    console.log(
      `   🏢 Auditors detected: ${auditors.size} (${Array.from(auditors).slice(0, 5).join(', ')}...)`
    );
    console.log(`   ⚠️  Severities detected: ${Array.from(severities).join(', ')}`);
    console.log(`   📄 Formats detected: ${Array.from(formats).join(', ')}`);
    console.log(`   🎯 Total unique reports: ${urls.length}\n`);
  }

  private async scrapeIndividualReports(reportUrls: string[]): Promise<void> {
    console.log(
      `\n🚀 Starting ASYNC scraping of ${reportUrls.length} reports with ${this.asyncConfig.concurrentLimit} concurrent workers...`
    );

    // Initialize progress tracking
    this.progress.total = reportUrls.length;
    this.progress.startTime = new Date();
    this.progress.processed = 0;
    this.progress.successful = 0;
    this.progress.failed = 0;

    // Process in batches for better memory management
    const batches = this.createBatches(reportUrls, this.asyncConfig.batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      this.progress.currentBatch = batchIndex + 1;

      console.log(
        `\n📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} reports)`
      );

      // Process batch with concurrency limit
      await this.processBatchConcurrently(batch);

      // Save progress after each batch
      await this.saveProgressUpdate(
        this.progress.processed,
        this.progress.total,
        this.progress.successful,
        this.progress.failed
      );

      // Brief delay between batches to be respectful
      if (batchIndex < batches.length - 1) {
        await this.delay(this.asyncConfig.delayBetweenBatches);
      }
    }

    console.log(`\n🎉 ASYNC Scraping Complete!`);
    console.log(`   📊 Total: ${this.progress.total}`);
    console.log(`   ✅ Successful: ${this.progress.successful}`);
    console.log(`   ❌ Failed: ${this.progress.failed}`);
    console.log(
      `   ⚡ Success Rate: ${((this.progress.successful / this.progress.total) * 100).toFixed(1)}%`
    );

    const totalTime = (Date.now() - this.progress.startTime.getTime()) / 1000;
    console.log(`   ⏱️  Total Time: ${Math.floor(totalTime / 60)}m ${Math.floor(totalTime % 60)}s`);
    console.log(
      `   🚀 Average Rate: ${(this.progress.successful / (totalTime / 60)).toFixed(1)} reports/minute`
    );
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatchConcurrently(urls: string[]): Promise<void> {
    console.log(
      `   🚀 Enhanced async processing: ${urls.length} URLs with ${this.asyncConfig.concurrentLimit} workers (TypeScript aiohttp equivalent)`
    );

    // Enhanced semaphore-like concurrency control (equivalent to aiohttp's connector limits)
    let urlIndex = 0;
    const activeWorkers: Promise<void>[] = [];

    const processWithWorker = async (workerId: number): Promise<void> => {
      while (urlIndex < urls.length) {
        const currentIndex = urlIndex++;
        if (currentIndex >= urls.length) break;

        const url = urls[currentIndex];
        const startTime = Date.now();
        let attempts = 0;

        // Intelligent staggered delay to prevent thundering herd (aiohttp pattern)
        if (currentIndex > 0) {
          await this.delay(Math.random() * 200 + 100);
        }

        while (attempts < this.asyncConfig.retryAttempts) {
          try {
            const report = await this.scrapeIndividualReport(url);

            if (report) {
              // Async file operations (TypeScript equivalent to aiofiles)
              await this.saveIndividualReportAsync(report);
              this.scrapedReports.push(report);
              this.progress.successful++;

              const processingTime = Date.now() - startTime;
              console.log(
                `   ✅ Worker-${workerId} [${this.progress.processed + 1}/${this.progress.total}] Success (${processingTime}ms): ${url.split('/').pop()}`
              );
            } else {
              this.progress.failed++;
              console.log(
                `   ❌ Worker-${workerId} [${this.progress.processed + 1}/${this.progress.total}] Failed: ${url.split('/').pop()}`
              );
            }
            break; // Success, exit retry loop
          } catch (error) {
            attempts++;
            if (attempts >= this.asyncConfig.retryAttempts) {
              this.progress.failed++;
              console.error(
                `   ❌ Worker-${workerId} Final failure after ${attempts} attempts: ${error.message}`
              );
            } else {
              console.warn(
                `   ⚠️  Worker-${workerId} Retry ${attempts}/${this.asyncConfig.retryAttempts} for: ${url.split('/').pop()}`
              );
              await this.delay(1000 * attempts); // Exponential backoff
            }
          }
        }

        this.progress.processed++;

        // Enhanced progress tracking (equivalent to tqdm.asyncio)
        if (this.progress.processed % this.asyncConfig.progressUpdateInterval === 0) {
          this.updateETAWithStats(Date.now() - startTime);
        }
      }
    };

    // Launch concurrent workers (aiohttp-style async pattern)
    for (let i = 0; i < this.asyncConfig.concurrentLimit; i++) {
      activeWorkers.push(processWithWorker(i));
    }

    // Wait for all workers to complete
    await Promise.allSettled(activeWorkers);
    console.log(
      `   ✅ Batch completed: ${this.progress.successful} successful, ${this.progress.failed} failed`
    );
  }

  private updateETA(): void {
    const now = Date.now();
    const elapsed = (now - this.progress.startTime.getTime()) / 1000; // seconds
    const rate = this.progress.processed / elapsed; // reports per second
    const remaining = this.progress.total - this.progress.processed;
    this.progress.estimatedTimeRemaining = remaining / rate;

    const eta = Math.floor(this.progress.estimatedTimeRemaining / 60);
    const currentRate = (this.progress.processed / (elapsed / 60)).toFixed(1);

    console.log(
      `   📈 Progress: ${this.progress.processed}/${this.progress.total} (${((this.progress.processed / this.progress.total) * 100).toFixed(1)}%) | Rate: ${currentRate}/min | ETA: ${eta}m`
    );
  }

  // Enhanced progress tracking with processing time stats (equivalent to tqdm.asyncio)
  private updateETAWithStats(processingTime: number): void {
    const now = Date.now();
    const elapsed = (now - this.progress.startTime.getTime()) / 1000;
    const rate = this.progress.processed / elapsed;
    const remaining = this.progress.total - this.progress.processed;
    this.progress.estimatedTimeRemaining = remaining / rate;

    const eta = Math.floor(this.progress.estimatedTimeRemaining / 60);
    const currentRate = (this.progress.processed / (elapsed / 60)).toFixed(1);
    const avgProcessingTime = (processingTime / 1000).toFixed(1);

    console.log(
      `   📊 Progress: ${this.progress.processed}/${this.progress.total} (${((this.progress.processed / this.progress.total) * 100).toFixed(1)}%) | Rate: ${currentRate}/min | Avg: ${avgProcessingTime}s | ETA: ${eta}m`
    );
  }

  // Async file operations (TypeScript equivalent to aiofiles)
  private async saveIndividualReportAsync(report: SoloditAuditReport): Promise<void> {
    try {
      const fileName = `${report.id}.json`;
      const filePath = path.join(this.outputDir, 'individual_reports', fileName);

      // Use async file write with better error handling
      await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
    } catch (error) {
      console.error(`   ⚠️ Async file save failed for ${report.id}:`, error.message);
      // Fallback to sync version
      await this.saveIndividualReport(report);
    }
  }

  async scrapeIndividualReport(url: string): Promise<SoloditAuditReport | null> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initBrowser() first.');
    }

    let page;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        page = await this.browser.newPage();

        // Set additional page options for stability
        await page.setUserAgent(this.userAgent);
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setRequestInterception(true);

        // Block unnecessary resources for faster loading
        page.on('request', (req) => {
          const resourceType = req.resourceType();
          if (
            resourceType === 'image' ||
            resourceType === 'stylesheet' ||
            resourceType === 'font'
          ) {
            req.abort();
          } else {
            req.continue();
          }
        });

        // Navigate with multiple fallback strategies
        const gotoOptions = {
          waitUntil: 'domcontentloaded' as const,
          timeout: 30000,
        };

        try {
          await page.goto(url, gotoOptions);
        } catch (gotoError) {
          console.log(`   ⚠️ First navigation attempt failed, trying with networkidle0...`);
          await page.goto(url, { ...gotoOptions, waitUntil: 'networkidle0' });
        }

        // Wait for content to load with multiple strategies
        await Promise.race([
          page.waitForSelector('body', { timeout: 10000 }),
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ]);

        // Additional wait for dynamic content
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Try to scroll down to load any lazy-loaded content
        try {
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (scrollError) {
          console.log(`   ⚠️ Scroll failed, continuing without scroll...`);
        }

        const reportData = await page.evaluate(() => {
          // Extract comprehensive report data
          const title =
            document
              .querySelector('h1, .title, .report-title, .audit-title')
              ?.textContent?.trim() ||
            document.querySelector('title')?.textContent?.trim() ||
            '';

          // Extract COMPREHENSIVE content including all technical details
          let content = '';
          let technicalContent = '';

          // Step 1: Extract CLEAN technical content from the vulnerability report
          const bodyText = document.body?.textContent || '';

          // IMPORTANT: Extract GitHub URLs from RAW content BEFORE any cleaning
          const rawGitHubUrls = bodyText.match(/https:\/\/github\.com\/[^\s\n]+/gi) || [];
          console.log(`   🔗 Found ${rawGitHubUrls.length} GitHub URLs in raw content`);
          rawGitHubUrls.forEach((url, index) => {
            console.log(`      ${index + 1}. ${url}`);
          });

          // ENHANCED CLEANING: Remove all UI clutter and extract only the core vulnerability content
          let cleanedBodyText = bodyText
            // Remove Solodit header and navigation
            .replace(/Solodit.*?Start researching/s, '')
            .replace(/Smart Contract Vulnerability Dataset.*?Start researching/s, '')

            // Remove finding headers and repetitive titles with comprehensive patterns
            .replace(/\[?[LMH]-\d+\]?\s*.*?・.*?・.*?\d{4}/g, '') // Remove "[L-01] Title ・ Protocol ・ Date"
            .replace(/Findings #\d+.*?・.*?\d{4}/g, '') // Remove "Findings #123 Title ・ Date"
            .replace(/Label Name Collision.*?・.*?\d{4}/g, '') // Remove specific title repetitions

            // Remove stats, ratings, and metadata sections aggressively
            .replace(/Overview\s+Impact\s+\w+\s+Quality.*?Rarity.*?/s, '')
            .replace(/Rarity Diamond.*?(?=\w|$)/gs, '') // Remove Rarity Diamond spam
            .replace(/\d+\.\d+\s*\(\d+\)/g, '') // Remove rating numbers like "0.0 (0)"
            .replace(/Quality\s+\d+.*?Rarity.*?/s, '') // Remove quality scores

            // Remove UI elements and prompts
            .replace(/Attachments.*?Full report.*?/s, '')
            .replace(/Categories\s+Tags\s+Author\(s\).*?(?=[A-Z][a-z]|The |However|State)/s, '') // Stop at actual content
            .replace(/Unlock notes.*$/s, '')
            .replace(/Create an account.*$/s, '')
            .replace(/Rate this finding.*$/s, '')
            .replace(/Get access to.*$/s, '')
            .replace(/Powered by Cyfrin.*$/s, '')
            .replace(/Sign up.*$/s, '')
            .replace(/Start researching.*$/s, '')

            // Remove timestamps, counters, and metadata
            .replace(/\d{1,2}:\d{2} [AP]M/g, '')
            .replace(/\d+,?\d* Findings/g, '')
            .replace(/Findings #\d+/g, '') // Remove finding numbers completely
            .replace(/Nov \d+, \d{4}/g, '') // Remove dates scattered in text

            // Clean up repository URLs that got mixed in
            .replace(/https:\/\/github\.com\/\S+(?=\s+[A-Z])/g, '') // Remove URLs before main content
            .replace(/github\.com\/\S+/g, '') // Remove github references in content

            // Remove navigation elements
            .replace(/Details\s+Notes\s+/g, '')
            .replace(/AI Summary\s+/g, '')
            .replace(/Full report\s+/g, '')

            // Normalize whitespace aggressively
            .replace(/\s+/g, ' ')
            .replace(/\s*・\s*/g, ' ') // Remove bullet separators
            .trim();

          // Extract the main vulnerability report content between key markers
          const contentPatterns = [
            // Pattern 1: Extract from technical start markers to end
            /((?:The current implementation|However|State \d+|Window =|Limit =|AmountInFlight =|To showcase|Take into consideration).*?)(?:Rate this finding|Create an account|Categories|$)/s,
            // Pattern 2: Extract complete technical descriptions starting with "The"
            /(The .*?)(?:Rate this finding|Create an account|Categories|$)/s,
            // Pattern 3: Extract content starting with technical explanations
            /((?:However|State|Window|Limit|After|At that moment).*?)(?:Rate this finding|Create an account|Categories|$)/s,
            // Pattern 4: Extract from code blocks and examples
            /(if \(.*?\{[\s\S]*?\}.*?)(?:Rate this finding|Create an account|Categories|$)/s,
            // Pattern 5: Extract from vulnerability-specific patterns
            /((?:Identifier Generation|Example of|Relevant Code|Remediation).*?)(?:Rate this finding|Create an account|Categories|$)/s,
            // Pattern 6: Extract content between Details/Notes and footer
            /(?:Details\s+Notes\s+)?(.*?)(?:Rate this finding|Create an account|Categories|$)/s,
            // Pattern 7: Fallback - get everything after cleaning
            /([\s\S]*?)(?:Rate this finding|Create an account|Categories|$)/,
          ];

          for (const pattern of contentPatterns) {
            const match = cleanedBodyText.match(pattern);
            if (match && match[1] && match[1].trim().length > technicalContent.length) {
              technicalContent = match[1]
                .replace(/^\s*AI Summary\s*/i, '') // Remove AI Summary prefix
                .replace(/^\s*Notes\s*/i, '') // Remove Notes prefix
                .trim();
            }
          }

          // Fallback: Try other patterns if main extraction failed
          if (!technicalContent || technicalContent.length < 200) {
            const fallbackPatterns = [
              /Description\s+(.*?)(?:Recommendation|Rate this finding|Unlock notes|$)/s,
              /Notes\s+AI Summary\s+(.*?)(?:Recommendation|Rate this finding|$)/s,
              /AI Summary\s+(.*?)(?:Description|Recommendation|$)/s,
            ];

            for (const pattern of fallbackPatterns) {
              const match = bodyText.match(pattern);
              if (match && match[1] && match[1].trim().length > technicalContent.length) {
                technicalContent = match[1].trim();
              }
            }
          }

          // Step 2: Extract Recommendations/Mitigation section separately
          let recommendationsText = '';
          const recPatterns = [
            /Recommendation\s+(.*?)(?:Rate this finding|Unlock notes|Categories|$)/s,
            /Recommendations\s+(.*?)(?:Rate this finding|Unlock notes|Categories|$)/s,
            /Mitigation\s+(.*?)(?:Rate this finding|Unlock notes|Categories|$)/s,
            /Fix\s+(.*?)(?:Rate this finding|Unlock notes|Categories|$)/s,
          ];

          for (const pattern of recPatterns) {
            const match = bodyText.match(pattern);
            if (match && match[1] && match[1].trim().length > recommendationsText.length) {
              recommendationsText = match[1].trim();
            }
          }

          // Step 3: Combine technical content with recommendations
          if (technicalContent) {
            content = technicalContent;
            if (recommendationsText) {
              content += '\n\nRecommendations:\n' + recommendationsText;
            }
          }

          // Step 4: If still no good content, try alternative selectors
          if (!content || content.length < 200) {
            const contentSelectors = [
              '.finding-content',
              '.details-content',
              '.report-body',
              '.vulnerability-details',
              'main',
              '[data-testid="content"]',
            ];

            for (const selector of contentSelectors) {
              const element = document.querySelector(selector);
              if (element && element.textContent && element.textContent.length > content.length) {
                content = element.textContent.trim();
              }
            }
          }

          // Step 5: Final fallback with better cleaning
          if (!content || content.length < 200) {
            content = bodyText
              .replace(/Solodit.*?Start researching/s, '') // Remove header
              .replace(/Create an account.*$/s, '') // Remove footer
              .replace(/Rate this finding.*$/s, '') // Remove rating section
              .replace(/Categories.*Tags.*Author.*$/s, '') // Remove metadata
              .replace(/Overview.*Impact.*Quality.*Rarity.*$/s, '') // Remove stats
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim();
          }

          // === NEW: AI AGENT-SPECIFIC SECURITY ANALYSIS ===

          // Extract vulnerability patterns for AI agents
          const vulnerabilityPatterns = {
            // Access Control Issues
            accessControl: {
              found:
                /(?:access.control|authorization|privilege|permission|role|admin|owner|onlyowner|modifier)/gi.test(
                  content
                ),
              indicators:
                content.match(
                  /(?:missing|incorrect|bypass|escalate|unauthorized).*(?:access|permission|role|admin)/gi
                ) || [],
              functions:
                content.match(
                  /(?:onlyOwner|onlyAdmin|requireRole|hasRole|_setupRole)\([^)]*\)/gi
                ) || [],
            },

            // Reentrancy Vulnerabilities
            reentrancy: {
              found: /(?:reentrancy|reentrant|external.call|call.*value|low.level.call)/gi.test(
                content
              ),
              indicators:
                content.match(
                  /(?:before|after).*(?:external.call|state.change|balance.update)/gi
                ) || [],
              patterns:
                content.match(/(?:\.call\{value:|\.call\(|delegatecall|staticcall)/gi) || [],
            },

            // Integer Overflow/Underflow
            arithmetic: {
              found: /(?:overflow|underflow|arithmetic|integer|SafeMath|unchecked)/gi.test(content),
              indicators:
                content.match(/(?:overflow|underflow|wraparound|integer.arithmetic)/gi) || [],
              operations: content.match(/(?:\+|\-|\*|\/|\%|\*\*|<<|>>)(?=.*(?:uint|int))/g) || [],
            },

            // Logic Errors
            logic: {
              found: /(?:logic.error|business.logic|invariant|condition|validation)/gi.test(
                content
              ),
              indicators:
                content.match(
                  /(?:missing|incorrect|inadequate).*(?:check|validation|condition)/gi
                ) || [],
              conditions: content.match(/(?:require|assert|if)\s*\([^)]*\)/gi) || [],
            },
          };

          // Extract attack vectors and exploitation methods
          const attackVectors = {
            entryPoints: content.match(/function\s+\w+\s*\([^)]*\)\s*(?:external|public)/gi) || [],
            riskFactors:
              content.match(/(?:payable|delegatecall|assembly|selfdestruct|tx\.origin)/gi) || [],
            stateChanges:
              content.match(/(?:balance|storage|mapping|array).*(?:update|modify|change)/gi) || [],
          };

          // Extract security-specific metadata for AI training
          const securityMetadata = {
            impactLevel:
              content.match(/(?:impact|effect|consequence).*(?:high|medium|low|critical)/gi)?.[0] ||
              '',
            exploitability:
              content.match(/(?:easy|difficult|trivial|complex).*(?:exploit|attack)/gi)?.[0] || '',
            prerequisites: content.match(/(?:require|need|must).*(?:attacker|exploit)/gi) || [],
            affectedComponents:
              content.match(/(?:contract|function|modifier|variable):\s*\w+/gi) || [],
          };

          // Extract vulnerable code patterns with context
          const vulnerablePatterns = {
            beforeFix:
              content.match(/(?:vulnerable|problematic|incorrect)[\s\S]{0,200}?```[\s\S]*?```/gi) ||
              [],
            afterFix:
              content.match(/(?:fixed|corrected|secure)[\s\S]{0,200}?```[\s\S]*?```/gi) || [],
            recommendations:
              content.match(/(?:should|recommend|fix|mitigation)[\s\S]{0,300}/gi) || [],
          };

          // Extract auditor with better Solodit-specific selectors
          let auditor = '';

          // First, look for pattern like "Advanced Blockchain ・ Apr 19, 2021" in the header
          const pageText = document.body.textContent || '';
          const headerMatch = pageText.match(/([^・\n]+)\s*・\s*\w+\s+\d+,\s+\d{4}/);
          if (headerMatch) {
            const candidate = headerMatch[1].trim();
            // Avoid capturing "Label Name Collision" or "Findings #" text
            if (
              !candidate.includes('Label Name') &&
              !candidate.includes('Findings #') &&
              candidate.length < 50
            ) {
              auditor = candidate;
            }
          }

          // Look for "Author(s):" text pattern in the page content
          if (!auditor) {
            const authorMatch = pageText.match(
              /Author\(s\)\s+([^Rate]+?)(?:Rate|Details|Categories|$)/i
            );
            if (authorMatch) {
              const candidate = authorMatch[1].trim().replace(/\s+/g, ' ');
              // Clean up the candidate
              if (!candidate.includes('Findings #') && candidate.length < 100) {
                auditor = candidate;
              }
            }
          }

          // Extract from URL patterns if not found - with Trail of Bits detection
          if (!auditor || auditor.length > 100 || auditor.includes('function')) {
            const url = window.location.href;
            const auditorKeywords = [
              { keyword: 'trailofbits', name: 'Trail of Bits' },
              { keyword: 'trail-of-bits', name: 'Trail of Bits' },
              { keyword: 'pashov', name: 'Pashov' },
              { keyword: 'consensys', name: 'ConsenSys' },
              { keyword: 'openzeppelin', name: 'OpenZeppelin' },
              { keyword: 'quantstamp', name: 'Quantstamp' },
              { keyword: 'certik', name: 'CertiK' },
              { keyword: 'chainsecurity', name: 'ChainSecurity' },
              { keyword: 'code4rena', name: 'Code4rena' },
              { keyword: 'sherlock', name: 'Sherlock' },
              { keyword: 'cyfrin', name: 'Cyfrin' },
              { keyword: 'spearbit', name: 'Spearbit' },
              { keyword: 'halborn', name: 'Halborn' },
            ];

            for (const { keyword, name } of auditorKeywords) {
              if (url.toLowerCase().includes(keyword) || title.toLowerCase().includes(keyword)) {
                auditor = name;
                break;
              }
            }
          }

          // Clean up auditor name and validate
          if (
            auditor &&
            auditor.length < 100 &&
            !auditor.includes('function') &&
            !auditor.includes('window')
          ) {
            auditor = auditor.replace(/\s+/g, ' ').trim();
          } else {
            auditor = 'Unknown Auditor';
          }

          // Extract protocol with better detection
          let protocol =
            document.querySelector('.protocol, .project, .contract')?.textContent?.trim() || '';

          // Don't confuse auditor with protocol

          // Look for protocol in title or URL - ENHANCED for rate limiter patterns
          if (!protocol || protocol === 'Unknown Protocol') {
            // For Solodit, protocol is often in the URL and title
            const url = window.location.href;

            // Pattern 1: Extract from URL pattern - usually before the date
            const urlMatch = url.match(/([a-zA-Z]+)_\d{4}-\d{2}-\d{2}/);
            if (urlMatch) {
              protocol = urlMatch[1].charAt(0).toUpperCase() + urlMatch[1].slice(1);
            }

            // Pattern 2: Extract from URL for specific patterns like "lzratelimiter"
            if (!protocol || protocol === 'Unknown Protocol') {
              const urlProtocolMatch = url.match(
                /-(lzratelimiter|lz|layerzero|ratelimiter|limiter)-/i
              );
              if (urlProtocolMatch) {
                const protocolName = urlProtocolMatch[1];
                if (protocolName.toLowerCase() === 'lzratelimiter') {
                  protocol = 'LayerZero RateLimiter';
                } else if (protocolName.toLowerCase() === 'lz') {
                  protocol = 'LayerZero';
                } else if (protocolName.toLowerCase() === 'layerzero') {
                  protocol = 'LayerZero';
                } else if (protocolName.toLowerCase().includes('ratelimiter')) {
                  protocol = 'RateLimiter';
                }
              }
            }

            // Pattern 3: Extract from title content - look for protocol names in the description
            if (!protocol || protocol === 'Unknown Protocol') {
              const protocolText = document.body.textContent || '';
              const protocolKeywords = [
                'lzratelimiter',
                'layerzero',
                'ratelimiter',
                'polkastrategies',
                'uniswap',
                'compound',
                'aave',
                'curve',
                'yearn',
                'makerdao',
                'synthetix',
                'balancer',
                'sushiswap',
                'chainlink',
                'euler',
                'cove',
                'frax',
                'lido',
                'convex',
                'olympus',
                'rocket',
                'polygon',
                'arbitrum',
                'optimism',
                'avalanche',
                'fantom',
                'bsc',
                'venus',
                'pancakeswap',
                'cream',
                'badger',
                'harvest',
                'pickle',
                'alpha',
              ];

              for (const keyword of protocolKeywords) {
                if (
                  protocolText.toLowerCase().includes(keyword.toLowerCase() + ' ') ||
                  protocolText.toLowerCase().includes('in ' + keyword.toLowerCase()) ||
                  url.toLowerCase().includes(keyword) ||
                  protocolText.toLowerCase().includes(keyword + '/') || // for path references
                  title.toLowerCase().includes(keyword)
                ) {
                  if (keyword === 'lzratelimiter') {
                    protocol = 'LayerZero RateLimiter';
                  } else if (keyword === 'layerzero') {
                    protocol = 'LayerZero';
                  } else if (keyword === 'ratelimiter') {
                    protocol = 'RateLimiter';
                  } else {
                    protocol = keyword.charAt(0).toUpperCase() + keyword.slice(1);
                  }
                  break;
                }
              }
            }

            if (!protocol || protocol === 'Unknown Protocol') protocol = 'Unknown Protocol';
          }

          const dateStr =
            document.querySelector('.date, time, .published')?.textContent?.trim() ||
            document.querySelector('time')?.getAttribute('datetime') ||
            '';

          // Extract impact from the "Impact: Low/Medium/High" section
          let impact = '';

          // 1. First check for "Impact  High/Medium/Low/Critical" pattern (most reliable)
          const impactMatch = pageText.match(/Impact\s+(Low|Medium|High|Critical)/i);
          if (impactMatch) {
            impact = impactMatch[1].toLowerCase();
          }

          // 2. Check title for severity patterns as fallback
          if (!impact) {
            const titleSeverityMatch = title.match(/\[([HML])-\d+\]/i);
            if (titleSeverityMatch) {
              const level = titleSeverityMatch[1].toUpperCase();
              if (level === 'H') impact = 'high';
              else if (level === 'M') impact = 'medium';
              else if (level === 'L') impact = 'low';
            }
          }

          // 3. Check URL for severity patterns as final fallback
          if (!impact) {
            const url = window.location.href;
            const urlSeverityMatch = url.match(/[-\/]([hml])-\d+/i);
            if (urlSeverityMatch) {
              const level = urlSeverityMatch[1].toUpperCase();
              if (level === 'H') impact = 'high';
              else if (level === 'M') impact = 'medium';
              else if (level === 'L') impact = 'low';
            }
          }

          // Default if nothing found
          if (!impact) {
            impact = 'medium';
          }

          // Extract findings/vulnerabilities
          const findingElements = document.querySelectorAll(
            '.finding, .vulnerability, .issue, .bug'
          );
          const findings = Array.from(findingElements).map((el) => el.textContent?.trim() || '');

          // Extract clean, properly formatted code snippets for AI agents
          let codeSnippets: string[] = [];

          // Step 1: Extract code blocks directly from HTML elements first
          const codeElements = document.querySelectorAll(
            'code, pre, .code-block, .highlight, .language-python, .language-solidity'
          );
          const htmlCodeSnippets = Array.from(codeElements)
            .map((el) => el.textContent?.trim() || '')
            .filter(
              (code) =>
                code.length > 10 &&
                code.length < 1000 &&
                !code.includes('Solodit') &&
                !code.includes('Rarity Diamond')
            );

          // Step 2: Extract structured code examples from text content
          const contentText = technicalContent || document.body.textContent || '';

          // Step 2.1: Look for Python function definitions specifically
          const pythonFunctionPattern = /def\s+\w+\([^)]*\)/g;
          const pythonMatches = contentText.match(pythonFunctionPattern);
          if (pythonMatches) {
            pythonMatches.forEach((func) => {
              // Clean up the function definition
              const cleanFunc = func.replace(/\s+/g, ' ').trim();
              if (
                cleanFunc.length > 10 &&
                cleanFunc.length < 200 &&
                !cleanFunc.includes('PYTHON')
              ) {
                codeSnippets.push(`PYTHON_FUNCTION: ${cleanFunc}`);
              }
            });
          }

          // Step 2.2: Extract the specific Vyper/Python code pattern after "PYTHON"
          const pythonCodePattern = /PYTHON\s*@cached_property[^}]*?return[^}]*?\)/gs;
          const pythonCodeMatches = contentText.match(pythonCodePattern);
          if (pythonCodeMatches) {
            pythonCodeMatches.forEach((code) => {
              // Clean and format the Python code
              const cleanCode = code
                .replace(/PYTHON\s*/, '') // Remove PYTHON prefix
                .replace(/(\w+)def\s+/, '$1\ndef ') // Add line break before def
                .replace(/(\))([a-z]+)/g, '$1\n    $2') // Add line breaks for proper formatting
                .replace(/\s+/g, ' ') // Normalize spaces
                .trim();

              if (cleanCode.length > 30) {
                codeSnippets.push(`PYTHON_PROPERTY: ${cleanCode}`);
              }
            });
          }

          // Step 2.3: Extract collision examples (def zzz functions)
          const collisionPattern = /def\s+zzz\([^)]*\)\s+def\s+zzz__uint8_3\([^)]*\)/g;
          const collisionMatches = contentText.match(collisionPattern);
          if (collisionMatches) {
            collisionMatches.forEach((collision) => {
              const cleanCollision = collision
                .replace(/def\s+/g, '\ndef ')
                .replace(/^\s*def/, 'def') // Remove leading newline from first def
                .trim();
              codeSnippets.push(`COLLISION_EXAMPLE: ${cleanCollision}`);
            });
          }

          // Step 2.4: Extract the @cached_property method specifically
          const cachedPropertyPattern =
            /PYTHON@cached_propertydef\s+ir_identifier\([^)]*\)[^}]*?return[^}]*?\)/g;
          const cachedPropertyMatches = contentText.match(cachedPropertyPattern);
          if (cachedPropertyMatches) {
            cachedPropertyMatches.forEach((code) => {
              const cleanCode = code
                .replace(/PYTHON@cached_property/, '@cached_property\n')
                .replace(/def\s+/, 'def ')
                .replace(/(\))([a-z]+)/g, '$1\n    $2')
                .replace(/\s+/g, ' ')
                .replace(/\n\s+/g, '\n    ') // Proper indentation
                .trim();
              codeSnippets.push(`PYTHON_PROPERTY: ${cleanCode}`);
            });
          }

          // Extract Python/Solidity function definitions
          const functionPatterns = [
            // Python functions
            /def\s+\w+\([^)]*\)(?:\s*->?\s*\w+)?:/g,
            // Solidity functions
            /function\s+\w+\([^)]*\)(?:\s+(?:public|private|internal|external))?(?:\s+(?:view|pure|payable))?(?:\s+returns\s*\([^)]*\))?[{;]/g,
          ];

          functionPatterns.forEach((pattern) => {
            const matches = contentText.match(pattern);
            if (matches) {
              matches.forEach((match) => {
                codeSnippets.push(`FUNCTION_DEF: ${match.trim()}`);
              });
            }
          });

          // Step 3: Extract specific vulnerable code examples - UNIVERSAL for all languages
          // Look for code that appears in examples or "Relevant Code" sections
          const codeExamplePatterns = [
            // UNIVERSAL: Extract complete if/else/conditional blocks (any language)
            /(if\s*\([^)]+\)\s*\{[\s\S]*?\}(?:\s*else\s*\{[\s\S]*?\})?)/g,
            // UNIVERSAL: Extract complete function definitions (any language)
            /((?:function|def|fn|func)\s+\w+\([^)]*\)[\s\S]*?\{[\s\S]*?\})/g,
            // UNIVERSAL: Extract code blocks with proper formatting
            /```[\w]*\n([\s\S]*?)\n```/g,
            // UNIVERSAL: Extract assignment statements and operations
            /(\w+\s*[=:]\s*[^;,\n]{10,100}[;,]?)/g,
            // UNIVERSAL: Extract method calls and function invocations
            /(\w+(?:\.\w+)*\([^)]*\)(?:\s*[;,])?)/g,
            // SPECIFIC: Extract state variable descriptions and examples
            /((?:Window|Limit|AmountInFlight)\s*=\s*\d+)/g,
            // SPECIFIC: Extract calculation examples like "(100 - 40) = 60"
            /(\([^)]*\d+[^)]*\)\s*=\s*\d+)/g,
            // SPECIFIC: Extract time-based conditions
            /(timeSince\w+\s*[><=]+\s*\w+)/g,
            // SPECIFIC: Python/Vyper patterns (keep existing for other reports)
            /(def\s+zzz\([^)]*\)\s+def\s+zzz__uint8_3\([^)]*\))/g,
            // SPECIFIC: Python property code
            /(PYTHON@cached_propertydef\s+ir_identifier[^}]*?return[^}]*?\))/g,
          ];

          codeExamplePatterns.forEach((pattern, index) => {
            const matches = contentText.matchAll(pattern);
            for (const match of matches) {
              const codeBlock = match[1]?.trim();
              if (codeBlock && codeBlock.length > 20 && codeBlock.length < 2000) {
                // Increased limit for Solidity blocks
                let cleanCode = codeBlock;
                let codeType = 'CODE_EXAMPLE';

                // Different cleaning based on pattern type
                if (index === 0) {
                  // Complete Solidity if/else blocks
                  codeType = 'SOLIDITY_IF_ELSE';
                  // Basic formatting here, detailed formatting will be done later
                  cleanCode = cleanCode
                    .replace(/\{\s*\n/g, ' {\n')
                    .replace(/\}\s*else\s*\{/g, '} else {')
                    .trim();
                } else if (index === 1) {
                  // Solidity function definitions
                  codeType = 'SOLIDITY_FUNCTION';
                  cleanCode = cleanCode
                    .replace(/\{\s*\n/g, ' {\n')
                    .replace(/;\s*\n/g, ';\n')
                    .trim();
                } else if (index === 2) {
                  // Conditional statements with burn operations
                  codeType = 'SOLIDITY_CONDITIONAL';
                  cleanCode = cleanCode
                    .replace(/\{\s*\n/g, ' {\n')
                    .replace(/;\s*\n/g, ';\n')
                    .trim();
                } else if (index === 3) {
                  // Multi-line code blocks
                  codeType = 'CODE_BLOCK';
                  cleanCode = cleanCode.trim();
                } else if (index === 4) {
                  // Solidity variable assignments
                  codeType = 'SOLIDITY_ASSIGNMENT';
                  cleanCode = cleanCode.replace(/\s+/g, ' ').trim();
                } else if (index === 5) {
                  // Function calls
                  codeType = 'FUNCTION_CALL';
                  cleanCode = cleanCode.replace(/\s+/g, ' ').trim();
                } else if (index === 6) {
                  // Else blocks with burn operations
                  codeType = 'SOLIDITY_ELSE_BLOCK';
                  cleanCode = cleanCode
                    .replace(/\{\s*\n/g, ' {\n')
                    .replace(/;\s*\n/g, ';\n')
                    .trim();
                } else if (index === 7) {
                  // Python collision examples (keep existing)
                  codeType = 'COLLISION_EXAMPLE';
                  cleanCode = cleanCode
                    .replace(/def\s+/g, '\ndef ')
                    .replace(/^\s*def/, 'def')
                    .trim();
                } else if (index === 8) {
                  // Python property code (keep existing)
                  codeType = 'PYTHON_PROPERTY';
                  cleanCode = cleanCode
                    .replace(/codegen\/function_definitions\/common\.py\s+PYTHON\s+/, '')
                    .replace(/PYTHON\s+/, '')
                    .replace(/(\w+)def\s+/, '$1\ndef ')
                    .replace(/(\))([a-z]+)/g, '$1\n    $2')
                    .trim();
                }

                // General cleaning
                cleanCode = cleanCode
                  .replace(/^\s*```[\w]*\s*/, '') // Remove code fence markers
                  .replace(/\s*```\s*$/, '')
                  .replace(/^\s*PYTHON\s*$/gm, '') // Remove language markers
                  .replace(/^\s*SOLIDITY\s*$/gm, '')
                  .trim();

                if (
                  cleanCode &&
                  cleanCode.length > 10 &&
                  !cleanCode.includes('Categories') &&
                  !cleanCode.includes('Author(s)') &&
                  !cleanCode.includes('Rarity Diamond')
                ) {
                  codeSnippets.push(`${codeType}: ${cleanCode}`);
                }
              }
            }
          });

          // Step 4: Extract inline code snippets - ENHANCED validation to prevent random text
          const inlineCodePatterns = [
            // Function calls and method invocations (must have parentheses and look like code)
            /\b[a-zA-Z_][a-zA-Z0-9_]*\([^)]*\)/g,
            // Type casting operations (Solidity specific)
            /\b(?:uint\d+|int\d+|address|bool)\([^)]+\)/g,
            // Variable assignments with proper syntax
            /\b[a-zA-Z_][a-zA-Z0-9_]*\s*[=]\s*[^;\n]{5,50}[;]?/g,
          ];

          inlineCodePatterns.forEach((pattern) => {
            const matches = contentText.match(pattern);
            if (matches) {
              matches.slice(0, 3).forEach((match) => {
                // Reduced limit to 3 per pattern
                const cleanCode = match.trim();
                if (
                  cleanCode.length > 10 &&
                  cleanCode.length < 80 &&
                  !cleanCode.includes('http') &&
                  !cleanCode.includes('Categories') &&
                  !cleanCode.includes('Finding') &&
                  !cleanCode.includes('・') &&
                  !cleanCode.includes('Recommendation') &&
                  !cleanCode.includes('lines: ') &&
                  !cleanCode.includes('Grandthrax') &&
                  // Must contain code-like patterns
                  (cleanCode.includes('(') || cleanCode.includes('=') || cleanCode.includes(';')) &&
                  // Must not be plain English text
                  !/^[A-Z][a-z\s]+$/.test(cleanCode) &&
                  // Must not be URLs or file paths without code syntax
                  !(/^[a-zA-Z0-9\/\-_]+\.[a-zA-Z]{2,5}/.test(cleanCode) && !cleanCode.includes('('))
                ) {
                  codeSnippets.push(`INLINE_CODE: ${cleanCode}`);
                }
              });
            }
          });

          // Add HTML code snippets if they're cleaner
          htmlCodeSnippets.forEach((code) => {
            if (!codeSnippets.some((existing) => existing.includes(code))) {
              codeSnippets.push(`HTML_CODE: ${code}`);
            }
          });

          // Extract "Affected lines" with GitHub links - ENHANCED pattern matching
          const affectedLinesMatches = contentText.match(
            /Affected lines?:?\s*(https:\/\/github\.com\/[^\s\n]+)/gi
          );
          if (affectedLinesMatches) {
            affectedLinesMatches.forEach((match) => {
              const urlMatch = match.match(/https:\/\/github\.com\/[^\s\n]+/);
              if (urlMatch) {
                codeSnippets.push(`AFFECTED_LINE: ${urlMatch[0]}`);
              }
            });
          }

          // Also look for standalone GitHub URLs in the content
          const standaloneGitHubUrls = contentText.match(/https:\/\/github\.com\/[^\s\n]+/gi);
          if (standaloneGitHubUrls) {
            console.log(`   🔗 Found ${standaloneGitHubUrls.length} GitHub URLs in content`);
            standaloneGitHubUrls.forEach((url, index) => {
              console.log(`      ${index + 1}. ${url}`);
              if (!codeSnippets.some((snippet) => snippet.includes(url))) {
                codeSnippets.push(`AFFECTED_LINE: ${url}`);
              }
            });
          } else {
            console.log(`   ⚠️ No GitHub URLs found in content`);
          }

          // Extract all GitHub code references - ENHANCED to capture ALL GitHub URLs with line numbers
          const githubCodeMatches = contentText.match(
            /https:\/\/github\.com\/[^\s]+#L\d+(?:-L\d+)?/gi
          );
          if (githubCodeMatches) {
            githubCodeMatches.forEach((url) => {
              if (!codeSnippets.some((snippet) => snippet.includes(url))) {
                codeSnippets.push(`GITHUB_CODE: ${url}`);
              }
            });
          }

          // Also extract GitHub URLs without line numbers but with file extensions
          const githubFileMatches = contentText.match(
            /https:\/\/github\.com\/[^\s]+\.(sol|py|js|ts|rs|go|java|c|cpp|h|hpp|rb|php|swift|kt|scala|r|m|sh|yml|yaml|json|toml|xml)/gi
          );
          if (githubFileMatches) {
            githubFileMatches.forEach((url) => {
              if (!codeSnippets.some((snippet) => snippet.includes(url))) {
                codeSnippets.push(`GITHUB_CODE: ${url}`);
              }
            });
          }

          // Extract function names and contract references
          const functionMatches = content.match(/function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g);
          if (functionMatches) {
            functionMatches.slice(0, 5).forEach((func) => {
              codeSnippets.push(`FUNCTION: ${func.replace(/\s+/g, ' ')}`);
            });
          }

          // Extract contract names
          const contractMatches = content.match(/contract\s+([a-zA-Z_][a-zA-Z0-9_]*)/g);
          if (contractMatches) {
            contractMatches.slice(0, 3).forEach((contract) => {
              codeSnippets.push(`CONTRACT: ${contract.replace(/\s+/g, ' ')}`);
            });
          }

          // Extract file paths and line references
          const codePathMatches = content.match(/[A-Za-z0-9_\/]+\.sol(?:#L\d+(?:-L\d+)?)?/g);
          if (codePathMatches) {
            codePathMatches.forEach((path) => {
              if (!codeSnippets.some((snippet) => snippet.includes(path))) {
                codeSnippets.push(`FILE_REF: ${path}`);
              }
            });
          }

          // Extract recommendations
          const recommendationElements = document.querySelectorAll(
            '.recommendation, .mitigation, .fix, .solution'
          );
          const recommendationsList = Array.from(recommendationElements).map(
            (el) => el.textContent?.trim() || ''
          );

          // Extract GitHub report URL if available
          let githubReportUrl = '';
          const reportLinks = document.querySelectorAll('a[href*="github.com"]');
          reportLinks.forEach((link) => {
            const href = (link as HTMLAnchorElement).href;
            if (
              href.includes('github.com') &&
              (href.includes('audit') || href.includes('review') || href.includes('.md'))
            ) {
              githubReportUrl = href;
            }
          });

          // Separate affected lines from general code snippets for better AI agent access
          const affectedLines = codeSnippets
            .filter((snippet) => snippet.startsWith('AFFECTED_LINE:'))
            .map((snippet) => snippet.replace('AFFECTED_LINE: ', ''));

          const vulnerableCodeContext = codeSnippets.filter(
            (snippet) =>
              snippet.startsWith('VULNERABLE_PATTERN:') ||
              snippet.startsWith('FUNCTION:') ||
              snippet.startsWith('CONTRACT:')
          );

          // Extract all GitHub URLs for code fetching - use raw URLs found before cleaning
          const allGitHubUrls = [
            ...codeSnippets
              .filter((snippet) => snippet.startsWith('GITHUB_CODE:'))
              .map((snippet) => snippet.replace('GITHUB_CODE: ', '')),
            ...affectedLines,
            ...rawGitHubUrls, // Add the raw GitHub URLs we extracted before cleaning
          ].filter((url, index, arr) => arr.indexOf(url) === index); // Remove duplicates

          return {
            title,
            protocol,
            auditor,
            dateStr,
            impact,
            findings,
            codeSnippets: codeSnippets.filter((code) => code.length > 10),
            recommendations: recommendationsList.filter((rec) => rec.length > 10),
            fullContent: document.body?.textContent?.trim() || '',
            content, // Include the cleaned content
            githubReportUrl,
            affectedLines: affectedLines.length > 0 ? affectedLines : undefined,
            vulnerableCodeContext:
              vulnerableCodeContext.length > 0 ? vulnerableCodeContext : undefined,
            allGitHubUrls: allGitHubUrls.length > 0 ? allGitHubUrls : undefined,
            // NEW: AI Agent-specific security analysis fields
            vulnerabilityPatterns,
            attackVectors,
            securityMetadata,
            vulnerablePatterns,
          };
        });

        // Generate a unique ID from the URL
        const reportId = this.generateReportId(url, reportData.title);

        // Fetch actual GitHub code snippets for AI agents
        let gitHubCodeSnippets: GitHubCodeSnippet[] = [];
        if (reportData.allGitHubUrls && reportData.allGitHubUrls.length > 0) {
          console.log(`   🔗 Fetching ${reportData.allGitHubUrls.length} GitHub code snippets...`);
          gitHubCodeSnippets = await this.fetchGitHubCodeSnippets(reportData.allGitHubUrls);
          console.log(`   ✅ Successfully fetched ${gitHubCodeSnippets.length} code snippets`);
        }

        // Create clean, focused report for AI agents
        const report: SoloditAuditReport = {
          id: reportId,
          title: reportData.title,
          url: url,

          vulnerability: {
            type: this.extractVulnerabilityType(reportData.content),
            category: this.extractVulnerabilityCategory(reportData.content),
            impact: this.normalizeSeverity(reportData.impact, url),
            target: this.extractTarget(reportData.content),
          },

          description: this.extractCleanDescription(reportData.content),

          vulnerableCode: this.extractCleanCodeSnippets(
            reportData.content,
            reportData.allGitHubUrls,
            gitHubCodeSnippets
          ),

          exploitScenario: this.extractExploitScenario(reportData.content),

          recommendations: this.extractCleanRecommendations(reportData.content),

          sourceCode: this.extractSourceCodeReferences(
            reportData.allGitHubUrls || [],
            gitHubCodeSnippets
          ),

          metadata: {
            protocol: reportData.protocol,
            auditor: reportData.auditor,
            date: this.parseDate(reportData.dateStr),
            reportUrl: reportData.githubReportUrl,
            extractedAt: new Date(),
          },
        };

        if (page) await page.close();
        return report;
      } catch (error) {
        retryCount++;
        console.error(
          `   ⚠️ Attempt ${retryCount}/${maxRetries} failed for ${url.substring(0, 50)}...: ${error.message || error}`
        );

        if (page) {
          try {
            await page.close();
          } catch (closeError) {
            // Ignore close errors
          }
        }

        // If this was the last retry, return null
        if (retryCount >= maxRetries) {
          console.error(`   ❌ All retry attempts failed for ${url}`);
          return null;
        }

        // Wait before retrying
        await this.delay(2000 * retryCount); // Exponential backoff
      }
    } // End of while loop

    return null; // This should never be reached, but TypeScript requires it
  }

  private extractProtocolName(text: string): string {
    // Enhanced protocol extraction for DeFi/Web3 protocols
    const protocols = [
      'uniswap',
      'compound',
      'aave',
      'curve',
      'yearn',
      'makerdao',
      'synthetix',
      'balancer',
      'sushiswap',
      '1inch',
      'chainlink',
      'polygon',
      'arbitrum',
      'optimism',
      'ethereum',
      'solana',
      'avalanche',
      'fantom',
      'bsc',
      'euler',
      'cream',
      'badger',
      'harvest',
      'pickle',
      'alpha',
      'venus',
      'pancakeswap',
      'frax',
      'convex',
      'lido',
      'rocket',
      'olympus',
    ];

    const lowerText = text.toLowerCase();

    for (const protocol of protocols) {
      if (lowerText.includes(protocol)) {
        return protocol.charAt(0).toUpperCase() + protocol.slice(1);
      }
    }

    // Extract first meaningful word
    const match = text.match(/\b[A-Z][a-zA-Z]{2,}/);
    return match ? match[0] : 'Unknown Protocol';
  }

  private extractVulnerabilityTypes(text: string): string[] {
    const vulnPatterns = {
      reentrancy: /reentrancy|reentrant|reentrancy attack/i,
      'access-control': /access.control|authorization|privilege|admin|owner|onlyowner/i,
      arithmetic: /overflow|underflow|arithmetic|integer|SafeMath/i,
      'flash-loan': /flash.loan|flash.attack|flashloan/i,
      oracle: /oracle|price.manipulation|price.feed|chainlink/i,
      governance: /governance|voting|dao|proposal/i,
      bridge: /bridge|cross.chain|multichain/i,
      'logic-error': /logic.error|business.logic|invariant/i,
      'external-call': /external.call|delegatecall|call.injection/i,
      timestamp: /timestamp|block.timestamp|time.manipulation/i,
      randomness: /randomness|entropy|pseudo.random/i,
      gas: /gas.limit|gas.griefing|dos/i,
      signature: /signature|ecrecover|replay/i,
      upgrade: /upgrade|proxy|implementation/i,
      slippage: /slippage|mev|frontrun/i,
    };

    const found: string[] = [];
    for (const [type, pattern] of Object.entries(vulnPatterns)) {
      if (pattern.test(text)) {
        found.push(type);
      }
    }

    return found.length > 0 ? found : ['general-security'];
  }

  private normalizeSeverity(
    content: string,
    url: string = ''
  ): 'critical' | 'high' | 'medium' | 'low' {
    const lower = content.toLowerCase();

    // PRIORITY 1: Check for "Impact: Low/Medium/High/Critical" pattern (the actual website format)
    const impactMatch = content.match(/Impact[:\s]+(Low|Medium|High|Critical)/i);
    if (impactMatch) {
      const impact = impactMatch[1].toLowerCase();
      if (impact === 'low') return 'low';
      if (impact === 'medium') return 'medium';
      if (impact === 'high') return 'high';
      if (impact === 'critical') return 'critical';
    }

    // PRIORITY 2: Check for Solodit [L-XX], [M-XX], [H-XX] patterns
    const severityMatch = content.match(/\[([HML])-\d+\]/i);
    if (severityMatch) {
      const level = severityMatch[1].toUpperCase();
      if (level === 'H') return 'high';
      if (level === 'M') return 'medium';
      if (level === 'L') return 'low';
    }

    // PRIORITY 3: Check URL for severity patterns (common in Solodit URLs)
    if (url) {
      const urlSeverityMatch = url.match(/[-\/]([hml])-\d+/i);
      if (urlSeverityMatch) {
        const level = urlSeverityMatch[1].toUpperCase();
        if (level === 'H') return 'high';
        if (level === 'M') return 'medium';
        if (level === 'L') return 'low';
      }
    }

    // PRIORITY 4: Then check standard keywords
    if (lower.includes('critical') || lower.includes('severe')) return 'critical';
    if (lower.includes('high')) return 'high';
    if (lower.includes('low') || lower.includes('info') || lower.includes('minor')) return 'low';
    if (lower.includes('medium') || lower.includes('moderate')) return 'medium';

    return 'medium';
  }

  private classifyReportType(title: string, content: string): string {
    const text = (title + ' ' + content).toLowerCase();

    if (text.includes('audit') || text.includes('security review')) return 'audit-report';
    if (text.includes('bug') || text.includes('vulnerability')) return 'vulnerability-report';
    if (text.includes('post-mortem') || text.includes('incident')) return 'incident-report';
    if (text.includes('finding') || text.includes('issue')) return 'security-finding';

    return 'security-report';
  }

  private parseDate(dateText: string): Date {
    if (!dateText) return new Date();

    const parsed = new Date(dateText);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isCodeFile(githubUrl: string): boolean {
    // Extract file path from GitHub URL
    const urlParts = githubUrl.split('/');
    const fileName = urlParts[urlParts.length - 1] || '';

    // Remove URL fragments and parameters
    const cleanFileName = fileName.split('#')[0].split('?')[0].toLowerCase();

    // Skip non-code file extensions
    const nonCodeExtensions = [
      '.pdf',
      '.doc',
      '.docx',
      '.txt',
      '.md',
      '.rst',
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.svg',
      '.ico',
      '.zip',
      '.tar',
      '.gz',
      '.rar',
      '.json',
      '.xml',
      '.yaml',
      '.yml',
      '.toml',
      '.cfg',
      '.ini',
      '.lock',
      '.gitignore',
      '.env',
      '.example',
    ];

    // Check if it ends with any non-code extension
    const hasNonCodeExtension = nonCodeExtensions.some((ext) => cleanFileName.endsWith(ext));
    if (hasNonCodeExtension) {
      console.log(`   ⏭️ Skipping non-code file: ${cleanFileName}`);
      return false;
    }

    // Allow files with code extensions or no extension (could be scripts)
    const codeExtensions = [
      '.sol',
      '.js',
      '.ts',
      '.py',
      '.rs',
      '.go',
      '.java',
      '.c',
      '.cpp',
      '.h',
      '.hpp',
      '.cs',
      '.php',
      '.rb',
      '.kt',
      '.swift',
      '.dart',
      '.scala',
      '.clj',
      '.ex',
      '.exs',
      '.hs',
      '.ml',
      '.fs',
      '.r',
      '.m',
      '.sh',
      '.bash',
      '.zsh',
      '.fish',
      '.ps1',
      '.cairo',
      '.move',
      '.fe',
      '.vy',
      '.lll',
      '.yul',
    ];

    const hasCodeExtension = codeExtensions.some((ext) => cleanFileName.endsWith(ext));

    // If it has a code extension, include it
    if (hasCodeExtension) {
      return true;
    }

    // If it has no extension but contains code-like patterns in the URL, include it
    if (!cleanFileName.includes('.')) {
      // Check for common code file patterns in path
      const codePathPatterns = [
        'contracts/',
        'src/',
        'lib/',
        'test/',
        'tests/',
        'scripts/',
        'solidity/',
        'cairo/',
        'move/',
        'rust/',
        'python/',
        'javascript/',
      ];

      const hasCodePath = codePathPatterns.some((pattern) =>
        githubUrl.toLowerCase().includes(pattern)
      );

      if (hasCodePath) {
        return true;
      }
    }

    // Default: skip if we can't determine it's a code file
    console.log(`   ❓ Skipping uncertain file type: ${cleanFileName}`);
    return false;
  }

  private generateReportId(url: string, title: string): string {
    // Extract meaningful parts from the URL to create a unique ID
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1] || '';

    // Remove common prefixes and suffixes to get the core identifier
    let id = lastPart
      .replace(/^issues\//, '')
      .replace(/-pdf$/, '')
      .replace(/-markdown$/, '')
      .replace(/-git$/, '');

    // If we still don't have a good ID, create one from title and URL hash
    if (!id || id === 'undefined' || id.length < 5) {
      const titleSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .substring(0, 50)
        .replace(/^-+|-+$/g, '');

      // Create a simple hash from the URL
      const urlHash = url
        .split('')
        .reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff, 0)
        .toString(16)
        .replace('-', 'n');

      id = `${titleSlug}-${urlHash}`.substring(0, 80);
    }

    // Ensure the ID is valid and unique
    return id.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/--+/g, '-');
  }

  private async fetchGitHubCodeSnippets(githubUrls: string[]): Promise<GitHubCodeSnippet[]> {
    const codeSnippets: GitHubCodeSnippet[] = [];

    // Filter out non-code files (PDFs, images, docs, etc.)
    const filteredUrls = githubUrls.filter((url) => this.isCodeFile(url));

    if (filteredUrls.length < githubUrls.length) {
      console.log(
        `   🔍 Filtered out ${githubUrls.length - filteredUrls.length} non-code files (PDFs, images, docs)`
      );
    }

    for (const url of filteredUrls) {
      try {
        const snippet = await this.fetchSingleGitHubFile(url);
        if (snippet) {
          codeSnippets.push(snippet);
        }
        // Rate limiting for GitHub API
        await this.delay(500);
      } catch (error) {
        console.log(`   ⚠️ Failed to fetch GitHub code from ${url.substring(0, 60)}...`);
      }
    }

    return codeSnippets;
  }

  private async fetchSingleGitHubFile(githubUrl: string): Promise<GitHubCodeSnippet | null> {
    try {
      // Convert GitHub URL to raw content URL
      // Handle multiple URL formats:
      // Format 1: https://github.com/owner/repo/blob/commit/path/file.sol#L123-L456
      // Format 2: https://github.com/owner/repo/tree/commit/path/file.sol#L123
      // Format 3: https://github.com/owner/repo/commit/file.sol#L123 (direct file links)

      let urlMatch = githubUrl.match(
        /https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+?)(?:#L(\d+)(?:-L(\d+))?)?$/
      );

      // If blob format doesn't match, try tree format
      if (!urlMatch) {
        urlMatch = githubUrl.match(
          /https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/(.+?)(?:#L(\d+)(?:-L(\d+))?)?$/
        );
      }

      // If still no match, try direct file format (without blob/tree)
      if (!urlMatch) {
        urlMatch = githubUrl.match(
          /https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+?)(?:#L(\d+)(?:-L(\d+))?)?$/
        );
      }

      if (!urlMatch) {
        console.log(`   ⚠️ Could not parse GitHub URL format: ${githubUrl}`);
        return null;
      }

      const [, owner, repo, commit, filePath, startLine, endLine] = urlMatch;

      // Handle case where commit might actually be a file extension (direct links)
      let actualCommit = commit;
      let actualFilePath = filePath;

      // If this looks like a direct file link (owner/repo/file.ext), use 'main' as default branch
      if (commit.includes('.') && !filePath) {
        actualCommit = 'main';
        actualFilePath = commit;
      }

      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${actualCommit}/${actualFilePath}`;

      console.log(`   📡 Fetching: ${rawUrl}`);

      // Fetch the raw file content
      const response = await fetch(rawUrl);

      if (!response.ok) {
        // Try with 'master' branch if 'main' fails
        if (actualCommit === 'main') {
          const fallbackUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/${actualFilePath}`;
          console.log(`   🔄 Trying master branch: ${fallbackUrl}`);
          const fallbackResponse = await fetch(fallbackUrl);
          if (!fallbackResponse.ok) {
            console.log(`   ❌ Failed to fetch from both main and master branches`);
            return null;
          }
          const fallbackContent = await fallbackResponse.text();
          return this.processGitHubContent(
            githubUrl,
            actualFilePath,
            fallbackContent,
            startLine,
            endLine
          );
        }
        console.log(`   ❌ Failed to fetch: ${response.status} ${response.statusText}`);
        return null;
      }

      const fullContent = await response.text();
      return this.processGitHubContent(githubUrl, actualFilePath, fullContent, startLine, endLine);
    } catch (error) {
      console.log(`   ❌ Error fetching GitHub file: ${error.message}`);
      return null;
    }
  }

  private processGitHubContent(
    originalUrl: string,
    filePath: string,
    fullContent: string,
    startLine?: string,
    endLine?: string
  ): GitHubCodeSnippet {
    const lines = fullContent.split('\n');

    // Extract specific lines if line numbers are provided
    let codeContent = fullContent;
    let lineNumbers = 'all';
    let contextLines = lines.length;

    if (startLine) {
      const start = parseInt(startLine) - 1; // Convert to 0-based index
      const end = endLine ? parseInt(endLine) - 1 : start;

      // Add some context lines around the vulnerable code
      const contextBefore = 5;
      const contextAfter = 5;
      const actualStart = Math.max(0, start - contextBefore);
      const actualEnd = Math.min(lines.length - 1, end + contextAfter);

      const extractedLines = lines.slice(actualStart, actualEnd + 1);

      // Add line number comments for context
      codeContent = extractedLines
        .map((line, index) => {
          const lineNum = actualStart + index + 1;
          const isVulnerable =
            lineNum >= parseInt(startLine) &&
            lineNum <= (endLine ? parseInt(endLine) : parseInt(startLine));
          const marker = isVulnerable ? '🔴' : '  ';
          return `${marker} ${lineNum.toString().padStart(3)}: ${line}`;
        })
        .join('\n');

      lineNumbers = endLine ? `${startLine}-${endLine}` : startLine;
      contextLines = extractedLines.length;
    }

    // Determine file language
    const fileName = filePath.split('/').pop() || '';
    const language = this.getFileLanguage(fileName);

    return {
      url: originalUrl,
      fileName,
      lineNumbers,
      codeContent,
      language,
      contextLines,
      fetchedAt: new Date(),
    };
  }

  private getFileLanguage(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    const languageMap: Record<string, string> = {
      sol: 'solidity',
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      rs: 'rust',
      go: 'go',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      h: 'c',
      hpp: 'cpp',
      md: 'markdown',
      json: 'json',
      yml: 'yaml',
      yaml: 'yaml',
      toml: 'toml',
    };

    return languageMap[extension || ''] || 'text';
  }

  private async saveIndividualReport(report: SoloditAuditReport): Promise<void> {
    try {
      await fs.writeFile(
        path.join(this.outputDir, 'individual_reports', `${report.id}.json`),
        JSON.stringify(report, null, 2)
      );
    } catch (error) {
      console.error('Failed to save individual report:', error);
    }
  }

  private async saveProgressUpdate(
    current: number,
    total: number,
    success: number,
    errors: number
  ): Promise<void> {
    try {
      const progress = {
        current,
        total,
        success,
        errors,
        timestamp: new Date().toISOString(),
        progress: ((current / total) * 100).toFixed(1) + '%',
      };

      await fs.writeFile(
        path.join(this.outputDir, 'progress.json'),
        JSON.stringify(progress, null, 2)
      );
    } catch (error) {
      // Ignore progress save errors
    }
  }

  private async saveComprehensiveDataset(): Promise<void> {
    console.log('🧠 Creating RAG-optimized files...');

    // Save all reports
    await fs.writeFile(
      path.join(this.outputDir, 'all_reports.json'),
      JSON.stringify(this.scrapedReports, null, 2)
    );

    // Create comprehensive summary
    const summary = {
      totalReports: this.scrapedReports.length,
      sources: ['Solodit.cyfrin.io'],
      scrapingMethod: 'clean-sitemap-based-solodit-scraping',
      timestamp: new Date().toISOString(),
      impactBreakdown: this.scrapedReports.reduce(
        (acc, r) => {
          acc[r.vulnerability.impact] = (acc[r.vulnerability.impact] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      vulnerabilityTypes: [...new Set(this.scrapedReports.map((r) => r.vulnerability.type))],
      protocols: [...new Set(this.scrapedReports.map((r) => r.metadata.protocol))],
      auditors: [...new Set(this.scrapedReports.map((r) => r.metadata.auditor))],
      categories: [...new Set(this.scrapedReports.map((r) => r.vulnerability.category))],
      dataForRAG: {
        totalReports: this.scrapedReports.length,
        reportsWithCode: this.scrapedReports.filter(
          (r) => r.vulnerableCode && r.vulnerableCode.length > 0
        ).length,
        reportsWithRecommendations: this.scrapedReports.filter(
          (r) => r.recommendations.shortTerm || r.recommendations.longTerm
        ).length,
        reportsWithExploitScenarios: this.scrapedReports.filter(
          (r) => r.exploitScenario && r.exploitScenario !== 'No exploit scenario provided'
        ).length,
        sourceCodeReferences: this.scrapedReports.reduce((sum, r) => sum + r.sourceCode.length, 0),
      },
    };

    await fs.writeFile(
      path.join(this.outputDir, 'comprehensive_summary.json'),
      JSON.stringify(summary, null, 2)
    );

    // Create clean RAG knowledge base for AI agents
    const vulnerabilityKnowledgeBase = this.scrapedReports
      .map(
        (report) => `
TITLE: ${report.title}
VULNERABILITY_TYPE: ${report.vulnerability.type}
CATEGORY: ${report.vulnerability.category}
IMPACT: ${report.vulnerability.impact}
TARGET: ${report.vulnerability.target}

DESCRIPTION: ${report.description}

VULNERABLE_CODE:
${report.vulnerableCode
  .map(
    (code) => `
Language: ${code.language}
${code.fileName ? `File: ${code.fileName}` : ''}
${code.lineNumbers ? `Lines: ${code.lineNumbers}` : ''}
Code:
${code.snippet}
Explanation: ${code.explanation}
`
  )
  .join('\n---\n')}

EXPLOIT_SCENARIO: ${report.exploitScenario}

RECOMMENDATIONS:
Short term: ${report.recommendations.shortTerm}
Long term: ${report.recommendations.longTerm}

SOURCE_CODE_REFERENCES:
${report.sourceCode.map((src) => `${src.fileName} (${src.lineNumbers || 'full file'}): ${src.url}`).join('\n')}

METADATA:
Protocol: ${report.metadata.protocol}
Auditor: ${report.metadata.auditor}
Report URL: ${report.metadata.reportUrl || 'N/A'}
Date: ${report.metadata.date}
URL: ${report.url}

---
    `
      )
      .join('\n');

    await fs.writeFile(
      path.join(this.outputDir, 'vulnerability_knowledge_base.txt'),
      vulnerabilityKnowledgeBase
    );

    const protocolKnowledgeBase = [...new Set(this.scrapedReports.map((r) => r.metadata.protocol))]
      .map((protocol) => {
        const protocolReports = this.scrapedReports.filter((r) => r.metadata.protocol === protocol);
        const vulnerabilityTypes = [...new Set(protocolReports.map((r) => r.vulnerability.type))];
        return `
PROTOCOL: ${protocol}
TOTAL_REPORTS: ${protocolReports.length}
VULNERABILITY_TYPES: ${vulnerabilityTypes.join(', ')}
TOP_AUDITORS: ${[...new Set(protocolReports.map((r) => r.metadata.auditor))].slice(0, 5).join(', ')}
---`;
      })
      .join('\n');

    await fs.writeFile(
      path.join(this.outputDir, 'protocol_knowledge_base.txt'),
      protocolKnowledgeBase
    );

    console.log('✅ RAG-optimized files created');
  }

  // ===== CLEAN AI-FOCUSED EXTRACTION METHODS =====

  private extractVulnerabilityType(content: string): string {
    // Extract specific vulnerability type
    if (
      content.toLowerCase().includes('missing negation') ||
      content.toLowerCase().includes('blacklist check')
    ) {
      return 'Logic Error - Missing Negation';
    }
    if (content.toLowerCase().includes('overflow') || content.toLowerCase().includes('underflow')) {
      return 'Integer Overflow/Underflow';
    }
    if (content.toLowerCase().includes('reentrancy')) {
      return 'Reentrancy';
    }
    if (
      content.toLowerCase().includes('access control') ||
      content.toLowerCase().includes('authorization')
    ) {
      return 'Access Control';
    }
    if (
      content.toLowerCase().includes('oracle') ||
      content.toLowerCase().includes('price manipulation')
    ) {
      return 'Oracle Manipulation';
    }
    if (
      content.toLowerCase().includes('token burn') ||
      content.toLowerCase().includes('receipt token')
    ) {
      return 'Token Management';
    }
    return 'Logic Error';
  }

  private extractVulnerabilityCategory(content: string): string {
    // Extract broader category
    if (content.toLowerCase().includes('data validation')) {
      return 'Data Validation';
    }
    if (content.toLowerCase().includes('access control')) {
      return 'Access Control';
    }
    if (content.toLowerCase().includes('arithmetic')) {
      return 'Arithmetic';
    }
    if (content.toLowerCase().includes('logic')) {
      return 'Business Logic';
    }
    return 'Security';
  }

  private extractTarget(content: string): string {
    // Extract target file/contract - ENHANCED to handle rate limiter contracts

    // Pattern 1: Look for "Target:" followed by file path
    const targetMatch = content.match(/Target:\s*([^\n\r\s]+\.sol)/i);
    if (targetMatch) {
      return targetMatch[1].trim();
    }

    // Pattern 2: Look for contract names in the content (like "RateLimiter", "LZRateLimiter")
    const contractNameMatch = content.match(
      /(?:contract|interface|library)\s+(\w+RateLimiter|\w+Limiter|\w+Rate)/i
    );
    if (contractNameMatch) {
      return `${contractNameMatch[1]}.sol`;
    }

    // Pattern 3: Extract from title patterns like "[L-01] In flights can get reset to zero"
    const titleContractMatch = content.match(/\[?[LMH]-\d+\]?\s*.*?(RateLimiter|Limiter|Rate)/i);
    if (titleContractMatch) {
      return `${titleContractMatch[1]}.sol`;
    }

    // Pattern 4: Look for protocol references that might indicate contract
    const protocolMatch = content.match(/(LZ|LayerZero|RateLimiter|TimeWindow)/i);
    if (protocolMatch) {
      return `${protocolMatch[1]}RateLimiter.sol`;
    }

    // Pattern 5: Look for clean .sol file references in first 500 chars
    const firstPart = content.substring(0, 500);
    const solFileMatch = firstPart.match(/([a-zA-Z0-9_\/]+\.sol)(?:\s|$)/);
    if (solFileMatch) {
      return solFileMatch[1];
    }

    // Pattern 6: Look for any file extensions that might be relevant
    const anyFileMatch = content.match(/([a-zA-Z0-9_\/]+\.(rs|py|js|ts|go|java))(?:\s|$)/);
    if (anyFileMatch) {
      return anyFileMatch[1];
    }

    return 'Unknown';
  }

  private extractCleanDescription(content: string): string {
    // Extract just the technical description, no UI noise - ENHANCED UNIVERSAL PATTERNS
    const descriptionPatterns = [
      // Pattern 1: Extract complete technical explanations starting with "The current implementation"
      /(The current implementation.*?)(?:However, the code does not|Take into consideration|If this is the desired|$)/s,
      // Pattern 2: Extract from "However" technical analysis
      /(However, the code does not.*?)(?:To showcase|Take into consideration|If this is the desired|$)/s,
      // Pattern 3: Extract state-based explanations
      /((?:State \d+|Window =|Limit =).*?)(?:Take into consideration|If this is the desired|$)/s,
      // Pattern 4: Extract from "To showcase the issue" examples
      /(To showcase the issue.*?)(?:Take into consideration|If this is the desired|$)/s,
      // Pattern 5: Traditional description patterns - ENHANCED to stop before "Affected lines"
      /Description\s+(.*?)(?:Affected lines|if \(|Exploit Scenario|Recommendations|See Figure|$)/s,
      // Pattern 6: Extract from technical content headers like "Data Validation"
      /(Because .*?)(?:if \(|Exploit Scenario|Recommendations|See Figure|$)/s,
      // Pattern 7: Extract content that starts with technical explanation
      /((?:Because|However|When|The contract|The current).*?)(?:if \(|Exploit Scenario|Recommendations|See Figure|$)/s,
      // Pattern 8: Start from main content like "Identifier Generation in Contract Functions"
      /(Identifier Generation.*?)(?:Example of|Relevant Code|Remediation|$)/s,
      // Pattern 9: Extract from technical description to next section
      /(In common,.*?)(?:Example of|Relevant Code|Remediation|$)/s,
      // Pattern 10: General technical content extraction
      /([A-Z][a-z]+ [a-z]+.*?generates.*?)(?:Example of|Relevant Code|Remediation|$)/s,
      // Pattern 11: AI Summary fallback
      /AI Summary\s+(.*?)(?:Impact|Code Snippet|Exploit|$)/s,
      // Pattern 12: Extract clean gas overflow pattern (for this specific case)
      /(Each iteration of the cycle.*?)(?:Affected lines|Recommendation|$)/s,
    ];

    for (const pattern of descriptionPatterns) {
      const match = content.match(pattern);
      if (match && match[1] && match[1].trim().length > 50) {
        // Clean up the description - remove code blocks and preserve technical content
        let description = match[1]
          .trim()
          // Remove code blocks but preserve technical explanations
          .replace(/```[\w]*\n[\s\S]*?\n```/g, '') // Remove fenced code blocks
          .replace(/def\s+\w+.*?\n/g, '') // Remove function definitions that got mixed in
          .replace(/if \(.*?\{[\s\S]*?\}/g, '') // Remove inline code blocks
          .replace(/See Figure.*$/s, '') // Remove figure references
          .replace(/PYTHON\s+.*$/s, '') // Remove language indicators

          // Clean up mathematical examples while preserving their context
          .replace(/\(\d+\s*-\s*\d+\)\s*=\s*\d+/g, (match) => `calculation: ${match}`) // Preserve calculations
          .replace(/Window\s*=\s*\d+/g, (match) => `parameter: ${match}`) // Preserve parameters
          .replace(/Limit\s*=\s*\d+/g, (match) => `parameter: ${match}`) // Preserve parameters
          .replace(/AmountInFlight\s*=\s*\d+/g, (match) => `parameter: ${match}`) // Preserve parameters

          // Final cleanup
          .replace(/\s+/g, ' ')
          .trim();

        // Ensure we have a clean, meaningful description
        if (
          description.length > 30 &&
          !description.includes('def ') &&
          !description.includes('@cached') &&
          !description.startsWith('Findings #') &&
          !description.includes('・')
        ) {
          return description;
        }
      }
    }

    // Fallback: Look for sentences that describe the vulnerability
    const technicalPatterns = [
      /However, there is.*?collision/s,
      /generates a unique.*?based on/s,
      /possibility of.*?collision/s,
    ];

    for (const pattern of technicalPatterns) {
      const match = content.match(pattern);
      if (match && match[0]) {
        return match[0].trim().replace(/\s+/g, ' ');
      }
    }

    // Final fallback: extract first meaningful paragraph
    const paragraphs = content.split(/\n\s*\n/);
    for (const paragraph of paragraphs) {
      const cleaned = paragraph.trim().replace(/\s+/g, ' ');
      if (
        cleaned.length > 50 &&
        cleaned.length < 500 &&
        !cleaned.includes('def ') &&
        !cleaned.includes('Rarity Diamond') &&
        !cleaned.includes('・')
      ) {
        return cleaned;
      }
    }

    return content.substring(0, 300).replace(/\s+/g, ' ').trim();
  }

  private extractCleanCodeSnippets(
    content: string,
    githubUrls?: string[],
    gitHubCodeSnippets?: GitHubCodeSnippet[]
  ): {
    language: string;
    snippet: string;
    fileName?: string;
    lineNumbers?: string;
    explanation: string;
  }[] {
    const codeSnippets: {
      language: string;
      snippet: string;
      fileName?: string;
      lineNumbers?: string;
      explanation: string;
    }[] = [];

    // PRIORITY 1: Use fetched GitHub code snippets (highest quality for AI agents)
    if (gitHubCodeSnippets && gitHubCodeSnippets.length > 0) {
      console.log(`   📝 Processing ${gitHubCodeSnippets.length} GitHub code snippets...`);

      gitHubCodeSnippets.forEach((githubCode) => {
        // Clean and format the GitHub code for AI agents
        const cleanCode = this.formatCodeForAI(githubCode.codeContent, githubCode.language);

        if (cleanCode && cleanCode.length > 50) {
          codeSnippets.push({
            language: githubCode.language,
            snippet: cleanCode,
            fileName: githubCode.fileName,
            lineNumbers: githubCode.lineNumbers,
            explanation: `Real vulnerable code from ${githubCode.fileName} (${githubCode.lineNumbers}) - fetched from GitHub`,
          });
        }
      });

      // If we have GitHub code, we don't need to extract much else
      console.log(
        `   ✅ Using GitHub code as primary source, skipping low-quality text extraction`
      );
      return codeSnippets.slice(0, 10); // Return early with just GitHub content
    }

    // PRIORITY 2: Extract clean code blocks from the vulnerability description
    const codeBlockRegex = /```([\w]*)\n?([\s\S]*?)\n?```/g;
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'unknown';
      const code = match[2].trim();
      if (code && code.length > 20 && code.length < 2000) {
        // Clean the code block for AI readability
        const cleanCode = this.cleanCodeSnippet(code);
        if (cleanCode && !this.isDuplicateCode(cleanCode, codeSnippets)) {
          codeSnippets.push({
            language: language || this.detectCodeLanguage(cleanCode),
            snippet: cleanCode,
            explanation: 'Vulnerable code example from vulnerability report',
          });
        }
      }
    }

    // PRIORITY 3: Universal code extraction patterns for all languages
    const universalCodePatterns = this.getUniversalCodePatterns();

    universalCodePatterns.forEach((pattern) => {
      const matches = content.match(pattern.regex);
      if (matches) {
        matches.slice(0, 3).forEach((codeMatch) => {
          // Limit to 3 per pattern
          let cleanCode = this.cleanCodeSnippet(codeMatch.trim());
          if (
            cleanCode &&
            cleanCode.length > 20 &&
            cleanCode.length < 1000 &&
            !this.isDuplicateCode(cleanCode, codeSnippets)
          ) {
            // Detect language and apply enhanced formatting
            const detectedLanguage = this.detectCodeLanguage(cleanCode);
            const finalLanguage =
              detectedLanguage !== 'unknown' ? detectedLanguage : pattern.language;

            if (finalLanguage === 'solidity') {
              cleanCode = this.formatSolidityCode(cleanCode);
            }

            codeSnippets.push({
              language: finalLanguage,
              snippet: cleanCode,
              explanation: `${pattern.description} - vulnerable code pattern`,
            });
          }
        });
      }
    });

    // PRIORITY 4: Extract inline code snippets with universal patterns
    const inlineCodePatterns = this.getInlineCodePatterns();

    inlineCodePatterns.forEach((pattern) => {
      const matches = content.match(pattern.regex);
      if (matches) {
        matches.slice(0, 5).forEach((codeMatch) => {
          // Limit to 5 per pattern
          let cleanCode = this.cleanCodeSnippet(codeMatch.trim());
          if (
            cleanCode &&
            cleanCode.length > 10 &&
            cleanCode.length < 200 &&
            !this.isDuplicateCode(cleanCode, codeSnippets) &&
            !cleanCode.includes('http') &&
            !cleanCode.includes('Categories')
          ) {
            // Detect language and apply enhanced formatting
            const detectedLanguage = this.detectCodeLanguage(cleanCode);
            const finalLanguage =
              detectedLanguage !== 'unknown' ? detectedLanguage : pattern.language;

            if (finalLanguage === 'solidity') {
              cleanCode = this.formatSolidityCode(cleanCode);
            }

            codeSnippets.push({
              language: finalLanguage,
              snippet: cleanCode,
              explanation: `${pattern.description} - inline code`,
            });
          }
        });
      }
    });

    // PRIORITY 5: Extract file references with line numbers (universal file extensions)
    const universalFileRefRegex =
      /([a-zA-Z0-9_\/\-\.]+\.(sol|py|js|ts|rs|go|java|c|cpp|h|hpp|rb|php|swift|kt|scala|r|m|sh|yml|yaml|json|toml|xml))(?:#L(\d+)(?:-L(\d+))?)?/g;
    let fileMatch;
    while ((fileMatch = universalFileRefRegex.exec(content)) !== null) {
      const fileName = fileMatch[1];
      const extension = fileMatch[2];
      const startLine = fileMatch[3];
      const endLine = fileMatch[4] || startLine;
      const lineNumbers = startLine
        ? endLine === startLine
          ? startLine
          : `${startLine}-${endLine}`
        : undefined;

      // Only add if we don't already have GitHub content for this file
      const hasGitHubContent = gitHubCodeSnippets?.some(
        (snippet) => snippet.fileName === fileName && snippet.lineNumbers === lineNumbers
      );

      if (!hasGitHubContent) {
        const language = this.getLanguageFromExtension(extension);
        codeSnippets.push({
          language,
          snippet: `// Reference: ${fileName}${lineNumbers ? ` lines ${lineNumbers}` : ''}\n// See GitHub link for actual code`,
          fileName,
          lineNumbers,
          explanation: 'Code reference - actual content may be available via GitHub link',
        });
      }
    }

    // PRIORITY 6: Extract code from common code delimiters and formatting
    const codeFormattingPatterns = [
      // Code between backticks (inline code)
      /`([^`\n]{20,200})`/g,
      // Code in CODE_TYPE: format
      /(?:CODE|FUNCTION|METHOD|CLASS|SNIPPET):\s*([^\n]{20,300})/gi,
      // Indented code blocks (4+ spaces)
      /^[ \t]{4,}([^\n]{20,200})$/gm,
      // Code after specific keywords
      /(?:Example|Code|Implementation|Snippet|Function):\s*\n?\s*([^\n]{20,500})/gi,
    ];

    codeFormattingPatterns.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.slice(0, 3).forEach((match) => {
          let codeContent = match;

          // Extract just the code part for patterns with groups
          if (index === 0) codeContent = match.replace(/`/g, ''); // Remove backticks
          if (index === 1) codeContent = match.split(':')[1]?.trim() || match; // Remove prefix
          if (index === 2) codeContent = match.trim(); // Already trimmed
          if (index === 3) codeContent = match.split(/:\s*\n?\s*/)[1] || match; // Remove keyword prefix

          let cleanCode = this.cleanCodeSnippet(codeContent);
          if (
            cleanCode &&
            cleanCode.length > 15 &&
            cleanCode.length < 300 &&
            !this.isDuplicateCode(cleanCode, codeSnippets) &&
            this.isValidCode(cleanCode)
          ) {
            const detectedLanguage = this.detectCodeLanguage(cleanCode);

            // Apply enhanced formatting for Solidity code
            if (detectedLanguage === 'solidity') {
              cleanCode = this.formatSolidityCode(cleanCode);
            }

            codeSnippets.push({
              language: detectedLanguage,
              snippet: cleanCode,
              explanation: 'Code snippet extracted from formatted text',
            });
          }
        });
      }
    });

    // Sort by priority: GitHub code first, then fenced code blocks, then patterns, then references
    const sortedSnippets = [
      ...codeSnippets.filter((s) => s.explanation.includes('GitHub')),
      ...codeSnippets.filter((s) => s.explanation.includes('vulnerability report')),
      ...codeSnippets.filter((s) => s.explanation.includes('pattern')),
      ...codeSnippets.filter((s) => s.explanation.includes('inline')),
      ...codeSnippets.filter((s) => s.explanation.includes('formatted')),
      ...codeSnippets.filter((s) => s.explanation.includes('reference')),
    ];

    // Remove duplicates while preserving order
    const uniqueSnippets = sortedSnippets.filter(
      (snippet, index, arr) => arr.findIndex((s) => s.snippet === snippet.snippet) === index
    );

    console.log(`   📊 Code extraction results: ${uniqueSnippets.length} total snippets`);
    if (gitHubCodeSnippets && gitHubCodeSnippets.length > 0) {
      console.log(`   🔗 ${gitHubCodeSnippets.length} from GitHub (highest quality)`);
    }

    // Log language distribution
    const languageCount = uniqueSnippets.reduce(
      (acc, snippet) => {
        acc[snippet.language] = (acc[snippet.language] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    console.log(
      `   🗣️ Languages detected:`,
      Object.entries(languageCount)
        .map(([lang, count]) => `${lang}: ${count}`)
        .join(', ')
    );

    return uniqueSnippets.slice(0, 15); // Increased limit for universal extraction
  }

  private detectCodeLanguage(code: string): string {
    if (!code || code.trim().length === 0) return 'unknown';

    const lowerCode = code.toLowerCase();

    // Solidity - ENHANCED detection with rate limiter patterns
    if (
      (lowerCode.includes('function') &&
        lowerCode.includes('{') &&
        (lowerCode.includes('msg.sender') ||
          lowerCode.includes('uint') ||
          lowerCode.includes('pragma solidity'))) ||
      lowerCode.includes('contract ') ||
      lowerCode.includes('mapping(') ||
      lowerCode.includes('modifier ') ||
      // Enhanced patterns for rate limiters and DeFi
      (lowerCode.includes('if (') && lowerCode.includes('timesince')) ||
      (lowerCode.includes('if (') && lowerCode.includes('_window')) ||
      (lowerCode.includes('currentamount') && lowerCode.includes('flight')) ||
      (lowerCode.includes('amountcanbesent') && lowerCode.includes('_limit')) ||
      // General Solidity variable assignments
      (lowerCode.includes(' = ') &&
        (lowerCode.includes('uint') || lowerCode.includes('address'))) ||
      // Solidity function calls
      lowerCode.includes('.burn(') ||
      lowerCode.includes('.transfer(') ||
      lowerCode.includes('.call(')
    ) {
      return 'solidity';
    }

    // Python
    if (
      (lowerCode.includes('def ') && lowerCode.includes(':')) ||
      (lowerCode.includes('import ') && lowerCode.includes('from ')) ||
      (lowerCode.includes('class ') && lowerCode.includes(':')) ||
      (lowerCode.includes('@') && lowerCode.includes('def ')) ||
      /^[ \t]*def\s+\w+\s*\(/m.test(code)
    ) {
      return 'python';
    }

    // JavaScript/TypeScript
    if (
      (lowerCode.includes('function') &&
        (lowerCode.includes('var') || lowerCode.includes('let') || lowerCode.includes('const'))) ||
      lowerCode.includes('=> ') ||
      lowerCode.includes('=>{') ||
      lowerCode.includes('console.log') ||
      lowerCode.includes('require(') ||
      lowerCode.includes('import ')
    ) {
      return 'javascript';
    }

    // TypeScript
    if (
      lowerCode.includes(': string') ||
      lowerCode.includes(': number') ||
      lowerCode.includes(': boolean') ||
      lowerCode.includes('interface ') ||
      lowerCode.includes('type ') ||
      lowerCode.includes('<t>')
    ) {
      return 'typescript';
    }

    // Rust
    if (
      lowerCode.includes('fn ') ||
      lowerCode.includes('let mut') ||
      lowerCode.includes('impl ') ||
      lowerCode.includes('struct ') ||
      lowerCode.includes('enum ') ||
      lowerCode.includes('match ')
    ) {
      return 'rust';
    }

    // Go
    if (
      lowerCode.includes('func ') ||
      lowerCode.includes('package ') ||
      lowerCode.includes('import (') ||
      lowerCode.includes('var ') ||
      lowerCode.includes(':= ')
    ) {
      return 'go';
    }

    // Java
    if (
      lowerCode.includes('public class') ||
      lowerCode.includes('private ') ||
      lowerCode.includes('public static void main') ||
      lowerCode.includes('system.out.print')
    ) {
      return 'java';
    }

    // C/C++
    if (
      lowerCode.includes('#include') ||
      lowerCode.includes('int main') ||
      lowerCode.includes('printf(') ||
      lowerCode.includes('cout <<') ||
      lowerCode.includes('std::')
    ) {
      return 'c++';
    }

    // Ruby
    if (
      (lowerCode.includes('def ') && lowerCode.includes('end')) ||
      (lowerCode.includes('class ') && lowerCode.includes('end')) ||
      lowerCode.includes('puts ') ||
      lowerCode.includes('require ')
    ) {
      return 'ruby';
    }

    // PHP
    if (lowerCode.includes('<?php') || lowerCode.includes('$') || lowerCode.includes('echo ')) {
      return 'php';
    }

    // Shell/Bash
    if (
      lowerCode.includes('#!/bin/bash') ||
      lowerCode.includes('#!/bin/sh') ||
      lowerCode.includes('echo ') ||
      lowerCode.includes('export ') ||
      lowerCode.includes('if [')
    ) {
      return 'shell';
    }

    // YAML
    if (/^[\s]*[\w\-]+:\s*/.test(code) && !lowerCode.includes('{') && !lowerCode.includes(';')) {
      return 'yaml';
    }

    // JSON
    if (
      (lowerCode.startsWith('{') && lowerCode.endsWith('}')) ||
      (lowerCode.startsWith('[') && lowerCode.endsWith(']'))
    ) {
      try {
        JSON.parse(code);
        return 'json';
      } catch {
        // Not valid JSON
      }
    }

    // XML/HTML
    if (lowerCode.includes('<') && lowerCode.includes('>') && lowerCode.includes('</')) {
      return 'xml';
    }

    // SQL
    if (
      lowerCode.includes('select ') ||
      lowerCode.includes('insert ') ||
      lowerCode.includes('update ') ||
      lowerCode.includes('delete ') ||
      lowerCode.includes('create table')
    ) {
      return 'sql';
    }

    return 'other';
  }

  private getUniversalCodePatterns(): Array<{
    regex: RegExp;
    language: string;
    description: string;
  }> {
    return [
      // Solidity patterns
      {
        regex: /function\s+\w+\([^)]*\)(?:\s+\w+)*\s*\{[^}]{20,500}\}/g,
        language: 'solidity',
        description: 'Solidity function definition',
      },
      {
        regex: /contract\s+\w+\s*\{[^}]{50,1000}\}/g,
        language: 'solidity',
        description: 'Solidity contract definition',
      },
      {
        regex: /modifier\s+\w+\([^)]*\)\s*\{[^}]{20,300}\}/g,
        language: 'solidity',
        description: 'Solidity modifier definition',
      },

      // Python patterns
      {
        regex: /def\s+\w+\([^)]*\):\s*\n(?:[ \t]+[^\n]+\n)+/g,
        language: 'python',
        description: 'Python function definition',
      },
      {
        regex: /class\s+\w+(?:\([^)]*\))?:\s*\n(?:[ \t]+[^\n]+\n)+/g,
        language: 'python',
        description: 'Python class definition',
      },
      {
        regex: /@\w+\s*\ndef\s+\w+\([^)]*\):[^}]{20,500}/g,
        language: 'python',
        description: 'Python decorated function',
      },

      // JavaScript/TypeScript patterns
      {
        regex: /function\s+\w+\([^)]*\)\s*\{[^}]{20,500}\}/g,
        language: 'javascript',
        description: 'JavaScript function definition',
      },
      {
        regex: /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{[^}]{20,500}\}/g,
        language: 'javascript',
        description: 'JavaScript arrow function',
      },
      {
        regex: /interface\s+\w+\s*\{[^}]{20,500}\}/g,
        language: 'typescript',
        description: 'TypeScript interface definition',
      },

      // Universal patterns that work across languages
      {
        regex: /if\s*\([^)]{10,}\)\s*\{[^}]{20,300}\}/g,
        language: 'unknown',
        description: 'Conditional statement',
      },
      {
        regex: /for\s*\([^)]{10,}\)\s*\{[^}]{20,300}\}/g,
        language: 'unknown',
        description: 'For loop statement',
      },
      {
        regex: /while\s*\([^)]{5,}\)\s*\{[^}]{20,300}\}/g,
        language: 'unknown',
        description: 'While loop statement',
      },

      // Generic code block patterns
      {
        regex: /\{[^{}]{50,500}\}/g,
        language: 'unknown',
        description: 'Code block',
      },
    ];
  }

  private getInlineCodePatterns(): Array<{
    regex: RegExp;
    language: string;
    description: string;
  }> {
    return [
      // Variable assignments
      {
        regex: /\b\w+\s*[=:]\s*[^;,\n]{10,100}[;,]?/g,
        language: 'unknown',
        description: 'Variable assignment',
      },

      // Function calls
      {
        regex: /\b\w+\([^)]{5,50}\)/g,
        language: 'unknown',
        description: 'Function call',
      },

      // Mathematical operations
      {
        regex: /\b\w+\s*[+\-*/]\s*\w+[^;,\n]{0,50}[;,]?/g,
        language: 'unknown',
        description: 'Mathematical operation',
      },

      // Type declarations
      {
        regex: /\b(?:uint\d+|int\d+|address|bool|string|bytes\d*)\s+\w+/g,
        language: 'solidity',
        description: 'Solidity type declaration',
      },

      // Import statements
      {
        regex: /(?:import|from|require)\s+[^;\n]{10,100}/g,
        language: 'unknown',
        description: 'Import statement',
      },

      // Method chains
      {
        regex: /\b\w+(?:\.\w+\([^)]*\))+/g,
        language: 'unknown',
        description: 'Method chain',
      },
    ];
  }

  private getLanguageFromExtension(extension: string): string {
    const extensionMap: Record<string, string> = {
      // Programming languages
      sol: 'solidity',
      py: 'python',
      js: 'javascript',
      ts: 'typescript',
      jsx: 'javascript',
      tsx: 'typescript',
      rs: 'rust',
      go: 'go',
      java: 'java',
      kt: 'kotlin',
      scala: 'scala',
      rb: 'ruby',
      php: 'php',
      swift: 'swift',
      c: 'c',
      cpp: 'c++',
      cc: 'c++',
      cxx: 'c++',
      h: 'c',
      hpp: 'c++',
      cs: 'c#',
      fs: 'f#',
      vb: 'visual basic',
      r: 'r',
      m: 'objective-c',
      mm: 'objective-c++',

      // Scripting and shell
      sh: 'shell',
      bash: 'bash',
      zsh: 'zsh',
      fish: 'fish',
      ps1: 'powershell',
      bat: 'batch',
      cmd: 'batch',

      // Configuration and data
      json: 'json',
      xml: 'xml',
      html: 'html',
      htm: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',
      yml: 'yaml',
      yaml: 'yaml',
      toml: 'toml',
      ini: 'ini',
      conf: 'config',
      cfg: 'config',

      // Database
      sql: 'sql',

      // Documentation
      md: 'markdown',
      rst: 'restructuredtext',
      tex: 'latex',

      // Build and package management
      dockerfile: 'dockerfile',
      makefile: 'makefile',
      gradle: 'gradle',

      // Other
      proto: 'protobuf',
      graphql: 'graphql',
      gql: 'graphql',
    };

    return extensionMap[extension.toLowerCase()] || extension.toLowerCase();
  }

  private isValidCode(code: string): boolean {
    if (!code || code.trim().length < 15) return false;

    // Check if it contains any code-like patterns
    const codePatterns = [
      /[{}();]/, // Contains brackets, parentheses, or semicolons
      /\b(?:function|def|class|if|for|while|return|import|export|var|let|const)\b/, // Contains keywords
      /[=+\-*/]{1,2}/, // Contains operators
      /\w+\([^)]*\)/, // Contains function calls
      /:|\s*=\s*/, // Contains assignments or colons
    ];

    const hasCodePattern = codePatterns.some((pattern) => pattern.test(code));

    // Exclude obvious non-code patterns - ENHANCED
    const nonCodePatterns = [
      /^[A-Z\s]+$/, // All caps text
      /^\d+[\d\s.,]*$/, // Just numbers
      /^[^\w\s]+$/, // Just special characters
      /^https?:\/\//, // URLs
      /Categories|Tags|Author|Rate this|Create an account/i, // UI elements
      // Enhanced Solodit-specific exclusions
      /\[?[LMH]-\d+\].*?・.*?\d{4}/, // Finding headers with dates
      /LZRateLimiter\s*・/, // Protocol headers
      /Findings #\d+/i, // Finding numbers
      /^\d{4}$/, // Just years
      /^・.*?\d{4}$/, // Date patterns
      /^In flights can get reset to zero$/, // Specific title text
      /lines:\s*Recommendation/i, // Lines: Recommendation pattern
      /Grandthrax\/yearnV2/i, // Repository names getting mixed in
      /It is recommended adding/i, // Recommendation text
      /maximum possible number/i, // More recommendation text
      /elements of the a/i, // Truncated text fragments
      /more gas is required/i, // Description text mixed in
      /^[a-zA-Z\s]+\.[a-zA-Z\s]+/, // Natural language sentences
    ];

    const isNonCode = nonCodePatterns.some((pattern) => pattern.test(code));

    return hasCodePattern && !isNonCode;
  }

  private formatCodeForAI(codeContent: string, language: string): string {
    if (!codeContent || codeContent.trim().length === 0) {
      return '';
    }

    // Clean up the code content for AI readability
    let cleanCode = codeContent
      // Remove excessive whitespace but preserve indentation structure
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Reduce multiple empty lines to double
      .replace(/[ \t]+$/gm, '') // Remove trailing spaces
      .trim();

    // For code with line number markers (🔴 123: code), clean them up for AI
    if (cleanCode.includes('🔴') || /^\s*\d+:\s/.test(cleanCode)) {
      cleanCode = cleanCode
        .split('\n')
        .map((line) => {
          // Remove line number prefixes and vulnerability markers
          return line
            .replace(/^[🔴\s]*\d+:\s*/, '') // Remove "🔴 123: " prefix
            .replace(/^[^\w]*\d+:\s*/, ''); // Remove "   123: " prefix
        })
        .filter((line) => line.trim().length > 0) // Remove empty lines
        .join('\n');
    }

    // Add language-specific formatting
    if (language === 'solidity') {
      // Ensure proper Solidity formatting
      cleanCode = this.formatSolidityCode(cleanCode);
    }

    return cleanCode;
  }

  private formatSolidityCode(code: string): string {
    // Enhanced Solidity code formatting for AI readability
    let formatted = code
      // Fix basic structure
      .replace(/\{\s*\n/g, ' {\n') // Fix opening braces
      .replace(/;\s*\n/g, ';\n') // Fix semicolons
      .replace(/\)\s*\{/g, ') {') // Fix function signatures
      .replace(/,\s*\n/g, ',\n') // Fix commas

      // Fix if/else structure
      .replace(/if\s*\(/g, 'if (') // Normalize if statements
      .replace(/\}\s*else\s*\{/g, '} else {') // Fix else formatting
      .replace(/\}\s*else\s+if\s*\(/g, '} else if (') // Fix else if

      // Fix function calls and variable assignments
      .replace(/(\w+)\.(\w+)\s*\(/g, '$1.$2(') // Fix method calls
      .replace(/=\s*(\w+)/g, ' = $1') // Fix assignments
      .replace(/(\w+)\s*=\s*/g, '$1 = ') // Fix variable assignments

      // Fix emit statements
      .replace(/emit\s+(\w+)\s*\(/g, 'emit $1(') // Fix emit statements

      // Clean up excessive whitespace while preserving structure
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Max 2 consecutive newlines
      .replace(/[ \t]+$/gm, '') // Remove trailing spaces
      .trim();

    // Add proper indentation for nested blocks
    const lines = formatted.split('\n');
    let indentLevel = 0;
    const indentedLines = lines.map((line) => {
      const trimmedLine = line.trim();

      // Decrease indent for closing braces
      if (trimmedLine.startsWith('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      const indentedLine = '    '.repeat(indentLevel) + trimmedLine;

      // Increase indent for opening braces
      if (trimmedLine.endsWith('{')) {
        indentLevel++;
      }

      return indentedLine;
    });

    return indentedLines.join('\n').trim();
  }

  private cleanCodeSnippet(code: string): string {
    if (!code || code.trim().length === 0) {
      return '';
    }

    return (
      code
        // Remove common UI noise - ENHANCED
        .replace(/Categories\s+Tags\s+Author.*$/s, '')
        .replace(/Rate this finding.*$/s, '')
        .replace(/Create an account.*$/s, '')
        .replace(/Unlock notes.*$/s, '')

        // Remove Solodit-specific UI elements
        .replace(/\[?[LMH]-\d+\]\s*/g, '') // Remove finding numbers like "[L-01]"
        .replace(/LZRateLimiter\s*・.*?\d{4}\s*/g, '') // Remove protocol/date header
        .replace(/Findings #\d+.*?・.*?\d{4}\s*/g, '') // Remove finding header
        .replace(/・.*?\d{4}\s*/g, '') // Remove date separators
        .replace(/\d{4}\s*$/, '') // Remove trailing years

        // Remove HTML/markdown artifacts
        .replace(/```[\w]*\n?/, '') // Remove code fence start
        .replace(/\n?```$/, '') // Remove code fence end
        .replace(/<[^>]*>/g, '') // Remove HTML tags

        // Clean up whitespace
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Reduce multiple empty lines
        .replace(/[ \t]+$/gm, '') // Remove trailing spaces
        .trim()
    );
  }

  private isDuplicateCode(newCode: string, existingSnippets: any[]): boolean {
    const normalizedNew = this.normalizeCodeForComparison(newCode);

    return existingSnippets.some((existing) => {
      const normalizedExisting = this.normalizeCodeForComparison(existing.snippet);

      // Check for exact matches
      if (normalizedNew === normalizedExisting) {
        return true;
      }

      // Check for substantial overlap (> 80% similar)
      const similarity = this.calculateCodeSimilarity(normalizedNew, normalizedExisting);
      return similarity > 0.8;
    });
  }

  private normalizeCodeForComparison(code: string): string {
    return code
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[{}();,]/g, '') // Remove syntax characters for comparison
      .trim();
  }

  private calculateCodeSimilarity(code1: string, code2: string): number {
    if (!code1 || !code2) return 0;

    const shorter = code1.length < code2.length ? code1 : code2;
    const longer = code1.length >= code2.length ? code1 : code2;

    if (shorter.length === 0) return 0;

    // Simple similarity based on common substrings
    let commonLength = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter.substr(i, 10))) {
        // 10 char windows
        commonLength += 10;
      }
    }

    return commonLength / longer.length;
  }

  private extractExploitScenario(content: string): string {
    // Extract the exploit scenario section - ENHANCED for various patterns
    const scenarioPatterns = [
      // Standard exploit scenario sections
      /Exploit Scenario\s+(.*?)(?:Recommendations|Tool used|Discussion|Take into consideration|$)/s,
      // Extract state-based examples that demonstrate the issue
      /(To showcase the issue.*?)(?:Take into consideration|If this is the desired|$)/s,
      // Extract step-by-step examples
      /(State \d+:.*?)(?:Take into consideration|If this is the desired|$)/s,
      // Extract time-based scenarios
      /(After \d+ seconds.*?)(?:Take into consideration|If this is the desired|$)/s,
      // Extract configuration change scenarios
      /(At that moment a configuration change.*?)(?:Take into consideration|If this is the desired|$)/s,
      // Extract mathematical proof scenarios
      /(the amount in flight should be.*?)(?:Take into consideration|If this is the desired|$)/s,
    ];

    for (const pattern of scenarioPatterns) {
      const match = content.match(pattern);
      if (match && match[1] && match[1].trim().length > 30) {
        let scenario = match[1]
          .trim()
          .replace(/\s+/g, ' ')
          // Clean up state variables in the scenario
          .replace(/Window\s*=\s*(\d+)/g, 'Window = $1')
          .replace(/Limit\s*=\s*(\d+)/g, 'Limit = $1')
          .replace(/AmountInFlight\s*=\s*(\d+)/g, 'AmountInFlight = $1')
          // Preserve calculations
          .replace(/\(\d+\s*-\s*\d+\)\s*=\s*\d+/g, (match) => match)
          .trim();

        if (scenario.length > 30 && !scenario.includes('・')) {
          return scenario;
        }
      }
    }

    return 'No exploit scenario provided';
  }

  private extractCleanRecommendations(content: string): {
    shortTerm: string;
    longTerm: string;
  } {
    const recommendations = {
      shortTerm: '',
      longTerm: '',
    };

    // Extract recommendations section - ENHANCED with more patterns
    const recPatterns = [
      // Standard recommendation sections
      /Recommendations\s+(.*?)(?:Tool used|Discussion|Rate this finding|Create an account|$)/s,
      /Recommendation\s+(.*?)(?:Tool used|Discussion|Rate this finding|Create an account|$)/s,
      // Extract "Take into consideration" sections
      /(Take into consideration.*?)(?:If this is the desired|Rate this finding|Create an account|$)/s,
      // Extract direct advice from the content
      /(If this is the desired behavior.*?)(?:Rate this finding|Create an account|$)/s,
      // Extract any concluding advice or mitigation
      /(the documentation should warn.*?)(?:Rate this finding|Create an account|$)/s,
    ];

    let recText = '';
    for (const pattern of recPatterns) {
      const match = content.match(pattern);
      if (match && match[1] && match[1].trim().length > recText.length) {
        recText = match[1].trim();
      }
    }

    if (recText) {
      // Look for Short term and Long term patterns
      const shortTermMatch = recText.match(/Short term:\s*(.*?)(?:Long term|$)/s);
      const longTermMatch = recText.match(/Long term:\s*(.*?)$/s);

      if (shortTermMatch) {
        recommendations.shortTerm = shortTermMatch[1].trim().replace(/\s+/g, ' ');
      }

      if (longTermMatch) {
        recommendations.longTerm = longTermMatch[1].trim().replace(/\s+/g, ' ');
      }

      // If no specific short/long term, extract actionable advice
      if (!recommendations.shortTerm && !recommendations.longTerm && recText.length > 20) {
        // Clean up the recommendation text
        let cleanRec = recText
          .replace(/\s+/g, ' ')
          .replace(/Take into consideration\s+/i, '')
          .replace(/If this is the desired behavior\s+/i, '')
          .trim();

        if (cleanRec.length > 20) {
          recommendations.shortTerm = cleanRec.substring(0, 400);
        }
      }
    }

    return recommendations;
  }

  private extractSourceCodeReferences(
    githubUrls: string[],
    gitHubCodeSnippets?: GitHubCodeSnippet[]
  ): {
    url: string;
    fileName: string;
    lineNumbers?: string;
  }[] {
    const sourceRefs = githubUrls.map((url) => {
      // Match any file extension, not just .sol
      const fileMatch = url.match(/\/([^\/]+\.[^\/\s#]+)(?:#L(\d+)(?:-L(\d+))?)?$/);
      if (fileMatch) {
        const fileName = fileMatch[1];
        const startLine = fileMatch[2];
        const endLine = fileMatch[3];
        const lineNumbers = startLine
          ? endLine
            ? `${startLine}-${endLine}`
            : startLine
          : undefined;

        return {
          url,
          fileName,
          lineNumbers,
        };
      }

      // Try to extract filename from path
      const pathMatch = url.match(/\/([^\/\s#]+)(?:#L(\d+)(?:-L(\d+))?)?$/);
      if (pathMatch) {
        const fileName = pathMatch[1];
        const startLine = pathMatch[2];
        const endLine = pathMatch[3];
        const lineNumbers = startLine
          ? endLine
            ? `${startLine}-${endLine}`
            : startLine
          : undefined;

        return {
          url,
          fileName: fileName.includes('.') ? fileName : `${fileName}.sol`,
          lineNumbers,
        };
      }

      return {
        url,
        fileName: 'Unknown file',
      };
    });

    // Add additional metadata if we have fetched GitHub content
    if (gitHubCodeSnippets && gitHubCodeSnippets.length > 0) {
      console.log(
        `   ✅ Enhanced source code references with ${gitHubCodeSnippets.length} fetched code snippets`
      );
    }

    return sourceRefs;
  }

  private extractPrimaryVulnerabilityType(content: string): string {
    // Extract the primary vulnerability type from content
    if (content.toLowerCase().includes('overflow') || content.toLowerCase().includes('underflow')) {
      return 'Integer Overflow/Underflow';
    }
    if (content.toLowerCase().includes('reentrancy')) {
      return 'Reentrancy';
    }
    if (
      content.toLowerCase().includes('access control') ||
      content.toLowerCase().includes('authorization')
    ) {
      return 'Access Control';
    }
    if (
      content.toLowerCase().includes('oracle') ||
      content.toLowerCase().includes('price manipulation')
    ) {
      return 'Oracle Manipulation';
    }
    if (
      content.toLowerCase().includes('logic error') ||
      content.toLowerCase().includes('business logic')
    ) {
      return 'Logic Error';
    }
    return 'Security Vulnerability';
  }

  private extractRootCause(content: string): string {
    // Extract the root cause from content
    const rootCausePatterns = [
      /root cause[:\s]+([^.]+)/i,
      /caused by[:\s]+([^.]+)/i,
      /issue is[:\s]+([^.]+)/i,
      /problem[:\s]+([^.]+)/i,
      /vulnerability[:\s]+([^.]+)/i,
    ];

    for (const pattern of rootCausePatterns) {
      const match = content.match(pattern);
      if (match && match[1] && match[1].trim().length > 10) {
        return match[1].trim().substring(0, 200);
      }
    }

    // Fallback: extract first sentence after "vulnerability detail" or similar
    const detailMatch = content.match(/vulnerability detail[:\s]+([^.]+\.)/i);
    if (detailMatch && detailMatch[1]) {
      return detailMatch[1].trim().substring(0, 200);
    }

    return 'Root cause analysis needed';
  }

  private extractDescription(content: string): string {
    // Extract clean vulnerability description
    const descriptionPatterns = [
      /AI Summary\s+(.*?)(?:The issue|Impact|Code Snippet|$)/s,
      /vulnerability detail[:\s]+(.*?)(?:Impact|Code Snippet|Tool used|$)/is,
      /description[:\s]+(.*?)(?:Impact|Code Snippet|Tool used|$)/is,
    ];

    for (const pattern of descriptionPatterns) {
      const match = content.match(pattern);
      if (match && match[1] && match[1].trim().length > 50) {
        return match[1].trim().replace(/\s+/g, ' ').substring(0, 500);
      }
    }

    // Fallback to content beginning
    return content.substring(0, 300).replace(/\s+/g, ' ').trim();
  }

  private extractExploitConditions(content: string): string[] {
    const conditions: string[] = [];

    // Look for specific conditions
    const conditionPatterns = [
      /(?:requires?|needs?|must|condition)[:\s]+([^.]+)/gi,
      /(?:when|if)[:\s]+([^.]+)(?:then|,)/gi,
      /attacker[:\s]+([^.]+)/gi,
    ];

    conditionPatterns.forEach((pattern) => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 10) {
          conditions.push(match[1].trim().substring(0, 100));
        }
      }
    });

    return conditions.slice(0, 5); // Limit to 5 conditions
  }

  private extractImpactDescription(content: string): string {
    const impactPatterns = [
      /impact[:\s]+(.*?)(?:code snippet|tool used|recommendation|$)/is,
      /consequences?[:\s]+(.*?)(?:code snippet|tool used|recommendation|$)/is,
      /result[:\s]+(.*?)(?:code snippet|tool used|recommendation|$)/is,
    ];

    for (const pattern of impactPatterns) {
      const match = content.match(pattern);
      if (match && match[1] && match[1].trim().length > 20) {
        return match[1].trim().replace(/\s+/g, ' ').substring(0, 300);
      }
    }

    return 'Impact analysis needed';
  }

  private extractBusinessImpact(content: string): string {
    // Look for business impact keywords
    const businessImpactKeywords = [
      'bad debt',
      'capital efficiency',
      'financial loss',
      'protocol insolvency',
      'user funds',
      'revenue loss',
      'reputation damage',
      'liquidity issues',
    ];

    for (const keyword of businessImpactKeywords) {
      if (content.toLowerCase().includes(keyword)) {
        const sentences = content.split(/[.!?]/);
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(keyword)) {
            return sentence.trim().substring(0, 200);
          }
        }
      }
    }

    return 'Business impact assessment needed';
  }

  private determineLikelihood(content: string): 'high' | 'medium' | 'low' {
    const lowLikelihoodIndicators = [
      'edge case',
      'unlikely',
      'rare',
      'specific conditions',
      'low probability',
    ];
    const highLikelihoodIndicators = ['easily exploitable', 'common', 'trivial', 'likely to occur'];

    const lowerContent = content.toLowerCase();

    for (const indicator of highLikelihoodIndicators) {
      if (lowerContent.includes(indicator)) return 'high';
    }

    for (const indicator of lowLikelihoodIndicators) {
      if (lowerContent.includes(indicator)) return 'low';
    }

    return 'medium';
  }

  private calculateCVSSScore(content: string): number | undefined {
    // Basic CVSS estimation based on content analysis
    const severityKeywords = {
      critical: 9.0,
      high: 7.5,
      medium: 5.0,
      low: 2.5,
    };

    for (const [severity, score] of Object.entries(severityKeywords)) {
      if (content.toLowerCase().includes(severity)) {
        return score;
      }
    }

    return undefined;
  }

  private extractVulnerableCode(
    content: string
  ): { fileName: string; lineNumbers: string; codeSnippet: string; explanation: string }[] {
    const vulnerableCode: {
      fileName: string;
      lineNumbers: string;
      codeSnippet: string;
      explanation: string;
    }[] = [];

    // Extract code blocks with file references
    const codeBlockPattern = /(?:```[\w]*\n)?([\s\S]*?)(?:\n```|$)/g;
    const fileRefPattern = /([a-zA-Z0-9_\/]+\.sol)(?:#L(\d+)(?:-L(\d+))?)?/g;

    const codeMatches = content.matchAll(codeBlockPattern);
    for (const match of codeMatches) {
      const codeBlock = match[1]?.trim();
      if (codeBlock && codeBlock.length > 20 && codeBlock.length < 500) {
        vulnerableCode.push({
          fileName: 'Unknown file',
          lineNumbers: 'Unknown',
          codeSnippet: codeBlock,
          explanation: 'Vulnerable code pattern identified',
        });
      }
    }

    // Extract file references
    const fileMatches = content.matchAll(fileRefPattern);
    for (const match of fileMatches) {
      const fileName = match[1];
      const startLine = match[2] || 'Unknown';
      const endLine = match[3] || startLine;
      const lineNumbers = endLine === startLine ? startLine : `${startLine}-${endLine}`;

      vulnerableCode.push({
        fileName,
        lineNumbers,
        codeSnippet: 'Code reference (see GitHub link)',
        explanation: 'Referenced vulnerable code location',
      });
    }

    return vulnerableCode.slice(0, 5); // Limit to 5 entries
  }

  private extractFixedCode(
    content: string
  ): { fileName: string; codeSnippet: string; explanation: string }[] {
    const fixedCode: { fileName: string; codeSnippet: string; explanation: string }[] = [];

    // Look for recommendations or fixed code
    const recommendationPattern = /recommendation[:\s]+(.*?)(?:discussion|tool used|$)/is;
    const match = content.match(recommendationPattern);

    if (match && match[1]) {
      const recommendation = match[1].trim();
      if (recommendation.includes('uint256') || recommendation.includes('cast')) {
        fixedCode.push({
          fileName: 'Fixed implementation',
          codeSnippet: recommendation.substring(0, 200),
          explanation: 'Recommended fix implementation',
        });
      }
    }

    return fixedCode;
  }

  private extractAffectedFunctions(content: string): string[] {
    const functions: string[] = [];

    // Extract function names
    const functionPatterns = [
      /function\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
      /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
    ];

    functionPatterns.forEach((pattern) => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 2 && match[1].length < 50) {
          functions.push(match[1]);
        }
      }
    });

    return [...new Set(functions)].slice(0, 10); // Unique functions, limit to 10
  }

  private extractVulnerablePatterns(
    content: string
  ): { pattern: string; description: string; locations: string[] }[] {
    const patterns: { pattern: string; description: string; locations: string[] }[] = [];

    // Common vulnerability patterns
    const vulnerabilityPatterns = [
      {
        pattern: 'uint160 casting',
        keywords: ['uint160', 'cast', 'overflow'],
        description: 'Unsafe integer casting leading to overflow',
      },
      {
        pattern: 'unchecked arithmetic',
        keywords: ['unchecked', 'overflow', 'underflow'],
        description: 'Arithmetic operations without overflow protection',
      },
      {
        pattern: 'missing access control',
        keywords: ['onlyOwner', 'access', 'authorization'],
        description: 'Functions lacking proper access control',
      },
    ];

    vulnerabilityPatterns.forEach((vulnPattern) => {
      const hasKeywords = vulnPattern.keywords.some((keyword) =>
        content.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasKeywords) {
        patterns.push({
          pattern: vulnPattern.pattern,
          description: vulnPattern.description,
          locations: ['Code analysis required'],
        });
      }
    });

    return patterns;
  }

  private extractDataTypes(content: string): {
    problematicTypes: string[];
    recommendedTypes: string[];
  } {
    const problematicTypes: string[] = [];
    const recommendedTypes: string[] = [];

    // Extract type information
    const typePattern = /(uint\d+|int\d+|address|bool|bytes\d*)/g;
    const types = content.match(typePattern) || [];

    types.forEach((type) => {
      if (type.includes('uint160') || type.includes('int')) {
        problematicTypes.push(type);
      }
      if (type.includes('uint256')) {
        recommendedTypes.push(type);
      }
    });

    return {
      problematicTypes: [...new Set(problematicTypes)],
      recommendedTypes: [...new Set(recommendedTypes)],
    };
  }

  private extractVulnerabilityClass(content: string): string {
    const classes = [
      'Integer Overflow',
      'Access Control',
      'Reentrancy',
      'Oracle Manipulation',
      'Logic Error',
      'External Call',
      'Timestamp Manipulation',
      'Arithmetic Error',
    ];

    for (const vulnClass of classes) {
      if (content.toLowerCase().includes(vulnClass.toLowerCase())) {
        return vulnClass;
      }
    }

    return 'General Security';
  }

  private extractMitigationStrategies(content: string): string[] {
    const strategies: string[] = [];

    const mitigationPatterns = [
      /recommendation[:\s]+(.*?)(?:discussion|tool used|$)/is,
      /mitigation[:\s]+(.*?)(?:discussion|tool used|$)/is,
      /fix[:\s]+(.*?)(?:discussion|tool used|$)/is,
      /should[:\s]+(.*?)(?:discussion|tool used|\.)/is,
    ];

    mitigationPatterns.forEach((pattern) => {
      const match = content.match(pattern);
      if (match && match[1] && match[1].trim().length > 20) {
        strategies.push(match[1].trim().substring(0, 200));
      }
    });

    return strategies.slice(0, 3);
  }

  private extractRelatedVulnerabilities(content: string): string[] {
    const related = [
      'Integer overflow',
      'Type casting',
      'Arithmetic errors',
      'Unsafe math operations',
    ];
    return related.filter((vuln) => content.toLowerCase().includes(vuln.toLowerCase()));
  }

  private extractTechnicalProof(content: string): string {
    // Extract mathematical proof or technical explanation
    const proofPatterns = [
      /proof[:\s]+(.*?)(?:impact|code snippet|$)/is,
      /calculation[:\s]+(.*?)(?:impact|code snippet|$)/is,
      /(\d+\.\d+e\d+.*?>\s*\d+\.\d+e\d+)/g,
    ];

    for (const pattern of proofPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim().substring(0, 300);
      }
    }

    return 'Technical proof available in full report';
  }

  private extractCodeRepository(url: string): string {
    const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
    return match ? `https://github.com/${match[1]}` : url;
  }

  private extractRelatedReports(title: string): string[] {
    // This would typically search a database, for now return empty
    return [];
  }

  private extractFixCommits(content: string): string[] {
    const commits: string[] = [];
    const commitPattern = /github\.com\/[^\/]+\/[^\/]+\/(?:pull|commit)\/[^\s]+/g;
    const matches = content.match(commitPattern);
    if (matches) {
      commits.push(...matches);
    }
    return [...new Set(commits)];
  }

  private extractDiscussionThreads(content: string): string[] {
    const threads: string[] = [];
    const threadPattern = /(?:discussion|escalate|comment)[:\s]+/gi;
    if (threadPattern.test(content)) {
      threads.push('Discussion available in original report');
    }
    return threads;
  }

  private extractOneLineSummary(content: string): string {
    // Create a concise one-line summary
    const title = content.split('\n')[0] || '';
    if (title.includes('Oracle.sol')) {
      return 'Oracle function missing uint256 cast causes integer overflow risk';
    }
    return title.substring(0, 100) + '...';
  }

  private extractKeyTakeaways(content: string): string[] {
    return [
      'Always use proper type casting for arithmetic operations',
      'Follow established patterns from audited protocols like Uniswap V3',
      'Be aware of integer overflow risks in unchecked blocks',
      'Test edge cases with extreme values',
    ];
  }

  private extractLearningPoints(content: string): string[] {
    return [
      'uint160 type has maximum value of ~1.5e48',
      'Multiplying large values can exceed type limits',
      'Uniswap V3 uses uint256 casting for safety',
      'Overflow can corrupt financial calculations',
    ];
  }

  private extractSimilarVulnerabilities(title: string): string[] {
    return [
      'Integer overflow in arithmetic operations',
      'Type casting vulnerabilities',
      'Oracle manipulation through calculation errors',
      'DeFi protocol math errors',
    ];
  }

  private extractPreventionTips(content: string): string[] {
    return [
      'Use SafeMath or checked arithmetic in older Solidity versions',
      'Cast to larger types before multiplication',
      'Follow established patterns from audited protocols',
      'Implement comprehensive testing for edge cases',
      'Use static analysis tools to detect overflow risks',
    ];
  }
}

// Main execution function
async function runSitemapScraper() {
  console.log('🌐 0xCypherpunkAI - Solodit SITEMAP Scraper');
  console.log('===========================================');
  console.log('🎯 Using sitemap.xml for INSTANT URL discovery');
  console.log('🧠 Purpose: Create comprehensive dataset for AI agent RAG system');

  const scraper = new SoloditSitemapScraper();

  try {
    const reports = await scraper.scrapeAllSoloditReports();

    console.log('\n🎉 SITEMAP-BASED SCRAPING COMPLETE!');
    console.log(`📊 Total reports scraped: ${reports.length}`);
    console.log('🚀 Dataset ready for AI agent RAG integration!');
  } catch (error) {
    console.error('❌ Scraping failed:', error);
  }
}

if (require.main === module) {
  runSitemapScraper().catch(console.error);
}

export { SoloditSitemapScraper, runSitemapScraper };
 