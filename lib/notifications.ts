// Notification utilities for Portfolio League PWA
// This provides the client-side infrastructure for notifications

export type NotificationType = 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW' | 'JOIN' | 'PRICE_ALERT';

export interface NotificationPayload {
    type: NotificationType;
    title: string;
    body: string;
    icon?: string;
    data?: Record<string, unknown>;
}

// Check if notifications are supported
export const isNotificationSupported = (): boolean => {
    return typeof window !== 'undefined' && 'Notification' in window;
};

// Check current permission status
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
    if (!isNotificationSupported()) return 'unsupported';
    return Notification.permission;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
    if (!isNotificationSupported()) return 'unsupported';

    try {
        const permission = await Notification.requestPermission();
        return permission;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return 'denied';
    }
};

// Show a local notification (works when app is open)
export const showLocalNotification = (payload: NotificationPayload): void => {
    if (!isNotificationSupported()) return;
    if (Notification.permission !== 'granted') return;

    const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: payload.type,
        data: payload.data,
    });

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
};

// Generate notification for activity events
export const generateActivityNotification = (
    type: NotificationType,
    userName: string,
    symbol?: string,
    amount?: number
): NotificationPayload => {
    const formatAmount = (amt: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amt);

    switch (type) {
        case 'BUY':
            return {
                type,
                title: `${userName} bought ${symbol}`,
                body: amount ? `Invested ${formatAmount(amount)}` : 'New position added',
            };
        case 'SELL':
            return {
                type,
                title: `${userName} sold ${symbol}`,
                body: amount ? `Realized ${formatAmount(amount)}` : 'Position closed',
            };
        case 'DEPOSIT':
            return {
                type,
                title: `${userName} deposited cash`,
                body: amount ? `Added ${formatAmount(amount)} to portfolio` : 'Cash deposited',
            };
        case 'WITHDRAW':
            return {
                type,
                title: `${userName} withdrew cash`,
                body: amount ? `Removed ${formatAmount(amount)} from portfolio` : 'Cash withdrawn',
            };
        case 'JOIN':
            return {
                type,
                title: `${userName} joined the group`,
                body: 'New investor in your group!',
            };
        case 'PRICE_ALERT':
            return {
                type,
                title: `Price Alert: ${symbol}`,
                body: amount ? `Price changed to ${formatAmount(amount)}` : 'Significant price movement',
            };
        default:
            return {
                type,
                title: 'Portfolio Update',
                body: 'Something happened in your portfolio',
            };
    }
};

// Storage key for notification preferences
const NOTIFICATION_PREFS_KEY = 'portfolio_notification_prefs';

export interface NotificationPreferences {
    enabled: boolean;
    types: {
        trades: boolean;      // BUY/SELL
        cashFlow: boolean;    // DEPOSIT/WITHDRAW
        groupActivity: boolean; // JOIN
        priceAlerts: boolean; // PRICE_ALERT
    };
}

const DEFAULT_PREFS: NotificationPreferences = {
    enabled: false,
    types: {
        trades: true,
        cashFlow: true,
        groupActivity: true,
        priceAlerts: false,
    },
};

// Get notification preferences from localStorage
export const getNotificationPreferences = (): NotificationPreferences => {
    if (typeof window === 'undefined') return DEFAULT_PREFS;

    try {
        const stored = localStorage.getItem(NOTIFICATION_PREFS_KEY);
        if (stored) {
            return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
        }
    } catch (error) {
        console.error('Error reading notification preferences:', error);
    }
    return DEFAULT_PREFS;
};

// Save notification preferences to localStorage
export const saveNotificationPreferences = (prefs: NotificationPreferences): void => {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
    } catch (error) {
        console.error('Error saving notification preferences:', error);
    }
};

// Check if a notification type should be shown based on preferences
export const shouldShowNotification = (type: NotificationType): boolean => {
    const prefs = getNotificationPreferences();
    if (!prefs.enabled) return false;

    switch (type) {
        case 'BUY':
        case 'SELL':
            return prefs.types.trades;
        case 'DEPOSIT':
        case 'WITHDRAW':
            return prefs.types.cashFlow;
        case 'JOIN':
            return prefs.types.groupActivity;
        case 'PRICE_ALERT':
            return prefs.types.priceAlerts;
        default:
            return true;
    }
};
