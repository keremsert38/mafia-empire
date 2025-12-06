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
  Modal,
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
  DollarSign,
  Gift,
  Sword,
  Target,
  UserPlus,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { gameService } from '@/services/gameService';


interface Family {
  id: string;
  name: string;
  description: string;
  leader_id: string;
  member_count: number;
  total_power: number;
  level: number;
  created_at: string;
  treasury?: number;
  cash_treasury?: number;
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
  role: 'leader' | 'capo' | 'consigliere' | 'sottocapo' | 'caporegime';
  contribution: number;
  joined_at: string;
  last_active: string;
  assigned_soldiers?: number;
  can_control_soldiers?: boolean;
  player_level?: number;
}

interface FamilyDonation {
  id: string;
  family_id: string;
  donor_id: string;
  donor_name: string;
  amount: number;
  message: string | null;
  created_at: string;
}

function FamilyScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'browse' | 'create' | 'my-family' | 'requests' | 'donations'>('browse');
  const [families, setFamilies] = useState<Family[]>([]);
  const [myFamily, setMyFamily] = useState<Family | null>(null);
  const [myFamilyMembers, setMyFamilyMembers] = useState<FamilyMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [familyDonations, setFamilyDonations] = useState<FamilyDonation[]>([]);
  const [familyCashDonations, setFamilyCashDonations] = useState<FamilyDonation[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [soldierAssignAmount, setSoldierAssignAmount] = useState('');
  const [selectedMemberForAssignment, setSelectedMemberForAssignment] = useState<FamilyMember | null>(null);
  const [showSoldierControlModal, setShowSoldierControlModal] = useState(false);
  const [attackSoldiers, setAttackSoldiers] = useState('');
  const [selectedTerritory, setSelectedTerritory] = useState('');
  const [availableTerritories] = useState([
    'istanbul_1', 'istanbul_2', 'ankara_1', 'ankara_2',
    'izmir_1', 'izmir_2', 'bursa_1', 'antalya_1'
  ]);
  const [showTerritoryDropdown, setShowTerritoryDropdown] = useState(false);
  const [showMemberManagementModal, setShowMemberManagementModal] = useState(false);
  const [selectedMemberForManagement, setSelectedMemberForManagement] = useState<FamilyMember | null>(null);
  const [showDonationsDropdown, setShowDonationsDropdown] = useState(false);
  const [showTreasuryModal, setShowTreasuryModal] = useState(false);
  const [cashDonationAmount, setCashDonationAmount] = useState('');
  const [donationType, setDonationType] = useState<'soldiers' | 'cash'>('soldiers');
  const [showViewMembersModal, setShowViewMembersModal] = useState(false);
  const [selectedFamilyToView, setSelectedFamilyToView] = useState<Family | null>(null);
  const [viewingFamilyMembers, setViewingFamilyMembers] = useState<FamilyMember[]>([]);

  // Yeni aile kurma form
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyDescription, setNewFamilyDescription] = useState('');
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);

  useEffect(() => {
    loadFamilies();
    loadMyFamily();
    loadJoinRequests();
    loadPlayerStats();
  }, [user]);

  // Aile durumu değiştiğinde tab'ı otomatik güncelle
  useEffect(() => {
    if (activeTab === 'create' && myFamily) {
      // Eğer aile kurulduysa ve create tab'ındaysa, my-family'ye geç
      setActiveTab('my-family');
    } else if (activeTab === 'my-family' && !myFamily) {
      // Eğer aileden ayrıldıysa ve my-family tab'ındaysa, browse'a geç
      setActiveTab('browse');
    }
  }, [myFamily, activeTab]);

  const loadPlayerStats = () => {
    const stats = gameService.getPlayerStats();
    setPlayerStats(stats);
  };



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
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select(`
          *,
          families (*)
        `)
        .eq('player_id', user.id)
        .single();

      if (memberError && memberError.code !== 'PGRST116') {
        console.error('Family member error:', memberError);
        setMyFamily(null);
        setMyFamilyMembers([]);
        setFamilyDonations([]);
        return;
      }

      if (memberData?.families) {
        setMyFamily(memberData.families as Family);
        await loadMyFamilyMembers(memberData.families.id);
        await loadFamilyDonations(memberData.families.id);
        await loadFamilyCashDonations(memberData.families.id);
      } else {
        setMyFamily(null);
        setMyFamilyMembers([]);
        setFamilyDonations([]);
        setFamilyCashDonations([]);
      }
    } catch (error: any) {
      console.error('Error loading my family:', error);
      setMyFamily(null);
      setMyFamilyMembers([]);
      setFamilyDonations([]);
      setFamilyCashDonations([]);
    }
  };

  const loadMyFamilyMembers = async (familyId: string) => {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', familyId)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      setMyFamilyMembers(data || []);
    } catch (error) {
      console.error('Error loading family members:', error);
      setMyFamilyMembers([]);
    }
  };

  const loadFamilyDonations = async (familyId: string) => {
    try {
      const { data, error } = await supabase
        .from('family_donations')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setFamilyDonations(data || []);
    } catch (error) {
      console.error('Error loading family donations:', error);
      setFamilyDonations([]);
    }
  };

  const loadFamilyCashDonations = async (familyId: string) => {
    try {
      const { data, error } = await supabase
        .from('family_cash_donations')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setFamilyCashDonations(data || []);
    } catch (error) {
      console.error('Error loading family cash donations:', error);
      setFamilyCashDonations([]);
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

    // MT Coin kontrolü
    const stats = gameService.getPlayerStats();
    if (stats.mtCoins < 1000) {
      Alert.alert('Yetersiz MT Coin', `Aile kurmak için 1000 MT Coin gerekli. Mevcut: ${stats.mtCoins} MT Coin`);
      return;
    }

    setLoading(true);
    try {
      // Önce zaten bir ailede olup olmadığını kontrol et (PlayerStats üzerinden)
      const stats = gameService.getPlayerStats();
      if (stats.familyId) {
        Alert.alert('Hata', 'Zaten bir ailenin üyesisiniz! Önce aileden ayrılmalısınız.');
        setLoading(false);
        return;
      }

      // Aileyi oluştur (önce aile, sonra MT Coin harcama)
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .insert({
          name: newFamilyName.trim(),
          description: newFamilyDescription.trim(),
          leader_id: user.id
        })
        .select()
        .single();

      if (familyError) {
        if (familyError.code === '23505') {
          Alert.alert('Hata', 'Bu aile adı zaten kullanılıyor. Farklı bir isim seçin.');
        } else {
          Alert.alert('Hata', familyError.message || 'Aile oluşturulamadı!');
        }
        setLoading(false);
        return;
      }

      // Kendini aile üyesi olarak ekle
      const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Oyuncu';
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: familyData.id,
          player_id: user.id,
          player_name: username,
          role: 'leader',
          can_control_soldiers: true
        });

      if (memberError) {
        // Aile üye ekleme başarısız olursa aileyi sil
        await supabase.from('families').delete().eq('id', familyData.id);

        if (memberError.code === '23505') {
          Alert.alert('Hata', 'Zaten bir ailenin üyesisiniz! Lütfen önce aileden ayrılın.');
        } else {
          Alert.alert('Hata', memberError.message || 'Aile üyeliği oluşturulamadı!');
        }
        setLoading(false);
        return;
      }

      // Her şey başarılı olduktan sonra MT Coin harca
      const spendResult = await gameService.spendMTCoins(1000, 'Aile kurma');
      if (!spendResult.success) {
        // MT Coin harcama başarısız olursa aile ve üyeliği sil
        await supabase.from('family_members').delete().eq('family_id', familyData.id);
        await supabase.from('families').delete().eq('id', familyData.id);
        Alert.alert('Hata', spendResult.message);
        setLoading(false);
        return;
      }

      Alert.alert('Başarılı', 'Aile başarıyla kuruldu! 1000 MT Coin harcandı.');
      setNewFamilyName('');
      setNewFamilyDescription('');
      loadMyFamily();
      loadFamilies();
      loadPlayerStats();
      setActiveTab('my-family');

    } catch (error: any) {
      console.error('Error creating family:', error);
      Alert.alert('Hata', error.message || 'Aile kurulamadı!');
    } finally {
      setLoading(false);
    }
  };

  const donateToFamily = async () => {
    if (!myFamily || !user) return;

    if (donationType === 'soldiers') {
      const amount = parseInt(donationAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Hata', 'Geçerli bir miktar girin!');
        return;
      }

      const stats = gameService.getPlayerStats();
      if (stats.soldiers < amount) {
        Alert.alert('Yetersiz Soldato', `Sadece ${stats.soldiers} soldato'nuz var!`);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('donate_to_family', {
          p_family_id: myFamily.id,
          p_amount: amount,
          p_message: null
        });

        if (error) throw error;

        const result = data?.[0] || data;
        if (result?.success) {
          // Oyuncunun soldatolarını eksilt
          const currentStats = gameService.getPlayerStats();
          const newSoldierCount = Math.max(0, currentStats.soldiers - amount);

          await gameService.updatePlayerStats({
            ...currentStats,
            soldiers: newSoldierCount
          });

          Alert.alert('Başarılı', `${amount} soldato aileye bağışlandı! Kalan soldato: ${newSoldierCount}`);
          setDonationAmount('');
          await loadMyFamily();
          await loadPlayerStats();
        } else {
          Alert.alert('Hata', result?.message || 'Bağış yapılamadı!');
        }
      } catch (error: any) {
        console.error('Error donating:', error);
        Alert.alert('Hata', error.message || 'Bağış yapılamadı!');
      } finally {
        setLoading(false);
      }
    } else {
      // Para bağışı
      const amount = parseInt(cashDonationAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Hata', 'Geçerli bir miktar girin!');
        return;
      }

      const stats = gameService.getPlayerStats();
      if (stats.cash < amount) {
        Alert.alert('Yetersiz Para', `Sadece ${stats.cash.toLocaleString()} paranız var!`);
        return;
      }

      setLoading(true);
      try {
        // Aile hazinesine para ekle
        const { error: familyError } = await supabase
          .from('families')
          .update({
            cash_treasury: (myFamily.cash_treasury || 0) + amount
          })
          .eq('id', myFamily.id);

        if (familyError) throw familyError;

        // Para bağışını kaydet
        const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Oyuncu';
        const { error: donationError } = await supabase
          .from('family_cash_donations')
          .insert({
            family_id: myFamily.id,
            donor_id: user.id,
            donor_name: username,
            amount: amount,
            message: null
          });

        if (donationError) throw donationError;

        // Oyuncunun parasını eksilt
        const currentStats = gameService.getPlayerStats();
        const newCashAmount = Math.max(0, currentStats.cash - amount);

        await gameService.updatePlayerStats({
          ...currentStats,
          cash: newCashAmount
        });

        Alert.alert('Başarılı', `${amount.toLocaleString()} para aileye bağışlandı! Kalan para: ${newCashAmount.toLocaleString()}`);
        setCashDonationAmount('');
        await loadMyFamily();
        await loadPlayerStats();
      } catch (error: any) {
        console.error('Error donating cash:', error);
        Alert.alert('Hata', error.message || 'Para bağışı yapılamadı!');
      } finally {
        setLoading(false);
      }
    }
  };

  const sendJoinRequest = async (familyId: string, familyName: string) => {
    if (!user) return;

    const sendRequest = async (message: string) => {
      try {
        // Önce aile üyeliği kontrolü yap
        const { data: membershipCheck, error: membershipError } = await supabase.rpc('check_player_family_membership', {
          p_player_id: user.id
        });

        if (membershipError) {
          console.error('Membership check error:', membershipError);
        } else if (membershipCheck?.has_family) {
          Alert.alert('Hata', `Zaten "${membershipCheck.family_name}" ailesinin üyesisiniz! Önce aileden ayrılmalısınız.`);
          return;
        }

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

  const myRole = myFamilyMembers.find(m => m.player_id === user?.id)?.role;
  const canManageRoles = myFamily?.leader_id === user?.id;
  const isLeader = myFamily?.leader_id === user?.id || myRole === 'capo';

  const promptChangeRole = (member: FamilyMember) => {
    if (!myFamily || !user) return;
    if (member.player_id === myFamily.leader_id) {
      Alert.alert('Bilgi', 'Liderin rolü değiştirilemez.');
      return;
    }

    const roleOptions: { key: FamilyMember['role']; label: string }[] = [
      { key: 'caporegime', label: 'Caporegime' },
      { key: 'sottocapo', label: 'Sottocapo' },
      { key: 'capo', label: 'Capo' },
      { key: 'consigliere', label: 'Consigliere' },
    ];

    Alert.alert(
      'Rol Değiştir',
      `${member.player_name} için yeni rol seçin:`,
      [
        { text: 'İptal', style: 'cancel' },
        ...roleOptions.map(role => ({
          text: role.label,
          onPress: () => changeRole(member.id, role.key)
        }))
      ]
    );
  };

  const changeRole = async (memberId: string, newRole: FamilyMember['role']) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('family_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      Alert.alert('Başarılı', 'Rol başarıyla değiştirildi!');
      setShowMemberManagementModal(false);
      setSelectedMemberForManagement(null);
      await loadMyFamily();
    } catch (error: any) {
      console.error('Error changing role:', error);
      Alert.alert('Hata', error.message || 'Rol değiştirilemedi!');
    } finally {
      setLoading(false);
    }
  };

  // Üye yönetim modal'ını aç
  const openMemberManagement = (member: FamilyMember) => {
    if (!myFamily || !user) return;

    // Sadece lider ve sottocapo üye yönetimi yapabilir
    if (!isLeader && myRole !== 'sottocapo') {
      Alert.alert('Yetkisiz', 'Sadece lider ve sottocapo üye yönetimi yapabilir.');
      return;
    }

    // Lidere dokunulamaz
    if (member.player_id === myFamily.leader_id) {
      Alert.alert('Bilgi', 'Liderin rolü değiştirilemez veya aileden atılamaz.');
      return;
    }

    // Sottocapo sadece kendinden düşük rütbelileri yönetebilir
    if (myRole === 'sottocapo' && (member.role === 'leader' || member.role === 'sottocapo')) {
      Alert.alert('Yetkisiz', 'Sadece kendinden düşük rütbeli üyeleri yönetebilirsiniz.');
      return;
    }

    setSelectedMemberForManagement(member);
    setShowMemberManagementModal(true);
  };

  // Üyeyi aileden at
  const kickMember = async (member: FamilyMember) => {
    Alert.alert(
      'Üyeyi Kov',
      `${member.player_name} adlı üyeyi aileden kovmak istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kov',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await supabase
                .from('family_members')
                .delete()
                .eq('id', member.id);

              if (error) throw error;

              Alert.alert('Başarılı', `${member.player_name} aileden kovuldu.`);
              setShowMemberManagementModal(false);
              setSelectedMemberForManagement(null);
              await loadMyFamily();
            } catch (error: any) {
              console.error('Error kicking member:', error);
              Alert.alert('Hata', error.message || 'Üye kovulamadı!');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const promptSoldierAssignment = (member: FamilyMember) => {
    if (!myFamily || !user) return;
    if (!isLeader) {
      Alert.alert('Yetkisiz', 'Sadece lider soldato kontrolü yapabilir.');
      return;
    }

    setShowSoldierControlModal(true);
  };

  // Saldırı fonksiyonu
  const executeAttack = async () => {
    if (!selectedTerritory || !attackSoldiers) {
      Alert.alert('Hata', 'Bölge ve soldato sayısı gereklidir!');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('leader_control_soldiers', {
        p_action: 'attack',
        p_soldiers_count: parseInt(attackSoldiers),
        p_target_territory: selectedTerritory
      });

      if (error) throw error;

      const result = data?.[0] || data;
      if (result?.success) {
        Alert.alert('Başarılı', result.message);
        setShowSoldierControlModal(false);
        setAttackSoldiers('');
        setSelectedTerritory('');
        await loadMyFamily();
      } else {
        Alert.alert('Hata', result?.message || 'Saldırı başarısız!');
      }
    } catch (error: any) {
      console.error('Error attacking:', error);
      Alert.alert('Hata', error.message || 'Saldırı başarısız!');
    } finally {
      setLoading(false);
    }
  };

  const assignSoldiersToMember = async (memberId: string, soldiersCount: number) => {
    if (!myFamily || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('assign_soldiers_to_member', {
        p_member_id: memberId,
        p_soldiers_count: soldiersCount,
        p_assignment_type: 'defense'
      });

      if (error) throw error;

      const result = data?.[0] || data;
      if (result?.success) {
        Alert.alert('Başarılı', result.message);
        setSoldierAssignAmount('');
        setSelectedMemberForAssignment(null);
        await loadMyFamily();
      } else {
        Alert.alert('Hata', result?.message || 'Soldato ataması yapılamadı!');
      }
    } catch (error: any) {
      console.error('Error assigning soldiers:', error);
      Alert.alert('Hata', error.message || 'Soldato ataması yapılamadı!');
    } finally {
      setLoading(false);
    }
  };

  // Aileden ayrılma fonksiyonu
  const leaveFamily = async () => {
    if (!myFamily || !user) return;

    Alert.alert(
      'Aileden Ayrıl',
      'Aileden ayrılmak istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ayrıl',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Eğer lider ise aileyi sil
              if (myFamily.leader_id === user.id) {
                const { error: familyError } = await supabase
                  .from('families')
                  .delete()
                  .eq('id', myFamily.id);

                if (familyError) throw familyError;
                Alert.alert('Başarılı', 'Aile lideriydiniz, aile kapatıldı.');
              } else {
                // Normal üye ise sadece üyelikten çık
                const { error: memberError } = await supabase
                  .from('family_members')
                  .delete()
                  .eq('player_id', user.id);

                if (memberError) throw memberError;
                Alert.alert('Başarılı', 'Aileden başarıyla ayrıldınız.');
              }

              setMyFamily(null);
              setMyFamilyMembers([]);
              setFamilyDonations([]);
              setActiveTab('browse');
            } catch (error: any) {
              console.error('Error leaving family:', error);
              Alert.alert('Hata', error.message || 'Aileden ayrılırken hata oluştu!');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Hazine modal'ını aç (sadece lider)
  const openTreasuryModal = () => {
    if (!myFamily || !user) return;

    if (!isLeader) {
      Alert.alert('Yetkisiz', 'Sadece lider aile hazinesini yönetebilir.');
      return;
    }

    setShowTreasuryModal(true);
  };

  // Hazineden soldato çek (lider için)
  const withdrawFromTreasury = async (amount: number) => {
    if (!myFamily || !user || !isLeader) return;

    Alert.alert(
      'Hazineden Çek',
      `${amount} soldatoyu aile hazinesinden kendi envanterinize çekmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çek',
          onPress: async () => {
            setLoading(true);
            try {
              // Hazineden düş
              const { error: treasuryError } = await supabase
                .from('families')
                .update({ treasury: Math.max(0, (myFamily.treasury || 0) - amount) })
                .eq('id', myFamily.id);

              if (treasuryError) throw treasuryError;

              // Oyuncuya ekle
              const currentStats = gameService.getPlayerStats();
              await gameService.updatePlayerStats({
                ...currentStats,
                soldiers: currentStats.soldiers + amount
              });

              Alert.alert('Başarılı', `${amount} soldato envanterinize eklendi!`);
              await loadMyFamily();
              await loadPlayerStats();
            } catch (error: any) {
              console.error('Error withdrawing from treasury:', error);
              Alert.alert('Hata', error.message || 'Hazineden çekilemedi!');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };







  // Para hazinesinden çekme (lider için)
  const withdrawCashFromTreasury = async () => {
    if (!myFamily || !user || !isLeader) return;

    const cashAmount = myFamily.cash_treasury || 0;
    if (cashAmount <= 0) {
      Alert.alert('Hata', 'Para hazinesi boş!');
      return;
    }

    Alert.alert(
      'Para Çek',
      `${cashAmount.toLocaleString()} ₺ para hazinesinden kendi envanterinize çekmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çek',
          onPress: async () => {
            setLoading(true);
            try {
              // Para hazinesini sıfırla
              const { error: familyError } = await supabase
                .from('families')
                .update({ cash_treasury: 0 })
                .eq('id', myFamily.id);

              if (familyError) throw familyError;

              // Oyuncuya para ekle
              const currentStats = gameService.getPlayerStats();
              await gameService.updatePlayerStats({
                ...currentStats,
                cash: currentStats.cash + cashAmount
              });

              Alert.alert('Başarılı', `${cashAmount.toLocaleString()} ₺ envanterinize eklendi!`);
              await loadMyFamily();
              await loadPlayerStats();
            } catch (error: any) {
              console.error('Error withdrawing cash:', error);
              Alert.alert('Hata', error.message || 'Para çekilemedi!');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Liderin savunma güçlendirme fonksiyonu
  const assignSoldiersToDefense = async (soldiersCount: number) => {
    if (!myFamily || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('leader_control_soldiers', {
        p_action: 'defense',
        p_soldiers_count: soldiersCount
      });

      if (error) throw error;

      const result = data?.[0] || data;
      if (result?.success) {
        Alert.alert('Başarılı', result.message);
        await loadMyFamily();
      } else {
        Alert.alert('Hata', result?.message || 'İşlem yapılamadı!');
      }
    } catch (error: any) {
      console.error('Error controlling soldiers:', error);
      Alert.alert('Hata', error.message || 'İşlem yapılamadı!');
    } finally {
      setLoading(false);
    }
  };

  // Başka ailenin üyelerini görüntüle
  const viewFamilyMembers = async (family: Family) => {
    setSelectedFamilyToView(family);
    setShowViewMembersModal(true); // Open modal first
    setLoading(true);
    try {
      console.log('Fetching members for family:', family.id);

      // Fetch family members
      const { data: membersData, error: membersError } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', family.id)
        .order('contribution', { ascending: false });

      if (membersError) {
        console.error('Members error:', membersError);
        throw membersError;
      }

      console.log('Members data:', membersData);

      // Get player IDs
      const playerIds = (membersData || []).map(m => m.player_id);
      console.log('Player IDs:', playerIds);

      if (playerIds.length === 0) {
        setViewingFamilyMembers([]);
        setLoading(false);
        return;
      }

      // Fetch player stats for all members
      const { data: playerStatsData, error: statsError } = await supabase
        .from('player_stats')
        .select('id, username, level, profile_image')
        .in('id', playerIds);

      if (statsError) {
        console.error('Stats error:', statsError);
        throw statsError;
      }

      console.log('Player stats data:', playerStatsData);

      // Create a map of player stats by ID
      const statsMap = new Map(
        (playerStatsData || []).map(stat => [stat.id, stat])
      );

      // Combine the data
      const members = (membersData || []).map(member => {
        const stats = statsMap.get(member.player_id);
        return {
          ...member,
          player_name: stats?.username || 'Oyuncu',
          player_level: stats?.level || 1,
          profile_image: stats?.profile_image || null
        };
      });

      console.log('Combined members:', members);
      setViewingFamilyMembers(members);
    } catch (error: any) {
      console.error('Error loading family members:', error);
      Alert.alert('Hata', 'Aile üyeleri yüklenemedi!');
    } finally {
      setLoading(false);
    }
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

          <TouchableOpacity
            style={styles.viewMembersButton}
            onPress={() => viewFamilyMembers(family)}
          >
            <Users size={14} color="#d4af37" />
            <Text style={styles.viewMembersButtonText}>Üyeleri Gör</Text>
          </TouchableOpacity>
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

        <View style={styles.costInfo}>
          <Text style={styles.costInfoText}>💎 Maliyet: 1000 MT Coin</Text>
          {playerStats && (
            <Text style={styles.costInfoBalance}>
              Bakiye: {playerStats.mtCoins.toLocaleString()} MT Coin
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={createFamily}
          disabled={loading || !newFamilyName.trim()}
        >
          <Plus size={20} color="#000" />
          <Text style={styles.createButtonText}>
            {loading ? 'Kuruluyor...' : 'Aile Kur (1000 MT Coin)'}
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
          <Text style={styles.myFamilyName}>{myFamily.name || 'Aile Adı'}</Text>
          <Text style={styles.myFamilyDescription}>{myFamily.description || 'Açıklama yok'}</Text>

          <View style={styles.myFamilyStats}>
            <View style={styles.myFamilyStat}>
              <Users size={20} color="#d4af37" />
              <Text style={styles.myFamilyStatNumber}>{myFamily.member_count || 0}</Text>
              <Text style={styles.myFamilyStatLabel}>Üye</Text>
            </View>
            <View style={styles.myFamilyStat}>
              <TrendingUp size={20} color="#66bb6a" />
              <Text style={styles.myFamilyStatNumber}>{myFamily.total_power || 0}</Text>
              <Text style={styles.myFamilyStatLabel}>Güç</Text>
            </View>
            <View style={styles.myFamilyStat}>
              <Star size={20} color="#ffa726" />
              <Text style={styles.myFamilyStatNumber}>{myFamily.level || 1}</Text>
              <Text style={styles.myFamilyStatLabel}>Seviye</Text>
            </View>
          </View>
        </View>

        {/* Bağış Bölümü */}
        <View style={styles.donationSection}>
          <View style={styles.donationHeader}>
            <Gift size={24} color="#d4af37" />
            <Text style={styles.donationTitle}>Aileye Bağış Yap</Text>
          </View>

          {/* Bağış Tipi Seçimi */}
          <View style={styles.donationTypeSelector}>
            <TouchableOpacity
              style={[styles.donationTypeButton, donationType === 'soldiers' && styles.donationTypeButtonActive]}
              onPress={() => setDonationType('soldiers')}
            >
              <Text style={[styles.donationTypeButtonText, donationType === 'soldiers' && styles.donationTypeButtonTextActive]}>
                🪖 Soldato
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.donationTypeButton, donationType === 'cash' && styles.donationTypeButtonActive]}
              onPress={() => setDonationType('cash')}
            >
              <Text style={[styles.donationTypeButtonText, donationType === 'cash' && styles.donationTypeButtonTextActive]}>
                💰 Para
              </Text>
            </TouchableOpacity>
          </View>

          {/* Hazine Bilgileri */}
          <View style={styles.treasuryInfoSection}>
            <TouchableOpacity
              style={[styles.treasuryInfo, isLeader && styles.treasuryInfoClickable]}
              onPress={isLeader ? openTreasuryModal : undefined}
              disabled={!isLeader}
            >
              <DollarSign size={20} color="#66bb6a" />
              <Text style={styles.treasuryText}>
                Soldato Hazinesi: {myFamily.treasury?.toLocaleString() || 0}
              </Text>
              {isLeader && (
                <Text style={styles.treasuryClickHint}>Yönetmek için tıklayın</Text>
              )}
            </TouchableOpacity>

            <View style={styles.treasuryInfo}>
              <DollarSign size={20} color="#ffd700" />
              <Text style={styles.treasuryText}>
                Para Hazinesi: {myFamily.cash_treasury?.toLocaleString() || 0} ₺
              </Text>
            </View>
          </View>

          {/* Soldato Kontrol Bilgisi - Sadece Lider */}
          {isLeader && (
            <View style={styles.soldierControlInfo}>
              <Sword size={20} color="#e74c3c" />
              <Text style={styles.soldierControlText}>
                Soldato Kontrolü: Lider Yetkisi Aktif
              </Text>

              {/* Saldırı Butonları */}
              <View style={styles.attackButtonsContainer}>



              </View>
            </View>
          )}

          <View style={styles.donationForm}>
            {donationType === 'soldiers' ? (
              <>
                <TextInput
                  style={styles.donationInput}
                  placeholder="Bağış miktarı (Soldato)"
                  placeholderTextColor="#666"
                  value={donationAmount}
                  onChangeText={setDonationAmount}
                  keyboardType="numeric"
                />
                {playerStats && (
                  <Text style={styles.soldatoBalance}>
                    Mevcut Soldato: {playerStats.soldiers.toLocaleString()}
                  </Text>
                )}
              </>
            ) : (
              <>
                <TextInput
                  style={styles.donationInput}
                  placeholder="Bağış miktarı (Para)"
                  placeholderTextColor="#666"
                  value={cashDonationAmount}
                  onChangeText={setCashDonationAmount}
                  keyboardType="numeric"
                />
                {playerStats && (
                  <Text style={styles.soldatoBalance}>
                    Mevcut Para: {playerStats.cash.toLocaleString()} ₺
                  </Text>
                )}
              </>
            )}

            <TouchableOpacity
              style={styles.donationButton}
              onPress={donateToFamily}
              disabled={loading}
            >
              <Gift size={16} color="#fff" />
              <Text style={styles.donationButtonText}>
                {loading ? 'Bağışlanıyor...' : `${donationType === 'soldiers' ? 'Soldato' : 'Para'} Bağışla`}
              </Text>
            </TouchableOpacity>
          </View>



          {/* Aileden Ayrıl Butonu */}
          <TouchableOpacity
            style={styles.leaveFamilyButton}
            onPress={leaveFamily}
            disabled={loading}
          >
            <X size={16} color="#fff" />
            <Text style={styles.leaveFamilyButtonText}>
              {isLeader ? 'Aileyi Kapat' : 'Aileden Ayrıl'}
            </Text>
          </TouchableOpacity>

          {/* Son Bağışlar - Dropdown */}
          {familyDonations.length > 0 && (
            <View style={styles.recentDonations}>
              <TouchableOpacity
                style={styles.donationsHeader}
                onPress={() => setShowDonationsDropdown(!showDonationsDropdown)}
              >
                <View style={styles.donationsHeaderLeft}>
                  <Gift size={18} color="#d4af37" />
                  <Text style={styles.recentDonationsTitle}>
                    Son Bağışlar ({familyDonations.length})
                  </Text>
                </View>
                <Text style={[styles.dropdownArrow, showDonationsDropdown && styles.dropdownArrowOpen]}>
                  ▼
                </Text>
              </TouchableOpacity>

              {showDonationsDropdown && (
                <View style={styles.donationsContent}>
                  {familyDonations.map(donation => (
                    <View key={donation.id} style={styles.donationItem}>
                      <View style={styles.donationItemLeft}>
                        <Text style={styles.donationDonorName}>{donation.donor_name}</Text>
                        <Text style={styles.donationDate}>
                          {new Date(donation.created_at).toLocaleDateString('tr-TR')}
                        </Text>
                      </View>
                      <Text style={styles.donationAmount}>
                        +{donation.amount.toLocaleString()} 🪖
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        <Text style={styles.sectionSubtitle}>Aile Üyeleri ({myFamilyMembers.length})</Text>
        {myFamilyMembers.map(member => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>
                {(member.player_name || 'O').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.player_name || 'Oyuncu'}</Text>
              <View style={styles.memberRole}>
                <Text style={styles.memberRoleIcon}>{getRoleIcon(member.role)}</Text>
                <Text style={styles.memberRoleText}>{getRoleName(member.role)}</Text>
              </View>
              <Text style={styles.memberContribution}>
                Katkı: {(member.contribution || 0).toLocaleString()}
              </Text>
              {member.assigned_soldiers && member.assigned_soldiers > 0 && (
                <Text style={styles.memberSoldiers}>
                  🪖 Atanmış Soldato: {member.assigned_soldiers.toLocaleString()}
                </Text>
              )}
            </View>
            <View style={styles.memberActions}>
              <Text style={styles.memberJoinDate}>
                {new Date(member.joined_at).toLocaleDateString('tr-TR')}
              </Text>
              {(isLeader || myRole === 'sottocapo') && member.player_id !== myFamily.leader_id && (
                <TouchableOpacity
                  style={styles.manageButton}
                  onPress={() => openMemberManagement(member)}
                >
                  <UserPlus size={14} color="#fff" />
                  <Text style={styles.manageButtonText}>Yönet</Text>
                </TouchableOpacity>
              )}
              {isLeader && myRole === 'leader' && (
                <TouchableOpacity
                  style={styles.soldierButton}
                  onPress={() => promptSoldierAssignment(member)}
                >
                  <Sword size={14} color="#fff" />
                  <Text style={styles.soldierButtonText}>Kontrol</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderDonationsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Bağış Yapma Bölümü */}
      <View style={styles.donationSection}>
        <View style={styles.donationHeader}>
          <Gift size={24} color="#d4af37" />
          <Text style={styles.donationTitle}>Aileye Bağış Yap</Text>
        </View>

        {/* Bağış Tipi Seçimi */}
        <View style={styles.donationTypeSelector}>
          <TouchableOpacity
            style={[styles.donationTypeButton, donationType === 'soldiers' && styles.donationTypeButtonActive]}
            onPress={() => setDonationType('soldiers')}
          >
            <Text style={[styles.donationTypeButtonText, donationType === 'soldiers' && styles.donationTypeButtonTextActive]}>
              🪖 Soldato
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.donationTypeButton, donationType === 'cash' && styles.donationTypeButtonActive]}
            onPress={() => setDonationType('cash')}
          >
            <Text style={[styles.donationTypeButtonText, donationType === 'cash' && styles.donationTypeButtonTextActive]}>
              💰 Para
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hazine Bilgileri */}
        <View style={styles.treasuryInfoSection}>
          <TouchableOpacity
            style={[styles.treasuryInfo, isLeader && styles.treasuryInfoClickable]}
            onPress={isLeader ? openTreasuryModal : undefined}
            disabled={!isLeader}
          >
            <DollarSign size={20} color="#66bb6a" />
            <Text style={styles.treasuryText}>
              Soldato Hazinesi: {myFamily?.treasury?.toLocaleString() || 0}
            </Text>
            {isLeader && (
              <Text style={styles.treasuryClickHint}>Yönetmek için tıklayın</Text>
            )}
          </TouchableOpacity>

          <View style={styles.treasuryInfo}>
            <DollarSign size={20} color="#ffd700" />
            <Text style={styles.treasuryText}>
              Para Hazinesi: {myFamily?.cash_treasury?.toLocaleString() || 0} ₺
            </Text>
          </View>
        </View>

        {/* Bağış Formu */}
        <View style={styles.donationForm}>
          {donationType === 'soldiers' ? (
            <>
              <TextInput
                style={styles.donationInput}
                placeholder="Bağış miktarı (Soldato)"
                placeholderTextColor="#666"
                value={donationAmount}
                onChangeText={setDonationAmount}
                keyboardType="numeric"
              />
              {playerStats && (
                <Text style={styles.soldatoBalance}>
                  Mevcut Soldato: {playerStats.soldiers.toLocaleString()}
                </Text>
              )}
            </>
          ) : (
            <>
              <TextInput
                style={styles.donationInput}
                placeholder="Bağış miktarı (Para)"
                placeholderTextColor="#666"
                value={cashDonationAmount}
                onChangeText={setCashDonationAmount}
                keyboardType="numeric"
              />
              {playerStats && (
                <Text style={styles.soldatoBalance}>
                  Mevcut Para: {playerStats.cash.toLocaleString()} ₺
                </Text>
              )}
            </>
          )}

          <TouchableOpacity
            style={styles.donationButton}
            onPress={donateToFamily}
            disabled={loading}
          >
            <Gift size={16} color="#fff" />
            <Text style={styles.donationButtonText}>
              {loading ? 'Bağışlanıyor...' : `${donationType === 'soldiers' ? 'Soldato' : 'Para'} Bağışla`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lider Para Kontrolü */}
        {isLeader && myFamily?.cash_treasury && myFamily.cash_treasury > 0 && (
          <View style={styles.leaderCashControl}>
            <Text style={styles.leaderCashControlTitle}>Lider Para Kontrolü</Text>
            <TouchableOpacity
              style={styles.withdrawCashButton}
              onPress={() => withdrawCashFromTreasury()}
              disabled={loading}
            >
              <DollarSign size={16} color="#fff" />
              <Text style={styles.withdrawCashButtonText}>Para Çek</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Son Soldato Bağışları */}
      {familyDonations.length > 0 && (
        <View style={styles.recentDonations}>
          <TouchableOpacity
            style={styles.donationsHeader}
            onPress={() => setShowDonationsDropdown(!showDonationsDropdown)}
          >
            <View style={styles.donationsHeaderLeft}>
              <Gift size={18} color="#d4af37" />
              <Text style={styles.recentDonationsTitle}>
                Son Soldato Bağışları ({familyDonations.length})
              </Text>
            </View>
            <Text style={[styles.dropdownArrow, showDonationsDropdown && styles.dropdownArrowOpen]}>
              ▼
            </Text>
          </TouchableOpacity>

          {showDonationsDropdown && (
            <View style={styles.donationsContent}>
              {familyDonations.map(donation => (
                <View key={donation.id} style={styles.donationItem}>
                  <View style={styles.donationItemLeft}>
                    <Text style={styles.donationDonorName}>{donation.donor_name}</Text>
                    <Text style={styles.donationDate}>
                      {new Date(donation.created_at).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                  <Text style={styles.donationAmount}>
                    +{donation.amount.toLocaleString()} 🪖
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Son Para Bağışları */}
      {familyCashDonations.length > 0 && (
        <View style={styles.recentDonations}>
          <TouchableOpacity
            style={styles.donationsHeader}
            onPress={() => setShowDonationsDropdown(!showDonationsDropdown)}
          >
            <View style={styles.donationsHeaderLeft}>
              <DollarSign size={18} color="#ffd700" />
              <Text style={styles.recentDonationsTitle}>
                Son Para Bağışları ({familyCashDonations.length})
              </Text>
            </View>
            <Text style={[styles.dropdownArrow, showDonationsDropdown && styles.dropdownArrowOpen]}>
              ▼
            </Text>
          </TouchableOpacity>

          {showDonationsDropdown && (
            <View style={styles.donationsContent}>
              {familyCashDonations.map(donation => (
                <View key={donation.id} style={styles.donationItem}>
                  <View style={styles.donationItemLeft}>
                    <Text style={styles.donationDonorName}>{donation.donor_name}</Text>
                    <Text style={styles.donationDate}>
                      {new Date(donation.created_at).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                  <Text style={styles.donationAmount}>
                    +{donation.amount.toLocaleString()} ₺
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );

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
          {!myFamily && (
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'create' && styles.activeTab]}
              onPress={() => setActiveTab('create')}
            >
              <Plus size={14} color={activeTab === 'create' ? '#000' : '#666'} />
              <Text style={[styles.tabButtonText, activeTab === 'create' && styles.activeTabText]}>
                Kur
              </Text>
            </TouchableOpacity>
          )}
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
          {myFamily && (
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'donations' && styles.activeTab]}
              onPress={() => setActiveTab('donations')}
            >
              <Gift size={14} color={activeTab === 'donations' ? '#000' : '#666'} />
              <Text style={[styles.tabButtonText, activeTab === 'donations' && styles.activeTabText]}>
                Bağışlar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {activeTab === 'browse' && renderBrowseTab()}
      {activeTab === 'create' && !myFamily && renderCreateTab()}
      {activeTab === 'my-family' && renderMyFamilyTab()}
      {activeTab === 'requests' && renderRequestsTab()}
      {activeTab === 'donations' && renderDonationsTab()}

      {/* Soldato Kontrol Modal */}
      <Modal
        visible={showSoldierControlModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSoldierControlModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Soldato Kontrolü</Text>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Aile Hazinesi:</Text>
              <Text style={styles.modalValue}>{myFamily?.treasury || 0} Soldato</Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Saldırı Soldato Sayısı:</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Soldato sayısı"
                placeholderTextColor="#666"
                value={attackSoldiers}
                onChangeText={setAttackSoldiers}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Hedef Bölge:</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowTerritoryDropdown(!showTerritoryDropdown)}
              >
                <Text style={styles.dropdownButtonText}>
                  {selectedTerritory || 'Bölge seçin'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              {showTerritoryDropdown && (
                <View style={styles.dropdownList}>
                  {availableTerritories.map((territory) => (
                    <TouchableOpacity
                      key={territory}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedTerritory(territory);
                        setShowTerritoryDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{territory}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSoldierControlModal(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.attackButton]}
                onPress={executeAttack}
                disabled={loading}
              >
                <Sword size={16} color="#fff" />
                <Text style={styles.attackButtonText}>
                  {loading ? 'Saldırıyor...' : 'Saldır'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Üye Yönetim Modal */}
      <Modal
        visible={showMemberManagementModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMemberManagementModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Üye Yönetimi</Text>

            {selectedMemberForManagement && (
              <>
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Üye:</Text>
                  <Text style={styles.modalValue}>{selectedMemberForManagement.player_name}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Mevcut Rol:</Text>
                  <Text style={styles.modalValue}>{getRoleName(selectedMemberForManagement.role)}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Yeni Rol Seç:</Text>
                  <View style={styles.roleGrid}>
                    {['caporegime', 'consigliere', 'capo', 'sottocapo'].map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleGridItem,
                          selectedMemberForManagement.role === role && styles.roleGridItemActive
                        ]}
                        onPress={() => changeRole(selectedMemberForManagement.id, role as FamilyMember['role'])}
                        disabled={loading}
                      >
                        <Text style={styles.roleGridItemText}>{getRoleName(role as FamilyMember['role'])}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowMemberManagementModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>İptal</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.kickButton]}
                    onPress={() => kickMember(selectedMemberForManagement)}
                    disabled={loading}
                  >
                    <X size={16} color="#fff" />
                    <Text style={styles.kickButtonText}>
                      {loading ? 'Kovuyor...' : 'Kovma'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>





      {/* Hazine Yönetim Modal */}
      <Modal
        visible={showTreasuryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTreasuryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Aile Hazinesi Yönetimi</Text>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Toplam Hazine:</Text>
              <Text style={styles.modalValue}>{myFamily?.treasury?.toLocaleString() || 0} Soldato</Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Son Bağışlar:</Text>
              <View style={styles.treasuryDonationsList}>
                {familyDonations.slice(0, 5).map(donation => (
                  <View key={donation.id} style={styles.treasuryDonationItem}>
                    <Text style={styles.treasuryDonorName}>{donation.donor_name}</Text>
                    <Text style={styles.treasuryDonationAmount}>
                      +{donation.amount.toLocaleString()} 🪖
                    </Text>
                  </View>
                ))}
                {familyDonations.length === 0 && (
                  <Text style={styles.noDonationsText}>Henüz bağış yapılmamış</Text>
                )}
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Hızlı Çekme:</Text>
              <View style={styles.quickWithdrawButtons}>
                {[10, 50, 100, 500].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.quickWithdrawButton,
                      (myFamily?.treasury || 0) < amount && styles.quickWithdrawButtonDisabled
                    ]}
                    onPress={() => withdrawFromTreasury(amount)}
                    disabled={loading || (myFamily?.treasury || 0) < amount}
                  >
                    <Text style={styles.quickWithdrawButtonText}>{amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowTreasuryModal(false)}
              >
                <Text style={styles.cancelButtonText}>Kapat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.withdrawAllButton]}
                onPress={() => withdrawFromTreasury(myFamily?.treasury || 0)}
                disabled={loading || !myFamily?.treasury}
              >
                <DollarSign size={16} color="#fff" />
                <Text style={styles.withdrawAllButtonText}>
                  {loading ? 'Çekiliyor...' : 'Tümünü Çek'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Aile Üyelerini Görüntüleme Modal */}
      <Modal
        visible={showViewMembersModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowViewMembersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%', minHeight: 400 }]}>
            <View style={styles.modalHeader}>
              <Users size={24} color="#d4af37" />
              <Text style={styles.modalTitle}>
                {selectedFamilyToView?.name || 'Aile'} - Üyeler
              </Text>
              <TouchableOpacity onPress={() => setShowViewMembersModal(false)}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Yükleniyor...</Text>
                </View>
              ) : viewingFamilyMembers.length > 0 ? (
                <>
                  <Text style={styles.memberCountText}>
                    Toplam {viewingFamilyMembers.length} üye
                  </Text>
                  {viewingFamilyMembers.map(member => (
                    <View key={member.id} style={styles.viewMemberCard}>
                      <View style={styles.viewMemberAvatar}>
                        <Text style={styles.viewMemberAvatarText}>
                          {(member.player_name || 'O').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.viewMemberInfo}>
                        <Text style={styles.viewMemberName}>{member.player_name || 'Oyuncu'}</Text>
                        <View style={styles.viewMemberRole}>
                          <Text style={styles.viewMemberRoleIcon}>
                            {member.role === 'leader' ? '👑' : member.role === 'consigliere' ? '🎩' : member.role === 'sottocapo' ? '⚔️' : member.role === 'capo' ? '⭐' : member.role === 'caporegime' ? '🎖️' : '👤'}
                          </Text>
                          <Text style={styles.viewMemberRoleText}>
                            {member.role === 'leader' ? 'Lider' : member.role === 'consigliere' ? 'Consigliere' : member.role === 'sottocapo' ? 'Sottocapo' : member.role === 'capo' ? 'Capo' : member.role === 'caporegime' ? 'Caporegime' : 'Soldato'}
                          </Text>
                        </View>
                        <Text style={styles.viewMemberContribution}>
                          Katkı: {(member.contribution || 0).toLocaleString()}
                        </Text>
                        {Number(member.assigned_soldiers || 0) > 0 ? (
                          <Text style={styles.viewMemberSoldiers}>
                            🪖 Atanmış Soldato: {(member.assigned_soldiers || 0).toLocaleString()}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.viewMemberStats}>
                        <Text style={styles.viewMemberLevel}>Lvl {member.player_level || 1}</Text>
                        <Text style={styles.viewMemberJoinDate}>
                          {new Date(member.joined_at).toLocaleDateString('tr-TR')}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.noMembersContainer}>
                  <Text style={styles.noMembersText}>Bu ailede üye bulunamadı</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowViewMembersModal(false)}
              >
                <Text style={styles.cancelButtonText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  viewMembersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  viewMembersButtonText: {
    color: '#d4af37',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  memberCountText: {
    fontSize: 14,
    color: '#d4af37',
    marginBottom: 15,
    fontWeight: 'bold',
  },
  viewMemberCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  viewMemberAvatar: {
    width: 45,
    height: 45,
    backgroundColor: '#d4af37',
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  viewMemberAvatarText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewMemberInfo: {
    flex: 1,
  },
  viewMemberName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  viewMemberRole: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  viewMemberRoleIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  viewMemberRoleText: {
    color: '#d4af37',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewMemberContribution: {
    color: '#999',
    fontSize: 12,
    marginBottom: 2,
  },
  viewMemberSoldiers: {
    color: '#4ecdc4',
    fontSize: 11,
  },
  viewMemberStats: {
    alignItems: 'flex-end',
  },
  viewMemberLevel: {
    color: '#66bb6a',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  viewMemberJoinDate: {
    color: '#666',
    fontSize: 11,
  },
  noMembersContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noMembersText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
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

  // Donation Section
  donationSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  donationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  donationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    marginLeft: 10,
  },
  treasuryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  treasuryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#66bb6a',
    marginLeft: 8,
  },
  soldierControlInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#e74c3c',
  },
  soldierControlText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginLeft: 8,
  },
  donationForm: {
    flexDirection: 'column',
    marginBottom: 15,
  },
  donationInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 56,
    width: '100%',
    marginBottom: 10,
  },
  donateButton: {
    backgroundColor: '#d4af37',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  donateButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  donateButtonText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  soldatoBalance: {
    fontSize: 16,
    color: '#66bb6a',
    textAlign: 'left',
    marginBottom: 12,
    fontWeight: '600',
    paddingLeft: 4,
  },
  recentDonations: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  recentDonationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
    marginLeft: 8,
  },
  donationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  donationItemLeft: {
    flex: 1,
  },
  donationDonorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  donationDate: {
    fontSize: 11,
    color: '#666',
  },
  donationAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#66bb6a',
  },

  // Cost Info
  costInfo: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  costInfoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 5,
  },
  costInfoBalance: {
    fontSize: 14,
    color: '#999',
  },

  // Soldato Styles
  memberSoldiers: {
    fontSize: 12,
    color: '#ffa726',
    fontWeight: 'bold',
    marginTop: 4,
  },
  soldierButton: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  soldierButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalBody: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalSection: {
    marginBottom: 15,
  },
  modalLabel: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  modalValue: {
    fontSize: 16,
    color: '#66bb6a',
    fontWeight: 'bold',
  },
  modalInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  cancelButton: {
    backgroundColor: '#666',
    marginRight: 10,
  },
  oldAttackButton: {
    backgroundColor: '#e74c3c',
    marginLeft: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  oldAttackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Dropdown Styles
  dropdownButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#444',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  dropdownArrow: {
    color: '#d4af37',
    fontSize: 12,
  },
  dropdownList: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    marginTop: 5,
    maxHeight: 150,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 16,
  },

  // Leave Family Button
  leaveFamilyButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  leaveFamilyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Member Management Button
  manageButton: {
    backgroundColor: '#6c757d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },

  // Role Grid
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  roleGridItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    width: '48%',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
  },
  roleGridItemActive: {
    borderColor: '#d4af37',
    backgroundColor: '#3a3a2a',
  },
  roleGridItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Kick Button
  kickButton: {
    backgroundColor: '#dc3545',
    marginLeft: 10,
  },
  kickButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Donations Dropdown
  donationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginBottom: 5,
  },
  donationsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // dropdownArrow removed from here to avoid duplicate
  dropdownArrowOpen: {
    transform: [{ rotate: '180deg' }],
  },
  donationsContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 10,
    maxHeight: 300,
  },

  // Treasury Management
  treasuryInfoClickable: {
    borderWidth: 1,
    borderColor: '#d4af37',
    backgroundColor: '#2a2a2a',
  },
  treasuryClickHint: {
    fontSize: 12,
    color: '#d4af37',
    fontStyle: 'italic',
    marginTop: 4,
  },
  treasuryDonationsList: {
    maxHeight: 150,
  },
  treasuryDonationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  treasuryDonorName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  treasuryDonationAmount: {
    fontSize: 14,
    color: '#66bb6a',
    fontWeight: 'bold',
  },
  noDonationsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  quickWithdrawButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickWithdrawButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    padding: 12,
    width: '22%',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickWithdrawButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  quickWithdrawButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  withdrawAllButton: {
    backgroundColor: '#28a745',
    marginLeft: 10,
  },
  withdrawAllButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Donation Type Selector
  donationTypeSelector: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 4,
  },
  donationTypeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  donationTypeButtonActive: {
    backgroundColor: '#d4af37',
  },
  donationTypeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  donationTypeButtonTextActive: {
    color: '#000',
  },

  // Treasury Info Section
  treasuryInfoSection: {
    marginBottom: 15,
  },

  // Leader Cash Control
  leaderCashControl: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 15,
    marginTop: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#ffd700',
  },
  leaderCashControlTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 10,
  },
  withdrawCashButton: {
    backgroundColor: '#ffd700',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  withdrawCashButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Missing donation button styles
  donationButton: {
    backgroundColor: '#d4af37',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    marginTop: 15,
    minHeight: 56,
  },
  donationButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Mansion Styles
  mansionSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#ffd700',
  },
  mansionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  mansionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffd700',
    marginLeft: 10,
  },
  mansionInfo: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 15,
  },
  mansionCurrentLevel: {
    marginBottom: 15,
  },
  mansionLevelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 8,
  },
  mansionIncomeText: {
    fontSize: 16,
    color: '#66bb6a',
    marginBottom: 4,
  },
  mansionDefenseText: {
    fontSize: 16,
    color: '#e74c3c',
    marginBottom: 4,
  },
  mansionTotalIncomeText: {
    fontSize: 16,
    color: '#9c27b0',
    marginBottom: 4,
  },
  mansionControls: {
    flexDirection: 'row',
    gap: 10,
  },
  collectIncomeButton: {
    backgroundColor: '#66bb6a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  collectIncomeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  upgradeMansionButton: {
    backgroundColor: '#2196f3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  upgradeMansionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  noMansionInfo: {
    alignItems: 'center',
    padding: 20,
  },
  noMansionText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  buildMansionButton: {
    backgroundColor: '#ffd700',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
  },
  buildMansionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Mansion Modal Styles
  mansionLevelCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#444',
  },
  mansionLevelCardCurrent: {
    borderColor: '#ffd700',
    backgroundColor: '#3a3a2a',
  },
  mansionLevelCardAvailable: {
    borderColor: '#66bb6a',
  },
  mansionLevelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mansionLevelName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  currentLevelBadge: {
    backgroundColor: '#ffd700',
    color: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  mansionLevelDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 10,
  },
  mansionLevelStats: {
    marginBottom: 10,
  },
  mansionLevelStat: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  mansionActionSection: {
    borderTopWidth: 1,
    borderTopColor: '#444',
    paddingTop: 10,
  },
  mansionDefenseInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#666',
    marginBottom: 10,
  },
  mansionActionButton: {
    backgroundColor: '#ffd700',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  mansionActionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Attack Button Styles
  attackButtonsContainer: {
    marginTop: 15,
  },

  mansionAttackButton: {
    backgroundColor: '#8e44ad',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    width: '100%',
  },
  mansionAttackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 0,
    textAlign: 'center',
  },


  // Attack Modal Styles
  attackWarning: {
    backgroundColor: '#e74c3c',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  attackInputSection: {
    marginBottom: 20,
  },
  attackInputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  attackInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#666',
    marginBottom: 8,
  },
  attackButton: {
    backgroundColor: '#e74c3c',
  },
  attackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  availableSoldiers: {
    fontSize: 14,
    color: '#66bb6a',
    textAlign: 'center',
  },
  targetFamiliesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  targetFamilyCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#444',
  },
  targetFamilyCardSelected: {
    borderColor: '#e74c3c',
    backgroundColor: '#3a2a2a',
  },
  targetFamilyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  targetFamilyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  targetFamilyLevel: {
    fontSize: 14,
    color: '#ffd700',
    fontWeight: 'bold',
  },
  targetFamilyStats: {
    marginBottom: 10,
  },
  targetFamilyStat: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
  },
  attackPrediction: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
  },
  attackPredictionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  attackPredictionText: {
    fontSize: 14,
    marginBottom: 3,
  },
  attackPredictionDetail: {
    fontSize: 12,
    color: '#999',
  },
  noTargetsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    padding: 20,
  },
  confirmAttackButton: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 8,
    marginTop: 20,
  },
  confirmAttackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },


  familyDropdownInfo: {
    flex: 1,
  },
  familyDropdownName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  familyDropdownDetails: {
    fontSize: 14,
    color: '#ccc',
  },
  noFamiliesContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noFamiliesText: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  noFamiliesSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },

  // Mansion Info Styles
  mansionInfoSection: {
    marginBottom: 20,
  },
  mansionInfoCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#ffd700',
  },
  mansionInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 8,
  },
  mansionInfoDetail: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
  },
  dropdownSection: {
    marginBottom: 20,
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 10,
  },
  dropdownItemSelected: {
    backgroundColor: '#3a2a1a',
    borderColor: '#d4af37',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#999',
    fontSize: 16,
    marginTop: 10,
  },

});

export default FamilyScreen;