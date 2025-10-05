type Action = () => Promise<void>;

class ActionQueue {
  private q: { id: string; run: Action; attempts: number }[] = [];
  private running = false;

  enqueue(id: string, run: Action) {
    this.q.push({ id, run, attempts: 0 });
  }

  async replay(maxAttempts = 3) {
    if (this.running) return;
    this.running = true;
    try {
      const next: typeof this.q = [];
      while (this.q.length) {
        const item = this.q.shift()!;
        try {
          await item.run();
        } catch (e) {
          item.attempts += 1;
          if (item.attempts < maxAttempts) next.push(item);
        }
      }
      this.q = next;
    } finally {
      this.running = false;
    }
  }

  size() {
    return this.q.length;
  }
}

export const actionQueue = new ActionQueue();

