/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createComponentLogger } from "@services/DebugLogger";

const logger = createComponentLogger("HealthMetricsService");

export interface HealthMetrics {
  npuLatency?: number; // Time taken for NPU to process
  vpuStartLatency?: number; // Time from sending message to VPU receiving first token
  mpuTurnaround?: number; // Time taken for MPU to process and store facts
  timestamp: number;
}

export class HealthMetricsService {
  private metrics: HealthMetrics[] = [];
  private maxMetrics = 100; // Keep only last 100 metrics

  // Track NPU latency
  public timeNPUProcessing(): () => void {
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    return () => {
      const endTime = typeof performance !== "undefined" ? performance.now() : Date.now();
      const duration = endTime - startTime;
      
      this.addMetric({ npuLatency: duration, timestamp: Date.now() });
      logger.debug("NPU processing time", { duration: `${duration.toFixed(2)}ms` });
    };
  }

  // Track VPU start latency
  public timeVPUStart(): () => void {
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    return () => {
      const endTime = typeof performance !== "undefined" ? performance.now() : Date.now();
      const duration = endTime - startTime;
      
      this.addMetric({ vpuStartLatency: duration, timestamp: Date.now() });
      logger.debug("VPU start latency", { duration: `${duration.toFixed(2)}ms` });
    };
  }

  // Track MPU turnaround
  public timeMPUProcessing(): () => void {
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    return () => {
      const endTime = typeof performance !== "undefined" ? performance.now() : Date.now();
      const duration = endTime - startTime;
      
      this.addMetric({ mpuTurnaround: duration, timestamp: Date.now() });
      logger.debug("MPU processing time", { duration: `${duration.toFixed(2)}ms` });
    };
  }

  // Add a metric to the collection
  private addMetric(metric: Partial<HealthMetrics>) {
    const fullMetric: HealthMetrics = {
      ...metric,
      timestamp: metric.timestamp || Date.now()
    };
    
    this.metrics.push(fullMetric);
    
    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // Get recent metrics
  public getRecentMetrics(count: number = 10): HealthMetrics[] {
    return this.metrics.slice(-count);
  }

  // Get average metrics
  public getAverageMetrics(): Partial<HealthMetrics> {
    if (this.metrics.length === 0) return {};
    
    const npuLatencies = this.metrics.filter(m => m.npuLatency !== undefined).map(m => m.npuLatency!);
    const vpuLatencies = this.metrics.filter(m => m.vpuStartLatency !== undefined).map(m => m.vpuStartLatency!);
    const mpuTurnarounds = this.metrics.filter(m => m.mpuTurnaround !== undefined).map(m => m.mpuTurnaround!);
    
    return {
      npuLatency: npuLatencies.length > 0 ? npuLatencies.reduce((a, b) => a + b, 0) / npuLatencies.length : undefined,
      vpuStartLatency: vpuLatencies.length > 0 ? vpuLatencies.reduce((a, b) => a + b, 0) / vpuLatencies.length : undefined,
      mpuTurnaround: mpuTurnarounds.length > 0 ? mpuTurnarounds.reduce((a, b) => a + b, 0) / mpuTurnarounds.length : undefined,
      timestamp: Date.now()
    };
  }

  // Clear all metrics
  public clearMetrics(): void {
    this.metrics = [];
  }
}

// Export a singleton instance
export const healthMetricsService = new HealthMetricsService();