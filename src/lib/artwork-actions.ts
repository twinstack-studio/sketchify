import { Alert } from 'react-native';

import { toast } from '@/components/ui/Toast';
import { deleteRemote } from '@/store/sync';
import { useLibrary, type Artwork } from '@/store/library';

import { artworkUri } from './files';
import { success, warn } from './haptics';
import { mimeFor, PermissionDenied, saveToGallery, share } from './sharing';

const message = (e: unknown) =>
  e instanceof PermissionDenied ? e.message : e instanceof Error ? e.message : String(e);

/** What can be done to one saved sketch; shared by the gallery and the viewer. */
export const artworkActions = {
  async share(item: Artwork) {
    try {
      await share(artworkUri(item.file), mimeFor(item.file));
    } catch (e) {
      Alert.alert('Could not share', message(e));
    }
  },

  async saveToPhotos(item: Artwork) {
    try {
      await saveToGallery([artworkUri(item.file)]);
      success();
      toast({ message: 'Saved to Photos.', icon: 'download' });
    } catch (e) {
      Alert.alert('Could not save', message(e));
    }
  },

  toggleFavourite(item: Artwork) {
    useLibrary.getState().toggleFavourite(item.id);
    if (!item.favourite) toast({ message: 'Added to favourites.', icon: 'heart' });
  },

  /** Asks first; calls `onDeleted` once it is gone. */
  confirmDelete(item: Artwork, onDeleted?: () => void) {
    warn();
    Alert.alert('Delete this sketch?', 'It is removed from this phone and from your cloud backup.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          useLibrary.getState().remove(item.id);
          deleteRemote(item.id, item.file).catch(() => {});
          onDeleted?.();
          toast({ message: 'Sketch deleted.', icon: 'trash' });
        },
      },
    ]);
  },
};
