import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    Image,
    Alert,
    ActivityIndicator,
    TextInput
} from 'react-native';
import { X, Store, ShoppingCart, Search, Package, DollarSign } from 'lucide-react-native';
import { useGameService } from '@/hooks/useGameService';

interface MarketListing {
    listing_id: string;
    seller_name: string;
    resource_name: string;
    resource_image: string;
    quantity: number;
    price: number;
    is_mine: boolean;
}

interface InventoryItem {
    resource_id: string;
    resource_name: string;
    resource_image: string;
    quantity: number;
    base_cost: number;
}

interface MarketModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function MarketModal({ visible, onClose }: MarketModalProps) {
    const { gameService } = useGameService();

    // Sekme state
    const [activeTab, setActiveTab] = useState<'market' | 'inventory'>('market');

    // Market State
    const [listings, setListings] = useState<MarketListing[]>([]);
    const [marketLoading, setMarketLoading] = useState(false);
    const [buyLoading, setBuyLoading] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');

    // Envanter State
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [inventoryLoading, setInventoryLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [sellModalVisible, setSellModalVisible] = useState(false);
    const [sellQuantity, setSellQuantity] = useState('');
    const [sellPrice, setSellPrice] = useState('');
    const [listingLoading, setListingLoading] = useState(false);

    const filteredListings = listings.filter(l =>
        l.resource_name.toLowerCase().includes(searchText.toLowerCase()) ||
        l.seller_name.toLowerCase().includes(searchText.toLowerCase())
    );

    useEffect(() => {
        if (visible) {
            loadMarket();
            loadInventory();
        }
    }, [visible]);

    const loadMarket = async () => {
        setMarketLoading(true);
        try {
            const data = await gameService.getMarketListings();
            setListings(data);
        } catch (error) {
            console.error(error);
        } finally {
            setMarketLoading(false);
        }
    };

    const loadInventory = async () => {
        setInventoryLoading(true);
        try {
            const data = await gameService.getMyInventory();
            setInventory(data);
        } catch (error) {
            console.error(error);
        } finally {
            setInventoryLoading(false);
        }
    };

    const handleBuy = async (listing: MarketListing) => {
        Alert.alert(
            'Satın Al',
            `${listing.quantity} adet ${listing.resource_name} için toplam $${listing.quantity * listing.price} ödeme yapılacak.`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Satın Al',
                    onPress: async () => {
                        setBuyLoading(listing.listing_id);
                        try {
                            const result = await gameService.buyMarketItem(listing.listing_id, listing.quantity);
                            if (result.success) {
                                Alert.alert('Başarılı', 'Ürün satın alındı!');
                                loadMarket();
                                loadInventory();
                            } else {
                                Alert.alert('Hata', result.message);
                            }
                        } catch (error) {
                            Alert.alert('Hata', 'Satın alma başarısız');
                        } finally {
                            setBuyLoading(null);
                        }
                    }
                }
            ]
        );
    };

    const handleSellPress = (item: InventoryItem) => {
        setSelectedItem(item);
        setSellQuantity('1');
        setSellPrice(item.base_cost.toString());
        setSellModalVisible(true);
    };

    const handleCreateListing = async () => {
        if (!selectedItem) return;

        const qty = parseInt(sellQuantity);
        const price = parseInt(sellPrice);

        if (qty <= 0 || qty > selectedItem.quantity) {
            Alert.alert('Hata', 'Geçersiz miktar');
            return;
        }

        if (price <= 0) {
            Alert.alert('Hata', 'Fiyat 0 olamaz');
            return;
        }

        const maxPrice = selectedItem.base_cost * 2;
        if (price > maxPrice) {
            Alert.alert('Hata', `Fiyat çok yüksek! Maksimum: $${maxPrice}`);
            return;
        }

        setListingLoading(true);
        try {
            const result = await gameService.createMarketListing(selectedItem.resource_id, qty, price);
            if (result.success) {
                Alert.alert('Başarılı', 'İlan oluşturuldu!');
                setSellModalVisible(false);
                loadInventory();
                loadMarket();
            } else {
                Alert.alert('Hata', result.message || 'İlan oluşturulamadı');
            }
        } catch (error) {
            Alert.alert('Hata', 'Bir hata oluştu');
        } finally {
            setListingLoading(false);
        }
    };

    const renderMarketItem = ({ item }: { item: MarketListing }) => (
        <View style={styles.card}>
            <Image source={{ uri: item.resource_image || 'https://via.placeholder.com/60' }} style={styles.image} />
            <View style={styles.info}>
                <Text style={styles.name}>{item.resource_name}</Text>
                <Text style={styles.seller}>Satıcı: {item.seller_name} {item.is_mine ? '(Sen)' : ''}</Text>
                <View style={styles.detailsRow}>
                    <Text style={styles.quantity}>Adet: {item.quantity}</Text>
                    <Text style={styles.price}>${item.price}/adet</Text>
                </View>
            </View>
            {!item.is_mine && (
                <TouchableOpacity
                    style={styles.buyButton}
                    onPress={() => handleBuy(item)}
                    disabled={!!buyLoading}
                >
                    {buyLoading === item.listing_id ? (
                        <ActivityIndicator size="small" color="#000" />
                    ) : (
                        <>
                            <ShoppingCart size={16} color="#000" />
                            <Text style={styles.buyButtonText}>${item.price * item.quantity}</Text>
                        </>
                    )}
                </TouchableOpacity>
            )}
            {item.is_mine && (
                <View style={styles.myListingBadge}>
                    <Text style={styles.myListingText}>Senin</Text>
                </View>
            )}
        </View>
    );

    const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
        <View style={styles.card}>
            <Image source={{ uri: item.resource_image || 'https://via.placeholder.com/60' }} style={styles.image} />
            <View style={styles.info}>
                <Text style={styles.name}>{item.resource_name}</Text>
                <Text style={styles.quantity}>Miktar: {item.quantity}</Text>
                <Text style={styles.baseCost}>Değer: ${item.base_cost}</Text>
            </View>
            <TouchableOpacity
                style={styles.sellButton}
                onPress={() => handleSellPress(item)}
            >
                <DollarSign size={16} color="#000" />
                <Text style={styles.sellButtonText}>Sat</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <View style={styles.headerTitleContainer}>
                            <Store size={24} color="#4ecdc4" />
                            <Text style={styles.title}>Karaborsa</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#999" />
                        </TouchableOpacity>
                    </View>

                    {/* Sekmeler */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'market' && styles.activeTab]}
                            onPress={() => setActiveTab('market')}
                        >
                            <ShoppingCart size={18} color={activeTab === 'market' ? '#000' : '#888'} />
                            <Text style={[styles.tabText, activeTab === 'market' && styles.activeTabText]}>
                                Pazar
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'inventory' && styles.activeTab]}
                            onPress={() => setActiveTab('inventory')}
                        >
                            <Package size={18} color={activeTab === 'inventory' ? '#000' : '#888'} />
                            <Text style={[styles.tabText, activeTab === 'inventory' && styles.activeTabText]}>
                                Çantam ({inventory.length})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {activeTab === 'market' && (
                        <>
                            <View style={styles.searchContainer}>
                                <Search size={20} color="#666" style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Ürün veya satıcı ara..."
                                    placeholderTextColor="#666"
                                    value={searchText}
                                    onChangeText={setSearchText}
                                />
                            </View>

                            {marketLoading ? (
                                <ActivityIndicator size="large" color="#4ecdc4" style={styles.loader} />
                            ) : filteredListings.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>Aktif ilan bulunamadı.</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={filteredListings}
                                    renderItem={renderMarketItem}
                                    keyExtractor={item => item.listing_id}
                                    contentContainerStyle={styles.listContent}
                                />
                            )}
                        </>
                    )}

                    {activeTab === 'inventory' && (
                        <>
                            {inventoryLoading ? (
                                <ActivityIndicator size="large" color="#d4af37" style={styles.loader} />
                            ) : inventory.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>Çantan boş. Ürün üretmeye başla!</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={inventory}
                                    renderItem={renderInventoryItem}
                                    keyExtractor={item => item.resource_id}
                                    contentContainerStyle={styles.listContent}
                                />
                            )}
                        </>
                    )}

                    {/* Sell Popup */}
                    {sellModalVisible && selectedItem && (
                        <Modal visible={sellModalVisible} transparent animationType="fade">
                            <View style={styles.sellOverlay}>
                                <View style={styles.sellModal}>
                                    <Text style={styles.sellTitle}>{selectedItem.resource_name} Sat</Text>

                                    <Text style={styles.label}>Miktar (Max: {selectedItem.quantity})</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={sellQuantity}
                                        onChangeText={setSellQuantity}
                                        keyboardType="numeric"
                                    />

                                    <Text style={styles.label}>Birim Fiyat (Max: ${selectedItem.base_cost * 2})</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={sellPrice}
                                        onChangeText={setSellPrice}
                                        keyboardType="numeric"
                                    />

                                    <View style={styles.sellActions}>
                                        <TouchableOpacity
                                            style={styles.cancelBtn}
                                            onPress={() => setSellModalVisible(false)}
                                        >
                                            <Text style={styles.cancelBtnText}>İptal</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.confirmBtn}
                                            onPress={handleCreateListing}
                                            disabled={listingLoading}
                                        >
                                            <Text style={styles.confirmBtnText}>
                                                {listingLoading ? '...' : 'İlan Ver'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </Modal>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        padding: 15,
    },
    modal: {
        backgroundColor: '#1a1a1a',
        borderRadius: 15,
        height: '90%',
        borderWidth: 1,
        borderColor: '#4ecdc4',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#4ecdc4',
    },
    closeButton: {
        padding: 5,
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 10,
        gap: 10,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 10,
        backgroundColor: '#2a2a2a',
        gap: 8,
    },
    activeTab: {
        backgroundColor: '#4ecdc4',
    },
    tabText: {
        color: '#888',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#000',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a2a2a',
        margin: 10,
        marginTop: 0,
        borderRadius: 10,
        paddingHorizontal: 10,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        paddingVertical: 10,
        fontSize: 15,
    },
    loader: {
        padding: 40,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#666',
        fontSize: 15,
    },
    listContent: {
        padding: 10,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#2a2a2a',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    image: {
        width: 55,
        height: 55,
        borderRadius: 8,
        backgroundColor: '#333',
    },
    info: {
        flex: 1,
        marginLeft: 12,
    },
    name: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    seller: {
        color: '#888',
        fontSize: 11,
        marginTop: 2,
    },
    detailsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 5,
    },
    quantity: {
        color: '#ccc',
        fontSize: 12,
    },
    price: {
        color: '#4ecdc4',
        fontSize: 12,
        fontWeight: 'bold',
    },
    baseCost: {
        color: '#666',
        fontSize: 11,
        marginTop: 3,
    },
    buyButton: {
        backgroundColor: '#4ecdc4',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
    },
    buyButtonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 12,
    },
    sellButton: {
        backgroundColor: '#d4af37',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
    },
    sellButtonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 12,
    },
    myListingBadge: {
        backgroundColor: '#333',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 5,
    },
    myListingText: {
        color: '#aaa',
        fontSize: 11,
    },
    sellOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 25,
    },
    sellModal: {
        backgroundColor: '#222',
        padding: 20,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#d4af37',
    },
    sellTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    label: {
        color: '#ccc',
        marginBottom: 6,
        marginTop: 8,
    },
    input: {
        backgroundColor: '#333',
        color: '#fff',
        padding: 10,
        borderRadius: 8,
        fontSize: 15,
    },
    sellActions: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 10,
    },
    cancelBtn: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        backgroundColor: '#444',
        borderRadius: 8,
    },
    confirmBtn: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        backgroundColor: '#d4af37',
        borderRadius: 8,
    },
    cancelBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    confirmBtnText: {
        color: '#000',
        fontWeight: 'bold',
    },
});
