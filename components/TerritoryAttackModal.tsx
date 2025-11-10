import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Territory, PlayerStats } from '@/types/game';

interface TerritoryAttackModalProps {
  visible: boolean;
  onClose: () => void;
  territory: Territory;
  playerStats: PlayerStats;
  onAttack: (soldiersToSend: number) => Promise<void>;
}

export default function TerritoryAttackModal({ 
  visible, 
  onClose, 
  territory,
  playerStats,
  onAttack
}: TerritoryAttackModalProps) {
  const [soldiersToSend, setSoldiersToSend] = useState<string>(territory.soldiers.toString());
  const [isAttacking, setIsAttacking] = useState(false);

  const maxSoldiers = playerStats.soldiers;
  const defenderSoldiers = territory.soldiers;
  const soldiersNum = parseInt(soldiersToSend) || 0;

  const handleAttack = async () => {
    if (soldiersNum < 1) {
      Alert.alert('Hata', 'En az 1 asker göndermelisiniz!');
      return;
    }

    if (soldiersNum > maxSoldiers) {
      Alert.alert('Hata', `Yetersiz asker! Sadece ${maxSoldiers} askeriniz var.`);
      return;
    }

    const willWin = soldiersNum > defenderSoldiers;
    const willLose = soldiersNum < defenderSoldiers;

    Alert.alert(
      'Saldırı Onayla',
      `${territory.name} bölgesine ${soldiersNum} askerle saldıracaksınız.\n\n` +
      `Bölgedeki savunmacı asker: ${defenderSoldiers}\n` +
      `Sizin göndereceğiniz asker: ${soldiersNum}\n\n` +
      `${willWin ? '✅ Kazanma ihtimali yüksek!' : willLose ? '⚠️ Kaybetme riski var!' : '⚖️ Eşit savaş!'}\n\n` +
      `${willWin ? 'Kazanırsanız bölgeyi ele geçirecek ve savunmacının askerleri sizin olacak.' : 'Kaybederseniz gönderdiğiniz askerler kaybolacak.'}`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Saldır',
          style: 'destructive',
          onPress: async () => {
            setIsAttacking(true);
            try {
              await onAttack(soldiersNum);
              onClose();
              setSoldiersToSend(territory.soldiers.toString());
            } catch (error) {
              Alert.alert('Hata', 'Saldırı sırasında bir hata oluştu.');
            } finally {
              setIsAttacking(false);
            }
          }
        }
      ]
    );
  };

  const adjustCount = (change: number) => {
    const newCount = Math.max(1, Math.min(maxSoldiers, soldiersNum + change));
    setSoldiersToSend(newCount.toString());
  };

  const presetCounts = [
    defenderSoldiers,
    Math.ceil(defenderSoldiers * 1.5),
    Math.ceil(defenderSoldiers * 2),
    Math.min(maxSoldiers, Math.ceil(defenderSoldiers * 3))
  ].filter(count => count >= 1 && count <= maxSoldiers);

  const uniquePresets = [...new Set(presetCounts)].slice(0, 4);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Bölgeye Saldır</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Bölge Bilgileri */}
            <View style={styles.territoryCard}>
              <Text style={styles.territoryName}>{territory.name}</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Savunmacı Asker:</Text>
                <Text style={styles.infoValue}>{defenderSoldiers}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sizin Asker Sayınız:</Text>
                <Text style={styles.infoValue}>{maxSoldiers}</Text>
              </View>
            </View>

            {/* Asker Sayısı Seçimi */}
            <View style={styles.counterSection}>
              <Text style={styles.sectionTitle}>Kaç Asker Göndereceksiniz?</Text>
              <View style={styles.counter}>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => adjustCount(-1)}
                  disabled={soldiersNum <= 1}
                >
                  <Text style={styles.counterButtonText}>−</Text>
                </TouchableOpacity>
                
                <TextInput
                  style={styles.counterInput}
                  value={soldiersToSend}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 0;
                    if (num >= 1 && num <= maxSoldiers) {
                      setSoldiersToSend(text);
                    } else if (text === '') {
                      setSoldiersToSend('');
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={10}
                  placeholder="Asker sayısı"
                  placeholderTextColor="#666"
                />
                
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => adjustCount(1)}
                  disabled={soldiersNum >= maxSoldiers}
                >
                  <Text style={styles.counterButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.hintText}>
                {soldiersNum > defenderSoldiers 
                  ? '✅ Kazanma ihtimali yüksek'
                  : soldiersNum < defenderSoldiers 
                  ? '⚠️ Kaybetme riski var'
                  : '⚖️ Eşit savaş'}
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

            {/* Savaş Tahmini */}
            <View style={styles.predictionCard}>
              <Text style={styles.predictionTitle}>Savaş Tahmini</Text>
              {soldiersNum > defenderSoldiers ? (
                <View>
                  <Text style={styles.predictionWin}>✅ Kazanacaksınız!</Text>
                  <Text style={styles.predictionText}>
                    Kalan asker: {soldiersNum - defenderSoldiers}
                  </Text>
                  <Text style={styles.predictionText}>
                    Savunmacının {defenderSoldiers} askeri sizin olacak.
                  </Text>
                </View>
              ) : soldiersNum < defenderSoldiers ? (
                <View>
                  <Text style={styles.predictionLose}>⚠️ Kaybedeceksiniz!</Text>
                  <Text style={styles.predictionText}>
                    {soldiersNum} askeriniz kaybolacak.
                  </Text>
                  <Text style={styles.predictionText}>
                    Savunma: {defenderSoldiers - soldiersNum} asker kalacak.
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.predictionEqual}>⚖️ Eşit Savaş!</Text>
                  <Text style={styles.predictionText}>
                    Sonuç şansa bağlı olabilir.
                  </Text>
                </View>
              )}
            </View>

            {/* Saldır Butonu */}
            <TouchableOpacity
              style={[
                styles.attackButton,
                (isAttacking || soldiersNum < 1 || soldiersNum > maxSoldiers) && styles.attackButtonDisabled
              ]}
              onPress={handleAttack}
              disabled={isAttacking || soldiersNum < 1 || soldiersNum > maxSoldiers}
            >
              <Text style={styles.attackButtonText}>
                {isAttacking ? 'Saldırılıyor...' : `${soldiersNum} Askerle Saldır`}
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
    borderColor: '#ff6b6b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff6b6b',
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
    backgroundColor: '#ff6b6b',
    borderColor: '#ff6b6b',
  },
  presetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  presetButtonTextActive: {
    color: '#000',
  },
  predictionCard: {
    backgroundColor: '#2a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  predictionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 10,
  },
  predictionWin: {
    color: '#66bb6a',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  predictionLose: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  predictionEqual: {
    color: '#ffa726',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  predictionText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 3,
  },
  attackButton: {
    backgroundColor: '#ff6b6b',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  attackButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  attackButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

