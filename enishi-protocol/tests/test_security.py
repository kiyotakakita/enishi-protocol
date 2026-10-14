"""
Unit tests for Enishi-Protocol Security Layer (Web of Trust & Zero-Knowledge Proofs).
"""

import hashlib
import secrets
import time
import unittest
from enishi.wot import WebOfTrust
from enishi.zkp import (
    CitizenshipCredential,
    MembershipProof,
    ZeroKnowledgeProofSystem,
)


class TestWebOfTrust(unittest.TestCase):

    def setUp(self) -> None:
        self.wot = WebOfTrust(default_threshold=0.35)
        self.seed_id = "node-shrine-01"
        self.coop_id = "node-coop-02"
        self.station_id = "node-station-03"
        self.rogue_id = "node-rogue-attacker"

        self.wot.add_node(self.seed_id, "key1", "Shrine Anchor", is_seed_anchor=True)
        self.wot.add_node(self.coop_id, "key2", "Local Co-op")
        self.wot.add_node(self.station_id, "key3", "Water Station")
        self.wot.add_node(self.rogue_id, "key_bad", "Rogue Attacker")

        # Trust endorsements flow from seed -> coop -> station
        self.wot.endorse_node(self.seed_id, self.coop_id, weight=1.0)
        self.wot.endorse_node(self.coop_id, self.station_id, weight=0.8)
        # Rogue is not endorsed by any legitimate node

    def test_trust_score_propagation(self) -> None:
        scores = self.wot.recalculate_trust_scores()

        self.assertTrue(self.wot.is_trusted(self.seed_id))
        self.assertTrue(self.wot.is_trusted(self.coop_id))
        self.assertTrue(self.wot.is_trusted(self.station_id))

        # Rogue node without trust flow should fail threshold
        self.assertFalse(self.wot.is_trusted(self.rogue_id))
        self.assertLess(scores[self.rogue_id], 0.35)

    def test_peering_evaluation(self) -> None:
        self.wot.recalculate_trust_scores()

        accepted, score, reason = self.wot.evaluate_peering_request(self.coop_id)
        self.assertTrue(accepted)
        self.assertIn("Accepted", reason)

        accepted_bad, score_bad, reason_bad = self.wot.evaluate_peering_request(self.rogue_id)
        self.assertFalse(accepted_bad)
        self.assertIn("Rogue / Sybil risk", reason_bad)

    def test_unknown_node_rejected(self) -> None:
        accepted, score, reason = self.wot.evaluate_peering_request("totally-unknown-device")
        self.assertFalse(accepted)
        self.assertIn("Untrusted Unknown Node", reason)


class TestZeroKnowledgeProofSystem(unittest.TestCase):

    def setUp(self) -> None:
        self.community_id = "jp-tokyo-local"
        self.anchor_secret = secrets.token_bytes(32)
        self.anchor_hash = hashlib.sha256(self.anchor_secret).digest()[:8]
        self.zkp = ZeroKnowledgeProofSystem(self.community_id, self.anchor_hash)

        # Issue credential to citizen
        self.cred = CitizenshipCredential.issue(self.community_id, self.anchor_secret)
        self.zkp.register_commitment(self.cred.commitment_hash)

    def test_valid_zkp_membership_proof(self) -> None:
        context = b"capsule-context-data-123"
        proof = self.zkp.create_membership_proof(self.cred, context_data=context)

        valid, msg = self.zkp.verify_proof(proof, context_data=context)
        self.assertTrue(valid)
        self.assertIn("Valid ZKP Citizenship Verified", msg)

    def test_unregistered_commitment_fails(self) -> None:
        other_cred = CitizenshipCredential.issue(self.community_id, self.anchor_secret)
        # Not registered in ZKP registry!
        proof = self.zkp.create_membership_proof(other_cred)

        valid, msg = self.zkp.verify_proof(proof)
        self.assertFalse(valid)
        self.assertIn("not found in authorized local citizen registry", msg)

    def test_revoked_commitment_fails(self) -> None:
        # Revoke the credential
        self.zkp.revoke_commitment(self.cred.commitment_hash)

        proof = self.zkp.create_membership_proof(self.cred)
        valid, msg = self.zkp.verify_proof(proof)
        self.assertFalse(valid)
        self.assertIn("revoked", msg.lower())

    def test_proof_serialization(self) -> None:
        context = b"serialization-test"
        proof = self.zkp.create_membership_proof(self.cred, context_data=context)
        serialized = proof.serialize()

        restored = MembershipProof.deserialize(serialized)
        self.assertEqual(restored.community_id, proof.community_id)
        self.assertEqual(restored.commitment_prefix, proof.commitment_prefix)
        self.assertEqual(restored.nonce, proof.nonce)
        self.assertEqual(restored.challenge_response, proof.challenge_response)
        self.assertEqual(restored.timestamp, proof.timestamp)


if __name__ == "__main__":
    unittest.main()
