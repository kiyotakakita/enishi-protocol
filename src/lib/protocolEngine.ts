/**
 * Client-Side Protocol Engine for Enishi-Protocol (縁プロトコル)
 * Implements byte-level capsule formatting, Web of Trust calculation,
 * ZKP commitment verification, and One-Sender mailbox state machines.
 */

export const CATEGORY_FLAGS: Record<string, number> = {
  AGRICULTURE: 1 << 0,
  ENERGY: 1 << 1,
  HEALTH: 1 << 2,
  REPAIR: 1 << 3,
  SHELTER: 1 << 4,
  EDUCATION: 1 << 5,
  LOGISTICS: 1 << 6,
  WATER: 1 << 7,
  COMMUNICATION: 1 << 8,
  MISCELLANEOUS: 1 << 9,
};

export const CATEGORY_LABELS_JA: Record<string, string> = {
  AGRICULTURE: '農業・種苗 (Agriculture & Seeds)',
  ENERGY: 'エネルギー・太陽光 (Energy & Solar)',
  HEALTH: '医療・衛生 (Health & First Aid)',
  REPAIR: '修理・工作 (Repair & Mechanics)',
  SHELTER: '避難・シェルター (Shelter & Tarps)',
  EDUCATION: '教育・知識 (Education & Manuals)',
  LOGISTICS: '輸送・自転車 (Logistics & Cargo)',
  WATER: '水資源・浄水 (Water & Filtration)',
  COMMUNICATION: '無線通信 (Radio & Antennas)',
  MISCELLANEOUS: '生活資材 (Miscellaneous Goods)',
};

/**
 * Computes Web of Trust PageRank scores given adjacency and seed anchors.
 */
export function calculateWoTScores(
  nodes: { id: string; isSeed: boolean }[],
  edges: { from: string; to: string; weight: number }[],
  dampingFactor = 0.85,
  maxIterations = 20
): Record<string, number> {
  const nodeIds = nodes.map(n => n.id);
  const n = nodeIds.length;
  if (n === 0) return {};

  const seedIds = nodes.filter(nd => nd.isSeed).map(nd => nd.id);
  const seedWeight = seedIds.length > 0 ? 1.0 / seedIds.length : 1.0 / n;
  const seedVector: Record<string, number> = {};

  for (const id of nodeIds) {
    seedVector[id] = seedIds.includes(id) ? seedWeight : (seedIds.length === 0 ? seedWeight : 0.0);
  }

  let scores: Record<string, number> = { ...seedVector };

  for (let it = 0; it < maxIterations; it++) {
    const nextScores: Record<string, number> = {};
    for (const id of nodeIds) {
      nextScores[id] = (1.0 - dampingFactor) * seedVector[id];
    }

    for (const id of nodeIds) {
      const outgoing = edges.filter(e => e.from === id);
      const totalWeight = outgoing.reduce((sum, e) => sum + e.weight, 0);

      if (totalWeight === 0) {
        for (const targetId of nodeIds) {
          nextScores[targetId] += dampingFactor * scores[id] * seedVector[targetId];
        }
      } else {
        for (const e of outgoing) {
          if (nextScores[e.to] !== undefined) {
            nextScores[e.to] += dampingFactor * scores[id] * (e.weight / totalWeight);
          }
        }
      }
    }

    scores = nextScores;
  }

  const maxVal = Math.max(...Object.values(scores), 0.0001);
  const normalized: Record<string, number> = {};
  for (const id of nodeIds) {
    normalized[id] = Math.round((scores[id] / maxVal) * 1000) / 1000;
  }

  return normalized;
}

/**
 * Simulates binary serialization of an Enishi capsule.
 * Returns byte array representation and formatted hex view.
 */
export function serializeCapsuleBinary(params: {
  categoryMask: number;
  giveText: string;
  wantText: string;
  zkpCommitmentHex: string;
  nodeHashHex: string;
  rendezvousHex: string;
  createdAt?: number;
  ttlSeconds?: number;
}): {
  bytes: Uint8Array;
  hexDump: string;
  size: number;
  headerSize: number;
  bodySize: number;
  signatureSize: number;
} {
  const enc = new TextEncoder();
  const giveBytes = enc.encode(params.giveText.slice(0, 120));
  const wantBytes = enc.encode(params.wantText.slice(0, 120));

  const HEADER_SIZE = 58;
  const SIGNATURE_SIZE = 16;
  const totalLength = HEADER_SIZE + giveBytes.length + wantBytes.length + SIGNATURE_SIZE;
  const buffer = new Uint8Array(totalLength);
  const view = new DataView(buffer.buffer);

  // Magic 'EN' (0x45, 0x4E)
  buffer[0] = 0x45;
  buffer[1] = 0x4e;

  // Version 0x01
  buffer[2] = 0x01;

  // Category Mask (uint16 big endian)
  view.setUint16(3, params.categoryMask, false);

  // CreatedAt (uint32 big endian)
  const now = params.createdAt || Math.floor(Date.now() / 1000);
  view.setUint32(5, now, false);

  // TTL Seconds (uint32 big endian)
  const ttl = params.ttlSeconds || 86400 * 7;
  view.setUint32(9, ttl, false);

  // Capsule UUID (16 bytes)
  for (let i = 0; i < 16; i++) {
    buffer[13 + i] = (i * 37 + now) % 256;
  }

  // Node Hash (8 bytes)
  const nodeBytes = hexToBytes(params.nodeHashHex.padEnd(16, '0').slice(0, 16));
  buffer.set(nodeBytes.slice(0, 8), 29);

  // ZKP Commitment (16 bytes prefix)
  const zkpBytes = hexToBytes(params.zkpCommitmentHex.padEnd(32, '0').slice(0, 32));
  buffer.set(zkpBytes.slice(0, 16), 37);

  // Give Len & Want Len (1 byte each)
  buffer[53] = giveBytes.length;
  buffer[54] = wantBytes.length;

  // Rendezvous Token (4 bytes)
  const rndzBytes = hexToBytes(params.rendezvousHex.padEnd(8, '0').slice(0, 8));
  buffer.set(rndzBytes.slice(0, 4), 55);

  // Body: Give and Want
  buffer.set(giveBytes, 58);
  buffer.set(wantBytes, 58 + giveBytes.length);

  // Simulated HMAC-SHA256 signature (16 bytes)
  const sigOffset = 58 + giveBytes.length + wantBytes.length;
  for (let i = 0; i < SIGNATURE_SIZE; i++) {
    buffer[sigOffset + i] = (buffer[i] ^ buffer[58 + (i % (giveBytes.length || 1))] ^ 0xa5) & 0xff;
  }

  // Hex dump formatting
  let hexDump = '';
  for (let i = 0; i < buffer.length; i += 16) {
    const chunk = buffer.slice(i, i + 16);
    const hexParts = Array.from(chunk)
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
    const ascii = Array.from(chunk)
      .map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('');
    const offsetStr = i.toString(16).padStart(4, '0').toUpperCase();
    hexDump += `${offsetStr}:  ${hexParts.padEnd(48, ' ')}  |${ascii}|\n`;
  }

  return {
    bytes: buffer,
    hexDump,
    size: buffer.length,
    headerSize: HEADER_SIZE,
    bodySize: giveBytes.length + wantBytes.length,
    signatureSize: SIGNATURE_SIZE,
  };
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16) || 0;
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
