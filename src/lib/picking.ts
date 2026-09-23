import * as ImagePicker from 'expo-image-picker';

export interface Picked {
  uri: string;
  width: number;
  height: number;
  name?: string | null;
}

const base: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  exif: false,
};

export async function pickPhoto(): Promise<Picked | null> {
  const result = await ImagePicker.launchImageLibraryAsync(base);
  if (result.canceled || !result.assets[0]) return null;
  const a = result.assets[0];
  return { uri: a.uri, width: a.width, height: a.height, name: a.fileName };
}

export async function pickPhotos(limit = 60): Promise<Picked[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    ...base,
    allowsMultipleSelection: true,
    selectionLimit: limit,
    orderedSelection: true,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height, name: a.fileName }));
}
