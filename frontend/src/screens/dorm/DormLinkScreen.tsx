import { useToast } from '../../components/Feedback';
import { Screen, SubHeader } from '../../components/ui';
import type { ScreenProps } from '../../navigation/types';
import DormLinkForm from './DormLinkForm';

export default function DormLinkScreen({ navigation }: ScreenProps<'DormLink'>) {
  const toast = useToast();
  return (
    <Screen bg="white">
      <SubHeader title="기숙사 계정 연동" />
      <DormLinkForm
        onLinked={() => {
          toast('기숙사 계정 연동을 완료했어요');
          navigation.goBack();
        }}
      />
    </Screen>
  );
}
