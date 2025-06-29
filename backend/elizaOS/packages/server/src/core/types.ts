export interface VulnerabilityFinding {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  location: {
    file: string;
    line: number;
  };
  recommendation: string;
  confidence: number; // 0-100
  codeSnippet?: string;
  gasImpact?: number;
  references?: string[];
}

export interface AgentVote {
  agentId: string;
  agentName: string;
  findingId: string;
  vote: 'CONFIRMED' | 'REJECTED' | 'UNCERTAIN';
  confidence: number; // 0-100
  reasoning: string;
  timestamp: Date;
}

export interface ScanResult {
  scanId: string;
  contractAddress?: string;
  githubRepo?: string;
  githubPath?: string;
  chain?: string;
  status: 'PENDING' | 'SCANNING' | 'VOTING' | 'COMPLETED' | 'FAILED';
  progress: number; // 0-100
  findings: VulnerabilityFinding[];
  agentVotes: AgentVote[];
  finalConfidenceScore: number;
  totalVotes: number;
  consensusReached: boolean;
  timestamp: Date;
  completedAt?: Date;
}

export interface SecurityAgent {
  id: string;
  name: string;
  specialization: string;
  description: string;
  enabled: boolean;
  priority: number;
}

export interface ScanRequest {
  type: 'GITHUB' | 'ONCHAIN';
  contractAddress?: string;
  chain?: string;
  githubRepo?: string;
  githubPath?: string;
  userAddress?: string;
  accessToken?: string;
  options?: {
    deepScan?: boolean;
    includeDependencies?: boolean;
    chainlinkVerification?: boolean;
  };
}

export interface ChainlinkConfig {
  functionConsumerAddress: string;
  ccipRouterAddress: string;
  automationRegistryAddress: string;
  linkTokenAddress: string;
  subscriptionId: string;
}

export interface VoteEngineConfig {
  consensusThreshold: number; // 0.6 = 60%
  minimumVotes: number;
  timeoutMinutes: number;
  weightingEnabled: boolean;
  agentWeights?: Record<string, number>;
}
