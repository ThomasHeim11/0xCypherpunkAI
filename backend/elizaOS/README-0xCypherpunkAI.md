# 🌆 0xCypherpunkAI - Elite Multi-Agent Security Platform

**A cyberpunk-themed smart contract security auditing platform powered by ElizaOS multi-agent system**

## 🎭 System Overview

0xCypherpunkAI is a cutting-edge security auditing platform that deploys 6 specialized AI agents working in concert to provide comprehensive smart contract security analysis. Using advanced consensus voting mechanisms, our agents collaborate to identify vulnerabilities across 5 critical security domains.

### 🤖 The Agent Collective

| Agent                       | Domain           | Specialization                            | Voice         |
| --------------------------- | ---------------- | ----------------------------------------- | ------------- |
| 🎯 **SecurityOrchestrator** | Coordination     | Multi-agent consensus & reporting         | Male Medium   |
| ⚡ **ReentrancyAgent**      | Reentrancy       | CEI pattern violations & external calls   | Male High     |
| 🛡️ **AccessControlAgent**   | Authorization    | Permission systems & privilege escalation | Female Medium |
| 🔢 **ArithmeticAgent**      | Mathematics      | Overflow/underflow & precision loss       | Male Low      |
| ⚡ **FlashLoanAgent**       | DeFi Exploits    | Atomic transactions & oracle manipulation | Male High     |
| 🏛️ **GovernanceAgent**      | Decentralization | DAO security & centralization risks       | Female Low    |

## 🚀 Quick Start

### Prerequisites

- **Bun** v1.2.17+ (package manager)
- **Node.js** v23.3.0+
- **OpenAI API Key** (for AI functionality)

### Installation & Setup

1. **Navigate to ElizaOS directory:**

   ```bash
   cd backend/elizaOS
   ```

2. **Install dependencies:**

   ```bash
   bun install
   ```

3. **Build the system:**

   ```bash
   bun run build
   ```

4. **Configure environment:**

   ```bash
   cp .env.example .env
   # Add your OpenAI API key to .env
   ```

5. **Start the multi-agent system:**
   ```bash
   bun run start
   ```

## 🎯 Agent Character Files

Each agent is defined by a comprehensive character file with specialized knowledge:

### Character Structure

```json
{
  "name": "AgentName",
  "username": "agent_handle",
  "description": "Agent specialization description",
  "system": "Detailed system prompt defining agent behavior",
  "bio": ["Agent background and expertise"],
  "lore": ["Agent origin story and experience"],
  "knowledge": ["Domain-specific security knowledge"],
  "messageExamples": [
    /* Conversation examples */
  ],
  "postExamples": ["Security tips and insights"],
  "topics": ["Security domains"],
  "adjectives": ["Personality traits"],
  "style": {
    /* Communication style guidelines */
  },
  "plugins": ["@elizaos/plugin-openai", "@elizaos/plugin-bootstrap"],
  "settings": { "ragKnowledge": true }
}
```

### Available Character Files

- `characters/security-orchestrator.json` - Master coordinator
- `characters/reentrancy-agent.json` - Reentrancy specialist
- `characters/access-control-agent.json` - Authorization expert
- `characters/arithmetic-agent.json` - Mathematical vulnerability hunter
- `characters/flashloan-agent.json` - DeFi exploit detector
- `characters/governance-agent.json` - Governance security analyst

## 🔧 Project Configuration

The system is configured via `characters/0xCypherpunkAI-project.ts`:

```typescript
export const project: Project = {
  agents: [
    { character: securityOrchestrator },
    { character: reentrancyAgent },
    { character: accessControlAgent },
    { character: arithmeticAgent },
    { character: flashLoanAgent },
    { character: governanceAgent },
  ],
};
```

## 🗳️ Consensus Voting System

### Voting Mechanism

- **Standard Consensus:** 60% agreement required
- **Critical Vulnerabilities:** 80% agreement required
- **Conflict Resolution:** Evidence-based arbitration
- **Domain Expertise:** Weighted scoring based on agent specialization

### Consensus Process

1. **COLLECT:** Gather all agent findings
2. **ANALYZE:** Cross-reference vulnerability interactions
3. **VOTE:** Apply weighted scoring based on expertise
4. **RESOLVE:** Address conflicts through evidence review
5. **SYNTHESIZE:** Generate unified security assessment

## 🎯 Security Analysis Workflow

### 1. Contract Submission

- Upload smart contract source code
- Specify analysis scope and priorities
- Configure agent deployment parameters

### 2. Multi-Agent Analysis

Each agent performs specialized analysis:

- **ReentrancyAgent:** Scans for external call patterns
- **AccessControlAgent:** Audits permission systems
- **ArithmeticAgent:** Analyzes mathematical operations
- **FlashLoanAgent:** Identifies atomic exploit vectors
- **GovernanceAgent:** Evaluates governance mechanisms

### 3. Consensus Voting

- Agents submit findings with severity ratings
- Voting threshold requirements applied
- Conflicts resolved through evidence review
- Final consensus ratings determined

### 4. Report Generation

**SecurityOrchestrator** synthesizes findings into:

- Executive summary with risk assessment
- Detailed vulnerability breakdown by agent
- Consensus voting results table
- Prioritized remediation recommendations
- Code fixes and security patterns

## 📊 Example Analysis Output

```markdown
## Multi-Agent Voting Results

| Vulnerability  | ReentrancyAgent | AccessControlAgent | ArithmeticAgent | FlashLoanAgent | GovernanceAgent | Consensus         |
| -------------- | --------------- | ------------------ | --------------- | -------------- | --------------- | ----------------- |
| Reentrancy     | 🔴 CRITICAL     | ✅ Confirmed       | ⚠️ Present      | ✅ Confirmed   | ✅ Confirmed    | **100% CRITICAL** |
| Access Control | ✅ Confirmed    | 🔴 CRITICAL        | ✅ Confirmed    | ✅ Confirmed   | 🔴 CRITICAL     | **100% CRITICAL** |

### Final Consensus: 🔴 CRITICAL
```

## 🔥 Key Features

### 🎭 Multi-Agent Intelligence

- **Specialized Expertise:** Each agent focuses on specific security domains
- **Collective Wisdom:** Combines multiple perspectives for comprehensive analysis
- **Consensus Voting:** Democratic decision-making with evidence-based resolution

### 🌆 Cyberpunk Aesthetic

- **Matrix-style Interface:** Neon colors and futuristic design
- **Agent Personalities:** Unique cyberpunk-themed character backgrounds
- **Terminal Styling:** Command-line inspired user experience

### 🔒 Comprehensive Security Coverage

- **5 Security Domains:** Complete vulnerability coverage
- **12+ Vulnerability Types:** From reentrancy to governance attacks
- **Real-world Exploit Patterns:** Based on actual DeFi hacks and exploits

### ⚡ Advanced AI Capabilities

- **RAG Knowledge Base:** Extensive security knowledge integration
- **Natural Language Analysis:** Human-readable security explanations
- **Code Pattern Recognition:** Automated vulnerability detection

## 🧪 Testing & Validation

### Test Contract

The system includes `test-contracts/VulnerableContract.sol` containing:

- **Reentrancy vulnerabilities** in withdrawal functions
- **Access control failures** with missing modifiers
- **Arithmetic vulnerabilities** without SafeMath
- **Flash loan attack vectors** in governance
- **Centralization risks** with single owner control

### Sample Analysis Report

See `analysis-reports/vulnerable-contract-analysis.md` for a complete example of multi-agent security analysis.

## 🛠️ Technical Architecture

### ElizaOS Integration

- **Native ElizaOS Characters:** Full integration with ElizaOS agent system
- **Plugin Architecture:** Extensible with custom security plugins
- **TypeScript Implementation:** Type-safe agent definitions

### Project Structure

```
backend/elizaOS/
├── characters/               # Agent character definitions
│   ├── reentrancy-agent.json
│   ├── access-control-agent.json
│   ├── arithmetic-agent.json
│   ├── flashloan-agent.json
│   ├── governance-agent.json
│   ├── security-orchestrator.json
│   └── 0xCypherpunkAI-project.ts
├── src/
│   └── index.ts             # Main project entry point
├── test-contracts/          # Vulnerable contracts for testing
├── analysis-reports/        # Sample analysis outputs
└── knowledge/               # RAG knowledge base (future)
```

## 🚀 Future Enhancements

### Planned Features

- **Chainlink Integration:** On-chain verification and monitoring
- **Custom Security Plugins:** Domain-specific vulnerability detectors
- **Real-time Monitoring:** Continuous contract surveillance
- **ML Model Training:** Improved pattern recognition
- **API Endpoints:** Programmatic access to security analysis

### Roadmap

1. **Phase 1:** Core multi-agent system ✅
2. **Phase 2:** Frontend integration with cyberpunk UI
3. **Phase 3:** Chainlink oracle integration
4. **Phase 4:** Custom plugin development
5. **Phase 5:** Enterprise security dashboard

## 💡 Usage Examples

### Starting Individual Agents

```bash
# Start a specific agent
bun run start --character characters/reentrancy-agent.json

# Start multiple agents
bun run start --character characters/reentrancy-agent.json characters/access-control-agent.json
```

### Full Multi-Agent System

```bash
# Start complete security platform
bun run start
```

### API Endpoints (when running)

```bash
# List active agents
curl http://localhost:3000/api/agents

# Get agent details
curl http://localhost:3000/api/agents/{agentId}

# Submit contract for analysis (future)
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"contract": "contract source code"}'
```

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and test with the vulnerable contract
4. Submit pull request with detailed description

### Agent Development Guidelines

- Follow ElizaOS character file format
- Include comprehensive knowledge base
- Provide diverse message examples
- Maintain cyberpunk aesthetic
- Test with multiple vulnerability types

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ElizaOS Team:** For the incredible multi-agent framework
- **Security Community:** For vulnerability research and patterns
- **DeFi Protocols:** For real-world security lessons
- **Cyberpunk Genre:** For the aesthetic inspiration

---

## 🌆 Welcome to the Future of Smart Contract Security

_In the neon-lit world of Web3, where code is law and vulnerabilities are exploits waiting to happen, 0xCypherpunkAI stands as the ultimate guardian. Our AI agents work tirelessly in the digital shadows, hunting vulnerabilities and protecting the decentralized future._

**Ready to secure the metaverse? Deploy the agents. Trust the consensus. Secure the future.**

---

_Built with ❤️ by the 0xCypherpunkAI team_  
_Powered by ElizaOS • Secured by AI • Protected by Consensus_
