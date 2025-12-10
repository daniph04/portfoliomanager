// History service for managing portfolio snapshots
// Smart sampling strategy for different time ranges

import { PortfolioSnapshot } from './types';

// Sampling intervals (in minutes)
const SAMPLING_CONFIG = {
    realtime: 5,     // Every 5 minutes for current day
    daily: 60,       // Every hour for past week
    weekly: 240,     // Every 4 hours for past month
    monthly: 1440,   // Daily for past year
};

// Maximum data points per range
const MAX_POINTS = {
    '1D': 96,   // Every 15 min = 96 points
    '1W': 42,   // Every 4 hours = 42 points
    '1M': 30,   // Daily = 30 points
    '1Y': 52,   // Weekly = 52 points
    'ALL': 100, // Adaptive sampling
};

// Check if enough time has passed since last snapshot
export const shouldRecordSnapshot = (
    lastSnapshot: PortfolioSnapshot | null,
    currentTimeMs: number = Date.now()
): boolean => {
    if (!lastSnapshot) return true;

    const lastTime = new Date(lastSnapshot.timestamp).getTime();
    const elapsed = currentTimeMs - lastTime;
    const minimumInterval = SAMPLING_CONFIG.realtime * 60 * 1000; // 5 minutes

    return elapsed >= minimumInterval;
};

// Create a new snapshot
export const createSnapshot = (
    memberId: string,
    totalValue: number,
    costBasis: number
): PortfolioSnapshot => {
    return {
        timestamp: new Date().toISOString(),
        memberId,
        totalValue,
        costBasis,
    };
};

// Aggregate snapshots for a given time range
export const aggregateSnapshots = (
    snapshots: PortfolioSnapshot[],
    range: '1D' | '1W' | '1M' | '1Y' | 'ALL',
    memberId?: string
): PortfolioSnapshot[] => {
    // Filter by member if specified
    let filtered = memberId
        ? snapshots.filter(s => s.memberId === memberId)
        : snapshots;

    if (filtered.length === 0) return [];

    // Get time cutoff
    const now = Date.now();
    const cutoffs: Record<string, number> = {
        '1D': now - 24 * 60 * 60 * 1000,
        '1W': now - 7 * 24 * 60 * 60 * 1000,
        '1M': now - 30 * 24 * 60 * 60 * 1000,
        '1Y': now - 365 * 24 * 60 * 60 * 1000,
        'ALL': 0,
    };

    filtered = filtered.filter(s =>
        new Date(s.timestamp).getTime() >= cutoffs[range]
    );

    // Sort by time
    filtered.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Downsample if too many points
    const maxPoints = MAX_POINTS[range];
    if (filtered.length <= maxPoints) return filtered;

    // Simple downsampling: take evenly spaced points
    const step = filtered.length / maxPoints;
    const result: PortfolioSnapshot[] = [];

    for (let i = 0; i < maxPoints; i++) {
        const index = Math.floor(i * step);
        result.push(filtered[index]);
    }

    // Always include the latest point
    if (result[result.length - 1] !== filtered[filtered.length - 1]) {
        result.push(filtered[filtered.length - 1]);
    }

    return result;
};

// Clean up old snapshots (keep reasonable amount of history)
export const cleanupOldSnapshots = (
    snapshots: PortfolioSnapshot[],
    maxAgeMs: number = 365 * 24 * 60 * 60 * 1000 // 1 year default
): PortfolioSnapshot[] => {
    const cutoff = Date.now() - maxAgeMs;
    return snapshots.filter(s =>
        new Date(s.timestamp).getTime() >= cutoff
    );
};

// Storage key for snapshots
const SNAPSHOTS_KEY = 'portfolio_snapshots';

// Save snapshots to localStorage
export const saveSnapshots = (snapshots: PortfolioSnapshot[]): void => {
    if (typeof window === 'undefined') return;

    try {
        // Clean up old data before saving
        const cleaned = cleanupOldSnapshots(snapshots);
        localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(cleaned));
    } catch (error) {
        console.error('Error saving snapshots:', error);
        // If storage is full, remove oldest half
        try {
            const halfIndex = Math.floor(snapshots.length / 2);
            const reduced = snapshots.slice(halfIndex);
            localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(reduced));
        } catch {
            console.error('Failed to save even reduced snapshots');
        }
    }
};

// Load snapshots from localStorage
export const loadSnapshots = (): PortfolioSnapshot[] => {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(SNAPSHOTS_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error loading snapshots:', error);
    }
    return [];
};

// Record a new snapshot (integrates with existing data)
export const recordSnapshot = (
    memberId: string,
    totalValue: number,
    costBasis: number
): PortfolioSnapshot[] => {
    const snapshots = loadSnapshots();

    // Find last snapshot for this member
    const memberSnapshots = snapshots.filter(s => s.memberId === memberId);
    const lastSnapshot = memberSnapshots.length > 0
        ? memberSnapshots[memberSnapshots.length - 1]
        : null;

    // Check if we should record
    if (!shouldRecordSnapshot(lastSnapshot)) {
        return snapshots;
    }

    // Create and add new snapshot
    const newSnapshot = createSnapshot(memberId, totalValue, costBasis);
    const updated = [...snapshots, newSnapshot];

    // Save and return
    saveSnapshots(updated);
    return updated;
};
