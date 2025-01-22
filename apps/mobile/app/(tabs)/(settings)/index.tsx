import { Icon, MaterialIconName } from '@roninoss/icons';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { LargeTitleHeader } from '~/components/nativewindui/LargeTitleHeader';
import { ESTIMATED_ITEM_HEIGHT, List, ListDataItem, ListItem, ListRenderItemInfo, ListSectionHeader } from '~/components/nativewindui/List';
import { Text } from '~/components/nativewindui/Text';
import { cn } from '~/lib/cn';
import { useColorScheme } from '~/lib/useColorScheme';
import { router, Stack } from 'expo-router';
import { ThemeToggle } from '@/components/ThemeToggle';
import * as User from '@/components/ui/user';
import { useMuteList, useNDKUnpublishedEvents, useUserProfile, useWOT } from '@nostr-dev-kit/ndk-mobile';
import { useNDK, useNDKWallet, useNDKCurrentUser } from '@nostr-dev-kit/ndk-mobile';
import { useActiveBlossomServer } from '@/hooks/blossom';
import { useAppSettingsStore } from '@/stores/app';
import { NDKCashuWallet } from '@nostr-dev-kit/ndk-wallet';
import { Button } from '@/components/nativewindui/Button';
import { humanWalletType } from '@/utils/wallet';

const relaysItem = {
    id: 'relays',
    title: 'Relays',
    leftView: <IconView name="wifi" className="bg-blue-500" />,
    onPress: () => router.push('/(tabs)/(settings)/relays'),
};

const keyItem = {
    id: 'key',
    title: 'Key',
    leftView: <IconView name="key-outline" className="bg-gray-500" />,
    onPress: () => router.push('/(tabs)/(settings)/key'),
};

const walletItem = {
    id: 'wallet',
    title: 'Wallet',
    leftView: <IconView name="lightning-bolt" className="bg-green-500" />,
    onPress: () => router.push('/(tabs)/(settings)/wallets'),
};

const devItem = {
    id: 'dev',
    title: `Development`,
    leftView: <IconView name="code-braces" className="bg-green-500" />,
    onPress: () => {
        router.push('/(tabs)/(settings)/dev');
    },
};

export default function SettingsIosStyleScreen() {
    const { ndk, logout } = useNDK();
    const currentUser = useNDKCurrentUser();
    const { userProfile } = useUserProfile(currentUser?.pubkey);
    const { activeWallet, setActiveWallet } = useNDKWallet();
    const defaultBlossomServer = useActiveBlossomServer();
    const muteList = useMuteList();
    const wot = useWOT();
    const unpublishedEvents = useNDKUnpublishedEvents();
    const resetAppSettings = useAppSettingsStore(s => s.reset);
    const toggleAdvancedMode = useAppSettingsStore(s => s.toggleAdvancedMode)
    const advancedMode = useAppSettingsStore(s => s.advancedMode);

    const appLogout = useCallback(() => {
        router.back();
        resetAppSettings();
        SecureStore.setItem('timeSinceLastAppSync', '0');
        logout();
    }, [logout, resetAppSettings]);
    
    const appVersion = useMemo(() => {
        return `${Platform.OS} ${Platform.Version}`;
    }, []);
    // read the app version from expo's app.json
    const buildVersion = useMemo(() => {
        const appJson = require('../../../app.json');
        return appJson.expo.version;
    }, []);

    const data = useMemo(() => {
        const opts: ListDataItem[] = [];
        
        if (currentUser) {
            // opts.unshift({
            //     id: 'wot',
            //     title: 'Web-of-trust',
            //     leftView: <IconView name="person-outline" className="bg-red-500" />,
            //     rightText: <Text variant="body" className="text-muted-foreground">{wot?.size.toString() ?? '0'}</Text>,
            // });
            
            opts.push({
                id: 'profile',
                onPress: () => {
                    router.push(`/profile?pubkey=${currentUser.pubkey}`);
                },
                title: (<View className="flex-row gap-4 items-center">
                    <User.Avatar userProfile={userProfile} size={24} />
                    <User.Name userProfile={userProfile} pubkey={currentUser.pubkey} className="text-foreground text-lg font-medium" />
                </View>
                ),
            });
            
            if (advancedMode) {
                if (unpublishedEvents.length) {
                    opts.push(' ')
                    opts.push({
                        id: 'unpublished-events',
                        title: 'Unpublished Events',
                        leftView: (<IconView name="warning" className="bg-green-500" />),
                        rightText: unpublishedEvents.length,
                        onPress: () => router.push('/unpublished')
                    }); 
                }
            }
            
            opts.push('Wallet & zaps')
            if (activeWallet) {
                let name = activeWallet.type.toString();
                if (activeWallet instanceof NDKCashuWallet)
                    name = activeWallet.name || activeWallet.walletId;

                opts.push({
                    id: 'wallet-balance',
                    title: name,
                    subTitle: humanWalletType(activeWallet.type),
                    leftView: <IconView name="lightning-bolt" className="bg-orange-500" />,
                    rightView: <View className="items-center justify-center flex-col m-2">
                        <Button variant="secondary" className="flex-col"
                            onPress={() => setActiveWallet(null)}>
                            <Text className="text-sm font-medium text-red-500">Unlink</Text>
                        </Button>
                    </View>,
                    onPress: () => {
                        if (!activeWallet) return;
                        activeWallet.updateBalance?.();
                        router.push('/(wallet)')
                    }
                });

                opts.push({
                    id: 'zaps',
                    title: 'Zaps',
                    leftView: <IconView name="lightning-bolt" className="bg-yellow-500" />,
                    onPress: () => router.push('/(tabs)/(settings)/zaps'),
                })
            } else {
                opts.push(walletItem)
            }

            opts.push('  ');

            opts.push({
                id: 'blossom',
                title: 'Media Servers',
                subTitle: defaultBlossomServer,
                leftView: (
                    <IconView>
                        <Text>🌸</Text>
                    </IconView>
                ),
                onPress: () => router.push('/(tabs)/(settings)/blossom'),
            });
        }

        opts.push('   ');

        opts.push(relaysItem);
        opts.push(keyItem);
        
        opts.push('    ');

        opts.push({
            id: 'muted',
            title: 'Muted Users',
            leftView: <IconView name="person-outline" className="bg-red-500" />,
            rightText: (
                <Text variant="body" className="text-muted-foreground">
                    {muteList?.size.toString() ?? '0'}
                </Text>
            ),
            onPress: () => router.push('/(tabs)/(settings)/muted'),
        });
        opts.push({
            id: '4',
            title: 'Logout',
            leftView: <IconView name="send-outline" className="bg-destructive" />,
            onPress: appLogout,
        });

        opts.push('       ');

        opts.push({
            id: 'advanced',
            title: 'Advanced',
            subTitle: 'Settings for advanced users',
            onPress: toggleAdvancedMode
        })
        if (advancedMode) opts.push(devItem);

        opts.push(`Version ${appVersion} (${buildVersion})`);

        return opts;
    }, [currentUser, activeWallet?.walletId, muteList, wot, defaultBlossomServer, unpublishedEvents.length, advancedMode]);

    return (
        <>
            <Stack.Screen options={{ title: 'Settings', headerRight: () => <ThemeToggle /> }} />
            <List
                contentContainerClassName="pt-4"
                contentInsetAdjustmentBehavior="automatic"
                variant="insets"
                data={data}
                estimatedItemSize={ESTIMATED_ITEM_HEIGHT.titleOnly}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
            />
        </>
    );
}

function renderItem<T extends (typeof data)[number]>(info: ListRenderItemInfo<T>) {
    if (typeof info.item === 'string') {
        return <ListSectionHeader {...info} />;
    }
    return (
        <ListItem
            className={cn('ios:pl-0 pl-2', info.index === 0 && 'ios:border-t-0 border-border/25 dark:border-border/80 border-t')}
            titleClassName="text-lg"
            leftView={info.item.leftView}
            rightView={
                (info.item.rightView ? info.item.rightView : (
                <View className="flex-1 flex-row items-center justify-center gap-2 px-4">
                    {info.item.rightText && (
                        <Text variant="callout" className="ios:px-0 px-2 text-muted-foreground">
                            {info.item.rightText}
                        </Text>
                    )}
                    {info.item.badge && (
                        <View className="h-5 w-5 items-center justify-center rounded-full bg-destructive">
                            <Text variant="footnote" className="font-bold leading-4 text-destructive-foreground">
                                {info.item.badge}
                            </Text>
                        </View>
                    )}
                    <ChevronRight />
                </View>
            ))}
            {...info}
            onPress={() => info.item.onPress?.()}
        />
    );
}

function ChevronRight() {
    const { colors } = useColorScheme();
    return <Icon name="chevron-right" size={17} color={colors.grey} />;
}

export function IconView({ className, name, children }: { className?: string; name?: MaterialIconName; children?: React.ReactNode }) {
    return (
        <View className="px-3">
            <View className={cn('h-6 w-6 items-center justify-center rounded-md', className)}>
                {name ? <Icon name={name} size={15} color="white" /> : children}
            </View>
        </View>
    );
}

function keyExtractor(item: (Omit<ListDataItem, string> & { id: string }) | string) {
    return typeof item === 'string' ? item : item.id;
}
