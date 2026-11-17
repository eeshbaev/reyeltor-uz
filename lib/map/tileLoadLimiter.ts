/** Limits concurrent native tile image loads; low-priority (underlay) tiles wait for visible ones. */
class TileLoadLimiter {
  private active = 0;
  private high: Array<() => void> = [];
  private low: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number) {}

  acquire(priority: 'high' | 'low' = 'high'): Promise<void> {
    if (this.active < this.maxConcurrent && (priority === 'high' || this.high.length === 0)) {
      this.active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      (priority === 'high' ? this.high : this.low).push(() => {
        this.active += 1;
        resolve();
      });
    });
  }

  release(): void {
    this.active = Math.max(0, this.active - 1);
    const next = this.high.shift() ?? this.low.shift();
    if (next) next();
  }
}

// Tiles come from several hosts (a-d subdomains), so a few more parallel loads are fine.
export const tileLoadLimiter = new TileLoadLimiter(10);
