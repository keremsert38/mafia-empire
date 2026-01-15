import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';
import { X, Factory, Clock, DollarSign, Zap, CheckCircle, Minus, Plus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface Recipe {
    recipe_id: string;
    recipe_name: string;
    output_resource_name: string;
    output_icon: string;
    output_image_url?: string;
    output_quantity: number;
    production_time: number;
    cost: number;
    ingredients: {
        resource_id: string;
        resource_name: string;
        icon: string;
        image_url?: string;
        quantity: number;
    }[] | null;
}

interface ProductionItem {
    id: string;
    recipe_name: string;
    output_icon: string;
    quantity: number;
    completes_at: string;
    is_completed: boolean;
}

interface PlayerResource {
    resource_id: string;
    resource_name: string;
    icon: string;
    quantity: number;
}

interface FactoryProductionModalProps {
    visible: boolean;
    onClose: () => void;
    factoryId: string;
    factoryName: string;
}

export default function FactoryProductionModal({
    visible,
    onClose,
    factoryId,
    factoryName,
}: FactoryProductionModalProps) {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [playerResources, setPlayerResources] = useState<PlayerResource[]>([]);
    const [productionQueue, setProductionQueue] = useState<ProductionItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [producing, setProducing] = useState(false);
    const [selectedQuantities, setSelectedQuantities] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        if (visible && factoryId) {
            loadData();
        }
    }, [visible, factoryId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Önce tamamlanan üretimleri otomatik topla
            await supabase.rpc('check_and_collect_productions');

            const { data: recipesData, error: recipesError } = await supabase
                .rpc('get_factory_recipes', { p_business_id: factoryId });

            if (!recipesError) {
                setRecipes(recipesData || []);
                // Default miktarları ayarla
                const defaultQtys: { [key: string]: number } = {};
                (recipesData || []).forEach((r: Recipe) => {
                    defaultQtys[r.recipe_id] = 1;
                });
                setSelectedQuantities(defaultQtys);
            }

            const { data: resourcesData } = await supabase.rpc('get_player_inventory');
            setPlayerResources(resourcesData || []);

            const { data: queueData } = await supabase
                .from('production_queue')
                .select('*')
                .eq('business_id', factoryId)
                .eq('is_collected', false)
                .order('completes_at', { ascending: true });

            setProductionQueue(queueData || []);
        } catch (error) {
            console.error('Load data error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Maksimum üretilebilir miktar (max 1000)
    const getMaxQuantity = (recipe: Recipe) => {
        if (!recipe.ingredients || recipe.ingredients.length === 0) return 1000;

        let maxQty = 1000;
        for (const ing of recipe.ingredients) {
            const playerResource = playerResources.find(r => r.resource_id === ing.resource_id);
            if (!playerResource) return 0;
            const possible = Math.floor(playerResource.quantity / ing.quantity);
            maxQty = Math.min(maxQty, possible);
        }
        return Math.min(1000, Math.max(0, maxQty));
    };

    // Miktar güncelle
    const updateQuantity = (recipeId: string, delta: number) => {
        setSelectedQuantities(prev => {
            const current = prev[recipeId] || 1;
            const newQty = Math.max(1, current + delta);
            return { ...prev, [recipeId]: newQty };
        });
    };

    // Belirli miktara ayarla
    const setQuantity = (recipeId: string, qty: number, maxQty: number) => {
        const finalQty = qty === -1 ? maxQty : Math.min(qty, maxQty);
        setSelectedQuantities(prev => ({ ...prev, [recipeId]: Math.max(1, finalQty) }));
    };

    // Malzeme yeterliliğini kontrol et
    const hasEnoughResources = (recipe: Recipe, quantity: number) => {
        if (!recipe.ingredients) return true;

        for (const ing of recipe.ingredients) {
            const playerResource = playerResources.find(r => r.resource_id === ing.resource_id);
            if (!playerResource || playerResource.quantity < ing.quantity * quantity) {
                return false;
            }
        }
        return true;
    };

    // Üretim başlat
    const startProduction = async (recipe: Recipe, quantity: number) => {
        setProducing(true);
        try {
            const { data, error } = await supabase.rpc('start_production', {
                p_business_id: factoryId,
                p_recipe_id: recipe.recipe_id,
                p_quantity: quantity
            });

            if (error) {
                Alert.alert('Hata', error.message);
                return;
            }

            const result = data as { success: boolean; message: string };
            if (result.success) {
                Alert.alert('✅ Başarılı', `${quantity}x ${recipe.output_resource_name} üretimi başladı!`);
                loadData();
            } else {
                Alert.alert('Hata', result.message);
            }
        } catch (error) {
            Alert.alert('Hata', 'Üretim başlatılamadı');
        } finally {
            setProducing(false);
        }
    };

    const collectProduction = async (queueId: string) => {
        try {
            const { data, error } = await supabase.rpc('collect_production', {
                p_queue_id: queueId
            });

            if (error) {
                Alert.alert('Hata', error.message);
                return;
            }

            const result = data as { success: boolean; message: string };
            if (result.success) {
                Alert.alert('✅ Toplandı!', result.message);
                loadData();
            } else {
                Alert.alert('Hata', result.message);
            }
        } catch (error) {
            Alert.alert('Hata', 'Üretim toplanamadı');
        }
    };

    const getRemainingTime = (completesAt: string) => {
        const remaining = new Date(completesAt).getTime() - Date.now();
        if (remaining <= 0) return 'Hazır!';

        const minutes = Math.floor(remaining / 60000);
        if (minutes > 60) {
            const hours = Math.floor(minutes / 60);
            return `${hours}sa ${minutes % 60}dk`;
        }
        return `${minutes}dk`;
    };

    const isReady = (completesAt: string) => new Date(completesAt).getTime() <= Date.now();

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Factory size={24} color="#a855f7" />
                            <Text style={styles.title}>{factoryName}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#999" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#a855f7" />
                            <Text style={styles.loadingText}>Yükleniyor...</Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                            {/* Envanter */}
                            {playerResources.length > 0 && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>📦 Envanteriniz</Text>
                                    <View style={styles.resourcesGrid}>
                                        {playerResources.map((resource) => (
                                            <View key={resource.resource_id} style={styles.resourceItem}>
                                                <Text style={styles.resourceIcon}>{resource.icon}</Text>
                                                <Text style={styles.resourceQuantity}>{resource.quantity}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Üretim Kuyruğu */}
                            {productionQueue.length > 0 && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>⏳ Üretim Kuyruğu</Text>
                                    {productionQueue.map((item) => (
                                        <View key={item.id} style={styles.queueItem}>
                                            <View style={styles.queueInfo}>
                                                <Text style={styles.queueIcon}>{item.output_icon}</Text>
                                                <View>
                                                    <Text style={styles.queueName}>x{item.quantity}</Text>
                                                    <Text style={[styles.queueTime, isReady(item.completes_at) && styles.queueReady]}>
                                                        {getRemainingTime(item.completes_at)}
                                                    </Text>
                                                </View>
                                            </View>
                                            {isReady(item.completes_at) && (
                                                <TouchableOpacity style={styles.collectButton} onPress={() => collectProduction(item.id)}>
                                                    <CheckCircle size={16} color="#fff" />
                                                    <Text style={styles.collectButtonText}>Topla</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Tarifler */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>🔧 Üretim Tarifleri</Text>
                                {recipes.length === 0 ? (
                                    <Text style={styles.noRecipes}>Bu fabrika için tarif bulunamadı.</Text>
                                ) : (
                                    recipes.map((recipe) => {
                                        const maxQty = getMaxQuantity(recipe);
                                        const selectedQty = selectedQuantities[recipe.recipe_id] || 1;
                                        const canProduce = hasEnoughResources(recipe, selectedQty);
                                        const totalCost = recipe.cost * selectedQty;
                                        const totalTime = recipe.production_time * selectedQty;

                                        return (
                                            <View key={recipe.recipe_id} style={styles.recipeCard}>
                                                <View style={styles.recipeHeader}>
                                                    {recipe.output_image_url ? (
                                                        <Image
                                                            source={{ uri: recipe.output_image_url }}
                                                            style={styles.recipeImage}
                                                        />
                                                    ) : (
                                                        <Text style={styles.recipeIcon}>{recipe.output_icon}</Text>
                                                    )}
                                                    <View style={styles.recipeInfo}>
                                                        <Text style={styles.recipeName}>{recipe.output_resource_name}</Text>
                                                        <Text style={styles.recipeOutput}>x{recipe.output_quantity} / üretim</Text>
                                                    </View>
                                                </View>

                                                {/* Malzemeler */}
                                                {recipe.ingredients && recipe.ingredients.length > 0 && (
                                                    <View style={styles.ingredientsContainer}>
                                                        <Text style={styles.ingredientsLabel}>Malzemeler (x{selectedQty}):</Text>
                                                        <View style={styles.ingredientsList}>
                                                            {recipe.ingredients.map((ing, idx) => {
                                                                const playerRes = playerResources.find(r => r.resource_id === ing.resource_id);
                                                                const needed = ing.quantity * selectedQty;
                                                                const hasEnough = playerRes && playerRes.quantity >= needed;
                                                                return (
                                                                    <View key={idx} style={styles.ingredientItem}>
                                                                        <Text style={styles.ingredientIcon}>{ing.icon}</Text>
                                                                        <Text style={[styles.ingredientQuantity, !hasEnough && styles.insufficientQuantity]}>
                                                                            {needed}
                                                                        </Text>
                                                                    </View>
                                                                );
                                                            })}
                                                        </View>
                                                    </View>
                                                )}

                                                {/* Miktar Seçici */}
                                                <View style={styles.quantitySection}>
                                                    <Text style={styles.quantityLabel}>Miktar:</Text>
                                                    <View style={styles.quantityControls}>
                                                        <TouchableOpacity
                                                            style={styles.qtyBtn}
                                                            onPress={() => updateQuantity(recipe.recipe_id, -1)}
                                                        >
                                                            <Minus size={16} color="#fff" />
                                                        </TouchableOpacity>
                                                        <Text style={styles.qtyValue}>{selectedQty}</Text>
                                                        <TouchableOpacity
                                                            style={styles.qtyBtn}
                                                            onPress={() => updateQuantity(recipe.recipe_id, 1)}
                                                            disabled={selectedQty >= maxQty}
                                                        >
                                                            <Plus size={16} color="#fff" />
                                                        </TouchableOpacity>
                                                    </View>
                                                    <View style={styles.presetButtons}>
                                                        <TouchableOpacity style={styles.presetBtn} onPress={() => setQuantity(recipe.recipe_id, 10, maxQty)}>
                                                            <Text style={styles.presetBtnText}>10</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity style={styles.presetBtn} onPress={() => setQuantity(recipe.recipe_id, 100, maxQty)}>
                                                            <Text style={styles.presetBtnText}>100</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity style={styles.presetBtn} onPress={() => setQuantity(recipe.recipe_id, 500, maxQty)}>
                                                            <Text style={styles.presetBtnText}>500</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity style={[styles.presetBtn, styles.maxBtn]} onPress={() => setQuantity(recipe.recipe_id, 1000, maxQty)}>
                                                            <Text style={styles.presetBtnText}>MAX</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>

                                                {/* Alt bilgiler */}
                                                <View style={styles.recipeFooter}>
                                                    <View style={styles.recipeStat}>
                                                        <Clock size={14} color="#ffa726" />
                                                        <Text style={styles.recipeStatText}>{totalTime}dk</Text>
                                                    </View>
                                                    <View style={styles.recipeStat}>
                                                        <DollarSign size={14} color="#66bb6a" />
                                                        <Text style={styles.recipeStatText}>${totalCost.toLocaleString()}</Text>
                                                    </View>
                                                    <Text style={styles.outputTotal}>= {recipe.output_quantity * selectedQty}x {recipe.output_icon}</Text>
                                                </View>

                                                {/* Üretim Butonu */}
                                                <TouchableOpacity
                                                    style={[styles.produceButton, (!canProduce || producing || maxQty === 0) && styles.produceButtonDisabled]}
                                                    onPress={() => startProduction(recipe, selectedQty)}
                                                    disabled={!canProduce || producing || maxQty === 0}
                                                >
                                                    <Zap size={16} color="#fff" />
                                                    <Text style={styles.produceButtonText}>
                                                        {producing ? 'Üretiliyor...' : maxQty === 0 ? 'Malzeme Yok' : `${selectedQty}x ÜRET`}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })
                                )}
                            </View>
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', justifyContent: 'center', alignItems: 'center' },
    modal: { backgroundColor: '#0d0d0d', borderRadius: 20, width: '95%', height: '90%', borderWidth: 2, borderColor: '#a855f7', overflow: 'hidden' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#1a1a1a', borderBottomWidth: 2, borderBottomColor: '#a855f7' },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#a855f7' },
    closeButton: { padding: 5 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#999', marginTop: 10 },
    content: { flex: 1, padding: 15 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#d4af37', marginBottom: 12 },
    resourcesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    resourceItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 5 },
    resourceIcon: { fontSize: 16 },
    resourceQuantity: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    queueItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#333' },
    queueInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    queueIcon: { fontSize: 24 },
    queueName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    queueTime: { color: '#ffa726', fontSize: 12 },
    queueReady: { color: '#66bb6a', fontWeight: 'bold' },
    collectButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#66bb6a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 5 },
    collectButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    noRecipes: { color: '#666', textAlign: 'center', padding: 20 },
    recipeCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
    recipeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    recipeIcon: { fontSize: 32, marginRight: 12 },
    recipeImage: { width: 48, height: 48, borderRadius: 8, marginRight: 12, backgroundColor: '#333' },
    recipeInfo: { flex: 1 },
    recipeName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    recipeOutput: { color: '#66bb6a', fontSize: 12 },
    ingredientsContainer: { backgroundColor: '#0d0d0d', padding: 10, borderRadius: 8, marginBottom: 10 },
    ingredientsLabel: { color: '#999', fontSize: 11, marginBottom: 6 },
    ingredientsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    ingredientItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
    ingredientIcon: { fontSize: 14 },
    ingredientQuantity: { color: '#66bb6a', fontSize: 12, fontWeight: 'bold' },
    insufficientQuantity: { color: '#ff6b6b' },
    quantitySection: { backgroundColor: '#0d0d0d', padding: 12, borderRadius: 8, marginBottom: 10 },
    quantityLabel: { color: '#999', fontSize: 11, marginBottom: 8 },
    quantityControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15, marginBottom: 10 },
    qtyBtn: { backgroundColor: '#a855f7', padding: 8, borderRadius: 8 },
    qtyValue: { color: '#fff', fontSize: 24, fontWeight: 'bold', minWidth: 50, textAlign: 'center' },
    presetButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    presetBtn: { flex: 1, backgroundColor: '#333', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    maxBtn: { backgroundColor: '#a855f7' },
    presetBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    recipeFooter: { flexDirection: 'row', gap: 15, marginBottom: 10, alignItems: 'center' },
    recipeStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    recipeStatText: { color: '#999', fontSize: 12 },
    outputTotal: { color: '#66bb6a', fontSize: 12, fontWeight: 'bold', marginLeft: 'auto' },
    produceButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#a855f7', padding: 12, borderRadius: 10, gap: 8 },
    produceButtonDisabled: { backgroundColor: '#444', opacity: 0.7 },
    produceButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
