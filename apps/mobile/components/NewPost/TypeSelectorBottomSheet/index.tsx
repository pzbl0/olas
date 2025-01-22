import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Text } from '@/components/nativewindui/Text';
import { RefObject, useCallback, useEffect, useMemo } from 'react';
import { atom, useAtom, useSetAtom } from 'jotai';
import { Sheet, useSheetRef } from '@/components/nativewindui/Sheet';
import { metadataAtom } from '@/components/NewPost/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Camera as CameraIcon } from 'lucide-react-native';
import { useColorScheme } from '@/lib/useColorScheme';
import { Button } from '@/components/nativewindui/Button';
import { useAppSettingsStore } from '@/stores/app';
import { postTypeSelectorSheetRefAtom } from './store';
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
import Reel from '@/components/icons/reel';
import { Camera, useCameraDevice, useCameraDevices, useCameraPermission } from 'react-native-vision-camera';
import Polaroid from '@/components/icons/polaroid';
import { useNewPost } from '@/hooks/useNewPost';
import Photo from '@/components/icons/photo';
import { useAlbums } from '@/components/albums/hook';
import { AlbumContent } from '../AlbumsView';
import AlbumSelectorHandler from '@/components/albums/AlbumSelectorHandler';
import ShortVideo from '@/components/icons/short-video';

export type PostType = {
    id: string;
    type: 'square-photo' | 'photo' | 'video';
    uri: string;
};

function InlineCamera() {
    const devices = useCameraDevices()
    const { hasPermission, requestPermission } = useCameraPermission()

    const { colors } = useColorScheme();
    if (!hasPermission) {
        return <Button onPress={() => requestPermission()} style={{ height: 150}}>
            <Photo size={40} stroke={colors.foreground} />
            <Text className="text-sm text-muted-foreground">Uncropped</Text>
        </Button>
    }

    if (devices.length === 0) {
        return null;
    }

    return <Camera
        
        device={devices[0]}
        isActive={true}
    />
}

export default function PostTypeSelectorBottomSheet() {
    const ref = useSheetRef();
    const setBottomSheetRef = useSetAtom(postTypeSelectorSheetRefAtom);
    const inset = useSafeAreaInsets();
    const [metadata, setMetadata] = useAtom(metadataAtom);
    const setAppSettingsPostType = useAppSettingsStore((state) => state.setPostType);

    useEffect(() => {
        setBottomSheetRef(ref);
    }, [ref, setBottomSheetRef]);

    const { colors } = useColorScheme();

    const close = useCallback((cb: (event?: NDKEvent) => void) => {
        ref.current?.dismiss();
        cb();
    }, [ref]);

    const newPost = useNewPost();
    const insets = useSafeAreaInsets();

    return (
        <Sheet snapPoints={['50%']} ref={ref}>
            <BottomSheetView style={{ flexDirection: 'column', width: '100%', flex: 1, alignContent: 'stretch', paddingBottom: insets.bottom }}>
                {/* <InlineCamera /> */}
                
                <View className="flex-row mb-4" style={{ height: 140}}>
                    <View className="w-1/2 p-2 flex-col" style={{ height: 140}}>
                        <Button style={{ height: 140}} size="none" variant="secondary" className="flex-col items-center gap-2" onPress={() => close(() => newPost({ types: ['images'], square: true }))}>
                            <Polaroid size={40} stroke={colors.foreground} />
                            <Text className="text-sm text-muted-foreground">1:1 Photo</Text>
                        </Button>
                    </View>
                    <View className="w-1/2 p-2 flex-col" style={{ height: 140}}>
                        <Button style={{ height: 140}} size="none" variant="secondary" className="flex-col items-center gap-2" onPress={() => close(() => newPost({ types: ['images'], square: false }))}>
                            <Photo size={40} stroke={colors.foreground} />
                            <Text className="text-sm text-muted-foreground">Uncropped</Text>
                        </Button>
                    </View>
                </View>

                <View className="flex-row" style={{ height: 140}}>
                    <View className="w-1/2 p-2 flex-col" style={{ height: 140}}>
                        <Button style={{ height: 140}} size="none" variant="secondary" className="flex-col items-center gap-2" onPress={() => close(() => newPost({ types: ['videos'] }))}>
                            <Reel color={colors.foreground} size={40} />
                            <Text className="text-sm text-muted-foreground">Reel</Text>
                        </Button>
                    </View>
                    
                    <View className="w-1/2 p-2 flex-col" style={{ height: 140}}>
                        <Button size="none" style={{ height: 140}} variant="secondary" className="flex-col items-center gap-2" onPress={() => close(() => newPost({ types: ['videos'] }))}>
                            <ShortVideo color={colors.foreground} size={48} />
                            <Text className="text-sm text-muted-foreground">Short Video</Text>
                        </Button>
                    </View>
                </View>
            </BottomSheetView>
        </Sheet>
    );
}

const styles = StyleSheet.create({
    container: {
        margin: 10,
        gap: 10
    },
    row: {
        height: 120,
        flexDirection: 'row',
        gap: 10
    }
})