import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, getFocusedRouteNameFromRoute, NavigationContainer, RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
    </>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Home" component={HomeScreen} />
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
      <Stack.Screen name="MyPosts" component={MyPostsScreen} />
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

/** 시안처럼 탭 루트 화면에서만 하단 탭바 노출 */
function tabBarVisible(route: RouteProp<TabParamList>) {
  const focused = getFocusedRouteNameFromRoute(route) ?? TAB_ROOTS[route.name];
  return focused === TAB_ROOTS[route.name];
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#397f9c',
        tabBarInactiveTintColor: '#9ca5a1',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: tabBarVisible(route)
          ? { backgroundColor: 'rgba(255,255,255,0.97)', borderTopColor: '#e8ecea' }
          : { display: 'none' },
        tabBarIcon: ({ color, focused }) => (
          <Icon name={TAB_ICONS[route.name]} size={23} color={color} filled={focused && route.name === 'HomeTab'} />
        ),
      })}
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
