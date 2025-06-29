import { Plugin, IAgentRuntime, logger } from '@elizaos/core';
import { VulnerabilityFinding } from '../core/types.js';

/**
 * 🔐 Security Analysis Plugin for 0xCypherpunkAI
 * Provides the core heuristic analysis functions for security scanning.
 */

/**
 * A helper function to find vulnerabilities based on a regex pattern.
 * This will iterate through each file's content and return findings with line numbers.
 */
function findVulnerabilities(
  files: { path: string; content: string }[],
  pattern: RegExp,
  findingDetails: Omit<VulnerabilityFinding, 'id' | 'location' | 'codeSnippet'>
): VulnerabilityFinding[] {
  const findings: VulnerabilityFinding[] = [];
  files.forEach((file) => {
    const lines = file.content.split('\n');
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        findings.push({
          ...findingDetails,
          id: `${findingDetails.type}-${file.path}-${index + 1}`,
          location: {
            file: file.path,
            line: index + 1,
          },
          codeSnippet: line.trim(),
        });
      }
    });
  });
  return findings;
}

/**
 * Performs a general heuristic analysis by combining the core checks.
 * This allows multiple agents to vote on the same set of findings.
 */
export async function performGeneralHeuristicAnalysis(
  files: { path: string; content: string }[],
  runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const allChecks = await Promise.all([
    analyzeStaticCode(files, runtime),
    analyzeDeFiRisk(files, runtime),
    analyzeAccessControl(files, runtime),
    analyzeGasEfficiency(files, runtime),
    analyzeAttackSurface(files, runtime),
    analyzeUpgradeability(files, runtime),
    analyzeOracleManipulation(files, runtime),
    analyzeMEV(files, runtime),
    analyzeTokenomics(files, runtime),
    analyzeDependencyRisk(files, runtime),
    analyzeDangerousFunctions(files, runtime),
  ]);

  // Flatten the array of arrays into a single array of findings
  return allChecks.flat();
}

export const securityAnalysisPlugin: Plugin = {
  name: 'security-analysis',
  description: 'Provides core heuristic analysis functions for the security agents.',
  actions: [],
  providers: [],

  async init(_config: Record<string, string>, _runtime: IAgentRuntime): Promise<void> {
    logger.info('🔐 Security Analysis Plugin initialized with heuristic functions.');
  },
};

// Analysis functions for each of the 11 agents

async function analyzeStaticCode(
  files: { path: string; content: string }[],
  _runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];

  // Reentrancy check
  findings.push(
    ...findVulnerabilities(files, /\.call\(/, {
      type: 'reentrancy',
      severity: 'HIGH',
      title: 'Potential Reentrancy Risk via .call()',
      description:
        'A low-level `.call()` function was detected. This function is often used to send Ether but does not automatically protect against reentrancy attacks. If the recipient is a malicious contract, it can call back into the sending contract before the initial call completes, potentially leading to multiple withdrawals or other unintended state changes.',
      recommendation:
        "Strictly follow the Checks-Effects-Interactions pattern. First, perform all checks (e.g., `require(balance > amount)`). Second, apply all effects to state variables (e.g., `balance -= amount`). Finally, perform the external interaction (the `.call()`). For robust protection, inherit from OpenZeppelin's `ReentrancyGuard` and apply the `nonReentrant` modifier to the function.",
      confidence: 70,
    })
  );

  // Integer overflow check
  findings.push(
    ...findVulnerabilities(files, /(\+\+|--|\+=|-=)/, {
      type: 'overflow',
      severity: 'MEDIUM',
      title: 'Potential Integer Overflow/Underflow',
      description:
        'Direct arithmetic operations were found in a contract that may not be using Solidity 0.8.0+ features for overflow/underflow protection. Unchecked arithmetic can lead to variables wrapping around to zero or their maximum value, causing unexpected behavior and potential exploits.',
      recommendation:
        "For contracts using Solidity versions below 0.8.0, use a safe math library like OpenZeppelin's `SafeMath`. For Solidity 0.8.0 and above, the compiler provides built-in checked arithmetic, but it is still crucial to be aware of where and how arithmetic is performed.",
      confidence: 70,
    })
  );

  return findings;
}

async function analyzeDeFiRisk(
  files: { path: string; content: string }[],
  _runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];
  findings.push(
    ...findVulnerabilities(files, /flashLoan|borrow/, {
      type: 'flashloan',
      severity: 'HIGH',
      title: 'Flash Loan Implementation Detected',
      description:
        'The contract appears to interact with flash loans. While powerful, flash loans can be used to manipulate markets or exploit logic that does not account for massive, temporary liquidity. The entire transaction must be secure against price oracle manipulation and other economic attacks.',
      recommendation:
        'Ensure that any function interacting with flash loans has robust checks to prevent reentrancy and economic exploits. Use time-weighted average prices (TWAPs) for any internal price calculations and consider adding protocol fees to deter malicious actors.',
      confidence: 80,
    })
  );
  findings.push(
    ...findVulnerabilities(files, /oracle|price/, {
      type: 'oracle',
      severity: 'MEDIUM',
      title: 'Oracle Dependency Detected',
      description:
        'A dependency on a price oracle was detected. If the oracle can be manipulated, it can lead to incorrect pricing, unfair liquidations, or theft of funds. A single, on-chain oracle source (like a DEX spot price) is particularly vulnerable.',
      recommendation:
        'Use multiple independent oracle sources to create a more resilient price feed. For on-chain data, prefer Time-Weighted Average Price (TWAP) oracles over spot prices. Implement circuit breakers to halt functionality if oracle prices deviate beyond a safe threshold.',
      confidence: 75,
    })
  );
  return findings;
}

async function analyzeAccessControl(
  files: { path: string; content: string }[],
  _runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];

  // Missing access control
  findings.push(
    ...findVulnerabilities(
      files,
      /function\s+\w+\s*\([^)]*\)\s*(public|external)[^\{]*\{[^\}]*(owner|admin)\s*=/i,
      {
        type: 'access_control',
        severity: 'HIGH',
        title: 'Potential Missing Access Control',
        description:
          'A public or external function appears to modify a critical state variable (e.g., "owner" or "admin") without a clear access control modifier like `onlyOwner`. This could allow any user to take control of the contract.',
        recommendation:
          "Ensure that all functions that modify administrative privileges or critical contract parameters have appropriate access control modifiers. Use established patterns like OpenZeppelin's `Ownable` or a custom role-based access control system.",
        confidence: 75,
      }
    )
  );

  findings.push(
    ...findVulnerabilities(files, /transferOwnership|addOwner/, {
      type: 'privilege_escalation',
      severity: 'MEDIUM',
      title: 'Privilege Escalation Functions Detected',
      description:
        'Functions that transfer or grant ownership-level privileges were detected. If these functions are not properly secured, they can be exploited to give unauthorized users administrative control over the contract.',
      recommendation:
        'Secure ownership transfer functions with a multi-signature wallet or a timelock contract. This ensures that critical changes require multiple approvals or have a time delay, preventing a single point of failure.',
      confidence: 70,
    })
  );

  return findings;
}

async function analyzeGasEfficiency(
  files: { path: string; content: string }[],
  _runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];
  findings.push(
    ...findVulnerabilities(files, /for\s*\(/, {
      type: 'gas_optimization',
      severity: 'LOW',
      title: 'Potentially Inefficient Loop Structure',
      description:
        'A `for` loop was detected. Loops that iterate over large or dynamically-sized arrays can consume an unpredictable amount of gas, potentially exceeding the block gas limit and causing transactions to fail. This is a common vector for denial-of-service attacks.',
      recommendation:
        'When looping over arrays, cache the array length in a memory variable before the loop (e.g., `uint length = array.length;`). If the array can grow indefinitely, consider implementing a pagination pattern or a withdrawal pattern to process items in batches.',
      confidence: 80,
    })
  );
  findings.push(
    ...findVulnerabilities(files, /\.length/, {
      type: 'gas_optimization',
      severity: 'LOW',
      title: 'Inefficient Array Length Access in Loop',
      description:
        "Accessing an array's `.length` property directly within the condition of a loop (`for (uint i = 0; i < array.length; i++)`) causes a storage read on every iteration, which is gas-intensive. This adds unnecessary cost to the transaction.",
      recommendation:
        'Cache the array length to a local memory variable before the loop begins to save gas on each iteration. For example: `uint256 length = array.length; for (uint256 i = 0; i < length; i++) { ... }`.',
      confidence: 60,
    })
  );
  return findings;
}

async function analyzeAttackSurface(
  files: { path: string; content: string }[],
  _runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];
  findings.push(
    ...findVulnerabilities(files, /\.call\(|\.delegatecall\(/, {
      type: 'external_call',
      severity: 'HIGH',
      title: 'Low-Level External Call Detected',
      description:
        'A low-level external call (`.call()`, `.delegatecall()`) was detected. These functions are powerful but bypass type checking and other safety features, making them a significant attack vector if not used carefully. They are a primary source of reentrancy vulnerabilities.',
      recommendation:
        'Prefer direct contract interaction (e.g., `Contract(address).function()`) over low-level calls. If a low-level call is necessary, ensure all inputs are sanitized, reentrancy guards are in place, and the Checks-Effects-Interactions pattern is strictly followed.',
      confidence: 85,
    })
  );
  findings.push(
    ...findVulnerabilities(files, /fallback\(\)|receive\(\)/, {
      type: 'fallback',
      severity: 'MEDIUM',
      title: 'Fallback/Receive Function Detected',
      description:
        'A `fallback()` or `receive()` function was detected. These special functions are executed when a contract receives plain Ether without any data. If not handled carefully, they can introduce vulnerabilities. For example, a fallback function with complex logic can run out of gas, and an unprotected one can allow unintended state changes.',
      recommendation:
        'Keep fallback functions as simple as possible. Their primary purpose should be to emit an event and/or revert. If the contract is not meant to receive Ether, the fallback function should explicitly revert the transaction. Ensure any state changes within the fallback are safe and intentional.',
      confidence: 70,
    })
  );
  return findings;
}

async function analyzeUpgradeability(
  files: { path: string; content: string }[],
  _runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];
  findings.push(
    ...findVulnerabilities(files, /proxy|implementation/, {
      type: 'proxy',
      severity: 'HIGH',
      title: 'Proxy Pattern Detected',
      description:
        'The use of a proxy pattern was detected. While essential for upgradeability, proxies add complexity and risk. Storage layout collisions between the proxy and implementation contracts can lead to critical data corruption. Initialization functions must also be secured to prevent unauthorized access.',
      recommendation:
        'Follow a structured upgrade pattern like UUPS or Transparent Proxies. Use tools from OpenZeppelin or Hardhat to validate storage layout compatibility between upgrades. Ensure initializer functions have an `initializer` modifier and can only be called once.',
      confidence: 80,
    })
  );
  findings.push(
    ...findVulnerabilities(files, /struct.*mapping|mapping.*struct/, {
      type: 'storage',
      severity: 'MEDIUM',
      title: 'Complex Storage Layout Detected',
      description:
        'A complex storage pattern (e.g., a struct containing a mapping, or a mapping to a struct) was detected. While common, these patterns can make contract upgrades difficult and error-prone, as the storage layout must be preserved perfectly.',
      recommendation:
        'Carefully document the storage layout of the contract. When planning an upgrade, write extensive tests to ensure that the new implementation does not corrupt or misinterpret existing storage data. Consider using append-only storage patterns where possible.',
      confidence: 65,
    })
  );
  return findings;
}

async function analyzeOracleManipulation(
  files: { path: string; content: string }[],
  _runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];
  findings.push(
    ...findVulnerabilities(files, /block\.timestamp|now/, {
      type: 'timestamp',
      severity: 'MEDIUM',
      title: 'Timestamp Dependency Detected',
      description:
        'The contract relies on `block.timestamp` or the deprecated `now` for critical logic. This value can be manipulated by miners to a small degree (typically within a 15-second window), which can be enough to affect outcomes in time-sensitive applications like games or ICOs.',
      recommendation:
        'Do not use `block.timestamp` as a source of entropy or for logic that requires precise timing. For most cases, `block.number` is a safer alternative. For critical time-based logic, consider using a decentralized time oracle.',
      confidence: 90,
    })
  );
  findings.push(
    ...findVulnerabilities(files, /getPrice\(\)/, {
      type: 'oracle_manipulation',
      severity: 'HIGH',
      title: 'Potential Single Oracle Dependency',
      description:
        'A function named `getPrice()` was found, which may indicate a dependency on a single price oracle. Relying on a single source of data makes the protocol vulnerable to price manipulation, especially if the source is an on-chain DEX with low liquidity.',
      recommendation:
        'Aggregate prices from multiple, independent oracles (e.g., Chainlink, Uniswap TWAP, other providers) to create a resilient and manipulation-resistant price feed. Implement sanity checks to ensure a new price update is within a reasonable deviation from the previous one.',
      confidence: 75,
    })
  );
  return findings;
}

async function analyzeMEV(
  files: { path: string; content: string }[],
  _runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];
  findings.push(
    ...findVulnerabilities(files, /approve\(/, {
      type: 'front_running',
      severity: 'MEDIUM',
      title: 'Potential Front-Running Risk with approve()',
      description:
        'The standard ERC20 `approve` function can be vulnerable to a front-running attack. If a user approves a new amount while a previous approval is still valid, a malicious actor can spend both the old and new allowance in separate transactions.',
      recommendation:
        "Use `increaseAllowance()` and `decreaseAllowance()` from OpenZeppelin's ERC20 implementation instead of `approve()` directly for changing allowances. Alternatively, set the allowance to 0 before setting it to a new value.",
      confidence: 70,
    })
  );
  findings.push(
    ...findVulnerabilities(files, /swap|trade/, {
      type: 'sandwich_attack',
      severity: 'MEDIUM',
      title: 'Potential Sandwich Attack Vector',
      description:
        "The presence of `swap` or `trade` functions indicates that the contract interacts with decentralized exchanges. These interactions are vulnerable to sandwich attacks, where a searcher can front-run and back-run a user's trade to extract value, resulting in a worse price for the user.",
      recommendation:
        'Implement strong slippage protection in all trading functions, allowing users to specify the maximum price deviation they are willing to tolerate. For sensitive transactions, consider using a private mempool submission service like Flashbots.',
      confidence: 65,
    })
  );
  return findings;
}

async function analyzeTokenomics(
  files: { path: string; content: string }[],
  _runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];
  findings.push(
    ...findVulnerabilities(files, /mint\(/, {
      type: 'unlimited_mint',
      severity: 'HIGH',
      title: 'Minting Capability Detected',
      description:
        "A `mint()` function was detected, allowing for the creation of new tokens. If this function is not properly protected with access control and a supply cap, it can be exploited to create an infinite number of tokens, destroying the token's value.",
      recommendation:
        'Ensure that minting is controlled by a trusted role (e.g., `onlyOwner` or a DAO) and that there is a hard cap on the total supply to prevent hyper-inflation. All minting events should be emitted for transparency.',
      confidence: 85,
    })
  );
  findings.push(
    ...findVulnerabilities(files, /approve\(\w+,\s*type\(uint256\)\.max\)/, {
      type: 'unlimited_approval',
      severity: 'MEDIUM',
      title: 'Unlimited ERC20 Approval Pattern',
      description:
        "An approval for `uint256.max` was detected. While convenient, this pattern grants the approved contract the ability to spend an infinite number of the user's tokens. If the approved contract is exploited, all of the user's tokens can be stolen.",
      recommendation:
        'Encourage users to approve specific amounts required for a transaction rather than an unlimited amount. If unlimited approval is a desired feature for user experience, clearly communicate the risks involved.',
      confidence: 80,
    })
  );
  return findings;
}

async function analyzeDependencyRisk(
  files: { path: string; content: string }[],
  _runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];
  findings.push(
    ...findVulnerabilities(files, /import.*from/, {
      type: 'dependency',
      severity: 'MEDIUM',
      title: 'External Library Dependency Detected',
      description:
        'The contract imports external dependencies. While necessary, these dependencies can introduce vulnerabilities if they are not from a trusted source or if an outdated version with known issues is used.',
      recommendation:
        'Only use dependencies from well-audited and reputable sources like OpenZeppelin. Pin dependencies to a specific, audited version and use a tool like Slither to check for known vulnerabilities in the dependency tree.',
      confidence: 70,
    })
  );
  findings.push(
    ...findVulnerabilities(files, /pragma solidity.*(0\.[4-7]\.|0\.8\.[0-9][^0-9])/, {
      type: 'version',
      severity: 'MEDIUM',
      title: 'Outdated Solidity Version Detected',
      description:
        'The contract is written for an older version of the Solidity compiler. Newer compiler versions include critical security improvements, bug fixes, and features like built-in overflow checks (0.8.0+). Using an old version can leave the contract exposed to known vulnerabilities.',
      recommendation:
        'Migrate the contract to a recent and stable Solidity version (e.g., 0.8.20+). Thoroughly test the migrated code to ensure that changes in compiler behavior do not introduce new bugs.',
      confidence: 90,
    })
  );
  return findings;
}

async function analyzeDangerousFunctions(
  files: { path: string; content: string }[],
  _runtime: IAgentRuntime
): Promise<VulnerabilityFinding[]> {
  const findings: VulnerabilityFinding[] = [];

  // delegatecall
  findings.push(
    ...findVulnerabilities(files, /delegatecall/, {
      type: 'delegatecall',
      severity: 'HIGH',
      title: 'Dangerous `delegatecall` Usage',
      description:
        "`delegatecall` is a powerful but dangerous low-level function that executes code from another contract within the context of the calling contract. An error in the target contract can corrupt the calling contract's storage, and it can be a vector for complex exploits.",
      recommendation:
        'Avoid `delegatecall` whenever possible. If it is essential (e.g., for proxy patterns), ensure the target contract is fully trusted and audited. Never use it with untrusted or user-supplied addresses. Implement strict input validation on any function that uses it.',
      confidence: 95,
    })
  );

  // tx.origin
  findings.push(
    ...findVulnerabilities(files, /tx\.origin/, {
      type: 'tx_origin',
      severity: 'HIGH',
      title: 'Dangerous `tx.origin` Usage for Authorization',
      description:
        "The use of `tx.origin` for authorization is a significant security risk. It refers to the original external account that started the transaction. A malicious contract can trick a user into calling it, and then the malicious contract can call your contract, making `tx.origin` the user's address. This makes the contract vulnerable to phishing attacks.",
      recommendation:
        'Always use `msg.sender` instead of `tx.origin` for authorization checks. `msg.sender` correctly identifies the immediate calling account (which could be another contract), preventing this type of phishing vulnerability.',
      confidence: 95,
    })
  );

  // selfdestruct
  findings.push(
    ...findVulnerabilities(files, /selfdestruct|suicide/, {
      type: 'selfdestruct',
      severity: 'HIGH',
      title: '`selfdestruct` Function Detected',
      description:
        'The `selfdestruct` (or `suicide`) function destroys the contract and forcibly sends all its Ether to a target address. If an attacker can gain control of a function that calls `selfdestruct`, they can permanently delete the contract, locking any assets it holds other than Ether.',
      recommendation:
        'The use of `selfdestruct` is strongly discouraged. Consider alternative mechanisms for deactivating a contract, such as a state variable that disables all functions (`isPaused`). This allows for a graceful shutdown without the risk of permanently destroying the contract and its assets.',
      confidence: 95,
    })
  );

  return findings;
}
