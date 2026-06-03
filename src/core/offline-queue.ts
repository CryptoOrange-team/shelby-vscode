/**
 * Offline Queue — buffers operations when offline, flushes on reconnect.
 *
 * When the network is unavailable:
 *   1. User-initiated operations are serialized into the queue
 *   2. Status bar shows pending count
 *   3. On reconnect, the queue auto-flushes in FIFO order
 *   4. Failed flushes are retried with exponential backoff
 */

import type { AccountConfig } from '../types/shelby';

// ── Queue Item Types ────────────────────────────────────

export type QueueItemType = 'delete' | 'upload';

export interface QueueItem {
  readonly id: string;
  readonly type: QueueItemType;
  readonly blobName: string;
  readonly account: AccountConfig;
  readonly data?: Uint8Array;
  readonly expirationDays: number;
  readonly createdAt: number;
  readonly retryCount: number;
}

// ── Queue ───────────────────────────────────────────────

export class OfflineQueue {
  private items: QueueItem[] = [];
  private flushing = false;

  /** Number of pending items */
  get pendingCount(): number {
    return this.items.length;
  }

  /** All pending items (read-only) */
  get pending(): readonly QueueItem[] {
    return this.items;
  }

  /** Enqueue an operation */
  enqueue(item: Omit<QueueItem, 'createdAt' | 'id' | 'retryCount'>): QueueItem {
    const queued: QueueItem = {
      ...item,
      id: generateId(),
      createdAt: Date.now(),
      retryCount: 0,
    };
    this.items.push(queued);
    return queued;
  }

  /** Remove an item by ID */
  remove(id: string): boolean {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx >= 0) {
      this.items.splice(idx, 1);
      return true;
    }
    return false;
  }

  /** Clear all items */
  clear(): void {
    this.items = [];
  }

  /**
   * Flush all pending items in FIFO order.
   * Calls `processor` for each item. Failed items are retried (max 3 attempts).
   * Returns counts of succeeded/failed.
   */
  async flush(
    processor: (item: QueueItem) => Promise<void>,
    onProgress?: (completed: number, total: number) => void,
  ): Promise<{ succeeded: number; failed: number }> {
    if (this.flushing || this.items.length === 0) {
      return { succeeded: 0, failed: 0 };
    }

    this.flushing = true;
    let succeeded = 0;
    let failed = 0;
    const total = this.items.length;

    // Work on a copy, clearing original
    const pending = [...this.items];
    this.items = [];

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      if (item === undefined) continue;
      try {
        await processor(item);
        succeeded++;
      } catch {
        if (item.retryCount < 2) {
          // Re-queue with incremented retryCount (immutable: create new object)
          this.items.push({ ...item, retryCount: item.retryCount + 1 });
          failed++;
        } else {
          // Give up after 3 retries
          failed++;
        }
      }
      onProgress?.(i + 1, total);
    }

    this.flushing = false;
    // Include re-queued (retry) items in the failure count for accurate reporting
    return { succeeded, failed: failed + this.items.length };
  }
}

// ── Helpers ──────────────────────────────────────────────

function generateId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
