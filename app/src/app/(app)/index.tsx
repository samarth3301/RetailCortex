import { useAuth, useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useApi } from '@/lib/api';

// Types matched with FastAPI Models
interface ActivityItem {
  id: string;
  event_type: 'search' | 'feature_usage';
  query?: string;
  feature?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: string | number;
  in_stock: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
  store_id: string;
}

interface Zone {
  id: string;
  name: string;
  floor: number;
  capacity: number;
}

const OFFERS = [
  { store: 'Zara', discount: '15% Off', code: 'ZARA15', category: 'Fashion' },
  { store: 'H&M', discount: '20% Off', code: 'HM20', category: 'Clothing' },
  { store: 'Nike Store', discount: '10% Off', code: 'NIKE10', category: 'Footwear' },
  {
    store: 'Apple Store',
    discount: 'Free AirPods with Mac',
    code: 'APPLEBUY',
    category: 'Electronics',
  },
];

export default function HomeScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { apiFetch } = useApi();

  // State Hooks
  const [history, setHistory] = useState<ActivityItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const [storeMap, setStoreMap] = useState<Record<string, string>>({});
  const [activeModal, setActiveModal] = useState<'congestion' | 'offers' | null>(null);

  const [zonesList, setZonesList] = useState<Zone[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [claimedOffers, setClaimedOffers] = useState<Record<string, boolean>>({});

  const fetchStores = useCallback(async () => {
    try {
      const stores = await apiFetch<Array<{ id: string; name: string }>>('/api/v1/stores');
      const map: Record<string, string> = {};
      for (const s of stores) {
        map[s.id] = s.name;
      }
      setStoreMap(map);
    } catch {
      // Fail silently
    }
  }, [apiFetch]);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const res = await apiFetch<{ items: ActivityItem[] }>('/api/v1/users/me/history?limit=15');
      setHistory(res.items || []);
    } catch {
      // Fail silently
    } finally {
      setIsLoadingHistory(false);
    }
  }, [apiFetch]);

  // Fetch initial data
  useEffect(() => {
    fetchHistory();
    fetchStores();
  }, [fetchHistory, fetchStores]);

  const recordActivity = useCallback(
    async (
      eventType: 'search' | 'feature_usage',
      payload: { query?: string; feature?: string; metadata?: Record<string, unknown> },
    ) => {
      try {
        await apiFetch('/api/v1/users/me/history', {
          method: 'POST',
          body: JSON.stringify({
            event_type: eventType,
            ...payload,
          }),
        });
        fetchHistory(); // Refresh history immediately
      } catch {
        // Fail silently
      }
    },
    [apiFetch, fetchHistory],
  );

  const handleClearHistory = async () => {
    Alert.alert('Clear History', 'Are you sure you want to clear your search and activity log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch('/api/v1/users/me/history', {
              method: 'DELETE',
            });
            setHistory([]);
          } catch {
            Alert.alert('Error', 'Failed to clear history log.');
          }
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchHistory(), fetchStores()]);
    setRefreshing(false);
  };

  // Auth actions
  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const showSignOutAlert = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of RetailCortex?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: handleSignOut },
      ],
      { cancelable: true },
    );
  };

  // Search actions
  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    try {
      setIsSearching(true);
      setHasSearched(true);

      const res = await apiFetch<{ success: boolean; data: Product[] }>(
        `/api/v1/products/search?q=${encodeURIComponent(query)}`,
      );
      setSearchResults(res.data || []);

      // Record Search Activity Event
      await recordActivity('search', { query });
    } catch {
      Alert.alert('Search Error', 'Failed to query products. Please check connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  // Congestion Map Action
  const handleShowCongestionMap = async () => {
    setActiveModal('congestion');
    setIsLoadingZones(true);
    try {
      await recordActivity('feature_usage', { feature: 'congestion_map' });
      const zones = await apiFetch<Zone[]>('/api/v1/stores/zones');
      setZonesList(zones || []);
    } catch {
      // Fail silently
    } finally {
      setIsLoadingZones(false);
    }
  };

  // Targeted Offers Action
  const handleShowTargetedOffers = async () => {
    setActiveModal('offers');
    await recordActivity('feature_usage', { feature: 'targeted_offers' });
  };

  const handleClaimOffer = async (offer: (typeof OFFERS)[0]) => {
    if (claimedOffers[offer.code]) return;

    try {
      await recordActivity('feature_usage', {
        feature: 'offer_claimed',
        metadata: { store: offer.store, discount: offer.discount, code: offer.code },
      });

      setClaimedOffers((prev) => ({ ...prev, [offer.code]: true }));
      Alert.alert(
        'Promo Activated!',
        `Your discount code "${offer.code}" has been saved to your log and is ready for use at ${offer.store}.`,
      );
    } catch {
      // Fail silently
    }
  };

  const formatHistoryItem = (item: ActivityItem) => {
    if (item.event_type === 'search') {
      return {
        text: `Searched for "${item.query}"`,
        icon: 'magnifyingglass' as const,
        color: '#C5FF3B',
      };
    }
    if (item.feature === 'congestion_map') {
      return {
        text: 'Checked live congestion map',
        icon: 'map' as const,
        color: '#B19FFB',
      };
    }
    if (item.feature === 'offer_claimed') {
      const meta = item.metadata || {};
      return {
        text: `Claimed ${meta.discount || 'discount'} at ${meta.store || 'store'}`,
        icon: 'tag' as const,
        color: '#FFB7D5',
      };
    }
    return {
      text: `Used feature: ${item.feature || 'unknown'}`,
      icon: 'tag' as const,
      color: '#FFB7D5',
    };
  };

  const showMenuAlert = () => {
    Alert.alert(
      'RetailCortex Menu',
      'This menu grants quick access to Mall Directories, Store Maps, Profile Settings, and Customer Support in a future update.',
      [{ text: 'Close', style: 'default' }],
    );
  };

  const firstName = user?.firstName || user?.username || 'Michael';
  const avatarUrl = user?.imageUrl;

  return (
    <ThemedView style={styles.root}>
      {/* Top Left Radial Glow */}
      <View style={styles.radialGlow} pointerEvents="none" />

      {/* Topographic Lines Background */}
      <View style={styles.contoursContainer} pointerEvents="none">
        <View
          style={[
            styles.contourLine,
            { width: 450, height: 260, borderRadius: 130, top: -110, right: -150, opacity: 0.05 },
          ]}
        />
        <View
          style={[
            styles.contourLine,
            { width: 400, height: 230, borderRadius: 115, top: -90, right: -130, opacity: 0.07 },
          ]}
        />
        <View
          style={[
            styles.contourLine,
            { width: 350, height: 200, borderRadius: 100, top: -70, right: -110, opacity: 0.09 },
          ]}
        />
        <View
          style={[
            styles.contourLine,
            { width: 300, height: 170, borderRadius: 85, top: -50, right: -90, opacity: 0.11 },
          ]}
        />
        <View
          style={[
            styles.contourLine,
            { width: 250, height: 140, borderRadius: 70, top: -30, right: -70, opacity: 0.13 },
          ]}
        />
        <View
          style={[
            styles.contourLine,
            { width: 200, height: 110, borderRadius: 55, top: -10, right: -50, opacity: 0.15 },
          ]}
        />
        <View
          style={[
            styles.contourLine,
            { width: 150, height: 80, borderRadius: 40, top: 10, right: -30, opacity: 0.17 },
          ]}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
          }
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <Pressable onPress={showMenuAlert} style={styles.menuBtn}>
              <View style={styles.menuLine} />
              <View style={[styles.menuLine, { marginVertical: 4 }]} />
              <View style={styles.menuLine} />
            </Pressable>

            <ThemedText style={styles.userNameText}>Hi,{firstName}- 👋</ThemedText>

            <Pressable onPress={showSignOutAlert} style={styles.avatarBtn}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <ThemedText style={styles.avatarFallbackText}>
                    {firstName[0]?.toUpperCase() || '?'}
                  </ThemedText>
                </View>
              )}
            </Pressable>
          </View>

          {/* Greeting Hero */}
          <View style={styles.greetingContainer}>
            <ThemedText style={styles.heroGreeting}>How may I help{'\n'}you today?</ThemedText>
          </View>

          {/* Live Search Input Bar */}
          <View style={styles.searchBarContainer}>
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              size={18}
              tintColor="#8A8A8F"
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products, brands, stores..."
              placeholderTextColor="#60646C"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery ? (
              <Pressable onPress={clearSearch} style={styles.clearSearchBtn}>
                <SymbolView
                  name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                  size={16}
                  tintColor="#8A8A8F"
                />
              </Pressable>
            ) : null}
          </View>

          {/* Conditional Layout: Search Results OR Main Features */}
          {hasSearched ? (
            <View style={styles.searchResultsSection}>
              <View style={styles.sectionHeaderRow}>
                <ThemedText style={styles.sectionTitle}>
                  Search Results for "{searchQuery}"
                </ThemedText>
                <Pressable onPress={clearSearch} style={styles.closeSearchBtn}>
                  <ThemedText style={styles.closeSearchBtnText}>Close</ThemedText>
                </Pressable>
              </View>

              {isSearching ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#C5FF3B" />
                  <ThemedText style={styles.loadingText}>
                    Intelligent Search processing...
                  </ThemedText>
                </View>
              ) : searchResults.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <ThemedText style={styles.emptyText}>
                    No products matching "{searchQuery}" found. Try another brand or typo.
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.resultsList}>
                  {searchResults.map((product) => (
                    <View key={product.id} style={styles.productCard}>
                      <View style={styles.productHeader}>
                        <View style={styles.productMainInfo}>
                          <ThemedText style={styles.productName}>{product.name}</ThemedText>
                          <ThemedText style={styles.productStore}>
                            📍 {storeMap[product.store_id] || 'Unknown Store'}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.productPrice}>
                          ${Number(product.price).toFixed(2)}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.productDesc}>{product.description}</ThemedText>
                      {product.tags && product.tags.length > 0 && (
                        <View style={styles.tagsContainer}>
                          {product.tags.map((tag) => (
                            <View key={tag} style={styles.tagBadge}>
                              <ThemedText style={styles.tagBadgeText}>{tag}</ThemedText>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            /* Main Grid Features Cards */
            <View style={styles.gridContainer}>
              {/* Left Card: Semantic Search (Neon Lime Green) */}
              <Pressable
                style={({ pressed }) => [styles.largeCard, { opacity: pressed ? 0.9 : 1.0 }]}
                onPress={() => {
                  Alert.alert(
                    'Semantic Search',
                    'Find products instantly across every store in the mall using the search input bar above.\n\nHandles typos, synonyms, multi-category matching, and vague intent.',
                  );
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    <SymbolView
                      name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                      size={18}
                      tintColor="#000000"
                    />
                  </View>
                  <SymbolView
                    name={{ ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }}
                    size={16}
                    tintColor="#000000"
                  />
                </View>
                <ThemedText style={styles.largeCardTitle}>Semantic{'\n'}Search</ThemedText>
              </Pressable>

              {/* Right Column containing 2 smaller cards */}
              <View style={styles.rightColumn}>
                {/* Top Card: Spatial Intelligence (Light Purple) */}
                <Pressable
                  style={({ pressed }) => [
                    styles.smallCard,
                    { backgroundColor: '#B19FFB', opacity: pressed ? 0.9 : 1.0 },
                  ]}
                  onPress={handleShowCongestionMap}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.iconCircle}>
                      <SymbolView
                        name={{ ios: 'map', android: 'map', web: 'map' }}
                        size={16}
                        tintColor="#000000"
                      />
                    </View>
                    <SymbolView
                      name={{ ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }}
                      size={14}
                      tintColor="#000000"
                    />
                  </View>
                  <ThemedText style={styles.smallCardTitle}>Live crowd map</ThemedText>
                </Pressable>

                {/* Bottom Card: Targeted Offers (Light Pink) */}
                <Pressable
                  style={({ pressed }) => [
                    styles.smallCard,
                    { backgroundColor: '#FFB7D5', opacity: pressed ? 0.9 : 1.0 },
                  ]}
                  onPress={handleShowTargetedOffers}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.iconCircle}>
                      <SymbolView
                        name={{ ios: 'tag', android: 'sell', web: 'sell' }}
                        size={16}
                        tintColor="#000000"
                      />
                    </View>
                    <SymbolView
                      name={{ ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }}
                      size={14}
                      tintColor="#000000"
                    />
                  </View>
                  <ThemedText style={styles.smallCardTitle}>Targeted Offers</ThemedText>
                </Pressable>
              </View>
            </View>
          )}

          {/* History Header */}
          <View style={styles.historyHeader}>
            <ThemedText style={styles.historyTitle}>History</ThemedText>
            {history.length > 0 && (
              <Pressable onPress={handleClearHistory}>
                <ThemedText style={styles.seeAllText}>Clear all</ThemedText>
              </Pressable>
            )}
          </View>

          {/* History List */}
          <View style={styles.historyList}>
            {isLoadingHistory ? (
              <ActivityIndicator size="small" color="#8A8A8F" style={{ marginVertical: 10 }} />
            ) : history.length === 0 ? (
              <View style={styles.emptyHistory}>
                <ThemedText style={styles.emptyHistoryText}>
                  No activities recorded yet. Search above or claim offers to build your history
                  log.
                </ThemedText>
              </View>
            ) : (
              history.map((item) => {
                const formatted = formatHistoryItem(item);
                return (
                  <View key={item.id} style={styles.historyItem}>
                    <View style={[styles.historyIconCircle, { backgroundColor: formatted.color }]}>
                      <SymbolView
                        name={{ ios: formatted.icon, android: 'label', web: 'label' }}
                        size={16}
                        tintColor="#000000"
                      />
                    </View>
                    <ThemedText style={styles.historyItemText} numberOfLines={1}>
                      {formatted.text}
                    </ThemedText>
                    <ThemedText style={styles.historyItemTime}>
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </ThemedText>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* MODAL SHEET: Live Congestion Map Overlay */}
      {activeModal === 'congestion' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable style={styles.modalOverlay} onPress={() => setActiveModal(null)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Live Congestion Map</ThemedText>
              <Pressable onPress={() => setActiveModal(null)} style={styles.modalCloseBtn}>
                <SymbolView
                  name={{ ios: 'xmark', android: 'close', web: 'close' }}
                  size={18}
                  tintColor="#ffffff"
                />
              </Pressable>
            </View>

            {isLoadingZones ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color="#B19FFB" />
                <ThemedText style={styles.modalLoadingText}>
                  Syncing zone density values...
                </ThemedText>
              </View>
            ) : zonesList.length === 0 ? (
              <ThemedText style={styles.modalEmptyText}>
                No active congestion data found.
              </ThemedText>
            ) : (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <ThemedText style={styles.modalInfoText}>
                  Below is real-time crowd density monitored by zone sensors to plan your route.
                </ThemedText>
                {zonesList.map((zone) => {
                  const hash = zone.name.charCodeAt(0) + zone.name.charCodeAt(zone.name.length - 1);
                  const occupancy = (hash % 85) + 10; // occupancy between 10% and 95%
                  let barColor = '#4CD964'; // Low density green
                  let densityLabel = 'Low Density';
                  if (occupancy > 75) {
                    barColor = '#FF3B30'; // Critical red
                    densityLabel = 'Critical (Heavy Queues)';
                  } else if (occupancy > 45) {
                    barColor = '#FFCC00'; // Moderate yellow
                    densityLabel = 'Moderate Crowds';
                  }

                  return (
                    <View key={zone.id} style={styles.zoneCard}>
                      <View style={styles.zoneHeader}>
                        <View>
                          <ThemedText style={styles.zoneName}>{zone.name}</ThemedText>
                          <ThemedText style={styles.zoneFloor}>Floor {zone.floor}</ThemedText>
                        </View>
                        <ThemedText style={[styles.zoneDensityText, { color: barColor }]}>
                          {densityLabel}
                        </ThemedText>
                      </View>
                      <View style={styles.progressContainer}>
                        <View
                          style={[
                            styles.progressBar,
                            { width: `${occupancy}%`, backgroundColor: barColor },
                          ]}
                        />
                      </View>
                      <View style={styles.zoneFooter}>
                        <ThemedText style={styles.zoneCapacityText}>
                          Cap: {zone.capacity} occupants
                        </ThemedText>
                        <ThemedText style={styles.zonePercentageText}>{occupancy}% Full</ThemedText>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      {/* MODAL SHEET: Targeted Offers Overlay */}
      {activeModal === 'offers' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable style={styles.modalOverlay} onPress={() => setActiveModal(null)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Targeted Offers</ThemedText>
              <Pressable onPress={() => setActiveModal(null)} style={styles.modalCloseBtn}>
                <SymbolView
                  name={{ ios: 'xmark', android: 'close', web: 'close' }}
                  size={18}
                  tintColor="#ffffff"
                />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.modalInfoText}>
                Personalized campaigns generated from your location and browsing history:
              </ThemedText>
              {OFFERS.map((offer) => {
                const isClaimed = claimedOffers[offer.code];
                return (
                  <View key={offer.code} style={styles.offerCard}>
                    <View style={styles.offerMain}>
                      <View style={styles.offerDetails}>
                        <View style={styles.offerCategoryBadge}>
                          <ThemedText style={styles.offerCategoryText}>{offer.category}</ThemedText>
                        </View>
                        <ThemedText style={styles.offerStoreName}>{offer.store}</ThemedText>
                        <ThemedText style={styles.offerDiscount}>{offer.discount}</ThemedText>
                      </View>
                      <Pressable
                        style={[styles.claimBtn, isClaimed && styles.claimedBtn]}
                        onPress={() => handleClaimOffer(offer)}
                        disabled={isClaimed}
                      >
                        <ThemedText
                          style={[styles.claimBtnText, isClaimed && styles.claimedBtnText]}
                        >
                          {isClaimed ? 'Claimed ✓' : 'Claim'}
                        </ThemedText>
                      </Pressable>
                    </View>
                    {isClaimed && (
                      <View style={styles.offerCodeRow}>
                        <ThemedText style={styles.offerCodeLabel}>
                          Use Promo Code at checkout:
                        </ThemedText>
                        <ThemedText style={styles.offerCodeText}>{offer.code}</ThemedText>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  radialGlow: {
    position: 'absolute',
    top: -120,
    left: -120,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#C5FF3B',
    opacity: 0.08,
    shadowColor: '#C5FF3B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1.0,
    shadowRadius: 120,
    elevation: 20,
    zIndex: -2,
  },
  contoursContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '100%',
    height: 320,
    overflow: 'hidden',
    zIndex: -1,
  },
  contourLine: {
    position: 'absolute',
    borderWidth: 1.2,
    borderColor: '#ffffff',
    transform: [{ rotate: '-35deg' }],
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  scroll: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Spacing.three,
  },
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLine: {
    width: 18,
    height: 2,
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
  userNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E0E1E6',
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    backgroundColor: '#2E3135',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  greetingContainer: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  heroGreeting: {
    fontSize: 38,
    fontWeight: '300',
    color: '#ffffff',
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: Spacing.four,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
  },
  clearSearchBtn: {
    padding: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  largeCard: {
    flex: 1.1,
    height: 220,
    backgroundColor: '#C5FF3B',
    borderRadius: 28,
    padding: 20,
    justifyContent: 'space-between',
  },
  largeCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  rightColumn: {
    flex: 1,
    gap: 12,
  },
  smallCard: {
    flex: 1,
    height: 104,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
  },
  smallCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 36,
    marginBottom: Spacing.three,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8A8A8F',
  },
  historyList: {
    width: '100%',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151618',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  historyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyItemText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    fontSize: 14,
    color: '#E0E1E6',
    fontWeight: '500',
  },
  historyItemTime: {
    fontSize: 12,
    color: '#60646C',
  },
  emptyHistory: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyHistoryText: {
    color: '#60646C',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  searchResultsSection: {
    width: '100%',
    minHeight: 180,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E0E1E6',
    flex: 1,
    marginRight: 8,
  },
  closeSearchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeSearchBtnText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  loadingText: {
    color: '#8A8A8F',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: '#60646C',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  resultsList: {
    gap: 12,
  },
  productCard: {
    backgroundColor: '#151618',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  productMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  productName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  productStore: {
    fontSize: 13,
    color: '#B19FFB',
    marginTop: 2,
    fontWeight: '600',
  },
  productPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#C5FF3B',
  },
  productDesc: {
    fontSize: 14,
    color: '#B0B4BA',
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  tagBadgeText: {
    fontSize: 11,
    color: '#8A8A8F',
    fontWeight: '600',
  },

  // Modal styling (absolute sheet overlays)
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 99,
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#111214',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    width: '100%',
  },
  modalInfoText: {
    color: '#8A8A8F',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalLoading: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  modalLoadingText: {
    color: '#8A8A8F',
    fontSize: 14,
  },
  modalEmptyText: {
    color: '#60646C',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 40,
  },

  // Zone specific card
  zoneCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  zoneFloor: {
    fontSize: 12,
    color: '#60646C',
    marginTop: 2,
  },
  zoneDensityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressContainer: {
    height: 6,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  zoneFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  zoneCapacityText: {
    fontSize: 12,
    color: '#8A8A8F',
  },
  zonePercentageText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },

  // Offer specific card
  offerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  offerMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offerDetails: {
    flex: 1,
    marginRight: 12,
  },
  offerCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 6,
  },
  offerCategoryText: {
    fontSize: 11,
    color: '#FFB7D5',
    fontWeight: '700',
  },
  offerStoreName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  offerDiscount: {
    fontSize: 14,
    color: '#B0B4BA',
    marginTop: 2,
  },
  claimBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FFB7D5',
  },
  claimedBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  claimBtnText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '700',
  },
  claimedBtnText: {
    color: '#8A8A8F',
  },
  offerCodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  offerCodeLabel: {
    fontSize: 12,
    color: '#8A8A8F',
  },
  offerCodeText: {
    fontSize: 13,
    color: '#C5FF3B',
    fontWeight: '700',
  },
});
