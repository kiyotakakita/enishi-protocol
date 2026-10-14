"""
Capsule data structure and binary serialization for Enishi-Protocol.
Designed for ultra-low bandwidth physical transports (e.g., LoRa SF12/SF7, BLE Advertisement).
"""

from __future__ import annotations

import enum
import hashlib
import hmac
import struct
import time
import uuid
from dataclasses import dataclass
from typing import Any, Dict, Optional


class CapsuleCategory(enum.IntFlag):
    """Compact bitmask categories for multi-topic classification in 2 bytes."""
    NONE = 0
    AGRICULTURE = 1 << 0  # 0x0001: Seeds, compost, produce, farming tools
    ENERGY = 1 << 1       # 0x0002: Solar, batteries, generators, inverters
    HEALTH = 1 << 2       # 0x0004: First aid, herbs, hygiene, sanitation
    REPAIR = 1 << 3       # 0x0008: Mechanics, electronics, woodworking
    SHELTER = 1 << 4      # 0x0010: Emergency shelter, insulation, tarps
    EDUCATION = 1 << 5    # 0x0020: Books, manuals, technical know-how
    LOGISTICS = 1 << 6    # 0x0040: Cargo transport, bicycles, haulage
    WATER = 1 << 7        # 0x0080: Filtration, well maintenance, rain catchment
    COMMUNICATION = 1 << 8 # 0x0100: Radio, antennas, mesh hardware
    MISCELLANEOUS = 1 << 9 # 0x0200: Other goods and mutual aid requests


# Protocol Magic bytes: 'EN' (0x45, 0x4E) for Enishi Protocol
CAPSULE_MAGIC = b"EN"
PROTOCOL_VERSION = 1

# Binary Layout (Header = 58 bytes fixed):
# Magic (2B) + Version (1B) + CategoryMask (2B) + CreatedAt (4B uint32) +
# TTL (4B uint32) + CapsuleUUID (16B) + NodeKeyHash (8B) + ZkpCommitmentHash (16B) +
# GiveLen (1B) + WantLen (1B) + BlindRendezvousToken (4B)
HEADER_FORMAT = ">2sBHII16s8s16sBB4s"
HEADER_SIZE = struct.calcsize(HEADER_FORMAT)
SIGNATURE_SIZE = 16  # 16-byte HMAC-SHA256 truncated signature


@dataclass
class Capsule:
    """
    Physical Off-Grid Mesh Capsule.
    Carries an asynchronous mutual-aid offer (Give) and request (Want),
    anchored to a physical waypoint and protected by ZKP citizenship verification.
    """
    category_mask: int
    give_text: str
    want_text: str
    zkp_commitment: bytes  # 16 or 32 bytes commitment hash
    node_id_hash: bytes     # 8 bytes identifier of physical node
    rendezvous_token: bytes # 4 bytes ephemeral rendezvous prefix
    created_at: int = 0
    ttl_seconds: int = 86400 * 7  # Default 7 days
    capsule_id: bytes = b""
    signature: bytes = b""

    def __post_init__(self) -> None:
        if self.created_at == 0:
            self.created_at = int(time.time())
        if not self.capsule_id:
            self.capsule_id = uuid.uuid4().bytes
        if len(self.capsule_id) != 16:
            raise ValueError("capsule_id must be 16 bytes")
        if len(self.node_id_hash) != 8:
            # Pad or truncate to 8 bytes
            self.node_id_hash = self.node_id_hash.ljust(8, b"\x00")[:8]
        if len(self.zkp_commitment) < 16:
            self.zkp_commitment = self.zkp_commitment.ljust(16, b"\x00")
        elif len(self.zkp_commitment) > 16:
            # Keep 16-byte prefix hash for compact over-the-air payload
            self.zkp_commitment = self.zkp_commitment[:16]
        if len(self.rendezvous_token) != 4:
            self.rendezvous_token = self.rendezvous_token.ljust(4, b"\x00")[:4]

    def is_expired(self, current_time: Optional[float] = None) -> bool:
        """Check if capsule has passed its Time-To-Live."""
        now = int(time.time() if current_time is None else current_time)
        return (self.created_at + self.ttl_seconds) < now

    def expires_at(self) -> int:
        return self.created_at + self.ttl_seconds

    def sign(self, secret_key: bytes) -> None:
        """Compute HMAC-SHA256 signature for binary capsule integrity."""
        raw_body = self._serialize_body()
        h = hmac.new(secret_key, raw_body, hashlib.sha256).digest()
        self.signature = h[:SIGNATURE_SIZE]

    def verify_signature(self, secret_key: bytes) -> bool:
        """Verify HMAC signature of the capsule."""
        if len(self.signature) != SIGNATURE_SIZE:
            return False
        raw_body = self._serialize_body()
        expected = hmac.new(secret_key, raw_body, hashlib.sha256).digest()[:SIGNATURE_SIZE]
        return hmac.compare_digest(self.signature, expected)

    def _serialize_body(self) -> bytes:
        give_bytes = self.give_text.encode("utf-8")[:120]  # Cap length for LoRa MTU
        want_bytes = self.want_text.encode("utf-8")[:120]
        header = struct.pack(
            HEADER_FORMAT,
            CAPSULE_MAGIC,
            PROTOCOL_VERSION,
            self.category_mask,
            self.created_at,
            self.ttl_seconds,
            self.capsule_id,
            self.node_id_hash,
            self.zkp_commitment,
            len(give_bytes),
            len(want_bytes),
            self.rendezvous_token,
        )
        return header + give_bytes + want_bytes

    def serialize(self) -> bytes:
        """
        Serialize capsule to compact binary format.
        Total length is typically between 80 to 220 bytes, well within LoRa 255-byte MTU.
        """
        body = self._serialize_body()
        sig = self.signature if len(self.signature) == SIGNATURE_SIZE else b"\x00" * SIGNATURE_SIZE
        return body + sig

    @classmethod
    def deserialize(cls, data: bytes) -> Capsule:
        """
        Deserialize binary bytes back into a Capsule object.
        Raises ValueError if packet is malformed, truncated, or invalid magic.
        """
        min_required = HEADER_SIZE + SIGNATURE_SIZE
        if len(data) < min_required:
            raise ValueError(f"Packet too short ({len(data)} < {min_required} bytes)")

        magic, version, cat_mask, created_at, ttl, cap_id, node_hash, zkp_comm, give_len, want_len, rndz = (
            struct.unpack_from(HEADER_FORMAT, data, 0)
        )

        if magic != CAPSULE_MAGIC:
            raise ValueError(f"Invalid protocol magic: {magic!r} (expected {CAPSULE_MAGIC!r})")
        if version != PROTOCOL_VERSION:
            raise ValueError(f"Unsupported protocol version: {version}")

        offset = HEADER_SIZE
        give_end = offset + give_len
        want_end = give_end + want_len

        if want_end + SIGNATURE_SIZE > len(data):
            raise ValueError("Corrupted packet length fields")

        give_text = data[offset:give_end].decode("utf-8", errors="replace")
        want_text = data[give_end:want_end].decode("utf-8", errors="replace")
        signature = data[want_end:want_end + SIGNATURE_SIZE]

        capsule = cls(
            category_mask=cat_mask,
            give_text=give_text,
            want_text=want_text,
            zkp_commitment=zkp_comm,
            node_id_hash=node_hash,
            rendezvous_token=rndz,
            created_at=created_at,
            ttl_seconds=ttl,
            capsule_id=cap_id,
            signature=signature,
        )
        return capsule

    def to_dict(self) -> Dict[str, Any]:
        """Convert capsule to human-readable dictionary."""
        categories = [
            cat.name for cat in CapsuleCategory
            if cat.value > 0 and (self.category_mask & cat.value) == cat.value
        ]
        return {
            "capsule_id": self.capsule_id.hex(),
            "categories": categories,
            "give": self.give_text,
            "want": self.want_text,
            "node_hash": self.node_id_hash.hex(),
            "zkp_commitment": self.zkp_commitment.hex(),
            "rendezvous_token": self.rendezvous_token.hex(),
            "created_at": self.created_at,
            "ttl_seconds": self.ttl_seconds,
            "signature": self.signature.hex(),
        }
