import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import { Property, getPaymentStatus, getIndianStandardTime } from './paymentCalculations';
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


                </div>
            </body>
        </html>
    `;
};

const generateLocationHtml = (properties: Property[], locationName: string): string => {
    const generationDate = new Date().toLocaleDateString(getLocale(), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const today = getIndianStandardTime();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthString = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    const unpaidProperties = properties.filter(p => !p.lastPaidMonth || p.lastPaidMonth < lastMonthString);
    const paidProperties = properties.filter(p => p.lastPaidMonth && p.lastPaidMonth >= lastMonthString);

    const createPropertyRows = (props, isUnpaidTable) => {
        if (props.length === 0) {
            return `<tr><td colspan="5" style="text-align:center;">No properties in this category.</td></tr>`;
        }
        return props.map(property => {
            const { status, overdueMonthsList, overpaidMonthsList } = getPaymentStatus(property);
            const statusText = isUnpaidTable ? t('overdue') : (overpaidMonthsList.length > 0 ? t('overpaid') : t('paid'));
            const statusColor = isUnpaidTable ? '#d9534f' : '#5cb85c';

            let paymentRecord;
            if (isUnpaidTable) {
                paymentRecord = overdueMonthsList.map(month => `<span style="color: #d9534f;">${getMonthName(month, true)}</span>`).join(', ');
            } else if (overpaidMonthsList.length > 0) {
                paymentRecord = overpaidMonthsList.map(month => `<span style="color: #5cb85c;">${getMonthName(month, true)}</span>`).join(', ');
            } else {
                paymentRecord = getMonthName(lastMonthString, true);
            }

            return `
                <tr>
                    <td>${property.name}</td>
                    <td>${property.tenantName || 'N/A'}</td>
                    <td class="currency">₹${(property.rentAmount || 0).toFixed(2)}</td>
                    <td style="color: ${statusColor};">${statusText}</td>
                    <td>${paymentRecord || 'N/A'}</td>
                </tr>
            `;
        }).join('');
    };

    const unpaidRows = createPropertyRows(unpaidProperties, true);
    const paidRows = createPropertyRows(paidProperties, false);

    const tableHeader = `
        <thead>
            <tr>
                <th style="width: 20%;">${t('property')}</th>
                <th style="width: 15%;">${t('tenant_name')}</th>
                <th style="width: 15%;" class="currency">${t('rent_amount')}</th>
                <th style="width: 15%;">${t('status')}</th>
                <th style="width: 35%;">${t('payment_record')}</th>
            </tr>
        </thead>
    `;

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
                    .container { width: 100%; }
                    .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
                    h1 { font-size: 24px; color: #222; margin: 0; }
                    .date { font-size: 12px; color: #666; }
                    .table-title { font-size: 18px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd; word-wrap: break-word; }
                    th { background-color: #f8f8f8; font-weight: bold; color: #555; }
                    tr:nth-child(even) { background-color: #fdfdfd; }
                    .currency { text-align: right; }
                    .table-spacing { margin-top: 30px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${locationName} - ${t('property_report')}</h1>
                        <p class="date">Generated on: ${generationDate}</p>
                    </div>

                    <div class="table-title">${t('due_properties')}</div>
                    <table>
                        ${tableHeader}
                        <tbody>
                            ${unpaidRows}
                        </tbody>
                    </table>

                    <div class="table-spacing"></div>

                    <div class="table-title">${t('paid_properties')}</div>
                    <table>
                        ${tableHeader}
                        <tbody>
                            ${paidRows}
                        </tbody>
                    </table>
                </div>
            </body>
        </html>
    `;
};


export const generateAndSharePdf = async (properties: Property[], setLoading: (loading: boolean) => void) => {
    setLoading(true);
    try {
        const overdueProperties = properties.filter(p => getPaymentStatus(p).status.text === t('overdue'));

        if (overdueProperties.length === 0) {
            alert(t('no_overdue'));
            return;
        }

        const html = generateHtml(overdueProperties);
        const { uri } = await Print.printToFileAsync({ html });

        const date = new Date().toISOString().split('T')[0];
        const newUri = `${FileSystem.documentDirectory}Overdue-Report-${date}.pdf`;
        await FileSystem.moveAsync({
            from: uri,
            to: newUri,
        });

        await shareAsync(newUri, { mimeType: 'application/pdf', dialogTitle: t('overdue_payments') });
    } catch (error) {
        if (error.code !== 'kErrorCanceled') {
            Alert.alert("Error", "Failed to generate PDF.");
        }
    } finally {
        setLoading(false);
    }
};

export const generateLocationPdf = async (properties: Property[], locationName: string, setLoading: (loading: boolean) => void) => {
    setLoading(true);
    try {
        if (properties.length === 0) {
            alert(t('no_properties'));
            return;
        }

        const html = generateLocationHtml(properties, locationName);
        const { uri } = await Print.printToFileAsync({ html });

        const date = new Date().toISOString().split('T')[0];
        const newUri = `${FileSystem.documentDirectory}Location-Report-${locationName.replace(/\s+/g, '-')}-${date}.pdf`;
        await FileSystem.moveAsync({
            from: uri,
            to: newUri,
        });

        await shareAsync(newUri, { mimeType: 'application/pdf', dialogTitle: `${locationName} - ${t('property_report')}` });
    } catch (error) {
        if (error.code !== 'kErrorCanceled') {
            Alert.alert("Error", "Failed to generate PDF.");
        }
    } finally {
        setLoading(false);
    }
};