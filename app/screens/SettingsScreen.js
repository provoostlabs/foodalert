import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Chip, Title, List, Divider, Switch, Appbar } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupermarketLogo, SUPERMARKETS } from '../utils/SupermarketLogos';
import { supabase } from '../utils/supabase';

// Vaste voedselcategorieën met emoji's
const FOOD_TAGS = [
  { id: 'melk', label: 'Melk', emoji: '🥛' },
  { id: 'brood', label: 'Brood', emoji: '🍞' },
  { id: 'kaas', label: 'Kaas', emoji: '🧀' },
  { id: 'yoghurt', label: 'Yoghurt', emoji: '🍦' },
  { id: 'kip', label: 'Kip', emoji: '🍗' },
  { id: 'vleeswaren', label: 'Vleeswaren', emoji: '🥓' },
  { id: 'rundvlees', label: 'Rundvlees', emoji: '🥩' },
  { id: 'varkensvlees', label: 'Varkensvlees', emoji: '🍖' },
  { id: 'vis', label: 'Vis', emoji: '🐟' },
  { id: 'noten', label: 'Noten', emoji: '🥜' },
  { id: 'chocolade', label: 'Chocolade', emoji: '🍫' },
  { id: 'groente', label: 'Groente', emoji: '🥬' },
  { id: 'fruit', label: 'Fruit', emoji: '🍎' },
  { id: 'eieren', label: 'Eieren', emoji: '🥚' },
  { id: 'boter', label: 'Boter', emoji: '🧈' },
  { id: 'pasta', label: 'Pasta', emoji: '🍝' },
  { id: 'rijst', label: 'Rijst', emoji: '🍚' },
  { id: 'sappen', label: 'Sappen', emoji: '🧃' },
  { id: 'frisdrank', label: 'Frisdrank', emoji: '🥤' },
  { id: 'koekjes', label: 'Koekjes', emoji: '🍪' },
  { id: 'bier', label: 'Bier / Wijn', emoji: '🍺' },
  { id: 'babyvoeding', label: 'Babyvoeding', emoji: '🍼' },
];

function getEmojiForTag(tagId) {
  const found = FOOD_TAGS.find(t => t.id === tagId);
  return found ? found.emoji : '🍽️';
}

function getLabelForTag(tagId) {
  const found = FOOD_TAGS.find(t => t.id === tagId);
  return found ? found.label : tagId;
}

export default function SettingsScreen({ navigation }) {
  const [supermarkets, setSupermarkets] = useState([]);
  const [tags, setTags] = useState([]);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [showTagPicker, setShowTagPicker] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const sm = await AsyncStorage.getItem('@foodalert_supermarkets');
    const tg = await AsyncStorage.getItem('@foodalert_tags');
    const notif = await AsyncStorage.getItem('@foodalert_notifications');
    setSupermarkets(sm ? JSON.parse(sm) : []);
    setTags(tg ? JSON.parse(tg) : []);
    setNotifEnabled(notif !== 'false');
  };

  const toggleSupermarket = async (id) => {
    const updated = supermarkets.includes(id)
      ? supermarkets.filter(s => s !== id)
      : [...supermarkets, id];
    setSupermarkets(updated);
    await AsyncStorage.setItem('@foodalert_supermarkets', JSON.stringify(updated));
    await syncToSupabase(updated, tags);
  };

  const toggleTag = async (id) => {
    const updated = tags.includes(id)
      ? tags.filter(t => t !== id)
      : [...tags, id];
    setTags(updated);
    await AsyncStorage.setItem('@foodalert_tags', JSON.stringify(updated));
    await syncToSupabase(supermarkets, updated);
  };

  const toggleNotifications = async (value) => {
    setNotifEnabled(value);
    await AsyncStorage.setItem('@foodalert_notifications', JSON.stringify(value));
  };

  const syncToSupabase = async (sm, tg) => {
    try {
      const token = await AsyncStorage.getItem('@foodalert_push_token');
      if (!token) {
        console.log('Geen push token gevonden — opnieuw registreren bij volgende app start');
        return;
      }
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          token,
          supermarkets: sm.join(','),
          tags: tg.join(','),
        }, { onConflict: 'token' });
      if (error) {
        console.error('Supabase sync error:', error.message);
      } else {
        console.log('Instellingen gesynchroniseerd naar Supabase');
      }
    } catch (e) {
      console.error('Sync error:', e);
    }
  };

  const resetOnboarding = async () => {
    await AsyncStorage.removeItem('@foodalert_onboarded');
    navigation.replace('OnboardingSupermarkets');
  };

  const renderTagPickerItem = ({ item }) => {
    const isSelected = tags.includes(item.id);
    return (
      <Card
        style={[
          styles.tagCard,
          isSelected && styles.tagCardSelected,
        ]}
        onPress={() => toggleTag(item.id)}
      >
        <Card.Content style={styles.tagContent}>
          <Text style={styles.emoji}>{item.emoji}</Text>
          <Text style={[styles.tagLabel, isSelected && styles.tagLabelSelected]}>
            {item.label}
          </Text>
          {isSelected && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={{ backgroundColor: '#FFF' }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Instellingen" />
      </Appbar.Header>

      <ScrollView>
        <List.Section>
          <List.Subheader>Notificaties</List.Subheader>
          <List.Item
            title="Push notificaties"
            description="Ontvang meldingen bij nieuwe recalls"
            left={props => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch value={notifEnabled} onValueChange={toggleNotifications} color="#E53935" />
            )}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Supermarkten</List.Subheader>
          <View style={styles.chipsContainer}>
            {SUPERMARKETS.map(sm => {
              const isSelected = supermarkets.includes(sm.id);
              const logo = getSupermarketLogo(sm.id);
              return (
                <Chip
                  key={sm.id}
                  selected={isSelected}
                  onPress={() => toggleSupermarket(sm.id)}
                  style={[
                    styles.chip,
                    isSelected && { backgroundColor: '#E5393520', borderColor: '#E53935' },
                  ]}
                  textStyle={isSelected ? { color: '#E53935', fontWeight: 'bold' } : {}}
                  mode="outlined"
                  avatar={logo ? (
                    <Image source={logo} style={styles.logoImage} />
                  ) : null}
                >
                  {sm.name}
                </Chip>
              );
            })}
          </View>
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Product-tags</List.Subheader>
          <View style={styles.tagsSection}>
            {tags.length === 0 && (
              <Text style={styles.noTags}>Geen product-tags ingesteld</Text>
            )}
            <View style={styles.tagsContainer}>
              {tags.map(tagId => (
                <Chip
                  key={tagId}
                  onClose={() => toggleTag(tagId)}
                  style={styles.tagChip}
                  textStyle={{ color: '#E53935' }}
                  mode="outlined"
                  avatar={<Text style={styles.tagChipEmoji}>{getEmojiForTag(tagId)}</Text>}
                >
                  {getLabelForTag(tagId)}
                </Chip>
              ))}
            </View>
            <Button
              mode="outlined"
              onPress={() => setShowTagPicker(!showTagPicker)}
              style={styles.addTagButton}
              textColor="#E53935"
              icon={showTagPicker ? "chevron-up" : "plus"}
            >
              {showTagPicker ? 'Sluit picker' : 'Product-tags wijzigen'}
            </Button>
          </View>

          {showTagPicker && (
            <View style={styles.pickerSection}>
              <Text style={styles.pickerTitle}>Kies je product-tags:</Text>
              <View style={styles.tagGrid}>
                {FOOD_TAGS.map(item => {
                  const isSelected = tags.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.tagCard,
                        isSelected && styles.tagCardSelected,
                      ]}
                      onPress={() => toggleTag(item.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.emoji}>{item.emoji}</Text>
                      <Text style={[styles.tagLabel, isSelected && styles.tagLabelSelected]}>
                        {item.label}
                      </Text>
                      {isSelected && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>App</List.Subheader>
          <List.Item
            title="Over FoodAlert"
            description="Versie 1.0.0"
            left={props => <List.Icon {...props} icon="information" />}
          />
          <List.Item
            title="Onboarding opnieuw starten"
            description="Wijzig je supermarkten en product-tags"
            left={props => <List.Icon {...props} icon="restart" />}
            onPress={resetOnboarding}
          />
        </List.Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 8 },
  chip: { margin: 4, borderRadius: 20, borderWidth: 1.5, borderColor: '#E0E0E0', paddingLeft: 4 },
  logoImage: { width: 24, height: 24, borderRadius: 4 },
  tagsSection: { padding: 16 },
  noTags: { color: '#999', fontStyle: 'italic', marginBottom: 12 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tagChip: { borderRadius: 20, borderColor: '#E53935', paddingRight: 8 },
  tagChipEmoji: { fontSize: 16, marginRight: 4 },
  addTagButton: { borderRadius: 12, borderColor: '#E53935' },
  pickerSection: { paddingHorizontal: 16, paddingBottom: 16 },
  pickerTitle: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 12 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  tagCard: {
    width: '30%',
    aspectRatio: 1,
    margin: '1.6%',
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  tagCardSelected: {
    borderColor: '#E53935',
    backgroundColor: '#E5393510',
  },
  emoji: { fontSize: 32, marginBottom: 4 },
  tagLabel: { fontSize: 13, color: '#555', textAlign: 'center', fontWeight: '500' },
  tagLabelSelected: { color: '#E53935', fontWeight: 'bold' },
  checkmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#E53935',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
});
