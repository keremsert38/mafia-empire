import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Send, MessageCircle, Users } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

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

  // Online kullanıcı sayısını güncelle (basit simülasyon)
  const updateOnlineUsers = () => {
    setOnlineUsers(Math.floor(Math.random() * 20) + 5); // 5-25 arası random
  };

  // Mesaj gönder
  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

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

  // Real-time subscription
  useEffect(() => {
    loadMessages();
    updateOnlineUsers();

    // Real-time subscription
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
          // Auto scroll to bottom
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();

    // Online users güncelleme
    const onlineInterval = setInterval(updateOnlineUsers, 30000); // 30 saniyede bir

    return () => {
      subscription.unsubscribe();
      clearInterval(onlineInterval);
    };
  }, []);

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MessageCircle size={24} color="#d4af37" />
          <Text style={styles.title}>Genel Sohbet</Text>
        </View>
        <View style={styles.onlineIndicator}>
          <Users size={16} color="#66bb6a" />
          <Text style={styles.onlineText}>{onlineUsers} online</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View 
            key={message.id} 
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
    marginLeft: 8,
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
});