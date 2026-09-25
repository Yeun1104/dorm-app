import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LeaveKind } from '../api/dorm';

/**
 * 모든 탭 스택이 공유하는 화면 파라미터.
 * 게시글 상세/프로필/신고처럼 여러 탭에서 진입하는 화면은 각 스택에 같은 이름으로 등록해서
 * 탭 이동 없이 현재 스택 위에 쌓이도록 함.
 */
export type AppStackParamList = {
  // 공동구매
  Home: undefined;
  /** boardId가 있으면 수정 모드 */
  BoardWrite: { boardId?: number } | undefined;
  BoardDetail: { boardId: number };
  /** boardId 없으면 내 모든 모집중 글의 요청을 게시글 선택 후 관리 */
  ReservationManage: { boardId?: number };
  /** 하단 '요청' 탭 루트 (참여 요청 관리) */
  Requests: undefined;

  // 채팅
  ChatList: undefined;
  ChatRoom: { roomId: number };

  // 공통
  UserProfile: { userId: number };
  Report: { userId: number; nickname: string; boardId?: number };

  // 기숙사생활
  DormHome: undefined;
  DormLink: undefined;
  LeaveList: { kind: LeaveKind };
  LeaveDetail: { kind: LeaveKind; no: number };
  LeaveForm: { kind: LeaveKind };
  RepairList: undefined;
  RepairDetail: { no: number };
  RepairForm: { no?: number };
  NoticeList: undefined;
  NoticeDetail: { no: number };
  InquiryList: undefined;
  InquiryDetail: { no: number };
  InquiryForm: { no?: number };
  Spoint: undefined;
  IpsaList: undefined;
  IpsaDetail: { mozipCode: number; title: string };
  FoodMenu: undefined;

  // 마이페이지
  MyPage: undefined;
  MyReservations: undefined;
  LikedBoards: undefined;
  MyPosts: undefined;
  DormAccount: undefined;
  Settings: undefined;
};

export type TabParamList = {
  HomeTab: NavigatorScreenParams<AppStackParamList>;
  RequestTab: NavigatorScreenParams<AppStackParamList>;
  ChatTab: NavigatorScreenParams<AppStackParamList>;
  DormTab: NavigatorScreenParams<AppStackParamList>;
  MyTab: NavigatorScreenParams<AppStackParamList>;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: { tempToken: string };
};

export type ScreenProps<K extends keyof AppStackParamList> = NativeStackScreenProps<AppStackParamList, K>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // useNavigation()을 타입 지정 없이 써도 공유 스택 화면들로 이동 가능하게
    interface RootParamList extends AppStackParamList, TabParamList {}
  }
}
