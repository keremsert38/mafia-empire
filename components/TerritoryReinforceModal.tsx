import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {
  Shield,
  Users,
} from 'lucide-react-native';
import { Territory, PlayerStats } from '@/types/game';

interface TerritoryReinforceModalProps {
  visible: boolean;
  onClose: () => void;
  territory: Territory;
  playerStats: PlayerStats;
  onReinforce: (soldiersToSend: number) => Promise<void>;
  onWithdraw: (amount: number) => Promise<void>;
}

export default function TerritoryReinforceModal({
  visible,
  onClose,
  territory,
  playerStats,
  onReinforce,
  onWithdraw
}: TerritoryReinforceModalProps) {
  const [activeTab, setActiveTab] = useState<'reinforce' | 'withdraw'>('reinforce');
  const [amountStr, setAmountStr] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);

  const currentDefenders = territory.soldiers;
  const playerSoldiers = playerStats.soldiers;

  // Level sınırı kaldırıldı (çok yüksek limit)
  const maxSoldiersPerTerritory = 1000000;
  const availableCapacity = maxSoldiersPerTerritory - currentDefenders;

  const amount = parseInt(amountStr) || 0;

  // Hesaplamalar
  let maxAmount = 0;
  let title = '';
  let buttonText = '';
  let color = '';

  if (activeTab === 'reinforce') {
    maxAmount = Math.min(playerSoldiers, availableCapacity);
    title = 'Bölgeye Asker Ekle';
    buttonText = 'Asker Yerleştir';
    color = '#4ecdc4';
  } else {
    // Bölgede en az 1 asker kalmalı
    maxAmount = Math.max(0, currentDefenders - 1);
    title = 'Bölgeden Asker Çek';
    buttonText = 'Asker Geri Çek';
    color = '#ff6b6b';
  }

  const handleAction = async () => {
    if (amount < 1) {
      Alert.alert('Hata', 'En az 1 asker seçmelisiniz!');
      return;
    }

    if (amount > maxAmount) {
      Alert.alert('Hata', `Maksimum ${maxAmount} asker seçebilirsiniz.`);
      return;
    }

    setIsLoading(true);
    try {
      if (activeTab === 'reinforce') {
        await onReinforce(amount);
      } else {
        await onWithdraw(amount);
      }
      onClose();
      setAmountStr('0');
    } catch (error) {
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const adjustCount = (change: number) => {
    const newCount = Math.max(0, Math.min(maxAmount, amount + change));
    setAmountStr(newCount.toString());
  };

  const uniquePresets = [
    Math.floor(maxAmount * 0.25),
    Math.floor(maxAmount * 0.5),
    Math.floor(maxAmount * 0.75),
    maxAmount
  ].filter((v, i, self) => v > 0 && self.indexOf(v) === i);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modal, { borderColor: color }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              {activeTab === 'reinforce' ? (
                <Shield size={24} color={color} />
              ) : (
                <Users size={24} color={color} />
              )}
              <Text style={[styles.title, { color }]}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'reinforce' && styles.activeTab]}
              onPress={() => { setActiveTab('reinforce'); setAmountStr('0'); }}
            >
              <Text style={[styles.tabText, activeTab === 'reinforce' && styles.activeTabText]}>Asker Ekle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'withdraw' && styles.activeTabWithdraw]}
              onPress={() => { setActiveTab('withdraw'); setAmountStr('0'); }}
            >
              <Text style={[styles.tabText, activeTab === 'withdraw' && styles.activeTabText]}>Asker Çek</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Info Card */}
            <View style={styles.territoryCard}>
              <Text style={styles.territoryName}>{territory.name}</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{activeTab === 'reinforce' ? 'Mevcut Savunma:' : 'Mevcut Asker:'}</Text>
                <Text style={styles.infoValue}>{currentDefenders}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{activeTab === 'reinforce' ? 'Sizin Deponuz:' : 'Sizin Askerleriniz:'}</Text>
                <Text style={styles.infoValue}>{playerSoldiers}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>İşlem Limiti:</Text>
                <Text style={[styles.infoValue, { color }]}>{maxAmount}</Text>
              </View>
            </View>

            {/* Counter */}
            <View style={styles.counterSection}>
              <View style={styles.counter}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => adjustCount(-1)}
                  disabled={amount <= 0}
                >
                  <Text style={styles.counterButtonText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.counterInput}
                  value={amountStr}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 0;
                    if (num >= 0 && num <= maxAmount) {
                      setAmountStr(text);
                    } else if (text === '') {
                      setAmountStr('');
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={10}
                />
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => adjustCount(1)}
                  disabled={amount >= maxAmount}
                >
                  <Text style={styles.counterButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.hintText}>
                {activeTab === 'reinforce'
                  ? `Yeni toplam: ${currentDefenders + amount}`
                  : `Kalan: ${currentDefenders - amount}`}
              </Text>
            </View>

            {/* Presets */}
            {uniquePresets.length > 0 && (
              <View style={styles.presetButtons}>
                {uniquePresets.map(val => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.presetButton, amount === val && { backgroundColor: color, borderColor: color }]}
                    onPress={() => setAmountStr(val.toString())}
                  >
                    <Text style={[styles.presetButtonText, amount === val && { color: '#000' }]}>{val}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: color },
                (isLoading || amount < 1 || amount > maxAmount) && styles.disabledButton
              ]}
              onPress={handleAction}
              disabled={isLoading || amount < 1 || amount > maxAmount}
            >
              <Text style={styles.actionButtonText}>
                {isLoading ? 'İşleniyor...' : buttonText}
              </Text>
            </TouchableOpacity>

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
    width: '90%',
    maxHeight: '85%',
    borderWidth: 2,
    borderColor: '#4ecdc4',
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
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#999',
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4ecdc4',
  },
  activeTabWithdraw: {
    borderBottomColor: '#ff6b6b',
  },
  tabText: {
    color: '#666',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  territoryCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  territoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  infoLabel: {
    color: '#999',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  counterSection: {
    marginBottom: 20,
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
    minWidth: 40,
    alignItems: 'center',
  },
  counterButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  counterInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 20,
    minWidth: 80,
    textAlign: 'center',
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
  },
  hintText: {
    color: '#999',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  presetButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  presetButton: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 60,
    alignItems: 'center',
  },
  presetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  actionButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
