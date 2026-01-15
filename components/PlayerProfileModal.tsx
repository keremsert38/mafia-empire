// PlayerProfileModal - Detaylı oyuncu profili
// Chat ve Leaderboard'dan tıklanınca açılır

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { X, Trophy, MapPin, Sword, Shield, Users, Crown, Star, Swords } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface PlayerProfileModalProps {
    visible: boolean;
    onClose: () => void;
    playerId: string | null;
    playerName?: string;
    isTopPlayer?: boolean; // 1. sırada mı?
}

interface PlayerProfile {
    id: string;
    username: string;
    level: number;
    cash: number;
    respect: number;
    soldiers: number;
    weapon: number;
    battles_won: number;
    battles_lost: number;
    profile_image: string | null;
    family_id: string | null;
    family_name: string | null;
    family_role: string | null;
    territories: number;
    rank_name: string;
    created_at: string;
}

export default function PlayerProfileModal({
    visible,
    onClose,
    playerId,
    playerName,
    isTopPlayer = false
}: PlayerProfileModalProps) {
    const [profile, setProfile] = useState<PlayerProfile | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && playerId) {
            loadProfile();
        }
    }, [visible, playerId]);

    const loadProfile = async () => {
        if (!playerId) return;

        setLoading(true);
        try {
            // Oyuncu bilgilerini al
            const { data: playerData, error: playerError } = await supabase
                .from('player_stats')
                .select('*')
                .eq('id', playerId)
                .single();

            if (playerError) {
                console.error('Profile load error:', playerError);
                return;
            }

            // Aile bilgilerini al
            let familyName = null;
            let familyRole = null;
            if (playerData.family_id) {
                // Önce family_members tablosundan dene
                const { data: familyMember } = await supabase
                    .from('family_members')
                    .select('role, families(name)')
                    .eq('player_id', playerId)
                    .single();

                if (familyMember) {
                    familyName = (familyMember.families as any)?.name;
                    familyRole = familyMember.role;
                } else {
                    // Fallback: Doğrudan families tablosundan al
                    const { data: familyData } = await supabase
                        .from('families')
                        .select('name, leader_id')
                        .eq('id', playerData.family_id)
                        .single();

                    if (familyData) {
                        familyName = familyData.name;
                        familyRole = familyData.leader_id === playerId ? 'leader' : 'member';
                    }
                }
            }

            // Bölge sayısını al
            const { count: territoriesCount } = await supabase
                .from('region_state')
                .select('*', { count: 'exact', head: true })
                .eq('owner_user_id', playerId);

            // Rank belirle
            const rankName = getRankName(playerData.level);

            setProfile({
                ...playerData,
                family_name: familyName,
                family_role: familyRole,
                territories: territoriesCount || 0,
                rank_name: rankName,
            });
        } catch (error) {
            console.error('Profile load error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRankName = (level: number): string => {
        if (level >= 50) return 'Godfather';
        if (level >= 40) return 'Don';
        if (level >= 30) return 'Underboss';
        if (level >= 20) return 'Capo';
        if (level >= 10) return 'Soldier';
        return 'Associate';
    };

    const formatCash = (cash: number): string => {
        if (cash >= 1000000) return `$${(cash / 1000000).toFixed(1)}M`;
        if (cash >= 1000) return `$${(cash / 1000).toFixed(1)}K`;
        return `$${cash}`;
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const calculatePower = (): number => {
        if (!profile) return 0;
        const armed = Math.min(profile.soldiers, profile.weapon);
        const unarmed = profile.soldiers - armed;
        return (armed * 6) + (unarmed * 5);
    };

    const getWinRate = (): string => {
        if (!profile) return '0%';
        const total = profile.battles_won + profile.battles_lost;
        if (total === 0) return 'N/A';
        return `${Math.round((profile.battles_won / total) * 100)}%`;
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Oyuncu Profili</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#999" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#d4af37" />
                            <Text style={styles.loadingText}>Profil yükleniyor...</Text>
                        </View>
                    ) : profile ? (
                        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                            {/* Profile Header */}
                            <View style={styles.profileHeader}>
                                {/* Avatar */}
                                {profile.profile_image ? (
                                    <Image source={{ uri: profile.profile_image }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarText}>
                                            {(profile.username || 'O').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}

                                {/* Name & Rank */}
                                <View style={styles.nameContainer}>
                                    <View style={styles.nameRow}>
                                        {isTopPlayer && (
                                            <View style={styles.donTag}>
                                                <Crown size={12} color="#FFD700" />
                                                <Text style={styles.donTagText}>Don</Text>
                                            </View>
                                        )}
                                        <Text style={styles.playerName}>{profile.username}</Text>
                                    </View>
                                    <Text style={styles.rankName}>{profile.rank_name}</Text>
                                    <Text style={styles.levelText}>Seviye {profile.level}</Text>
                                </View>
                            </View>

                            {/* Family Info */}
                            {profile.family_name && (
                                <View style={styles.familyContainer}>
                                    <Users size={16} color="#d4af37" />
                                    <Text style={styles.familyText}>
                                        {profile.family_name} - {profile.family_role === 'boss' ? 'Boss' :
                                            profile.family_role === 'underboss' ? 'Underboss' : 'Üye'}
                                    </Text>
                                </View>
                            )}

                            {/* Stats Grid - Sadece Güç ve Bölge göster */}
                            <View style={styles.statsGrid}>
                                <View style={styles.statCard}>
                                    <Swords size={20} color="#ff6b6b" />
                                    <Text style={styles.statValue}>{calculatePower()}</Text>
                                    <Text style={styles.statLabel}>Güç</Text>
                                </View>

                                <View style={styles.statCard}>
                                    <MapPin size={20} color="#9c27b0" />
                                    <Text style={styles.statValue}>{profile.territories}</Text>
                                    <Text style={styles.statLabel}>Bölge</Text>
                                </View>
                            </View>

                            {/* Battle Stats */}
                            <View style={styles.battleStats}>
                                <Text style={styles.sectionTitle}>⚔️ Savaş İstatistikleri</Text>
                                <View style={styles.battleRow}>
                                    <View style={styles.battleStat}>
                                        <Text style={styles.battleWin}>{profile.battles_won}</Text>
                                        <Text style={styles.battleLabel}>Kazanma</Text>
                                    </View>
                                    <View style={styles.battleDivider} />
                                    <View style={styles.battleStat}>
                                        <Text style={styles.battleLose}>{profile.battles_lost}</Text>
                                        <Text style={styles.battleLabel}>Kaybetme</Text>
                                    </View>
                                    <View style={styles.battleDivider} />
                                    <View style={styles.battleStat}>
                                        <Text style={styles.battleRate}>{getWinRate()}</Text>
                                        <Text style={styles.battleLabel}>Oran</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Financial Stats - GİZLENDİ */}
                            {/* 
                            <View style={styles.financialStats}>
                                <Text style={styles.sectionTitle}>💰 Ekonomik Durum</Text>
                                <View style={styles.financialRow}>
                                    <Text style={styles.financialLabel}>Nakit:</Text>
                                    <Text style={styles.financialValue}>{formatCash(profile.cash)}</Text>
                                </View>
                                <View style={styles.financialRow}>
                                    <Text style={styles.financialLabel}>Saygı:</Text>
                                    <Text style={styles.financialValue}>{profile.respect}</Text>
                                </View>
                            </View> 
                            */}

                            {/* Join Date */}
                            <Text style={styles.joinDate}>
                                🗓️ Katılım: {formatDate(profile.created_at)}
                            </Text>
                        </ScrollView>
                    ) : (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>Profil yüklenemedi</Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        backgroundColor: '#1a1a1a',
        borderRadius: 15,
        width: '90%',
        maxHeight: '85%',
        borderWidth: 2,
        borderColor: '#d4af37',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#d4af37',
    },
    closeButton: {
        padding: 5,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        color: '#666',
        marginTop: 10,
    },
    content: {
        padding: 15,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#d4af37',
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#2a2a2a',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#d4af37',
    },
    avatarText: {
        color: '#d4af37',
        fontSize: 32,
        fontWeight: 'bold',
    },
    nameContainer: {
        marginLeft: 15,
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    donTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a2a1a',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#FFD700',
    },
    donTagText: {
        color: '#FFD700',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    playerName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    rankName: {
        fontSize: 14,
        color: '#d4af37',
        marginTop: 2,
    },
    levelText: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    familyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a2a2a',
        padding: 10,
        borderRadius: 10,
        marginBottom: 15,
    },
    familyText: {
        color: '#d4af37',
        marginLeft: 8,
        fontSize: 14,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    statCard: {
        width: '48%',
        backgroundColor: '#2a2a2a',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 10,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 5,
    },
    statLabel: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    battleStats: {
        backgroundColor: '#2a2a2a',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#d4af37',
        marginBottom: 10,
    },
    battleRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    battleStat: {
        alignItems: 'center',
        flex: 1,
    },
    battleDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#444',
    },
    battleWin: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4caf50',
    },
    battleLose: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f44336',
    },
    battleRate: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ff9800',
    },
    battleLabel: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    financialStats: {
        backgroundColor: '#2a2a2a',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
    },
    financialRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    financialLabel: {
        color: '#999',
        fontSize: 14,
    },
    financialValue: {
        color: '#4caf50',
        fontSize: 14,
        fontWeight: 'bold',
    },
    joinDate: {
        color: '#666',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 10,
    },
    errorContainer: {
        padding: 40,
        alignItems: 'center',
    },
    errorText: {
        color: '#ff6b6b',
    },
});
