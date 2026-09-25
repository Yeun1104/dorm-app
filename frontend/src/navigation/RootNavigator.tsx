import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, getFocusedRouteNameFromRoute, NavigationContainer, RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import Icon, { IconName } from '../components/Icon';
import { LoadingView } from '../components/ui';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatRoomScreen from '../screens/chat/ChatRoomScreen';
import ReportScreen from '../screens/common/ReportScreen';
import UserProfileScreen from '../screens/common/UserProfileScreen';
import {
  InquiryDetailScreen,
  InquiryFormScreen,
  InquiryListScreen,
  NoticeDetailScreen,
  NoticeListScreen,
  RepairDetailScreen,
  RepairFormScreen,
  RepairListScreen,
} from '../screens/dorm/BoardScreens';
import DormHomeScreen from '../screens/dorm/DormHomeScreen';
import DormLinkScreen from '../screens/dorm/DormLinkScreen';
import { FoodMenuScreen, IpsaDetailScreen, IpsaListScreen, SpointScreen } from '../screens/dorm/InfoScreens';
import { LeaveDetailScreen, LeaveFormScreen, LeaveListScreen } from '../screens/dorm/LeaveScreens';
import BoardDetailScreen from '../screens/home/BoardDetailScreen';
import BoardSearchScreen from '../screens/home/BoardSearchScreen';
import BoardWriteScreen from '../screens/home/BoardWriteScreen';
import HomeScreen from '../screens/home/HomeScreen';
import ReservationManageScreen, { RequestsScreen } from '../screens/home/ReservationManageScreen';
import DormAccountScreen from '../screens/my/DormAccountScreen';
import { LikedBoardsScreen, MyPostsScreen } from '../screens/my/MyBoardListScreen';
import MyPageScreen from '../screens/my/MyPageScreen';
import MyReservationsScreen from '../screens/my/MyReservationsScreen';
import SettingsScreen from '../screens/my/SettingsScreen';
import { colors } from '../theme';
import type { AppStackParamList, AuthStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const stackOptions = { headerShown: false, contentStyle: { backgroundColor: colors.bg } } as const;

/** 어느 탭에서든 진입할 수 있는 화면들 — 각 스택에 같이 등록해서 현재 탭 위에 쌓이게 함 */
function sharedScreens() {
  return (
    <>
      <Stack.Screen name="BoardDetail" component={BoardDetailScreen} />
      <Stack.Screen name="BoardWrite" component={BoardWriteScreen} />
      <Stack.Screen name="ReservationManage" component={ReservationManageScreen} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="Report" component={ReportScreen} />
      <Stack.Screen name="MyPosts" component={MyPostsScreen} />
    </>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="BoardSearch" component={BoardSearchScreen} />
      {sharedScreens()}
    </Stack.Navigator>
  );
}

function RequestStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Requests" component={RequestsScreen} />
      {sharedScreens()}
    </Stack.Navigator>
  );
}

function ChatStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      {sharedScreens()}
    </Stack.Navigator>
  );
}

function DormStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="DormHome" component={DormHomeScreen} />
      <Stack.Screen name="DormLink" component={DormLinkScreen} />
      <Stack.Screen name="LeaveList" component={LeaveListScreen} />
      <Stack.Screen name="LeaveDetail" component={LeaveDetailScreen} />
      <Stack.Screen name="LeaveForm" component={LeaveFormScreen} />
      <Stack.Screen name="RepairList" component={RepairListScreen} />
      <Stack.Screen name="RepairDetail" component={RepairDetailScreen} />
      <Stack.Screen name="RepairForm" component={RepairFormScreen} />
      <Stack.Screen name="NoticeList" component={NoticeListScreen} />
      <Stack.Screen name="NoticeDetail" component={NoticeDetailScreen} />
      <Stack.Screen name="InquiryList" component={InquiryListScreen} />
      <Stack.Screen name="InquiryDetail" component={InquiryDetailScreen} />
      <Stack.Screen name="InquiryForm" component={InquiryFormScreen} />
      <Stack.Screen name="Spoint" component={SpointScreen} />
      <Stack.Screen name="IpsaList" component={IpsaListScreen} />
      <Stack.Screen name="IpsaDetail" component={IpsaDetailScreen} />
      <Stack.Screen name="FoodMenu" component={FoodMenuScreen} />
    </Stack.Navigator>
  );
}

function MyStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="MyPage" component={MyPageScreen} />
      <Stack.Screen name="MyReservations" component={MyReservationsScreen} />
      <Stack.Screen name="LikedBoards" component={LikedBoardsScreen} />
      <Stack.Screen name="DormAccount" component={DormAccountScreen} />
      <Stack.Screen name="DormLink" component={DormLinkScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      {sharedScreens()}
    </Stack.Navigator>
  );
}

const TAB_ROOTS: Record<keyof TabParamList, keyof AppStackParamList> = {
  HomeTab: 'Home',
  RequestTab: 'Requests',
  ChatTab: 'ChatList',
  DormTab: 'DormHome',
  MyTab: 'MyPage',
};

const TAB_ICONS: Record<keyof TabParamList, IconName> = {
  HomeTab: 'home',
  RequestTab: 'inbox',
  ChatTab: 'chat',
  DormTab: 'dorm',
  MyTab: 'user',
};

/** 탭바를 계속 보여줄 하위 화면 */
const TAB_BAR_SCREENS: (keyof AppStackParamList)[] = ['BoardSearch'];

/** 시안처럼 탭 루트 화면(+ 검색 화면)에서만 하단 탭바 노출 */
function tabBarVisible(route: RouteProp<TabParamList>) {
  const focused = (getFocusedRouteNameFromRoute(route) ?? TAB_ROOTS[route.name]) as keyof AppStackParamList;
  return focused === TAB_ROOTS[route.name] || TAB_BAR_SCREENS.includes(focused);
}

/** 화면 아래에 떠 있는 둥근 탭바 — 선택된 탭은 아이콘 색 대신 뒤에 회색 배경 */
function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabRoute = state.routes[state.index];
  if (!tabBarVisible(tabRoute as RouteProp<TabParamList>)) return null;
  // 검색 화면은 최근 검색 기록을 볼 때만 탭바 노출, 결과를 볼 때는 숨김
  const stack = tabRoute.state;
  const inner = stack?.routes[stack.index ?? stack.routes.length - 1];
  if (inner?.name === 'BoardSearch' && (inner.params as AppStackParamList['BoardSearch'])?.searched) return null;

  return (
    <View style={[tabStyles.wrap, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
      <View style={tabStyles.bar}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const { options } = descriptors[route.key];
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable key={route.key} style={tabStyles.item} onPress={onPress}>
              <View style={[tabStyles.itemInner, focused && tabStyles.itemActive]}>
                <Icon name={TAB_ICONS[route.name as keyof TabParamList]} size={22} color={colors.text} />
                <Text style={tabStyles.label}>{options.title}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingTop: 6, backgroundColor: colors.bg },
  bar: { height: 66, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', borderRadius: 33, backgroundColor: 'white', borderWidth: 1, borderColor: '#eceff0', shadowColor: '#1f2d2a', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  item: { flex: 1, alignItems: 'center' },
  itemInner: { width: 62, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', gap: 2 },
  itemActive: { backgroundColor: '#eceeed' },
  label: { fontSize: 10.5, fontWeight: '600', color: colors.text },
});

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: '공동구매' }} />
      <Tab.Screen name="RequestTab" component={RequestStack} options={{ title: '요청' }} />
      <Tab.Screen name="ChatTab" component={ChatStack} options={{ title: '채팅' }} />
      <Tab.Screen name="DormTab" component={DormStack} options={{ title: '기숙사생활' }} />
      <Tab.Screen name="MyTab" component={MyStack} options={{ title: '마이' }} />
    </Tab.Navigator>
  );
}

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.primary } };

export default function RootNavigator() {
  const { state } = useAuth();

  if (state.status === 'loading') return <LoadingView />;

  return (
    <NavigationContainer theme={navTheme}>
      {state.status === 'signedIn' ? (
        <MainTabs />
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Signup" component={SignupScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
