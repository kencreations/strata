import React, { useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Animated,
    PanResponder,
    Dimensions,
    TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors, Typography } from "../theme";
import type { Event } from "../db/types";
import { CustomAlertModal } from "./CustomAlertModal";
import { formatTimeRange } from "../services/scheduleUtils";

interface Props {
    event: Event;
    onDelete: (id: string) => void;
    onEdit?: (event: Event) => void;
}

const { width } = Dimensions.get("window");
const SWIPE_THRESHOLD = -width * 0.3; // Swipe 30% of screen to trigger delete

export const EventCard: React.FC<Props> = ({ event, onDelete, onEdit }) => {
    const [isAlertVisible, setIsAlertVisible] = React.useState(false);
    const pan = useRef(new Animated.ValueXY()).current;
    const iconColor = event.layerColor || Colors.primary;
    const iconBg = `${iconColor}33`;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 10;
            },
            onPanResponderMove: Animated.event([null, { dx: pan.x }], {
                useNativeDriver: false,
            }),
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx < SWIPE_THRESHOLD) {
                    setIsAlertVisible(true);
                } else {
                    // Snap back
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: true,
                        bounciness: 10,
                    }).start();
                }
            },
        }),
    ).current;

    // Derive past state: event ended more than 0ms ago
    const isPast = event.endTime
        ? new Date(event.endTime).getTime() < Date.now()
        : false;

    return (
        <View style={[styles.wrapper, isPast && { opacity: 0.5 }]}>
            <View style={styles.container}>
                {/* Background Delete Action View */}
                <Animated.View
                    style={[
                        styles.actionBackground,
                        {
                            opacity: pan.x.interpolate({
                                inputRange: [-10, 0],
                                outputRange: [1, 0],
                                extrapolate: "clamp",
                            }),
                        },
                    ]}>
                    <MaterialIcons
                        name="delete-outline"
                        size={28}
                        color={Colors.surface}
                    />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.cardContainer,
                        { transform: [{ translateX: pan.x }] },
                    ]}
                    {...panResponder.panHandlers}>
                    {/* Timeline dot — gray checkmark when past */}
                    <View
                        style={[
                            styles.timelineDot,
                            {
                                backgroundColor: isPast
                                    ? Colors.outlineVariant
                                    : iconColor,
                            },
                        ]}
                    />

                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => onEdit?.(event)}
                        style={[
                            styles.timelineCard,
                            {
                                borderLeftColor: isPast
                                    ? Colors.outlineVariant
                                    : iconColor,
                            },
                        ]}>
                        {/* Compact row: title+meta LEFT | time RIGHT */}
                        <View style={styles.cardRow}>
                            <View style={styles.cardLeft}>
                                <Text
                                    style={styles.cardTitle}
                                    numberOfLines={1}>
                                    {event.title}
                                </Text>
                                {!!(event.location || event.layerName) && (
                                    <Text
                                        style={styles.cardMeta}
                                        numberOfLines={1}>
                                        {event.location || event.layerName}
                                    </Text>
                                )}
                            </View>
                            <Text
                                style={[
                                    styles.cardTime,
                                    isPast && {
                                        textDecorationLine:
                                            "line-through" as const,
                                        color: Colors.outlineVariant,
                                    },
                                ]}>
                                {formatTimeRange(
                                    event.startTime,
                                    event.endTime,
                                )}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            </View>

            <CustomAlertModal
                visible={isAlertVisible}
                title="Delete Event"
                message={`Are you sure you want to delete ${event.title} scheduled for ${formatTimeRange(event.startTime, event.endTime)}?`}
                confirmText="Delete"
                onCancel={() => {
                    setIsAlertVisible(false);
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: true,
                        bounciness: 10,
                    }).start();
                }}
                onConfirm={() => {
                    setIsAlertVisible(false);
                    Animated.timing(pan, {
                        toValue: { x: -width, y: 0 },
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => {
                        onDelete(event.id);
                    });
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 16,
    },
    container: {
        position: "relative",
    },
    actionBackground: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 40,
        right: 0,
        backgroundColor: "#FF3B30",
        borderRadius: 12,
        alignItems: "flex-end",
        justifyContent: "center",
        paddingRight: 24,
    },
    cardContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    timelineDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginTop: 2,
        marginLeft: -1,
        zIndex: 1,
        flexShrink: 0,
    },
    timelineInnerDot: { width: 8, height: 8, borderRadius: 4 },
    timelineCard: {
        flex: 1,
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderLeftWidth: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    // Compact horizontal layout
    cardRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8,
    },
    cardLeft: {
        flex: 1,
        gap: 2,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#111827",
        fontFamily: "Inter_700Bold",
        lineHeight: 21,
    },
    cardMeta: {
        ...Typography.bodyMd,
        color: Colors.onSurfaceVariant,
        fontSize: 12,
    },
    cardTime: {
        fontSize: 12,
        fontWeight: "600" as const,
        color: "#0F4C5C",
        fontFamily: "Inter_600SemiBold",
        textAlign: "right" as const,
        flexShrink: 0,
        lineHeight: 16,
    },
});
