import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { PlayerStats } from '@/types/game';

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
}

export default function SoldierHiringModal({
  visible,
  onClose,
  playerStats,
  onOrderSoldiers,
  onCheckProduction,
  onGetProductionStatus
}: SoldierHiringModalProps) {
  const [selectedCount, setSelectedCount] = useState(1);
  const [loading, setLoading] = useState(false);
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

  const maxSoldiers = playerStats.level * 5;
  const availableSlots = maxSoldiers - playerStats.soldiers - productionStatus.soldiersInProduction;
  const maxAffordable = Math.floor(playerStats.cash / getSoldierCost(1));
  const maxCanOrder = Math.min(availableSlots, maxAffordable, 50);

  // Üretim durumunu yükle
  const loadProductionStatus = useCallback(async () => {
    try {
      // Önce tamamlananları kontrol et
      await onCheckProduction();

      // Sonra mevcut durumu al
      const status = await onGetProductionStatus();
      setProductionStatus({
        soldiersInProduction: status.soldiersInProduction,
        secondsUntilNext: status.secondsUntilNext,
      });
    } catch (error) {
      console.error('Error loading production status:', error);
    }
  }, [onCheckProduction, onGetProductionStatus]);

  // Sayaç güncellemesi
  useEffect(() => {
    if (!visible) return;

    loadProductionStatus();

    const interval = setInterval(() => {
      setProductionStatus(prev => {
        if (prev.secondsUntilNext <= 1 && prev.soldiersInProduction > 0) {
          // Bir soldato tamamlandı, durumu yeniden yükle
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

  // Zaman gösterimi formatla
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
    if (selectedCount <= 0) {
      Alert.alert('Hata', 'Geçerli bir sayı seçin!');
      return;
    }

    const cost = getSoldierCost(selectedCount);
    if (playerStats.cash < cost) {
      Alert.alert('Yetersiz Para', `${selectedCount} soldato için $${cost.toLocaleString()} gerekli!`);
      return;
    }

    if (selectedCount > availableSlots) {
      Alert.alert('Yetersiz Slot', `Maksimum ${availableSlots} soldato sipariş edebilirsiniz!`);
      return;
    }

    const productionTime = selectedCount * 100;
    const productionMinutes = Math.floor(productionTime / 60);
    const productionSeconds = productionTime % 60;

    Alert.alert(
      'Soldato Siparişi',
      `${selectedCount} soldato için $${cost.toLocaleString()} ödeyeceksiniz.\n\n⏱️ Üretim Süresi: ${productionMinutes}:${productionSeconds.toString().padStart(2, '0')}\n\nOnaylıyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sipariş Ver',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await onOrderSoldiers(selectedCount);
              Alert.alert(
                result.success ? '✅ Başarılı' : '❌ Hata',
                result.message
              );
              if (result.success) {
                await loadProductionStatus();
                setSelectedCount(1);
              }
            } catch (error) {
              Alert.alert('Hata', 'Sipariş verilemedi!');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const adjustCount = (change: number) => {
    const newCount = selectedCount + change;
    if (newCount >= 1 && newCount <= maxCanOrder) {
      setSelectedCount(newCount);
    }
  };

  const presetCounts = [1, 5, 10, 25].filter(count => count <= maxCanOrder);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.playerName}>{playerStats.name}</Text>
              <Text style={styles.title}>Soldato Üretimi</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Üretim Durumu */}
            {productionStatus.soldiersInProduction > 0 && (
              <View style={styles.productionCard}>
                <View style={styles.productionHeader}>
                  <Text style={styles.productionTitle}>🏭 Üretimde</Text>
                  <ActivityIndicator size="small" color="#d4af37" />
                </View>
                <View style={styles.productionInfo}>
                  <View style={styles.productionRow}>
                    <Text style={styles.productionLabel}>Soldato:</Text>
                    <Text style={styles.productionValue}>{productionStatus.soldiersInProduction}</Text>
                  </View>
                  <View style={styles.productionRow}>
                    <Text style={styles.productionLabel}>Sonraki için:</Text>
                    <Text style={styles.productionTimer}>
                      {Math.floor(productionStatus.secondsUntilNext / 60)}:{(productionStatus.secondsUntilNext % 60).toString().padStart(2, '0')}
                    </Text>
                  </View>
                  <View style={styles.productionRow}>
                    <Text style={styles.productionLabel}>Toplam Kalan:</Text>
                    <Text style={styles.productionValue}>{timeDisplay}</Text>
                  </View>
                </View>
                <View style={styles.productionProgress}>
                  <View
                    style={[
                      styles.productionProgressBar,
                      { width: `${((100 - productionStatus.secondsUntilNext) / 100) * 100}%` }
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Mevcut Durum */}
            <View style={styles.statusCard}>
              <Text style={styles.statusTitle}>Mevcut Durum</Text>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Para:</Text>
                <Text style={styles.statusValue}>${playerStats.cash.toLocaleString()}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Soldato:</Text>
                <Text style={styles.statusValue}>{playerStats.soldiers}/{maxSoldiers}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Üretimde:</Text>
                <Text style={[styles.statusValue, { color: '#ffa726' }]}>
                  {productionStatus.soldiersInProduction}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Boş Slot:</Text>
                <Text style={styles.statusValue}>{availableSlots}</Text>
              </View>
            </View>

            {maxCanOrder > 0 ? (
              <>
                {/* Sayı Seçici */}
                <View style={styles.counterSection}>
                  <Text style={styles.sectionTitle}>Kaç Soldato Sipariş?</Text>
                  <View style={styles.counter}>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={() => adjustCount(-1)}
                      disabled={selectedCount <= 1}
                    >
                      <Text style={styles.iconText}>−</Text>
                    </TouchableOpacity>

                    <Text style={styles.counterValue}>{selectedCount}</Text>

                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={() => adjustCount(1)}
                      disabled={selectedCount >= maxCanOrder}
                    >
                      <Text style={styles.iconText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Hızlı Seçim */}
                <View style={styles.presetSection}>
                  <Text style={styles.sectionTitle}>Hızlı Seçim</Text>
                  <View style={styles.presetButtons}>
                    {presetCounts.map(count => (
                      <TouchableOpacity
                        key={count}
                        style={[
                          styles.presetButton,
                          selectedCount === count && styles.presetButtonActive
                        ]}
                        onPress={() => setSelectedCount(count)}
                      >
                        <Text style={[
                          styles.presetButtonText,
                          selectedCount === count && styles.presetButtonTextActive
                        ]}>
                          {count}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Maliyet ve Süre */}
                <View style={styles.costCard}>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Toplam Maliyet:</Text>
                    <Text style={styles.costValue}>
                      ${getSoldierCost(selectedCount).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Üretim Süresi:</Text>
                    <Text style={[styles.costValue, { color: '#66bb6a' }]}>
                      {Math.floor(selectedCount * 100 / 60)}:{((selectedCount * 100) % 60).toString().padStart(2, '0')}
                    </Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Kalan Para:</Text>
                    <Text style={[
                      styles.costValue,
                      { color: playerStats.cash - getSoldierCost(selectedCount) >= 0 ? '#66bb6a' : '#ff6b6b' }
                    ]}>
                      ${(playerStats.cash - getSoldierCost(selectedCount)).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Sipariş Butonu */}
                <TouchableOpacity
                  style={[
                    styles.hireButton,
                    (playerStats.cash < getSoldierCost(selectedCount) || loading) && styles.hireButtonDisabled
                  ]}
                  onPress={handleOrder}
                  disabled={playerStats.cash < getSoldierCost(selectedCount) || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <>
                      <Text style={styles.iconText}>🏭</Text>
                      <Text style={styles.hireButtonText}>
                        {selectedCount} Soldato Sipariş Ver
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <Text style={styles.infoText}>
                  ⏱️ Her soldato 100 saniye üretilir. Uygulama kapalıyken de üretim devam eder.
                </Text>
              </>
            ) : (
              <View style={styles.noSlotsCard}>
                <Text style={styles.noSlotsTitle}>Soldato Sipariş Edilemiyor</Text>
                <Text style={styles.noSlotsText}>
                  {availableSlots === 0
                    ? 'Soldato slotunuz dolu veya tüm slotlar üretimde. Seviye atlayarak daha fazla slot kazanın.'
                    : 'Yeterli paranız yok. Daha fazla para kazanın.'
                  }
                </Text>
              </View>
            )}
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
    maxHeight: '90%',
    borderWidth: 2,
    borderColor: '#d4af37',
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
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    color: '#fff',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#999',
    fontWeight: 'bold',
  },
  iconText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  productionCard: {
    backgroundColor: '#2a3a2a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4a6a4a',
  },
  productionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#66bb6a',
  },
  productionInfo: {
    marginBottom: 10,
  },
  productionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  productionLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  productionValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  productionTimer: {
    color: '#ffa726',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productionProgress: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  productionProgressBar: {
    height: '100%',
    backgroundColor: '#66bb6a',
  },
  statusCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  statusLabel: {
    color: '#999',
    fontSize: 14,
  },
  statusValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  counterSection: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 10,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 10,
  },
  counterButton: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
  },
  counterValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 30,
    minWidth: 50,
    textAlign: 'center',
  },
  presetSection: {
    marginBottom: 15,
  },
  presetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  presetButton: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  presetButtonActive: {
    backgroundColor: '#d4af37',
    borderColor: '#d4af37',
  },
  presetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  presetButtonTextActive: {
    color: '#000',
  },
  costCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  costLabel: {
    color: '#999',
    fontSize: 14,
  },
  costValue: {
    color: '#d4af37',
    fontSize: 14,
    fontWeight: 'bold',
  },
  hireButton: {
    backgroundColor: '#d4af37',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  hireButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  hireButtonText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  infoText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noSlotsCard: {
    backgroundColor: '#2a1a1a',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  noSlotsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 10,
  },
  noSlotsText: {
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
  },
});