import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import { KippPlaceholder } from "../components/KippPlaceholder";
import { Colors, Typography, Spacing } from "../theme";
import { useScheduleStore } from "../store/scheduleStore";
import { useAuthStore } from "../store/authStore";
import { useSettingsStore } from "../store/settingsStore";
import {
    resolveConflict,
    formatCountdown,
    formatTimeRange,
} from "../services/scheduleUtils";
import type { MainTabParamList } from "../navigation/RootNavigator";

type Nav = BottomTabNavigationProp<MainTabParamList, "Home">;

// ─── Hero Card ────────────────────────────────────────────────────────────────

const UpNextHeroCard: React.FC<{
    countdown: string;
    eventName: string;
    location: string;
    isOngoing?: boolean;
    onMarkDone?: () => void;
}> = ({ countdown, eventName, location, isOngoing, onMarkDone }) => {
    const pulseAnim = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        if (isOngoing) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 0.5,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                ]),
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isOngoing]);

    return (
        <View style={heroStyles.card}>
            {/* Decorative circle top-right */}
            <View style={heroStyles.decorCircle} />

            {/* ── Top Row: state label (hidden when ongoing) + pill ── */}
            <View style={heroStyles.topRow}>
                {!isOngoing && (
                    <Text style={heroStyles.upNextLabel}>UP NEXT</Text>
                )}
                {isOngoing ? (
                    <Animated.View
                        style={[
                            heroStyles.countdownPill,
                            { opacity: pulseAnim, backgroundColor: "#F59E0B" },
                        ]}>
                        <View style={heroStyles.pillLiveDot} />
                        <Text
                            style={[
                                heroStyles.countdownPillText,
                                { color: "#1C0A00" },
                            ]}>
                            Happening Now
                        </Text>
                    </Animated.View>
                ) : (
                    <View style={heroStyles.countdownPill}>
                        <MaterialIcons
                            name="schedule"
                            size={13}
                            color="#84F5EE"
                        />
                        <Text style={heroStyles.countdownPillText}>
                            {countdown}
                        </Text>
                    </View>
                )}
            </View>

            {/* ── Event title + location ── */}
            <View style={heroStyles.eventInfo}>
                <Text style={heroStyles.eventTitle} numberOfLines={2}>
                    {eventName}
                </Text>
                <View style={heroStyles.locationRow}>
                    <MaterialIcons name="place" size={13} color="#5EEAD4" />
                    <Text style={heroStyles.locationText} numberOfLines={1}>
                        {location || "No location set"}
                    </Text>
                </View>
            </View>

            {/* ── Mark as Done button (only when ongoing) ── */}
            {isOngoing && (
                <TouchableOpacity
                    style={heroStyles.markDoneBtn}
                    onPress={onMarkDone}
                    activeOpacity={0.88}>
                    <MaterialIcons
                        name="check-circle-outline"
                        size={18}
                        color="#042F2E"
                    />
                    <Text style={heroStyles.markDoneText}>Mark as Done</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const heroStyles = StyleSheet.create({
    card: {
        backgroundColor: "#042F2E",
        borderRadius: 20,
        padding: 20,
        overflow: "hidden",
        gap: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.38,
        shadowRadius: 16,
        elevation: 10,
    },
    decorCircle: {
        position: "absolute",
        top: -50,
        right: -50,
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: "#0D4A45",
        opacity: 0.55,
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    upNextLabel: {
        fontSize: 11,
        fontWeight: "600" as const,
        letterSpacing: 1.8,
        color: "#99F6E4",
        fontFamily: "Inter_600SemiBold",
        borderLeftWidth: 2,
        borderLeftColor: "#5EEAD4",
        paddingLeft: 6,
    },
    countdownPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.12)",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
        gap: 5,
    },
    pillLiveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#7C2D00",
        opacity: 0.8,
    },
    countdownPillText: {
        fontSize: 13,
        fontWeight: "700" as const,
        color: "#84F5EE",
        fontFamily: "Inter_700Bold",
        letterSpacing: -0.3,
    },
    eventInfo: { gap: 6 },
    eventTitle: {
        fontSize: 22,
        fontWeight: "700" as const,
        color: "#FFFFFF",
        fontFamily: "Inter_700Bold",
        letterSpacing: -0.4,
        lineHeight: 28,
    },
    locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    locationText: {
        fontSize: 13,
        color: "#5EEAD4",
        fontFamily: "Inter_400Regular",
        flex: 1,
    },
    markDoneBtn: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        paddingVertical: 13,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        marginTop: 2,
    },
    markDoneText: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#042F2E",
        fontFamily: "Inter_600SemiBold",
    },
});

// ─── Dashboard Screen ────────────────────────────────────────────────────────────────

export const DashboardScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<Nav>();
    const isFocused = useIsFocused();

    const { user } = useAuthStore();
    const { nickname } = useSettingsStore();
    const {
        timeline,
        upNextEvent,
        leaveInSeconds,
        refreshToday,
        initialize,
        markEventDone,
    } = useScheduleStore();

    const [countdownStr, setCountdownStr] = useState("00:00");

    useEffect(() => {
        if (user) initialize(user.id);
    }, [user]);

    useEffect(() => {
        if (isFocused && user) refreshToday(user.id);
    }, [isFocused, user]);

    useEffect(() => {
        let secs = leaveInSeconds;
        setCountdownStr(formatCountdown(secs));
        const id = setInterval(() => {
            if (secs > 0) {
                secs--;
                setCountdownStr(formatCountdown(secs));
            } else {
                clearInterval(id);
            }
        }, 1000);
        return () => clearInterval(id);
    }, [leaveInSeconds]);

    const handleResolve = async (conflictId?: string) => {
        if (conflictId && user) {
            await resolveConflict(conflictId, "manual");
            refreshToday(user.id);
        }
    };

    const getEventIcon = (layerName?: string): any => {
        if (!layerName) return "event";
        const n = layerName.toLowerCase();
        if (n.includes("academic") || n.includes("university")) return "school";
        if (n.includes("work")) return "work";
        return "access-time";
    };

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 17) return "Good afternoon";
        return "Good evening";
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" />

            <ScrollView
                contentContainerStyle={[
                    styles.scroll,
                    {
                        paddingTop: insets.top + Spacing.stackMd,
                        paddingBottom: insets.bottom + 100,
                    },
                ]}
                showsVerticalScrollIndicator={false}>
                {/* ── Greeting ── */}
                <View style={styles.greetingSection}>
                    <Text style={styles.greeting}>
                        {getGreeting()},{" "}
                        {nickname || user?.fullName?.split(" ")[0] || "Student"}!
                    </Text>
                    <Text style={styles.dateLine}>
                        {new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                        })}
                        {timeline.length > 0
                            ? ` • ${timeline.length} events today`
                            : ""}
                    </Text>
                </View>

                {/* ── Hero Card ── */}
                {upNextEvent && (
                    <UpNextHeroCard
                        countdown={countdownStr}
                        eventName={upNextEvent.title}
                        location={upNextEvent.location ?? ""}
                        isOngoing={leaveInSeconds === 0}
                        onMarkDone={() => markEventDone(upNextEvent.id)}
                    />
                )}

                {/* ── Timeline Section ── */}
                <View>
                    <Text style={styles.sectionTitle}>Today’s Timeline</Text>

                    <View style={styles.timeline}>
                        {/* Thin vertical connector line */}
                        <View style={styles.timelineLine} />

                        {timeline.length === 0 && (
                            <Text style={styles.emptyText}>
                                No events today. Enjoy the free time!
                            </Text>
                        )}

                        {[...timeline]
                            .sort((a, b) => {
                                // Group: past events sink to the bottom; within each group sort chronologically
                                if (a.isPast === b.isPast) {
                                    return (
                                        new Date(a.startTime).getTime() -
                                        new Date(b.startTime).getTime()
                                    );
                                }
                                return a.isPast ? 1 : -1;
                            })
                            .map((event) => {
                                const icon = getEventIcon(event.layerName);
                                const isConflict = event.hasConflict;
                                const accentColor = isConflict
                                    ? Colors.error
                                    : (event.layerColor ?? Colors.primary);
                                const nodeBg = isConflict
                                    ? Colors.error
                                    : accentColor;
                                const nodeIconColor = "#FFFFFF";

                                return (
                                    <View
                                        key={event.id}
                                        style={styles.eventRow}>
                                        {/* ── Timeline node ── */}
                                        <View
                                            style={[
                                                styles.nodeDot,
                                                {
                                                    backgroundColor:
                                                        event.isPast
                                                            ? Colors.outlineVariant
                                                            : nodeBg,
                                                },
                                            ]}>
                                            <MaterialIcons
                                                name={
                                                    isConflict
                                                        ? "warning"
                                                        : event.isPast
                                                          ? "check"
                                                          : icon
                                                }
                                                size={18}
                                                color={
                                                    event.isPast
                                                        ? Colors.onSurfaceVariant
                                                        : nodeIconColor
                                                }
                                            />
                                        </View>

                                        {/* ── Event card ── */}
                                        {isConflict ? (
                                            /* Conflict card */
                                            <View style={styles.conflictCard}>
                                                {/* Diagonal stripe overlay */}
                                                <View
                                                    style={
                                                        styles.conflictStripe
                                                    }
                                                />
                                                <View
                                                    style={
                                                        styles.conflictInner
                                                    }>
                                                    {/* Time + conflict badge */}
                                                    <View
                                                        style={
                                                            styles.conflictTimeRow
                                                        }>
                                                        <Text
                                                            style={
                                                                styles.conflictTimeText
                                                            }>
                                                            {formatTimeRange(
                                                                event.startTime,
                                                                event.endTime,
                                                            )}
                                                        </Text>
                                                        <View
                                                            style={
                                                                styles.conflictBadge
                                                            }>
                                                            <MaterialIcons
                                                                name="error"
                                                                size={11}
                                                                color={
                                                                    Colors.error
                                                                }
                                                            />
                                                            <Text
                                                                style={
                                                                    styles.conflictBadgeText
                                                                }>
                                                                CONFLICT
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Text
                                                        style={
                                                            styles.conflictTitle
                                                        }>
                                                        {event.title}
                                                    </Text>
                                                    {!!event.location && (
                                                        <Text
                                                            style={
                                                                styles.conflictLocation
                                                            }>
                                                            {event.location}
                                                        </Text>
                                                    )}
                                                    <TouchableOpacity
                                                        style={
                                                            styles.resolveBtn
                                                        }
                                                        onPress={() =>
                                                            handleResolve(
                                                                event.conflictId,
                                                            )
                                                        }
                                                        activeOpacity={0.85}>
                                                        <Text
                                                            style={
                                                                styles.resolveBtnText
                                                            }>
                                                            Resolve Conflict
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ) : (
                                            /* Normal card — left accent strip + flat content */
                                            <View style={styles.eventCard}>
                                                <View
                                                    style={[
                                                        styles.accentStrip,
                                                        {
                                                            backgroundColor:
                                                                event.isPast
                                                                    ? Colors.outlineVariant
                                                                    : accentColor,
                                                        },
                                                    ]}
                                                />
                                                <View
                                                    style={
                                                        styles.eventCardContent
                                                    }>
                                                    {/* Compact row: left (title + meta) | right (time) */}
                                                    <View
                                                        style={
                                                            styles.eventCardRow
                                                        }>
                                                        <View
                                                            style={
                                                                styles.eventCardLeft
                                                            }>
                                                            <Text
                                                                style={[
                                                                    styles.eventTitle,
                                                                    event.isPast && {
                                                                        color: Colors.onSurfaceVariant,
                                                                    },
                                                                ]}
                                                                numberOfLines={
                                                                    1
                                                                }>
                                                                {event.title}
                                                            </Text>
                                                            {(!!event.location ||
                                                                !!event.layerName) && (
                                                                <Text
                                                                    style={[
                                                                        styles.eventMeta,
                                                                        event.isPast && {
                                                                            color: Colors.outlineVariant,
                                                                        },
                                                                    ]}
                                                                    numberOfLines={
                                                                        1
                                                                    }>
                                                                    {event.location ||
                                                                        event.layerName}
                                                                </Text>
                                                            )}
                                                        </View>
                                                        <Text
                                                            style={[
                                                                styles.eventTimeText,
                                                                event.isPast && {
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
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                    </View>
                </View>
            </ScrollView>

            {/* ── Floating Action Button (PRESERVED) ── */}
            <TouchableOpacity
                style={[styles.fab, { bottom: insets.bottom + 80 }]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("Study")}>
                <MaterialIcons
                    name="timer"
                    size={22}
                    color={Colors.onPrimaryContainer}
                />
                <Text style={styles.fabText}>Start Focus</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    scroll: { paddingHorizontal: Spacing.marginGlobal, gap: Spacing.stackLg },

    // Greeting
    greetingSection: { gap: 4 },
    greeting: { ...Typography.headlineMd, color: Colors.onBackground },
    dateLine: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },

    // Section header
    sectionTitle: {
        ...Typography.headlineSm,
        color: Colors.onBackground,
        marginBottom: Spacing.stackMd,
    },

    // Timeline structure
    timeline: { gap: Spacing.stackMd, position: "relative" },
    timelineLine: {
        position: "absolute",
        left: 19,
        top: 24,
        bottom: 24,
        width: 1,
        backgroundColor: Colors.outlineVariant,
        zIndex: 0,
    },
    emptyText: {
        ...Typography.bodyMd,
        color: Colors.onSurfaceVariant,
        textAlign: "center",
        marginTop: 20,
    },

    // Row layout
    eventRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: Spacing.stackMd,
        zIndex: 1,
    },

    // Timeline node dot
    nodeDot: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: Colors.background,
        flexShrink: 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 3,
        marginTop: 2,
    },

    // Normal event card
    eventCard: {
        flex: 1,
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 16,
        overflow: "hidden",
        flexDirection: "row",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    accentStrip: {
        width: 4,
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
    },
    eventCardContent: {
        flex: 1,
        padding: 12,
    },
    eventCardRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    eventCardLeft: {
        flex: 1,
        gap: 2,
    },
    eventTimeText: {
        ...Typography.labelSm,
        color: Colors.onSurfaceVariant,
        letterSpacing: 0.3,
        textAlign: "right" as const,
        flexShrink: 0,
    },
    eventTitle: {
        ...Typography.bodyLg,
        fontWeight: "600" as const,
        color: Colors.onSurface,
    },
    eventMeta: {
        ...Typography.bodyMd,
        color: Colors.onSurfaceVariant,
        fontSize: 12,
    },

    // Conflict card
    conflictCard: {
        flex: 1,
        backgroundColor: Colors.errorContainer,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1.5,
        borderColor: Colors.error,
        shadowColor: Colors.error,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    conflictStripe: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.12,
        backgroundColor: Colors.error,
        // repeating diagonal pattern via background — approximated with solid tint
    },
    conflictInner: {
        padding: 14,
        gap: 6,
    },
    conflictTimeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    conflictTimeText: {
        ...Typography.labelSm,
        color: Colors.error,
        fontWeight: "700" as const,
        letterSpacing: 0.5,
    },
    conflictBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "rgba(186,26,26,0.1)",
        borderRadius: 999,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    conflictBadgeText: {
        fontSize: 9,
        fontWeight: "700" as const,
        color: Colors.error,
        letterSpacing: 0.8,
    },
    conflictTitle: {
        ...Typography.headlineSm,
        color: Colors.onErrorContainer,
        fontWeight: "700" as const,
    },
    conflictLocation: {
        ...Typography.bodyMd,
        color: Colors.onErrorContainer,
        opacity: 0.8,
    },
    resolveBtn: {
        backgroundColor: Colors.error,
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: "center",
        marginTop: 4,
    },
    resolveBtnText: {
        ...Typography.labelMd,
        color: Colors.onError,
        fontWeight: "700" as const,
        letterSpacing: 0.5,
    },

    // FAB (PRESERVED)
    fab: {
        position: "absolute",
        right: Spacing.marginGlobal,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: Colors.primaryContainer,
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 18,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
    },
    fabText: { ...Typography.labelMd, color: Colors.onPrimaryContainer },
});
