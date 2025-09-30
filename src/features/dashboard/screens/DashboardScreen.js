// import React from 'react';
// import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
// import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons'; 

// // Import your defined colors
// import CoffeeColors from '../../../theme/colors'; 

// const DashboardScreen = () => {
//   const Card = ({ iconName, iconLibrary, title, description, time, recorder, color }) => (
//     <TouchableOpacity style={styles.card} activeOpacity={0.7}>
//       <View style={styles.cardHeader}>
//         {iconLibrary === 'Ionicons' && <Ionicons name={iconName} size={24} color={color} />}
//         {iconLibrary === 'MaterialCommunityIcons' && <MaterialCommunityIcons name={iconName} size={24} color={color} />}
//         {iconLibrary === 'FontAwesome5' && <FontAwesome5 name={iconName} size={24} color={color} />}
//         <Text style={styles.cardTitle}>{title}</Text>
//       </View>
//       <Text style={styles.cardDescription}>{description}</Text>
//       <Text style={styles.cardInfo}>{time} • Recorded by {recorder}</Text>
//     </TouchableOpacity>
//   );

//   return (
//     <View style={styles.container}>
//       {/* Header Placeholder (New addition for better UI) */}
//       <View style={styles.header}>
//         <Text style={styles.headerTitle}>FMIS Dashboard</Text>
//         <Ionicons name="notifications-outline" size={24} color={CoffeeColors.CREAM} />
//       </View>

//       <ScrollView contentContainerStyle={styles.scrollViewContent}>
//         <Card
//           iconName="cube"
//           iconLibrary="MaterialCommunityIcons"
//           title="Aggregation"
//           description="Aggregation recorded: 1200 kg of coffee cherries"
//           time="10:30 AM"
//           recorder="Sarah"
//           color={CoffeeColors.LIGHT_BROWN} // Use a palette color
//         />
//         <Card
//           iconName="seedling"
//           iconLibrary="FontAwesome5"
//           title="Harvest"
//           description="Harvest recorded: 500 kg of coffee cherries"
//           time="09:00 AM"
//           recorder="David"
//           color={CoffeeColors.MEDIUM_BROWN} // Use a palette color
//         />
//         <Card
//           iconName="coffee"
//           iconLibrary="FontAwesome5"
//           title="Processing"
//           description="Processing recorded: Washed 300 kg of coffee cherries"
//           time="02:00 PM"
//           recorder="Emily"
//           color={CoffeeColors.GOLD} // Use a palette color
//         />
//         {/* Empty card placeholder */}
//         <View style={styles.card} />
//       </ScrollView>

//       {/* Bottom Navigation Bar Placeholder */}
//       <View style={styles.bottomNavBar}>
//         <TouchableOpacity style={styles.navItem}>
//           <Ionicons name="people-outline" size={24} color={CoffeeColors.MEDIUM_BROWN} />
//           <Text style={styles.navText}>Aggregations</Text>
//         </TouchableOpacity>
//         <TouchableOpacity style={styles.navItem}>
//           <MaterialCommunityIcons name="seedling" size={24} color={CoffeeColors.MEDIUM_BROWN} />
//           <Text style={styles.navText}>Harvests</Text>
//         </TouchableOpacity>
//         <TouchableOpacity style={styles.navItem}>
//           <MaterialCommunityIcons name="home-outline" size={24} color={CoffeeColors.DARK_BROWN} />
//           <Text style={[styles.navText, {color: CoffeeColors.DARK_BROWN, fontWeight: 'bold'}]}>Processing</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: CoffeeColors.LIGHT_GRAY, // Use the light neutral background
//   },
//   header: {
//     paddingTop: 50,
//     paddingHorizontal: 20,
//     paddingBottom: 15,
//     backgroundColor: CoffeeColors.DARK_BROWN, // Dark brown header
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   headerTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: CoffeeColors.CREAM, // Cream text on dark background
//   },
//   scrollViewContent: {
//     padding: 15,
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//   },
//   card: {
//     backgroundColor: CoffeeColors.WHITE,
//     borderRadius: 10,
//     padding: 15,
//     marginBottom: 15,
//     width: '48%',
//     elevation: 3,
//     shadowColor: CoffeeColors.DARK_BROWN, // Darker shadow for depth
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 3,
//     minHeight: 180,
//   },
//   cardHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 10,
//   },
//   cardTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginLeft: 10,
//     color: CoffeeColors.DARK_BROWN, // Dark text on light card
//   },
//   cardDescription: {
//     fontSize: 14,
//     color: CoffeeColors.GRAY_TEXT,
//     marginBottom: 5,
//   },
//   cardInfo: {
//     fontSize: 12,
//     color: CoffeeColors.GRAY_TEXT,
//   },
//   bottomNavBar: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     alignItems: 'center',
//     backgroundColor: CoffeeColors.WHITE,
//     borderTopWidth: 1,
//     borderTopColor: CoffeeColors.LIGHT_BROWN, // A subtle border color
//     paddingVertical: 10,
//     paddingHorizontal: 5,
//   },
//   navItem: {
//     alignItems: 'center',
//   },
//   navText: {
//     fontSize: 10,
//     color: CoffeeColors.MEDIUM_BROWN, // Default nav item color
//     marginTop: 4,
//   },
// });

// export default DashboardScreen;

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons'; 

// Import your defined colors (ASSUMING PATH IS NOW CORRECT)
import CoffeeColors from '../../../theme/colors'; 

const DashboardScreen = () => {
  const Card = ({ iconName, iconLibrary, title, description, time, recorder, color }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        {iconLibrary === 'Ionicons' && <Ionicons name={iconName} size={24} color={color} />}
        {iconLibrary === 'MaterialCommunityIcons' && <MaterialCommunityIcons name={iconName} size={24} color={color} />}
        {iconLibrary === 'FontAwesome5' && <FontAwesome5 name={iconName} size={24} color={color} />}
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardDescription}>{description}</Text>
      <Text style={styles.cardInfo}>{time} • Recorded by {recorder}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Placeholder */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FMIS Dashboard</Text>
        <Ionicons name="notifications-outline" size={24} color={CoffeeColors.CREAM} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Card
          iconName="cube"
          iconLibrary="MaterialCommunityIcons"
          title="Aggregation"
          description="Aggregation recorded: 1200 kg of coffee cherries"
          time="10:30 AM"
          recorder="Sarah"
          color={CoffeeColors.LIGHT_BROWN} // Use a palette color
        />
        <Card
          iconName="seedling"
          iconLibrary="FontAwesome5"
          title="Harvest"
          description="Harvest recorded: 500 kg of coffee cherries"
          time="09:00 AM"
          recorder="David"
          color={CoffeeColors.MEDIUM_BROWN} // Use a palette color
        />
        <Card
          iconName="coffee"
          iconLibrary="FontAwesome5"
          title="Processing"
          description="Processing recorded: Washed 300 kg of coffee cherries"
          time="02:00 PM"
          recorder="Emily"
          color={CoffeeColors.GOLD} // Use a palette color
        />
        {/* Empty card placeholder */}
        <View style={styles.card} />
      </ScrollView>

      {/* Bottom Navigation Bar Placeholder */}
      <View style={styles.bottomNavBar}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="people-outline" size={24} color={CoffeeColors.MEDIUM_BROWN} />
          <Text style={styles.navText}>Aggregations</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          {/* FIX: Changed from MaterialCommunityIcons to FontAwesome5 for the 'seedling' icon */}
          <FontAwesome5 name="seedling" size={24} color={CoffeeColors.MEDIUM_BROWN} />
          <Text style={styles.navText}>Harvests</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialCommunityIcons name="home-outline" size={24} color={CoffeeColors.DARK_BROWN} />
          <Text style={[styles.navText, {color: CoffeeColors.DARK_BROWN, fontWeight: 'bold'}]}>Processing</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CoffeeColors.LIGHT_GRAY, // Use the light neutral background
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: CoffeeColors.DARK_BROWN, // Dark brown header
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CoffeeColors.CREAM, // Cream text on dark background
  },
  scrollViewContent: {
    padding: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    width: '48%',
    elevation: 3,
    shadowColor: CoffeeColors.DARK_BROWN, // Darker shadow for depth
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    minHeight: 180,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: CoffeeColors.DARK_BROWN, // Dark text on light card
  },
  cardDescription: {
    fontSize: 14,
    color: CoffeeColors.GRAY_TEXT,
    marginBottom: 5,
  },
  cardInfo: {
    fontSize: 12,
    color: CoffeeColors.GRAY_TEXT,
  },
  bottomNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: CoffeeColors.WHITE,
    borderTopWidth: 1,
    borderTopColor: CoffeeColors.LIGHT_BROWN, // A subtle border color
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 10,
    color: CoffeeColors.MEDIUM_BROWN, // Default nav item color
    marginTop: 4,
  },
});

export default DashboardScreen;