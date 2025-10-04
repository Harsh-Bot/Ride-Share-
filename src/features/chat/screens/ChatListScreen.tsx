import { View, Text, StyleSheet } from 'react-native';

const ChatListScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Chat & Notifications</Text>
    <Text style={styles.body}>TODO: Display ride conversations, unread indicators, and messaging entry points.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12
  },
  body: {
    fontSize: 16
  }
});

export default ChatListScreen;
