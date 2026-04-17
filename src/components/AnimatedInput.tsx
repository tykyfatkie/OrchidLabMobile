/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { TextInput, StyleSheet, View, TextInputProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
} from 'react-native-reanimated';
import { C } from '../constants/colors';
import type { ReactNode } from 'react';

export interface AnimatedInputProps {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  delay?: number;
  leftIcon?: ReactNode;
  rightAccessory?: ReactNode;
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  returnKeyType?: TextInputProps['returnKeyType'];
  blurOnSubmit?: boolean;
}

const AnimatedInput: React.FC<AnimatedInputProps> = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  delay = 0,
  leftIcon,
  rightAccessory,
  onSubmitEditing,
  returnKeyType,
  blurOnSubmit,
}) => {
  const [focused, setFocused] = useState(false);
  const focusAnim = useSharedValue(0);
  const slideIn = useSharedValue(36);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 480 }));
    slideIn.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 110 }));
  }, [delay]);

  const handleFocus = () => {
    setFocused(true);
    focusAnim.value = withTiming(1, { duration: 220 });
  };

  const handleBlur = () => {
    setFocused(false);
    focusAnim.value = withTiming(0, { duration: 220 });
  };

  const wrapperStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: slideIn.value }],
    borderColor: focused ? C.green3 : C.border,
    shadowOpacity: interpolate(focusAnim.value, [0, 1], [0, 0.18]),
    shadowRadius: interpolate(focusAnim.value, [0, 1], [0, 14]),
    elevation: interpolate(focusAnim.value, [0, 1], [0, 5]),
  }));

  return (
    <Animated.View style={[styles.inputWrapper, wrapperStyle]}>
      <View style={styles.inputRow}>
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={C.textLight}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          blurOnSubmit={blurOnSubmit}
        />
        {rightAccessory ? <View style={styles.rightAccessory}>{rightAccessory}</View> : null}
      </View>
    </Animated.View>
  );
};

export default AnimatedInput;

const styles = StyleSheet.create({
  inputWrapper: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 14,
    marginBottom: 14,
    backgroundColor: C.offWhite,
    shadowColor: C.green3,
    shadowOffset: { width: 0, height: 4 },
  },
  inputRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIcon: {
    paddingLeft: 14,
    paddingRight: 10,
  },
  rightAccessory: {
    paddingRight: 12,
    paddingLeft: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: C.textDark,
  },
});