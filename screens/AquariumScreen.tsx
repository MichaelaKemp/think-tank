import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AquariumScreen() {
  // holds all the fish/items in the tank
  const [tankItems, setTankItems] = useState<any[]>([]);

  const [tankStats, setTankStats] = useState({
    avgPh: 0,
    avgTemp: 0,
    oxygenStatus: 'unknown',
  });

  const [userTemp, setUserTemp] = useState(26);
  const [userOxygen, setUserOxygen] = useState(2); // 1=Low, 2=Medium, 3=High

  // lock screen to landscape when this screen is active
  useFocusEffect(
    React.useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      return () => {
        ScreenOrientation.unlockAsync();
      };
    }, [])
  );

  // adds a new item to the tank and updates stats accordingly
  const addToTank = (item: any) => {
    const status = assessFishHealth(item, userTemp, userOxygen); // figure out if it's stressed
    const updatedItem = { ...item, status }; // attach that info to the item

    const updated = [...tankItems, updatedItem];
    setTankItems(updated);
    updateTankStats(updated);
  };

  // re-evaluate every fish in the tank based on new temp/oxygen
  const reassessAllFish = () => {
    const updated = tankItems.map((item) => {
      const status = assessFishHealth(item, userTemp, userOxygen);
      return { ...item, status };
    });
    setTankItems(updated);
  };

  // calculate the tank's average pH/temp and oxygen need
  const updateTankStats = (items: any[]) => {
    if (items.length === 0) {
      setTankStats({ avgPh: 0, avgTemp: 0, oxygenStatus: 'unknown' });
      return;
    }

    let totalPh = 0;
    let totalTemp = 0;
    let oxygenNeeds: string[] = [];

    items.forEach((item) => {
      const [phMin, phMax] = item.pH;
      const [tempMin, tempMax] = item.temp;
      totalPh += (phMin + phMax) / 2;
      totalTemp += (tempMin + tempMax) / 2;
      oxygenNeeds.push(item.oxygenNeed);
    });

    const avgPh = parseFloat((totalPh / items.length).toFixed(1)); //converts a number to a string that’s rounded to 1 decimal place.
    const avgTemp = parseFloat((totalTemp / items.length).toFixed(1)); 

    // figure out overall oxygen status from the fish
    let oxygenStatus = 'medium';
    if (oxygenNeeds.includes('high')) oxygenStatus = 'high';
    if (oxygenNeeds.every((o) => o === 'low')) oxygenStatus = 'low'; //array method that returns true only if every element passes the condition.
    //If all fish only need low oxygen → tank can run with low oxygen mode.

    setTankStats({ avgPh, avgTemp, oxygenStatus });
  };

  const exampleSpecies = {
    name: 'Betta',
    pH: [6, 7.5],
    temp: [24, 28],
    oxygenNeed: 'medium',
  };

  const oxygenLabels = ['Low', 'Medium', 'High'];

  const assessFishHealth = (fish: any, temp: number, oxygen: number) => {
    const [minTemp, maxTemp] = fish.temp;
    const oxygenMatch = oxygenLabels[oxygen - 1].toLowerCase() === fish.oxygenNeed;
    const tempOK = temp >= minTemp && temp <= maxTemp;
    return tempOK && oxygenMatch ? 'healthy' : 'stressed';
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftPane}>
        <Text style={styles.title}>Aquarium Builder</Text>

        <TouchableOpacity style={styles.addButton} onPress={() => addToTank(exampleSpecies)}>
          <Text style={styles.buttonText}>Add Example Fish</Text>
        </TouchableOpacity>

        <View style={styles.stats}>
          <Text style={styles.statsText}>Avg pH: {tankStats.avgPh}</Text>
          <Text style={styles.statsText}>Avg Temp: {tankStats.avgTemp} °C</Text>
          <Text style={styles.statsText}>Tank Oxygen: {tankStats.oxygenStatus}</Text>
        </View>
      </View>

      <View style={styles.tankArea}>
        {tankItems.map((item, index) => (
          <Text key={index}>
            {item.name} - Status: {item.status === 'healthy' ? '💚 Healthy' : '⚠️ Stressed'}
          </Text>
        ))}
      </View>

      <View style={styles.controlPanel}>
        <Text style={styles.sliderLabel}>Set Temp ({userTemp}°C)</Text>
        <Slider
          style={styles.slider}
          minimumValue={10}
          maximumValue={35}
          step={1}
          value={userTemp}
          onValueChange={(value: number) => {
            setUserTemp(value);
            reassessAllFish();
          }}
          minimumTrackTintColor="#0288D1"
          maximumTrackTintColor="#90CAF9"
        />

        <Text style={styles.sliderLabel}>Set Oxygen: {oxygenLabels[userOxygen - 1]}</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={3}
          step={1}
          value={userOxygen}
          onValueChange={(value: number) => {
            setUserOxygen(value);
            reassessAllFish();
          }}
          minimumTrackTintColor="#0288D1"
          maximumTrackTintColor="#90CAF9"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#B3E5FC',
  },
  leftPane: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#81D4FA',
  },
  tankArea: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E1F5FE',
  },
  controlPanel: {
    flex: 0.7,
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#B3E5FC',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  stats: {
    marginTop: 20,
  },
  statsText: {
    fontSize: 16,
    marginVertical: 4,
  },
  addButton: {
    backgroundColor: '#0288D1',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  slider: {
    height: 40,
    marginVertical: 20,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});