"""
Off-Grid Physical Node Implementation for Enishi-Protocol.
Represents a solar/battery powered fixed waypoint (祠 / Off-Grid Waypoint Node)
with ultra-low bandwidth radio simulation (LoRa SF12/SF7), storage management,
and integrated WoT + ZKP admission barriers.
"""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from .capsule import Capsule, HEADER_SIZE
from .ephemeral_mail import EphemeralMailboxHub
from .wot import WebOfTrust
from .zkp import MembershipProof, ZeroKnowledgeProofSystem


@dataclass
class RadioPacket:
    """Simulates an over-the-air physical packet transmitted via LoRa / sub-GHz radio."""
    payload: bytes
    rssi_dbm: int = -85
    snr_db: float = 8.5
    frequency_mhz: float = 920.8
    spreading_factor: int = 10
    airtime_ms: int = 140

    @property
    def payload_size(self) -> int:
        return len(self.payload)


class OffGridNode:
    """
    Physical Off-Grid Waypoint Node (祠 / Waypoint Station).
    Operates autonomously on solar power, exchanging capsules asynchronously with passing peers.
    """

    def __init__(
        self,
        node_id: str,
        secret_key: bytes,
        community_id: str,
        wot: WebOfTrust,
        zkp_system: ZeroKnowledgeProofSystem,
        max_storage_capsules: int = 200,
        lora_mtu: int = 255,
    ) -> None:
        self.node_id = node_id
        self.secret_key = secret_key
        self.community_id = community_id
        self.wot = wot
        self.zkp_system = zkp_system
        self.max_storage_capsules = max_storage_capsules
        self.lora_mtu = lora_mtu

        self.node_hash = hashlib.sha256(node_id.encode("utf-8")).digest()[:8]
        self.capsules: Dict[bytes, Capsule] = {}
        self.mailbox_hub = EphemeralMailboxHub(node_id)
        self.rejected_packets_count: int = 0
        self.accepted_packets_count: int = 0

    def admit_capsule(
        self,
        raw_capsule_bytes: bytes,
        zkp_proof: Optional[MembershipProof] = None,
        source_node_id: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """
        Admit a new capsule into local off-grid storage.
        Strict verification pipeline:
        1. LoRa MTU check
        2. Binary deserialization & protocol magic check
        3. Web of Trust check (if relayed by another node)
        4. Zero-Knowledge Proof (ZKP) citizenship check (blocks spammers and malicious actors)
        5. Expiration check & storage admission
        """
        # Step 1: MTU Check
        if len(raw_capsule_bytes) > self.lora_mtu:
            self.rejected_packets_count += 1
            return False, f"Packet exceeds LoRa MTU: {len(raw_capsule_bytes)} > {self.lora_mtu} bytes"

        # Step 2: Binary Deserialization
        try:
            capsule = Capsule.deserialize(raw_capsule_bytes)
        except Exception as e:
            self.rejected_packets_count += 1
            return False, f"Malformed capsule binary: {e}"

        # Step 3: Web of Trust Check (for inter-node relays)
        if source_node_id is not None:
            if not self.wot.is_trusted(source_node_id):
                self.rejected_packets_count += 1
                return False, f"Rejected relay from untrusted node [{source_node_id}]: WoT score too low"

        # Step 4: Zero-Knowledge Citizenship Verification
        if zkp_proof is None:
            self.rejected_packets_count += 1
            return False, "Admission Rejected: Missing ZKP Citizenship Proof (Unauthenticated actor)"

        # Context binds the proof to this specific capsule and node
        context = capsule.capsule_id + self.node_hash
        is_valid_citizen, reason = self.zkp_system.verify_proof(zkp_proof, context_data=context)
        if not is_valid_citizen:
            self.rejected_packets_count += 1
            return False, f"Admission Rejected: ZKP Membership failure ({reason})"

        # Step 5: Check expiration
        if capsule.is_expired():
            self.rejected_packets_count += 1
            return False, "Admission Rejected: Capsule already expired"

        # Prune oldest if storage full
        if len(self.capsules) >= self.max_storage_capsules:
            self._prune_oldest_capsules()

        # Endorse and store
        capsule.sign(self.secret_key)
        self.capsules[capsule.capsule_id] = capsule
        self.accepted_packets_count += 1

        return True, f"Capsule [{capsule.capsule_id.hex()[:8]}] successfully verified and admitted"

    def _prune_oldest_capsules(self) -> None:
        """Prune expired capsules first, then oldest by creation timestamp."""
        now = time.time()
        expired_ids = [cid for cid, cap in self.capsules.items() if cap.is_expired(now)]
        for cid in expired_ids:
            self.capsules.pop(cid, None)

        if len(self.capsules) >= self.max_storage_capsules:
            sorted_caps = sorted(self.capsules.values(), key=lambda c: c.created_at)
            # Remove oldest 10%
            to_remove = max(1, len(sorted_caps) // 10)
            for cap in sorted_caps[:to_remove]:
                self.capsules.pop(cap.capsule_id, None)

    def query_capsules(self, category_mask: int = 0) -> List[Capsule]:
        """Query active non-expired capsules stored on this node."""
        now = time.time()
        active: List[Capsule] = []
        for cap in self.capsules.values():
            if cap.is_expired(now):
                continue
            if category_mask == 0 or (cap.category_mask & category_mask) != 0:
                active.append(cap)
        return active

    def transmit_packet(self, payload: bytes) -> RadioPacket:
        """Simulate transmitting a radio packet with LoRa airtime and RF parameters."""
        airtime = max(40, int(len(payload) * 1.2))
        return RadioPacket(
            payload=payload,
            rssi_dbm=-78,
            snr_db=9.2,
            airtime_ms=airtime,
        )
