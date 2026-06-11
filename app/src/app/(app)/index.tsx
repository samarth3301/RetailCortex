import { useAuth, useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { useAppDispatch, useAppSelector } from '@/store';
import {
  clearHistory as clearHistoryThunk,
  fetchHistory as fetchHistoryThunk,
  recordActivity as recordActivityThunk,
} from '@/store/slices/historySlice';
import { fetchStores as fetchStoresThunk } from '@/store/slices/storesSlice';

// Types matched with FastAPI Models
interface ActivityItem {
  id: string;
  event_type: 'search' | 'feature_usage';
  query: string | null;
  feature: string | null;
  metadata: Record<string, unknown> | null;
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
  store_id?: string;
}

interface StoreSearchResult {
  store_id: string;
  store_name: string;
  floor: number;
  unit_number: string;
  zone_name: string | null;
  products: Product[];
  floor_distance: number | null;
}

interface Zone {
  id: string;
  name: string;
  floor: number;
  capacity: number;
}

interface StoreListItem {
  id: string;
  name: string;
  description: string;
  floor: number;
  unit_number: string;
  zone?: { id: string; name: string; floor: number } | null;
  category?: { id: string; name: string } | null;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface Promotion {
  id: string;
  title: string;
  description: string;
  discount_pct: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  store: { id: string; name: string };
}

interface CongestionZone {
  zone_id: string;
  zone_name: string;
  floor: number;
  capacity: number;
  occupancy: number;
  occupancy_pct: number;
  level: string;
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
  const { signOut, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { apiFetch } = useApi();
  const dispatch = useAppDispatch();
  const { items: history, status: historyStatus } = useAppSelector((s) => s.history);
  const storeMap = useAppSelector((s) => s.stores.map);

  // Stable ref so effects don't re-fire when Clerk rotates getToken reference
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // State Hooks
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [storeResults, setStoreResults] = useState<StoreSearchResult[]>([]);
  const [currentFloor, setCurrentFloor] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [zonesList, setZonesList] = useState<CongestionZone[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [claimedOffers, setClaimedOffers] = useState<Record<string, boolean>>({});

  const [promotionsList, setPromotionsList] = useState<Promotion[]>([]);
  const [isLoadingPromotions, setIsLoadingPromotions] = useState(false);

  const [selectedStore, setSelectedStore] = useState<StoreListItem | null>(null);
  const [storeProductsList, setStoreProductsList] = useState<Product[]>([]);
  const [isLoadingStoreProducts, setIsLoadingStoreProducts] = useState(false);

  // Navigation Sidebar States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(-270)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSidebarOpen) {
      Animated.parallel([
        Animated.timing(sidebarAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sidebarAnim, {
          toValue: -270,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSidebarOpen, sidebarAnim, backdropAnim]);
  const [currentView, setCurrentView] = useState<
    'home' | 'stores' | 'offers' | 'congestion' | 'history' | 'search' | 'notifications' | 'storeProducts'
  >('home');

  // Search filter states for subpages
  const [offersSearchQuery, setOffersSearchQuery] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Explore Stores States
  const [storesList, setStoresList] = useState<StoreListItem[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [likedStores, setLikedStores] = useState<Record<string, boolean>>({});

  // Notifications States
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // Fetch initial data once — Redux TTL prevents re-fetching on remount
  const fetchAllStores = useCallback(async () => {
    try {
      setIsLoadingStores(true);
      const stores = await apiFetch<StoreListItem[]>('/api/v1/stores');
      setStoresList(stores || []);
    } catch {
      setStoresList([]);
    } finally {
      setIsLoadingStores(false);
    }
  }, [apiFetch]);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoadingNotifications(true);
      const res = await apiFetch<{
        items: NotificationItem[];
        total: number;
        unread_count: number;
      }>('/api/v1/notifications/me');
      setNotificationsList(res.items || []);
      setUnreadCount(res.unread_count || 0);
    } catch {
      setNotificationsList([]);
      setUnreadCount(0);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    (async () => {
      const token = await getTokenRef.current();
      if (!token) return;
      dispatch(fetchHistoryThunk({ token, limit: 15 }));
      dispatch(fetchStoresThunk({ token }));
    })();
    fetchAllStores();
    fetchNotifications();
  }, [dispatch, fetchAllStores, fetchNotifications]);

  const fetchHistory = useCallback(async () => {
    const token = await getTokenRef.current();
    if (!token) return;
    dispatch(fetchHistoryThunk({ token, limit: 15 }));
  }, [dispatch]);

  const recordActivity = useCallback(
    async (
      eventType: 'search' | 'feature_usage',
      payload: { query?: string; feature?: string; metadata?: Record<string, unknown> },
    ) => {
      const token = await getTokenRef.current();
      if (!token) return;
      try {
        await dispatch(
          recordActivityThunk({
            token,
            event_type: eventType,
            query: payload.query || undefined,
            feature: payload.feature || undefined,
            metadata: payload.metadata || undefined,
          }),
        ).unwrap();
        fetchHistory(); // Refresh history immediately
      } catch {
        // Fail silently
      }
    },
    [dispatch, fetchHistory],
  );

  const handleClearHistory = async () => {
    Alert.alert('Clear History', 'Are you sure you want to clear your search and activity log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          const token = await getTokenRef.current();
          if (!token) return;
          try {
            await dispatch(clearHistoryThunk({ token })).unwrap();
          } catch {
            Alert.alert('Error', 'Failed to clear history log.');
          }
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchHistory(), fetchAllStores(), fetchNotifications()]);
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
  const handleSearch = async (overrideQuery?: string) => {
    const query = (overrideQuery !== undefined ? overrideQuery : searchQuery).trim();
    if (!query) return;

    try {
      setIsSearching(true);
      setHasSearched(true);
      const floorParam = currentFloor !== null ? `&floor=${currentFloor}` : '';
      const res = await apiFetch<{ success: boolean; data: StoreSearchResult[] }>(
        `/api/v1/products/search/stores?q=${encodeURIComponent(query)}${floorParam}`,
      );
      setStoreResults(res.data || []);
      await recordActivity('search', { query });
    } catch {
      Alert.alert('Search Error', 'Failed to query products. Please check connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setStoreResults([]);
    setSearchResults([]);
    setHasSearched(false);
  };

  // Congestion Map Action
  const handleShowCongestionMap = async () => {
    setCurrentView('congestion');
    setIsLoadingZones(true);
    try {
      await recordActivity('feature_usage', { feature: 'congestion_map' });
      const res = await apiFetch<{ success: boolean; data: CongestionZone[] }>('/api/v1/operations/congestion');
      setZonesList(res.data || []);
    } catch {
      // Fail silently
    } finally {
      setIsLoadingZones(false);
    }
  };

  // Targeted Offers Action
  const handleShowTargetedOffers = async () => {
    setCurrentView('offers');
    if (promotionsList.length === 0) {
      setIsLoadingPromotions(true);
      try {
        const data = await apiFetch<Promotion[]>('/api/v1/promotions');
        setPromotionsList(data || []);
      } catch {
        // Fail silently
      } finally {
        setIsLoadingPromotions(false);
      }
    }
    await recordActivity('feature_usage', { feature: 'targeted_offers' });
  };

  const handleShowStoreProducts = async (store: StoreListItem) => {
    setSelectedStore(store);
    setCurrentView('storeProducts');
    setIsLoadingStoreProducts(true);
    try {
      const data = await apiFetch<Product[]>(`/api/v1/stores/${store.id}/products`);
      setStoreProductsList(data || []);
    } catch {
      setStoreProductsList([]);
    } finally {
      setIsLoadingStoreProducts(false);
    }
  };

  // Semantic Search Action
  const handleShowSemanticSearch = async () => {
    setCurrentView('search');
    await recordActivity('feature_usage', { feature: 'semantic_search_page' });
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

  const handleDeleteHistoryItem = useCallback(
    async (itemId: string) => {
      Alert.alert(
        'Delete Item',
        'Would you like to delete this activity log item from your history?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const token = await getTokenRef.current();
              if (!token) return;
              try {
                await apiFetch(`/api/v1/users/me/history/${itemId}`, {
                  method: 'DELETE',
                });
                dispatch(fetchHistoryThunk({ token, limit: 15 }));
              } catch {
                Alert.alert('Error', 'Failed to delete history item.');
              }
            },
          },
        ],
      );
    },
    [apiFetch, dispatch],
  );

  const toggleFavoriteStore = (storeId: string) => {
    setLikedStores((prev) => ({
      ...prev,
      [storeId]: !prev[storeId],
    }));
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiFetch('/api/v1/notifications/me/read', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await fetchNotifications();
    } catch {
      Alert.alert('Error', 'Failed to mark notifications as read.');
    }
  };

  const handleMarkSingleAsRead = async (id: string) => {
    try {
      await apiFetch(`/api/v1/notifications/me/read/${id}`, {
        method: 'POST',
      });
      await fetchNotifications();
    } catch {
      // Fail silently
    }
  };

  const handleDeleteNotification = (id: string) => {
    Alert.alert('Delete Notification', 'Are you sure you want to delete this notification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/api/v1/notifications/me/${id}`, {
              method: 'DELETE',
            });
            await fetchNotifications();
          } catch {
            Alert.alert('Error', 'Failed to delete notification.');
          }
        },
      },
    ]);
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

  const firstName = user?.firstName || user?.username || 'Samarth';
  const avatarUrl = user?.imageUrl;

  // Filter stores logic
  const filteredStores = storesList.filter((s) => {
    const match = storeSearchQuery.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(match) ||
      s.description.toLowerCase().includes(match) ||
      !!s.category?.name?.toLowerCase().includes(match);

    if (selectedCategory === 'All') return matchesSearch;
    if (selectedCategory === 'Trending') return matchesSearch && s.floor === 1; // Mock trending
    return matchesSearch && s.category?.name === selectedCategory;
  });

  // Unique categories list
  const categoryChips = [
    'All',
    'Trending',
    ...Array.from(new Set(storesList.map((s) => s.category?.name).filter(Boolean))),
  ] as string[];

  // Featured stores list fallback
  const featuredStores = storesList.filter((s) => s.floor === 1).slice(0, 4);

  return (
    <ThemedView style={styles.root}>
      {/* Top Left Radial Glow */}
      <View
        style={[
          styles.radialGlow,
          (currentView === 'stores' ||
            currentView === 'congestion' ||
            currentView === 'notifications') && {
            backgroundColor: '#B19FFB',
            shadowColor: '#B19FFB',
            opacity: 0.08,
          },
          currentView === 'offers' && {
            backgroundColor: '#FFB7D5',
            shadowColor: '#FFB7D5',
            opacity: 0.08,
          },
          (currentView === 'history' || currentView === 'search') && {
            backgroundColor: '#C5FF3B',
            shadowColor: '#C5FF3B',
            opacity: 0.08,
          },
        ]}
        pointerEvents="none"
      />

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

      {/* Left Navigation Sidebar Drawer Backdrop */}
      <Animated.View
        pointerEvents={isSidebarOpen ? 'auto' : 'none'}
        style={[
          styles.sidebarOverlay,
          {
            opacity: backdropAnim,
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsSidebarOpen(false)} />
      </Animated.View>

      {/* Left Navigation Sidebar Drawer */}
      <Animated.View
        style={[
          styles.sidebarContainer,
          {
            transform: [{ translateX: sidebarAnim }],
          },
        ]}
      >
        {/* Radial Glow Inside Sidebar */}
        <View style={styles.sidebarGlow} pointerEvents="none" />
        <View style={styles.sidebarGlowBottom} pointerEvents="none" />

        <View style={styles.sidebarHeader}>
          <ThemedText style={styles.sidebarTitle}>RetailCortex Hub</ThemedText>
          <ThemedText style={styles.sidebarSubtitle}>
            {user?.primaryEmailAddress?.emailAddress || 'Guest account'}
          </ThemedText>
        </View>

        <View style={styles.sidebarNavList}>
          {/* Nav Home */}
          <Pressable
            style={[
              styles.sidebarNavItem,
              currentView === 'home' && { backgroundColor: 'rgba(197, 255, 59, 0.12)' },
            ]}
            onPress={() => {
              setCurrentView('home');
              setIsSidebarOpen(false);
            }}
          >
            <SymbolView
              name={{ ios: 'house', android: 'home', web: 'home' }}
              size={18}
              tintColor="#C5FF3B"
            />
            <ThemedText
              style={[
                styles.sidebarNavItemText,
                currentView === 'home'
                  ? { color: '#C5FF3B', fontWeight: '700' }
                  : { color: '#E0E1E6' },
              ]}
            >
              Home
            </ThemedText>
          </Pressable>

          {/* Nav Stores */}
          <Pressable
            style={[
              styles.sidebarNavItem,
              currentView === 'stores' && { backgroundColor: 'rgba(177, 159, 251, 0.12)' },
            ]}
            onPress={() => {
              setCurrentView('stores');
              setIsSidebarOpen(false);
            }}
          >
            <SymbolView
              name={{ ios: 'bag', android: 'storefront', web: 'storefront' }}
              size={18}
              tintColor="#B19FFB"
            />
            <ThemedText
              style={[
                styles.sidebarNavItemText,
                currentView === 'stores'
                  ? { color: '#B19FFB', fontWeight: '700' }
                  : { color: '#E0E1E6' },
              ]}
            >
              Stores
            </ThemedText>
          </Pressable>

          {/* Nav Semantic Search */}
          <Pressable
            style={[
              styles.sidebarNavItem,
              currentView === 'search' && { backgroundColor: 'rgba(197, 255, 59, 0.12)' },
            ]}
            onPress={() => {
              setCurrentView('search');
              setIsSidebarOpen(false);
              recordActivity('feature_usage', { feature: 'semantic_search_page' });
            }}
          >
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              size={18}
              tintColor="#C5FF3B"
            />
            <ThemedText
              style={[
                styles.sidebarNavItemText,
                currentView === 'search'
                  ? { color: '#C5FF3B', fontWeight: '700' }
                  : { color: '#E0E1E6' },
              ]}
            >
              Semantic Search
            </ThemedText>
          </Pressable>

          {/* Nav Offers */}
          <Pressable
            style={[
              styles.sidebarNavItem,
              currentView === 'offers' && { backgroundColor: 'rgba(255, 183, 213, 0.12)' },
            ]}
            onPress={() => {
              setIsSidebarOpen(false);
              handleShowTargetedOffers();
            }}
          >
            <SymbolView
              name={{ ios: 'tag', android: 'sell', web: 'sell' }}
              size={18}
              tintColor="#FFB7D5"
            />
            <ThemedText
              style={[
                styles.sidebarNavItemText,
                currentView === 'offers'
                  ? { color: '#FFB7D5', fontWeight: '700' }
                  : { color: '#E0E1E6' },
              ]}
            >
              Offers
            </ThemedText>
          </Pressable>

          {/* Nav Congestion Map */}
          <Pressable
            style={[
              styles.sidebarNavItem,
              currentView === 'congestion' && { backgroundColor: 'rgba(177, 159, 251, 0.12)' },
            ]}
            onPress={() => {
              setIsSidebarOpen(false);
              handleShowCongestionMap();
            }}
          >
            <SymbolView
              name={{ ios: 'map', android: 'map', web: 'map' }}
              size={18}
              tintColor="#B19FFB"
            />
            <ThemedText
              style={[
                styles.sidebarNavItemText,
                currentView === 'congestion'
                  ? { color: '#B19FFB', fontWeight: '700' }
                  : { color: '#E0E1E6' },
              ]}
            >
              Live Congestion
            </ThemedText>
          </Pressable>

          {/* Nav Notifications */}
          <Pressable
            style={[
              styles.sidebarNavItem,
              currentView === 'notifications' && { backgroundColor: 'rgba(177, 159, 251, 0.12)' },
            ]}
            onPress={() => {
              setCurrentView('notifications');
              setIsSidebarOpen(false);
            }}
          >
            <SymbolView
              name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
              size={18}
              tintColor="#B19FFB"
            />
            <ThemedText
              style={[
                styles.sidebarNavItemText,
                currentView === 'notifications'
                  ? { color: '#B19FFB', fontWeight: '700' }
                  : { color: '#E0E1E6' },
              ]}
            >
              Notifications
            </ThemedText>
            {unreadCount > 0 && (
              <View style={styles.sidebarUnreadBadge}>
                <ThemedText style={styles.sidebarUnreadBadgeText}>{unreadCount}</ThemedText>
              </View>
            )}
          </Pressable>

          <View style={{ flex: 1 }} />

          {/* Nav Sign Out */}
          <Pressable
            style={[styles.sidebarNavItem, { backgroundColor: 'rgba(255,59,48,0.08)' }]}
            onPress={() => {
              setIsSidebarOpen(false);
              showSignOutAlert();
            }}
          >
            <SymbolView
              name={{
                ios: 'rectangle.portrait.and.arrow.right',
                android: 'logout',
                web: 'logout',
              }}
              size={18}
              tintColor="#FF3B30"
            />
            <ThemedText style={[styles.sidebarNavItemText, { color: '#FF3B30' }]}>
              Sign Out
            </ThemedText>
          </Pressable>
        </View>
      </Animated.View>

      {/* Main Layout Switcher */}
      {currentView === 'home' ? (
        /* VIEW 1: HOME PAGE VIEW */
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
              <Pressable onPress={() => setIsSidebarOpen(true)} style={styles.menuBtn}>
                <View style={styles.menuLine} />
                <View style={[styles.menuLine, { marginVertical: 4 }]} />
                <View style={styles.menuLine} />
              </Pressable>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {/* Notification bell button with count */}
                <Pressable
                  style={styles.exploreBellBtn}
                  onPress={() => setCurrentView('notifications')}
                >
                  <SymbolView
                    name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
                    size={20}
                    tintColor="#ffffff"
                  />
                  {unreadCount > 0 && (
                    <View style={styles.exploreBellBadge}>
                      <ThemedText style={styles.exploreBellBadgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </ThemedText>
                    </View>
                  )}
                </Pressable>

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
            </View>

            {/* Greeting Hero */}
            <View style={styles.greetingContainer}>
              <ThemedText style={styles.heroGreetingPrefix}>Hi, {firstName} 👋</ThemedText>
              <ThemedText style={styles.heroGreeting}>How may I help{'\n'}you today?</ThemedText>
            </View>

            {/* Main Grid Features Cards */}
            <View style={styles.gridContainer}>
              {/* Left Card: Semantic Search (Neon Lime Green) */}
              <Pressable
                style={({ pressed }) => [styles.largeCard, { opacity: pressed ? 0.9 : 1.0 }]}
                onPress={handleShowSemanticSearch}
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
                  <ThemedText style={styles.smallCardTitle}>Offers</ThemedText>
                </Pressable>
              </View>
            </View>
            {/* History Header */}
            <View style={styles.historyHeader}>
              <ThemedText style={styles.historyTitle}>History</ThemedText>
              {history.length > 0 && (
                <Pressable onPress={() => setCurrentView('history')}>
                  <ThemedText style={styles.seeAllText}>See all</ThemedText>
                </Pressable>
              )}
            </View>

            {/* History List */}
            <View style={styles.historyList}>
              {historyStatus === 'loading' ? (
                <ActivityIndicator size="small" color="#8A8A8F" style={{ marginVertical: 10 }} />
              ) : history.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <ThemedText style={styles.emptyHistoryText}>
                    No activities recorded yet. Use Semantic Search or claim offers to build your
                    history log.
                  </ThemedText>
                </View>
              ) : (
                history.slice(0, 3).map((item) => {
                  const formatted = formatHistoryItem(item);
                  return (
                    <View key={item.id} style={styles.historyItem}>
                      <View
                        style={[styles.historyIconCircle, { backgroundColor: formatted.color }]}
                      >
                        <SymbolView
                          name={{ ios: formatted.icon, android: 'label', web: 'label' }}
                          size={16}
                          tintColor="#000000"
                        />
                      </View>
                      <ThemedText style={styles.historyItemText} numberOfLines={1}>
                        {formatted.text}
                      </ThemedText>
                      <View style={styles.historyRightCol}>
                        <ThemedText style={styles.historyItemTime}>
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </ThemedText>
                        <Pressable
                          style={styles.historyMoreBtn}
                          onPress={() => handleDeleteHistoryItem(item.id)}
                        >
                          <SymbolView
                            name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }}
                            size={14}
                            tintColor="#60646C"
                          />
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      ) : currentView === 'stores' ? (
        /* VIEW 2: EXPLORE STORES PAGE VIEW (Mockup layout in dark mode) */
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
            }
          >
            {/* Mockup Header Row */}
            <View style={styles.exploreHeader}>
              <Pressable onPress={() => setCurrentView('home')} style={styles.exploreBackBtn}>
                <SymbolView
                  name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
                  size={20}
                  tintColor="#ffffff"
                />
              </Pressable>

              <ThemedText style={styles.exploreHeaderTitle} numberOfLines={1}>
                Explore stores
              </ThemedText>

              <View style={{ flex: 1 }} />

              {/* Notification bell button with count */}
              <Pressable
                style={styles.exploreBellBtn}
                onPress={() => setCurrentView('notifications')}
              >
                <SymbolView
                  name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
                  size={20}
                  tintColor="#ffffff"
                />
                {unreadCount > 0 && (
                  <View style={styles.exploreBellBadge}>
                    <ThemedText style={styles.exploreBellBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </ThemedText>
                  </View>
                )}
              </Pressable>

              {/* Hamburger menu trigger */}
              <Pressable onPress={() => setIsSidebarOpen(true)} style={styles.menuBtn}>
                <View style={styles.menuLine} />
                <View style={[styles.menuLine, { marginVertical: 4 }]} />
                <View style={styles.menuLine} />
              </Pressable>
            </View>

            {/* Search Input */}
            <View style={styles.exploreSearchContainer}>
              <SymbolView
                name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                size={18}
                tintColor="#8A8A8F"
              />
              <TextInput
                style={styles.exploreSearchInput}
                placeholder="Search stores, brands, categories..."
                placeholderTextColor="#60646C"
                value={storeSearchQuery}
                onChangeText={setStoreSearchQuery}
              />
              {storeSearchQuery ? (
                <Pressable onPress={() => setStoreSearchQuery('')} style={styles.clearSearchBtn}>
                  <SymbolView
                    name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                    size={16}
                    tintColor="#8A8A8F"
                  />
                </Pressable>
              ) : null}
            </View>

            {/* Chips Scrollbar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
            >
              {categoryChips.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    style={[styles.chipBtn, isActive && styles.chipBtnActive]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <ThemedText style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {cat}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Featured Section (Horizontal carousel matching NFT cards) */}
            {selectedCategory === 'All' && (
              <>
                <ThemedText style={styles.featuredHeader}>Featured</ThemedText>
                {isLoadingStores ? (
                  <ActivityIndicator size="small" color="#B19FFB" style={{ marginVertical: 20 }} />
                ) : featuredStores.length === 0 ? (
                  <ThemedText style={styles.modalEmptyText}>No featured retailers.</ThemedText>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.featuredScroll}
                  >
                    {featuredStores.map((store, idx) => {
                      const hash =
                        store.name.charCodeAt(0) + store.name.charCodeAt(store.name.length - 1);
                      const likes = (hash % 9) * 200 + 1200; // Mock likes e.g. 1.8k
                      const views = (hash % 15) * 1.2 + 8.5; // Mock views e.g. 10.5k

                      // Alternate colors matching homepage
                      const cardBgColor =
                        idx % 3 === 0 ? '#C5FF3B' : idx % 3 === 1 ? '#B19FFB' : '#FFB7D5';

                      return (
                        <View
                          key={store.id}
                          style={[styles.featuredCard, { backgroundColor: cardBgColor }]}
                        >
                          {/* Card Header Row */}
                          <View style={styles.featuredCardHeader}>
                            <View style={styles.featuredPillLeft}>
                              <ThemedText style={styles.featuredPillText}>
                                📍 Floor {store.floor}
                              </ThemedText>
                            </View>
                            <View style={styles.featuredStatsRight}>
                              <View style={styles.featuredStatPill}>
                                <ThemedText style={styles.featuredStatText}>
                                  👁️ {views.toFixed(1)}k
                                </ThemedText>
                              </View>
                              <View style={styles.featuredStatPill}>
                                <ThemedText style={styles.featuredStatText}>
                                  ❤️ {likes / 1000}k
                                </ThemedText>
                              </View>
                            </View>
                          </View>

                          {/* Card Body */}
                          <View style={styles.featuredCardBody}>
                            <ThemedText style={styles.featuredCardName}>{store.name}</ThemedText>
                            <ThemedText style={styles.featuredCardDesc} numberOfLines={2}>
                              {store.description ||
                                'Intelligent Shopping & Smart Retailer experience.'}
                            </ThemedText>
                          </View>

                          {/* Card Footer Bid Actions */}
                          <View style={styles.featuredCardFooter}>
                            <Pressable
                              style={styles.exploreBtn}
                              onPress={() =>
                                Alert.alert(
                                  store.name,
                                  `Floor: ${store.floor}\nUnit: ${store.unit_number}\n\n${store.description || `Welcome to ${store.name}`}`,
                                )
                              }
                            >
                              <ThemedText style={styles.exploreBtnText}>Visit Store</ThemedText>
                              <SymbolView
                                name={{
                                  ios: 'arrow.up.right',
                                  android: 'north_east',
                                  web: 'north_east',
                                }}
                                size={12}
                                tintColor="#ffffff"
                              />
                            </Pressable>
                            <Pressable
                              style={styles.seeProductsBtn}
                              onPress={() => handleShowStoreProducts(store)}
                            >
                              <ThemedText style={styles.seeProductsBtnText}>Products</ThemedText>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            )}

            {/* Trending Now / Directory List Section */}
            <View style={styles.trendingHeaderRow}>
              <ThemedText style={styles.trendingTitle}>Trending now</ThemedText>
              <Pressable
                onPress={() => {
                  setSelectedCategory('All');
                  setStoreSearchQuery('');
                }}
              >
                <ThemedText style={styles.trendingSeeAll}>See all</ThemedText>
              </Pressable>
            </View>

            {isLoadingStores ? (
              <ActivityIndicator size="small" color="#C5FF3B" />
            ) : filteredStores.length === 0 ? (
              <ThemedText style={styles.modalEmptyText}>No retailers found.</ThemedText>
            ) : (
              <View style={styles.trendingList}>
                {filteredStores.map((store, idx) => {
                  const isLiked = !!likedStores[store.id];
                  const accentColor =
                    idx % 3 === 0 ? '#C5FF3B' : idx % 3 === 1 ? '#B19FFB' : '#FFB7D5';
                  return (
                    <View
                      key={store.id}
                      style={[styles.trendingStoreCard, { borderLeftColor: accentColor }]}
                    >
                      <View style={styles.trendingCardHeader}>
                        <View>
                          <ThemedText style={styles.trendingStoreTitle}>{store.name}</ThemedText>
                          <ThemedText style={styles.trendingStoreSub}>
                            {store.category?.name || 'Retailer'} • Floor {store.floor}, Unit{' '}
                            {store.unit_number || 'N/A'}
                          </ThemedText>
                        </View>
                        {/* Heart Favorite Toggle Button */}
                        <Pressable
                          style={styles.favoriteBtn}
                          onPress={() => toggleFavoriteStore(store.id)}
                        >
                          <SymbolView
                            name={{
                              ios: isLiked ? 'heart.fill' : 'heart',
                              android: isLiked ? 'favorite' : 'favorite_border',
                              web: isLiked ? 'favorite' : 'favorite_border',
                            }}
                            size={16}
                            tintColor={isLiked ? '#FF3B30' : '#8A8A8F'}
                          />
                        </Pressable>
                      </View>
                      <ThemedText style={styles.trendingStoreDesc}>
                        {store.description ||
                          'Welcome back to RetailCortex Mall directory storefront.'}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      ) : currentView === 'offers' ? (
        /* VIEW 3: TARGETED OFFERS PAGE VIEW */
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
            }
          >
            {/* Header Row */}
            <View style={styles.exploreHeader}>
              <Pressable onPress={() => setCurrentView('home')} style={styles.exploreBackBtn}>
                <SymbolView
                  name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
                  size={20}
                  tintColor="#ffffff"
                />
              </Pressable>

              <ThemedText style={styles.exploreHeaderTitle} numberOfLines={1}>
                Offers
              </ThemedText>

              <View style={{ flex: 1 }} />

              {/* Notification bell button with count */}
              <Pressable
                style={styles.exploreBellBtn}
                onPress={() => setCurrentView('notifications')}
              >
                <SymbolView
                  name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
                  size={20}
                  tintColor="#ffffff"
                />
                {unreadCount > 0 && (
                  <View style={styles.exploreBellBadge}>
                    <ThemedText style={styles.exploreBellBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </ThemedText>
                  </View>
                )}
              </Pressable>

              {/* Hamburger menu trigger */}
              <Pressable onPress={() => setIsSidebarOpen(true)} style={styles.menuBtn}>
                <View style={styles.menuLine} />
                <View style={[styles.menuLine, { marginVertical: 4 }]} />
                <View style={styles.menuLine} />
              </Pressable>
            </View>

            {/* Sub-info text */}
            <ThemedText style={styles.offersInfoText}>
              Exclusive campaigns generated in real-time based on your proximity sensors and
              browsing history.
            </ThemedText>

            {/* Search Input */}
            <View style={styles.exploreSearchContainer}>
              <SymbolView
                name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                size={18}
                tintColor="#8A8A8F"
              />
              <TextInput
                style={styles.exploreSearchInput}
                placeholder="Search deals, stores, categories..."
                placeholderTextColor="#60646C"
                value={offersSearchQuery}
                onChangeText={setOffersSearchQuery}
              />
              {offersSearchQuery ? (
                <Pressable onPress={() => setOffersSearchQuery('')} style={styles.clearSearchBtn}>
                  <SymbolView
                    name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                    size={16}
                    tintColor="#8A8A8F"
                  />
                </Pressable>
              ) : null}
            </View>

            {/* Exclusive Deals (Horizontal Scroll Carousel) */}
            <ThemedText style={styles.featuredHeader}>Active Campaigns</ThemedText>
            {isLoadingPromotions ? (
              <ActivityIndicator size="small" color="#FFB7D5" style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredScroll}>
                {promotionsList
                  .filter((p) => {
                    const match = offersSearchQuery.toLowerCase();
                    return p.title.toLowerCase().includes(match) || p.store.name.toLowerCase().includes(match);
                  })
                  .filter((p) => p.is_active)
                  .slice(0, 4)
                  .map((promo, idx) => {
                    const isClaimed = !!claimedOffers[promo.id];
                    const cardBgColor = idx % 2 === 0 ? '#FFB7D5' : '#B19FFB';
                    const endsAt = new Date(promo.ends_at);
                    const hoursLeft = Math.max(0, Math.round((endsAt.getTime() - Date.now()) / 3600000));
                    return (
                      <View key={promo.id} style={[styles.offerPageCard, { backgroundColor: cardBgColor }]}>
                        <View style={styles.offerPageCardHeader}>
                          <View style={styles.offerPagePill}>
                            <ThemedText style={styles.offerPagePillText}>{promo.store.name}</ThemedText>
                          </View>
                          <ThemedText style={styles.offerPageExpiryText}>
                            {hoursLeft < 24 ? `${hoursLeft}h left` : `${Math.round(hoursLeft / 24)}d left`}
                          </ThemedText>
                        </View>
                        <View style={styles.offerPageCardBody}>
                          <ThemedText style={styles.offerPageCardStore}>{promo.title}</ThemedText>
                          <ThemedText style={styles.offerPageCardDiscount}>{promo.discount_pct}% Off</ThemedText>
                        </View>
                        <View style={styles.offerPageCardFooter}>
                          <Pressable
                            style={[styles.offerPageClaimBtn, isClaimed && styles.offerPageClaimedBtn]}
                            onPress={() => {
                              setClaimedOffers((prev) => ({ ...prev, [promo.id]: true }));
                              Alert.alert('Offer Activated!', `${promo.discount_pct}% off at ${promo.store.name}. Show this to the cashier.`);
                            }}
                            disabled={isClaimed}
                          >
                            <ThemedText style={[styles.offerPageClaimBtnText, isClaimed && styles.offerPageClaimedBtnText]}>
                              {isClaimed ? 'Claimed ✓' : 'Claim Offer'}
                            </ThemedText>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
              </ScrollView>
            )}

            {/* All Offers (Vertical List) */}
            <ThemedText style={styles.trendingTitle}>All campaigns</ThemedText>
            <View style={[styles.trendingList, { marginTop: 16 }]}>
              {isLoadingPromotions ? (
                <ActivityIndicator size="small" color="#FFB7D5" />
              ) : promotionsList
                  .filter((p) => {
                    const match = offersSearchQuery.toLowerCase();
                    return p.title.toLowerCase().includes(match) || p.store.name.toLowerCase().includes(match);
                  })
                  .map((promo) => {
                    const isClaimed = !!claimedOffers[promo.id];
                    const now = Date.now();
                    const isExpired = new Date(promo.ends_at).getTime() < now;
                    const statusLabel = isExpired ? 'Expired' : promo.is_active ? 'Active' : 'Scheduled';
                    const statusColor = isExpired ? '#60646C' : promo.is_active ? '#4CD964' : '#B19FFB';
                    return (
                      <View key={promo.id} style={styles.offerPageListCard}>
                        <View style={styles.offerPageListCardHeader}>
                          <View style={{ flex: 1 }}>
                            <ThemedText style={styles.offerPageListStore}>{promo.store.name}</ThemedText>
                            <ThemedText style={styles.offerPageListDiscount}>{promo.title} — {promo.discount_pct}% off</ThemedText>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                              <View style={[styles.offerPageListCategoryBadge, { backgroundColor: `${statusColor}20` }]}>
                                <ThemedText style={[styles.offerPageListCategoryText, { color: statusColor }]}>{statusLabel}</ThemedText>
                              </View>
                              <ThemedText style={styles.offerPageListExpiry}>
                                {isExpired ? 'Ended' : `Ends ${new Date(promo.ends_at).toLocaleDateString()}`}
                              </ThemedText>
                            </View>
                          </View>
                          {!isExpired && (
                            <Pressable
                              style={[styles.offerListClaimBtn, isClaimed && styles.offerListClaimedBtn]}
                              onPress={() => {
                                setClaimedOffers((prev) => ({ ...prev, [promo.id]: true }));
                                Alert.alert('Offer Activated!', `${promo.discount_pct}% off at ${promo.store.name}.`);
                              }}
                              disabled={isClaimed}
                            >
                              <ThemedText style={[styles.offerListClaimBtnText, isClaimed && styles.offerListClaimedBtnText]}>
                                {isClaimed ? 'Claimed ✓' : 'Claim'}
                              </ThemedText>
                            </Pressable>
                          )}
                        </View>
                        {promo.description ? (
                          <ThemedText style={[styles.trendingStoreDesc, { marginTop: 8 }]}>{promo.description}</ThemedText>
                        ) : null}
                      </View>
                    );
                  })
              }
            </View>
          </ScrollView>
        </SafeAreaView>
      ) : currentView === 'congestion' ? (
        /* VIEW 4: LIVE CONGESTION PAGE VIEW */
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
            }
          >
            {/* Header Row */}
            <View style={styles.exploreHeader}>
              <Pressable onPress={() => setCurrentView('home')} style={styles.exploreBackBtn}>
                <SymbolView
                  name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
                  size={20}
                  tintColor="#ffffff"
                />
              </Pressable>

              <ThemedText style={styles.exploreHeaderTitle} numberOfLines={1}>
                Live congestion
              </ThemedText>

              <View style={{ flex: 1 }} />

              {/* Notification bell button with count */}
              <Pressable
                style={styles.exploreBellBtn}
                onPress={() => setCurrentView('notifications')}
              >
                <SymbolView
                  name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
                  size={20}
                  tintColor="#ffffff"
                />
                {unreadCount > 0 && (
                  <View style={styles.exploreBellBadge}>
                    <ThemedText style={styles.exploreBellBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </ThemedText>
                  </View>
                )}
              </Pressable>

              {/* Hamburger menu trigger */}
              <Pressable onPress={() => setIsSidebarOpen(true)} style={styles.menuBtn}>
                <View style={styles.menuLine} />
                <View style={[styles.menuLine, { marginVertical: 4 }]} />
                <View style={styles.menuLine} />
              </Pressable>
            </View>

            {/* Info text */}
            <ThemedText style={styles.offersInfoText}>
              Live occupant density statistics calculated in real-time across shopping zones to
              guide your path.
            </ThemedText>

            {isLoadingZones ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#B19FFB" />
                <ThemedText style={styles.loadingText}>Syncing zone sensor capacities...</ThemedText>
              </View>
            ) : zonesList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>No zone data currently available.</ThemedText>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {zonesList.map((zone) => {
                  const pct = zone.occupancy_pct;
                  const lvl = zone.level?.toLowerCase() ?? '';
                  let barColor = '#4CD964';
                  let densityLabel = 'Low Density';
                  if (lvl === 'critical' || pct > 85) { barColor = '#FF3B30'; densityLabel = 'Critical — Heavy Queues'; }
                  else if (lvl === 'high' || pct > 65) { barColor = '#FF9500'; densityLabel = 'High — Crowded'; }
                  else if (lvl === 'medium' || pct > 40) { barColor = '#FFCC00'; densityLabel = 'Moderate Crowds'; }

                  return (
                    <View key={zone.zone_id} style={styles.congestionPageCard}>
                      <View style={styles.zoneHeader}>
                        <View>
                          <ThemedText style={styles.zoneName}>{zone.zone_name}</ThemedText>
                          <ThemedText style={styles.zoneFloor}>Floor {zone.floor}</ThemedText>
                        </View>
                        <ThemedText style={[styles.zoneDensityText, { color: barColor }]}>
                          {densityLabel}
                        </ThemedText>
                      </View>
                      <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }]} />
                      </View>
                      <View style={styles.zoneFooter}>
                        <ThemedText style={styles.zoneCapacityText}>
                          {zone.occupancy}/{zone.capacity} occupants
                        </ThemedText>
                        <ThemedText style={styles.zonePercentageText}>{pct}% Full</ThemedText>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      ) : currentView === 'history' ? (
        /* VIEW 5: ACTIVITY HISTORY PAGE VIEW */
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
            }
          >
            {/* Header Row */}
            <View style={styles.exploreHeader}>
              <Pressable onPress={() => setCurrentView('home')} style={styles.exploreBackBtn}>
                <SymbolView
                  name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
                  size={20}
                  tintColor="#ffffff"
                />
              </Pressable>

              <ThemedText style={styles.exploreHeaderTitle} numberOfLines={1}>
                Activity history
              </ThemedText>

              <View style={{ flex: 1 }} />

              {/* Hamburger menu trigger */}
              <Pressable onPress={() => setIsSidebarOpen(true)} style={styles.menuBtn}>
                <View style={styles.menuLine} />
                <View style={[styles.menuLine, { marginVertical: 4 }]} />
                <View style={styles.menuLine} />
              </Pressable>
            </View>

            {/* Search Input */}
            <View style={styles.historySearchContainer}>
              <SymbolView
                name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                size={18}
                tintColor="#8A8A8F"
              />
              <TextInput
                style={styles.historySearchInput}
                placeholder="Search history log..."
                placeholderTextColor="#60646C"
                value={historySearchQuery}
                onChangeText={setHistorySearchQuery}
              />
              {historySearchQuery ? (
                <Pressable onPress={() => setHistorySearchQuery('')} style={styles.clearSearchBtn}>
                  <SymbolView
                    name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                    size={16}
                    tintColor="#8A8A8F"
                  />
                </Pressable>
              ) : null}
            </View>

            {/* History List Header */}
            <View style={[styles.historyHeader, { marginTop: 8, marginBottom: 16 }]}>
              <ThemedText style={styles.historyTitle}>Log entries</ThemedText>
              {history.length > 0 && (
                <Pressable onPress={handleClearHistory}>
                  <ThemedText style={{ color: '#FF3B30', fontSize: 14, fontWeight: '700' }}>
                    Clear all
                  </ThemedText>
                </Pressable>
              )}
            </View>

            {/* History List */}
            <View style={styles.historyList}>
              {historyStatus === 'loading' ? (
                <ActivityIndicator size="small" color="#C5FF3B" style={{ marginVertical: 20 }} />
              ) : history.filter((item) => {
                  const match = historySearchQuery.toLowerCase();
                  const formatted = formatHistoryItem(item);
                  return (
                    formatted.text.toLowerCase().includes(match) ||
                    item.event_type.toLowerCase().includes(match) ||
                    item.feature?.toLowerCase().includes(match) ||
                    item.query?.toLowerCase().includes(match)
                  );
                }).length === 0 ? (
                <View style={styles.emptyHistory}>
                  <ThemedText style={styles.emptyHistoryText}>
                    No activities matching search found.
                  </ThemedText>
                </View>
              ) : (
                history
                  .filter((item) => {
                    const match = historySearchQuery.toLowerCase();
                    const formatted = formatHistoryItem(item);
                    return (
                      formatted.text.toLowerCase().includes(match) ||
                      item.event_type.toLowerCase().includes(match) ||
                      item.feature?.toLowerCase().includes(match) ||
                      item.query?.toLowerCase().includes(match)
                    );
                  })
                  .map((item) => {
                    const formatted = formatHistoryItem(item);
                    return (
                      <View key={item.id} style={styles.historyItem}>
                        <View
                          style={[styles.historyIconCircle, { backgroundColor: formatted.color }]}
                        >
                          <SymbolView
                            name={{ ios: formatted.icon, android: 'label', web: 'label' }}
                            size={16}
                            tintColor="#000000"
                          />
                        </View>
                        <ThemedText style={styles.historyItemText} numberOfLines={1}>
                          {formatted.text}
                        </ThemedText>
                        <View style={styles.historyRightCol}>
                          <ThemedText style={styles.historyItemTime}>
                            {new Date(item.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </ThemedText>
                          <Pressable
                            style={styles.historyMoreBtn}
                            onPress={() => handleDeleteHistoryItem(item.id)}
                          >
                            <SymbolView
                              name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }}
                              size={14}
                              tintColor="#60646C"
                            />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      ) : currentView === 'search' ? (
        /* VIEW 6: SEMANTIC SEARCH PAGE VIEW */
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
            }
          >
            {/* Header Row */}
            <View style={styles.exploreHeader}>
              <Pressable
                onPress={() => {
                  setCurrentView('home');
                  clearSearch();
                }}
                style={styles.exploreBackBtn}
              >
                <SymbolView
                  name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
                  size={20}
                  tintColor="#ffffff"
                />
              </Pressable>

              <ThemedText style={styles.exploreHeaderTitle} numberOfLines={1}>
                Semantic search
              </ThemedText>

              <View style={{ flex: 1 }} />

              {/* Notification bell button with count */}
              <Pressable
                style={styles.exploreBellBtn}
                onPress={() => setCurrentView('notifications')}
              >
                <SymbolView
                  name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
                  size={20}
                  tintColor="#ffffff"
                />
                {unreadCount > 0 && (
                  <View style={styles.exploreBellBadge}>
                    <ThemedText style={styles.exploreBellBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </ThemedText>
                  </View>
                )}
              </Pressable>

              {/* Hamburger menu trigger */}
              <Pressable onPress={() => setIsSidebarOpen(true)} style={styles.menuBtn}>
                <View style={styles.menuLine} />
                <View style={[styles.menuLine, { marginVertical: 4 }]} />
                <View style={styles.menuLine} />
              </Pressable>
            </View>

            {/* Description/Intro */}
            <View style={styles.searchIntroContainer}>
              <ThemedText style={styles.searchIntroText}>
                Find products instantly across every store in the mall using AI. Handles typos,
                synonyms, multi-category matching, and vague intent.
              </ThemedText>
            </View>

            {/* Live Search Input Bar */}
            <View
              style={[
                styles.searchBarContainer,
                { borderColor: 'rgba(197, 255, 59, 0.4)', borderWidth: 1 },
              ]}
            >
              <SymbolView
                name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                size={18}
                tintColor="#8A8A8F"
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Type what you're looking for..."
                placeholderTextColor="#60646C"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => handleSearch()}
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

            {/* Floor proximity picker */}
            <View style={styles.chipsSection}>
              <ThemedText style={styles.chipsSectionTitle}>Your current floor</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {[null, 1, 2, 3, 4].map((f) => {
                  const active = currentFloor === f;
                  return (
                    <Pressable
                      key={f ?? 'all'}
                      style={[styles.chipBtn, active && { backgroundColor: 'rgba(197,255,59,0.15)', borderColor: '#C5FF3B', borderWidth: 1 }]}
                      onPress={() => setCurrentFloor(f)}
                    >
                      <ThemedText style={[styles.chipText, { color: active ? '#C5FF3B' : '#8A8A8F' }]}>
                        {f === null ? 'All floors' : `Floor ${f}`}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Quick search chips */}
            <View style={styles.chipsSection}>
              <ThemedText style={styles.chipsSectionTitle}>Quick search</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {['Running shoes', 'Wireless earbuds', 'Cold brew coffee', 'Compression tights', 'Hoodies', 'Smartwatch'].map(
                  (chip) => (
                    <Pressable key={chip} style={styles.chipBtn} onPress={() => { setSearchQuery(chip); handleSearch(chip); }}>
                      <ThemedText style={[styles.chipText, { color: '#C5FF3B' }]}>{chip}</ThemedText>
                    </Pressable>
                  ),
                )}
              </ScrollView>
            </View>

            {/* Search Results / Status */}
            {hasSearched ? (
              <View style={styles.searchResultsSection}>
                <View style={styles.sectionHeaderRow}>
                  <ThemedText style={styles.sectionTitle}>
                    Results for "{searchQuery}"
                  </ThemedText>
                  <Pressable onPress={clearSearch} style={styles.closeSearchBtn}>
                    <ThemedText style={styles.closeSearchBtnText}>Clear</ThemedText>
                  </Pressable>
                </View>

                {isSearching ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#C5FF3B" />
                    <ThemedText style={styles.loadingText}>Semantic search processing...</ThemedText>
                  </View>
                ) : storeResults.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <ThemedText style={styles.emptyText}>
                      No products matching "{searchQuery}" found. Try another search.
                    </ThemedText>
                  </View>
                ) : (
                  <View style={styles.resultsList}>
                    {storeResults.map((result) => {
                      const accentColors = ['#C5FF3B', '#B19FFB', '#FFB7D5'];
                      const accent = accentColors[result.floor % accentColors.length];
                      return (
                        <View key={result.store_id} style={[styles.storeGroupCard, { borderLeftColor: accent }]}>
                          {/* Store header */}
                          <View style={styles.storeGroupHeader}>
                            <View style={{ flex: 1 }}>
                              <ThemedText style={styles.storeGroupName}>{result.store_name}</ThemedText>
                              <ThemedText style={styles.storeGroupMeta}>
                                {result.zone_name ? `${result.zone_name} · ` : ''}Floor {result.floor}, Unit {result.unit_number}
                                {result.floor_distance !== null ? `  ·  ${result.floor_distance === 0 ? '📍 Your floor' : `${result.floor_distance} floor${result.floor_distance > 1 ? 's' : ''} away`}` : ''}
                              </ThemedText>
                            </View>
                            <View style={[styles.storeGroupBadge, { backgroundColor: `${accent}20` }]}>
                              <ThemedText style={[styles.storeGroupBadgeText, { color: accent }]}>
                                {result.products.length} item{result.products.length !== 1 ? 's' : ''}
                              </ThemedText>
                            </View>
                          </View>

                          {/* Products */}
                          {result.products.map((product, idx) => (
                            <View key={product.id} style={[styles.productRow, idx > 0 && styles.productRowDivider]}>
                              <View style={{ flex: 1 }}>
                                <ThemedText style={styles.productName}>{product.name}</ThemedText>
                                {product.tags && product.tags.length > 0 && (
                                  <View style={styles.tagsContainer}>
                                    {product.tags.slice(0, 3).map((tag) => (
                                      <View key={tag} style={styles.tagBadge}>
                                        <ThemedText style={styles.tagBadgeText}>{tag}</ThemedText>
                                      </View>
                                    ))}
                                  </View>
                                )}
                              </View>
                              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                <ThemedText style={styles.productPrice}>${Number(product.price).toFixed(2)}</ThemedText>
                                <View style={[styles.stockBadge, { backgroundColor: product.in_stock ? 'rgba(76,217,100,0.12)' : 'rgba(255,59,48,0.12)' }]}>
                                  <ThemedText style={[styles.stockBadgeText, { color: product.in_stock ? '#4CD964' : '#FF3B30' }]}>
                                    {product.in_stock ? 'In stock' : 'Out of stock'}
                                  </ThemedText>
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.searchEmptyState}>
                <SymbolView
                  name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                  size={48}
                  tintColor="#C5FF3B"
                  style={{ opacity: 0.8, marginBottom: 16 }}
                />
                <ThemedText style={styles.searchEmptyText}>
                  Select your floor above, then search for any product. Results are sorted by nearest store.
                </ThemedText>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      ) : currentView === 'notifications' ? (
        /* VIEW 7: NOTIFICATIONS PAGE VIEW */
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
            }
          >
            {/* Header Row */}
            <View style={styles.exploreHeader}>
              <Pressable
                onPress={() => {
                  setCurrentView('home');
                }}
                style={styles.exploreBackBtn}
              >
                <SymbolView
                  name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
                  size={20}
                  tintColor="#ffffff"
                />
              </Pressable>

              <ThemedText style={styles.exploreHeaderTitle} numberOfLines={1}>
                Notifications
              </ThemedText>

              <View style={{ flex: 1 }} />

              {/* Hamburger menu trigger */}
              <Pressable onPress={() => setIsSidebarOpen(true)} style={styles.menuBtn}>
                <View style={styles.menuLine} />
                <View style={[styles.menuLine, { marginVertical: 4 }]} />
                <View style={styles.menuLine} />
              </Pressable>
            </View>

            {/* Subheader: unread status + action to mark all as read */}
            <View style={styles.notificationsSubHeader}>
              <ThemedText style={styles.notificationsCountText}>
                {unreadCount === 0 ? 'No unread notifications' : `${unreadCount} unread`}
              </ThemedText>

              {unreadCount > 0 && (
                <Pressable onPress={handleMarkAllAsRead}>
                  <ThemedText style={styles.markAllReadText}>Mark all as read</ThemedText>
                </Pressable>
              )}
            </View>

            {/* Notifications List */}
            <View style={styles.notificationsListContainer}>
              {isLoadingNotifications ? (
                <ActivityIndicator size="small" color="#8A8A8F" style={{ marginVertical: 40 }} />
              ) : notificationsList.length === 0 ? (
                <View style={styles.notificationsEmptyState}>
                  <SymbolView
                    name={{
                      ios: 'bell.slash.fill',
                      android: 'notifications_off',
                      web: 'notifications_off',
                    }}
                    size={48}
                    tintColor="#B19FFB"
                    style={{ opacity: 0.8, marginBottom: 16 }}
                  />
                  <ThemedText style={styles.notificationsEmptyText}>
                    You're all caught up! No notifications yet.
                  </ThemedText>
                </View>
              ) : (
                notificationsList.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.notificationCard,
                      !item.is_read && styles.notificationCardUnread,
                    ]}
                    onPress={() => !item.is_read && handleMarkSingleAsRead(item.id)}
                  >
                    <View style={styles.notificationLeftAccent}>
                      <SymbolView
                        name={{
                          ios: item.is_read ? 'bell' : 'bell.fill',
                          android: item.is_read ? 'notifications_none' : 'notifications_active',
                          web: item.is_read ? 'notifications_none' : 'notifications_active',
                        }}
                        size={20}
                        tintColor={item.is_read ? '#60646C' : '#B19FFB'}
                      />
                    </View>
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeaderRow}>
                        <ThemedText
                          style={[
                            styles.notificationTitle,
                            !item.is_read && styles.notificationTitleUnread,
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </ThemedText>
                        <ThemedText style={styles.notificationTime}>
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.notificationBody}>{item.body}</ThemedText>
                    </View>
                    <Pressable
                      style={styles.notificationDeleteBtn}
                      onPress={() => handleDeleteNotification(item.id)}
                    >
                      <SymbolView
                        name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                        size={16}
                        tintColor="#FF6B6B"
                      />
                    </Pressable>
                  </Pressable>
                ))
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      ) : currentView === 'storeProducts' && selectedStore ? (
        /* VIEW 8: STORE PRODUCTS */
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.exploreHeader}>
              <Pressable onPress={() => setCurrentView('stores')} style={styles.exploreBackBtn}>
                <SymbolView name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={20} tintColor="#ffffff" />
              </Pressable>
              <ThemedText style={styles.exploreHeaderTitle} numberOfLines={1}>{selectedStore.name}</ThemedText>
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => setIsSidebarOpen(true)} style={styles.menuBtn}>
                <View style={styles.menuLine} />
                <View style={[styles.menuLine, { marginVertical: 4 }]} />
                <View style={styles.menuLine} />
              </Pressable>
            </View>

            <ThemedText style={[styles.offersInfoText, { marginBottom: 20 }]}>
              {selectedStore.description || `Browse all products at ${selectedStore.name}.`}
              {'\n'}Floor {selectedStore.floor}, Unit {selectedStore.unit_number}
              {selectedStore.zone ? ` · ${selectedStore.zone.name}` : ''}
            </ThemedText>

            {isLoadingStoreProducts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#C5FF3B" />
                <ThemedText style={styles.loadingText}>Loading products...</ThemedText>
              </View>
            ) : storeProductsList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>No products found for this store.</ThemedText>
              </View>
            ) : (
              <View style={styles.resultsList}>
                {storeProductsList.map((product) => (
                  <View key={product.id} style={[styles.productCard, { borderColor: 'rgba(197,255,59,0.2)', borderWidth: 1 }]}>
                    <View style={styles.productHeader}>
                      <View style={styles.productMainInfo}>
                        <ThemedText style={styles.productName}>{product.name}</ThemedText>
                        {product.description ? (
                          <ThemedText style={styles.productDesc} numberOfLines={2}>{product.description}</ThemedText>
                        ) : null}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <ThemedText style={styles.productPrice}>${Number(product.price).toFixed(2)}</ThemedText>
                        <View style={[styles.stockBadge, { backgroundColor: product.in_stock ? 'rgba(76,217,100,0.12)' : 'rgba(255,59,48,0.12)' }]}>
                          <ThemedText style={[styles.stockBadgeText, { color: product.in_stock ? '#4CD964' : '#FF3B30' }]}>
                            {product.in_stock ? 'In stock' : 'Out of stock'}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
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
          </ScrollView>
        </SafeAreaView>
      ) : null}
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
    opacity: 0.06,
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
  heroGreetingPrefix: {
    fontSize: 32,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 4,
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
  storeGroupCard: {
    backgroundColor: '#111214',
    borderRadius: 20,
    overflow: 'hidden',
    borderLeftWidth: 3,
    marginBottom: 4,
  },
  storeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  storeGroupName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  storeGroupMeta: {
    fontSize: 12,
    color: '#60646C',
    marginTop: 2,
  },
  storeGroupBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  storeGroupBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  productRowDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '600',
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

  // History More/Deletion styling
  historyRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyMoreBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },

  // Left Sidebar Navigation drawer styling
  sidebarOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 999,
  },
  sidebarContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 270,
    backgroundColor: '#0C0D0E',
    padding: 24,
    paddingTop: 64,
    zIndex: 1000,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  sidebarGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#B19FFB',
    opacity: 0.12,
    zIndex: -1,
  },
  sidebarGlowBottom: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#C5FF3B',
    opacity: 0.08,
    zIndex: -1,
  },
  sidebarHeader: {
    marginBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 20,
    zIndex: 2,
  },
  sidebarTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  sidebarSubtitle: {
    fontSize: 13,
    color: '#8A8A8F',
    marginTop: 4,
  },
  sidebarNavList: {
    flex: 1,
    gap: 8,
    zIndex: 2,
  },
  sidebarNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 12,
  },
  sidebarNavItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  sidebarNavItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8A8A8F',
  },
  sidebarNavItemTextActive: {
    color: '#ffffff',
  },

  // Explore Stores mockup page styling
  exploreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.four,
    gap: 12,
  },
  exploreBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreHeaderTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: '#ffffff',
    letterSpacing: -0.5,
    lineHeight: 34,
    paddingTop: 6,
  },
  exploreBellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  exploreBellBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreBellBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 15,
  },
  exploreSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  exploreSearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
  },
  chipsScroll: {
    marginBottom: 24,
  },
  chipBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginRight: 8,
  },
  chipBtnActive: {
    backgroundColor: '#B19FFB',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A8A8F',
  },
  chipTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  featuredHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  featuredScroll: {
    marginBottom: 32,
  },
  featuredCard: {
    width: 240,
    height: 290,
    borderRadius: 28,
    padding: 16,
    justifyContent: 'space-between',
    marginRight: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  featuredCardBgGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    opacity: 0.1,
    zIndex: -1,
  },
  featuredCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  featuredPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },
  featuredStatsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  featuredStatText: {
    fontSize: 11,
    color: 'rgba(0, 0, 0, 0.65)',
    fontWeight: '700',
  },
  featuredCardBody: {
    marginTop: 20,
    flex: 1,
  },
  featuredCardName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
  },
  featuredCardDesc: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.65)',
    marginTop: 4,
    lineHeight: 16,
    fontWeight: '500',
  },
  featuredCardFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  exploreBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 10,
  },
  exploreBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  seeProductsBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 12,
    paddingVertical: 10,
  },
  seeProductsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },
  trendingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trendingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  trendingSeeAll: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8A8A8F',
  },
  trendingList: {
    gap: 12,
  },
  trendingStoreCard: {
    backgroundColor: '#151618',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderLeftWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  trendingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  trendingStoreTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  trendingStoreSub: {
    fontSize: 12,
    color: '#B19FFB',
    fontWeight: '600',
    marginTop: 2,
  },
  favoriteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingStoreDesc: {
    fontSize: 13,
    color: '#8A8A8F',
    lineHeight: 18,
  },
  searchIntroContainer: {
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  searchIntroText: {
    fontSize: 15,
    color: '#8A8A8F',
    lineHeight: 22,
    fontWeight: '400',
  },
  chipsSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  chipsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  searchEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  searchEmptyText: {
    fontSize: 15,
    color: '#8A8A8F',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
  },

  // Offers subpage stylesheet additions
  offerPageCard: {
    width: 240,
    height: 290,
    borderRadius: 28,
    padding: 16,
    justifyContent: 'space-between',
    marginRight: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  offerPageCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offerPagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  offerPagePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },
  offerPageExpiryText: {
    fontSize: 11,
    color: 'rgba(0, 0, 0, 0.65)',
    fontWeight: '700',
  },
  offerPageCardBody: {
    marginTop: 20,
    flex: 1,
  },
  offerPageCardStore: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
  },
  offerPageCardDiscount: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.65)',
    marginTop: 4,
    lineHeight: 16,
    fontWeight: '500',
  },
  offerPageCardFooter: {
    flexDirection: 'row',
    marginTop: 16,
  },
  offerPageClaimBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 10,
  },
  offerPageClaimedBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  offerPageClaimBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  offerPageClaimedBtnText: {
    color: 'rgba(0, 0, 0, 0.4)',
  },
  offerPageListCard: {
    backgroundColor: '#151618',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 12,
  },
  offerPageListCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offerPageListStore: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  offerPageListDiscount: {
    fontSize: 14,
    color: '#8A8A8F',
    marginTop: 2,
  },
  offerPageListCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  offerPageListCategoryText: {
    fontSize: 11,
    color: '#FFB7D5',
    fontWeight: '700',
  },
  offerPageListExpiry: {
    fontSize: 12,
    color: '#4CD964',
    fontWeight: '600',
  },
  offerListClaimBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFB7D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerListClaimedBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  offerListClaimBtnText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '700',
  },
  offerListClaimedBtnText: {
    color: '#8A8A8F',
  },
  offerPageCodeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  offerPageCodeLabel: {
    fontSize: 12,
    color: '#8A8A8F',
  },
  offerPageCodeText: {
    fontSize: 13,
    color: '#C5FF3B',
    fontWeight: '700',
  },
  offersInfoText: {
    fontSize: 15,
    color: '#8A8A8F',
    lineHeight: 22,
    fontWeight: '400',
    marginBottom: 20,
    paddingHorizontal: 4,
  },

  // Congestion subpage stylesheet additions
  congestionPageCard: {
    backgroundColor: '#151618',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 12,
  },

  // History subpage stylesheet additions
  historySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  historySearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
  },

  // Notifications subpage styles
  notificationsSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  notificationsCountText: {
    fontSize: 14,
    color: '#8A8A8F',
    fontWeight: '400',
  },
  markAllReadText: {
    fontSize: 14,
    color: '#B19FFB',
    fontWeight: '600',
  },
  testNotificationBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  testNotificationBtnText: {
    fontSize: 12,
    color: '#E0E1E6',
    fontWeight: '500',
  },
  notificationsListContainer: {
    marginBottom: 30,
  },
  notificationsEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  notificationsEmptyText: {
    fontSize: 15,
    color: '#8A8A8F',
    textAlign: 'center',
    marginBottom: 20,
  },
  generateTestBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(177, 159, 251, 0.15)',
    borderWidth: 1,
    borderColor: '#B19FFB',
  },
  generateTestBtnText: {
    fontSize: 14,
    color: '#B19FFB',
    fontWeight: '600',
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#151618',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
  },
  notificationCardUnread: {
    borderColor: 'rgba(177, 159, 251, 0.3)',
    backgroundColor: 'rgba(177, 159, 251, 0.04)',
  },
  notificationLeftAccent: {
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8A8A8F',
    flex: 1,
    marginRight: 8,
  },
  notificationTitleUnread: {
    fontWeight: '700',
    color: '#ffffff',
  },
  notificationTime: {
    fontSize: 12,
    color: '#60646C',
  },
  notificationBody: {
    fontSize: 13,
    color: '#A0A1A6',
    lineHeight: 18,
  },
  notificationDeleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
  sidebarUnreadBadge: {
    marginLeft: 'auto',
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarUnreadBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});
