"use client";

// Empty providers - the app uses usePersistentGroupData directly in each page
// No global context needed since localStorage is shared

export function Providers({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
