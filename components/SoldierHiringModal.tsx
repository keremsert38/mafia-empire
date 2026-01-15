import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { PlayerStats } from '@/types/game';
import { Users, Sword, Shield, Target } from 'lucide-react-native';

interface SoldierHiringModalProps {
  visible: boolean;
  onClose: () => void;
  playerStats: PlayerStats;
  onOrderSoldiers: (count: number) => Promise<{ success: boolean; message: string }>;
  onCheckProduction: () => Promise<{
    soldiersAdded: number;
    soldiersPending: number;
    secondsRemaining: number;
    message: string;
  }>;
  onGetProductionStatus: () => Promise<{
    soldiersInProduction: number;
    soldiersCompleted: number;
    secondsUntilNext: number;
    productionStartTime: Date | null;
  }>;
  onInstantFinish: () => Promise<{ success: boolean; message: string; soldiersAdded: number; cost: number }>;
}

export default function SoldierHiringModal({
  visible,
  onClose,
  playerStats,
  onOrderSoldiers,
  onCheckProduction,
  onGetProductionStatus,
  onInstantFinish
}: SoldierHiringModalProps) {
  const [activeTab, setActiveTab] = useState<'hire' | 'power'>('hire');
  const [selectedCount, setSelectedCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [productionStatus, setProductionStatus] = useState({
    soldiersInProduction: 0,
    secondsUntilNext: 0,
  });
  const [timeDisplay, setTimeDisplay] = useState('');

  // Fiyat hesapla
  const getSoldierCost = (count: number) => {
    const baseCost = 100;
    const levelMultiplier = 1 + (playerStats.level * 0.1);
    return Math.floor(baseCost * count * levelMultiplier);
  };

  // Level sınırı kaldırıldı - para yettiği kadar sipariş verilebilir
  const maxAffordable = Math.floor(playerStats.cash / getSoldierCost(1));
  const maxCanOrder = Math.min(maxAffordable, 500); // Max 500 tek seferde

  // Power Calculations - Envanterdeki silahları dahil et
  const getPowerStats = () => {
    const soldiers = playerStats.soldiers;
    const basePowerPerSoldier = 5;
    const baseTotal = soldiers * basePowerPerSoldier;

    // Envanterdeki silahlar
    const barettaCount = (playerStats as any).baretta || 0;
    const ak47Count = (playerStats as any).ak47 || 0;

    // Silah güçleri
    const barettaPower = barettaCount * 3;  // Her Baretta 3 güç
    const ak47Power = ak47Count * 10;        // Her AK-47 10 güç
    const totalWeaponPower = barettaPower + ak47Power;

    return {
      soldiers,
      barettaCount,
      ak47Count,
      barettaPower,
      ak47Power,
      baseTotal,
      totalWeaponPower,
      totalPower: baseTotal + totalWeaponPower
    };
  };

  const powerStats = getPowerStats();

  // Üretim durumunu yükle
  const loadProductionStatus = useCallback(async () => {
    try {
      await onCheckProduction();
      const status = await onGetProductionStatus();
      setProductionStatus({
        soldiersInProduction: status.soldiersInProduction,
        secondsUntilNext: status.secondsUntilNext,
      });
    } catch (error) {
      console.error('Error loading production status:', error);
    }
  }, [onCheckProduction, onGetProductionStatus]);

  useEffect(() => {
    if (!visible) return;
    loadProductionStatus();
    const interval = setInterval(() => {
      setProductionStatus(prev => {
        if (prev.secondsUntilNext <= 1 && prev.soldiersInProduction > 0) {
          loadProductionStatus();
          return prev;
        }
        return {
          ...prev,
          secondsUntilNext: Math.max(0, prev.secondsUntilNext - 1),
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, loadProductionStatus]);

  useEffect(() => {
    if (productionStatus.soldiersInProduction > 0) {
      const totalSeconds = productionStatus.secondsUntilNext + (productionStatus.soldiersInProduction - 1) * 100;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setTimeDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    } else {
      setTimeDisplay('');
    }
  }, [productionStatus]);

  const handleOrder = async () => {
    if (selectedCount <= 0 || playerStats.cash < getSoldierCost(selectedCount)) return;

    Alert.alert(
      'Sipariş Onayı',
      `${selectedCount} soldato sipariş edilsin mi? ($${getSoldierCost(selectedCount).toLocaleString()})`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sipariş Ver',
          onPress: async () => {
            setLoading(true);
            const result = await onOrderSoldiers(selectedCount);
            setLoading(false);
            if (result.success) {
              Alert.alert('Başarılı', result.message);
              loadProductionStatus();
              setSelectedCount(1);
            } else {
              Alert.alert('Hata', result.message);
            }
          }
        }
      ]
    );
  };

  const presetCounts = [1, 10, 25, 50, 100, 200].filter(count => count <= maxCanOrder);

  const handleInstantFinish = async () => {
    const cost = productionStatus.soldiersInProduction;
    if ((playerStats.mtCoins || 0) < cost) {
      Alert.alert('Yetersiz Elmas', `Bu işlem için ${cost} Elmas gerekli.`);
      return;
    }

    Alert.alert(
      'Hemen Bitir',
      `${productionStatus.soldiersInProduction} askerin eğitimini ${cost} Elmas karşılığında hemen bitirmek istiyor musun?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Bitir (-' + cost + ' 💎)',
          onPress: async () => {
            setFinishing(true);
            const result = await onInstantFinish();
            setFinishing(false);
            if (result.success) {
              Alert.alert('Başarılı', result.message);
              loadProductionStatus();
            } else {
              Alert.alert('Hata', result.message);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Ordu Yönetimi</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'hire' && styles.activeTab]}
              onPress={() => setActiveTab('hire')}
            >
              <Users size={16} color={activeTab === 'hire' ? '#000' : '#666'} />
              <Text style={[styles.tabText, activeTab === 'hire' && styles.activeTabText]}>Soldato Al</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'power' && styles.activeTab]}
              onPress={() => setActiveTab('power')}
            >
              <Sword size={16} color={activeTab === 'power' ? '#000' : '#666'} />
              <Text style={[styles.tabText, activeTab === 'power' && styles.activeTabText]}>Ordu Gücü</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {activeTab === 'hire' ? (
              <>
                {/* Production Status */}
                {productionStatus.soldiersInProduction > 0 && (
                  <View style={styles.productionCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <View>
                        <Text style={styles.productionTitle}>🏭 Üretim Devam Ediyor</Text>
                        <Text style={styles.productionTimer}>Kalan: {productionStatus.soldiersInProduction} asker ({timeDisplay})</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.instantFinishBtn, finishing && { opacity: 0.7 }]}
                        onPress={handleInstantFinish}
                        disabled={finishing}
                      >
                        <Text style={styles.instantFinishText}>💎 HIZLANDIR</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${((100 - productionStatus.secondsUntilNext) / 100) * 100}%` }]} />
                    </View>
                    <Text style={styles.costHint}>1 Asker = 1 Elmas</Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Mevcut Soldato:</Text>
                  <Text style={styles.infoValue}>{playerStats.soldiers.toLocaleString()}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Max Sipariş (Bu işlem):</Text>
                  <Text style={styles.infoValue}>{maxCanOrder.toLocaleString()}</Text>
                </View>

                {maxCanOrder > 0 ? (
                  <>
                    <View style={styles.counterContainer}>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setSelectedCount(Math.max(1, selectedCount - 1))}
                      >
                        <Text style={styles.counterBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>{selectedCount}</Text>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setSelectedCount(Math.min(maxCanOrder, selectedCount + 1))}
                      >
                        <Text style={styles.counterBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.presets}>
                      {presetCounts.map(n => (
                        <TouchableOpacity
                          key={n}
                          style={[styles.presetBtn, selectedCount === n && styles.presetBtnActive]}
                          onPress={() => setSelectedCount(n)}
                        >
                          <Text style={[styles.presetText, selectedCount === n && styles.presetTextActive]}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.costText}>Maliyet: ${getSoldierCost(selectedCount).toLocaleString()}</Text>

                    <TouchableOpacity
                      style={styles.orderButton}
                      onPress={handleOrder}
                      disabled={loading}
                    >
                      {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.orderButtonText}>Sipariş Ver</Text>}
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.warningText}>
                    Yetersiz bakiye.
                  </Text>
                )}
              </>
            ) : (
              // POWER TAB
              <View style={styles.powerContainer}>
                <View style={styles.totalPowerCard}>
                  <Sword size={32} color="#ff6b6b" />
                  <Text style={styles.totalPowerLabel}>Toplam Ordu Gücü</Text>
                  <Text style={styles.totalPowerValue}>{powerStats.totalPower}</Text>
                </View>

                <View style={styles.breakdownCard}>
                  <Text style={styles.breakdownTitle}>Güç Detayları</Text>

                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownLabelGroup}>
                      <Users size={16} color="#4ecdc4" />
                      <Text style={styles.breakdownLabel}>Askerler ({powerStats.soldiers} × 5)</Text>
                    </View>
                    <Text style={styles.breakdownValue}>{powerStats.baseTotal}</Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownLabelGroup}>
                      <Target size={16} color="#ffa726" />
                      <Text style={styles.breakdownLabel}>🔫 Baretta ({powerStats.barettaCount} × 3)</Text>
                    </View>
                    <Text style={[styles.breakdownValue, { color: '#ffa726' }]}>+{powerStats.barettaPower}</Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownLabelGroup}>
                      <Sword size={16} color="#ff6b6b" />
                      <Text style={styles.breakdownLabel}>🔫 AK-47 ({powerStats.ak47Count} × 10)</Text>
                    </View>
                    <Text style={[styles.breakdownValue, { color: '#ff6b6b' }]}>+{powerStats.ak47Power}</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownLabelGroup}>
                      <Shield size={16} color="#66bb6a" />
                      <Text style={styles.breakdownLabel}>Toplam Silah Bonusu</Text>
                    </View>
                    <Text style={[styles.breakdownValue, { color: '#66bb6a' }]}>+{powerStats.totalWeaponPower}</Text>
                  </View>

                  <View style={styles.tipBox}>
                    <Shield size={14} color="#aaa" />
                    <Text style={styles.tipText}>
                      Markettan silah satın alarak ordunun gücünü artır! Baretta: +3, AK-47: +10 güç.
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
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
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1a1a1a',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerContent: { justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#d4af37' },
  closeButtonText: { fontSize: 24, color: '#999', fontWeight: 'bold' },
  tabContainer: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    gap: 6
  },
  activeTab: { backgroundColor: '#d4af37' },
  tabText: { color: '#666', fontWeight: 'bold' },
  activeTabText: { color: '#000' },
  content: { padding: 20 },
  productionCard: {
    backgroundColor: '#252525',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  productionTitle: { color: '#ffa726', fontWeight: 'bold', marginBottom: 5 },
  productionTimer: { color: '#fff', marginBottom: 10 },
  progressBarBg: { height: 6, backgroundColor: '#333', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#ffa726' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  infoLabel: { color: '#999' },
  infoValue: { color: '#fff', fontWeight: 'bold' },
  counterContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 20, gap: 20 },
  counterBtn: { backgroundColor: '#333', width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  counterBtnText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  counterValue: { color: '#d4af37', fontSize: 24, fontWeight: 'bold' },
  presets: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  presetBtn: { backgroundColor: '#2a2a2a', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  presetBtnActive: { backgroundColor: '#d4af37', borderColor: '#d4af37' },
  presetText: { color: '#fff' },
  presetTextActive: { color: '#000', fontWeight: 'bold' },
  costText: { color: '#fff', textAlign: 'center', marginBottom: 20, fontSize: 16 },
  orderButton: { backgroundColor: '#d4af37', padding: 15, borderRadius: 10, alignItems: 'center' },
  orderButtonText: { fontWeight: 'bold', color: '#000', fontSize: 16 },
  warningText: { color: '#ff6b6b', textAlign: 'center', marginTop: 20 },

  // Power Tab Styles
  powerContainer: { gap: 15 },
  totalPowerCard: {
    backgroundColor: '#2a1a1a',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ff6b6b'
  },
  totalPowerLabel: { color: '#ff6b6b', marginTop: 10, fontSize: 14 },
  totalPowerValue: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginTop: 5 },
  breakdownCard: { backgroundColor: '#252525', padding: 15, borderRadius: 10 },
  breakdownTitle: { color: '#d4af37', fontWeight: 'bold', marginBottom: 15 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  breakdownLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  breakdownLabel: { color: '#ccc', fontSize: 14 },
  breakdownValue: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 10 },
  breakdownInfo: { color: '#999', fontSize: 12, fontStyle: 'italic' },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
    alignItems: 'center'
  },
  tipText: { color: '#888', fontSize: 11, flex: 1 },
  instantFinishBtn: {
    backgroundColor: '#9c27b0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ba68c8',
  },
  instantFinishText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  costHint: {
    color: '#666',
    fontSize: 10,
    marginTop: 6,
    textAlign: 'right',
  }
});