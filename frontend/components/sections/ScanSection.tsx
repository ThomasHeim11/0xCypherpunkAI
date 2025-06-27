"use client";

import { useState, useEffect } from "react";
import {
  Github,
  Search,
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ChevronDown,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { listRepositories, startSecurityScan, GitHubRepo } from "@/lib/api";

interface ScanSectionProps {
  isAuthenticated?: boolean;
  onLogin?: () => void;
}

export default function ScanSection({
  isAuthenticated = false,
  onLogin,
}: ScanSectionProps) {
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState<string>("");

  // Load repositories when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadRepositories();
    }
  }, [isAuthenticated]);

  const loadRepositories = async () => {
    setIsLoadingRepos(true);
    setRepoError("");
    try {
      const repos = await listRepositories();
      setRepositories(repos);
    } catch (error) {
      console.error("Failed to load repositories:", error);
      setRepoError("Failed to load repositories. Please try again.");
    } finally {
      setIsLoadingRepos(false);
    }
  };

  // Filter repositories based on search term
  const filteredRepos = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const mockScanResults = {
    overallConfidence: 87,
    totalFindings: 8,
    criticalFindings: 1,
    highFindings: 2,
    mediumFindings: 3,
    lowFindings: 2,
    scanDuration: "28s",
    findings: [
      {
        id: 1,
        severity: "critical" as const,
        title: "Reentrancy Vulnerability in withdraw()",
        description:
          "The withdraw function is vulnerable to reentrancy attacks due to external call before state update.",
        location: "contracts/TokenVault.sol:45-52",
        agentConsensus: 94,
        recommendation:
          "Implement checks-effects-interactions pattern or use ReentrancyGuard modifier.",
      },
      {
        id: 2,
        severity: "high" as const,
        title: "Missing Access Control on Admin Functions",
        description:
          "Critical administrative functions lack proper access control modifiers.",
        location: "contracts/TokenVault.sol:78-85",
        agentConsensus: 89,
        recommendation:
          "Add onlyOwner or role-based access control modifiers to all admin functions.",
      },
    ],
  };

  const handleScan = async () => {
    if (!selectedRepo) return;
    setIsScanning(true);
    setScanResults(null);

    try {
      const result = await startSecurityScan({
        repository: selectedRepo.full_name,
        path: "", // For now, scan the entire repository
      });

      // For demo purposes, show mock results after a delay
      // In a real implementation, you would poll for results or use WebSockets
      setTimeout(() => {
        setScanResults(mockScanResults);
        setIsScanning(false);
      }, 3000);
    } catch (error) {
      console.error("Failed to start scan:", error);
      setIsScanning(false);
      // Handle error - could show a toast notification
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-400 bg-red-400/10 border-red-400/30";
      case "high":
        return "text-orange-400 bg-orange-400/10 border-orange-400/30";
      case "medium":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
      case "low":
        return "text-green-400 bg-green-400/10 border-green-400/30";
      default:
        return "text-gray-400 bg-gray-400/10 border-gray-400/30";
    }
  };

  if (!isAuthenticated) {
    return (
      <section
        id="scan"
        className="py-24 bg-gradient-to-b from-dark-800 to-dark-900"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass rounded-3xl p-12">
            <Shield className="h-16 w-16 text-neon-green mx-auto mb-6 animate-pulse-glow" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Scan Your Smart Contracts?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Connect your GitHub account to access our AI-powered security
              analysis platform and scan your Solidity contracts with 11
              specialized agents.
            </p>
            <button
              onClick={onLogin}
              className="bg-gradient-to-r from-neon-green to-neon-blue text-black px-8 py-4 rounded-lg font-semibold hover:scale-105 transition-all duration-300 hover:shadow-neon-green flex items-center space-x-2 mx-auto"
            >
              <Github className="h-5 w-5" />
              <span>Connect GitHub to Start</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="scan"
      className="py-24 bg-gradient-to-b from-dark-800 to-dark-900"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Security{" "}
            <span className="bg-gradient-to-r from-neon-green to-neon-blue bg-clip-text text-transparent">
              Scan Center
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Select a repository to begin comprehensive security analysis with
            our AI agent network.
          </p>
        </div>

        {/* Scan Interface */}
        <div className="glass rounded-3xl p-8 mb-8">
          {/* Repository Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Select Repository
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue/50"
                />
              </div>

              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {isLoadingRepos ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-neon-green" />
                    <span className="ml-2 text-gray-400">
                      Loading repositories...
                    </span>
                  </div>
                ) : repoError ? (
                  <div className="text-center py-8">
                    <p className="text-red-400 mb-4">{repoError}</p>
                    <button
                      onClick={loadRepositories}
                      className="flex items-center space-x-2 mx-auto px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Retry</span>
                    </button>
                  </div>
                ) : filteredRepos.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">
                      {searchTerm
                        ? "No repositories match your search."
                        : "No repositories found."}
                    </p>
                  </div>
                ) : (
                  filteredRepos.map((repo) => (
                    <div
                      key={repo.id}
                      onClick={() => setSelectedRepo(repo)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedRepo?.id === repo.id
                          ? "border-neon-green bg-neon-green/5"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-white">
                            {repo.name}
                          </h4>
                          <p className="text-sm text-gray-400">
                            {repo.description}
                          </p>
                          {repo.private && (
                            <span className="text-xs px-2 py-1 mt-1 inline-block rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                              Private
                            </span>
                          )}
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-neon-blue/20 text-neon-blue border border-neon-blue/30">
                          {repo.language || "Unknown"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Scan Options */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Scan Configuration
              </label>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <h4 className="font-medium text-white mb-2">
                    Full Security Audit
                  </h4>
                  <p className="text-sm text-gray-400 mb-3">
                    Complete analysis with all 11 AI agents
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <CheckCircle className="h-4 w-4 text-neon-green" />
                    <span>All vulnerability patterns</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <CheckCircle className="h-4 w-4 text-neon-green" />
                    <span>Multi-agent consensus</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <CheckCircle className="h-4 w-4 text-neon-green" />
                    <span>Detailed recommendations</span>
                  </div>
                </div>

                <button
                  onClick={handleScan}
                  disabled={!selectedRepo || isScanning}
                  className="w-full bg-gradient-to-r from-neon-green to-neon-blue text-black px-6 py-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-300 hover:shadow-neon-green flex items-center justify-center space-x-2"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="h-5 w-5" />
                      <span>Start Security Scan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Scanning Progress */}
          {isScanning && (
            <div className="border-t border-white/10 pt-8">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Analyzing {selectedRepo?.name}...
                </h3>
                <div className="flex items-center justify-center space-x-4 mb-6">
                  <Loader2 className="h-8 w-8 text-neon-green animate-spin" />
                  <span className="text-gray-300">
                    AI agents are analyzing your code
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-neon-green to-neon-blue h-2 rounded-full animate-pulse"
                    style={{ width: "70%" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scan Results */}
        {scanResults && (
          <div className="glass rounded-3xl p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-white">Scan Results</h3>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-neon-green">
                    {scanResults.overallConfidence}%
                  </div>
                  <div className="text-sm text-gray-400">Confidence</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-neon-blue">
                    {scanResults.scanDuration}
                  </div>
                  <div className="text-sm text-gray-400">Duration</div>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="text-center p-4 rounded-lg bg-red-400/10 border border-red-400/30">
                <div className="text-2xl font-bold text-red-400">
                  {scanResults.criticalFindings}
                </div>
                <div className="text-sm text-gray-400">Critical</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-orange-400/10 border border-orange-400/30">
                <div className="text-2xl font-bold text-orange-400">
                  {scanResults.highFindings}
                </div>
                <div className="text-sm text-gray-400">High</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-yellow-400/10 border border-yellow-400/30">
                <div className="text-2xl font-bold text-yellow-400">
                  {scanResults.mediumFindings}
                </div>
                <div className="text-sm text-gray-400">Medium</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-400/10 border border-green-400/30">
                <div className="text-2xl font-bold text-green-400">
                  {scanResults.lowFindings}
                </div>
                <div className="text-sm text-gray-400">Low</div>
              </div>
            </div>

            {/* Findings */}
            <div className="space-y-4">
              {scanResults.findings.map((finding: any) => (
                <div
                  key={finding.id}
                  className="glass rounded-xl p-6 border border-white/10"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle
                        className={`h-5 w-5 ${
                          finding.severity === "critical"
                            ? "text-red-400"
                            : "text-orange-400"
                        }`}
                      />
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(
                          finding.severity
                        )}`}
                      >
                        {finding.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-neon-green">
                        {finding.agentConsensus}%
                      </div>
                      <div className="text-xs text-gray-400">Consensus</div>
                    </div>
                  </div>

                  <h4 className="text-lg font-semibold text-white mb-3">
                    {finding.title}
                  </h4>
                  <p className="text-gray-300 mb-4">{finding.description}</p>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      Location: {finding.location}
                    </span>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </div>

                  <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
                    <h5 className="font-medium text-white mb-2">
                      Recommendation:
                    </h5>
                    <p className="text-gray-300 text-sm">
                      {finding.recommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
