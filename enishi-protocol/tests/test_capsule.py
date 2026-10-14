"""
Unit tests for Enishi-Protocol Capsule serialization and deserialization.
"""

import secrets
import time
import unittest
from enishi.capsule import (
    Capsule,
    CapsuleCategory,
    CAPSULE_MAGIC,
    HEADER_SIZE,
    SIGNATURE_SIZE,
)


class TestCapsuleSerialization(unittest.TestCase):

    def setUp(self) -> None:
        self.secret_key = secrets.token_bytes(32)
        self.zkp_comm = secrets.token_bytes(16)
        self.node_hash = b"shrine01"
        self.rendezvous = b"rndz"

    def test_roundtrip_serialization(self) -> None:
        cat_mask = CapsuleCategory.AGRICULTURE | CapsuleCategory.WATER
        cap = Capsule(
            category_mask=cat_mask,
            give_text="5kg Organic Rice & Soy Seeds",
            want_text="Portable Hand Water Filter",
            zkp_commitment=self.zkp_comm,
            node_id_hash=self.node_hash,
            rendezvous_token=self.rendezvous,
            created_at=int(time.time()),
            ttl_seconds=86400 * 3,
        )
        cap.sign(self.secret_key)
        self.assertTrue(cap.verify_signature(self.secret_key))

        raw_bytes = cap.serialize()
        self.assertLess(len(raw_bytes), 255, "Capsule exceeds LoRa 255-byte MTU limit")

        # Deserialize back
        restored = Capsule.deserialize(raw_bytes)
        self.assertEqual(restored.capsule_id, cap.capsule_id)
        self.assertEqual(restored.category_mask, cat_mask)
        self.assertEqual(restored.give_text, "5kg Organic Rice & Soy Seeds")
        self.assertEqual(restored.want_text, "Portable Hand Water Filter")
        self.assertEqual(restored.node_id_hash, self.node_hash)
        self.assertEqual(restored.zkp_commitment, self.zkp_comm)
        self.assertEqual(restored.rendezvous_token, self.rendezvous)
        self.assertTrue(restored.verify_signature(self.secret_key))

    def test_invalid_magic_rejected(self) -> None:
        cap = Capsule(
            category_mask=CapsuleCategory.ENERGY,
            give_text="Solar panel",
            want_text="Battery",
            zkp_commitment=self.zkp_comm,
            node_id_hash=self.node_hash,
            rendezvous_token=self.rendezvous,
        )
        raw_bytes = bytearray(cap.serialize())
        # Corrupt magic bytes from 'EN' to 'XX'
        raw_bytes[0] = ord("X")
        raw_bytes[1] = ord("X")

        with self.assertRaises(ValueError) as ctx:
            Capsule.deserialize(bytes(raw_bytes))
        self.assertIn("Invalid protocol magic", str(ctx.exception))

    def test_tampered_signature_fails(self) -> None:
        cap = Capsule(
            category_mask=CapsuleCategory.REPAIR,
            give_text="Bicycle repair",
            want_text="Tools",
            zkp_commitment=self.zkp_comm,
            node_id_hash=self.node_hash,
            rendezvous_token=self.rendezvous,
        )
        cap.sign(self.secret_key)
        other_key = secrets.token_bytes(32)
        self.assertFalse(cap.verify_signature(other_key))

    def test_expiration_detection(self) -> None:
        past_time = int(time.time()) - 1000
        cap = Capsule(
            category_mask=CapsuleCategory.EDUCATION,
            give_text="Math tutoring",
            want_text="Woodcraft",
            zkp_commitment=self.zkp_comm,
            node_id_hash=self.node_hash,
            rendezvous_token=self.rendezvous,
            created_at=past_time,
            ttl_seconds=500,  # Expired 500 seconds ago
        )
        self.assertTrue(cap.is_expired())


if __name__ == "__main__":
    unittest.main()
