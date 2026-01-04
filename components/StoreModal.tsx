import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { PurchasesPackage, PurchasesOffering } from 'react-native-purchases';
import { useGameService } from '@/hooks/useGameService';
import { ShoppingCart, X, Sparkles } from 'lucide-react-native';
import PurchaseService from '@/services/PurchaseService';

interface StoreModalProps {
    visible: boolean;
    onClose: () => void;
}

// Paket bilgileri (UI için)
const PACKAGE_INFO: Record<string, { amount: number; popular?: boolean }> = {
    'mt_100_pack': { amount: 100 },
    'mt_550_pack': { amount: 550, popular: true },
    'mt_1200_pack': { amount: 1200 },
    'mt_2500_pack': { amount: 2500 },
};

export default function StoreModal({ visible, onClose }: StoreModalProps) {
    const { playerStats, gameService } = useGameService();
    const [loading, setLoading] = useState(true);
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [purchasing, setPurchasing] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            loadOfferings();
        }
    }, [visible]);

    const loadOfferings = async () => {
        setLoading(true);
        try {
            const offering = await PurchaseService.getOfferings();
            if (offering && offering.availablePackages) {
                setPackages(offering.availablePackages);
            }
        } catch (error) {
            console.error('Error loading offerings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (pkg: PurchasesPackage) => {
        setPurchasing(pkg.identifier);
        try {
            const result = await PurchaseService.purchasePackage(pkg);

            if (result.success) {
                Alert.alert('Başarılı! 🎉', result.message);
                // Bakiyeyi yenile
                await gameService.refreshPlayerStats();
                onClose();
            } else {
                if (result.message !== 'Satın alma iptal edildi.') {
                    Alert.alert('Hata', result.message);
                }
            }
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Satın alma başarısız.');
        } finally {
            setPurchasing(null);
        }
    };

    const getPackageInfo = (pkg: PurchasesPackage) => {
        const info = PACKAGE_INFO[pkg.identifier] || { amount: 0 };
        return info;
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleContainer}>
                            <ShoppingCart size={24} color="#d4af37" />
                            <Text style={styles.headerTitle}>Mağaza</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Balance Info */}
                        <View style={styles.balanceCard}>
                            <Text style={styles.balanceLabel}>Mevcut Bakiyeniz</Text>
                            <View style={styles.balanceRow}>
                                <Text style={styles.balanceValue}>💎 {playerStats.mtCoins || 0}</Text>
                                <Text style={styles.balanceSub}>MT Coin</Text>
                            </View>
                        </View>

                        {/* Buy MT Coins Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>MT Coin Paketleri</Text>

                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#d4af37" />
                                    <Text style={styles.loadingText}>Paketler yükleniyor...</Text>
                                </View>
                            ) : packages.length > 0 ? (
                                <View style={styles.packagesGrid}>
                                    {packages.map((pkg) => {
                                        const info = getPackageInfo(pkg);
                                        const isPurchasing = purchasing === pkg.identifier;

                                        return (
                                            <TouchableOpacity
                                                key={pkg.identifier}
                                                style={[
                                                    styles.packageCard,
                                                    info.popular && styles.popularPackage,
                                                ]}
                                                onPress={() => handlePurchase(pkg)}
                                                disabled={!!purchasing}
                                            >
                                                {info.popular && (
                                                    <View style={styles.popularBadge}>
                                                        <Sparkles size={10} color="#000" />
                                                        <Text style={styles.popularText}>POPÜLER</Text>
                                                    </View>
                                                )}

                                                {isPurchasing ? (
                                                    <ActivityIndicator size="small" color="#d4af37" />
                                                ) : (
                                                    <>
                                                        <Text style={styles.packageAmount}>
                                                            {info.amount} MT
                                                        </Text>
                                                        <Text style={styles.packagePrice}>
                                                            {pkg.product.priceString}
                                                        </Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ) : (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorText}>
                                        Paketler yüklenemedi. Lütfen tekrar deneyin.
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.retryButton}
                                        onPress={loadOfferings}
                                    >
                                        <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: '100%',
        height: '70%',
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#d4af37',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        backgroundColor: '#252525',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#d4af37',
    },
    closeButton: {
        padding: 5,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    balanceCard: {
        backgroundColor: '#2a1a4a',
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#a855f7',
    },
    balanceLabel: {
        color: '#ccc',
        fontSize: 14,
        marginBottom: 5,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 5,
    },
    balanceValue: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
    },
    balanceSub: {
        color: '#a855f7',
        fontSize: 16,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        paddingLeft: 5,
        borderLeftWidth: 3,
        borderLeftColor: '#d4af37',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        color: '#888',
        marginTop: 10,
    },
    errorContainer: {
        padding: 20,
        alignItems: 'center',
    },
    errorText: {
        color: '#ff6b6b',
        textAlign: 'center',
        marginBottom: 15,
    },
    retryButton: {
        backgroundColor: '#d4af37',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    retryButtonText: {
        color: '#000',
        fontWeight: 'bold',
    },
    packagesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    packageCard: {
        width: '48%',
        backgroundColor: '#252525',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 5,
        minHeight: 90,
    },
    popularPackage: {
        borderColor: '#d4af37',
        backgroundColor: '#2a2510',
    },
    popularBadge: {
        position: 'absolute',
        top: -10,
        backgroundColor: '#d4af37',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    popularText: {
        color: '#000',
        fontSize: 10,
        fontWeight: 'bold',
    },
    packageAmount: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    packagePrice: {
        color: '#d4af37',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
