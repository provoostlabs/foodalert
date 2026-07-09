import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Chip, Title, ProgressBar } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPERMARKETS, getSupermarketLogo } from '../utils/SupermarketLogos';

export default function OnboardingSupermarkets({ navigation }) {
  const [selected, setSelected] = useState([]);

  const toggleSupermarket = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleNext = async () => {
    if (selected.length === 0) return;
    await AsyncStorage.setItem('@foodalert_supermarkets', JSON.stringify(selected));
    navigation.navigate('OnboardingTags');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ProgressBar progress={0.33} color="#E53935" style={styles.progress} />
        <Title style={styles.title}>Kies de supermarkten waarvan je voedselveiligheid alerts wilt ontvangen.</Title>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.chipsContainer}>
          {SUPERMARKETS.map((sm) => {
            const isSelected = selected.includes(sm.id);
            const logo = getSupermarketLogo(sm.id);
            return (
              <Chip
                key={sm.id}
                selected={isSelected}
                onPress={() => toggleSupermarket(sm.id)}
                style={[
                  styles.chip,
                  isSelected && { backgroundColor: sm.color + '20', borderColor: sm.color },
                ]}
                textStyle={isSelected ? { color: sm.color, fontWeight: 'bold' } : {}}
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
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.selectedCount}>
          {selected.length} supermarkt{selected.length !== 1 ? 'en' : ''} geselecteerd
        </Text>
        <Button
          mode="contained"
          onPress={handleNext}
          disabled={selected.length === 0}
          style={styles.button}
          buttonColor="#E53935"
        >
          Volgende
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { padding: 24, paddingTop: 40 },
  progress: { marginBottom: 24, height: 6, borderRadius: 3 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#212121', marginBottom: 8 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { margin: 4, borderRadius: 20, borderWidth: 1.5, borderColor: '#E0E0E0', paddingLeft: 4 },
  logoImage: { width: 24, height: 24, borderRadius: 4 },
  footer: { padding: 24, borderTopWidth: 1, borderTopColor: '#E0E0E0', backgroundColor: '#FFF' },
  selectedCount: { textAlign: 'center', marginBottom: 12, color: '#666', fontSize: 14 },
  button: { borderRadius: 12, paddingVertical: 6 },
});
