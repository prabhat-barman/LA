import React, { useEffect, useState } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { useRecorder } from '../../context/RecorderContext';

interface LiveTimerTextProps {
  style?: StyleProp<TextStyle>;
  suffix?: string;
  prefix?: string;
}

export const LiveTimerText: React.FC<LiveTimerTextProps> = ({ style, suffix = '', prefix = '' }) => {
  const { subscribeToTimer, getSecondsLeft } = useRecorder();
  const [seconds, setSeconds] = useState(getSecondsLeft);

  useEffect(() => {
    const unsubscribe = subscribeToTimer((nextSeconds) => {
      setSeconds(nextSeconds);
    });
    return unsubscribe;
  }, [subscribeToTimer]);

  return <Text style={style}>{prefix}{seconds}{suffix}</Text>;
};
