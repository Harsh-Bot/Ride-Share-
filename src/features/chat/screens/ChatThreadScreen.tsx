import { View, Text, StyleSheet } from 'react-native';

type ChatThreadScreenProps = {
  route: {
    params?: {
      threadId?: string;
    };
  };
};

const ChatThreadScreen = ({ route }: ChatThreadScreenProps) => {
  const threadId = route?.params?.threadId ?? 'TBD';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat Thread {threadId}</Text>
      <Text style={styles.body}>TODO: Render real-time messaging experience.</Text>
    </View>
  );
};

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

export default ChatThreadScreen;
