import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
}

export default function SwipeableRow({ children, onDelete }: SwipeableRowProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const handleDelete = useCallback(() => {
    swipeableRef.current?.close();
    setTimeout(() => {
      onDelete();
    }, 250);
  }, [onDelete]);

  const renderRightActions = useCallback(
    (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
      const scale = dragX.interpolate({
        inputRange: [-100, -60, 0],
        outputRange: [1, 0.8, 0.4],
        extrapolate: 'clamp',
      });
      const opacity = dragX.interpolate({
        inputRange: [-80, -40, 0],
        outputRange: [1, 0.6, 0],
        extrapolate: 'clamp',
      });

      return (
        <View onStartShouldSetResponder={() => true} onResponderRelease={handleDelete} style={styles.deleteAction}>
          <Animated.View style={[styles.deleteIconWrap, { opacity, transform: [{ scale }] }]}>
            <MaterialIcons name="delete" size={22} color="#FFF" />
          </Animated.View>
        </View>
      );
    },
    [handleDelete],
  );

  return (
    <View style={styles.container}>
      <Swipeable
        ref={swipeableRef}
        friction={2}
        overshootFriction={8}
        rightThreshold={80}
        renderRightActions={renderRightActions}
        overshootRight={false}
        useNativeAnimations={true}
      >
        <View style={styles.content}>
          {children}
        </View>
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  deleteAction: {
    width: 76,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    backgroundColor: theme.background,
  },
});
