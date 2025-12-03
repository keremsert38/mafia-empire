import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { Bell, X, Sword, Shield, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
    id: string;
    type: 'attack' | 'defense' | 'family' | 'system';
    title: string;
    message: string;
    data: any;
    is_read: boolean;
    created_at: string;
}

interface NotificationsModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function NotificationsModal({ visible, onClose }: NotificationsModalProps) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (visible && user) {
            loadNotifications();
        }
    }, [visible, user]);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('player_notifications')
                .select('*')
                .eq('player_id', user?.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setNotifications(data || []);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadNotifications();
    };

    const markAsRead = async (notificationId: string) => {
        try {
            await supabase
                .from('player_notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            // Güncelle
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'attack':
                return <Sword size={20} color="#ff6b6b" />;
            case 'defense':
                return <Shield size={20} color="#4ecdc4" />;
            case 'family':
                return <Bell size={20} color="#d4af37" />;
            default:
                return <AlertCircle size={20} color="#999" />;
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Az önce';
        if (minutes < 60) return `${minutes} dakika önce`;
        if (hours < 24) return `${hours} saat önce`;
        return `${days} gün önce`;
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <View style={styles.headerContent}>
                            <Bell size={24} color="#d4af37" />
                            <Text style={styles.title}>Bildirimler</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#999" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.content}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d4af37" />
                        }
                    >
                        {loading && notifications.length === 0 ? (
                            <Text style={styles.emptyText}>Yükleniyor...</Text>
                        ) : notifications.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Bell size={48} color="#666" />
                                <Text style={styles.emptyTitle}>Henüz bildirim yok</Text>
                                <Text style={styles.emptySubtitle}>
                                    Saldırıya uğradığınızda veya önemli olaylar olduğunda burada göreceksiniz
                                </Text>
                            </View>
                        ) : (
                            notifications.map((notification) => (
                                <TouchableOpacity
                                    key={notification.id}
                                    style={[
                                        styles.notificationItem,
                                        !notification.is_read && styles.unreadNotification
                                    ]}
                                    onPress={() => markAsRead(notification.id)}
                                >
                                    <View style={styles.notificationIcon}>
                                        {getNotificationIcon(notification.type)}
                                    </View>
                                    <View style={styles.notificationContent}>
                                        <Text style={styles.notificationTitle}>{notification.title}</Text>
                                        <Text style={styles.notificationMessage}>{notification.message}</Text>
                                        <Text style={styles.notificationTime}>{formatTime(notification.created_at)}</Text>
                                    </View>
                                    {!notification.is_read && <View style={styles.unreadDot} />}
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
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
        width: '95%',
        height: '85%',
        borderWidth: 2,
        borderColor: '#d4af37',
        marginTop: 60,
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
        gap: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#d4af37',
    },
    closeButton: {
        padding: 5,
    },
    content: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 100,
    },
    emptyText: {
        color: '#999',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#999',
        marginTop: 20,
        marginBottom: 10,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
        backgroundColor: '#1a1a1a',
    },
    unreadNotification: {
        backgroundColor: '#2a1a1a',
    },
    notificationIcon: {
        marginRight: 15,
        marginTop: 2,
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    notificationMessage: {
        fontSize: 14,
        color: '#ccc',
        lineHeight: 20,
        marginBottom: 5,
    },
    notificationTime: {
        fontSize: 12,
        color: '#666',
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ff6b6b',
        marginLeft: 10,
        marginTop: 5,
    },
});
