import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { X, Crown, Zap, Building, Map, Users, DollarSign, Target, TrendingUp, Shield, Award } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';

interface HowToPlayModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function HowToPlayModal({ visible, onClose }: HowToPlayModalProps) {
  const { t, language } = useLanguage();
  const [activeSection, setActiveSection] = useState<string>('intro');

  const sections = language === 'tr' ? [
    {
      id: 'intro',
      title: '🎯 Oyunun Amacı',
      icon: Crown,
      content: `Mafia Empire'da amacınız, işler yaparak, işletmeler kurarak ve bölgeler fethederek en güçlü aile liderliğine ulaşmaktır.

Oyunda ilerlemek için:
• İş yaparak para ve deneyim kazanın
• İşletmeler kurarak pasif gelir elde edin
• Bölgeleri ele geçirerek topraklarınızı genişletin
• Aile kurun ve ittifaklar oluşturun
• Seviye atlayarak yeni içeriklerin kilidini açın`
    },
    {
      id: 'first-steps',
      title: '🚀 İlk Adımlar',
      icon: Target,
      content: `Oyuna yeni başlıyorsanız şu adımları izleyin:

1️⃣ İLK İŞ
• Ana sayfada "Suç İşle" butonuna tıklayın
• Seviyenize uygun bir iş seçin
• İşi başlatmak için onaylayın
• Para ve XP kazanın!

2️⃣ İLK İŞLETME
• İşletmeler sekmesine gidin
• "Küçük Dükkan" gibi başlangıç işletmesini seçin
• İnşa Et butonuna tıklayın
• İnşaat bitince pasif gelir kazanmaya başlayın!

3️⃣ SEVİYE ATLAMA
• İş yaparak XP kazanın
• Her seviye yeni işler ve işletmeler açar
• Seviye oyundaki en önemli faktördür!`
    },
    {
      id: 'energy',
      title: '⚡ Enerji Sistemi',
      icon: Zap,
      content: `Enerji, iş yapmak için gereklidir.

📊 Enerji Bilgileri:
• Maksimum Enerji: 100
• Otomatik Yenileme: Sürekli yenilenir
• Kullanım: Sadece iş yaparken harcanır

💡 İpuçları:
• Her iş farklı miktarda enerji harcar
• Enerjiniz biterse, yenilenene kadar bekleyin
• Riskli işler daha fazla enerji harcar
• Enerji doluyken iş yapmayı unutmayın!`
    },
    {
      id: 'level',
      title: '🎖️ Seviye Sistemi',
      icon: Award,
      content: `Seviye, oyundaki en kritik faktördür!

📈 Seviye Atlamanın Faydaları:
• Yeni işlerin kilidi açılır
• Daha karlı işletmelere erişim
• Yeni bölgeleri fethedebilme
• Daha güçlü aile yetenekleri
• Prestij ve saygınlık

💪 XP Nasıl Kazanılır:
• İş yaparak (en etkili yöntem)
• Bölge savaşlarını kazanarak
• Görevleri tamamlayarak
• Başarıları açarak

🎯 Önemli Seviyeler:
• Seviye 1: Küçük Dükkan
• Seviye 3: Kumarhane
• Seviye 5: Nakliye Şirketi
• Seviye 8: Gece Kulübü
• Seviye 10: Casino
• Seviye 12: Yazılım Şirketi
• Seviye 15: Özel Banka`
    },
    {
      id: 'businesses',
      title: '🏢 İşletmeler',
      icon: Building,
      content: `İşletmeler pasif gelir kaynağınızdır.

🏗️ İnşaat Süreci:
• İşletme satın alın
• İnşaat gerçek zamanlı sürer (dakika/saat)
• MT Coin ile inşaatı hızlandırabilirsiniz
• İnşaat bitince gelir toplamaya başlayın

📊 İşletme Kategorileri:
• Sokak İşletmeleri (Başlangıç)
• Ticaret İşletmeleri
• Eğlence İşletmeleri
• Teknoloji İşletmeleri
• Finans İşletmeleri

⬆️ Geliştirme:
• Her işletme 10 seviyeye kadar geliştirilebilir
• Her seviye geliri %50 artırır
• Geliştirme maliyeti her seviye 1.5x artar
• Maksimum seviyede "⭐ MAX" rozeti kazanırsınız

💰 Gelir Toplama:
• Saatlik gelir otomatik birikir
• "Gelir Topla" butonuyla geliri çekin
• Son toplama zamanından beri biriken geliri alın`
    },
    {
      id: 'crimes',
      title: '🎯 İş Sistemi',
      icon: Target,
      content: `İş yaparak para ve XP kazanın!

📋 İş Kategorileri:
• Sokak İşleri (Kolay, düşük risk)
• İş Dünyası (Orta, orta risk)
• Politik İşler (Zor, yüksek risk)
• Uluslararası (Çok zor, çok yüksek risk)

⚠️ Risk Seviyeleri:
🟢 Düşük Risk: Yüksek başarı, az kazanç
🟡 Orta Risk: Dengeli başarı ve kazanç
🔴 Yüksek Risk: Düşük başarı, yüksek kazanç

⏱️ Cooldown Sistemi:
• Her iş yapıldıktan sonra bekleme süresi vardır
• Süre dolmadan aynı işi tekrar yapamazsınız
• Farklı işler farklı cooldown sürelerine sahiptir

💡 Strateji:
• Seviyenize uygun işleri seçin
• Enerji ve risk dengesini gözetin
• Başarı oranı yüksek işlerle başlayın
• Deneyim kazandıkça riskli işlere geçin`
    },
    {
      id: 'territories',
      title: '🗺️ Bölgeler',
      icon: Map,
      content: `Bölgeleri ele geçirerek topraklarınızı genişletin!

⚔️ Bölge Fethi:
• Bölgelere saldırı düzenleyin
• Düşman soldatolarını yenin
• Bölgeyi ele geçirip gelir elde edin
• Soldatolarınızla bölgeyi koruyun

🛡️ Savunma:
• Ele geçirdiğiniz bölgeler saldırıya uğrayabilir
• Soldatolarınız bölgeyi otomatik korur
• Güçlü savunma için soldato sayınızı artırın
• Kaybedilen bölgeleri geri alabilirsiniz

💰 Bölge Gelirleri:
• Her bölge farklı gelir sağlar
• Stratejik bölgeler daha değerlidir
• Bölge sayısı prestijinizi artırır
• Topraklarınızı genişletin!`
    },
    {
      id: 'family',
      title: '👥 Aile Sistemi',
      icon: Users,
      content: `Aile kurun veya bir aileye katılın!

🏛️ Aile Avantajları:
• Sosyal ilişkiler kurun
• İttifaklar oluşturun
• Ortak hedefler belirleyin
• Tarafınızı belli edin
• Güç birliği yapın

👑 Aile Liderliği:
• Aile kurun ve lider olun
• Üye kabul edin
• Strateji belirleyin
• Ailenizi yönlendirin

🤝 Uyeler:
• Diğer oyuncularla iş birliği yapın
• Aile sohbetinde konuşun
• Ortak bölge savaşları verin
• Birlikte daha güçlü olun!`
    },
    {
      id: 'mt-coins',
      title: '💎 MT Coin',
      icon: DollarSign,
      content: `MT Coin, oyun içi premium para birimidir.

🛒 Nasıl Alınır:
• Gerçek para ile satın alınır
• Mağaza'dan paketler seçin
• Güvenli ödeme yöntemleri
• Anında hesabınıza yüklenir

💰 Kullanım Alanları:
• İnşaat süresini hızlandırma
• Geliştirme süresini hızlandırma
• Özel ürünler satın alma
• Premium özellikler
• Soldato kiralama (gelecek)

💡 Akıllıca Kullanım:
• Acil durumlarda kullanın
• Stratejik hızlandırmalar yapın
• Büyük işletmeler için değerlidir
• Avantaj elde edin!`
    },
    {
      id: 'tips',
      title: '💡 İpuçları ve Püf Noktaları',
      icon: TrendingUp,
      content: `Başarılı bir mafya lideri olun!

🎯 Genel Stratejiler:
• Sürekli iş yapın, XP kazanın
• İşletmeleri düzenli geliştirin
• Geliri sık sık toplayın
• Seviye atlamaya öncelik verin

💰 Para Yönetimi:
• İlk paraları işletmelere yatırın
• Pasif gelir en önemli kaynak
• Acele geliştirme yapmayın
• Uzun vadeli düşünün

⚡ Enerji Optimizasyonu:
• Enerjiniz doluyken iş yapın
• Yüksek XP veren işleri seçin
• Boşa gitmesin, sürekli kullanın

🏢 İşletme Taktikleri:
• Ucuz işletmelerle başlayın
• Gelir/maliyet oranına bakın
• Seviyenize uygun seçin
• Çeşitlendirin

🗺️ Bölge Stratejisi:
• Soldato sayınızı artırın
• Kolay bölgelerle başlayın
• Stratejik bölgeleri seçin
• Savunmanızı güçlendirin

👑 Liderlik:
• Sabırlı olun
• Her gün giriş yapın
• Etkinliklere katılın
• Topluluğa katılın!`
    }
  ] : [
    {
      id: 'intro',
      title: '🎯 Game Objective',
      icon: Crown,
      content: `In Mafia Empire, your goal is to become the most powerful family leader by committing crimes, building businesses, and conquering territories.

To progress in the game:
• Commit crimes to earn money and experience
• Build businesses for passive income
• Conquer territories to expand your empire
• Create a family and form alliances
• Level up to unlock new content`
    },
    {
      id: 'first-steps',
      title: '🚀 First Steps',
      icon: Target,
      content: `If you're new to the game, follow these steps:

1️⃣ FIRST CRIME
• Click "Commit Crime" on the main page
• Choose a crime suitable for your level
• Confirm to start the crime
• Earn money and XP!

2️⃣ FIRST BUSINESS
• Go to the Businesses tab
• Select a starter business like "Small Shop"
• Click the Build button
• Start earning passive income when construction completes!

3️⃣ LEVEL UP
• Earn XP by committing crimes
• Each level unlocks new crimes and businesses
• Level is the most important factor in the game!`
    },
    {
      id: 'energy',
      title: '⚡ Energy System',
      icon: Zap,
      content: `Energy is required to commit crimes.

📊 Energy Information:
• Maximum Energy: 100
• Auto Regeneration: Continuously regenerates
• Usage: Only spent when committing crimes

💡 Tips:
• Each crime costs different amounts of energy
• Wait for regeneration if you run out
• Risky crimes cost more energy
• Don't forget to commit crimes when energy is full!`
    },
    {
      id: 'level',
      title: '🎖️ Level System',
      icon: Award,
      content: `Level is the most critical factor in the game!

📈 Benefits of Leveling Up:
• Unlock new crimes
• Access more profitable businesses
• Ability to conquer new territories
• Stronger family abilities
• Prestige and reputation

💪 How to Earn XP:
• Committing crimes (most effective)
• Winning territory battles
• Completing missions
• Unlocking achievements

🎯 Important Levels:
• Level 1: Small Shop
• Level 3: Gambling Den
• Level 5: Transport Company
• Level 8: Nightclub
• Level 10: Casino
• Level 12: Software Company
• Level 15: Private Bank`
    },
    {
      id: 'businesses',
      title: '🏢 Businesses',
      icon: Building,
      content: `Businesses are your passive income source.

🏗️ Construction Process:
• Purchase a business
• Construction takes real-time (minutes/hours)
• Speed up construction with MT Coins
• Start collecting income when built

📊 Business Categories:
• Street Businesses (Starter)
• Trade Businesses
• Entertainment Businesses
• Technology Businesses
• Finance Businesses

⬆️ Upgrades:
• Each business can be upgraded to level 10
• Each level increases income by 50%
• Upgrade cost increases 1.5x per level
• Earn "⭐ MAX" badge at max level

💰 Income Collection:
• Hourly income accumulates automatically
• Use "Collect Income" button to claim
• Receive accumulated income since last collection`
    },
    {
      id: 'crimes',
      title: '🎯 Crime System',
      icon: Target,
      content: `Commit crimes to earn money and XP!

📋 Crime Categories:
• Street Crimes (Easy, low risk)
• Business Crimes (Medium, medium risk)
• Political Crimes (Hard, high risk)
• International Crimes (Very hard, very high risk)

⚠️ Risk Levels:
🟢 Low Risk: High success, low reward
🟡 Medium Risk: Balanced success and reward
🔴 High Risk: Low success, high reward

⏱️ Cooldown System:
• Each crime has a cooldown after completion
• Can't repeat the same crime until cooldown expires
• Different crimes have different cooldown times

💡 Strategy:
• Choose crimes appropriate for your level
• Balance energy and risk
• Start with high success rate crimes
• Move to risky crimes as you gain experience`
    },
    {
      id: 'territories',
      title: '🗺️ Territories',
      icon: Map,
      content: `Expand your empire by conquering territories!

⚔️ Territory Conquest:
• Attack territories
• Defeat enemy soldiers
• Conquer territory and earn income
• Defend with your soldiers

🛡️ Defense:
• Conquered territories can be attacked
• Your soldiers automatically defend
• Increase soldier count for strong defense
• Reclaim lost territories

💰 Territory Income:
• Each territory provides different income
• Strategic territories are more valuable
• Territory count increases prestige
• Expand your empire!`
    },
    {
      id: 'family',
      title: '👥 Family System',
      icon: Users,
      content: `Create or join a family!

🏛️ Family Benefits:
• Build social relationships
• Form alliances
• Set common goals
• Show your allegiance
• Strength in numbers

👑 Family Leadership:
• Create a family and become leader
• Accept members
• Determine strategy
• Lead your family

🤝 Members:
• Cooperate with other players
• Chat in family chat
• Joint territory wars
• Stronger together!`
    },
    {
      id: 'mt-coins',
      title: '💎 MT Coins',
      icon: DollarSign,
      content: `MT Coins are the premium in-game currency.

🛒 How to Get:
• Purchase with real money
• Choose packages from the Shop
• Secure payment methods
• Instantly added to your account

💰 Uses:
• Speed up construction
• Speed up upgrades
• Purchase special items
• Premium features
• Hire soldiers (coming soon)

💡 Smart Usage:
• Use in emergencies
• Make strategic speed-ups
• Valuable for large businesses
• Gain advantage!`
    },
    {
      id: 'tips',
      title: '💡 Tips and Tricks',
      icon: TrendingUp,
      content: `Become a successful mafia boss!

🎯 General Strategies:
• Continuously commit crimes, earn XP
• Regularly upgrade businesses
• Collect income frequently
• Prioritize leveling up

💰 Money Management:
• Invest first money in businesses
• Passive income is most important
• Don't rush upgrades
• Think long-term

⚡ Energy Optimization:
• Commit crimes when energy is full
• Choose high XP crimes
• Don't waste it, use continuously

🏢 Business Tactics:
• Start with cheap businesses
• Look at income/cost ratio
• Choose appropriate for your level
• Diversify

🗺️ Territory Strategy:
• Increase soldier count
• Start with easy territories
• Choose strategic territories
• Strengthen defense

👑 Leadership:
• Be patient
• Login daily
• Participate in events
• Join the community!`
    }
  ];

  const activeContent = sections.find(s => s.id === activeSection);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Crown size={24} color="#d4af37" />
              <Text style={styles.headerTitle}>
                {language === 'tr' ? 'Nasıl Oynanır?' : 'How to Play?'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            {/* Sidebar */}
            <ScrollView style={styles.sidebar} showsVerticalScrollIndicator={false}>
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <TouchableOpacity
                    key={section.id}
                    style={[
                      styles.sidebarItem,
                      activeSection === section.id && styles.sidebarItemActive
                    ]}
                    onPress={() => setActiveSection(section.id)}
                  >
                    <Icon
                      size={18}
                      color={activeSection === section.id ? '#d4af37' : '#999'}
                    />
                    <Text
                      style={[
                        styles.sidebarItemText,
                        activeSection === section.id && styles.sidebarItemTextActive
                      ]}
                      numberOfLines={2}
                    >
                      {section.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Main Content */}
            <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
              {activeContent && (
                <View style={styles.contentSection}>
                  <Text style={styles.sectionTitle}>{activeContent.title}</Text>
                  <Text style={styles.sectionContent}>{activeContent.content}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '95%',
    height: '90%',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 2,
    borderBottomColor: '#d4af37',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  closeButton: {
    padding: 8,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 140,
    backgroundColor: '#0a0a0a',
    borderRightWidth: 1,
    borderRightColor: '#333',
    padding: 10,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#1a1a1a',
  },
  sidebarItemActive: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  sidebarItemText: {
    fontSize: 11,
    color: '#999',
    flex: 1,
  },
  sidebarItemTextActive: {
    color: '#d4af37',
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  contentSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 16,
  },
  sectionContent: {
    fontSize: 15,
    color: '#ccc',
    lineHeight: 24,
  },
});
