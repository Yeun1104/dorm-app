import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
import { FeedbackProvider } from './src/components/Feedback';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <FeedbackProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </FeedbackProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
