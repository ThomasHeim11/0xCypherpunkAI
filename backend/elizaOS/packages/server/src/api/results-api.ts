import { IAgentRuntime, logger, Route } from '@elizaos/core';
import { SecurityScanningService } from '../core/security-scanning-service.js';

async function handleGetScanResult(req: any, res: any, runtime: IAgentRuntime) {
  try {
    const securityService = runtime.getService<SecurityScanningService>(
      SecurityScanningService.serviceType
    );
    if (!securityService) {
      throw new Error('SecurityScanningService not available');
    }

    // scanId is expected to be part of the path, e.g., /api/results/scan_123
    // The web server framework needs to parse this into req.params
    const { scanId } = req.params;

    if (!scanId) {
      return res.status(400).json({ error: 'Missing required path parameter: scanId' });
    }

    const result = securityService.getScanResult(scanId);

    if (!result) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    res.json(result);
  } catch (error: any) {
    logger.error(`Failed to get scan result:`, error);
    res.status(500).json({ error: error.message || 'Failed to get scan result.' });
  }
}

export const resultsApiRoutes: Route[] = [
  {
    // The :scanId part is a placeholder for a dynamic parameter
    path: '/results/:scanId',
    type: 'GET',
    handler: handleGetScanResult,
  },
];
