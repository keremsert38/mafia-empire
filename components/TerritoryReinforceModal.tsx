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
  ArrowRight,
} from 'lucide-react-native';
import { Territory, PlayerStats } from '@/types/game';

interface TerritoryReinforceModalProps {
  visible: boolean;
  onClose: () => void;
  territory: Territory;
  playerStats: PlayerStats;
  onReinforce: (soldiersToSend: number) => Promise<void>;
}

export default function TerritoryReinforceModal({ 
  visible, 
  onClose, 
  territory,
  playerStats,
  onReinforce
}: TerritoryReinforceModalProps) {
  const [soldiersToSend, setSoldiersToSend] = useState<string>('0');
  const [isReinforcing, setIsReinforcing] = useState(false);

  const maxSoldiers = playerStats.soldiers;
  const currentDefenders = territory.soldiers;
  // Seviyeye göre maksimum asker: 1 seviye = 5, 2 seviye = 10, vs.
  const maxSoldiersPerTerritory = playerStats.level * 5;
  const availableCapacity = maxSoldiersPerTerritory - currentDefenders;
  const soldiersNum = parseInt(soldiersToSend) || 0;

  const handleReinforce = async () => {
    if (soldiersNum < 1) {
      Alert.alert('Hata', 'En az 1 asker göndermelisiniz!');
      return;
    }

    if (soldiersNum > maxSoldiers) {
      Alert.alert('Hata', `Yetersiz asker! Sadece ${maxSoldiers} askeriniz var.`);
      return;
    }

    if (soldiersNum > availableCapacity) {
      Alert.alert('Hata', `Bu bölgeye maksimum ${maxSoldiersPerTerritory} asker yerleştirebilirsiniz. Mevcut: ${currentDefenders}, Yerleştirebilir: ${availableCapacity}`);
      return;
    }

    Alert.alert(
      'Asker Yerleştir',
      `${territory.name} bölgesine ${soldiersNum} asker yerleştireceksiniz.\n\n` +
      `Mevcut bölge askeri: ${currentDefenders}\n` +
      `Yerleştirilecek: ${soldiersNum}\n` +
      `Yeni toplam: ${currentDefenders + soldiersNum}/${maxSoldiersPerTerritory}`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Yerleştir',
          onPress: async () => {
            setIsReinforcing(true);
            try {
              await onReinforce(soldiersNum);
              onClose();
              setSoldiersToSend('0');
            } catch (error) {
              Alert.alert('Hata', 'Asker yerleştirme sırasında bir hata oluştu.');
            } finally {
              setIsReinforcing(false);
            }
          }
        }
      ]
    );
  };

  const adjustCount = (change: number) => {
    const newCount = Math.max(0, Math.min(
      maxSoldiers,
      availableCapacity,
      soldiersNum + change
    ));
    setSoldiersToSend(newCount.toString());
  };

  const presetCounts = [
    Math.min(5, availableCapacity),
    Math.min(10, availableCapacity),
    Math.min(25, availableCapacity),
    availableCapacity
  ].filter(count => count > 0);

  const uniquePresets = [...new Set(presetCounts)].slice(0, 4);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Shield size={24} color="#4ecdc4" />
              <Text style={styles.title}>Bölgeye Asker Yerleştir</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Bölge Bilgileri */}
            <View style={styles.territoryCard}>
              <Text style={styles.territoryName}>{territory.name}</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mevcut Asker:</Text>
                <Text style={styles.infoValue}>{currentDefenders}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Maksimum Kapasite:</Text>
                <Text style={styles.infoValue}>{maxSoldiersPerTerritory} (Seviye {playerStats.level} × 5)</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Yerleştirilebilir:</Text>
                <Text style={styles.infoValue}>{availableCapacity}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sizin Asker Sayınız:</Text>
                <Text style={styles.infoValue}>{maxSoldiers}</Text>
              </View>
            </View>

            {/* Asker Sayısı Seçimi */}
            <View style={styles.counterSection}>
              <Text style={styles.sectionTitle}>Kaç Asker Yerleştireceksiniz?</Text>
              <View style={styles.counter}>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => adjustCount(-1)}
                  disabled={soldiersNum <= 0}
                >
                  <Text style={styles.counterButtonText}>−</Text>
                </TouchableOpacity>
                
                <TextInput
                  style={styles.counterInput}
                  value={soldiersToSend}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 0;
                    if (num >= 0 && num <= Math.min(maxSoldiers, availableCapacity)) {
                      setSoldiersToSend(text);
                    } else if (text === '') {
                      setSoldiersToSend('');
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={10}
                  placeholder="0"
                  placeholderTextColor="#666"
                />
                
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => adjustCount(1)}
                  disabled={soldiersNum >= Math.min(maxSoldiers, availableCapacity)}
                >
                  <Text style={styles.counterButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.hintText}>
                Yeni toplam: {currentDefenders + soldiersNum} / {maxSoldiersPerTerritory}
              </Text>
            </View>

            {/* Hızlı Seçim */}
            {uniquePresets.length > 0 && (
              <View style={styles.presetSection}>
                <Text style={styles.sectionTitle}>Hızlı Seçim</Text>
                <View style={styles.presetButtons}>
                  {uniquePresets.map(count => (
                    <TouchableOpacity
                      key={count}
                      style={[
                        styles.presetButton,
                        soldiersNum === count && styles.presetButtonActive
                      ]}
                      onPress={() => setSoldiersToSend(count.toString())}
                    >
                      <Text style={[
                        styles.presetButtonText,
                        soldiersNum === count && styles.presetButtonTextActive
                      ]}>
                        {count}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Bilgi */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>ℹ️ Bilgi</Text>
              <Text style={styles.infoText}>
                Her seviye için bölge başına maksimum 5 asker yerleştirebilirsiniz. 
                Seviyeniz arttıkça daha fazla asker yerleştirebilirsiniz.
              </Text>
            </View>

            {/* Yerleştir Butonu */}
            <TouchableOpacity
              style={[
                styles.reinforceButton,
                (isReinforcing || soldiersNum < 1 || soldiersNum > Math.min(maxSoldiers, availableCapacity)) && styles.reinforceButtonDisabled
              ]}
              onPress={handleReinforce}
              disabled={isReinforcing || soldiersNum < 1 || soldiersNum > Math.min(maxSoldiers, availableCapacity)}
            >
              <Users size={18} color="#fff" />
              <Text style={styles.reinforceButtonText}>
                {isReinforcing ? 'Yerleştiriliyor...' : `${soldiersNum} Asker Yerleştir`}
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
    color: '#4ecdc4',
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
  presetSection: {
    marginBottom: 20,
  },
  presetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  presetButton: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 5,
  },
  presetButtonActive: {
    backgroundColor: '#4ecdc4',
    borderColor: '#4ecdc4',
  },
  presetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  presetButtonTextActive: {
    color: '#000',
  },
  infoCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 10,
  },
  infoText: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 18,
  },
  reinforceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ecdc4',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reinforceButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  reinforceButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});

