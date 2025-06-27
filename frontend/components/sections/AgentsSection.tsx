"use client";

import {
  Brain,
  Shield,
  Zap,
  Target,
  Lock,
  Eye,
  TrendingUp,
  DollarSign,
  Layers,
  Package,
  AlertTriangle,
} from "lucide-react";

export default function AgentsSection() {
  const agents = [
    {
      id: "static-analysis",
      name: "Static Code Analysis Agent",
      description:
        "Deep code analysis for vulnerabilities, patterns, and security issues",
      specialty: "Code Patterns",
      confidence: 95,
      status: "active" as const,
      color: "neon-green",
      icon: Brain,
      features: ["AST Analysis", "Pattern Detection", "Control Flow"],
    },
    {
      id: "defi-risk",
      name: "DeFi Risk Assessment Agent",
      description:
        "Specialized in DeFi protocol risks and financial attack vectors",
      specialty: "DeFi Security",
      confidence: 92,
      status: "active" as const,
      color: "neon-blue",
      icon: TrendingUp,
      features: ["MEV Analysis", "Flash Loan", "Liquidity Risks"],
    },
    {
      id: "access-control",
      name: "Access Control Security Agent",
      description: "Analyzes permissions, roles, and authorization mechanisms",
      specialty: "Access Control",
      confidence: 89,
      status: "active" as const,
      color: "neon-purple",
      icon: Lock,
      features: ["Role Analysis", "Permission Check", "Auth Flows"],
    },
    {
      id: "gas-optimization",
      name: "Gas Optimization Agent",
      description:
        "Identifies gas inefficiencies and optimization opportunities",
      specialty: "Gas Analysis",
      confidence: 87,
      status: "active" as const,
      color: "neon-green",
      icon: Zap,
      features: ["Gas Patterns", "Loop Analysis", "Storage Optimization"],
    },
    {
      id: "attack-surface",
      name: "Attack Surface Analysis Agent",
      description: "Maps potential attack vectors and entry points",
      specialty: "Attack Vectors",
      confidence: 94,
      status: "active" as const,
      color: "neon-blue",
      icon: Target,
      features: ["Entry Points", "Attack Paths", "Surface Mapping"],
    },
    {
      id: "oracle-security",
      name: "Oracle Manipulation Detection Agent",
      description: "Detects oracle manipulation and price feed vulnerabilities",
      specialty: "Oracle Security",
      confidence: 88,
      status: "active" as const,
      color: "neon-purple",
      icon: Eye,
      features: ["Price Feeds", "Oracle Calls", "Manipulation"],
    },
    {
      id: "mev-protection",
      name: "MEV Protection Agent",
      description: "Analyzes MEV risks and sandwich attack vulnerabilities",
      specialty: "MEV Analysis",
      confidence: 91,
      status: "active" as const,
      color: "neon-green",
      icon: Shield,
      features: ["Sandwich Attacks", "Front-running", "MEV Risks"],
    },
    {
      id: "tokenomics",
      name: "Tokenomics Security Agent",
      description: "Reviews token economics and distribution mechanisms",
      specialty: "Tokenomics",
      confidence: 85,
      status: "active" as const,
      color: "neon-blue",
      icon: DollarSign,
      features: ["Token Economics", "Distribution", "Inflation"],
    },
    {
      id: "upgradeability",
      name: "Upgradeability Analysis Agent",
      description: "Analyzes proxy patterns and upgrade mechanisms",
      specialty: "Upgrades",
      confidence: 90,
      status: "active" as const,
      color: "neon-purple",
      icon: Layers,
      features: ["Proxy Patterns", "Upgrade Logic", "Storage Layout"],
    },
    {
      id: "dependency-risk",
      name: "Dependency Risk Agent",
      description: "Evaluates external dependencies and integration risks",
      specialty: "Dependencies",
      confidence: 86,
      status: "active" as const,
      color: "neon-green",
      icon: Package,
      features: ["External Calls", "Library Analysis", "Integration Risks"],
    },
    {
      id: "dangerous-functions",
      name: "Dangerous Functions Agent",
      description: "Identifies high-risk functions and dangerous patterns",
      specialty: "Risk Patterns",
      confidence: 93,
      status: "active" as const,
      color: "neon-blue",
      icon: AlertTriangle,
      features: ["Dangerous Calls", "Risk Patterns", "Function Analysis"],
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case "neon-green":
        return {
          text: "text-neon-green",
          border: "border-neon-green/30",
          shadow: "shadow-neon-green/20",
          glow: "hover:shadow-neon-green",
        };
      case "neon-blue":
        return {
          text: "text-neon-blue",
          border: "border-neon-blue/30",
          shadow: "shadow-neon-blue/20",
          glow: "hover:shadow-neon-blue",
        };
      case "neon-purple":
        return {
          text: "text-neon-purple",
          border: "border-neon-purple/30",
          shadow: "shadow-neon-purple/20",
          glow: "hover:shadow-neon-purple",
        };
      default:
        return {
          text: "text-white",
          border: "border-white/30",
          shadow: "shadow-white/20",
          glow: "hover:shadow-white",
        };
    }
  };

  return (
    <section
      id="agents"
      className="py-24 bg-gradient-to-b from-dark-900 to-dark-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Meet Our{" "}
            <span className="bg-gradient-to-r from-neon-green to-neon-blue bg-clip-text text-transparent">
              AI Security Agents
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            11 specialized AI agents working in harmony to provide comprehensive
            smart contract security analysis. Each agent brings unique expertise
            and operates with advanced pattern recognition.
          </p>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {agents.map((agent, index) => {
            const colors = getColorClasses(agent.color);
            return (
              <div
                key={agent.id}
                className={`glass rounded-2xl p-6 border ${colors.border} transition-all duration-300 hover:scale-105 ${colors.glow} hover:bg-white/10 animate-fade-in`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Agent Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-3 rounded-lg bg-white/5 border ${colors.border}`}
                    >
                      <agent.icon className={`h-6 w-6 ${colors.text}`} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 ${colors.text.replace(
                          "text-",
                          "bg-"
                        )} rounded-full animate-pulse`}
                      ></div>
                      <span className="text-xs text-gray-400 uppercase tracking-wider">
                        {agent.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${colors.text}`}>
                      {agent.confidence}%
                    </div>
                    <div className="text-xs text-gray-400">Confidence</div>
                  </div>
                </div>

                {/* Agent Info */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white leading-tight">
                    {agent.name}
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {agent.description}
                  </p>

                  {/* Specialty Badge */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">Specialty:</span>
                    <span className={`text-xs font-medium ${colors.text}`}>
                      {agent.specialty}
                    </span>
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {agent.features.map((feature, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2 py-1 rounded-full bg-white/5 border ${colors.border} ${colors.text}`}
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="glass rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">
              Multi-Agent Consensus System
            </h3>
            <p className="text-gray-300 mb-6">
              Our agents work together to provide consensus-based security
              analysis, ensuring high accuracy and reducing false positives
              through collaborative intelligence.
            </p>
            <div className="flex items-center justify-center space-x-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-neon-green">94%</div>
                <div className="text-sm text-gray-400">Avg Consensus</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-neon-blue">11</div>
                <div className="text-sm text-gray-400">Active Agents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-neon-purple">99.9%</div>
                <div className="text-sm text-gray-400">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
