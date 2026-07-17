import type { ProjectFile } from './projectScaffold';

export function fsAccessSupported(): boolean {
  return typeof (window as any).showDirectoryPicker === 'function';
}

// Writes the project into a real local folder the user picks — they can then
// open, organize and edit it like any project (Chromium: File System Access API).
export async function saveProjectToFolder(files: ProjectFile[]): Promise<boolean> {
  const picker = (window as any).showDirectoryPicker;
  if (typeof picker !== 'function') return false;
  const root = await picker({ mode: 'readwrite' });
  for (const f of files) {
    const parts = f.path.split('/');
    let dir = root;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i], { create: true });
    }
    const handle = await dir.getFileHandle(parts[parts.length - 1], { create: true });
    const writable = await handle.createWritable();
    await writable.write(f.content);
    await writable.close();
  }
  return true;
}

// --- Minimal store-only ZIP (no dependency), for the download fallback ---

function crc32(bytes: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function makeZip(files: ProjectFile[]): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const u16 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
  const u32 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
  const push = (arr: Uint8Array[], ...parts: Uint8Array[]) => parts.forEach(p => arr.push(p));

  for (const f of files) {
    const nameBytes = enc.encode(f.path);
    const data = enc.encode(f.content);
    const crc = crc32(data);
    const size = data.length;

    const localStart = offset;
    push(chunks,
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0),
      nameBytes, data,
    );
    offset += 30 + nameBytes.length + size;

    push(central,
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(localStart),
      nameBytes,
    );
  }

  const centralStart = offset;
  const centralSize = central.reduce((n, a) => n + a.length, 0);
  push(chunks, ...central);
  push(chunks,
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(centralSize), u32(centralStart), u16(0),
  );

  return new Blob(chunks as BlobPart[], { type: 'application/zip' });
}

export function downloadProjectZip(files: ProjectFile[], name: string): void {
  const url = URL.createObjectURL(makeZip(files));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
