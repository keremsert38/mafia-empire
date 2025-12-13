import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Send, MessageCircle, Users, Flag, Ban, MoreVertical, X, Shield } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { filterMessage, BANNED_WORD_WARNING } from '@/utils/chatFilter';

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

interface BlockedUser {
  blocked_user_id: string;
  blocked_username: string;
  blocked_at: string;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Engellenen kullanıcılar
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [blockedUsersList, setBlockedUsersList] = useState<BlockedUser[]>([]);

  // Modal states
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [blockedUsersModalVisible, setBlockedUsersModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  // Engellenen kullanıcıları yükle
  const loadBlockedUsers = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('rpc_get_blocked_users');

      if (error) {
        console.error('Error loading blocked users:', error);
        return;
      }

      const blockedIds = (data || []).map((b: BlockedUser) => b.blocked_user_id);
      setBlockedUsers(blockedIds);
      setBlockedUsersList(data || []);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    }
  }, [user]);

  // Mesajları yükle
  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      setMessages(data || []);
      // Scroll to bottom after loading
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Online kullanıcı sayısını güncelle
  const updateOnlineUsers = () => {
    setOnlineUsers(Math.floor(Math.random() * 20) + 5);
  };

  // Mesaj gönder
  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    // İçerik filtreleme kontrolü
    const filterResult = filterMessage(newMessage);
    if (!filterResult.isValid) {
      Alert.alert('⚠️ Uyarı', BANNED_WORD_WARNING);
      return;
    }

    setLoading(true);
    try {
      const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Anonim';

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          username,
          message: newMessage.trim()
        });

      if (error) {
        console.error('Error sending message:', error);
        Alert.alert('Hata', 'Mesaj gönderilemedi!');
        return;
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Hata', 'Mesaj gönderilemedi!');
    } finally {
      setLoading(false);
    }
  };

  // Kullanıcı raporla
  const reportUser = async () => {
    if (!selectedMessage || !reportReason) {
      Alert.alert('Hata', 'Lütfen bir sebep seçin!');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('rpc_report_user', {
        p_reported_user_id: selectedMessage.user_id,
        p_reported_message_id: selectedMessage.id,
        p_reason: reportReason,
        p_description: reportDescription || null
      });

      if (error) {
        Alert.alert('Hata', error.message);
        return;
      }

      const result = data?.[0];
      Alert.alert(
        result?.success ? '✅ Başarılı' : '❌ Hata',
        result?.message || 'Bir hata oluştu'
      );

      setReportModalVisible(false);
      setActionModalVisible(false);
      setReportReason('');
      setReportDescription('');
      setSelectedMessage(null);
    } catch (error) {
      Alert.alert('Hata', 'Rapor gönderilemedi!');
    }
  };

  // Kullanıcı engelle
  const blockUser = async () => {
    if (!selectedMessage) return;

    Alert.alert(
      'Kullanıcıyı Engelle',
      `${selectedMessage.username} kullanıcısını engellemek istediğinize emin misiniz? Bu kullanıcının mesajlarını artık görmeyeceksiniz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Engelle',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data, error } = await supabase.rpc('rpc_block_user', {
                p_blocked_user_id: selectedMessage.user_id
              });

              if (error) {
                Alert.alert('Hata', error.message);
                return;
              }

              const result = data?.[0];
              Alert.alert(
                result?.success ? '✅ Başarılı' : '❌ Hata',
                result?.message || 'Bir hata oluştu'
              );

              if (result?.success) {
                await loadBlockedUsers();
              }

              setActionModalVisible(false);
              setSelectedMessage(null);
            } catch (error) {
              Alert.alert('Hata', 'Engelleme başarısız!');
            }
          }
        }
      ]
    );
  };

  // Engel kaldır
  const unblockUser = async (blockedUserId: string, username: string) => {
    Alert.alert(
      'Engeli Kaldır',
      `${username} kullanıcısının engelini kaldırmak istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Engeli Kaldır',
          onPress: async () => {
            try {
              const { data, error } = await supabase.rpc('rpc_unblock_user', {
                p_blocked_user_id: blockedUserId
              });

              if (error) {
                Alert.alert('Hata', error.message);
                return;
              }

              Alert.alert('✅ Başarılı', 'Kullanıcının engeli kaldırıldı.');
              await loadBlockedUsers();
            } catch (error) {
              Alert.alert('Hata', 'Engel kaldırılamadı!');
            }
          }
        }
      ]
    );
  };

  // Mesaja tıklandığında
  const handleMessagePress = (message: ChatMessage) => {
    // Kendi mesajına tıklanamaz
    if (message.user_id === user?.id) return;

    setSelectedMessage(message);
    setActionModalVisible(true);
  };

  // Real-time subscription
  useEffect(() => {
    loadMessages();
    loadBlockedUsers();
    updateOnlineUsers();

    const subscription = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMessage]);
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();

    const onlineInterval = setInterval(updateOnlineUsers, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(onlineInterval);
    };
  }, [loadBlockedUsers]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isMyMessage = (message: ChatMessage) => {
    return user?.id === message.user_id;
  };

  const isBlockedUser = (userId: string) => {
    return blockedUsers.includes(userId);
  };

  // Engellenen kullanıcıların mesajlarını filtrele
  const filteredMessages = messages.filter(msg => !isBlockedUser(msg.user_id));

  const reportReasons = [
    { id: 'profanity', label: '🤬 Küfür / Hakaret' },
    { id: 'spam', label: '📢 Spam / Reklam' },
    { id: 'harassment', label: '😡 Taciz / Zorbalık' },
    { id: 'inappropriate', label: '🔞 Uygunsuz İçerik' },
    { id: 'other', label: '❓ Diğer' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MessageCircle size={24} color="#d4af37" />
          <Text style={styles.title}>Genel Sohbet</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.blockedButton}
            onPress={() => setBlockedUsersModalVisible(true)}
          >
            <Shield size={18} color="#ff6b6b" />
          </TouchableOpacity>
          <View style={styles.onlineIndicator}>
            <Users size={16} color="#66bb6a" />
            <Text style={styles.onlineText}>{onlineUsers} online</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredMessages.map((message) => (
          <TouchableOpacity
            key={message.id}
            onPress={() => handleMessagePress(message)}
            activeOpacity={isMyMessage(message) ? 1 : 0.7}
            disabled={isMyMessage(message)}
          >
            <View
              style={[
                styles.messageContainer,
                isMyMessage(message) ? styles.myMessage : styles.otherMessage
              ]}
            >
              <View style={styles.messageHeader}>
                <Text style={[
                  styles.username,
                  isMyMessage(message) ? styles.myUsername : styles.otherUsername
                ]}>
                  {isMyMessage(message) ? 'Sen' : message.username}
                </Text>
                <Text style={styles.timestamp}>
                  {formatTime(message.created_at)}
                </Text>
              </View>
              <Text style={[
                styles.messageText,
                isMyMessage(message) ? styles.myMessageText : styles.otherMessageText
              ]}>
                {message.message}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Mesajınızı yazın..."
          placeholderTextColor="#666"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={loading || !newMessage.trim()}
        >
          <Send size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Action Modal */}
      <Modal visible={actionModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActionModalVisible(false)}
        >
          <View style={styles.actionModal}>
            <Text style={styles.actionModalTitle}>
              {selectedMessage?.username}
            </Text>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setActionModalVisible(false);
                setReportModalVisible(true);
              }}
            >
              <Flag size={20} color="#ffa726" />
              <Text style={styles.actionButtonText}>Raporla</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.blockActionButton]}
              onPress={blockUser}
            >
              <Ban size={20} color="#ff6b6b" />
              <Text style={[styles.actionButtonText, styles.blockText]}>Engelle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setActionModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Modal */}
      <Modal visible={reportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.reportModal}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>🚨 Kullanıcı Raporla</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <X size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <Text style={styles.reportSubtitle}>
              {selectedMessage?.username} kullanıcısını raporluyorsunuz
            </Text>

            <Text style={styles.reportLabel}>Rapor Sebebi:</Text>
            <View style={styles.reasonsContainer}>
              {reportReasons.map(reason => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonButton,
                    reportReason === reason.id && styles.reasonButtonActive
                  ]}
                  onPress={() => setReportReason(reason.id)}
                >
                  <Text style={[
                    styles.reasonButtonText,
                    reportReason === reason.id && styles.reasonButtonTextActive
                  ]}>
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.reportLabel}>Ek Açıklama (Opsiyonel):</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Detay ekleyin..."
              placeholderTextColor="#666"
              value={reportDescription}
              onChangeText={setReportDescription}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              style={[styles.reportSubmitButton, !reportReason && styles.reportSubmitButtonDisabled]}
              onPress={reportUser}
              disabled={!reportReason}
            >
              <Text style={styles.reportSubmitButtonText}>Rapor Gönder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Blocked Users Modal */}
      <Modal visible={blockedUsersModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.blockedModal}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>🛡️ Engellenen Kullanıcılar</Text>
              <TouchableOpacity onPress={() => setBlockedUsersModalVisible(false)}>
                <X size={24} color="#999" />
              </TouchableOpacity>
            </View>

            {blockedUsersList.length === 0 ? (
              <Text style={styles.noBlockedText}>
                Henüz engellediğiniz kullanıcı yok.
              </Text>
            ) : (
              <ScrollView style={styles.blockedList}>
                {blockedUsersList.map(blocked => (
                  <View key={blocked.blocked_user_id} style={styles.blockedItem}>
                    <View style={styles.blockedInfo}>
                      <Text style={styles.blockedUsername}>{blocked.blocked_username}</Text>
                      <Text style={styles.blockedDate}>
                        {new Date(blocked.blocked_at).toLocaleDateString('tr-TR')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.unblockButton}
                      onPress={() => unblockUser(blocked.blocked_user_id, blocked.blocked_username)}
                    >
                      <Text style={styles.unblockButtonText}>Engeli Kaldır</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#d4af37',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
    marginLeft: 8,
  },
  blockedButton: {
    backgroundColor: '#2a1a1a',
    padding: 8,
    borderRadius: 8,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineText: {
    color: '#66bb6a',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  messagesContainer: {
    flex: 1,
    padding: 15,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  myUsername: {
    color: '#d4af37',
  },
  otherUsername: {
    color: '#4ecdc4',
  },
  timestamp: {
    fontSize: 10,
    color: '#666',
    marginLeft: 8,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
    padding: 10,
    borderRadius: 12,
  },
  myMessageText: {
    backgroundColor: '#d4af37',
    color: '#000',
  },
  otherMessageText: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#fff',
    marginRight: 10,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#d4af37',
    padding: 12,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  // Action Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    borderWidth: 1,
    borderColor: '#333',
  },
  actionModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    textAlign: 'center',
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  blockActionButton: {
    backgroundColor: '#2a1a1a',
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  blockText: {
    color: '#ff6b6b',
  },
  cancelButton: {
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 14,
  },
  // Report Modal
  reportModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  reportSubtitle: {
    color: '#999',
    marginBottom: 15,
  },
  reportLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  reasonButton: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  reasonButtonActive: {
    backgroundColor: '#d4af37',
    borderColor: '#d4af37',
  },
  reasonButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  reasonButtonTextActive: {
    color: '#000',
  },
  descriptionInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  reportSubmitButton: {
    backgroundColor: '#ff6b6b',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  reportSubmitButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  reportSubmitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Blocked Modal
  blockedModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  noBlockedText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
  blockedList: {
    maxHeight: 300,
  },
  blockedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  blockedInfo: {
    flex: 1,
  },
  blockedUsername: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  blockedDate: {
    color: '#666',
    fontSize: 12,
  },
  unblockButton: {
    backgroundColor: '#66bb6a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  unblockButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});