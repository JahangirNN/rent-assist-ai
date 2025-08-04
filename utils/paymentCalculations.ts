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
    // Add any other relevant property fields
}

export function getPaymentStatus(property: Property) {
    const today = new Date();
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
    if(lastPaidDate) { // If there was a payment, start checking from the month after
        //cursorDate.setMonth(cursorDate.getMonth());
    }


    while (cursorDate < today) {
        // We consider a month overdue if the current date is past the 1st of that month.
        // E.g., if today is Feb 2nd, January is overdue. If today is Feb 1st, January is not yet overdue.
         const monthStr = `${cursorDate.getFullYear()}-${String(cursorDate.getMonth() + 1).padStart(2, '0')}`;
         if(new Date() > cursorDate) {
            overdueMonths.push(monthStr);
         }
        cursorDate.setMonth(cursorDate.getMonth() + 1);
    }
    
    // Calculate Overpaid Months
    if (lastPaidDate) {
        const cursorDate = new Date();
        cursorDate.setMonth(today.getMonth()+1)
        cursorDate.setDate(1)
        
        while (cursorDate < lastPaidDate) {
            const monthStr = `${cursorDate.getFullYear()}-${String(cursorDate.getMonth() + 1).padStart(2, '0')}`;
            overpaidMonths.push(monthStr);
            cursorDate.setMonth(cursorDate.getMonth() + 1);
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
    
    const overdueMonthsCount = overdueMonths.length
    const totalOverdueAmount = overdueMonthsCount * (property.rentAmount || 0)


    return {
        status,
        overdueMonthsList: overdueMonths,
        overpaidMonthsList: overpaidMonths,
        overdueMonthsCount,
        totalOverdueAmount,
    };
}
