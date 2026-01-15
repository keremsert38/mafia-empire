import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import {
  Building2,
  DollarSign,
  Clock,
  TrendingUp,
  Shield,
  Star,
  Zap,
  Users,
  AlertTriangle,
  CheckCircle,
  Timer,
  Plus,
  Factory,
} from 'lucide-react-native';
import { useGameService } from '@/hooks/useGameService';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTutorial } from '@/contexts/TutorialContext';
import FactoryProductionModal from '@/components/FactoryProductionModal';

export default function BusinessesScreen() {
  const { gameService, playerStats, businesses } = useGameService();
  const { t } = useLanguage();
  const { checkStepCompletion, currentStep } = useTutorial();
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState<{ id: string, name: string } | null>(null);

  // Tutorial: Eğer zaten işletmesi varsa işletme adımını tamamla
  React.useEffect(() => {
    const ownedCount = businesses.filter(b => b.level > 0).length;
    if (currentStep === 4 && ownedCount > 0) {
      checkStepCompletion('business');
    }
  }, [currentStep, businesses]);

  const buildBusiness = async (businessId: string) => {
    const result = await gameService.buildBusiness(businessId);
    Alert.alert(result.success ? 'Başarılı' : 'Hata', result.message);
    if (result.success) {
      // Tutorial: İşletme aç adımı tamamlandı
      checkStepCompletion('business');
      setShowBuildModal(false);
    }
  };

  const upgradeBusiness = async (businessId: string) => {
    const result = await gameService.upgradeBusiness(businessId);
    Alert.alert(result.success ? 'Başarılı' : 'Hata', result.message);
  };



  const finishBuildingWithMT = async (businessId: string) => {
    const result = await gameService.finishBuildingWithMT(businessId);
    Alert.alert(result.success ? t.businesses.speedUpWithMT : t.common.error, result.message);
  };

  const finishUpgradeWithMT = async (businessId: string) => {
    const result = await gameService.finishUpgradeWithMT(businessId);
    Alert.alert(result.success ? t.businesses.speedUpUpgrade : t.common.error, result.message);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return '#66bb6a';
      case 'medium': return '#ffa726';
      case 'high': return '#ff6b6b';
      default: return '#999';
    }
  };

  const getLegalStatusColor = (legalStatus: string) => {
    return legalStatus === 'legal' ? '#66bb6a' : '#ff6b6b';
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getBusinessStatus = (business: any) => {
    if (business.isBuilding) return 'building';
    if (business.isUpgrading) return 'upgrading';
    return 'active';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'building': return <Timer size={16} color="#ffa726" />;
      case 'upgrading': return <TrendingUp size={16} color="#4ecdc4" />;
      case 'active': return <CheckCircle size={16} color="#66bb6a" />;
      default: return <AlertTriangle size={16} color="#999" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'building': return t.businesses.building;
      case 'upgrading': return t.businesses.upgrading;
      case 'active': return t.businesses.active;
      default: return t.businesses.active;
    }
  };

  // İşletmeleri ve fabrikaları ayır (business_type kontrolü)
  const regularBusinesses = businesses.filter(b => !b.id.startsWith('fab_'));
  const factories = businesses.filter(b => b.id.startsWith('fab_'));

  const ownedBusinesses = regularBusinesses.filter(b => b.level > 0);
  const availableBusinesses = regularBusinesses.filter(b => b.level === 0);

  const ownedFactories = factories.filter(b => b.level > 0);
  const availableFactories = factories.filter(b => b.level === 0);

  const totalIncome = ownedBusinesses.reduce((sum, b) => sum + b.currentIncome, 0);

  // İnşaat ve geliştirme durumlarını hesapla
  const buildingBusinesses = ownedBusinesses.filter(b => b.isBuilding);
  const upgradingBusinesses = ownedBusinesses.filter(b => b.isUpgrading);
  const activeBusinesses = ownedBusinesses.filter(b => !b.isBuilding && !b.isUpgrading);

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.businesses.title}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Building2 size={20} color="#d4af37" />
              <Text style={styles.statText}>{t.businesses.business}: {ownedBusinesses.length}</Text>
            </View>
            <View style={styles.statCard}>
              <DollarSign size={20} color="#66bb6a" />
              <Text style={styles.statText}>{t.businesses.income}: ${totalIncome.toLocaleString()}/h</Text>
            </View>
            <View style={styles.statCard}>
              <Users size={20} color="#4ecdc4" />
              <Text style={styles.statText}>{t.businesses.level}: {playerStats.level}</Text>
            </View>
          </View>
        </View>

        {/* Durum Bilgileri */}
        {(buildingBusinesses.length > 0 || upgradingBusinesses.length > 0) && (
          <View style={styles.statusRow}>
            {buildingBusinesses.length > 0 && (
              <View style={styles.statusCard}>
                <Timer size={16} color="#ffa726" />
                <Text style={styles.statusTextInCard}>{t.businesses.buildingCount}: {buildingBusinesses.length}</Text>
              </View>
            )}
            {upgradingBusinesses.length > 0 && (
              <View style={styles.statusCard}>
                <TrendingUp size={16} color="#4ecdc4" />
                <Text style={styles.statusTextInCard}>{t.businesses.upgradingCount}: {upgradingBusinesses.length}</Text>
              </View>
            )}
            {activeBusinesses.length > 0 && (
              <View style={styles.statusCard}>
                <CheckCircle size={16} color="#66bb6a" />
                <Text style={styles.statusTextInCard}>{t.businesses.activeCount}: {activeBusinesses.length}</Text>
              </View>
            )}
          </View>
        )}

        {/* Sahip Olunan İşletmeler */}
        {ownedBusinesses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.businesses.ownedBusinesses}</Text>
            {ownedBusinesses.map(business => {
              const status = getBusinessStatus(business);
              return (
                <View key={business.id} style={styles.businessCard}>
                  <View style={styles.businessHeader}>
                    <View style={styles.businessInfo}>
                      <Text style={styles.businessName}>{business.name}</Text>
                      <Text style={styles.businessCategory}>{business.category}</Text>
                      <View style={styles.businessStats}>
                        <View style={styles.statItem}>
                          {getStatusIcon(status)}
                          <Text style={[styles.statusText, { color: getRiskColor(business.riskLevel) }]}>
                            {getStatusText(status)}
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Star size={16} color="#d4af37" />
                          <Text style={styles.statValue}>{t.businesses.level} {business.level}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.businessIncome}>
                      <Text style={styles.incomeText}>${business.currentIncome.toLocaleString()}/h</Text>
                      <Text style={styles.incomeLabel}>{t.businesses.income}</Text>
                    </View>
                  </View>

                  {business.isBuilding && (
                    <View style={styles.progressSection}>
                      <View style={styles.progressHeader}>
                        <Clock size={16} color="#ffa726" />
                        <Text style={styles.progressText}>{t.businesses.buildingInProgress}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.mtButton}
                        onPress={() => finishBuildingWithMT(business.id)}
                      >
                        <Zap size={16} color="#fff" />
                        <Text style={styles.mtButtonText}>{t.businesses.speedUpBuilding}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {business.isUpgrading && (
                    <View style={styles.progressSection}>
                      <View style={styles.progressHeader}>
                        <TrendingUp size={16} color="#4ecdc4" />
                        <Text style={styles.progressText}>{t.businesses.upgradingInProgress}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.mtButton}
                        onPress={() => finishUpgradeWithMT(business.id)}
                      >
                        <Zap size={16} color="#fff" />
                        <Text style={styles.mtButtonText}>{t.businesses.speedUpUpgrade}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {status === 'active' && (
                    <>
                      {/* Seviye İlerleme Bilgisi */}
                      <View style={styles.levelProgress}>
                        <View style={styles.levelInfo}>
                          <Text style={styles.levelLabel}>{t.businesses.level}: {business.level || 0}/{business.maxLevel || 1}</Text>
                          <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBar, { width: `${((business.level || 0) / (business.maxLevel || 1)) * 100}%` }]} />
                          </View>
                        </View>
                        {business.level < business.maxLevel && (
                          <View style={styles.upgradeInfo}>
                            <Text style={styles.upgradeInfoText}>
                              {t.businesses.nextLevelIncome}: ${(((business.currentIncome || 0) * 1.5)).toFixed(0)}/h
                            </Text>
                            <Text style={styles.upgradeInfoSubtext}>
                              +${((business.currentIncome || 0) * 0.5).toFixed(0)}/h {t.businesses.increase}
                            </Text>
                          </View>
                        )}
                        {business.level === business.maxLevel && (
                          <View style={styles.maxLevelBadge}>
                            <Star size={14} color="#ffd700" />
                            <Text style={styles.maxLevelText}>{t.businesses.maxLevelReached}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.actionButtons}>

                        {business.level < business.maxLevel && business.upgradeCost && (
                          <TouchableOpacity
                            style={[styles.actionButton, styles.upgradeButton,
                            playerStats.cash < (business.upgradeCost || 0) && styles.disabledButton]}
                            onPress={() => upgradeBusiness(business.id)}
                            disabled={playerStats.cash < (business.upgradeCost || 0)}
                          >
                            <TrendingUp size={16} color="#fff" />
                            <Text style={styles.buttonText}>{t.businesses.upgrade} ${business.upgradeCost?.toLocaleString() || '0'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Yeni İşletme Ekleme */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Yeni İşletme</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowBuildModal(true)}
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.addButtonText}>İşletme Ekle</Text>
            </TouchableOpacity>
          </View>

          {availableBusinesses.length > 0 ? (
            <View style={styles.availableBusinesses}>
              {availableBusinesses.map(business => (
                <View key={business.id} style={styles.availableBusinessCard}>
                  <View style={styles.availableBusinessInfo}>
                    <Text style={styles.availableBusinessName}>{business.name}</Text>
                    <Text style={styles.availableBusinessCategory}>{business.category}</Text>
                    <Text style={styles.availableBusinessDescription}>{business.description}</Text>
                    <View style={styles.availableBusinessStats}>
                      <View style={styles.availableStatItem}>
                        <DollarSign size={14} color="#66bb6a" />
                        <Text style={styles.availableStatText}>${business.baseIncome}/h</Text>
                      </View>
                      <View style={styles.availableStatItem}>
                        <Clock size={14} color="#ffa726" />
                        <Text style={styles.availableStatText}>{formatTime(business.buildTime)}</Text>
                      </View>
                      <View style={styles.availableStatItem}>
                        <Zap size={14} color="#a855f7" />
                        <Text style={styles.mtCostText}>{Math.ceil(business.buildTime / 10)} 💎</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.buildButton, {
                      backgroundColor: playerStats.cash >= business.buildCost ? '#66bb6a' : '#999'
                    }]}
                    onPress={() => buildBusiness(business.id)}
                    disabled={playerStats.cash < business.buildCost}
                  >
                    <Text style={styles.buildButtonText}>
                      ${business.buildCost.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noBusinesses}>
              <Text style={styles.noBusinessesText}>
                Henüz yeni işletme bulunmamaktadır.
              </Text>
            </View>
          )}
        </View>

        {/* FABRİKALAR BÖLÜMÜ */}
        <View style={styles.factorySection}>
          <Text style={styles.factorySectionTitle}>🏭 FABRİKALAR</Text>

          {/* Sahip Olunan Fabrikalar */}
          {ownedFactories.length > 0 && (
            <View style={styles.ownedFactories}>
              <Text style={styles.factorySubtitle}>Fabrikalarınız</Text>
              {ownedFactories.map(factory => (
                <TouchableOpacity
                  key={factory.id}
                  style={styles.factoryCard}
                  onPress={() => setSelectedFactory({ id: factory.id, name: factory.name })}
                >
                  <View style={styles.factoryHeader}>
                    <Factory size={28} color="#a855f7" />
                    <View style={styles.factoryInfo}>
                      <Text style={styles.factoryName}>{factory.name}</Text>
                      <Text style={styles.factoryCategory}>{factory.category}</Text>
                    </View>
                    {factory.isBuilding ? (
                      <View style={styles.factoryBuildingBadge}>
                        <Timer size={14} color="#ffa726" />
                        <Text style={styles.factoryBuildingText}>İnşaat</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.factoryProduceButton}
                        onPress={() => setSelectedFactory({ id: factory.id, name: factory.name })}
                      >
                        <Zap size={16} color="#fff" />
                        <Text style={styles.factoryProduceText}>ÜRET</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.factoryDescription}>{factory.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Satın Alınabilir Fabrikalar */}
          {availableFactories.length > 0 && (
            <View style={styles.availableFactories}>
              <Text style={styles.factorySubtitle}>Satın Alınabilir Fabrikalar</Text>
              {availableFactories.map(factory => (
                <View key={factory.id} style={styles.availableFactoryCard}>
                  <View style={styles.factoryHeader}>
                    <Factory size={24} color="#666" />
                    <View style={styles.factoryInfo}>
                      <Text style={styles.availableFactoryName}>{factory.name}</Text>
                      <Text style={styles.factoryCategory}>{factory.category}</Text>
                    </View>
                  </View>
                  <Text style={styles.factoryDescription}>{factory.description}</Text>
                  <View style={styles.factoryStats}>
                    <View style={styles.factoryStat}>
                      <Clock size={14} color="#ffa726" />
                      <Text style={styles.factoryStatText}>{formatTime(factory.buildTime)}</Text>
                    </View>
                    <View style={styles.factoryStat}>
                      <Star size={14} color="#d4af37" />
                      <Text style={styles.factoryStatText}>Lv.{factory.requiredLevel}</Text>
                    </View>
                    <View style={styles.factoryStat}>
                      <Zap size={14} color="#a855f7" />
                      <Text style={styles.factoryMtCost}>{Math.ceil(factory.buildTime / 10)} 💎</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.buyFactoryButton,
                      (playerStats.cash < factory.buildCost || playerStats.level < factory.requiredLevel) && styles.buyFactoryButtonDisabled
                    ]}
                    onPress={() => buildBusiness(factory.id)}
                    disabled={playerStats.cash < factory.buildCost || playerStats.level < factory.requiredLevel}
                  >
                    <DollarSign size={16} color="#fff" />
                    <Text style={styles.buyFactoryButtonText}>
                      ${factory.buildCost.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      <FactoryProductionModal
        visible={selectedFactory !== null}
        onClose={() => setSelectedFactory(null)}
        factoryId={selectedFactory?.id || ''}
        factoryName={selectedFactory?.name || ''}
      />
    </>
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
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginTop: 15,
  },
  marketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ecdc4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  marketButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  inventoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4af37',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  inventoryButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: 'bold',
    fontSize: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusTextInCard: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: 'bold',
    fontSize: 11,
  },
  section: {
    padding: 15,
    backgroundColor: '#000000',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#66bb6a',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 12,
  },
  businessCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  businessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 3,
  },
  businessCategory: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  businessStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  statusText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: 'bold',
  },
  statValue: {
    marginLeft: 5,
    fontSize: 12,
    color: '#d4af37',
  },
  businessIncome: {
    alignItems: 'flex-end',
  },
  incomeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#66bb6a',
  },
  incomeLabel: {
    fontSize: 10,
    color: '#999',
  },
  progressSection: {
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
  progressText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  mtButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffa726',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  mtButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  collectButton: {
    backgroundColor: '#66bb6a',
  },
  upgradeButton: {
    backgroundColor: '#4ecdc4',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 12,
  },
  availableBusinesses: {
    marginTop: 10,
  },
  availableBusinessCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availableBusinessInfo: {
    flex: 1,
  },
  availableBusinessName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 3,
  },
  availableBusinessCategory: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  availableBusinessDescription: {
    fontSize: 11,
    color: '#ccc',
    marginBottom: 8,
  },
  availableBusinessStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  availableStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  availableStatText: {
    marginLeft: 3,
    fontSize: 10,
    color: '#999',
  },
  buildButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buildButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  noBusinesses: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  noBusinessesText: {
    color: '#999',
    textAlign: 'center',
    fontSize: 14,
  },
  collectAllSection: {
    padding: 20,
    backgroundColor: '#000000',
  },
  collectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4af37',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    justifyContent: 'center',
  },
  collectAllButtonText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  levelProgress: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  levelInfo: {
    marginBottom: 8,
  },
  levelLabel: {
    color: '#d4af37',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#d4af37',
    borderRadius: 4,
  },
  upgradeInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  upgradeInfoText: {
    color: '#66bb6a',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  upgradeInfoSubtext: {
    color: '#4ecdc4',
    fontSize: 11,
  },
  maxLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginTop: 8,
  },
  maxLevelText: {
    color: '#ffd700',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 12,
  },
  disabledButton: {
    backgroundColor: '#555',
    opacity: 0.6,
  },
  mtCostText: {
    marginLeft: 3,
    fontSize: 10,
    color: '#a855f7',
    fontWeight: 'bold',
  },
  // Fabrika Stilleri
  factorySection: {
    padding: 15,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 3,
    borderTopColor: '#a855f7',
  },
  factorySectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#a855f7',
    marginBottom: 15,
  },
  factorySubtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 10,
  },
  ownedFactories: {
    marginBottom: 20,
  },
  factoryCard: {
    backgroundColor: '#1a0a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#a855f7',
  },
  factoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  factoryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  factoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  factoryCategory: {
    fontSize: 11,
    color: '#a855f7',
  },
  factoryDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  factoryBuildingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#332200',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    gap: 5,
  },
  factoryBuildingText: {
    color: '#ffa726',
    fontSize: 11,
    fontWeight: 'bold',
  },
  factoryProduceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#a855f7',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  factoryProduceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  availableFactories: {
    marginTop: 10,
  },
  availableFactoryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  availableFactoryName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#888',
  },
  factoryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 10,
  },
  factoryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  factoryStatText: {
    color: '#999',
    fontSize: 11,
  },
  factoryMtCost: {
    color: '#a855f7',
    fontSize: 11,
    fontWeight: 'bold',
  },
  buyFactoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#a855f7',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
    gap: 5,
  },
  buyFactoryButtonDisabled: {
    backgroundColor: '#444',
    opacity: 0.6,
  },
  buyFactoryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});