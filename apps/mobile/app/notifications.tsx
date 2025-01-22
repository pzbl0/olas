import { NDKEvent, NDKKind, NDKSubscriptionCacheUsage, NDKUser, useNDK, useNDKCurrentUser, useNDKSessionEvents, useSubscribe, useUserProfile } from '@nostr-dev-kit/ndk-mobile';
import { router, Stack } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Button } from '@/components/nativewindui/Button';
import * as User from '~/components/ui/user';
import RelativeTime from './components/relative-time';
import { FlashList } from '@shopify/flash-list';
import { SegmentedControl } from '@/components/nativewindui/SegmentedControl';
import { atom, useAtom, useSetAtom, useStore } from 'jotai';
import EventContent from '@/components/ui/event/content';
import { useEnableNotifications, useNotificationPermission, useNotifications } from '@/hooks/notifications';
import { useAppSettingsStore } from '@/stores/app';
import { activeEventAtom } from '@/stores/event';

type NotificationItem = {
    id: string;
    type: 'follow' | 'comment' | 'mention' | 'reaction' | 'bookmark';
    user: {
        username: string;
        avatar: string;
    };
    timestamp: string;
    content?: string;
};

function getLabelForCommentNotification(event: NDKEvent, currentUser: NDKUser) {
    if (event.kind === NDKKind.GenericReply) {
        // if the current user is in the P tag
        if (event.tagValue("P") === currentUser?.pubkey) return "commented on your post";
        else if (event.tagValue("p") === currentUser?.pubkey) return "replied to your comment";
        return "replied";
    }

    return "replied to your post";
}

const NotificationItem = memo(({ event, currentUser }: { event: NDKEvent, currentUser: NDKUser }) => {
    const { userProfile } = useUserProfile(event.pubkey);

    const label = useMemo(() => {
        switch (event.kind) {
            case NDKKind.GenericRepost:
                return 'reposted you';
            case NDKKind.Reaction:
                return 'reacted to your post';
            case NDKKind.Text: case NDKKind.GenericReply:
                return getLabelForCommentNotification(event, currentUser);
            case NDKKind.Nutzap:
                return 'zapped you';
            case 3006:
                return 'bookmarked your post';
            case 967:
                return 'followed you';
            default:
                return event.kind.toString();
        }
    }, [event.id, currentUser.pubkey]);

    const { ndk } = useNDK();
    const setActiveEvent = useSetAtom(activeEventAtom);
    
    const onPress = useCallback(() => {
        console.log(JSON.stringify(event.rawEvent(), null, 2));
        const taggedEventId =  event.getMatchingTags('E')[0]|| event.getMatchingTags('e')[0];
        if (taggedEventId) {
            ndk.fetchEventFromTag(taggedEventId, event)
                .then((event) => {
                    console.log('result', event);
                    if (!event) return;
                    setActiveEvent(event);
                    router.push(`/view`);
                })
        } else {
            console.log(JSON.stringify(event.rawEvent(), null, 2));
        }
    }, [event]);

    const onAvatarPress = useCallback(() => {
        router.push(`/profile?pubkey=${event.pubkey}`);
    }, [event.pubkey]);
    
    return (
        <View style={styles.notificationItem} className="flex flex-row gap-2 border-b border-border">
            <TouchableOpacity onPress={onAvatarPress}>
                <User.Avatar userProfile={userProfile} alt={event.pubkey} size={44} style={styles.avatar} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onPress} className="flex-1">
                <View style={styles.content}>
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-foreground">
                            <User.Name userProfile={userProfile} pubkey={event.pubkey} style={styles.username} /> {label}
                        </Text>
                        <Text style={styles.timestamp} className="text-muted-foreground">
                            <RelativeTime timestamp={event.created_at} />
                        </Text>
                    </View>
                    {event.kind === NDKKind.GenericRepost ? (
                        <></>
                    ) : (
                        event.content.length > 0 && <EventContent className="text-foreground" event={event} />
                    )}
                </View>
            </TouchableOpacity>
        </View>
    );
});

const settingsTabAtom = atom('all');

const replyKinds = new Set([NDKKind.GenericReply, NDKKind.Text]);
const replyFilter = (event: NDKEvent) => replyKinds.has(event.kind);

const reactionFilter = (event: NDKEvent) => event.kind === NDKKind.Reaction;

export default function Notifications() {
    const [settingsTab, setSettingsTab] = useAtom(settingsTabAtom);
    const currentUser = useNDKCurrentUser();
    const notifications = useNotifications(false);
    const selectedIndex = useMemo(() => {
        switch (settingsTab) {
            case 'all': return 0;
            case 'replies': return 1;
            case 'reactions': return 2;
        }
    }, [settingsTab]);

    console.log('notifications', notifications.length);

    const notificationsFilter = useMemo(() => {
        const excludeOwn = (event: NDKEvent) => event.pubkey !== currentUser?.pubkey;
        if (settingsTab === 'all') {
            return (event: NDKEvent) => excludeOwn(event);
        } else if (settingsTab === 'replies') {
            return (event: NDKEvent) => replyFilter(event) && excludeOwn(event);
        } else {
            return (event: NDKEvent) => reactionFilter(event) && excludeOwn(event);
        }
    }, [settingsTab, currentUser?.pubkey]);

    const sortedEvents = useMemo(
        () => {
            return [...notifications]
                .filter(notificationsFilter)
                .sort((a, b) => b.created_at - a.created_at);
        },
        [notifications.length, notificationsFilter]
    );

    // when the user views the notifications screen, we should mark all notifications as read
    const markNotificationsAsSeen = useAppSettingsStore(s => s.notificationsSeen)
    useEffect(() => {
        markNotificationsAsSeen();
    }, []);

    return (
        <>
            <Stack.Screen options={{ headerShown: true, title: 'Notifications'}} />
            <View style={styles.container} className="bg-card">
                <NotificationPrompt />
                <SegmentedControl
                    values={['All', 'Replies', 'Reactions']}
                    selectedIndex={selectedIndex}
                    onIndexChange={(index) => {
                        setSettingsTab(index === 0 ? 'all' : index === 1 ? 'replies' : 'reactions');
                    }}
            />
                <FlashList
                    data={sortedEvents}
                    renderItem={({ item }) => <NotificationItem event={item} currentUser={currentUser} />}
                    keyExtractor={(item) => item.id}
                />
            </View>
        </>
    );
}

function NotificationPrompt() {
    const permissionStatus = useNotificationPermission();
    const enableNotifications = useEnableNotifications();
    const [acted, setActed] = useState(false);

    if (permissionStatus === 'granted' || acted) return null;

    async function enable() {
        if (await enableNotifications()) {
            setActed(true);
        }
    }

    return (<TouchableOpacity className='bg-muted-200 p-4' onPress={enable}>
        <Text className='text-muted-foreground'>Want to know when people follow you in Olas or comments on your posts?</Text>
        <Button variant="plain">
            <Text className="text-primary">Enable</Text>
        </Button>
    </TouchableOpacity>)
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 12,
        borderBottomWidth: 0.5,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    username: {
        fontWeight: 'bold',
    },
    timestamp: {
        fontSize: 12,
        marginBottom: 4,
    },
});
