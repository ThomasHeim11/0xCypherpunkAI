"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Brain,
  Zap,
  ChevronRight,
  Play,
  Github,
  TrendingUp,
  Clock,
  Users,
} from "lucide-react";

interface HeroSectionProps {
  isAuthenticated?: boolean;
  onGetStarted?: () => void;
}

export default function HeroSection({
  isAuthenticated = false,
  onGetStarted,
}: HeroSectionProps) {
  const [currentAgent, setCurrentAgent] = useState(0);

  const agents = [
    "Static Code Analysis Agent",
    "DeFi Risk Assessment Agent",
    "Access Control Security Agent",
    "Gas Optimization Agent",
    "Attack Surface Analysis Agent",
    "Oracle Manipulation Detection Agent",
    "MEV Protection Agent",
    "Tokenomics Security Agent",
    "Upgradeability Analysis Agent",
    "Dependency Risk Agent",
    "Dangerous Functions Agent",
  ];

  const stats = [
    { value: "11", label: "AI Agents", icon: Users, color: "text-neon-green" },
    {
      value: "44K+",
      label: "Audit Reports",
      icon: Shield,
      color: "text-neon-blue",
    },
    {
      value: "<30s",
      label: "Scan Time",
      icon: Clock,
      color: "text-neon-purple",
    },
    {
      value: "99.9%",
      label: "Accuracy",
      icon: TrendingUp,
      color: "text-neon-green",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAgent((prev) => (prev + 1) % agents.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [agents.length]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden grid-bg">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-16">
        {/* ElizaOS Badge */}
        <div className="inline-flex items-center space-x-2 glass rounded-full px-4 py-2 mb-8 animate-fade-in">
          <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-300">
            ElizaOS AI Agent Prize Submission
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-8 animate-fade-in">
          <span className="text-white">AI-Powered Smart Contract</span>
          <br />
          <span className="bg-gradient-to-r from-neon-green to-neon-blue bg-clip-text text-transparent cyber-glow">
            Security Auditing Platform
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed animate-slide-up">
          Revolutionary multi-agent security analysis powered by{" "}
          <span className="text-neon-green font-semibold">
            11 specialized AI agents
          </span>{" "}
          and enhanced with{" "}
          <span className="text-neon-blue font-semibold">
            44,000+ audit reports
          </span>{" "}
          for unparalleled smart contract security.
        </p>

        {/* Current Agent Display */}
        <div className="mb-12 animate-slide-up">
          <div className="glass rounded-2xl p-6 inline-block cyber-border">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Brain className="h-6 w-6 text-neon-green animate-pulse-glow" />
              </div>
              <span className="text-neon-green font-mono text-lg font-medium">
                {agents[currentAgent]}
              </span>
              <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16 animate-slide-up">
          <button
            onClick={onGetStarted}
            className="group bg-gradient-to-r from-neon-green to-neon-blue text-black px-8 py-4 rounded-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-neon-green flex items-center space-x-2"
          >
            {isAuthenticated ? (
              <>
                <Shield className="h-5 w-5" />
                <span>Start Security Audit</span>
              </>
            ) : (
              <>
                <Github className="h-5 w-5" />
                <span>Connect GitHub</span>
              </>
            )}
            <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>

          <button className="group glass border border-white/20 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 hover:bg-white/10 flex items-center space-x-2">
            <Play className="h-5 w-5" />
            <span>Watch Demo</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto animate-fade-in">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <stat.icon
                className={`h-8 w-8 ${stat.color} mx-auto mb-3 animate-pulse-glow`}
              />
              <div className={`text-3xl font-bold ${stat.color} mb-2`}>
                {stat.value}
              </div>
              <div className="text-gray-400 text-sm uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-4 mt-16 animate-fade-in">
          {[
            {
              icon: Shield,
              text: "Multi-Agent Consensus",
              color: "text-neon-green",
            },
            {
              icon: Brain,
              text: "AI-Powered Analysis",
              color: "text-neon-blue",
            },
            { icon: Zap, text: "Real-time Results", color: "text-neon-purple" },
          ].map((feature, index) => (
            <div
              key={index}
              className="glass rounded-full px-6 py-3 flex items-center space-x-3"
            >
              <feature.icon className={`h-5 w-5 ${feature.color}`} />
              <span className="text-white font-medium">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-neon-green rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
}
