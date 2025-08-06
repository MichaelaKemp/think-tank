import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getAllSpecies } from '../services/DbService';

export default function ListScreen({ navigation }: any) {
  const [speciesList, setSpeciesList] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getAllSpecies();
      setSpeciesList(data);
    };
    fetchData();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Browse All Species</Text>
      <ScrollView>
        {speciesList.map(species => (
          <TouchableOpacity
            key={species.id}
            style={styles.card}
            onPress={() => navigation.navigate('Details', { species })}
          >
            <Image source={{ uri: species.imageURL }} style={styles.image} />
            <Text style={styles.cardTitle}>{species.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, padding: 20, backgroundColor: '#E0F7FA',
  },
  title: {
    fontSize: 28, fontWeight: 'bold', marginBottom: 15,
  },
  card: {
    backgroundColor: '#fff', padding: 15, marginVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center',
  },
  image: {
    width: 60, height: 60, marginRight: 10, borderRadius: 30,
  },
  cardTitle: {
    fontSize: 18, fontWeight: '600',
  },
});