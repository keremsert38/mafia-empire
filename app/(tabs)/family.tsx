import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Platform,
} from 'react-native';
import {
  Users,
  Crown,
  Shield,
  Plus,
  Send,
  Check,
  X,
  Search,
  Star,
  Award,
  TrendingUp,
  Calendar,
  MessageSquare,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Family {
  id: string;
  name: string;
  description: string;
  leader_id: string;
  member_count: number;
  total_power: number;
  level: number;
  created_at: string;
}

interface JoinRequest {
  id: string;
  family_id: string;
  player_id: string;
  player_name: string;
  player_level: number;
  player_power: number;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  families?: { name: string };
}

interface FamilyMember {
  id: string;
  family_id: string;
  player_id: string;
  player_name: string;
  role: 'capo' | 'consigliere' | 'sottocapo' | 'caporegime';
  contribution: number;
  joined_at: string;
  last_active: string;
}

export default function FamilyScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'browse' | 'create' | 'my-family' | 'requests'>('browse');
  const [families, setFamilies] = useState<Family[]>([]);
  const [myFamily, setMyFamily] = useState<Family | null>(null);
  const [myFamilyMembers, setMyFamilyMembers] = useState<FamilyMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);

  // Yeni aile kurma form
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyDescription, setNewFamilyDescription] = useState('');

  useEffect(() => {
    loadFamilies();
    loadMyFamily();
    loadJoinRequests();
  }, [user]);

  const loadFamilies = async () => {
    try {
      const { data, error } = await supabase
        .from('families')
        .select('*')
        .order('member_count', { ascending: false })
        .limit(50);

      if (error) throw error;
      setFamilies(data || []);
    } catch (error) {
      console.error('Error loading families:', error);
    }
  };

  const loadMyFamily = async () => {
    if (!user) return;

    try {
      // Önce üye olduğum aileyi bul
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('family_id, role')
        .eq('player_id', user.id)
        .maybeSingle();

      if (memberError || !memberData) {
        setMyFamily(null);
        return;
      }

      // Aile bilgilerini getir
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('*')
        .eq('id', memberData.family_id)
        .single();

      if (familyError) throw familyError;
      setMyFamily(familyData);

      // Aile üyelerini getir
      const { data: membersData, error: membersError } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', memberData.family_id)
        .order('joined_at', { ascending: true });

      if (membersError) throw membersError;
      setMyFamilyMembers(membersData || []);

    } catch (error) {
      console.error('Error loading my family:', error);
    }
  };

  const loadJoinRequests = async () => {
    if (!user) return;

    try {
      // Benim gönderdiğim istekler
      const { data: myRequests, error: myError } = await supabase
        .from('family_join_requests')
        .select(`
          *,
          families(name)
        `)
        .eq('player_id', user.id);

      // Eğer aile lideriyse, aileye gelen istekler
      const { data: familyRequests, error: familyError } = await supabase
        .from('family_join_requests')
        .select(`
          *,
          families!inner(name, leader_id)
        `)
        .eq('families.leader_id', user.id)
        .eq('status', 'pending');

      const allRequests = [...(myRequests || []), ...(familyRequests || [])];

      setJoinRequests(allRequests);
    } catch (error) {
      console.error('Error loading join requests:', error);
    }
  };

  const createFamily = async () => {
    if (!user || !newFamilyName.trim()) {
      Alert.alert('Hata', 'Aile adı gerekli!');
      return;
    }

    setLoading(true);
    try {
      // Önce zaten bir ailede olup olmadığını kontrol et
      const { data: existingMember } = await supabase
        .from('family_members')
        .select('id')
        .eq('player_id', user.id)
        .single();

      if (existingMember) {
        Alert.alert('Hata', 'Zaten bir ailenin üyesisiniz!');
        setLoading(false);
        return;
      }

      // Aileyi oluştur
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .insert({
          name: newFamilyName.trim(),
          description: newFamilyDescription.trim(),
          leader_id: user.id
        })
        .select()
        .single();

      if (familyError) throw familyError;

      // Kendini aile üyesi olarak ekle (Capo olarak)
      const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Oyuncu';
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: familyData.id,
          player_id: user.id,
          player_name: username,
          role: 'leader'
        });

      if (memberError) throw memberError;

      Alert.alert('Başarılı', 'Aile başarıyla kuruldu!');
      setNewFamilyName('');
      setNewFamilyDescription('');
      loadMyFamily();
      loadFamilies();
      setActiveTab('my-family');

    } catch (error: any) {
      console.error('Error creating family:', error);
      Alert.alert('Hata', error.message || 'Aile kurulamadı!');
    } finally {
      setLoading(false);
    }
  };

  const sendJoinRequest = async (familyId: string, familyName: string) => {
    if (!user) return;

    const sendRequest = async (message: string) => {
      try {
        // Check if user already has a pending request to this family
        const { data: existingRequest, error: checkError } = await supabase
          .from('family_join_requests')
          .select('id, status')
          .eq('family_id', familyId)
          .eq('player_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing request:', checkError);
          Alert.alert('Hata', 'İstek kontrol edilemedi!');
          return;
        }

        if (existingRequest) {
          Alert.alert('Bilgi', 'Bu aileye zaten bekleyen bir isteğiniz var!');
          return;
        }

        const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Oyuncu';
        
        const { error } = await supabase
          .from('family_join_requests')
          .insert({
            family_id: familyId,
            player_id: user.id,
            player_name: username,
            player_level: 1,
            player_power: 0,
            message: message || ''
          });

        if (error) throw error;
        
        Alert.alert('Başarılı', 'Katılma isteği gönderildi!');
        loadJoinRequests();
      } catch (error: any) {
        Alert.alert('Hata', error.message || 'İstek gönderilemedi!');
      }
    };

    if (Platform.OS === 'web') {
      const message = window.prompt(`${familyName} ailesine katılma isteği göndermek istediğinizden emin misiniz?\n\nMesajınız (opsiyonel):`, '');
      if (message !== null) {
        await sendRequest(message);
      }
    } else if (Platform.OS === 'ios') {
      Alert.prompt(
        'Katılma İsteği',
        `${familyName} ailesine katılma isteği göndermek istediğinizden emin misiniz?`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Gönder',
            onPress: async (message) => {
              await sendRequest(message || '');
            }
          }
        ],
        'plain-text',
        '',
        'Mesajınız (opsiyonel)'
      );
    } else {
      // Android ve diğer platformlar: Alert.prompt desteklenmez
      Alert.alert(
        'Katılma İsteği',
        `${familyName} ailesine katılma isteği göndermek istediğinizden emin misiniz?`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Gönder',
            style: 'default',
            onPress: async () => {
              await sendRequest('');
            }
          }
        ]
      );
    }
  };

  const handleJoinRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const { error } = await supabase
        .from('family_join_requests')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      if (action === 'approve') {
        // Üyeyi aileye ekle (Caporegime olarak başlar)
        const request = joinRequests.find(r => r.id === requestId);
        if (request && myFamily) {
          const { error: memberError } = await supabase
            .from('family_members')
            .insert({
              family_id: myFamily.id,
              player_id: request.player_id,
              player_name: request.player_name,
              role: 'caporegime'
            });

          if (memberError) throw memberError;
          
          // Aile üye sayısını güncelle
          await supabase
            .from('families')
            .update({ member_count: myFamily.member_count + 1 })
            .eq('id', myFamily.id);
        }
      }

      Alert.alert('Başarılı', action === 'approve' ? 'İstek onaylandı!' : 'İstek reddedildi!');
      loadJoinRequests();
      loadMyFamily();
      loadFamilies(); // Aile listesini de güncelle
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'leader': return '👑';
      case 'capo': return '👑';
      case 'consigliere': return '🎖️';
      case 'sottocapo': return '⭐';
      case 'caporegime': return '🛡️';
      default: return '👤';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'leader': return 'Leader';
      case 'capo': return 'Capo';
      case 'consigliere': return 'Consigliere';
      case 'sottocapo': return 'Sottocapo';
      case 'caporegime': return 'Caporegime';
      default: return 'Caporegime';
    }
  };

  const canManageRoles = myFamily?.leader_id === user?.id;

  const promptChangeRole = (member: FamilyMember) => {
    if (!myFamily || !user) return;
    if (member.player_id === myFamily.leader_id) {
      Alert.alert('Bilgi', 'Liderin rolü değiştirilemez.');
      return;
    }

    const roleOptions: { key: FamilyMember['role']; label: string }[] = [
      { key: 'caporegime', label: 'Caporegime' },
      { key: 'sottocapo', label: 'Sottocapo' },
      { key: 'consigliere', label: 'Consigliere' },
      { key: 'capo', label: 'Capo' },
    ];

    Alert.alert(
      'Yetki Ver',
      `${member.player_name} için yeni rol seçin`,
      [
        ...roleOptions.map(opt => ({
          text: opt.label,
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('family_members')
                .update({ role: opt.key })
                .eq('id', member.id)
                .eq('family_id', myFamily.id);
              if (error) throw error;
              Alert.alert('Başarılı', `${member.player_name} artık ${opt.label}.`);
              loadMyFamily();
            } catch (e: any) {
              Alert.alert('Hata', e.message || 'Rol güncellenemedi');
            }
          }
        })),
        { text: 'İptal', style: 'cancel' }
      ]
    );
  };

  const filteredFamilies = families.filter(family =>
    family.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderBrowseTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.searchContainer}>
        <Search size={20} color="#d4af37" />
        <TextInput
          style={styles.searchInput}
          placeholder="Aile ara..."
          placeholderTextColor="#666"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <Text style={styles.sectionTitle}>Mevcut Aileler ({filteredFamilies.length})</Text>

      {filteredFamilies.map(family => (
        <View key={family.id} style={styles.familyCard}>
          <View style={styles.familyCardHeader}>
            <View style={styles.familyIcon}>
              <Crown size={24} color="#d4af37" />
            </View>
            <View style={styles.familyMainInfo}>
              <Text style={styles.familyName}>{family.name}</Text>
              <Text style={styles.familyDescription} numberOfLines={2}>
                {family.description || 'Açıklama yok'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => sendJoinRequest(family.id, family.name)}
            >
              <Send size={16} color="#000" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.familyStats}>
            <View style={styles.familyStat}>
              <Users size={16} color="#4ecdc4" />
              <Text style={styles.familyStatText}>{family.member_count} üye</Text>
            </View>
            <View style={styles.familyStat}>
              <TrendingUp size={16} color="#66bb6a" />
              <Text style={styles.familyStatText}>{family.total_power} güç</Text>
            </View>
            <View style={styles.familyStat}>
              <Star size={16} color="#ffa726" />
              <Text style={styles.familyStatText}>Seviye {family.level}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderCreateTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.createHeader}>
        <Crown size={40} color="#d4af37" />
        <Text style={styles.createTitle}>Yeni Aile Kur</Text>
        <Text style={styles.createSubtitle}>
          Kendi imparatorluğunu kur ve diğer oyuncuları davet et
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Aile Adı *</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Örn: Corleone Ailesi"
            placeholderTextColor="#666"
            value={newFamilyName}
            onChangeText={setNewFamilyName}
            maxLength={30}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Açıklama</Text>
          <TextInput
            style={[styles.formInput, styles.formTextArea]}
            placeholder="Ailenizin amacını ve değerlerini açıklayın..."
            placeholderTextColor="#666"
            value={newFamilyDescription}
            onChangeText={setNewFamilyDescription}
            multiline
            maxLength={200}
          />
        </View>

        <View style={styles.hierarchyInfo}>
          <Text style={styles.hierarchyTitle}>Aile Hiyerarşisi</Text>
          <View style={styles.hierarchyItem}>
            <Text style={styles.hierarchyRole}>👑 Capo</Text>
            <Text style={styles.hierarchyDesc}>Aile lideri</Text>
          </View>
          <View style={styles.hierarchyItem}>
            <Text style={styles.hierarchyRole}>🎖️ Consigliere</Text>
            <Text style={styles.hierarchyDesc}>Danışman</Text>
          </View>
          <View style={styles.hierarchyItem}>
            <Text style={styles.hierarchyRole}>⭐ Sottocapo</Text>
            <Text style={styles.hierarchyDesc}>Yardımcı lider</Text>
          </View>
          <View style={styles.hierarchyItem}>
            <Text style={styles.hierarchyRole}>🛡️ Caporegime</Text>
            <Text style={styles.hierarchyDesc}>Bölge sorumlusu</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={createFamily}
          disabled={loading || !newFamilyName.trim()}
        >
          <Plus size={20} color="#000" />
          <Text style={styles.createButtonText}>
            {loading ? 'Kuruluyor...' : 'Aile Kur'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderMyFamilyTab = () => {
    if (!myFamily) {
      return (
        <View style={styles.noFamilyContainer}>
          <Crown size={80} color="#333" />
          <Text style={styles.noFamilyTitle}>Henüz Bir Ailede Değilsiniz</Text>
          <Text style={styles.noFamilyText}>
            Mevcut ailelere katılma isteği gönderin veya kendi ailenizi kurun.
          </Text>
          <View style={styles.noFamilyActions}>
            <TouchableOpacity 
              style={styles.noFamilyButton}
              onPress={() => setActiveTab('browse')}
            >
              <Search size={16} color="#000" />
              <Text style={styles.noFamilyButtonText}>Aile Ara</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.noFamilyButton, styles.noFamilyButtonSecondary]}
              onPress={() => setActiveTab('create')}
            >
              <Plus size={16} color="#d4af37" />
              <Text style={[styles.noFamilyButtonText, { color: '#d4af37' }]}>Aile Kur</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <View style={styles.myFamilyHeader}>
          <View style={styles.myFamilyIcon}>
            <Crown size={32} color="#d4af37" />
          </View>
          <Text style={styles.myFamilyName}>{myFamily.name}</Text>
          <Text style={styles.myFamilyDescription}>{myFamily.description}</Text>
          
          <View style={styles.myFamilyStats}>
            <View style={styles.myFamilyStat}>
              <Users size={20} color="#4ecdc4" />
              <Text style={styles.myFamilyStatNumber}>{myFamily.member_count}</Text>
              <Text style={styles.myFamilyStatLabel}>Üye</Text>
            </View>
            <View style={styles.myFamilyStat}>
              <TrendingUp size={20} color="#66bb6a" />
              <Text style={styles.myFamilyStatNumber}>{myFamily.total_power}</Text>
              <Text style={styles.myFamilyStatLabel}>Güç</Text>
            </View>
            <View style={styles.myFamilyStat}>
              <Star size={20} color="#ffa726" />
              <Text style={styles.myFamilyStatNumber}>{myFamily.level}</Text>
              <Text style={styles.myFamilyStatLabel}>Seviye</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionSubtitle}>Aile Üyeleri ({myFamilyMembers.length})</Text>
        {myFamilyMembers.map(member => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>
                {member.player_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.player_name}</Text>
              <View style={styles.memberRole}>
                <Text style={styles.memberRoleIcon}>{getRoleIcon(member.role)}</Text>
                <Text style={styles.memberRoleText}>{getRoleName(member.role)}</Text>
              </View>
              <Text style={styles.memberContribution}>
                Katkı: {member.contribution.toLocaleString()}
              </Text>
            </View>
            <View style={styles.memberActions}>
              <Text style={styles.memberJoinDate}>
                {new Date(member.joined_at).toLocaleDateString('tr-TR')}
              </Text>
              {canManageRoles && member.player_id !== myFamily.leader_id && (
                <TouchableOpacity
                  style={styles.roleButton}
                  onPress={() => promptChangeRole(member)}
                >
                  <Text style={styles.roleButtonText}>Yetki</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderRequestsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Katılma İstekleri</Text>
      
      {joinRequests.length === 0 ? (
        <View style={styles.noRequestsContainer}>
          <MessageSquare size={60} color="#333" />
          <Text style={styles.noRequestsTitle}>Henüz İstek Yok</Text>
          <Text style={styles.noRequestsText}>
            Gönderdiğiniz veya aldığınız katılma istekleri burada görünecek.
          </Text>
        </View>
      ) : (
        joinRequests.map(request => (
          <View key={request.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.requestAvatar}>
                <Text style={styles.requestAvatarText}>
                  {request.player_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.requestInfo}>
                <Text style={styles.requestPlayerName}>{request.player_name}</Text>
                <Text style={styles.requestDetails}>
                  Seviye {request.player_level} • Güç: {request.player_power}
                </Text>
                <Text style={styles.requestFamily}>
                  Aile: {request.families?.name || 'Bilinmiyor'}
                </Text>
              </View>
              <View style={styles.requestStatus}>
                <Text style={[
                  styles.requestStatusText,
                  request.status === 'pending' && styles.requestStatusPending,
                  request.status === 'approved' && styles.requestStatusApproved,
                  request.status === 'rejected' && styles.requestStatusRejected,
                ]}>
                  {request.status === 'pending' ? 'Bekliyor' : 
                   request.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                </Text>
              </View>
            </View>
            
            {request.message && (
              <View style={styles.requestMessage}>
                <Text style={styles.requestMessageText}>"{request.message}"</Text>
              </View>
            )}
            
            {request.status === 'pending' && myFamily?.leader_id === user?.id && (
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleJoinRequest(request.id, 'approve')}
                >
                  <Check size={16} color="#fff" />
                  <Text style={styles.approveButtonText}>Onayla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleJoinRequest(request.id, 'reject')}
                >
                  <X size={16} color="#fff" />
                  <Text style={styles.rejectButtonText}>Reddet</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Crown size={28} color="#d4af37" />
          <Text style={styles.title}>Aile Sistemi</Text>
        </View>
        <View style={styles.tabButtons}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'browse' && styles.activeTab]}
            onPress={() => setActiveTab('browse')}
          >
            <Search size={14} color={activeTab === 'browse' ? '#000' : '#666'} />
            <Text style={[styles.tabButtonText, activeTab === 'browse' && styles.activeTabText]}>
              Gözat
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'create' && styles.activeTab]}
            onPress={() => setActiveTab('create')}
          >
            <Plus size={14} color={activeTab === 'create' ? '#000' : '#666'} />
            <Text style={[styles.tabButtonText, activeTab === 'create' && styles.activeTabText]}>
              Kur
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'my-family' && styles.activeTab]}
            onPress={() => setActiveTab('my-family')}
          >
            <Users size={14} color={activeTab === 'my-family' ? '#000' : '#666'} />
            <Text style={[styles.tabButtonText, activeTab === 'my-family' && styles.activeTabText]}>
              Ailem
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Send size={14} color={activeTab === 'requests' ? '#000' : '#666'} />
            <Text style={[styles.tabButtonText, activeTab === 'requests' && styles.activeTabText]}>
              İstekler
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'browse' && renderBrowseTab()}
      {activeTab === 'create' && renderCreateTab()}
      {activeTab === 'my-family' && renderMyFamilyTab()}
      {activeTab === 'requests' && renderRequestsTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    backgroundColor: '#1a1a1a',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#d4af37',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d4af37',
    marginLeft: 10,
  },
  tabButtons: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 25,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 22,
  },
  activeTab: {
    backgroundColor: '#d4af37',
  },
  tabButtonText: {
    color: '#666',
    marginLeft: 4,
    fontSize: 11,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#000',
  },
  tabContent: {
    flex: 1,
    padding: 15,
  },
  
  // Browse Tab
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 15,
  },
  familyCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  familyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  familyIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  familyMainInfo: {
    flex: 1,
  },
  familyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  familyDescription: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 18,
  },
  joinButton: {
    backgroundColor: '#d4af37',
    padding: 10,
    borderRadius: 20,
  },
  familyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  familyStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  familyStatText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },

  // Create Tab
  createHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  createTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d4af37',
    marginTop: 15,
    marginBottom: 8,
  },
  createSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  hierarchyInfo: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  hierarchyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 10,
  },
  hierarchyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  hierarchyRole: {
    fontSize: 13,
    color: '#fff',
    fontWeight: 'bold',
  },
  hierarchyDesc: {
    fontSize: 12,
    color: '#999',
  },
  createButton: {
    backgroundColor: '#d4af37',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
  },
  createButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  createButtonText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },

  // My Family Tab
  noFamilyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noFamilyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  noFamilyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  noFamilyActions: {
    flexDirection: 'row',
    gap: 15,
  },
  noFamilyButton: {
    backgroundColor: '#d4af37',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  noFamilyButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  noFamilyButtonText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  myFamilyHeader: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#d4af37',
    alignItems: 'center',
  },
  myFamilyIcon: {
    width: 60,
    height: 60,
    backgroundColor: '#2a2a2a',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  myFamilyName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 8,
  },
  myFamilyDescription: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  myFamilyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  myFamilyStat: {
    alignItems: 'center',
  },
  myFamilyStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
    marginBottom: 2,
  },
  myFamilyStatLabel: {
    fontSize: 12,
    color: '#999',
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 15,
  },
  memberCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#d4af37',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  memberRole: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberRoleIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  memberRoleText: {
    fontSize: 13,
    color: '#d4af37',
    fontWeight: 'bold',
  },
  memberContribution: {
    fontSize: 12,
    color: '#999',
  },
  memberActions: {
    alignItems: 'flex-end',
  },
  memberJoinDate: {
    fontSize: 11,
    color: '#666',
  },
  roleButton: {
    marginTop: 6,
    backgroundColor: '#d4af37',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },

  // Requests Tab
  noRequestsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noRequestsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    marginTop: 20,
    marginBottom: 10,
  },
  noRequestsText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  requestCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  requestAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#4ecdc4',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  requestInfo: {
    flex: 1,
  },
  requestPlayerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 3,
  },
  requestDetails: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  requestFamily: {
    fontSize: 12,
    color: '#4ecdc4',
  },
  requestStatus: {
    alignItems: 'flex-end',
  },
  requestStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  requestStatusPending: {
    backgroundColor: '#ffa726',
    color: '#000',
  },
  requestStatusApproved: {
    backgroundColor: '#66bb6a',
    color: '#000',
  },
  requestStatusRejected: {
    backgroundColor: '#ff6b6b',
    color: '#fff',
  },
  requestMessage: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  requestMessageText: {
    fontSize: 13,
    color: '#ccc',
    fontStyle: 'italic',
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  approveButton: {
    backgroundColor: '#66bb6a',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  approveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 12,
  },
  rejectButton: {
    backgroundColor: '#ff6b6b',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  rejectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 12,
  },
});