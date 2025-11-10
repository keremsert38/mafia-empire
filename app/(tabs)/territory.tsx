import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  MapPin,
  Shield,
  Sword,
  DollarSign,
  Users,
  Clock,
  Target,
  TrendingUp,
} from 'lucide-react-native';
import { useGameService } from '@/hooks/useGameService';
import { useLanguage } from '@/contexts/LanguageContext';
import TerritoryAttackModal from '@/components/TerritoryAttackModal';
import TerritoryReinforceModal from '@/components/TerritoryReinforceModal';

export default function TerritoryScreen() {
  const { gameService, playerStats, territories, attackRegion, claimIncome } = useGameService();
  const { t } = useLanguage();
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null);
  const [attackModalVisible, setAttackModalVisible] = useState(false);
  const [reinforceModalVisible, setReinforceModalVisible] = useState(false);


  const attackTerritory = (territoryId: string) => {
    const territory = territories.find(t => t.id === territoryId);
    if (!territory) return;

    if (territory.status === 'owned') {
      Alert.alert(t.common.error, t.territory.cannotAttackOwn);
      return;
    }

    if (territory.status === 'attacking') {
      Alert.alert(t.common.error, t.territory.attackInProgressError);
      return;
    }

    setSelectedTerritory(territoryId);
    setAttackModalVisible(true);
  };

  const handleAttack = async (soldiersToSend: number) => {
    if (!selectedTerritory) return;
    const result = await attackRegion(selectedTerritory, soldiersToSend);
    Alert.alert(result.success ? 'Başarılı' : 'Saldırı Başarısız', result.message);
  };

  const reinforceTerritory = (territoryId: string) => {
    const territory = territories.find(t => t.id === territoryId);
    if (!territory) return;

    if (territory.status !== 'owned') {
      Alert.alert('Hata', 'Sadece kendi bölgelerinize asker yerleştirebilirsiniz!');
      return;
    }

    setSelectedTerritory(territoryId);
    setReinforceModalVisible(true);
  };

  const handleReinforce = async (soldiersToSend: number) => {
    if (!selectedTerritory) return;
    const result = await gameService.reinforceTerritory(selectedTerritory, soldiersToSend);
    Alert.alert(result.success ? 'Başarılı' : 'Hata', result.message);
  };

  const handleClaimIncome = async () => {
    const res = await claimIncome();
    Alert.alert(res.success ? 'Gelir Alındı' : 'Hata', res.message);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'owned':
        return '#66bb6a';
      case 'enemy':
        return '#ff6b6b';
      case 'neutral':
        return '#ffa726';
      case 'attacking':
        return '#ab47bc';
      default:
        return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'owned':
        return 'Kontrolünüzde';
      case 'enemy':
        return 'Düşman Kontrolü';
      case 'neutral':
        return 'Boş Bölge';
      case 'attacking':
        return 'Saldırı Devam Ediyor';
      default:
        return 'Bilinmiyor';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const ownedTerritories = territories.filter(t => t.status === 'owned');
  const totalIncome = ownedTerritories.reduce((sum, t) => sum + t.income, 0);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bölge Kontrolü</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <MapPin size={20} color="#d4af37" />
            <Text style={styles.statText}>Bölge: {ownedTerritories.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Users size={20} color="#4ecdc4" />
            <Text style={styles.statText}>Soldato: {playerStats.soldiers}</Text>
          </View>
          <View style={styles.statCard}>
            <DollarSign size={20} color="#66bb6a" />
            <Text style={styles.statText}>Gelir: ${totalIncome.toLocaleString()}/h</Text>
          </View>
        </View>
      </View>

      <View style={styles.territoriesContainer}>
        {territories.map(territory => (
          <View key={territory.id} style={styles.territoryCard}>
            <View style={styles.territoryHeader}>
              <View style={styles.territoryInfo}>
                <Text style={styles.territoryName}>{territory.name}</Text>
                <Text
                  style={[
                    styles.territoryStatus,
                    { color: getStatusColor(territory.status) },
                  ]}
                >
                  {getStatusText(territory.status)}
                </Text>
                <Text style={styles.territoryOwner}>
                  Sahip: {territory.owner}
                </Text>
              </View>
              <View style={styles.territoryStats}>
                <View style={styles.statRow}>
                  <DollarSign size={16} color="#d4af37" />
                  <Text style={styles.statValue}>
                    ${territory.income.toLocaleString()}/saat
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Shield size={16} color="#4ecdc4" />
                  <Text style={styles.statValue}>{territory.defense}</Text>
                </View>
                <View style={styles.statRow}>
                  <Users size={16} color="#ff6b6b" />
                  <Text style={styles.statValue}>{territory.soldiers} soldato</Text>
                </View>
              </View>
            </View>


            {territory.status === 'attacking' && territory.attackTime && (
              <View style={styles.attackProgress}>
                <View style={styles.progressHeader}>
                  <Clock size={16} color="#ab47bc" />
                  <Text style={styles.attackTime}>
                    Saldırı Süresi: {formatTime(territory.attackTime)}
                  </Text>
                </View>
                {territory.attackProgress !== undefined && (
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[
                        styles.progressBar, 
                        { width: `${territory.attackProgress}%` }
                      ]} 
                    />
                  </View>
                )}
              </View>
            )}

            <View style={styles.actionButtons}>
              {territory.status === 'owned' ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.reinforceButton]}
                  onPress={() => reinforceTerritory(territory.id)}
                >
                  <Shield size={16} color="#fff" />
                  <Text style={styles.buttonText}>
                    Asker Yerleştir
                  </Text>
                </TouchableOpacity>
              ) : territory.status !== 'attacking' ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.attackButton]}
                  onPress={() => attackTerritory(territory.id)}
                >
                  <Sword size={16} color="#fff" />
                  <Text style={styles.buttonText}>
                    Saldır
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.actionButton, styles.disabledButton]}>
                  <Target size={16} color="#999" />
                  <Text style={[styles.buttonText, { color: '#999' }]}>
                    Saldırı Devam Ediyor
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Bölge İstatistikleri */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Bölge Özeti</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{ownedTerritories.length}</Text>
            <Text style={styles.summaryLabel}>Kontrol Edilen Bölge</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {playerStats.soldiers}
            </Text>
            <Text style={styles.summaryLabel}>Toplam Soldato</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {Math.round(ownedTerritories.reduce((sum, t) => sum + t.defense, 0) / ownedTerritories.length) || 0}
            </Text>
            <Text style={styles.summaryLabel}>Ortalama Savunma</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>${totalIncome.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Saatlik Gelir</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.actionButton, styles.reinforceButton, { marginTop: 10 }]} onPress={handleClaimIncome}>
          <TrendingUp size={16} color="#fff" />
          <Text style={styles.buttonText}>Geliri Talep Et</Text>
        </TouchableOpacity>
      </View>

      {selectedTerritory && territories.find(t => t.id === selectedTerritory)?.status === 'owned' && (
        <TerritoryReinforceModal
          visible={reinforceModalVisible}
          onClose={() => {
            setReinforceModalVisible(false);
            setSelectedTerritory(null);
          }}
          territory={territories.find(t => t.id === selectedTerritory)!}
          playerStats={playerStats}
          onReinforce={handleReinforce}
        />
      )}

      {selectedTerritory && territories.find(t => t.id === selectedTerritory)?.status !== 'owned' && (
        <TerritoryAttackModal
          visible={attackModalVisible}
          onClose={() => {
            setAttackModalVisible(false);
            setSelectedTerritory(null);
          }}
          territory={territories.find(t => t.id === selectedTerritory)!}
          playerStats={playerStats}
          onAttack={handleAttack}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    backgroundColor: '#000000',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 2,
    borderBottomColor: '#d4af37',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: 'bold',
    fontSize: 12,
  },
  territoriesContainer: {
    padding: 15,
    backgroundColor: '#000000',
  },
  territoryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  territoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  territoryInfo: {
    flex: 1,
  },
  territoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  territoryStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  territoryOwner: {
    fontSize: 12,
    color: '#999',
  },
  territoryStats: {
    alignItems: 'flex-end',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  statValue: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 12,
  },
  assignedCaporegime: {
    backgroundColor: '#2a3a2a',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  assignedText: {
    color: '#66bb6a',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  attackProgress: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  attackTime: {
    color: '#ab47bc',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ab47bc',
    borderRadius: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  ownedActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
  },
  attackButton: {
    backgroundColor: '#ff6b6b',
  },
  assignButton: {
    backgroundColor: '#66bb6a',
  },
  reinforceButton: {
    backgroundColor: '#4ecdc4',
  },
  disabledButton: {
    backgroundColor: '#333',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 12,
  },
  summarySection: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    margin: 15,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 15,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});