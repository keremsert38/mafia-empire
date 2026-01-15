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
    TextInput,
    ActivityIndicator
} from 'react-native';
import { X, Package, DollarSign } from 'lucide-react-native';
import { useGameService } from '@/hooks/useGameService';

interface InventoryItem {
    resource_id: string;
    resource_name: string;
    resource_image: string;
    quantity: number;
    base_cost: number;
}

interface InventoryModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function InventoryModal({ visible, onClose }: InventoryModalProps) {
    const { gameService } = useGameService();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

    // Satış Modal State
    const [sellModalVisible, setSellModalVisible] = useState(false);
    const [sellQuantity, setSellQuantity] = useState('');
    const [sellPrice, setSellPrice] = useState('');
    const [listingLoading, setListingLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            loadInventory();
        }
    }, [visible]);

    const loadInventory = async () => {
        setLoading(true);
        try {
            const data = await gameService.getMyInventory();
            setInventory(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Hata', 'Envanter yüklenemedi');
        } finally {
            setLoading(false);
        }
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

        // Max fiyat kontrolü (Client-side, server da kontrol ediyor)
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
                loadInventory(); // Envanteri yenile
            } else {
                Alert.alert('Hata', result.message || 'İlan oluşturulamadı');
            }
        } catch (error) {
            Alert.alert('Hata', 'Bir hata oluştu');
        } finally {
            setListingLoading(false);
        }
    };

    const renderItem = ({ item }: { item: InventoryItem }) => (
        <View style={styles.itemCard}>
            <Image source={{ uri: item.resource_image }} style={styles.itemImage} />
            <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.resource_name}</Text>
                <Text style={styles.itemQuantity}>Miktar: {item.quantity}</Text>
                <Text style={styles.itemCost}>Taban Fiyat: ${item.base_cost}</Text>
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
                            <Package size={24} color="#d4af37" />
                            <Text style={styles.title}>Karaborsa Çantası</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#999" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#d4af37" style={styles.loader} />
                    ) : inventory.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>Envanteriniz boş.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={inventory}
                            renderItem={renderItem}
                            keyExtractor={item => item.resource_id}
                            contentContainerStyle={styles.listContent}
                        />
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
                                            style={styles.cancelButton}
                                            onPress={() => setSellModalVisible(false)}
                                        >
                                            <Text style={styles.cancelButtonText}>İptal</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.confirmButton}
                                            onPress={handleCreateListing}
                                            disabled={listingLoading}
                                        >
                                            <Text style={styles.confirmButtonText}>
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
        padding: 20,
    },
    modal: {
        backgroundColor: '#1a1a1a',
        borderRadius: 15,
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: '#333',
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
        fontSize: 20,
        fontWeight: 'bold',
        color: '#d4af37',
    },
    closeButton: {
        padding: 5,
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
        fontSize: 16,
    },
    listContent: {
        padding: 15,
    },
    itemCard: {
        flexDirection: 'row',
        backgroundColor: '#2a2a2a',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        alignItems: 'center',
    },
    itemImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#333',
    },
    itemInfo: {
        flex: 1,
        marginLeft: 15,
    },
    itemName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    itemQuantity: {
        color: '#ccc',
        fontSize: 14,
        marginTop: 4,
    },
    itemCost: {
        color: '#666',
        fontSize: 12,
        marginTop: 4,
    },
    sellButton: {
        backgroundColor: '#d4af37',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 5,
    },
    sellButtonText: {
        color: '#000',
        fontWeight: 'bold',
    },
    sellOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 30,
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
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        color: '#ccc',
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#333',
        color: '#fff',
        padding: 10,
        borderRadius: 8,
        fontSize: 16,
    },
    sellActions: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 10,
    },
    cancelButton: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        backgroundColor: '#444',
        borderRadius: 8,
    },
    confirmButton: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        backgroundColor: '#d4af37',
        borderRadius: 8,
    },
    cancelButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    confirmButtonText: {
        color: '#000',
        fontWeight: 'bold',
    },
});
