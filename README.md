# 0xCypherpunkAI Security Scanner

<div align="center">

![0xCypherpunkAI Logo](https://img.shields.io/badge/0xCypherpunkAI-Security%20Scanner-00ff94?style=for-the-badge&logo=ethereum&logoColor=white)

**Heuristic-Based Smart Contract Security Analysis Platform**

[![ElizaOS](https://img.shields.io/badge/Built%20with-ElizaOS-bd00ff?style=flat-square)](https://github.com/elizaos/eliza)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-00d9ff?style=flat-square)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178c6?style=flat-square)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-06b6d4?style=flat-square)](https://tailwindcss.com/)

</div>

## 🚀 Overview

0xCypherpunkAI is a high-speed security analysis platform built for the **ElizaOS AI Agent Prize**. It utilizes a novel approach where **3 parallel agents** run a suite of deterministic, heuristic-based checks and reach a consensus on findings. This provides comprehensive smart contract security audits in under 30 seconds.

### 🎯 Built for ElizaOS AI Agent Prize

This project demonstrates the power and flexibility of ElizaOS's multi-agent framework. Instead of slow, LLM-based analysis, we use agents as fast, parallel workers that vote on findings from a shared heuristic engine, showcasing a practical and performant use case for agent-based systems.

## ✨ Features

- **⚡ Rapid Heuristic Analysis**: A comprehensive suite of fast, deterministic checks for common vulnerabilities.
- **🤝 3-Agent Consensus Model**: Multiple agents run the same analysis in parallel and vote on findings to ensure accuracy and eliminate noise.
- **🔗 GitHub Integration**: Scan any public Solidity repository directly via URL.
- **📖 Detailed & Educational Reports**: Each finding includes an in-depth explanation of the risk and a clear, actionable recommendation for mitigation.
- **🎨 Cyberpunk UI**: Modern, responsive interface with neon aesthetics.
- **🔒 Secure Architecture**: Backend-managed OAuth with secure token handling for private repository scanning.

## 🏗️ Architecture

### Backend (ElizaOS)

The backend leverages ElizaOS to manage a pool of 3 agents. When a scan is requested, the system fetches the repository content and distributes it to the agents. Each agent independently runs the same `performGeneralHeuristicAnalysis` function, and their results are fed into a `VoteEngine` that confirms findings based on consensus.

- **Framework**: ElizaOS Multi-Agent System
- **Agents**: 3 parallel workers running a deterministic heuristic engine
- **Consensus**: A custom `VoteEngine` service to confirm vulnerabilities
- **Runtime**: Bun
- **Database**: PGLite/PostgreSQL
- **Authentication**: GitHub OAuth 2.0
- **API**: RESTful endpoints for GitHub integration

### Frontend (Next.js)

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom cyberpunk theme
- **Icons**: Lucide React
- **Authentication**: Token-based with dynamic backend discovery

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ or **Bun** runtime
- **Git** for repository access
- **GitHub OAuth App** (for repository scanning)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/0xCypherpunkAI.git
cd 0xCypherpunkAI
```

### 2. Set Up GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create a new OAuth App with:
   - **Application name**: `0xCypherpunkAI Security Scanner`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3001/api/auth/github/callback`
3. Copy the Client ID and Client Secret

### 3. Configure Backend Environment

```bash
cd backend/elizaOS
cp .env.example .env
```

Edit `.env` file:

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### 4. Install Dependencies & Start Backend

```bash
# Install dependencies
bun install

# Build the project
bun run build

# Start the backend on port 3001
SERVER_PORT=3001 bun run start
```

### 5. Start Frontend

```bash
cd ../../frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## 🔧 Configuration

### Environment Variables

#### Backend (`backend/elizaOS/.env`)

```env
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
SERVER_PORT=3001
```

#### Frontend (`frontend/.env.local`) - Optional

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📡 API Endpoints

### Authentication

- `GET /api/auth/github` - Initiate GitHub OAuth flow
- `GET /api/auth/github/callback` - OAuth callback handler

### GitHub Integration

- `GET /api/github/repos` - List user repositories
- `GET /api/github/user` - Get user profile
- `POST /api/github/scan` - Start security scan

### Request Examples

```bash
# List repositories (requires authentication)
curl -H "Authorization: Bearer <token>" \
     http://localhost:3001/api/github/repos

# Start security scan
curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"repository":"username/repo-name","path":""}' \
     http://localhost:3001/api/github/scan
```

## 🧪 Testing

### Backend Tests

```bash
cd backend/elizaOS
bun run test
```

### Frontend Tests

```bash
cd frontend
npm run test
```

## 🎨 Design System

### Color Palette

- **Neon Green**: `#00ff94` - Primary actions, success states
- **Neon Blue**: `#00d9ff` - Secondary elements, links
- **Neon Purple**: `#bd00ff` - Accents, highlights
- **Dark**: `#0a0a0a` - Background, containers

### Typography

- **Font**: Inter (system fallback to sans-serif)
- **Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

## 🏛️ Project Structure

```
0xCypherpunkAI/
├── backend/
│   └── elizaOS/                 # ElizaOS backend
│       ├── packages/
│       │   ├── server/          # Main server package
│       │   │   └── src/
│       │   │       └── api/
│       │   │           ├── auth.ts      # GitHub OAuth
│       │   │           ├── github.ts    # GitHub API integration
│       │   │           └── index.ts     # API router
│       │   ├── core/            # Core ElizaOS components
│       │   └── cli/             # CLI tools
│       └── .env                 # Environment configuration
├── frontend/
│   ├── app/                     # Next.js app router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main page
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── layout/             # Layout components
│   │   └── sections/           # Page sections
│   ├── lib/
│   │   └── api.ts              # API utilities
│   └── types/
│       └── index.ts            # TypeScript types
└── README.md                   # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 ElizaOS AI Agent Prize Submission

This project demonstrates the power of ElizaOS's multi-agent framework by:

- **Innovative Agent Model**: Shifting from slow LLM-based analysis to a high-speed, consensus-driven heuristic model. Agents act as parallel validators, a novel and practical application of the agent framework.
- **Real-World Application**: A practical and extremely fast security analysis tool for the Web3 ecosystem.
- **Scalable Architecture**: Built on ElizaOS's robust plugin and service system, capable of handling complex analysis workflows.
- **User Experience**: An intuitive interface that makes powerful security analysis accessible and easy to understand.

### Key Technical Achievements

1.  **Heuristic Consensus Engine**: Developed a system where agents vote on findings from a deterministic analysis, ensuring high speed and accuracy.
2.  **Recursive GitHub Fetching**: Implemented a robust, cached, and authenticated service to fetch all `.sol` files from a repository, including those in subdirectories.
3.  **Detailed Reporting**: Created a vulnerability reporting structure that provides deep educational context and actionable recommendations for every finding.
4.  **Performant Architecture**: Refactored the agent and service architecture to be highly performant, delivering full repository scans in seconds.

## 🔗 Links

- **ElizaOS**: [https://github.com/elizaos/eliza](https://github.com/elizaos/eliza)
- **ElizaOS Documentation**: [https://elizaos.ai](https://elizaos.ai)
- **Next.js**: [https://nextjs.org](https://nextjs.org)
- **Tailwind CSS**: [https://tailwindcss.com](https://tailwindcss.com)

## 📞 Support

For questions or support regarding this ElizaOS AI Agent Prize submission:

- **Issues**: Use the GitHub Issues tab
- **Discussions**: Use GitHub Discussions for questions

---

<div align="center">

**Built with ❤️ for the ElizaOS AI Agent Prize**

_Securing the Web3 ecosystem, one smart contract at a time_

</div>
