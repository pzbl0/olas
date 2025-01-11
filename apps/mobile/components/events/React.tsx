import { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk-mobile";
import { Heart } from "lucide-react-native";
import { useCallback, useMemo } from "react";
import { TouchableOpacity, View } from "react-native";
import { Text } from "@/components/nativewindui/Text";

type ReactProps = {
    /**
     * Event the user is reacting to
     */
    event: NDKEvent;

    /**
     * Reactions the user has made, if undefined and the currentUser is set, the user's reactions will be calculated locally
     */
    reactedByUser?: NDKEvent[] | undefined;
    
    /**
     * All reactions
     * 
     * If false, the number of reactions will not be shown
    */
    allReactions?: NDKEvent[] | false;

    /**
     * Show reaction count
     */
    showReactionCount?: boolean;

    /**
     * Muted color
     */
    mutedColor: string;

    /**
     * Icon size
     */
    iconSize?: number;

    /**
     * Current user
     */
    currentUser?: NDKUser;
}

export default function React({
    event,
    reactedByUser,
    mutedColor,
    iconSize = 24,
    showReactionCount = true,
    allReactions,
    currentUser
}: ReactProps) {
    const react = useCallback(async () => {
        const r = await event.react('+', false);
        r.tags.push(['k', event.kind.toString()]);
        await r.sign();
        r.publish();
    }, [event.id]);

    if (!reactedByUser && allReactions) {
        reactedByUser = useMemo(() => {
            if (!currentUser) return [];
            return allReactions?.filter(r => r.pubkey === currentUser.pubkey);
        }, [allReactions, currentUser?.pubkey, event.id]);
    }

    const isReactedByUser = reactedByUser && reactedByUser.length > 0;
    
    return (
        <View style={{ gap: 4, flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={react}>
                <Heart
                    size={iconSize}
                    fill={isReactedByUser ? 'red' : 'transparent'}
                    color={isReactedByUser ? 'red' : mutedColor}
                />
            </TouchableOpacity>
            {showReactionCount && allReactions && allReactions.length > 0 && (
                <Text className="text-sm font-medium" style={{ color: mutedColor }}>
                    {allReactions.length}
                </Text>
            )}
        </View>
    )
}