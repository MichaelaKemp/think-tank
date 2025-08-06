import React from 'react';
import { Button, Image, StyleSheet, Text, View } from 'react-native';

export default function SpeciesDetailScreen({ route, navigation }: any) {
  const { species } = route.params; //navigating between screens, you can send data using params

  return (
    <View style={styles.container}>
      <Image source={{ uri: species.imageURL }} style={styles.image} />
      <Text style={styles.name}>{species.name}</Text>
      <Text style={styles.scientificName}>{species.scientificName}</Text>
      <Text>pH: {species.pH[0]}–{species.pH[1]}</Text>
      <Text>Temp: {species.temp[0]}–{species.temp[1]} °C</Text>
      <Text>Size: {species.size} cm</Text>
      <Text>Oxygen Need: {species.oxygenNeed}</Text>
      <Text style={styles.funFact}>Fun Fact: {species.funFact}</Text>
      <Button title="Close" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  image: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scientificName: {
    fontStyle: 'italic',
    marginBottom: 10,
  },
  funFact: {
    marginTop: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
