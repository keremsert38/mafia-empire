import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { User, Camera, X, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

interface ProfileEditModalProps {
    visible: boolean;
    onClose: () => void;
    currentPhotoUrl?: string | null;
    username: string;
    onPhotoSelected: (photoUri: string) => Promise<void>;
}

export default function ProfileEditModal({
    visible,
    onClose,
    currentPhotoUrl,
    username,
    onPhotoSelected,
}: ProfileEditModalProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        try {
            // İzin kontrolü
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Galeri erişimi için izin vermeniz gerekiyor!');
                return;
            }

            // Fotoğraf seç
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1], // Kare fotoğraf
                quality: 0.5,
            });

            if (!result.canceled && result.assets[0]) {
                const imageUri = result.assets[0].uri;
                const compressedImage = await compressImage(imageUri);
                setSelectedImage(compressedImage);
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu!');
        }
    };

    const compressImage = async (uri: string): Promise<string> => {
        try {
            let quality = 0.7;
            let compressedUri = uri;
            let fileSize = Infinity;

            // 45KB altına düşene kadar sıkıştır
            while (fileSize > 45000 && quality > 0.1) {
                const manipulatedImage = await ImageManipulator.manipulateAsync(
                    uri,
                    [{ resize: { width: 400 } }], // 400px genişlik
                    { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
                );

                // Dosya boyutunu kontrol et
                const response = await fetch(manipulatedImage.uri);
                const blob = await response.blob();
                fileSize = blob.size;

                compressedUri = manipulatedImage.uri;
                quality -= 0.1;

                console.log(`Compressed to ${(fileSize / 1024).toFixed(2)}KB with quality ${quality.toFixed(2)}`);
            }

            if (fileSize > 45000) {
                Alert.alert('Uyarı', 'Fotoğraf 45KB altına sıkıştırılamadı. Daha küçük bir fotoğraf seçin.');
                return uri;
            }

            return compressedUri;
        } catch (error) {
            console.error('Image compression error:', error);
            return uri;
        }
    };

    const handleSave = async () => {
        if (!selectedImage) {
            Alert.alert('Hata', 'Lütfen bir fotoğraf seçin!');
            return;
        }

        setUploading(true);
        try {
            await onPhotoSelected(selectedImage);
            Alert.alert('Başarılı', 'Profil fotoğrafınız güncellendi!');
            setSelectedImage(null);
            onClose();
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Fotoğraf yüklenirken bir hata oluştu!');
        } finally {
            setUploading(false);
        }
    };

    const displayImage = selectedImage || currentPhotoUrl;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Profil Bilgileri</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#999" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        {/* Profil Fotoğrafı */}
                        <View style={styles.photoSection}>
                            <View style={styles.photoContainer}>
                                {displayImage ? (
                                    <Image source={{ uri: displayImage }} style={styles.photo} />
                                ) : (
                                    <View style={styles.photoPlaceholder}>
                                        <User size={60} color="#666" />
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity
                                style={styles.changePhotoButton}
                                onPress={pickImage}
                                disabled={uploading}
                            >
                                <Camera size={20} color="#fff" />
                                <Text style={styles.changePhotoText}>
                                    {displayImage ? 'Fotoğrafı Değiştir' : 'Fotoğraf Ekle'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Kullanıcı Bilgileri */}
                        <View style={styles.infoSection}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Kullanıcı Adı:</Text>
                                <Text style={styles.infoValue}>{username}</Text>
                            </View>
                        </View>

                        {/* Bilgi Notu */}
                        <View style={styles.noteBox}>
                            <Text style={styles.noteText}>
                                📸 Profil fotoğrafınız maksimum 45KB olmalıdır.
                            </Text>
                            <Text style={styles.noteText}>
                                ✂️ Fotoğraf otomatik olarak kare formatta kesilecektir.
                            </Text>
                        </View>

                        {/* Kaydet Butonu */}
                        {selectedImage && (
                            <TouchableOpacity
                                style={[styles.saveButton, uploading && styles.saveButtonDisabled]}
                                onPress={handleSave}
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Check size={20} color="#fff" />
                                        <Text style={styles.saveButtonText}>Kaydet</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        backgroundColor: '#1a1a1a',
        borderRadius: 15,
        width: '90%',
        maxHeight: '80%',
        borderWidth: 2,
        borderColor: '#d4af37',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
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
        padding: 20,
    },
    photoSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    photoContainer: {
        width: 150,
        height: 150,
        borderRadius: 75,
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: '#d4af37',
        marginBottom: 15,
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photoPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#2a2a2a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    changePhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4a4a4a',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        gap: 8,
    },
    changePhotoText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    infoSection: {
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
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
    noteBox: {
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
    },
    noteText: {
        color: '#999',
        fontSize: 12,
        marginBottom: 5,
    },
    saveButton: {
        backgroundColor: '#d4af37',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 10,
        gap: 8,
    },
    saveButtonDisabled: {
        backgroundColor: '#666',
        opacity: 0.6,
    },
    saveButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
