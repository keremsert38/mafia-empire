import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { X, Crown, Zap, Building, Map, Users, DollarSign, Target, TrendingUp, Award, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';

interface HowToPlayModalProps {
  visible: boolean;
  onClose: () => void;
}

interface AccordionItemProps {
  title: string;
  icon: any;
  content: string;
  isOpen: boolean;
  onToggle: () => void;
}

function AccordionItem({ title, icon: Icon, content, isOpen, onToggle }: AccordionItemProps) {
  return (
    <View style={styles.accordionItem}>
      <TouchableOpacity style={styles.accordionHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.accordionHeaderLeft}>
          <Icon size={20} color="#d4af37" />
          <Text style={styles.accordionTitle}>{title}</Text>
        </View>
        {isOpen ? (
          <ChevronUp size={20} color="#d4af37" />
        ) : (
          <ChevronDown size={20} color="#999" />
        )}
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.accordionContent}>
          <Text style={styles.accordionText}>{content}</Text>
        </View>
      )}
    </View>
  );
}

export default function HowToPlayModal({ visible, onClose }: HowToPlayModalProps) {
  const { language } = useLanguage();
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  const sections = language === 'tr' ? [
    {
      id: 'intro',
      title: 'Oyunun Amacı',
      icon: Crown,
      content: `Mafia Empire'da amacınız, işler yaparak, işletmeler kurarak ve bölgeler fethederek en güçlü aile liderliğine ulaşmaktır.

• İş yaparak para ve deneyim kazanın
• İşletmeler kurarak pasif gelir elde edin
• Bölgeleri ele geçirerek topraklarınızı genişletin
• Seviye atlayarak yeni içeriklerin kilidini açın`
    },
    {
      id: 'first-steps',
      title: 'İlk Adımlar',
      icon: Target,
      content: `1️⃣ İLK İŞ
• Ana sayfada "Suç İşle" butonuna tıklayın
• Seviyenize uygun bir iş seçin
• Para ve XP kazanın!

2️⃣ İLK İŞLETME
• İşletmeler sekmesine gidin
• Başlangıç işletmesini satın alın
• İnşaat bitince pasif gelir kazanmaya başlayın!

3️⃣ SEVİYE ATLAMA
• İş yaparak XP kazanın
• Her seviye yeni işler ve işletmeler açar`
    },
    {
      id: 'energy',
      title: 'Enerji Sistemi',
      icon: Zap,
      content: `Enerji, iş yapmak için gereklidir.

• Maksimum Enerji: 100
• Yenileme: Marketten yiyecek alarak
• Her iş farklı miktarda enerji harcar
• Enerjiniz biterse market'ten yiyecek alın`
    },
    {
      id: 'level',
      title: 'Seviye Sistemi',
      icon: Award,
      content: `Seviye, oyundaki en kritik faktördür!

Seviye Atlamanın Faydaları:
• Yeni işlerin kilidi açılır
• Daha karlı işletmelere erişim
• Yeni bölgeleri fethedebilme

XP Nasıl Kazanılır:
• İş yaparak (en etkili yöntem)
• Bölge savaşlarını kazanarak`
    },
    {
      id: 'businesses',
      title: 'İşletmeler',
      icon: Building,
      content: `İşletmeler pasif gelir kaynağınızdır.

• İşletme satın alın ve inşaat bekleyin
• MT Coin ile inşaatı hızlandırabilirsiniz
• Her işletme 10 seviyeye kadar geliştirilebilir
• Her seviye geliri %50 artırır
• "Gelir Topla" butonuyla geliri çekin`
    },
    {
      id: 'crimes',
      title: 'İş Sistemi',
      icon: Target,
      content: `İş yaparak para ve XP kazanın!

Kategoriler:
• Sokak İşleri (Kolay, düşük risk)
• İş Dünyası (Orta, orta risk)
• Politik İşler (Zor, yüksek risk)
• Uluslararası (Çok zor, çok yüksek risk)

Risk Seviyeleri:
🟢 Düşük: Yüksek başarı, az kazanç
🟡 Orta: Dengeli başarı ve kazanç
🔴 Yüksek: Düşük başarı, yüksek kazanç`
    },
    {
      id: 'territories',
      title: 'Bölgeler',
      icon: Map,
      content: `Bölgeleri ele geçirerek topraklarınızı genişletin!

• Bölgelere saldırı düzenleyin
• Düşman soldatolarını yenin
• Bölgeyi ele geçirip gelir elde edin
• Soldatolarınızla bölgeyi koruyun
• Kaybedilen bölgeleri geri alabilirsiniz`
    },
    {
      id: 'family',
      title: 'Aile Sistemi',
      icon: Users,
      content: `Aile kurun veya bir aileye katılın!

Avantajlar:
• Sosyal ilişkiler kurun
• İttifaklar oluşturun
• Ortak hedefler belirleyin
• Diğer oyuncularla iş birliği yapın
• Birlikte daha güçlü olun!`
    },
    {
      id: 'mt-coins',
      title: 'MT Coin',
      icon: DollarSign,
      content: `MT Coin, oyun içi premium para birimidir.

Kullanım Alanları:
• İnşaat süresini hızlandırma
• Geliştirme süresini hızlandırma
• Özel ürünler satın alma

Akıllıca kullanın ve stratejik avantaj elde edin!`
    },
    {
      id: 'tips',
      title: 'İpuçları',
      icon: TrendingUp,
      content: `Başarılı bir mafya lideri olun!

• Sürekli iş yapın, XP kazanın
• İşletmeleri düzenli geliştirin
• Geliri sık sık toplayın
• İlk paraları işletmelere yatırın
• Enerjiniz doluyken iş yapın
• Soldato sayınızı artırın
• Her gün giriş yapın!`
    }
  ] : [
    {
      id: 'intro',
      title: 'Game Objective',
      icon: Crown,
      content: `In Mafia Empire, your goal is to become the most powerful family leader.

• Commit crimes to earn money and XP
• Build businesses for passive income
• Conquer territories to expand
• Level up to unlock new content`
    },
    {
      id: 'first-steps',
      title: 'First Steps',
      icon: Target,
      content: `1️⃣ FIRST CRIME
• Click "Commit Crime" on main page
• Choose a crime for your level
• Earn money and XP!

2️⃣ FIRST BUSINESS
• Go to Businesses tab
• Buy a starter business
• Start earning passive income!

3️⃣ LEVEL UP
• Earn XP by committing crimes
• Each level unlocks new content`
    },
    {
      id: 'energy',
      title: 'Energy System',
      icon: Zap,
      content: `Energy is required to commit crimes.

• Maximum Energy: 100
• Regeneration: Buy food from market
• Each crime costs different energy
• Buy food from market when empty`
    },
    {
      id: 'level',
      title: 'Level System',
      icon: Award,
      content: `Level is the most critical factor!

Benefits of Leveling Up:
• Unlock new crimes
• Access better businesses
• Conquer new territories

How to Earn XP:
• Commit crimes (most effective)
• Win territory battles`
    },
    {
      id: 'businesses',
      title: 'Businesses',
      icon: Building,
      content: `Businesses are your passive income source.

• Buy and wait for construction
• Speed up with MT Coins
• Upgrade up to level 10
• Each level increases income by 50%
• Use "Collect Income" button`
    },
    {
      id: 'crimes',
      title: 'Crime System',
      icon: Target,
      content: `Commit crimes to earn money and XP!

Categories:
• Street Crimes (Easy, low risk)
• Business Crimes (Medium risk)
• Political Crimes (Hard, high risk)
• International (Very hard)

Risk Levels:
🟢 Low: High success, low reward
🟡 Medium: Balanced
🔴 High: Low success, high reward`
    },
    {
      id: 'territories',
      title: 'Territories',
      icon: Map,
      content: `Expand your empire!

• Attack territories
• Defeat enemy soldiers
• Conquer and earn income
• Defend with your soldiers
• Reclaim lost territories`
    },
    {
      id: 'family',
      title: 'Family System',
      icon: Users,
      content: `Create or join a family!

Benefits:
• Build relationships
• Form alliances
• Set common goals
• Cooperate with players
• Stronger together!`
    },
    {
      id: 'mt-coins',
      title: 'MT Coins',
      icon: DollarSign,
      content: `Premium in-game currency.

Uses:
• Speed up construction
• Speed up upgrades
• Purchase special items

Use wisely for strategic advantage!`
    },
    {
      id: 'tips',
      title: 'Tips & Tricks',
      icon: TrendingUp,
      content: `Become a successful boss!

• Commit crimes constantly
• Upgrade businesses regularly
• Collect income frequently
• Invest in businesses first
• Use energy wisely
• Increase soldier count
• Login daily!`
    }
  ];

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

          {/* Accordion List */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {sections.map((section) => (
              <AccordionItem
                key={section.id}
                title={section.title}
                icon={section.icon}
                content={section.content}
                isOpen={openSection === section.id}
                onToggle={() => toggleSection(section.id)}
              />
            ))}
            <View style={styles.bottomPadding} />
          </ScrollView>
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
    width: '92%',
    height: '85%',
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
    padding: 16,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 2,
    borderBottomColor: '#d4af37',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    padding: 12,
  },
  accordionItem: {
    backgroundColor: '#0d0d0d',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  accordionContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  accordionText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
    marginTop: 10,
  },
  bottomPadding: {
    height: 20,
  },
});
