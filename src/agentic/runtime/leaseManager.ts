export interface Lease {
  resource: string;
  holder: string;
  acquiredAt: string;
  expiresAt: string;
}

export class LeaseManager {
  private readonly leases = new Map<string, Lease>();

  acquire(resource: string, holder: string, ttlMs: number, now = new Date()): Lease {
    if (!resource.trim() || !holder.trim()) throw new Error('Lease exige resource e holder.');
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new Error('Lease exige ttlMs positivo.');
    const current = this.leases.get(resource);
    if (current && Date.parse(current.expiresAt) > now.getTime() && current.holder !== holder) {
      throw new Error(`Recurso já está bloqueado por ${current.holder}: ${resource}`);
    }
    const lease = Object.freeze({
      resource,
      holder,
      acquiredAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    });
    this.leases.set(resource, lease);
    return lease;
  }

  assertHeld(resource: string, holder: string, now = new Date()): Lease {
    const lease = this.leases.get(resource);
    if (!lease || lease.holder !== holder || Date.parse(lease.expiresAt) <= now.getTime()) {
      throw new Error(`Lease válida não encontrada para ${holder}: ${resource}`);
    }
    return lease;
  }

  release(resource: string, holder: string): void {
    const lease = this.leases.get(resource);
    if (!lease) return;
    if (lease.holder !== holder) throw new Error(`Lease pertence a ${lease.holder}, não a ${holder}.`);
    this.leases.delete(resource);
  }
}
