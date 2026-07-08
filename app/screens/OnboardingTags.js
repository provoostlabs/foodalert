import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Chip, Title, Paragraph, ProgressBar, Card } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Vaste voedselcategorieën met emoji's — gebruiker kan alleen hieruit kiezen
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

export default function OnboardingTags({ navigation }) {
  const [selected, setSelected] = useState([]);

  const toggleTag = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('@foodalert_tags', JSON.stringify(selected));
    await AsyncStorage.setItem('@foodalert_onboarded', 'true');
    navigation.replace('Home');
  };

  const renderTag = ({ item }) => {
    const isSelected = selected.includes(item.id);
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
      <View style={styles.header}>
        <ProgressBar progress={0.66} color="#E53935" style={styles.progress} />
        <Title style={styles.title}>Welke producten koop je vaak?</Title>
        <Paragraph style={styles.subtitle}>
          Kies de producten waarvan je meldingen wilt ontvangen. Je kunt dit ook overslaan.
        </Paragraph>
      </View>

      <FlatList
        data={FOOD_TAGS}
        renderItem={renderTag}
        keyExtractor={item => item.id}
        numColumns={3}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <Text style={styles.selectedCount}>
          {selected.length} product{selected.length !== 1 ? 'en' : ''} geselecteerd
        </Text>
        <Button
          mode="contained"
          onPress={handleFinish}
          style={styles.button}
          buttonColor="#E53935"
        >
          {selected.length > 0 ? 'Begin met alerts' : 'Overslaan'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { padding: 24, paddingTop: 16 },
  progress: { marginBottom: 20, height: 6, borderRadius: 3 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#212121', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', lineHeight: 22 },
  gridContent: { padding: 12, paddingBottom: 20 },
  tagCard: {
    flex: 1,
    margin: 6,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    elevation: 1,
  },
  tagCardSelected: {
    borderColor: '#E53935',
    backgroundColor: '#E5393508',
    elevation: 2,
  },
  tagContent: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  emoji: { fontSize: 32, marginBottom: 8 },
  tagLabel: { fontSize: 13, color: '#555', textAlign: 'center' },
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
  checkmarkText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#E0E0E0', backgroundColor: '#FFF' },
  selectedCount: { textAlign: 'center', marginBottom: 12, color: '#666', fontSize: 14 },
  button: { borderRadius: 12, paddingVertical: 6 },
});
