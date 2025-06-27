import {
  Action,
  Provider,
  Plugin,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  logger,
  ProviderResult,
  ActionExample,
} from '@elizaos/core';
import { VulnerabilityFinding, AgentVote } from '../core/types.js';
import { SecurityScanningService } from '../core/security-scanning-service.js';
import { KnowledgeBaseService } from '../core/knowledge-base-service.js';

/**
 * 🔐 Security Analysis Plugin for 0xCypherpunkAI
 * Provides actions and providers for the 11 specialized security agents
 */

// Action for analyzing smart contract vulnerabilities
export const analyzeContractAction: Action = {
  name: 'ANALYZE_CONTRACT',
  similes: ['SCAN_CONTRACT', 'AUDIT_CONTRACT', 'CHECK_VULNERABILITIES'],
  description:
    'Analyzes smart contract code for security vulnerabilities based on agent specialization',

  examples: [
    [
      {
        name: 'assistant',
        content: {
          text: "I'll analyze this contract for reentrancy vulnerabilities",
          action: 'ANALYZE_CONTRACT',
        },
      },
    ],
    [
      {
        name: 'assistant',
        content: {
          text: 'Scanning for access control issues in the provided smart contract',
          action: 'ANALYZE_CONTRACT',
        },
      },
    ],
  ],

  validate: async () => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      const securityService = runtime.getService<SecurityScanningService>(
        SecurityScanningService.serviceType
      );

      if (!securityService) {
        logger.error('Security scanning service not available');
        return false;
      }

      // Extract contract code from message
      const contractCode = message.content.text as string;
      const agentId = options?.agentId as string;
      const scanId = options?.scanId as string;

      if (!contractCode || !agentId) {
        logger.error('Missing contract code or agent ID');
        return false;
      }

      // Perform analysis based on agent specialization
      const findings = await performSpecializedAnalysis(agentId, contractCode, runtime);

      // Submit votes for each finding
      for (const finding of findings) {
        const vote: AgentVote = {
          agentId,
          agentName: agentId,
          findingId: `${scanId}_${finding.id}`,
          vote: 'CONFIRMED',
          confidence: finding.confidence,
          reasoning: `${agentId} detected: ${finding.description}`,
          timestamp: new Date(),
        };

        await securityService.submitAgentVote(vote);
      }

      // Create response memory
      if (callback) {
        await callback({
          text: `Analysis complete. Found ${findings.length} potential vulnerabilities with average confidence ${
            findings.length > 0
              ? Math.round(findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length)
              : 0
          }%`,
          content: findings,
        });
      }

      return true;
    } catch (error) {
      logger.error('Error in analyzeContract action:', error);
      return false;
    }
  },
};

// Action for submitting vulnerability votes
export const submitVoteAction: Action = {
  name: 'SUBMIT_VOTE',
  similes: ['VOTE', 'CAST_VOTE', 'SUBMIT_OPINION'],
  description: 'Submits a vote on a vulnerability finding',

  examples: [
    [
      {
        name: 'assistant',
        content: {
          text: 'Voting CONFIRMED with 85% confidence on reentrancy vulnerability',
          action: 'SUBMIT_VOTE',
        },
      },
    ],
  ],

  validate: async () => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      const securityService = runtime.getService<SecurityScanningService>(
        SecurityScanningService.serviceType
      );

      if (!securityService) {
        logger.error('Security scanning service not available');
        return false;
      }

      const vote = options?.vote as AgentVote;
      if (!vote) {
        logger.error('Missing vote information');
        return false;
      }

      await securityService.submitAgentVote(vote);

      if (callback) {
        await callback({
          text: `Vote submitted: ${vote.vote} (${vote.confidence}%)`,
          content: vote,
        });
      }

      return true;
    } catch (error) {
      logger.error('Error in submitVote action:', error);
      return false;
    }
  },
};

// Provider for security knowledge base
export const securityKnowledgeProvider: Provider = {
  name: 'SECURITY_KNOWLEDGE',
  description: 'Provides security knowledge and vulnerability patterns from the RAG database',

  get: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<ProviderResult> => {
    try {
      // Get agent's specialization from character settings
      const agentCharacter = runtime.character;
      const specialization = (agentCharacter.settings?.specialization as string) || 'general';

      const query =
        typeof message.content.text === 'string' ? message.content.text : specialization;

      // Get relevant security knowledge from RAG
      const ragContext = await getRAGContext(specialization, query, runtime);

      const text = `Security Knowledge for ${specialization}:
${ragContext}

Known Vulnerability Patterns:
${getVulnerabilityPatterns(specialization)}`;
      return { text };
    } catch (error) {
      logger.error('Error in securityKnowledgeProvider:', error);
      return { text: 'Security knowledge temporarily unavailable' };
    }
  },
};

// Provider for vulnerability context
export const vulnerabilityContextProvider: Provider = {
  name: 'VULNERABILITY_CONTEXT',
  description: 'Provides context about vulnerability types and analysis approaches',

  get: async (runtime: IAgentRuntime): Promise<ProviderResult> => {
    const agentName = runtime.character.name;
    const context = getAgentSpecializationContext(agentName);

    return {
      text: context,
      data: { agentSpecialization: agentName },
    };
  },
};

/**
 * Performs specialized analysis based on agent type
 */
async function performSpecializedAnalysis(
  agentId: string,
  contractCode: string,
  runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const agentName = agentId.toLowerCase().replace(/[\s-]+/g, '_');

  switch (agentName) {
    case 'static_code_agent':
    case 'static_code':
      return await analyzeStaticCode(contractCode, runtime);
    case 'defi_risk_agent':
    case 'defi_risk':
      return await analyzeDeFiRisk(contractCode, runtime);
    case 'access_control_agent':
    case 'access_control':
      return await analyzeAccessControl(contractCode, runtime);
    case 'gas_efficiency_agent':
    case 'gas_efficiency':
      return await analyzeGasEfficiency(contractCode, runtime);
    case 'attack_surface_agent':
    case 'attack_surface':
      return await analyzeAttackSurface(contractCode, runtime);
    case 'upgradeability_agent':
    case 'upgradeability':
      return await analyzeUpgradeability(contractCode, runtime);
    case 'oracle_manipulation_agent':
    case 'oracle_manipulation':
      return await analyzeOracleManipulation(contractCode, runtime);
    case 'mev_agent':
    case 'mev':
      return await analyzeMEV(contractCode, runtime);
    case 'tokenomics_agent':
    case 'tokenomics':
      return await analyzeTokenomics(contractCode, runtime);
    case 'dependency_risk_agent':
    case 'dependency_risk':
      return await analyzeDependencyRisk(contractCode, runtime);
    case 'dangerous_functions_agent':
    case 'dangerous_functions':
      return await analyzeDangerousFunctions(contractCode, runtime);
    default:
      logger.warn(`Unknown agent specialization: ${agentName}`);
      return [];
  }
}

// Analysis functions for each of the 11 agents

async function analyzeStaticCode(
  contractCode: string,
  runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];

  // Check for reentrancy patterns
  if (contractCode.includes('.call(') && contractCode.includes('msg.sender')) {
    findings.push({
      id: 'static_reentrancy',
      type: 'reentrancy',
      severity: 'HIGH',
      title: 'Potential Reentrancy Vulnerability',
      description: 'Potential reentrancy vulnerability detected',
      location: { file: 'contract.sol' },
      recommendation: 'Use reentrancy guards or follow the Checks-Effects-Interactions pattern',
      confidence: 85,
    });
  }

  // Check for integer overflow/underflow (pre-0.8.0)
  if (
    contractCode.includes('pragma solidity') &&
    !contractCode.includes('pragma solidity ^0.8') &&
    (contractCode.includes('++') || contractCode.includes('--') || contractCode.includes('+'))
  ) {
    findings.push({
      id: 'static_overflow',
      type: 'overflow',
      severity: 'MEDIUM',
      title: 'Potential Integer Overflow/Underflow',
      description: 'Potential integer overflow/underflow in pre-0.8.0 contract',
      location: { file: 'contract.sol' },
      recommendation: 'Use SafeMath library or upgrade to Solidity 0.8.0+',
      confidence: 70,
    });
  }

  return findings;
}

async function analyzeDeFiRisk(
  contractCode: string,
  runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];

  // Check for flash loan vulnerabilities
  if (contractCode.includes('flashLoan') || contractCode.includes('borrow')) {
    findings.push({
      id: 'defi_flashloan',
      type: 'flashloan',
      severity: 'HIGH',
      title: 'Flash Loan Implementation Detected',
      description: 'Flash loan implementation detected - review for manipulation risks',
      location: { file: 'contract.sol' },
      recommendation: 'Implement proper flash loan attack protection and price validation',
      confidence: 80,
    });
  }

  // Check for oracle dependencies
  if (contractCode.includes('oracle') || contractCode.includes('price')) {
    findings.push({
      id: 'defi_oracle_dependency',
      type: 'oracle',
      severity: 'MEDIUM',
      title: 'Oracle Dependency Detected',
      description: 'Oracle dependency detected - ensure price manipulation protection',
      location: { file: 'contract.sol' },
      recommendation: 'Use multiple oracle sources and time-weighted average prices',
      confidence: 75,
    });
  }

  return findings;
}

async function analyzeAccessControl(
  contractCode: string,
  runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];

  // Check for missing access control
  if (
    contractCode.includes('function') &&
    !contractCode.includes('onlyOwner') &&
    !contractCode.includes('modifier') &&
    !contractCode.includes('require(msg.sender')
  ) {
    findings.push({
      id: 'access_missing_control',
      type: 'access_control',
      severity: 'HIGH',
      title: 'Missing Access Control',
      description: 'Functions without proper access control detected',
      location: { file: 'contract.sol' },
      recommendation: 'Implement proper access control modifiers for sensitive functions',
      confidence: 75,
    });
  }

  // Check for privilege escalation risks
  if (contractCode.includes('transferOwnership') || contractCode.includes('addOwner')) {
    findings.push({
      id: 'access_privilege_escalation',
      type: 'privilege_escalation',
      severity: 'MEDIUM',
      title: 'Privilege Escalation Functions',
      description: 'Privilege escalation functions detected',
      location: { file: 'contract.sol' },
      recommendation: 'Secure ownership transfer functions with multi-sig or timelock',
      confidence: 70,
    });
  }

  return findings;
}

async function analyzeGasEfficiency(
  contractCode: string,
  runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];

  // Check for gas-intensive loops
  if (contractCode.includes('for (') && contractCode.includes('.length')) {
    findings.push({
      id: 'gas_inefficient_loop',
      type: 'gas_optimization',
      severity: 'LOW',
      title: 'Gas-Inefficient Loop',
      description: 'Gas-inefficient loop detected',
      location: { file: 'contract.sol' },
      recommendation: 'Cache array length and optimize loop structures',
      confidence: 80,
    });
  }

  // Check for redundant operations
  if (contractCode.includes('SLOAD') || (contractCode.match(/\w+\.\w+/g) || []).length > 10) {
    findings.push({
      id: 'gas_redundant_operations',
      type: 'gas_optimization',
      severity: 'LOW',
      title: 'Redundant Storage Operations',
      description: 'Potentially redundant storage operations',
      location: { file: 'contract.sol' },
      recommendation: 'Cache storage variables to memory to reduce gas costs',
      confidence: 60,
    });
  }

  return findings;
}

async function analyzeAttackSurface(
  contractCode: string,
  runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];

  // Check for external calls
  if (contractCode.includes('.call(') || contractCode.includes('.delegatecall(')) {
    findings.push({
      id: 'attack_external_calls',
      type: 'external_call',
      severity: 'HIGH',
      title: 'External Call Detected',
      description: 'External call detected - potential attack vector',
      location: { file: 'contract.sol' },
      recommendation: 'Validate external call parameters and implement reentrancy guards',
      confidence: 85,
    });
  }

  // Check for fallback function misuse
  if (contractCode.includes('fallback()') || contractCode.includes('receive()')) {
    findings.push({
      id: 'attack_fallback_misuse',
      type: 'fallback',
      severity: 'MEDIUM',
      title: 'Fallback Function Detected',
      description: 'Fallback/receive function detected - review for unintended behavior',
      location: { file: 'contract.sol' },
      recommendation: 'Ensure fallback functions are properly secured and limited',
      confidence: 70,
    });
  }

  return findings;
}

async function analyzeUpgradeability(
  contractCode: string,
  runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];

  // Check for proxy patterns
  if (contractCode.includes('proxy') || contractCode.includes('implementation')) {
    findings.push({
      id: 'upgrade_proxy_risk',
      type: 'proxy',
      severity: 'HIGH',
      title: 'Proxy Pattern Detected',
      description: 'Proxy pattern detected - review for storage slot corruption',
      location: { file: 'contract.sol' },
      recommendation: 'Ensure storage layout compatibility across upgrades',
      confidence: 80,
    });
  }

  // Check for storage layout issues
  if (contractCode.includes('struct') && contractCode.includes('mapping')) {
    findings.push({
      id: 'upgrade_storage_layout',
      type: 'storage',
      severity: 'MEDIUM',
      title: 'Complex Storage Layout',
      description: 'Complex storage layout - ensure upgrade compatibility',
      location: { file: 'contract.sol' },
      recommendation: 'Document storage layout and validate upgrade compatibility',
      confidence: 65,
    });
  }

  return findings;
}

async function analyzeOracleManipulation(
  contractCode: string,
  runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];

  // Check for timestamp dependencies
  if (contractCode.includes('block.timestamp') || contractCode.includes('now')) {
    findings.push({
      id: 'oracle_timestamp_dependency',
      type: 'timestamp',
      severity: 'MEDIUM',
      title: 'Timestamp Dependency',
      description: 'Timestamp dependency detected - miners can manipulate by ~15 seconds',
      location: { file: 'contract.sol' },
      recommendation: 'Use block numbers or external time oracles for critical timing',
      confidence: 90,
    });
  }

  // Check for single oracle dependency
  if (
    contractCode.includes('getPrice()') &&
    !contractCode.includes('oracle') &&
    !contractCode.includes('multiple')
  ) {
    findings.push({
      id: 'oracle_single_source',
      type: 'oracle_manipulation',
      severity: 'HIGH',
      title: 'Single Oracle Dependency',
      description: 'Single oracle dependency - vulnerable to price manipulation',
      location: { file: 'contract.sol' },
      recommendation: 'Implement multiple oracle sources and price validation',
      confidence: 75,
    });
  }

  return findings;
}

async function analyzeMEV(
  contractCode: string,
  runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];

  // Check for front-running vulnerabilities
  if (contractCode.includes('approve(') && contractCode.includes('transfer(')) {
    findings.push({
      id: 'mev_front_running',
      type: 'front_running',
      severity: 'MEDIUM',
      title: 'Front-Running Vulnerability',
      description: 'Potential front-running vulnerability in approve/transfer pattern',
      location: { file: 'contract.sol' },
      recommendation: 'Use increaseAllowance/decreaseAllowance or commit-reveal schemes',
      confidence: 70,
    });
  }

  // Check for sandwich attack vectors
  if (contractCode.includes('swap') || contractCode.includes('trade')) {
    findings.push({
      id: 'mev_sandwich_attack',
      type: 'sandwich_attack',
      severity: 'MEDIUM',
      title: 'Sandwich Attack Vector',
      description: 'Trading functionality - vulnerable to sandwich attacks',
      location: { file: 'contract.sol' },
      recommendation: 'Implement slippage protection and private mempool submission',
      confidence: 65,
    });
  }

  return findings;
}

async function analyzeTokenomics(
  contractCode: string,
  runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];

  // Check for unlimited minting
  if (
    contractCode.includes('mint(') &&
    !contractCode.includes('cap') &&
    !contractCode.includes('maxSupply')
  ) {
    findings.push({
      id: 'tokenomics_unlimited_mint',
      type: 'unlimited_mint',
      severity: 'HIGH',
      title: 'Unlimited Minting Capability',
      description: 'Unlimited minting capability detected',
      location: { file: 'contract.sol' },
      recommendation: 'Implement supply cap or minting restrictions',
      confidence: 85,
    });
  }

  // Check for unlimited approvals
  if (contractCode.includes('approve(') && contractCode.includes('uint256(-1)')) {
    findings.push({
      id: 'tokenomics_unlimited_approval',
      type: 'unlimited_approval',
      severity: 'MEDIUM',
      title: 'Unlimited Approval Pattern',
      description: 'Unlimited approval pattern detected',
      location: { file: 'contract.sol' },
      recommendation: 'Use specific approval amounts instead of unlimited approvals',
      confidence: 80,
    });
  }

  return findings;
}

async function analyzeDependencyRisk(
  contractCode: string,
  runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];

  // Check for external library imports
  if (contractCode.includes('import') && contractCode.includes('from')) {
    findings.push({
      id: 'dependency_external_libraries',
      type: 'dependency',
      severity: 'MEDIUM',
      title: 'External Library Dependencies',
      description: 'External library dependencies detected - ensure they are up to date',
      location: { file: 'contract.sol' },
      recommendation: 'Audit and regularly update external dependencies',
      confidence: 70,
    });
  }

  // Check for old Solidity versions
  if (contractCode.includes('pragma solidity') && !contractCode.includes('pragma solidity ^0.8')) {
    findings.push({
      id: 'dependency_old_solidity',
      type: 'version',
      severity: 'MEDIUM',
      title: 'Outdated Solidity Version',
      description: 'Outdated Solidity version detected',
      location: { file: 'contract.sol' },
      recommendation: 'Upgrade to Solidity 0.8.0+ for built-in overflow protection',
      confidence: 90,
    });
  }

  return findings;
}

async function analyzeDangerousFunctions(
  contractCode: string,
  runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];

  // Check for delegatecall usage
  if (contractCode.includes('delegatecall')) {
    findings.push({
      id: 'dangerous_delegatecall',
      type: 'delegatecall',
      severity: 'HIGH',
      title: 'Dangerous delegatecall Usage',
      description: 'Dangerous delegatecall usage detected',
      location: { file: 'contract.sol' },
      recommendation: 'Avoid delegatecall or implement strict input validation',
      confidence: 95,
    });
  }

  // Check for tx.origin usage
  if (contractCode.includes('tx.origin')) {
    findings.push({
      id: 'dangerous_tx_origin',
      type: 'tx_origin',
      severity: 'HIGH',
      title: 'Dangerous tx.origin Usage',
      description: 'Dangerous tx.origin usage detected',
      location: { file: 'contract.sol' },
      recommendation: 'Use msg.sender instead of tx.origin for authentication',
      confidence: 95,
    });
  }

  // Check for selfdestruct usage
  if (contractCode.includes('selfdestruct') || contractCode.includes('suicide')) {
    findings.push({
      id: 'dangerous_selfdestruct',
      type: 'selfdestruct',
      severity: 'HIGH',
      title: 'Selfdestruct Function Detected',
      description: 'selfdestruct function detected',
      location: { file: 'contract.sol' },
      recommendation: 'Consider alternatives to selfdestruct due to security risks',
      confidence: 95,
    });
  }

  return findings;
}

async function getRAGContext(
  specialization: string,
  query: string,
  runtime: IAgentRuntime
): Promise<string> {
  try {
    const knowledgeService = runtime.getService<KnowledgeBaseService>(
      KnowledgeBaseService.serviceType
    );

    if (!knowledgeService) {
      return 'Knowledge base service not available';
    }

    const results = await knowledgeService.search(query, specialization, 3);
    return results
      .map(
        (result) => `${result.metadata.title || result.id}: ${result.content.substring(0, 200)}...`
      )
      .join('\n\n');
  } catch (error) {
    logger.error('Error getting RAG context:', error);
    return 'RAG context temporarily unavailable';
  }
}

function getVulnerabilityPatterns(specialization: string): string {
  const patterns: Record<string, string> = {
    static_code: 'Reentrancy, integer overflow/underflow, unchecked external calls',
    defi_risk: 'Flash loan manipulation, oracle price attacks, liquidity assumptions',
    access_control: 'Missing modifiers, privilege escalation, unsafe role assignments',
    gas_efficiency: 'Expensive loops, redundant storage operations, gas limit risks',
    attack_surface: 'External call exposure, fallback function misuse, input validation',
    upgradeability: 'Proxy pattern risks, storage slot corruption, initialization issues',
    oracle_manipulation: 'Price feed spoofing, timestamp manipulation, single source dependency',
    mev: 'Front-running vulnerabilities, sandwich attacks, MEV extraction',
    tokenomics: 'Unlimited minting, approval race conditions, supply manipulation',
    dependency_risk: 'Vulnerable libraries, outdated dependencies, version conflicts',
    dangerous_functions: 'delegatecall misuse, tx.origin authentication, selfdestruct risks',
  };

  return patterns[specialization] || 'General security patterns';
}

function getAgentSpecializationContext(agentName: string): string {
  const contexts: Record<string, string> = {
    'Static Code Agent':
      'Focus on reentrancy, overflow/underflow, and unchecked calls. Look for state changes after external calls.',
    'DeFi Risk Agent':
      'Analyze flash loan risks, oracle manipulation, and liquidity assumptions. Check for price feed dependencies.',
    'Access Control Agent':
      'Examine privilege escalation, missing modifiers, and unsafe role assignments. Verify authorization patterns.',
    'Gas Efficiency Agent':
      'Identify gas-intensive operations, expensive loops, and optimization opportunities.',
    'Attack Surface Agent':
      'Review external call exposure, fallback function behavior, and input validation.',
    'Upgradeability Agent':
      'Check proxy patterns, storage layout compatibility, and initialization security.',
    'Oracle Manipulation Agent':
      'Analyze timestamp dependencies, price feed validation, and oracle security.',
    'MEV Agent':
      'Detect front-running vulnerabilities, sandwich attack vectors, and MEV extraction risks.',
    'Tokenomics Agent': 'Review minting controls, approval mechanisms, and supply management.',
    'Dependency Risk Agent':
      'Examine library versions, dependency security, and update requirements.',
    'Dangerous Functions Agent':
      'Identify misuse of delegatecall, tx.origin, selfdestruct, and other dangerous functions.',
  };

  return contexts[agentName] || 'General security analysis focus.';
}

export const securityAnalysisPlugin: Plugin = {
  name: 'security-analysis',
  description: 'Advanced security analysis for smart contracts with 11 specialized agents',
  actions: [analyzeContractAction, submitVoteAction],
  providers: [securityKnowledgeProvider, vulnerabilityContextProvider],

  async init(_config: Record<string, string>, runtime: IAgentRuntime): Promise<void> {
    logger.info('🔐 Security Analysis Plugin initialized with 11 specialized agents');

    // Initialize services if needed
    const securityService = runtime.getService<SecurityScanningService>(
      SecurityScanningService.serviceType
    );

    if (!securityService) {
      logger.warn('Security scanning service not available during plugin init');
    }
  },
};
