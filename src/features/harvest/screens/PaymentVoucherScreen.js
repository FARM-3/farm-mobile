import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import SimpleHeader from '../../../components/SimpleHeader';
import CustomAlert from '../../../components/CustomAlert';
import { getStaffById } from '../../../services/staffService';
import { parseFormattedNumber } from '../../../utils/numberFormatter';

// Utility function to convert number to words
const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';

    const convertChunk = (n) => {
        if (n === 0) return '';
        else if (n < 10) return ones[n];
        else if (n < 20) return teens[n - 10];
        else if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
        else return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertChunk(n % 100) : '');
    };

    if (num < 1000) return convertChunk(num);
    else if (num < 1000000) {
        return convertChunk(Math.floor(num / 1000)) + ' Thousand' +
               (num % 1000 !== 0 ? ' ' + convertChunk(num % 1000) : '');
    }
    else if (num < 1000000000) {
        return convertChunk(Math.floor(num / 1000000)) + ' Million' +
               (num % 1000000 !== 0 ? ' ' + numberToWords(num % 1000000) : '');
    }
    return num.toString();
};

const PaymentVoucherScreen = ({ route, navigation }) => {
    const { harvestData } = route.params || {};
    const [isGenerating, setIsGenerating] = useState(false);
    const [paidByName, setPaidByName] = useState('Staff Member');
    const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info', buttons: [] });

    // Debug: Log the harvestData received
    useEffect(() => {
        console.log('[PaymentVoucher] Received harvestData:', JSON.stringify(harvestData, null, 2));
    }, []);

    // Fetch staff name when component mounts
    useEffect(() => {
        const fetchStaffName = async () => {
            const paidById = harvestData?.paid_by || harvestData?.paidBy;
            if (paidById) {
                try {
                    const staff = await getStaffById(paidById);
                    if (staff) {
                        setPaidByName(staff.displayName);
                    }
                } catch (error) {
                    console.error('Error fetching staff name:', error);
                }
            }
        };

        fetchStaffName();
    }, [harvestData?.paid_by, harvestData?.paidBy]);

    // Generate simple unique voucher number
    const generateVoucherNumber = () => {
        const timestamp = Date.now();
        const shortId = timestamp.toString().slice(-6); // Last 6 digits of timestamp
        return `VN${shortId}`;
    };

    // Extract data from harvest record
    const voucherData = {
        voucherNo: harvestData?.harvest_id || harvestData?.id || 'N/A',
        voucherNumber: generateVoucherNumber(),
        paymentDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        paidTo: harvestData?.farmer_name || harvestData?.workerName || harvestData?.farmer_uid || 'N/A',
        harvestId: harvestData?.harvest_id || harvestData?.id || 'N/A',
        deliveryDate: harvestData?.dateReadable || (harvestData?.date_of_delivery ? new Date(harvestData.date_of_delivery).toLocaleDateString('en-GB') : (harvestData?.date ? new Date(harvestData.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'))),
        weight: `${harvestData?.weight_on_delivery || harvestData?.weight || 0} kg`,
        blockNo: harvestData?.blockId || 'N/A',
        pricePerKg: `UGX ${Number(harvestData?.price_per_kg || harvestData?.pricePerKg || 0).toLocaleString()}`,
        amount: parseFormattedNumber(harvestData?.amount_paid || harvestData?.amountPaid || 0),
        paidBy: paidByName,
        paymentMethod: 'Mobile Money', // Can be made dynamic
        coffeeType: harvestData?.coffee_type || 'Coffee',
    };

    // Debug: Log constructed voucherData
    console.log('[PaymentVoucher] Constructed voucherData:', JSON.stringify(voucherData, null, 2));
    console.log('[PaymentVoucher] Raw values - harvest_id:', harvestData?.harvest_id, 'weight_on_delivery:', harvestData?.weight_on_delivery, 'amount_paid:', harvestData?.amount_paid);

    const amountInWords = numberToWords(Math.floor(voucherData.amount));

    // Generate HTML for PDF
    const generateHTML = () => {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: white;
        }
        .voucher-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
        }
        .voucher-header {
            border-bottom: 3px solid ${CoffeeColors.PRIMARY_BROWN};
            padding-bottom: 20px;
            margin-bottom: 25px;
        }
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 15px;
        }
        .logo-section {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        .logo {
            width: 50px;
            height: 50px;
            margin-right: 12px;
        }
        .company-info h1 {
            color: #8B4513;
            font-size: 20px;
            margin-bottom: 4px;
            font-weight: bold;
        }
        .company-info p {
            color: #666;
            font-size: 11px;
            line-height: 1.5;
        }
        .voucher-number {
            text-align: right;
        }
        .voucher-number h2 {
            color: #8B4513;
            font-size: 16px;
            margin-bottom: 4px;
            font-weight: bold;
        }
        .voucher-number p {
            color: #666;
            font-size: 12px;
        }
        .original-badge {
            margin-top: 5px;
            color: #8B4513;
            font-weight: bold;
            font-size: 13px;
        }
        .serial-number {
            margin-top: 5px;
            color: #666;
            font-size: 11px;
            font-weight: normal;
        }
        .voucher-title {
            text-align: center;
            background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
            color: white;
            padding: 12px;
            font-size: 20px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 20px -30px;
        }
        .voucher-details {
            margin: 25px 0;
        }
        .detail-row {
            display: grid;
            grid-template-columns: 180px 1fr;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .detail-label {
            font-weight: bold;
            color: #333;
            font-size: 13px;
        }
        .detail-value {
            color: #555;
            font-size: 13px;
        }
        .amount-section {
            background: #F5DEB3;
            border: 2px solid #8B4513;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        .amount-row {
            display: grid;
            grid-template-columns: 180px 1fr;
            padding: 8px 0;
        }
        .amount-label {
            font-weight: bold;
            color: #8B4513;
            font-size: 14px;
        }
        .amount-value {
            font-size: 14px;
            color: #333;
        }
        .amount-figures {
            font-size: 24px;
            font-weight: bold;
            color: #8B4513;
        }
        .harvest-details {
            background: #fff8f0;
            border-left: 4px solid #8B4513;
            padding: 18px;
            margin: 20px 0;
        }
        .harvest-details h3 {
            color: #8B4513;
            margin-bottom: 12px;
            font-size: 15px;
        }
        .harvest-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }
        .harvest-item {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
        }
        .harvest-item span:first-child {
            font-weight: 600;
            color: #555;
        }
        .harvest-item span:last-child {
            color: #333;
        }
        .notes-section {
            margin-top: 25px;
            padding: 15px;
            background: #fffef7;
            border-radius: 5px;
        }
        .notes-section h4 {
            color: #8B4513;
            font-size: 13px;
            margin-bottom: 8px;
        }
        .notes-section p {
            color: #666;
            font-size: 11px;
            line-height: 1.6;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #999;
            font-size: 10px;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
        }
    </style>
</head>
<body>
    <div class="voucher-container">
        <div class="voucher-header">
            <div class="logo-section">
                <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" class="logo" alt="Rugyeyo Logo" />
                <div class="company-info">
                    <h1>RUGGEYO FARM</h1>
                    <p>Coffee Production & Processing</p>
                    <p>Namayumba, Wakiso District, Uganda</p>
                    <p>Namayumba, Wakiso District, Uganda</p>
                    <p>Tel: +256772701051 | Email: rkabushenga@gmail.com</p>
                </div>
            </div>
            <div class="header-top">
                <div class="voucher-number">
                    <h2>VOUCHER NUMBER</h2>
                    <p>${voucherData.voucherNumber}</p>
                    <p class="original-badge">ORIGINAL</p>
                </div>
            </div>
        </div>

        <div class="voucher-title">PAYMENT VOUCHER</div>

        <div class="voucher-details">
            <div class="detail-row">
                <div class="detail-label">Date of Payment:</div>
                <div class="detail-value">${voucherData.paymentDate}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Paid To:</div>
                <div class="detail-value">${voucherData.paidTo}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Payment Method:</div>
                <div class="detail-value">${voucherData.paymentMethod}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Paid By:</div>
                <div class="detail-value">${voucherData.paidBy}</div>
            </div>
        </div>

        <div class="harvest-details">
            <h3>📦 Harvest Details</h3>
            <div class="harvest-grid">
                <div class="harvest-item">
                    <span>Harvest ID:</span>
                    <span>${voucherData.harvestId}</span>
                </div>
                <div class="harvest-item">
                    <span>Date of Delivery:</span>
                    <span>${voucherData.deliveryDate}</span>
                </div>
                <div class="harvest-item">
                    <span>Weight Delivered:</span>
                    <span>${voucherData.weight}</span>
                </div>
                <div class="harvest-item">
                    <span>Rate per kg:</span>
                    <span>${voucherData.pricePerKg}</span>
                </div>

            </div>
        </div>

        <div class="amount-section">
            <div class="amount-row">
                <div class="amount-label">Amount in Figures:</div>
                <div class="amount-value amount-figures">UGX ${voucherData.amount.toLocaleString()}</div>
            </div>
            <div class="amount-row" style="margin-top: 12px;">
                <div class="amount-label">Amount in Words:</div>
                <div class="amount-value" style="text-transform: capitalize; font-weight: 600;">
                    ${amountInWords} Shillings Only
                </div>
            </div>
        </div>

        <div class="voucher-details">
            <div class="detail-row">
                <div class="detail-label">Payment For:</div>
                <div class="detail-value">${voucherData.coffeeType} Coffee Harvest</div>
            </div>
        </div>

        <div class="notes-section">
            <h4>Important Notes:</h4>
            <p>
                • This voucher serves as an official receipt for the payment made.<br>
                • Payment has been processed and confirmed.<br>
                • For any queries, please contact the farm office within 7 days.<br>
                • Keep this voucher for your records and future reference.
            </p>
        </div>

    

        <div class="footer">
            <p>This is a computer-generated voucher and is valid without signature if verified digitally.</p>
            <p>© ${new Date().getFullYear()} Ruggeyo Farm. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `;
    };

    const handleGeneratePDF = async () => {
        try {
            setIsGenerating(true);
            console.log('[PaymentVoucher] Starting PDF generation...');

            const html = generateHTML();
            console.log('[PaymentVoucher] HTML generated, creating PDF...');

            const { uri } = await Print.printToFileAsync({ html });
            console.log('[PaymentVoucher] PDF created at:', uri);

            // Generate filename with harvest ID and timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            const harvestId = harvestData?.harvest_id || harvestData?.id || 'voucher';
            const filename = `Voucher_${harvestId}_${timestamp}.pdf`;

            // Just share the PDF directly - works on all platforms
            console.log('[PaymentVoucher] Sharing PDF...');
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Save or Share Voucher',
                    UTI: 'com.adobe.pdf'
                });

                setAlertConfig({
                    visible: true,
                    title: 'PDF Generated',
                    message: `Voucher generated successfully!\nYou can save it from the share menu.`,
                    type: 'success',
                    buttons: [
                        {
                            text: 'OK',
                            onPress: () => setAlertConfig({ ...alertConfig, visible: false })
                        }
                    ]
                });
            } else {
                console.warn('[PaymentVoucher] Sharing not available');
                setAlertConfig({
                    visible: true,
                    title: 'PDF Generated',
                    message: `PDF generated but sharing is not available on this device.`,
                    type: 'warning',
                    buttons: [{ text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }]
                });
            }
        } catch (error) {
            console.error('[PaymentVoucher] PDF generation error:', error);
            console.error('[PaymentVoucher] Error stack:', error.stack);
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: `Failed to generate PDF:\n${error.message || 'Unknown error'}`,
                type: 'error',
                buttons: [{ text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }]
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrint = async () => {
        try {
            setIsGenerating(true);
            const html = generateHTML();
            await Print.printAsync({ html });
        } catch (error) {
            console.error('Print error:', error);
            Alert.alert('Error', 'Failed to print. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <View style={styles.container}>
            <SimpleHeader title="Payment Voucher" />
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Voucher Preview */}
                <View style={styles.voucherCard}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Image source={require('../../../assets/rugyeyo_logo.png')} style={styles.logo} />
                            <View style={styles.companyInfo}>
                                <Text style={styles.companyName}>RUGYEYO FARM</Text>
                                <Text style={styles.companySubtitle}>Coffee Production & Processing</Text>
                                <Text style={styles.companyAddress}>Namayumba, Wakiso District, Uganda</Text>
                                <Text style={styles.companyContact}>Tel: +256772701051 | Email: rkabushenga@gmail.com</Text>
                            </View>
                        </View>
                        <View style={styles.headerRight}>
                            <Text style={styles.voucherLabel}>VOUCHER NUMBER</Text>
                            <Text style={styles.voucherNumber}>{voucherData.voucherNumber}</Text>
                            <Text style={styles.originalBadge}>ORIGINAL</Text>
                        </View>
                    </View>

                    {/* Title */}
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>PAYMENT VOUCHER</Text>
                    </View>

                    {/* Payment Details */}
                    <View style={styles.section}>
                        <DetailRow label="Date of Payment" value={voucherData.paymentDate} />
                        <DetailRow label="Paid To" value={voucherData.paidTo} />
                        <DetailRow label="Paid By" value={voucherData.paidBy} />
                    </View>

                    {/* Harvest Details */}
                    <View style={styles.harvestSection}>
                        <Text style={styles.sectionTitle}>📦 Harvest Details</Text>
                        <View style={styles.harvestGrid}>
                            <HarvestItem label="Harvest ID" value={voucherData.harvestId} />
                            <HarvestItem label="Delivery Date" value={voucherData.deliveryDate} />
                            <HarvestItem label="Weight" value={voucherData.weight} />
                            <HarvestItem label="Rate/kg" value={voucherData.pricePerKg} />
                        </View>
                    </View>

                    {/* Amount */}
                    <View style={styles.amountSection}>
                        <View style={styles.amountRow}>
                            <Text style={styles.amountLabel}>Amount in Figures:</Text>
                            <Text style={styles.amountFigures}>UGX {voucherData.amount.toLocaleString()}</Text>
                        </View>
                        <View style={[styles.amountRow, { marginTop: 12 }]}>
                            <Text style={styles.amountLabel}>Amount in Words:</Text>
                            <Text style={styles.amountWords}>{amountInWords} Shillings Only</Text>
                        </View>
                    </View>

                    {/* Purpose */}
                    <View style={styles.section}>
                        <DetailRow
                            label="Payment For"
                            value={`${voucherData.coffeeType} Coffee Harvest`}
                        />
                    </View>

                    {/* Notes */}
                    <View style={styles.notesSection}>
                        <Text style={styles.notesTitle}>Important Notes:</Text>
                        <Text style={styles.notesText}>
                            • This voucher serves as an official receipt{'\n'}
                            • Payment has been processed and confirmed{'\n'}
                            • Contact farm office within 7 days for queries{'\n'}
                            • Keep this voucher for your records
                        </Text>
                    </View>

                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleGeneratePDF}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <Text style={styles.primaryButtonText}>Saving PDF...</Text>
                        ) : (
                            <>
                                <Ionicons name="document-text" size={20} color="white" />
                                <Text style={styles.primaryButtonText}>Save as PDF</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => navigation.navigate('QualityControl')}
                    >
                        <Ionicons name="beaker" size={20} color={CoffeeColors.PRIMARY_BROWN} />
                        <Text style={styles.secondaryButtonText}>Proceed to Quality Control</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.navigate('Harvests')}
                    >
                        <Ionicons name="arrow-back" size={20} color={CoffeeColors.PRIMARY_BROWN} />
                        <Text style={styles.backButtonText}>Back to Records</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Custom Alert Modal */}
            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
            />
        </View>
    );
};

// Helper Components
const DetailRow = ({ label, value }) => (
    <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}:</Text>
        <Text style={styles.detailValue}>{value}</Text>
    </View>
);

const HarvestItem = ({ label, value }) => (
    <View style={styles.harvestItem}>
        <Text style={styles.harvestLabel}>{label}:</Text>
        <Text style={styles.harvestValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CoffeeColors.LIGHT_GRAY,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    voucherCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 16,
        borderBottomWidth: 3,
        borderBottomColor: CoffeeColors.PRIMARY_BROWN,
        marginBottom: 20,
    },
    headerLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        width: 50,
        height: 50,
        marginRight: 12,
        resizeMode: 'contain',
    },
    companyInfo: {
        flex: 1,
    },
    companyName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: CoffeeColors.PRIMARY_BROWN,
        fontFamily: Fonts.bold,
        marginBottom: 3,
    },
    companySubtitle: {
        fontSize: 11,
        color: '#666',
        marginBottom: 2,
    },
    companyAddress: {
        fontSize: 10,
        color: '#666',
    },
    companyContact: {
        fontSize: 9,
        color: '#666',
        marginTop: 2,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    voucherLabel: {
        fontSize: 14,
        color: '#8B4513',
        fontWeight: 'bold',
    },
    voucherNumber: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
    },
    originalBadge: {
        fontSize: 11,
        color: CoffeeColors.PRIMARY_BROWN,
        fontWeight: 'bold',
        marginTop: 4,
    },
    serialNumber: {
        fontSize: 10,
        color: '#666',
        marginTop: 4,
    },
    titleContainer: {
        backgroundColor: CoffeeColors.VERY_LIGHT_BROWN,
        paddingVertical: 12,
        marginHorizontal: -20,
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: CoffeeColors.DARK_BROWN,
        textAlign: 'center',
        letterSpacing: 2,
        fontFamily: Fonts.bold,
    },
    section: {
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    detailLabel: {
        width: 140,
        fontWeight: 'bold',
        fontSize: 13,
        color: '#333',
        fontFamily: Fonts.semiBold,
    },
    detailValue: {
        flex: 1,
        fontSize: 13,
        color: '#555',
    },
    harvestSection: {
        backgroundColor: '#fff8f0',
        borderLeftWidth: 4,
        borderLeftColor: '#8B4513',
        padding: 16,
        marginBottom: 20,
        borderRadius: 4,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#8B4513',
        marginBottom: 12,
        fontFamily: Fonts.bold,
    },
    harvestGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    harvestItem: {
        width: '48%',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    harvestLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#555',
    },
    harvestValue: {
        fontSize: 12,
        color: '#333',
    },
    amountSection: {
        backgroundColor: CoffeeColors.CREAM,
        borderWidth: 2,
        borderColor: CoffeeColors.LIGHT_BROWN,
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
    },
    amountRow: {
        flexDirection: 'column',
    },
    amountLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: CoffeeColors.DARK_BROWN,
        marginBottom: 6,
        fontFamily: Fonts.bold,
    },
    amountFigures: {
        fontSize: 24,
        fontWeight: 'bold',
        color: CoffeeColors.PRIMARY_BROWN,
        fontFamily: Fonts.bold,
    },
    amountWords: {
        fontSize: 14,
        color: '#333',
        textTransform: 'capitalize',
        fontWeight: '600',
    },
    notesSection: {
        backgroundColor: '#fffef7',
        padding: 16,
        borderRadius: 8,
        marginBottom: 20,
    },
    notesTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#8B4513',
        marginBottom: 8,
        fontFamily: Fonts.bold,
    },
    notesText: {
        fontSize: 11,
        color: '#666',
        lineHeight: 18,
    },
    signaturesSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 40,
        paddingTop: 20,
        borderTopWidth: 2,
        borderTopColor: '#e0e0e0',
    },
    signatureBlock: {
        width: '30%',
        alignItems: 'center',
    },
    signatureLine: {
        width: '100%',
        height: 40,
        borderBottomWidth: 2,
        borderBottomColor: '#333',
        marginBottom: 8,
    },
    signatureLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    signatureSubtext: {
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
    },
    actionsContainer: {
        gap: 12,
        marginBottom: 20,
    },
    primaryButton: {
        backgroundColor: CoffeeColors.PRIMARY_BROWN,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 10,
        gap: 8,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
    secondaryButton: {
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 10,
        gap: 8,
        borderWidth: 2,
        borderColor: CoffeeColors.PRIMARY_BROWN,
    },
    secondaryButtonText: {
        color: CoffeeColors.PRIMARY_BROWN,
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
    backButton: {
        backgroundColor: CoffeeColors.LIGHT_GRAY,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 10,
        gap: 8,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
    },
    backButtonText: {
        color: CoffeeColors.PRIMARY_BROWN,
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
});

export default PaymentVoucherScreen;