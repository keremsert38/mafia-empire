import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
// Basit text icon'lar kullanıyoruz
import { PlayerStats } from '@/types/game';

interface SoldierHiringModalProps {
  visible: boolean;
  onClose: () => void;
  playerStats: PlayerStats;
  onHireSoldiers: (count: number) => Promise<{ success: boolean; message: string }>;
}

export default function SoldierHiringModal({ 
  visible, 
  onClose, 
  playerStats, 
  onHireSoldiers 
}: SoldierHiringModalProps) {
  const [selectedCount, setSelectedCount] = useState(1);

  // Daha makul fiyatlar
  const getSoldierCost = (count: number) => {
    const baseCost = 100; // Her soldato için temel maliyet
    const levelMultiplier = 1 + (playerStats.level * 0.1); // Seviye arttıkça biraz daha pahalı
    return Math.floor(baseCost * count * levelMultiplier);
  };

  const maxSoldiers = playerStats.level * 5; // Seviye başına 5 soldato
  const availableSlots = maxSoldiers - playerStats.soldiers;
  const maxAffordable = Math.floor(playerStats.cash / getSoldierCost(1));
  const maxCanHire = Math.min(availableSlots, maxAffordable, 50); // Maksimum 50 soldato

  const handleHire = () => {
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
      Alert.alert('Yetersiz Slot', `Maksimum ${availableSlots} soldato alabilirsiniz!`);
      return;
    }

    Alert.alert(
      'Soldato İşe Al',
      `${selectedCount} soldato için $${cost.toLocaleString()} ödeyeceksiniz. Onaylıyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            const result = await onHireSoldiers(selectedCount);
            if (result.success) {
              onClose();
            }
            Alert.alert(
              result.success ? 'Başarılı' : 'Hata',
              result.message
            );
          }
        }
      ]
    );
  };

  const adjustCount = (change: number) => {
    const newCount = selectedCount + change;
    if (newCount >= 1 && newCount <= maxCanHire) {
      setSelectedCount(newCount);
    }
  };

  const presetCounts = [1, 5, 10, 25].filter(count => count <= maxCanHire);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.playerName}>{playerStats.name}</Text>
              <Text style={styles.title}>Soldato İşe Al</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
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
                <Text style={styles.statusLabel}>Boş Slot:</Text>
                <Text style={styles.statusValue}>{availableSlots}</Text>
              </View>
            </View>

            {maxCanHire > 0 ? (
              <>
                {/* Sayı Seçici */}
                <View style={styles.counterSection}>
                  <Text style={styles.sectionTitle}>Kaç Soldato?</Text>
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
                      disabled={selectedCount >= maxCanHire}
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

                {/* Maliyet */}
                <View style={styles.costCard}>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Toplam Maliyet:</Text>
                    <Text style={styles.costValue}>
                      ${getSoldierCost(selectedCount).toLocaleString()}
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

                {/* İşe Al Butonu */}
                <TouchableOpacity
                  style={[
                    styles.hireButton,
                    (playerStats.cash < getSoldierCost(selectedCount)) && styles.hireButtonDisabled
                  ]}
                  onPress={handleHire}
                  disabled={playerStats.cash < getSoldierCost(selectedCount)}
                >
                  <Text style={styles.iconText}>👥</Text>
                  <Text style={styles.hireButtonText}>
                    {selectedCount} Soldato İşe Al
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.noSlotsCard}>
                <Text style={styles.noSlotsTitle}>Soldato Alınamıyor</Text>
                <Text style={styles.noSlotsText}>
                  {availableSlots === 0 
                    ? 'Soldato slotunuz dolu. Seviye atlayarak daha fazla slot kazanın.'
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
    height: '85%',
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
  statusCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
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
    marginBottom: 20,
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
    marginBottom: 20,
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