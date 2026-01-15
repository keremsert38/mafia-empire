import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
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
  Globe,
  X,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from 'lucide-react-native';
import { useGameService } from '@/hooks/useGameService';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTutorial } from '@/contexts/TutorialContext';
import TerritoryAttackModal from '@/components/TerritoryAttackModal';
import TerritoryReinforceModal from '@/components/TerritoryReinforceModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Ülke tanımları
const COUNTRIES = [
  { id: 'turkey', name: 'Türkiye', flag: '🇹🇷', color: '#00bcd4' },
  { id: 'italy', name: 'İtalya', flag: '🇮🇹', color: '#ffd700' },
  { id: 'usa', name: 'ABD', flag: '🇺🇸', color: '#ff4444' },
  { id: 'russia', name: 'Rusya', flag: '🇷🇺', color: '#9c27b0' },
];

export default function TerritoryScreen() {
  const { gameService, playerStats, territories, attackRegion, claimIncome, withdrawSoldiers } = useGameService();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { checkStepCompletion, currentStep } = useTutorial();
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null);
  const [attackModalVisible, setAttackModalVisible] = useState(false);
  const [reinforceModalVisible, setReinforceModalVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [mapScale, setMapScale] = useState(1.4);

  // Seçili ülkeye ait şehirleri filtrele
  const filteredTerritories = useMemo(() => {
    if (!selectedCountry) return [];
    return territories.filter(t => t.countryId === selectedCountry);
  }, [territories, selectedCountry]);

  // Tutorial: Eğer zaten bölgesi varsa bölge adımını tamamla
  React.useEffect(() => {
    const ownedCount = territories.filter(t => t.status === 'owned').length;
    if (currentStep === 3 && ownedCount > 0) {
      checkStepCompletion('region');
    }
  }, [currentStep, territories]);

  const handleCountryPress = (countryId: string) => {
    setSelectedCountry(countryId);
    setCityModalVisible(true);
  };

  const handleZoomIn = () => {
    setMapScale(prev => Math.min(prev + 0.3, 2.5));
  };

  const handleZoomOut = () => {
    setMapScale(prev => Math.max(prev - 0.3, 1.4));
  };

  const attackTerritory = (territoryId: string) => {
    const territory = territories.find(t => t.id === territoryId);
    if (!territory) return;

    if (territory.status === 'owned') {
      Alert.alert('Hata', 'Kendi bölgenize saldıramazsınız!');
      return;
    }

    if (territory.status === 'attacking') {
      Alert.alert('Hata', 'Saldırı zaten devam ediyor!');
      return;
    }

    setSelectedTerritory(territoryId);
    setAttackModalVisible(true);
  };

  const handleAttack = async (soldiersToSend: number) => {
    if (!selectedTerritory) return;
    const result = await attackRegion(selectedTerritory, soldiersToSend);
    if (result.success) {
      // Tutorial: Bölge fethet adımı tamamlandı
      checkStepCompletion('region');
    }
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

  const handleWithdraw = async (amount: number) => {
    if (!selectedTerritory) return;
    const result = await withdrawSoldiers(selectedTerritory, amount);
    Alert.alert(result.success ? 'Başarılı' : 'Hata', result.message);
  };

  const handleClaimIncome = async () => {
    const res = await claimIncome();
    Alert.alert(res.success ? 'Gelir Alındı' : 'Hata', res.message);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'owned': return '#66bb6a';
      case 'enemy': return '#ff6b6b';
      case 'neutral': return '#ffa726';
      case 'attacking': return '#ab47bc';
      default: return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'owned': return 'Kontrolünüzde';
      case 'enemy': return 'Düşman';
      case 'neutral': return 'Boş';
      case 'attacking': return 'Saldırı...';
      default: return '?';
    }
  };

  const ownedTerritories = territories.filter(t => t.status === 'owned');
  const totalIncome = ownedTerritories.reduce((sum, t) => sum + t.income, 0);

  const getOwnedCountInCountry = (countryId: string) => {
    return territories.filter(t => t.countryId === countryId && t.status === 'owned').length;
  };

  const getTotalCountInCountry = (countryId: string) => {
    return territories.filter(t => t.countryId === countryId).length;
  };

  const selectedCountryData = COUNTRIES.find(c => c.id === selectedCountry);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Globe size={20} color="#d4af37" />
          <Text style={styles.title}>Harita</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <MapPin size={14} color="#d4af37" />
            <Text style={styles.statText}>{ownedTerritories.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Users size={14} color="#4ecdc4" />
            <Text style={styles.statText}>{playerStats.soldiers}</Text>
          </View>
          <View style={styles.statCard}>
            <DollarSign size={14} color="#66bb6a" />
            <Text style={styles.statText}>${totalIncome}/h</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        {/* Harita Bölümü */}
        <View style={styles.mapSection}>
          {/* Zoom Kontrolleri */}
          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn}>
              <ZoomIn size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut}>
              <ZoomOut size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Harita Container */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mapScrollContent}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.mapScrollContent}
            >
              <View style={[styles.mapWrapper, { transform: [{ scale: mapScale }] }]}>
                <View style={styles.mapImage} />
              </View>
            </ScrollView>
          </ScrollView>

          {/* Harita Alt Bilgi */}
          <View style={styles.mapInfo}>
            <Text style={styles.mapInfoText}>Zoom: {Math.round(mapScale * 100)}%</Text>
          </View>
        </View>

        {/* Ülke Kartları */}
        <View style={styles.countriesSection}>
          <Text style={styles.sectionTitle}>Ülkeler</Text>

          {COUNTRIES.map(country => {
            const ownedCount = getOwnedCountInCountry(country.id);
            const totalCount = getTotalCountInCountry(country.id);
            const progress = totalCount > 0 ? (ownedCount / totalCount) * 100 : 0;

            return (
              <TouchableOpacity
                key={country.id}
                style={styles.countryCard}
                onPress={() => handleCountryPress(country.id)}
                activeOpacity={0.7}
              >
                <View style={styles.countryLeft}>
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <View style={styles.countryInfo}>
                    <Text style={styles.countryName}>{country.name}</Text>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${progress}%`, backgroundColor: country.color }
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>{ownedCount}/{totalCount}</Text>
                    </View>
                  </View>
                </View>
                <ChevronRight size={20} color="#666" />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Şehirler Modal */}
      <Modal
        visible={cityModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cityModal}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedCountryData?.flag} {selectedCountryData?.name}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setCityModalVisible(false)}
              >
                <X size={22} color="#999" />
              </TouchableOpacity>
            </View>

            {/* City Stats */}
            <View style={styles.cityStats}>
              <View style={styles.cityStat}>
                <Text style={styles.cityStatNumber}>
                  {filteredTerritories.filter(t => t.status === 'owned').length}
                </Text>
                <Text style={styles.cityStatLabel}>Kontrol</Text>
              </View>
              <View style={styles.cityStat}>
                <Text style={styles.cityStatNumber}>{filteredTerritories.length}</Text>
                <Text style={styles.cityStatLabel}>Toplam</Text>
              </View>
              <View style={styles.cityStat}>
                <Text style={styles.cityStatNumber}>
                  ${filteredTerritories.filter(t => t.status === 'owned')
                    .reduce((sum, t) => sum + t.income, 0)}
                </Text>
                <Text style={styles.cityStatLabel}>Gelir/h</Text>
              </View>
            </View>

            {/* City List */}
            <ScrollView style={styles.cityList}>
              {filteredTerritories.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    Şehir bulunamadı.{'\n'}
                    Migration'ı Supabase'e uygulayın.
                  </Text>
                </View>
              ) : (
                filteredTerritories.map(territory => (
                  <View key={territory.id} style={styles.cityCard}>
                    <View style={styles.cityHeader}>
                      <View style={styles.cityInfo}>
                        <Text style={styles.cityName}>{territory.name}</Text>
                        <Text style={[styles.cityStatus, { color: getStatusColor(territory.status) }]}>
                          {getStatusText(territory.status)} {territory.ownerName ? `• ${territory.ownerName}` : ''}
                        </Text>
                      </View>
                      <View style={styles.cityData}>
                        <Text style={styles.cityIncome}>${territory.income}/h</Text>
                        <Text style={styles.citySoldiers}>{territory.soldiers} 🛡️</Text>
                      </View>
                    </View>

                    <View style={styles.cityActions}>
                      {territory.status === 'owned' ? (
                        <TouchableOpacity
                          style={[styles.cityButton, styles.reinforceBtn]}
                          onPress={() => {
                            setCityModalVisible(false);
                            reinforceTerritory(territory.id);
                          }}
                        >
                          <Shield size={14} color="#fff" />
                          <Text style={styles.cityButtonText}>Güçlendir</Text>
                        </TouchableOpacity>
                      ) : territory.status !== 'attacking' ? (
                        <TouchableOpacity
                          style={[styles.cityButton, styles.attackBtn]}
                          onPress={() => {
                            setCityModalVisible(false);
                            attackTerritory(territory.id);
                          }}
                        >
                          <Sword size={14} color="#fff" />
                          <Text style={styles.cityButtonText}>Saldır</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.cityButton, styles.disabledBtn]}>
                          <Target size={14} color="#666" />
                          <Text style={[styles.cityButtonText, { color: '#666' }]}>Bekle...</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Attack/Reinforce Modals */}
      {selectedTerritory &&
        territories.find(t => t.id === selectedTerritory)?.status === 'owned' && (
          <TerritoryReinforceModal
            visible={reinforceModalVisible}
            onClose={() => {
              setReinforceModalVisible(false);
              setSelectedTerritory(null);
            }}
            territory={territories.find(t => t.id === selectedTerritory)!}
            playerStats={playerStats}
            onReinforce={handleReinforce}
            onWithdraw={handleWithdraw}
          />
        )}

      {selectedTerritory &&
        territories.find(t => t.id === selectedTerritory)?.status !== 'owned' && (
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingTop: 48,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d4af37',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  statText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 11,
  },
  mainContent: {
    flex: 1,
  },
  mapSection: {
    height: 220,
    margin: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#d4af37',
    backgroundColor: '#0a0a0a',
  },
  zoomControls: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    flexDirection: 'row',
    gap: 6,
  },
  zoomBtn: {
    backgroundColor: 'rgba(212, 175, 55, 0.9)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapWrapper: {
    width: SCREEN_WIDTH - 28,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  mapInfo: {
    position: 'absolute',
    bottom: 6,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mapInfoText: {
    color: '#888',
    fontSize: 10,
  },
  countriesSection: {
    paddingHorizontal: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#d4af37',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  countryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  countryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 10,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 5,
    backgroundColor: '#333',
    borderRadius: 2.5,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  progressText: {
    color: '#888',
    fontSize: 11,
  },
  claimButton: {
    backgroundColor: '#66bb6a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 12,
    marginTop: 12,
    gap: 8,
  },
  claimButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  cityModal: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    paddingTop: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  closeButton: {
    padding: 4,
  },
  cityStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#0a0a0a',
  },
  cityStat: {
    alignItems: 'center',
  },
  cityStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  cityStatLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  cityList: {
    flex: 1,
    padding: 12,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
  },
  cityCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  cityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  cityStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  cityData: {
    alignItems: 'flex-end',
  },
  cityIncome: {
    color: '#d4af37',
    fontWeight: 'bold',
    fontSize: 13,
  },
  citySoldiers: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  cityActions: {
    flexDirection: 'row',
  },
  cityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  attackBtn: {
    backgroundColor: '#ff6b6b',
  },
  reinforceBtn: {
    backgroundColor: '#4ecdc4',
  },
  disabledBtn: {
    backgroundColor: '#333',
  },
  cityButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});