import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Title, Paragraph, Chip, IconButton, Searchbar, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { getSupermarketLogo, SUPERMARKETS } from '../utils/SupermarketLogos';
import { supabase } from '../utils/supabase';

const FOOD_TAGS_EMOJIS = {
  melk: '🥛', brood: '🍞', kaas: '🧀', yoghurt: '🍦', kip: '🍗',
  vleeswaren: '🥓', rundvlees: '🥩', varkensvlees: '🍖', vis: '🐟',
  noten: '🥜', chocolade: '🍫', groente: '🥬', fruit: '🍎',
  eieren: '🥚', boter: '🧈', pasta: '🍝', rijst: '🍚',
  sappen: '🧃', frisdrank: '🥤', koekjes: '🍪', bier: '🍺', babyvoeding: '🍼',
};

function getEmojiForTag(tagId) {
  return FOOD_TAGS_EMOJIS[tagId] || '🍽️';
}

function parseSupermarkets(sm) {
  // Supabase text kolom: "jumbo,lidl" of leeg string
  if (!sm || sm === '') return [];
  return sm.split(',').map(s => s.trim()).filter(Boolean);
}

function getSeverityColor(severity) {
  switch (severity) {
    case 'high': return '#E53935';
    case 'medium': return '#FF9800';
    default: return '#9E9E9E';
  }
}

function getSeverityLabel(severity) {
  switch (severity) {
    case 'high': return 'Ernstig';
    case 'medium': return 'Matig';
    default: return 'Laag';
  }
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
    // doorgaan
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
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Chip style={{ backgroundColor: getSeverityColor(item.severity) + '20' }} textStyle={{ color: getSeverityColor(item.severity), fontWeight: 'bold' }}>
              {getSeverityLabel(item.severity)}
            </Chip>
            <Text style={styles.date}>{item.date}</Text>
          </View>
          <Title style={styles.cardTitle}>{item.title}</Title>
          <Paragraph style={styles.reason}>{item.reason}</Paragraph>
          <View style={styles.cardFooter}>
            <View style={styles.supermarketRow}>
              {logo && (
                <Image source={logo} style={styles.logoImage} />
              )}
              <Chip style={styles.supermarketChip}>
                {smName}
              </Chip>
            </View>
            <Chip icon="food" style={styles.productChip}>
              {item.product}
            </Chip>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Title style={styles.headerTitle}>FoodAlert</Title>
            <Text style={styles.headerSubtitle}>Voedselveiligheid alerts</Text>
          </View>
          <IconButton
            icon="cog"
            size={24}
            onPress={() => navigation.navigate('Settings')}
          />
        </View>
        <Searchbar
          placeholder="Zoek meldingen..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor="#E53935"
        />
        <View style={styles.filterInfo}>
          <View style={styles.filterLeft}>
            <Image source={require('../../assets/bell-icon.png')} style={styles.bellIcon} />
            <Text style={styles.filterText}>
              {supermarkets.length > 0 
                ? `${supermarkets.length} supermarkt${supermarkets.length !== 1 ? 'en' : ''} geselecteerd`
                : 'Alle supermarkten geselecteerd'
              }
            </Text>
          </View>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Settings')}
            buttonColor="#E53935"
            textColor="#FFFFFF"
            style={styles.wijzigButton}
          >
            Wijzig
          </Button>
        </View>
      </View>

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
  header: { padding: 16, paddingTop: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#E53935' },
  headerSubtitle: { fontSize: 14, color: '#666' },
  searchBar: { backgroundColor: '#F5F5F5', borderRadius: 12, elevation: 0 },
  filterInfo: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bellIcon: { width: 24, height: 24, marginRight: 8, resizeMode: 'contain' },
  filterText: { fontSize: 14, color: '#333', fontWeight: '500' },
  wijzigButton: { borderRadius: 6, paddingHorizontal: 10, minHeight: 28 },
  listContent: { padding: 12, paddingBottom: 32 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2, backgroundColor: '#FFF' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  date: { fontSize: 12, color: '#999' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6, lineHeight: 22 },
  reason: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  supermarketRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoImage: { width: 20, height: 20, borderRadius: 4 },
  supermarketChip: { backgroundColor: '#F5F5F5', paddingLeft: 4 },
  productChip: { backgroundColor: '#FFF3E0' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
});
