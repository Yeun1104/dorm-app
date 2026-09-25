// @stomp/stompjs가 쓰는 TextEncoder/TextDecoder 폴리필 (Hermes에 TextDecoder가 없음)
import 'text-encoding';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
