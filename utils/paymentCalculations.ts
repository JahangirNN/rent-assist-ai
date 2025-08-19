import { t } from '@/locales/i18n';
import { Colors } from '@/constants/Colors';

export interface Property {
    id: string;
    name: string;
    tenantName?: string;
    tenantMobile?: string;
    rentAmount?: number;
    lastPaidMonth?: string;
    createdAt?: string; // ISO date string
    payments?: { month: string; amount: number }[];
    maintenanceFee?: number;
    otherFees?: number;
    deposit?: number;
}

export function getIndianStandardTime(): Date {
    const now = new Date();
    // IST is UTC+5:30
    const istOffset = 5.5 * 60 * 60 * 1000;
    // Get UTC time in ms
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    // Create new Date object for IST
    return new Date(utcTime + istOffset);
}

export function getPaymentStatus(property: Property) {
    const today = getIndianStandardTime();
    today.setHours(0, 0, 0, 0); // Normalize to the start of the day

    const { lastPaidMonth, createdAt } = property;

    let lastPaidDate: Date | null = null;
    if (lastPaidMonth) {
        const [year, month] = lastPaidMonth.split('-').map(Number);
        // Set to the first day of the *next* month to see when the next payment is due
        lastPaidDate = new Date(year, month, 1);
    }

    const propertyCreationDate = createdAt ? new Date(createdAt) : new Date(today.getFullYear(), 0, 1);
    propertyCreationDate.setHours(0, 0, 0, 0);


    const overdueMonths: string[] = [];
    const overpaidMonths: string[] = [];

    const startMonth = lastPaidDate ? lastPaidDate : propertyCreationDate;
    
    // Calculate Overdue Months
    const cursorDate = new Date(startMonth);

    // Only count months that have fully passed.
    const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);


    while (cursorDate < firstDayOfCurrentMonth) {
        const monthStr = `${cursorDate.getFullYear()}-${String(cursorDate.getMonth() + 1).padStart(2, '0')}`;
        overdueMonths.push(monthStr);
        cursorDate.setMonth(cursorDate.getMonth() + 1);
    }
    
    // Calculate Overpaid Months
    if (lastPaidDate) {
        // Start from the current month to include it in overpaid calculations
        const overpaidCursor = new Date(today.getFullYear(), today.getMonth(), 1);
        
        while (overpaidCursor < lastPaidDate) {
            const monthStr = `${overpaidCursor.getFullYear()}-${String(overpaidCursor.getMonth() + 1).padStart(2, '0')}`;
            overpaidMonths.push(monthStr);
            overpaidCursor.setMonth(overpaidCursor.getMonth() + 1);
        }
    }


    let status: { text: string; color: string; };
    if (overdueMonths.length > 0) {
        status = { text: t('overdue'), color: '#EF4444' };
    } else if (overpaidMonths.length > 0) {
        status = { text: t('overpaid'), color: '#10B981' };
    } else {
        status = { text: t('paid'), color: Colors.light.primary };
    }
    
    const overdueMonthsCount = overdueMonths.length;
    // Reverted to base rent calculation for the overdue PDF
    const totalOverdueAmount = overdueMonthsCount * (property.rentAmount || 0);


    return {
        status,
        overdueMonthsList: overdueMonths,
        overpaidMonthsList: overpaidMonths,
        overdueMonthsCount,
        totalOverdueAmount,
    };
}

export function getMonthlySummary(properties: Property[], year: number, month: number) {
    const targetMonthString = `${year}-${String(month).padStart(2, '0')}`;

    let totalRent = 0;
    let totalCollected = 0;

    for (const property of properties) {
        const netRent = (property.rentAmount || 0) - (property.maintenanceFee || 0) - (property.otherFees || 0);
        totalRent += netRent;

        // A month is considered collected if the property's last paid month
        // is the same as or later than the month we are summarizing.
        if (property.lastPaidMonth && property.lastPaidMonth >= targetMonthString) {
            totalCollected += netRent;
        }
    }

    const totalRemaining = totalRent - totalCollected;

    return {
        totalRent,
        totalCollected,
        totalRemaining,
    };
}

export function getTotalDues(properties: Property[]) {
    let totalDues = 0;

    const today = getIndianStandardTime();
    const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const previousMonthName = monthNames[prevMonthDate.getMonth()];


    for (const property of properties) {
        const { overdueMonthsCount } = getPaymentStatus(property);
        if(overdueMonthsCount > 0) {
             const netRent = (property.rentAmount || 0) - (property.maintenanceFee || 0) - (property.otherFees || 0);
             totalDues += overdueMonthsCount * netRent;
        }
    }

    return {
        totalDues,
        previousMonthName
    };
}