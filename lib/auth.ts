// Authentication for Portfolio League
// Simple shared group password - no individual user accounts

const ACCESS_KEY = "portfolio_league_access";

/**
 * Validate the group password
 */
export function validateGroupPassword(input: string): boolean {
    const correctPassword = process.env.NEXT_PUBLIC_GROUP_PASSWORD || "portfolio-league-secret";
    return input === correctPassword;
}

/**
 * Set group access in localStorage
 */
export function setGroupAccess(): void {
    if (typeof window !== "undefined") {
        localStorage.setItem(ACCESS_KEY, "granted");
    }
}

/**
 * Check if user has group access
 */
export function checkGroupAccess(): boolean {
    if (typeof window !== "undefined") {
        return localStorage.getItem(ACCESS_KEY) === "granted";
    }
    return false;
}

/**
 * Clear group access (logout)
 */
export function clearGroupAccess(): void {
    if (typeof window !== "undefined") {
        localStorage.removeItem(ACCESS_KEY);
    }
}
