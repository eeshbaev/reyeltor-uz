import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { PostRegistrationWelcome } from '@/components/registration/PostRegistrationWelcome';
import { useAuth } from '@/lib/context/AuthContext';

export default function RegistrationWelcomeScreen() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  const { profile } = useAuth();
  const fullName = (typeof name === 'string' && name.trim()) || profile?.full_name || 'there';

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <PostRegistrationWelcome fullName={fullName} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
});
