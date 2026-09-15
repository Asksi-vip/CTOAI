/**
 * Minimal ZIP writer (STORE method, no compression) — pure TypeScript,
 * no external dependencies. Good enough for source-code bundles & demo APKs.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

export interface ZipEntry {
  name: string
  content: string
}

export function createZip(entries: ZipEntry[]): Buffer {
  const chunks: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0

  const enc = new TextEncoder()

  for (const entry of entries) {
    const nameBytes = Buffer.from(enc.encode(entry.name))
    const dataBytes = Buffer.from(enc.encode(entry.content))
    const crc = crc32(dataBytes)

    // Local file header
    const local = Buffer.alloc(30 + nameBytes.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0x0800, 6) // UTF-8 flag
    local.writeUInt16LE(0, 8) // method: store
    local.writeUInt16LE(0, 10) // mod time
    local.writeUInt16LE(0x5921, 12) // mod date (2021-ish, fixed)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(dataBytes.length, 18)
    local.writeUInt32LE(dataBytes.length, 22)
    local.writeUInt16LE(nameBytes.length, 26)
    local.writeUInt16LE(0, 28)
    nameBytes.copy(local, 30)

    chunks.push(local, Buffer.from(dataBytes))

    // Central directory record
    const centralRec = Buffer.alloc(46 + nameBytes.length)
    centralRec.writeUInt32LE(0x02014b50, 0)
    centralRec.writeUInt16LE(20, 4)
    centralRec.writeUInt16LE(20, 6)
    centralRec.writeUInt16LE(0x0800, 8)
    centralRec.writeUInt16LE(0, 10)
    centralRec.writeUInt16LE(0, 12)
    centralRec.writeUInt16LE(0x5921, 14)
    centralRec.writeUInt32LE(crc, 16)
    centralRec.writeUInt32LE(dataBytes.length, 20)
    centralRec.writeUInt32LE(dataBytes.length, 24)
    centralRec.writeUInt16LE(nameBytes.length, 28)
    centralRec.writeUInt16LE(0, 30)
    centralRec.writeUInt16LE(0, 32)
    centralRec.writeUInt16LE(0, 34)
    centralRec.writeUInt16LE(0, 36)
    centralRec.writeUInt32LE(0, 38)
    centralRec.writeUInt32LE(offset, 42)
    nameBytes.copy(centralRec, 46)
    central.push(centralRec)

    offset += local.length + dataBytes.length
  }

  const centralBuf = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralBuf.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([...chunks, centralBuf, end])
}
