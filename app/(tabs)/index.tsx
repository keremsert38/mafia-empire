import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  Crown,
  DollarSign,
  Users,
  MapPin,
  Building,
  Zap,
  TrendingUp,
  Clock,
  Target,
  Gift,
  Bell,
  Plus,
  Sword,
  MessageCircle,
  ShoppingCart,
} from 'lucide-react-native';
import { useGameService } from '@/hooks/useGameService';
import CrimeModal from '@/components/CrimeModal';
import LeaderboardModal from '@/components/LeaderboardModal';
import NotificationSystem from '@/components/NotificationSystem';
import ChatModal from '@/components/ChatModal';
import SoldierHiringModal from '@/components/SoldierHiringModal';
import AttackModal from '@/components/AttackModal';
import NotificationsModal from '@/components/NotificationsModal';
import ProfileEditModal from '@/components/ProfileEditModal';
import { useLanguage } from '@/contexts/LanguageContext';

import { router } from 'expo-router';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

export default function HomeScreen() {
  const { gameService, playerStats, businesses, territories, crimes, leaderboard, activeCrimeTimeRemaining, isCommittingCrime } = useGameService();
  const { t } = useLanguage();
  const [crimeModalVisible, setCrimeModalVisible] = useState(false);
  const [leaderboardModalVisible, setLeaderboardModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [soldierModalVisible, setSoldierModalVisible] = useState(false);
  const [attackModalVisible, setAttackModalVisible] = useState(false);

  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [mtConversionModalVisible, setMtConversionModalVisible] = useState(false);
  const [mtConversionAmount, setMtConversionAmount] = useState('1');
  const [mtConversionLoading, setMtConversionLoading] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [accumulatedIncome, setAccumulatedIncome] = useState(0);
  const [lastIncomeUpdate, setLastIncomeUpdate] = useState(Date.now());
  const [totalBusinessIncome, setTotalBusinessIncome] = useState(0);
  const [totalTerritoryIncome, setTotalTerritoryIncome] = useState(0);
  const [totalHourlyIncome, setTotalHourlyIncome] = useState(0);
  const [incomeLoaded, setIncomeLoaded] = useState(false);

  // Uygulama açıldığında biriken geliri Supabase'den yükle
  useEffect(() => {
    const loadAccumulatedIncome = async () => {
      if (incomeLoaded) return;

      try {
        const serverIncome = await gameService.getAccumulatedIncome();
        if (serverIncome.accumulatedAmount > 0) {
          setAccumulatedIncome(serverIncome.accumulatedAmount);
          setTotalBusinessIncome(serverIncome.businessIncome);
          setTotalTerritoryIncome(serverIncome.territoryIncome);
          setTotalHourlyIncome(serverIncome.hourlyRate);
        }
        setIncomeLoaded(true);
      } catch (error) {
        console.error('Error loading accumulated income:', error);
        setIncomeLoaded(true);
      }
    };

    loadAccumulatedIncome();
  }, [gameService, incomeLoaded]);

  // Gerçek zamanlı gelir hesaplama (uygulama açıkken)
  useEffect(() => {
    if (!incomeLoaded) return; // Server income yüklenene kadar bekle

    const interval = setInterval(() => {
      const now = Date.now();
      const timeDiff = (now - lastIncomeUpdate) / 1000; // saniye cinsinden
      // Sadece sahip olunan işletmeleri hesapla
      const ownedBusinesses = businesses.filter(b => b.level > 0);
      const businessIncome = ownedBusinesses.reduce((sum, b) => sum + (b.isBuilding ? 0 : b.currentIncome), 0);
      const territoryIncome = territories.filter(t => t.status === 'owned').reduce((sum, t) => sum + t.income, 0);
      const hourlyIncome = businessIncome + territoryIncome;

      // Update state for display
      setTotalBusinessIncome(businessIncome);
      setTotalTerritoryIncome(territoryIncome);
      setTotalHourlyIncome(hourlyIncome);

      if (hourlyIncome > 0) {
        const incomePerSecond = hourlyIncome / 3600; // saatlik geliri saniyeye çevir
        const newIncome = incomePerSecond * timeDiff;
        setAccumulatedIncome(prev => prev + newIncome);
      }

      setLastIncomeUpdate(now);
    }, 1000); // Her saniye güncelle

    return () => clearInterval(interval);
  }, [businesses, territories, lastIncomeUpdate, incomeLoaded]);

  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      message,
      duration: 3000,
    };
    setNotifications(prev => [...prev, notification]);
  };


  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const hireSoldiers = () => {
    setSoldierModalVisible(true);
  };

  const handleHireSoldiers = async (count: number) => {
    console.log('🔥 HANDLE HIRE SOLDIERS:', count);
    const result = await gameService.hireSoldiers(count);
    console.log('🔥 HIRE RESULT:', result);
    if (result.success) {
      addNotification('success', result.message);
    } else {
      addNotification('error', result.message);
    }
    return result;
  };

  const handlePlayerAttack = async (targetId: string, targetName: string, soldiersToSend: number) => {
    console.log('🔥 HANDLE PLAYER ATTACK:', { targetId, targetName, soldiersToSend });
    const result = await gameService.attackPlayer(targetId, targetName, soldiersToSend);
    console.log('🔥 ATTACK RESULT:', result);

    return result;
  };




  const collectIncome = async () => {
    if (accumulatedIncome > 0) {
      // Server-side gelir toplama (persist için)
      const result = await gameService.collectAccumulatedIncomeFromServer();
      if (result.success) {
        setAccumulatedIncome(0);
        addNotification('success', t.home.incomeCollected.replace('{amount}', `$${result.amount.toLocaleString()}`));
      } else {
        // Fallback: client-side toplama
        const incomeToCollect = Math.floor(accumulatedIncome);
        const fallbackResult = gameService.collectAccumulatedIncome(incomeToCollect);
        if (fallbackResult.success) {
          setAccumulatedIncome(0);
          addNotification('success', t.home.incomeCollected.replace('{amount}', `$${incomeToCollect.toLocaleString()}`));
        } else {
          addNotification('error', fallbackResult.message);
        }
      }
    } else {
      addNotification('info', t.home.noIncomeToCollect);
    }
  };

  const handleCrimeCommit = (crimeId: string) => {
    console.log('🔥 CRIME BUTTON PRESSED! Crime ID:', crimeId);
    const result = gameService.commitCrime(crimeId);
    console.log('🔥 CRIME RESULT:', result);

    if (result.success) {
      addNotification('success', t.home.crimeSuccess.replace('{reward}', `$${result.reward?.toLocaleString() || '0'}`).replace('{xp}', result.xp?.toString() || '0'));
    } else {
      addNotification('error', result.message);
    }

    return result;
  };
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}${t.home.minutesAgo}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}${t.home.hoursAgo}`;
    const days = Math.floor(hours / 24);
    return `${days}${t.home.daysAgo}`;
  };



  return (
    <View style={styles.container}>
      <NotificationSystem
        notifications={notifications}
        onDismiss={dismissNotification}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.playerInfo}
            onPress={() => setProfileModalVisible(true)}
          >
            <Image
              source={{ uri: playerStats.profileImage || 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop' }}
              style={styles.avatar}
            />
            <View style={styles.playerDetails}>
              <Text style={styles.playerName}>{playerStats.name}</Text>
              <View style={styles.rankContainer}>
                <Crown size={16} color="#d4af37" />
                <Text style={styles.playerRank}>{playerStats.rank}</Text>
                <Text style={styles.playerLevel}>{t.home.level} {playerStats.level}</Text>
              </View>
            </View>
          </TouchableOpacity>
          <View style={styles.headerButtons}>
            {/* MT Coins Display - Clickable for conversion */}
            <TouchableOpacity
              style={styles.mtContainer}
              onPress={() => setMtConversionModalVisible(true)}
            >
              <Text style={styles.mtIcon}>💎</Text>
              <Text style={styles.mtText}>{playerStats.mtCoins || 0}</Text>
            </TouchableOpacity>

            {/* Shop button hidden for now
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => router.push('/shop')}
            >
              <ShoppingCart size={20} color="#d4af37" />
            </TouchableOpacity>
            */}

            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => setNotificationsModalVisible(true)}
            >
              <Bell size={20} color="#d4af37" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <DollarSign size={20} color="#66bb6a" />
              <Text style={styles.statValue}>${formatNumber(playerStats.cash)}</Text>
              <Text style={styles.statLabel}>{t.home.money}</Text>
            </View>
            <View style={styles.statCard}>
              <Zap size={20} color="#4ecdc4" />
              <Text style={styles.statValue}>{playerStats.energy}/100</Text>
              <Text style={styles.statLabel}>{t.home.energy}</Text>
            </View>
            <View style={styles.statCard}>
              <Users size={20} color="#4ecdc4" />
              <Text style={styles.statValue}>{playerStats.soldiers}</Text>
              <Text style={styles.statLabel}>{t.home.soldiers}</Text>
            </View>
          </View>
        </View>

        {/* Income Summary */}
        <View style={styles.incomeCard}>
          <View style={styles.incomeHeader}>
            <TrendingUp size={24} color="#d4af37" />
            <Text style={styles.incomeTitle}>{t.home.hourlyIncome}</Text>
          </View>
          <Text style={styles.incomeAmount}>${formatNumber(Math.floor(accumulatedIncome))}</Text>
          <View style={styles.incomeBreakdown}>
            <Text style={styles.incomeDetail}>
              {t.home.businesses}: ${formatNumber(totalBusinessIncome)}
            </Text>
            <Text style={styles.incomeDetail}>
              {t.home.territories}: ${formatNumber(totalTerritoryIncome)}
            </Text>
            <Text style={styles.incomeDetail}>
              {t.home.hourly}: ${formatNumber(totalHourlyIncome)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.collectButton, accumulatedIncome < 1 && styles.collectButtonDisabled]}
            onPress={collectIncome}
            disabled={accumulatedIncome < 1}
          >
            <Gift size={16} color="#fff" />
            <Text style={styles.collectButtonText}>
              {accumulatedIncome >= 1 ? t.home.collectIncome : t.home.waitingForAccumulation}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>{t.home.quickActions}</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                if (isCommittingCrime) {
                  addNotification('info', `${t.home.committingCrime} ${activeCrimeTimeRemaining} ${t.home.secondsRemaining}`);
                  return;
                }
                console.log('🚨 CRIME MODAL BUTTON PRESSED!');
                setCrimeModalVisible(true);
              }}
            >
              <Target size={24} color={isCommittingCrime ? "#666" : "#ff6b6b"} />
              <Text style={[styles.actionText, isCommittingCrime && { color: '#666' }]}>
                {isCommittingCrime ? `${t.home.committingCrime} (${activeCrimeTimeRemaining}s)` : t.home.commitCrime}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={hireSoldiers}
            >
              <Users size={24} color="#4ecdc4" />
              <Text style={styles.actionText}>{t.home.hireSoldiers}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                console.log('🏆 LEADERBOARD BUTTON PRESSED');
                setLeaderboardModalVisible(true);
              }}
            >
              <Crown size={24} color="#d4af37" />
              <Text style={styles.actionText}>{t.home.leaderboard}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setChatModalVisible(true)}
            >
              <MessageCircle size={24} color="#66bb6a" />
              <Text style={styles.actionText}>{t.home.generalChat}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setAttackModalVisible(true)}
            >
              <Sword size={24} color="#ff6b6b" />
              <Text style={styles.actionText}>{t.home.attack}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Empire Overview */}
        <View style={styles.empireOverview}>
          <Text style={styles.sectionTitle}>{t.home.empireStatus}</Text>

          <View style={styles.overviewCard}>
            <View style={styles.overviewHeader}>
              <Building size={20} color="#66bb6a" />
              <Text style={styles.overviewTitle}>{t.home.businesses}</Text>
            </View>
            <Text style={styles.overviewValue}>{businesses.filter(b => b.level > 0).length} {t.home.active}</Text>
            <Text style={styles.overviewDetail}>
              {businesses.filter(b => b.isBuilding).length} {t.home.underConstruction}
            </Text>
          </View>

          <View style={styles.overviewCard}>
            <View style={styles.overviewHeader}>
              <MapPin size={20} color="#ffa726" />
              <Text style={styles.overviewTitle}>{t.home.territories}</Text>
            </View>
            <Text style={styles.overviewValue}>
              {territories.filter(t => t.status === 'owned').length} {t.home.controlled}
            </Text>
            <Text style={styles.overviewDetail}>
              {territories.filter(t => t.status === 'enemy').length} {t.home.enemyTerritory}
            </Text>
          </View>

          <View style={styles.overviewCard}>
            <View style={styles.overviewHeader}>
              <Users size={20} color="#ab47bc" />
              <Text style={styles.overviewTitle}>{t.home.family}</Text>
            </View>
            <Text style={styles.overviewValue}>{playerStats.caporegimes.length} {t.home.caporegimes}</Text>
            <Text style={styles.overviewDetail}>
              {playerStats.caporegimes.reduce((sum, cap) => sum + cap.soldiers, 0)} {t.home.totalSoldiers}
            </Text>
          </View>
        </View>
      </ScrollView>

      <CrimeModal
        visible={crimeModalVisible}
        onClose={() => setCrimeModalVisible(false)}
        crimes={crimes}
        playerLevel={playerStats.level}
        activeCrimeTimeRemaining={activeCrimeTimeRemaining}
        isCommittingCrime={isCommittingCrime}
        onCommitCrime={handleCrimeCommit}
      />

      <LeaderboardModal
        visible={leaderboardModalVisible}
        onClose={() => setLeaderboardModalVisible(false)}
      />

      <ChatModal
        visible={chatModalVisible}
        onClose={() => setChatModalVisible(false)}
      />

      <SoldierHiringModal
        visible={soldierModalVisible}
        onClose={() => setSoldierModalVisible(false)}
        playerStats={playerStats}
        onOrderSoldiers={async (count) => await gameService.orderSoldiers(count)}
        onCheckProduction={async () => await gameService.checkSoldierProduction()}
        onGetProductionStatus={async () => await gameService.getSoldierProductionStatus()}
      />

      <AttackModal
        visible={attackModalVisible}
        onClose={() => setAttackModalVisible(false)}
        playerSoldiers={playerStats.soldiers}
        onAttack={handlePlayerAttack}
      />
      <NotificationsModal
        visible={notificationsModalVisible}
        onClose={() => setNotificationsModalVisible(false)}
      />

      <ProfileEditModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        username={playerStats.name}
        currentPhotoUrl={playerStats.profileImage}
        onPhotoSelected={async (uri) => {
          const result = await gameService.uploadProfilePhoto(uri);
          if (result.success) {
            addNotification('success', result.message);
          } else {
            addNotification('error', result.message);
          }
        }}
      />

      {/* MT Coin Conversion Modal */}
      <Modal visible={mtConversionModalVisible} transparent animationType="fade">
        <View style={styles.mtModalOverlay}>
          <View style={styles.mtModal}>
            <View style={styles.mtModalHeader}>
              <Text style={styles.mtModalTitle}>💎 Para → MT Coin</Text>
              <TouchableOpacity onPress={() => setMtConversionModalVisible(false)}>
                <Text style={styles.mtCloseBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mtModalContent}>
              <Text style={styles.mtInfoText}>$100.000 = 1 MT Coin</Text>

              <View style={styles.mtBalanceRow}>
                <Text style={styles.mtBalanceLabel}>Mevcut Para:</Text>
                <Text style={styles.mtBalanceValue}>${formatNumber(playerStats.cash)}</Text>
              </View>
              <View style={styles.mtBalanceRow}>
                <Text style={styles.mtBalanceLabel}>Mevcut MT:</Text>
                <Text style={styles.mtBalanceValueMT}>💎 {playerStats.mtCoins || 0}</Text>
              </View>
              <View style={styles.mtBalanceRow}>
                <Text style={styles.mtBalanceLabel}>Maks. Dönüştürme:</Text>
                <Text style={styles.mtBalanceValue}>{Math.floor(playerStats.cash / 100000)} MT</Text>
              </View>

              <Text style={styles.mtInputLabel}>Kaç MT istiyorsunuz?</Text>
              <TextInput
                style={styles.mtInput}
                value={mtConversionAmount}
                onChangeText={setMtConversionAmount}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor="#666"
              />

              <View style={styles.mtPresetRow}>
                {[1, 5, 10, 25].map(amount => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.mtPresetBtn,
                      parseInt(mtConversionAmount) === amount && styles.mtPresetBtnActive
                    ]}
                    onPress={() => setMtConversionAmount(amount.toString())}
                    disabled={playerStats.cash < amount * 100000}
                  >
                    <Text style={[
                      styles.mtPresetText,
                      parseInt(mtConversionAmount) === amount && styles.mtPresetTextActive,
                      playerStats.cash < amount * 100000 && styles.mtPresetTextDisabled
                    ]}>
                      {amount} MT
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.mtCostRow}>
                <Text style={styles.mtCostLabel}>Ödenecek:</Text>
                <Text style={[
                  styles.mtCostValue,
                  playerStats.cash < parseInt(mtConversionAmount || '0') * 100000 && { color: '#ff6b6b' }
                ]}>
                  ${(parseInt(mtConversionAmount || '0') * 100000).toLocaleString()}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.mtConvertBtn,
                  (mtConversionLoading || playerStats.cash < parseInt(mtConversionAmount || '0') * 100000 || parseInt(mtConversionAmount || '0') < 1) && styles.mtConvertBtnDisabled
                ]}
                disabled={mtConversionLoading || playerStats.cash < parseInt(mtConversionAmount || '0') * 100000 || parseInt(mtConversionAmount || '0') < 1}
                onPress={async () => {
                  const amount = parseInt(mtConversionAmount || '0');
                  if (amount < 1) {
                    Alert.alert('Hata', 'En az 1 MT dönüştürmelisiniz!');
                    return;
                  }
                  setMtConversionLoading(true);
                  const result = await gameService.convertCashToMT(amount);
                  setMtConversionLoading(false);
                  if (result.success) {
                    addNotification('success', result.message);
                    setMtConversionModalVisible(false);
                    setMtConversionAmount('1');
                  } else {
                    Alert.alert('Hata', result.message);
                  }
                }}
              >
                {mtConversionLoading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.mtConvertBtnText}>💎 Dönüştür</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 2,
    borderBottomColor: '#d4af37',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  playerDetails: {
    marginLeft: 12,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerRank: {
    fontSize: 14,
    color: '#d4af37',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  playerLevel: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerButtonText: {
    color: '#d4af37',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  shopButton: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 20,
    marginRight: 10,
  },
  mtContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1a4a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
  },
  mtIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  mtText: {
    color: '#a855f7',
    fontSize: 13,
    fontWeight: 'bold',
  },
  notificationButton: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 20,
  },
  statsContainer: {
    padding: 15,
    backgroundColor: '#000000',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#333',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
  },
  incomeCard: {
    backgroundColor: '#1a1a1a',
    margin: 15,
    borderRadius: 15,
    padding: 20,
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  incomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  incomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    marginLeft: 8,
  },
  incomeAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#66bb6a',
    textAlign: 'center',
    marginBottom: 10,
  },
  incomeBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  incomeDetail: {
    fontSize: 12,
    color: '#999',
  },
  collectButton: {
    backgroundColor: '#d4af37',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
  },
  collectButtonText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  collectButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  quickActions: {
    padding: 15,
    backgroundColor: '#000000',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 15,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  actionText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 12,
    fontWeight: 'bold',
  },
  empireOverview: {
    padding: 15,
    backgroundColor: '#000000',
  },
  overviewCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  overviewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 4,
  },
  overviewDetail: {
    fontSize: 12,
    color: '#999',
  },
  statusBars: {
    padding: 15,
  },
  statusBar: {
    marginBottom: 15,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  statusValue: {
    fontSize: 12,
    color: '#999',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  recentActivity: {
    padding: 15,
    paddingBottom: 30,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  activityText: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
    marginLeft: 10,
  },
  activityTime: {
    color: '#999',
    fontSize: 11,
  },
  // MT Conversion Modal Styles
  mtModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mtModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    width: '90%',
    borderWidth: 2,
    borderColor: '#a855f7',
  },
  mtModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  mtModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#a855f7',
  },
  mtCloseBtn: {
    color: '#999',
    fontSize: 24,
    padding: 5,
  },
  mtModalContent: {
    padding: 20,
  },
  mtInfoText: {
    color: '#a855f7',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    backgroundColor: '#2a1a4a',
    padding: 10,
    borderRadius: 10,
  },
  mtBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mtBalanceLabel: {
    color: '#999',
    fontSize: 14,
  },
  mtBalanceValue: {
    color: '#66bb6a',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mtBalanceValueMT: {
    color: '#a855f7',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mtInputLabel: {
    color: '#fff',
    fontSize: 14,
    marginTop: 15,
    marginBottom: 8,
  },
  mtInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  mtPresetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 15,
  },
  mtPresetBtn: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  mtPresetBtnActive: {
    backgroundColor: '#a855f7',
    borderColor: '#a855f7',
  },
  mtPresetText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mtPresetTextActive: {
    color: '#000',
  },
  mtPresetTextDisabled: {
    color: '#666',
  },
  mtCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  mtCostLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mtCostValue: {
    color: '#66bb6a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mtConvertBtn: {
    backgroundColor: '#a855f7',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  mtConvertBtnDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  mtConvertBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});