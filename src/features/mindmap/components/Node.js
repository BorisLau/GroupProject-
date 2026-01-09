import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

const MIN_NODE_WIDTH = 100;
const MIN_NODE_HEIGHT = 60;

export default function Node({
  node,
  scale,
  onMove,
  onDelete,
  onTextChange,
  onPortClick,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(node.text);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const longPressTimer = useRef(null);
  const hasMoved = useRef(false);

  // 計算節點尺寸
  const nodeWidth = Math.max(MIN_NODE_WIDTH, node.width || MIN_NODE_WIDTH);
  const nodeHeight = Math.max(MIN_NODE_HEIGHT, node.height || MIN_NODE_HEIGHT);

  const handleLongPress = () => {
    if (!isDragging.value && !hasMoved.current) {
      Alert.alert(
        "刪除節點",
        "確定要刪除這個節點嗎？",
        [
          { text: "取消", style: "cancel" },
          {
            text: "刪除",
            style: "destructive",
            onPress: () => onDelete(node.id),
          },
        ]
      );
    }
  };

  // 拖動手勢
  const dragGesture = Gesture.Pan()
    .onStart(() => {
      isDragging.value = true;
      dragStartX.value = node.x;
      dragStartY.value = node.y;
      hasMoved.current = false;

      // 長按計時器（刪除）
      longPressTimer.current = setTimeout(() => {
        runOnJS(handleLongPress)();
      }, 800);
    })
    .onUpdate((event) => {
      // 移動超過10px取消長按
      if (Math.abs(event.translationX) > 10 || Math.abs(event.translationY) > 10) {
        hasMoved.current = true;
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }

      const newX = dragStartX.value + event.translationX / scale;
      const newY = dragStartY.value + event.translationY / scale;
      runOnJS(onMove)(node.id, newX, newY);
    })
    .onEnd(() => {
      isDragging.value = false;
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    })
    .onFinalize(() => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: withSpring(node.x * scale, { damping: 20 }) },
        { translateY: withSpring(node.y * scale, { damping: 20 }) },
        { scale: scale },
      ],
    };
  });

  const handleTextTap = () => {
    // 點擊編輯文字
    if (!hasMoved.current && !isEditing) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (text !== node.text) {
      onTextChange(node.id, text);
    }
  };

  return (
    <Animated.View
      style={[
        styles.nodeContainer,
        animatedStyle,
        {
          width: nodeWidth,
          height: nodeHeight,
        },
      ]}
    >
      <GestureDetector gesture={dragGesture}>
        <View style={styles.nodeBody}>
          {isEditing ? (
            <TextInput
              style={[styles.nodeText, styles.nodeInput]}
              value={text}
              onChangeText={setText}
              onBlur={handleBlur}
              autoFocus
              multiline
              textAlignVertical="center"
            />
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleTextTap}
              style={styles.textTouchable}
            >
              <Text style={styles.nodeText} numberOfLines={3}>
                {text}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </GestureDetector>

      {/* 左側連接點 */}
      <TouchableOpacity
        style={[styles.port, styles.portLeft]}
        onPress={() => onPortClick(node.id, 'left')}
        activeOpacity={0.7}
      >
        <View style={styles.portDot} />
      </TouchableOpacity>

      {/* 右側連接點 */}
      <TouchableOpacity
        style={[styles.port, styles.portRight]}
        onPress={() => onPortClick(node.id, 'right')}
        activeOpacity={0.7}
      >
        <View style={styles.portDot} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  nodeContainer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  nodeBody: {
    width: "100%",
    height: "100%",
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#000000",
    borderRadius: 8,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textTouchable: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  nodeText: {
    fontSize: 14,
    color: "#000000",
    textAlign: "center",
  },
  nodeInput: {
    width: "100%",
    height: "100%",
    borderWidth: 1,
    borderColor: "#007aff",
    borderRadius: 4,
    padding: 4,
    backgroundColor: "#ffffff",
  },
  port: {
    position: "absolute",
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  portLeft: {
    left: -12,
    top: "50%",
    marginTop: -12,
  },
  portRight: {
    right: -12,
    top: "50%",
    marginTop: -12,
  },
  portDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#007aff",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
});
