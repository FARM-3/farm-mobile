import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';

export default function FieldOpsScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <SimpleHeader title="Field Operations" onBackPress={() => navigation.goBack()} />
      <View style={styles.content}>
        <Text style={styles.subtitle}>Log block-level activities and field surveillance — data flows to web reports & trace.</Text>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('BlockActivityForm')}>
          <Ionicons name="leaf" size={28} color={CoffeeColors.PRIMARY_BROWN} />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Block Activity</Text>
            <Text style={styles.cardDesc}>Practices, fertilizer & pesticide applications per block</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SurveillanceForm')}>
          <Ionicons name="eye" size={28} color={CoffeeColors.PRIMARY_BROWN} />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Surveillance Report</Text>
            <Text style={styles.cardDesc}>Pests, disease, quality issues — appears on web Task Management</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#999" />
        </TouchableOpacity>
      </View>
      <BottomNav activeScreen="Dashboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f3' },
  content: { flex: 1, padding: 16 },
  subtitle: { fontFamily: Fonts.regular, fontSize: 14, color: '#666', marginBottom: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#eee',
  },
  cardText: { flex: 1, marginLeft: 14 },
  cardTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: CoffeeColors.DARK_BROWN },
  cardDesc: { fontFamily: Fonts.regular, fontSize: 12, color: '#888', marginTop: 4 },
});
