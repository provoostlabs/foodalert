import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Title, Paragraph, Chip, Searchbar, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { getSupermarketLogo, SUPERMARKETS } from '../utils/SupermarketLogos';
import { supabase } from '../utils/supabase';

function parseSupermarkets(sm) {
  if (!sm || sm === '') return [];
  return sm.split(',').map(s => s.trim()).filter(Boolean);
}

function getSeverityColors(severity) {
  switch (severity) {
    case 'high': return { bg: '#FFEBEE', text: '#E53935', border: '#E53935' };
    case 'medium': return { bg: '#FFF3E0', text: '#FF9800', border: '#FF9800' };
    default: return { bg: '#FFFDE7', text: '#F9A825', border: '#F9A825' };
  }
}

function getSeverityLabel(severity) {
  switch (severity) {
    case 'high': return 'Ernstig';
    case 'medium': return 'Matig';
    default: return 'Laag';
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const monthsNL = {
    '01': 'januari', '02': 'februari', '03': 'maart', '04': 'april',
    '05': 'mei', '06': 'juni', '07': 'juli', '08': 'augustus',
    '09': 'september', '10': 'oktober', '11': 'november', '12': 'december',
  };
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${parseInt(isoMatch[3])} ${monthsNL[isoMatch[2]]} ${isoMatch[1]}`;
  }
  return dateStr;
}

function getPrimarySupermarketName(recall) {
  const smList = parseSupermarkets(recall.supermarkets);
  if (smList.length === 0) return 'Onbekend';
  const sm = SUPERMARKETS.find(s => s.id === smList[0]);
  return sm ? sm.name : smList[0];
}

function getSupermarketLogoForRecall(recall) {
  const smList = parseSupermarkets(recall.supermarkets);
  if (smList.length === 0) return null;
  return getSupermarketLogo(smList[0]);
}

function matchesUser(recall, selectedSupermarketIds, selectedTags) {
  const smList = parseSupermarkets(recall.supermarkets);

  if (selectedSupermarketIds.length === 0) {
  } else {
    const hasOverlap = smList.some(smId => selectedSupermarketIds.includes(smId));
    if (smList.length === 0) {
      const allMarketsSelected = selectedSupermarketIds.length === SUPERMARKETS.length;
      if (!allMarketsSelected) return false;
    } else if (!hasOverlap) {
      return false;
    }
  }

  if (selectedTags.length === 0) return true;
  if (selectedTags.length >= 15) return true;

  const textToCheck = (recall.title + ' ' + recall.product).toLowerCase();
  return selectedTags.some(tag => textToCheck.includes(tag.toLowerCase()));
}

async function registerPushToken(supermarkets, tags) {
  if (!Device.isDevice) {
    console.log('Push notificaties werken alleen op een fysiek apparaat');
    return;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Push notificatie toestemming geweigerd');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '0533ef1c-4de4-4ffb-9f5e-81279808dddd'
    });
    const token = tokenData.data;
    console.log('Push token:', token);
    await AsyncStorage.setItem('@foodalert_push_token', token);

    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        token,
        supermarkets: supermarkets.join(','),
        tags: tags.join(','),
      }, { onConflict: 'token' });

    if (error) {
      console.error('Supabase push token error:', error.message);
    } else {
      console.log('Push token opgeslagen in Supabase');
    }
  } catch (e) {
    console.error('Push token error:', e);
  }
}

export default function HomeScreen({ navigation }) {
  const [supermarkets, setSupermarkets] = useState([]);
  const [tags, setTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recalls, setRecalls] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecalls = async () => {
    try {
      const { data, error } = await supabase
        .from('recalls')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Supabase error:', error.message);
        return;
      }
      
      setRecalls(data || []);
    } catch (e) {
      console.error('Fetch error:', e);
    }
  };

  useEffect(() => {
    const loadAndRegister = async () => {
      const sm = await AsyncStorage.getItem('@foodalert_supermarkets');
      const tg = await AsyncStorage.getItem('@foodalert_tags');
      const parsedSm = sm ? JSON.parse(sm) : [];
      const parsedTg = tg ? JSON.parse(tg) : [];
      setSupermarkets(parsedSm);
      setTags(parsedTg);
      await registerPushToken(parsedSm, parsedTg);
    };
    loadAndRegister();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPreferences();
      fetchRecalls();
    }, [])
  );

  const loadPreferences = async () => {
    try {
      const sm = await AsyncStorage.getItem('@foodalert_supermarkets');
      const tg = await AsyncStorage.getItem('@foodalert_tags');
      setSupermarkets(sm ? JSON.parse(sm) : []);
      setTags(tg ? JSON.parse(tg) : []);
    } catch (e) {
      console.error(e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecalls();
    setRefreshing(false);
  };

  const filteredRecalls = recalls.filter(r => {
    const matchesSearch = !searchQuery || 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.product.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesUserPrefs = matchesUser(r, supermarkets, tags);
    return matchesSearch && matchesUserPrefs;
  });

  const renderRecall = ({ item }) => {
    const smName = getPrimarySupermarketName(item);
    const logo = getSupermarketLogoForRecall(item);
    const sev = getSeverityColors(item.severity);
    const formattedDate = formatDate(item.date);
    
    return (
      <Card style={[styles.card, { borderLeftWidth: 4, borderLeftColor: sev.border }]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={[styles.severityBadge, { backgroundColor: sev.bg }]}>
              <Text style={[styles.severityText, { color: sev.text }]}>
                {getSeverityLabel(item.severity)}
              </Text>
            </View>
            <Text style={styles.date}>{formattedDate}</Text>
          </View>
          <Title style={styles.cardTitle}>{item.title}</Title>
          <Paragraph style={styles.reason}>{item.reason}</Paragraph>
          <View style={styles.cardFooter}>
            <View style={styles.supermarketRow}>
              {logo && (
                <Image source={logo} style={styles.logoImage} />
              )}
              <View style={styles.supermarketBadge}>
                <Text style={styles.supermarketText}>{smName}</Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with logo */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.headerLogo} 
              resizeMode="contain"
            />
            <View>
              <Text style={styles.headerTitle}>FoodAlert</Text>
              <Text style={styles.headerSubtitle}>Voedselveiligheid alerts</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={{ fontSize: 18 }}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar with shadow */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Zoek meldingen..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor="#E53935"
          inputStyle={{ fontSize: 15 }}
        />
      </View>

      {/* Filter card with shadow */}
      <View style={styles.filterCard}>
        <View style={styles.filterLeft}>
          <Image source={require('../../assets/bell-icon.png')} style={styles.bellIcon} />
          <View>
            <Text style={styles.filterMainText}>
              {supermarkets.length > 0 
                ? `${supermarkets.length} winkel${supermarkets.length !== 1 ? 's' : ''} geselecteerd`
                : 'Alle winkels geselecteerd'
              }
            </Text>
            <Text style={styles.filterSubText}>Je ontvangt meldingen</Text>
          </View>
        </View>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Settings')}
          buttonColor="#E53935"
          textColor="#FFFFFF"
          style={styles.wijzigButton}
          labelStyle={{ fontSize: 14, fontWeight: 'bold' }}
        >
          Wijzig
        </Button>
      </View>

      {/* Section title */}
      <Text style={styles.sectionTitle}>Recente meldingen</Text>

      {/* Recalls list */}
      <FlatList
        data={filteredRecalls}
        renderItem={renderRecall}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>Geen meldingen gevonden</Text>
            <Text style={styles.emptyText}>
              De database is nog leeg. Pull-to-refresh of wacht tot de scraper draait.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  
  // Header
  header: { padding: 16, paddingTop: 8, backgroundColor: '#FFF' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 36, height: 36, borderRadius: 8 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#E53935' },
  headerSubtitle: { fontSize: 13, color: '#888' },
  
  // Settings button
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  
  // Search bar
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  searchBar: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  
  // Filter card
  filterCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#FFF',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  filterLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  bellIcon: { width: 28, height: 28, resizeMode: 'contain' },
  filterMainText: { fontSize: 15, fontWeight: '600', color: '#333' },
  filterSubText: { fontSize: 13, color: '#888', marginTop: 2 },
  wijzigButton: { borderRadius: 8, paddingHorizontal: 16 },
  
  // Section title
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  
  // List
  listContent: { padding: 12, paddingBottom: 32 },
  
  // Card
  card: { 
    marginBottom: 12, 
    borderRadius: 14, 
    elevation: 1, 
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  severityBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 6,
  },
  severityText: { fontSize: 12, fontWeight: 'bold' },
  date: { fontSize: 13, color: '#999' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6, lineHeight: 22, color: '#222' },
  reason: { fontSize: 13, color: '#777', lineHeight: 19, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  supermarketRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoImage: { width: 24, height: 24, borderRadius: 4 },
  supermarketBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  supermarketText: { fontSize: 12, color: '#555', fontWeight: '500' },
  
  // Empty state
  emptyState: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
});
