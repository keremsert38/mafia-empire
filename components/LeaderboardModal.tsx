import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  X,
  Trophy,
  Star,
  MapPin,
  TrendingUp,
  Circle,
  Clock,
  ChevronUp,
  ChevronDown,
  Crown,
  Sword,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useGameService } from '@/hooks/useGameService';
import PlayerProfileModal from './PlayerProfileModal';

interface LeaderboardModalProps {
  visible: boolean;
  onClose: () => void;
}

interface LeaderboardEntry {
  player_id: string;
  player_name: string;
  rank_name: string;
  player_level: number;
  score: number;
  player_rank: number;
  profile_image?: string;
  territories?: number;
  is_active: boolean;
  last_active: string;
  score_change: number;
  is_family_leader?: boolean;
  family_name?: string;
}

export default function LeaderboardModal({ visible, onClose }: LeaderboardModalProps) {
  const { playerStats } = useGameService();
  const [activeTab, setActiveTab] = useState<'level' | 'territories'>('level');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Profile Modal State
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardEntry | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const fetchLeaderboard = useCallback(async (type: 'level' | 'territories'): Promise<void> => {
    if (refreshing) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('get_leaderboard_by_type', {
        leaderboard_type: type,
        limit_count: 100
      });

      if (error) {
        console.error('Leaderboard error:', error);
        return;
      }

      // Aile liderlerini al
      const { data: familyLeaders } = await supabase
        .from('families')
        .select('leader_id, name');

      const leaderMap = new Map<string, string>();
      (familyLeaders || []).forEach((f: any) => {
        leaderMap.set(f.leader_id, f.name);
      });

      // Aktiflik kontrolü için 5 dakika eşiği
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // Leaderboard verilerine aile bilgisi ve aktiflik ekle
      const enrichedData = (data || []).map((entry: any) => {
        const lastActive = entry.last_active ? new Date(entry.last_active) : null;
        const isReallyActive = lastActive ? lastActive > fiveMinutesAgo : false;

        return {
          ...entry,
          is_active: isReallyActive,
          is_family_leader: leaderMap.has(entry.player_id),
          family_name: leaderMap.get(entry.player_id) || null
        };
      });

      setLeaderboard(enrichedData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Leaderboard fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  const handleTabChange = useCallback(async (tab: 'level' | 'territories'): Promise<void> => {
    setActiveTab(tab);
    await fetchLeaderboard(tab);
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (!visible) return;

    fetchLeaderboard(activeTab);
    const intervalId = setInterval(() => {
      setRefreshing(true);
      fetchLeaderboard(activeTab);
    }, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, [visible, activeTab, fetchLeaderboard]);

  const formatScore = (score: number): string => {
    return score.toString();
  };

  const formatLastActive = (lastActive: string): string => {
    const date = new Date(lastActive);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)}d önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}s önce`;
    return `${Math.floor(diff / 86400)}g önce`;
  };

  const viewPlayerProfile = (player: LeaderboardEntry): void => {
    setSelectedPlayer(player);
    setProfileModalVisible(true);
  };

  const getTabIcon = (tab: string) => {
    if (tab === 'territories') {
      return <MapPin size={16} color={activeTab === tab ? '#000' : '#666'} />;
    }
    if (tab === 'power') {
      return <Sword size={16} color={activeTab === tab ? '#000' : '#666'} />;
    }
    return <TrendingUp size={16} color={activeTab === tab ? '#000' : '#666'} />;
  };

  const getTabTitle = (tab: string): string => {
    if (tab === 'territories') return 'Bölge';
    if (tab === 'power') return 'Güç';
    return 'Seviye';
  };

  const getMedalColor = (position: number): string => {
    switch (position) {
      case 1:
        return '#FFD700'; // Gold
      case 2:
        return '#C0C0C0'; // Silver
      case 3:
        return '#CD7F32'; // Bronze
      default:
        return '#666';
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>Sıralama Tablosu</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.tabContainer}>
              {(['level', 'power', 'territories'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabButton, activeTab === tab && styles.activeTab]}
                  onPress={() => handleTabChange(tab)}
                >
                  {getTabIcon(tab)}
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                    {getTabTitle(tab)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.updateInfo}>
              <Clock size={12} color="#666" />
              <Text style={styles.updateText}>
                {lastUpdate ? `Son güncelleme: ${formatLastActive(lastUpdate.toISOString())}` : 'Yükleniyor...'}
              </Text>
              {refreshing && <ActivityIndicator size="small" color="#666" style={{ marginLeft: 5 }} />}
            </View>

            <ScrollView style={styles.leaderboardList}>
              {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#d4af37" />
                  <Text style={styles.loadingText}>Sıralama yükleniyor...</Text>
                </View>
              ) : (
                leaderboard.map((player) => (
                  <TouchableOpacity
                    key={player.player_id}
                    style={[
                      styles.playerRow,
                      player.player_rank <= 3 && styles.topPlayerRow,
                      playerStats && player.player_id === playerStats.id && styles.currentPlayerRow,
                    ]}
                    onPress={() => viewPlayerProfile(player)}
                  >
                    <View style={styles.positionContainer}>
                      {player.player_rank <= 3 ? (
                        <Trophy size={24} color={getMedalColor(player.player_rank)} />
                      ) : (
                        <Text style={styles.position}>{player.player_rank}</Text>
                      )}
                    </View>

                    {/* Profile Photo */}
                    {player.profile_image ? (
                      <Image
                        source={{ uri: player.profile_image }}
                        style={styles.playerAvatar}
                      />
                    ) : (
                      <View style={styles.playerAvatarPlaceholder}>
                        <Text style={styles.playerAvatarText}>
                          {(player.player_name || 'O').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}

                    <View style={styles.playerInfo}>
                      <View style={styles.nameContainer}>
                        {/* Don Tag for #1 */}
                        {player.player_rank === 1 && (
                          <View style={styles.donTag}>
                            <Crown size={10} color="#FFD700" />
                            <Text style={styles.donTagText}>Don</Text>
                          </View>
                        )}
                        {/* Capo Tag for family leaders */}
                        {player.is_family_leader && (
                          <View style={styles.capoTag}>
                            <Crown size={10} color="#9c27b0" />
                            <Text style={styles.capoTagText}>Capo</Text>
                          </View>
                        )}
                        <Text style={[
                          styles.playerName,
                          playerStats && player.player_id === playerStats.id && styles.currentPlayerName
                        ]}>
                          {player.player_name}
                        </Text>
                        {player.is_active && (
                          <Circle size={8} color="#4caf50" fill="#4caf50" style={{ marginLeft: 5 }} />
                        )}
                      </View>

                      <View style={styles.playerDetails}>
                        <Text style={styles.playerRank}>
                          {player.rank_name} - Seviye {player.player_level}
                        </Text>
                        {player.score_change !== 0 && (
                          <View style={[
                            styles.scoreChange,
                            player.score_change > 0 ? styles.scoreIncrease : styles.scoreDecrease
                          ]}>
                            {player.score_change > 0 ? (
                              <ChevronUp size={12} color="#4caf50" />
                            ) : (
                              <ChevronDown size={12} color="#f44336" />
                            )}
                            <Text style={[
                              styles.scoreChangeText,
                              player.score_change > 0 ? styles.scoreIncreaseText : styles.scoreDecreaseText
                            ]}>
                              {Math.abs(player.score_change)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.scoreContainer}>
                      <Text style={[
                        styles.score,
                        playerStats && player.player_id === playerStats.id && styles.currentPlayerScore
                      ]}>
                        Lv.{player.player_level}
                      </Text>
                      {/* Bölge Sayısı */}
                      <View style={styles.territoryBadge}>
                        <MapPin size={12} color="#4ecdc4" />
                        <Text style={styles.territoryCount}>{player.territories || 0}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                İlk 100 oyuncu gösteriliyor • Her 10 saniyede bir güncellenir
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Player Profile Modal */}
      <PlayerProfileModal
        visible={profileModalVisible}
        onClose={() => {
          setProfileModalVisible(false);
          setSelectedPlayer(null);
        }}
        playerId={selectedPlayer?.player_id || null}
        playerName={selectedPlayer?.player_name}
        isTopPlayer={selectedPlayer?.player_rank === 1}
      />
    </>
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
    height: '80%',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  closeButton: {
    padding: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    margin: 15,
    borderRadius: 25,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 22,
  },
  activeTab: {
    backgroundColor: '#d4af37',
  },
  tabText: {
    color: '#666',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#000',
  },
  updateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
  },
  updateText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 5,
  },
  leaderboardList: {
    flex: 1,
    padding: 15,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  topPlayerRow: {
    backgroundColor: '#2a2a1a',
    borderColor: '#d4af37',
  },
  currentPlayerRow: {
    backgroundColor: '#1a2a1a',
    borderColor: '#66bb6a',
    borderWidth: 2,
  },
  positionContainer: {
    width: 40,
    alignItems: 'center',
  },
  position: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    flexWrap: 'wrap',
  },
  donTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a1a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  donTagText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  capoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1a2a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#9c27b0',
  },
  capoTagText: {
    color: '#9c27b0',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  currentPlayerName: {
    color: '#66bb6a',
  },
  playerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerRank: {
    fontSize: 12,
    color: '#999',
  },
  scoreChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  scoreIncrease: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  scoreDecrease: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  scoreChangeText: {
    fontSize: 11,
    marginLeft: 2,
  },
  scoreIncreaseText: {
    color: '#4caf50',
  },
  scoreDecreaseText: {
    color: '#f44336',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 2,
  },
  currentPlayerScore: {
    color: '#66bb6a',
  },
  lastActive: {
    fontSize: 10,
    color: '#666',
  },
  territoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  territoryCount: {
    fontSize: 12,
    color: '#4ecdc4',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
    marginTop: 10,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  playerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  playerAvatarText: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: 'bold',
  },
});