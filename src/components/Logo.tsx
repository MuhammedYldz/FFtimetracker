import { View, Text } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, G } from 'react-native-svg';

/** The FocusFlow brand mark: a focus/progress ring on a gradient squircle. */
export function LogoMark({ size = 32 }: { size?: number }) {
  const c = size / 2;
  const r = size * 0.27;
  const sw = size * 0.11;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.74;
  const dotR = size * 0.075;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id="ffmark" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#152473" />
          <Stop offset="1" stopColor="#00a896" />
        </LinearGradient>
      </Defs>
      <Rect width={size} height={size} rx={size * 0.28} ry={size * 0.28} fill="url(#ffmark)" />
      <G rotation={-90} origin={`${c}, ${c}`}>
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke="#ffffff"
          strokeWidth={sw}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${arc} ${circ}`}
        />
      </G>
      <Circle cx={c} cy={c - r} r={dotR} fill="#ffffff" />
    </Svg>
  );
}

/** Brand lockup: mark + "FocusFlow" wordmark. */
export function Logo({ size = 30, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <View className="flex-row items-center gap-xs">
      <LogoMark size={size} />
      {wordmark ? (
        <Text className="font-display-bold text-headline-sm tracking-tight">
          <Text className="text-primary">Focus</Text>
          <Text className="text-secondary">Flow</Text>
        </Text>
      ) : null}
    </View>
  );
}
