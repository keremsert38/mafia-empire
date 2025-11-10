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
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useGameService } from '@/hooks/useGameService';

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
});

export default function LeaderboardModal({ visible, onClose }: LeaderboardModalProps) {
  const { playerStats } = useGameService();
  const [activeTab, setActiveTab] = useState<'level' | 'respect' | 'territories'>('level');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchLeaderboard = useCallback(async (type: 'level' | 'respect' | 'territories'): Promise<void> => {
    if (refreshing) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('get_leaderboard_by_type', {
        leaderboard_type: type,
        limit_count: 100
      });
      
      if (error) {
        console.error('Leaderboard error:', error);
        Alert.alert('Hata', 'Sıralama verileri yüklenemedi.');
        return;
      }
      
      setLeaderboard(data || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Leaderboard fetch error:', error);
      Alert.alert('Hata', 'Sıralama verileri yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  const handleTabChange = useCallback(async (tab: 'level' | 'respect' | 'territories'): Promise<void> => {
    setActiveTab(tab);
    await fetchLeaderboard(tab);
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (!visible) return;
    
    fetchLeaderboard(activeTab);
    const intervalId = setInterval(() => {
      setRefreshing(true);
      fetchLeaderboard(activeTab);
    }, 30000);

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
    Alert.alert(
      `${player.player_name} - Profil`,
      `Rütbe: ${player.rank_name}\nSeviye: ${player.player_level}\nBölge: ${player.territories || 0}\nSkor: ${formatScore(player.score)}`,
      [{ text: 'Tamam' }]
    );
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'level':
        return <TrendingUp size={16} color={activeTab === tab ? '#000' : '#666'} />;
      case 'respect':
        return <Star size={16} color={activeTab === tab ? '#000' : '#666'} />;
      case 'territories':
        return <MapPin size={16} color={activeTab === tab ? '#000' : '#666'} />;
      default:
        return <TrendingUp size={16} color="#666" />;
    }
  };

  const getTabTitle = (tab: string): string => {
    switch (tab) {
      case 'level':
        return 'Seviye';
      case 'respect':
        return 'Saygı';
      case 'territories':
        return 'Bölge';
      default:
        return '';
    }
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
            {(['level', 'respect', 'territories'] as const).map(tab => (
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
                  
                  <View style={styles.playerInfo}>
                    <View style={styles.nameContainer}>
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
                      {formatScore(player.score)}
                    </Text>
                    <Text style={styles.lastActive}>{formatLastActive(player.last_active)}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              İlk 100 oyuncu gösteriliyor • Her 30 saniyede bir güncellenir
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}