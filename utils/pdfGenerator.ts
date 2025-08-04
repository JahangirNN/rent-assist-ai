import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { Property, getPaymentStatus } from './paymentCalculations';
import { t, getLocale } from '@/locales/i18n';

const getMonthName = (monthStr: string, short = false): string => {
    const [year, monthNum] = monthStr.split('-');
    const date = new Date(Number(year), Number(monthNum) - 1, 2);
    const monthKey = date.toLocaleString(getLocale(), { month: 'long' }).toLowerCase();
    const monthNames = short ? t('shortMonths') : t('months');
    return monthNames[monthKey] || monthKey;
};

const generateHtml = (overdueProperties: Property[]): string => {
    let totalOverdue = 0;
    const generationDate = new Date().toLocaleDateString(getLocale(), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const propertyRows = overdueProperties.map(property => {
        const { overdueMonthsList, totalOverdueAmount } = getPaymentStatus(property);
        totalOverdue += totalOverdueAmount;

        return `
            <tr>
                <td>${property.name}</td>
                <td>${property.tenantName || 'N/A'}</td>
                <td class="currency">₹${(property.rentAmount || 0).toFixed(2)}</td>
                <td>${overdueMonthsList.map(month => getMonthName(month, true)).join(', ')}</td>
                <td class="currency">₹${totalOverdueAmount.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    return `
        <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        color: #333;
                        margin: 20px;
                    }
                    .container {
                        width: 100%;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #eee;
                        padding-bottom: 10px;
                        margin-bottom: 30px;
                    }
                    h1 {
                        font-size: 24px;
                        color: #222;
                        margin: 0;
                    }
                    .date {
                        font-size: 12px;
                        color: #666;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        table-layout: fixed;
                    }
                    th, td {
                        padding: 12px 15px;
                        text-align: left;
                        border-bottom: 1px solid #ddd;
                        word-wrap: break-word;
                    }
                    th {
                        background-color: #f8f8f8;
                        font-weight: bold;
                        color: #555;
                    }
                    tr:nth-child(even) {
                        background-color: #fdfdfd;
                    }
                    .currency {
                        text-align: right;
                    }
                    .total-section {
                        margin-top: 20px;
                        padding-top: 10px;
                        border-top: 2px solid #eee;
                        text-align: right;
                    }
                    .total-label {
                        font-size: 16px;
                        font-weight: bold;
                        color: #333;
                    }
                    .total-amount {
                        font-size: 20px;
                        font-weight: bold;
                        color: #d9534f;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${t('overdue_payments')}</h1>
                        <p class="date">Generated on: ${generationDate}</p>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 25%;">${t('property')}</th>
                                <th style="width: 20%;">${t('tenant_name')}</th>
                                <th style="width: 15%;" class="currency">${t('rent_amount')}</th>
                                <th style="width: 25%;">${t('months_due')}</th>
                                <th style="width: 15%;" class="currency">${t('dues')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${propertyRows}
                        </tbody>
                    </table>

                    <div class="total-section">
                        <p class="total-label">${t('total_pending')}: 
                            <span class="total-amount">₹${totalOverdue.toFixed(2)}</span>
                        </p>
                    </div>
                </div>
            </body>
        </html>
    `;
};


export const generateAndSharePdf = async (properties: Property[]) => {
    const overdueProperties = properties.filter(p => getPaymentStatus(p).status.text === t('overdue'));

    if (overdueProperties.length === 0) {
        alert(t('no_overdue'));
        return;
    }

    const html = generateHtml(overdueProperties);
    const { uri } = await Print.printToFileAsync({ html });
    await shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: t('overdue_payments') });
};