import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Alert,
    Image,
    TextInput,
    RefreshControl,
    ActivityIndicator,
    Dimensions
} from 'react-native';
import {
    X,
    ShoppingCart,
    Zap,
    DollarSign,
    Package,
    Shield,
    Target,
    Sparkles
} from 'lucide-react-native';
import { useGameService } from '@/hooks/useGameService';
import { useLanguage } from '@/contexts/LanguageContext';
import { MarketListing, InventorySlot } from '@/types/game';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width * 0.95 - 30) / 2;

interface MarketModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function MarketModal({ visible, onClose }: MarketModalProps) {
    const { gameService, playerStats } = useGameService();
    const { t } = useLanguage();

    const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
    const [listings, setListings] = useState<MarketListing[]>([]);
    const [inventory, setInventory] = useState<InventorySlot[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Sell Modal
    const [sellModalVisible, setSellModalVisible] = useState(false);
    const [selectedItemToSell, setSelectedItemToSell] = useState<InventorySlot | null>(null);
    const [sellPrice, setSellPrice] = useState('');
    const [sellQuantity, setSellQuantity] = useState('1');

    // Buy Modal
    const [buyModalVisible, setBuyModalVisible] = useState(false);
    const [selectedItemToBuy, setSelectedItemToBuy] = useState<MarketListing | null>(null);
    const [buyQuantity, setBuyQuantity] = useState('1');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'buy') {
                const marketListings = await gameService.getMarketListings();
                setListings(marketListings);
            } else {
                const inv = await gameService.getInventory();
                setInventory(inv);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, gameService]);

    useEffect(() => {
        if (visible) {
            loadData();
        }
    }, [visible, activeTab, loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleBuy = (listing: MarketListing) => {
        setSelectedItemToBuy(listing);
        setBuyQuantity('1');
        setBuyModalVisible(true);
    };

    const handleBuyConfirm = async () => {
        if (!selectedItemToBuy) return;
        const qty = parseInt(buyQuantity);

        if (isNaN(qty) || qty <= 0) {
            Alert.alert('Hata', 'Geçerli miktar girin.');
            return;
        }
        if (qty > selectedItemToBuy.quantity) {
            Alert.alert('Hata', 'Stok yetersiz.');
            return;
        }

        const totalPrice = qty * selectedItemToBuy.price;
        if (playerStats.cash < totalPrice) {
            Alert.alert('Yetersiz Bakiye', `Bu işlem için $${totalPrice.toLocaleString()} gerekli.`);
            return;
        }

        setLoading(true);
        const result = await gameService.buyMarketItem(selectedItemToBuy.id, qty);
        setLoading(false);

        if (result.success) {
            Alert.alert('Başarılı!', `${qty} adet ${selectedItemToBuy.itemName} satın alındı.`);
            setBuyModalVisible(false);
            loadData();
        } else {
            Alert.alert('Hata', result.message);
        }
    };

    const handleUseItem = async (slot: InventorySlot) => {
        if (slot.item.type !== 'food') {
            Alert.alert('Bilgi', 'Bu eşya pasif etkilidir.');
            return;
        }
        setLoading(true);
        const result = await gameService.useInventoryItem(slot.itemId);
        setLoading(false);
        if (result.success) {
            Alert.alert('Kullanıldı!', result.message);
            loadData();
        } else {
            Alert.alert('Hata', result.message);
        }
    };

    const openSellModal = (slot: InventorySlot) => {
        setSelectedItemToSell(slot);
        setSellPrice(slot.item.basePrice ? Math.floor(slot.item.basePrice * 0.8).toString() : '100');
        setSellQuantity('1');
        setSellModalVisible(true);
    };

    const handleSellConfirm = async () => {
        if (!selectedItemToSell) return;
        const price = parseInt(sellPrice);
        const quantity = parseInt(sellQuantity);

        if (isNaN(price) || price <= 0) return Alert.alert('Hata', 'Geçerli fiyat girin.');
        if (isNaN(quantity) || quantity <= 0 || quantity > selectedItemToSell.quantity) return Alert.alert('Hata', 'Geçerli miktar girin.');

        setLoading(true);
        const result = await gameService.sellInventoryItem(selectedItemToSell.itemId, quantity, price);
        setLoading(false);

        if (result.success) {
            Alert.alert('Başarılı!', 'Ürün satışa çıkarıldı.');
            setSellModalVisible(false);
            loadData();
        } else {
            Alert.alert('Hata', result.message);
        }
    };

    const getTypeIcon = (type: string) => {
        if (type === 'weapon') return <Target size={12} color="#ff6b6b" />;
        return <Zap size={12} color="#4ecdc4" />;
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <LinearGradient colors={['#0d0d0d', '#1a1a1a']} style={styles.modal}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.titleRow}>
                            <Sparkles size={20} color="#d4af37" />
                            <Text style={styles.title}>KARABORSA</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#555" />
                        </TouchableOpacity>
                    </View>

                    {/* Balance Bar */}
                    <View style={styles.balanceBar}>
                        <View style={styles.balanceItem}>
                            <DollarSign size={14} color="#66bb6a" />
                            <Text style={styles.balanceText}>${playerStats.cash.toLocaleString()}</Text>
                        </View>
                        <View style={styles.balanceItem}>
                            <Zap size={14} color="#4ecdc4" />
                            <Text style={styles.balanceText}>{playerStats.energy}/100</Text>
                        </View>
                        <View style={styles.balanceItem}>
                            <Package size={14} color="#ffa726" />
                            <Text style={styles.balanceText}>{inventory.length} eşya</Text>
                        </View>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabRow}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'buy' && styles.activeTab]}
                            onPress={() => setActiveTab('buy')}
                        >
                            <ShoppingCart size={16} color={activeTab === 'buy' ? '#d4af37' : '#555'} />
                            <Text style={[styles.tabLabel, activeTab === 'buy' && styles.activeTabLabel]}>MAĞAZA</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'sell' && styles.activeTab]}
                            onPress={() => setActiveTab('sell')}
                        >
                            <Package size={16} color={activeTab === 'sell' ? '#d4af37' : '#555'} />
                            <Text style={[styles.tabLabel, activeTab === 'sell' && styles.activeTabLabel]}>ÇANTA</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.scrollContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d4af37" />}
                    >
                        {loading && !refreshing && <ActivityIndicator color="#d4af37" style={{ marginTop: 30 }} />}

                        {!loading && activeTab === 'buy' && (
                            <View style={styles.grid}>
                                {listings.length === 0 ? (
                                    <Text style={styles.emptyText}>Market boş.</Text>
                                ) : (
                                    listings.map(item => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={styles.productCard}
                                            onPress={() => handleBuy(item)}
                                            activeOpacity={0.85}
                                        >
                                            <View style={styles.productImageWrap}>
                                                <Image source={{ uri: item.itemImageUrl }} style={styles.productImage} resizeMode="contain" />
                                            </View>
                                            <View style={styles.productInfo}>
                                                <Text style={styles.productName} numberOfLines={1}>{item.itemName}</Text>
                                                <View style={styles.productMeta}>
                                                    {getTypeIcon(item.itemType || 'food')}
                                                    <Text style={styles.productEffect}>+{item.itemEffectValue}</Text>
                                                </View>
                                                <View style={styles.priceRow}>
                                                    <Text style={styles.productPrice}>${item.price.toLocaleString()}</Text>
                                                    <Text style={styles.productStock}>x{item.quantity}</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>
                        )}

                        {!loading && activeTab === 'sell' && (
                            <View style={styles.inventoryList}>
                                {inventory.length === 0 ? (
                                    <Text style={styles.emptyText}>Çantanız boş.</Text>
                                ) : (
                                    inventory.map(slot => (
                                        <View key={slot.id} style={styles.inventoryRow}>
                                            <Image source={{ uri: slot.imageUrl }} style={styles.invImage} resizeMode="contain" />
                                            <View style={styles.invInfo}>
                                                <Text style={styles.invName}>{slot.name}</Text>
                                                <Text style={styles.invDesc} numberOfLines={1}>{slot.description}</Text>
                                                <Text style={styles.invQty}>Adet: {slot.quantity}</Text>
                                            </View>
                                            <View style={styles.invActions}>
                                                {slot.item.type === 'food' && (
                                                    <TouchableOpacity style={styles.useBtn} onPress={() => handleUseItem(slot)}>
                                                        <Text style={styles.btnLabel}>Kullan</Text>
                                                    </TouchableOpacity>
                                                )}
                                                <TouchableOpacity style={styles.sellBtn} onPress={() => openSellModal(slot)}>
                                                    <Text style={styles.btnLabel}>Sat</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </View>
                        )}
                    </ScrollView>
                </LinearGradient>
            </View>

            {/* Buy Modal */}
            <Modal visible={buyModalVisible} transparent animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.sellModal}>
                        <Text style={styles.sellTitle}>Satın Al</Text>
                        <Text style={styles.sellItemName}>{selectedItemToBuy?.itemName}</Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                            <Text style={styles.inputLabel}>Birim Fiyat: ${selectedItemToBuy?.price.toLocaleString()}</Text>
                            <Text style={styles.inputLabel}>Stok: {selectedItemToBuy?.quantity}</Text>
                        </View>

                        <Text style={styles.inputLabel}>Miktar</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                value={buyQuantity}
                                onChangeText={setBuyQuantity}
                                keyboardType="numeric"
                                placeholder="1"
                                placeholderTextColor="#555"
                            />
                            <TouchableOpacity
                                style={[styles.cancelBtn, { flex: 0.4, padding: 12 }]}
                                onPress={() => {
                                    if (selectedItemToBuy) {
                                        const maxAfford = Math.floor(playerStats.cash / selectedItemToBuy.price);
                                        const max = Math.min(maxAfford, selectedItemToBuy.quantity);
                                        setBuyQuantity(max.toString());
                                    }
                                }}
                            >
                                <Text style={styles.cancelBtnText}>MAX</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ marginVertical: 15, alignItems: 'center' }}>
                            <Text style={{ color: '#888', fontSize: 12 }}>Toplam Tutar</Text>
                            <Text style={{ color: '#66bb6a', fontSize: 20, fontWeight: 'bold' }}>
                                ${selectedItemToBuy ? (selectedItemToBuy.price * (parseInt(buyQuantity) || 0)).toLocaleString() : 0}
                            </Text>
                        </View>

                        <View style={styles.sellActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setBuyModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={handleBuyConfirm}>
                                <Text style={styles.confirmBtnText}>SATIN AL</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Sell Modal */}
            <Modal visible={sellModalVisible} transparent animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.sellModal}>
                        <Text style={styles.sellTitle}>Satış Yap</Text>
                        <Text style={styles.sellItemName}>{selectedItemToSell?.name}</Text>

                        <Text style={styles.inputLabel}>Birim Fiyat ($)</Text>
                        <TextInput
                            style={styles.input}
                            value={sellPrice}
                            onChangeText={setSellPrice}
                            keyboardType="numeric"
                            placeholderTextColor="#555"
                        />

                        <Text style={styles.inputLabel}>Adet (Max: {selectedItemToSell?.quantity})</Text>
                        <TextInput
                            style={styles.input}
                            value={sellQuantity}
                            onChangeText={setSellQuantity}
                            keyboardType="numeric"
                            placeholderTextColor="#555"
                        />

                        <View style={styles.sellActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSellModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={handleSellConfirm}>
                                <Text style={styles.confirmBtnText}>Listele</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        width: '95%',
        height: '85%',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        color: '#d4af37',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    balanceBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    balanceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    balanceText: {
        color: '#eee',
        fontSize: 12,
        fontWeight: '600',
    },
    tabRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 6,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#d4af37',
        backgroundColor: 'rgba(212,175,55,0.05)',
    },
    tabLabel: {
        color: '#555',
        fontSize: 12,
        fontWeight: 'bold',
    },
    activeTabLabel: {
        color: '#d4af37',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 12,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    productCard: {
        width: CARD_WIDTH,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        overflow: 'hidden',
    },
    productImageWrap: {
        height: 90,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    productImage: {
        width: 55,
        height: 55,
    },
    productInfo: {
        padding: 10,
    },
    productName: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    productMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 6,
    },
    productEffect: {
        color: '#aaa',
        fontSize: 11,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    productPrice: {
        color: '#66bb6a',
        fontSize: 14,
        fontWeight: 'bold',
    },
    productStock: {
        color: '#666',
        fontSize: 11,
    },
    emptyText: {
        color: '#555',
        textAlign: 'center',
        marginTop: 50,
        fontSize: 14,
    },
    inventoryList: {
        gap: 10,
    },
    inventoryRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        alignItems: 'center',
    },
    invImage: {
        width: 45,
        height: 45,
        marginRight: 12,
    },
    invInfo: {
        flex: 1,
    },
    invName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    invDesc: {
        color: '#888',
        fontSize: 11,
    },
    invQty: {
        color: '#d4af37',
        fontSize: 12,
        marginTop: 2,
    },
    invActions: {
        flexDirection: 'column',
        gap: 6,
    },
    useBtn: {
        backgroundColor: '#4ecdc4',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 6,
    },
    sellBtn: {
        backgroundColor: '#ffa726',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 6,
    },
    btnLabel: {
        color: '#000',
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    sellModal: {
        backgroundColor: '#1a1a1a',
        width: '80%',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    sellTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    sellItemName: {
        color: '#d4af37',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    inputLabel: {
        color: '#888',
        fontSize: 12,
        marginBottom: 5,
    },
    input: {
        backgroundColor: '#111',
        color: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#333',
        fontSize: 14,
    },
    sellActions: {
        flexDirection: 'row',
        gap: 10,
    },
    cancelBtn: {
        flex: 1,
        backgroundColor: '#333',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#aaa',
        fontWeight: 'bold',
    },
    confirmBtn: {
        flex: 1,
        backgroundColor: '#66bb6a',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    confirmBtnText: {
        color: '#000',
        fontWeight: 'bold',
    },
});
