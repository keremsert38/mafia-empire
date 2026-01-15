import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
} from 'react-native';
import { Search, Sword, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useGameService } from '@/hooks/useGameService';
import { Clock } from 'lucide-react-native';

interface Player {
    id: string;
    username: string;
}

interface AttackModalProps {
    visible: boolean;
    onClose: () => void;
    playerSoldiers: number;
    onAttack: (targetId: string, targetName: string, soldiersToSend: number) => Promise<{ success: boolean; message: string }>;
}

export default function AttackModal({
    visible,
    onClose,
    playerSoldiers,
    onAttack
}: AttackModalProps) {
    const { user } = useAuth();
    const { playerStats } = useGameService();
    const [players, setPlayers] = useState<Player[]>([]);
    const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
    const [searchText, setSearchText] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [soldiersToSend, setSoldiersToSend] = useState('');
    const [loading, setLoading] = useState(false);
    const [cooldownRemaining, setCooldownRemaining] = useState<string | null>(null);

    useEffect(() => {
        const checkCooldown = () => {
            if (playerStats?.lastAttackTime) {
                const now = new Date();
                const lastAttack = new Date(playerStats.lastAttackTime);
                const diff = now.getTime() - lastAttack.getTime();
                const cooldown = 3 * 60 * 60 * 1000; // 3 saat

                if (diff < cooldown) {
                    const remaining = cooldown - diff;
                    const hours = Math.floor(remaining / (1000 * 60 * 60));
                    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
                    setCooldownRemaining(`${hours}s ${minutes}dk ${seconds}sn`);
                } else {
                    setCooldownRemaining(null);
                }
            }
        };

        checkCooldown(); // İlk kontrol
        const timer = setInterval(checkCooldown, 1000);
        return () => clearInterval(timer);
    }, [playerStats?.lastAttackTime]);

    useEffect(() => {
        if (visible) {
            loadPlayers();
        }
    }, [visible]);

    useEffect(() => {
        if (searchText.trim() === '') {
            setFilteredPlayers(players);
        } else {
            const filtered = players.filter(p =>
                p.username.toLowerCase().includes(searchText.toLowerCase())
            );
            setFilteredPlayers(filtered);
        }
    }, [searchText, players]);

    const loadPlayers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('player_stats')
                .select('id, username')
                .neq('id', user?.id)
                .order('username', { ascending: true })
                .limit(100);

            if (error) throw error;
            setPlayers(data || []);
            setFilteredPlayers(data || []);
        } catch (error) {
            console.error('Error loading players:', error);
            Alert.alert('Hata', 'Oyuncular yüklenemedi!');
        } finally {
            setLoading(false);
        }
    };

    const [battleState, setBattleState] = useState({
        baretta: 0,
        ak47: 0
    });

    // gameService hook returns an object containing the instance as 'gameService' property
    const { gameService } = useGameService();

    // ... existing checkCooldown ...

    const handleAttackV2 = async () => {
        if (!selectedPlayer) return;

        const soldiers = parseInt(soldiersToSend);
        if (isNaN(soldiers) || soldiers <= 0) {
            Alert.alert('Hata', 'Asker sayısı giriniz!');
            return;
        }

        // Validate weapons (Should be handled by UI constraints, but double check)
        if (battleState.baretta + battleState.ak47 > soldiers) {
            Alert.alert('Hata', 'Silah sayısı asker sayısından fazla olamaz!');
            return;
        }

        Alert.alert(
            'Saldırı Onayı',
            `${selectedPlayer.username} oyuncusuna saldıracaksınız.\n\n` +
            `⚔️ Asker: ${soldiers}\n` +
            `🔫 Baretta: ${battleState.baretta}\n` +
            `🔫 AK-47: ${battleState.ak47}\n\n` +
            `🔥 Tahmini Güç: ${(soldiers * 5) + (battleState.baretta * 3) + (battleState.ak47 * 10)}`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'SALDIR!',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const result = await gameService.attackPlayerV2(
                                selectedPlayer.id,
                                soldiers,
                                battleState.baretta,
                                battleState.ak47
                            );

                            if (result.success) {
                                Alert.alert('Sonuç', result.message);
                                setSelectedPlayer(null);
                                setSoldiersToSend('');
                                setBattleState({ baretta: 0, ak47: 0 });

                                // Savaş sonrası player stats'ı güncelle
                                try {
                                    await gameService.loadPlayerStatsFromSupabase();
                                } catch (e) {
                                    console.log('Stats refresh error:', e);
                                }

                                onClose(); // Close modal on success
                            } else {
                                Alert.alert('Başarısız', result.message);
                            }
                        } catch (error: any) {
                            Alert.alert('Hata', error.message);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const adjustSoldiers = (change: number) => {
        const current = parseInt(soldiersToSend) || 0;
        const newValue = Math.max(0, Math.min(playerSoldiers, current + change));
        setSoldiersToSend(newValue.toString());
        // Reset weapons if soldiers are reduced below weapon count
        if (newValue < battleState.baretta + battleState.ak47) {
            setBattleState({ baretta: 0, ak47: 0 });
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <View style={styles.headerContent}>
                            <Sword size={24} color="#ff6b6b" />
                            <Text style={styles.title}>Saldırı</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#999" />
                        </TouchableOpacity>
                    </View>

                    {cooldownRemaining && (
                        <View style={styles.cooldownContainer}>
                            <Clock size={20} color="#ffa726" />
                            <Text style={styles.cooldownText}>
                                Saldırı yorgunusunuz! {cooldownRemaining} sonra tekrar saldırabilirsiniz.
                            </Text>
                        </View>
                    )}

                    <View style={styles.content}>
                        {/* Search Bar */}
                        <View style={styles.searchContainer}>
                            <Search size={20} color="#999" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Oyuncu ara..."
                                placeholderTextColor="#666"
                                value={searchText}
                                onChangeText={setSearchText}
                            />
                        </View>

                        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer} showsVerticalScrollIndicator={false}>
                            {/* Player Stats */}
                            <View style={styles.statsCard}>
                                <Text style={styles.statsLabel}>Mevcut Askerleriniz:</Text>
                                <Text style={styles.statsValue}>{playerSoldiers}</Text>
                            </View>

                            {/* Selected Player */}
                            {selectedPlayer && (
                                <View style={styles.selectedPlayerCard}>
                                    <Text style={styles.sectionTitle}>Seçilen Hedef:</Text>
                                    <Text style={styles.playerName}>{selectedPlayer.username}</Text>

                                    {/* Soldier Input */}
                                    <View style={styles.soldierInputSection}>
                                        <View style={styles.rowBetween}>
                                            <Text style={styles.sectionTitle}>Kaç Asker?</Text>
                                            <Text style={styles.powerPreview}>Güç: {
                                                (parseInt(soldiersToSend) || 0) * 5 +
                                                (battleState.baretta * 3) +
                                                (battleState.ak47 * 10)
                                            }</Text>
                                        </View>
                                        <View style={styles.counter}>
                                            <TouchableOpacity style={styles.counterButton} onPress={() => adjustSoldiers(-10)}><Text style={styles.counterButtonText}>-10</Text></TouchableOpacity>
                                            <TouchableOpacity style={styles.counterButton} onPress={() => adjustSoldiers(-1)}><Text style={styles.counterButtonText}>-</Text></TouchableOpacity>
                                            <TextInput
                                                style={styles.soldierInput}
                                                value={soldiersToSend}
                                                onChangeText={setSoldiersToSend}
                                                keyboardType="numeric"
                                                placeholder="0"
                                                placeholderTextColor="#666"
                                            />
                                            <TouchableOpacity style={styles.counterButton} onPress={() => adjustSoldiers(1)}><Text style={styles.counterButtonText}>+</Text></TouchableOpacity>
                                            <TouchableOpacity style={styles.counterButton} onPress={() => adjustSoldiers(10)}><Text style={styles.counterButtonText}>+10</Text></TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Weapon Selection */}
                                    <View style={styles.weaponSection}>
                                        <Text style={styles.sectionTitle}>Silah Seçimi (Max: {parseInt(soldiersToSend) || 0})</Text>

                                        {/* Baretta */}
                                        <View style={styles.weaponRow}>
                                            <View style={styles.weaponInfo}>
                                                <Text style={styles.weaponName}>Baretta (Güç: +3)</Text>
                                                <Text style={styles.weaponStock}>Stok: {playerStats?.baretta || 0}</Text>
                                            </View>
                                            <View style={styles.counterSmallContainer}>
                                                <TouchableOpacity
                                                    style={styles.maxButton}
                                                    onPress={() => {
                                                        const soldiers = parseInt(soldiersToSend) || 0;
                                                        const availableSpace = soldiers - battleState.ak47;
                                                        const maxPossible = Math.min(playerStats?.baretta || 0, availableSpace);
                                                        setBattleState(prev => ({ ...prev, baretta: Math.max(0, maxPossible) }));
                                                    }}
                                                >
                                                    <Text style={styles.maxButtonText}>MAX</Text>
                                                </TouchableOpacity>
                                                <View style={styles.counterSmall}>
                                                    <TouchableOpacity
                                                        style={styles.counterButtonSmall}
                                                        onPress={() => setBattleState(prev => ({ ...prev, baretta: Math.max(0, prev.baretta - 1) }))}
                                                    >
                                                        <Text style={styles.counterButtonText}>-</Text>
                                                    </TouchableOpacity>
                                                    <Text style={styles.counterValue}>{battleState.baretta}</Text>
                                                    <TouchableOpacity
                                                        style={styles.counterButtonSmall}
                                                        onPress={() => {
                                                            const soldiers = parseInt(soldiersToSend) || 0;
                                                            const currentTotal = battleState.baretta + battleState.ak47;
                                                            if (currentTotal < soldiers && battleState.baretta < (playerStats?.baretta || 0)) {
                                                                setBattleState(prev => ({ ...prev, baretta: prev.baretta + 1 }));
                                                            }
                                                        }}
                                                    >
                                                        <Text style={styles.counterButtonText}>+</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>

                                        {/* AK-47 */}
                                        <View style={styles.weaponRow}>
                                            <View style={styles.weaponInfo}>
                                                <Text style={styles.weaponName}>AK-47 (Güç: +10)</Text>
                                                <Text style={styles.weaponStock}>Stok: {playerStats?.ak47 || 0}</Text>
                                            </View>
                                            <View style={styles.counterSmallContainer}>
                                                <TouchableOpacity
                                                    style={styles.maxButton}
                                                    onPress={() => {
                                                        const soldiers = parseInt(soldiersToSend) || 0;
                                                        const availableSpace = soldiers - battleState.baretta;
                                                        const maxPossible = Math.min(playerStats?.ak47 || 0, availableSpace);
                                                        setBattleState(prev => ({ ...prev, ak47: Math.max(0, maxPossible) }));
                                                    }}
                                                >
                                                    <Text style={styles.maxButtonText}>MAX</Text>
                                                </TouchableOpacity>
                                                <View style={styles.counterSmall}>
                                                    <TouchableOpacity
                                                        style={styles.counterButtonSmall}
                                                        onPress={() => setBattleState(prev => ({ ...prev, ak47: Math.max(0, prev.ak47 - 1) }))}
                                                    >
                                                        <Text style={styles.counterButtonText}>-</Text>
                                                    </TouchableOpacity>
                                                    <Text style={styles.counterValue}>{battleState.ak47}</Text>
                                                    <TouchableOpacity
                                                        style={styles.counterButtonSmall}
                                                        onPress={() => {
                                                            const soldiers = parseInt(soldiersToSend) || 0;
                                                            const currentTotal = battleState.baretta + battleState.ak47;
                                                            if (currentTotal < soldiers && battleState.ak47 < (playerStats?.ak47 || 0)) {
                                                                setBattleState(prev => ({ ...prev, ak47: prev.ak47 + 1 }));
                                                            }
                                                        }}
                                                    >
                                                        <Text style={styles.counterButtonText}>+</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Attack Button */}
                                    <TouchableOpacity
                                        style={[
                                            styles.attackButton,
                                            (loading || !soldiersToSend || parseInt(soldiersToSend) <= 0 || !!cooldownRemaining) && styles.attackButtonDisabled
                                        ]}
                                        onPress={handleAttackV2}
                                        disabled={loading || !soldiersToSend || parseInt(soldiersToSend) <= 0 || !!cooldownRemaining}
                                    >
                                        <Sword size={20} color="#fff" />
                                        <Text style={styles.attackButtonText}>
                                            {loading ? 'Saldırılıyor...' : 'SALDIR!'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Player List */}
                            <Text style={styles.sectionTitle}>Oyuncular:</Text>
                            {loading && players.length === 0 ? (
                                <Text style={styles.loadingText}>Yükleniyor...</Text>
                            ) : filteredPlayers.length === 0 ? (
                                <Text style={styles.emptyText}>Oyuncu bulunamadı</Text>
                            ) : (
                                filteredPlayers.map((player) => (
                                    <TouchableOpacity
                                        key={player.id}
                                        style={[
                                            styles.playerItem,
                                            selectedPlayer?.id === player.id && styles.playerItemSelected
                                        ]}
                                        onPress={() => {
                                            setSelectedPlayer(player);
                                            setSoldiersToSend('');
                                        }}
                                    >
                                        <Text style={styles.playerItemName}>{player.username}</Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
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
    },
    modal: {
        backgroundColor: '#1a1a1a',
        borderRadius: 15,
        width: '95%',
        height: '85%',
        borderWidth: 2,
        borderColor: '#ff6b6b',
        marginTop: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ff6b6b',
    },
    closeButton: {
        padding: 5,
    },
    content: {
        flex: 1,
        padding: 15,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a2a2a',
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 15,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        paddingVertical: 12,
    },
    statsCard: {
        backgroundColor: '#2a2a2a',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statsLabel: {
        color: '#999',
        fontSize: 14,
    },
    statsValue: {
        color: '#4ecdc4',
        fontSize: 18,
        fontWeight: 'bold',
    },
    selectedPlayerCard: {
        backgroundColor: '#2a1a1a',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        borderWidth: 2,
        borderColor: '#ff6b6b',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#d4af37',
        marginBottom: 10,
    },
    playerName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 15,
    },
    soldierInputSection: {
        marginBottom: 15,
    },
    counter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
    },
    counterButton: {
        backgroundColor: '#333',
        padding: 10,
        borderRadius: 8,
        minWidth: 40,
        alignItems: 'center',
    },
    counterButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    soldierInput: {
        backgroundColor: '#333',
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        minWidth: 80,
    },
    attackButton: {
        backgroundColor: '#ff6b6b',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 10,
        gap: 10,
    },
    attackButtonDisabled: {
        backgroundColor: '#666',
        opacity: 0.6,
    },
    attackButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    playerList: {
        flex: 1,
    },
    loadingText: {
        color: '#999',
        textAlign: 'center',
        marginTop: 20,
    },
    emptyText: {
        color: '#999',
        textAlign: 'center',
        marginTop: 20,
    },
    playerItem: {
        backgroundColor: '#2a2a2a',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    playerItemSelected: {
        borderColor: '#ff6b6b',
        backgroundColor: '#2a1a1a',
    },
    playerItemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    cooldownContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 167, 38, 0.15)',
        padding: 12,
        marginHorizontal: 15,
        marginTop: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ffa726',
    },
    cooldownText: {
        color: '#ffa726',
        marginLeft: 10,
        fontSize: 13,
        fontWeight: 'bold',
        flex: 1,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    powerPreview: {
        color: '#ff6b6b',
        fontWeight: 'bold',
        fontSize: 16,
    },
    weaponSection: {
        marginTop: 15,
        marginBottom: 15,
        backgroundColor: '#333',
        borderRadius: 8,
        padding: 10,
    },
    weaponRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#444',
    },
    weaponInfo: {
        flex: 1,
    },
    weaponName: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    weaponStock: {
        color: '#999',
        fontSize: 12,
    },
    counterSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#222',
        borderRadius: 6,
        padding: 2,
    },
    counterButtonSmall: {
        padding: 8,
        minWidth: 30,
        alignItems: 'center',
    },
    counterValue: {
        color: '#fff',
        minWidth: 20,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    scrollContent: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: 20,
    },
    counterSmallContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    maxButton: {
        backgroundColor: '#ff6b6b',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    maxButtonText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
