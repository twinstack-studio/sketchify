import { Directory, File, Paths } from 'expo-file-system';

const artDir = () => ensure(new Directory(Paths.document, 'sketches'));
const sourceDir = () => ensure(new Directory(Paths.document, 'sources'));

function ensure(dir: Directory) {
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Absolute URI for a stored artwork. */
export const artworkUri = (file: string) => new File(artDir(), file).uri;
export const sourceUri = (file: string) => new File(sourceDir(), file).uri;

export function writeArtwork(name: string, bytes: Uint8Array) {
  const file = new File(artDir(), name);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  return file.uri;
}

/**
 * Photo-picker and camera URIs point into caches the OS may clear, so the
 * source photo is copied in; re-editing needs it long after the fact.
 */
export function keepSource(uri: string, name: string) {
  const dest = new File(sourceDir(), name);
  if (!dest.exists) new File(uri).copySync(dest);
  return name;
}

export function deleteArtwork(file: string, source?: string) {
  for (const f of [new File(artDir(), file), source ? new File(sourceDir(), source) : null]) {
    try {
      if (f?.exists) f.delete();
    } catch {
      // Already gone is fine.
    }
  }
}

/** A throwaway file in the cache, e.g. for sharing or PDF pages. */
export function writeTemp(name: string, bytes: Uint8Array) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  return file.uri;
}
