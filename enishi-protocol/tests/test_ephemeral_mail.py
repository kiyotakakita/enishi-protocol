"""
Unit tests for Enishi-Protocol Ephemeral One-Sender Channel Layer.
"""

import hashlib
import unittest
from enishi.ephemeral_mail import (
    ChannelStatus,
    EphemeralMailbox,
    EphemeralMailboxHub,
    OneSenderLockedViolation,
)


class TestEphemeralOneSenderMailbox(unittest.TestCase):

    def setUp(self) -> None:
        self.node_id = "node-shrine-01"
        self.alice = hashlib.sha256(b"alice_key").hexdigest()[:16]
        self.bob = hashlib.sha256(b"bob_key").hexdigest()[:16]
        self.mallory = hashlib.sha256(b"mallory_key").hexdigest()[:16]

        self.box = EphemeralMailbox(
            node_id=self.node_id,
            creator_fingerprint=self.alice,
            prefix_token="test01",
        )

    def test_initial_state_is_listening(self) -> None:
        self.assertEqual(self.box.status, ChannelStatus.LISTENING)
        self.assertIsNone(self.box.locked_peer_fingerprint)
        self.assertEqual(self.box.address, "enishi://node-shrine-01/eph-test01")

    def test_first_sender_locks_channel(self) -> None:
        # Bob contacts first
        locked, msg = self.box.establish_one_sender_lock(self.bob, b"handshake_secret_bob")
        self.assertTrue(locked)
        self.assertEqual(self.box.status, ChannelStatus.LOCKED)
        self.assertEqual(self.box.locked_peer_fingerprint, self.bob)

    def test_second_sender_bounced_with_violation(self) -> None:
        # Bob locks channel
        self.box.establish_one_sender_lock(self.bob, b"handshake_secret_bob")

        # Mallory tries to snoop or post
        with self.assertRaises(OneSenderLockedViolation):
            self.box.establish_one_sender_lock(self.mallory, b"intruder_handshake")

        with self.assertRaises(OneSenderLockedViolation):
            self.box.post_message(self.mallory, b"malicious_message_payload")

    def test_message_exchange_and_consumption(self) -> None:
        # Bob posts first message
        self.box.post_message(self.bob, b"Secret rendezvous details from Bob")
        self.assertEqual(self.box.status, ChannelStatus.LOCKED)

        # Alice consumes messages
        msgs = self.box.consume_messages(self.alice)
        self.assertEqual(len(msgs), 1)
        self.assertEqual(msgs[0].sender_fingerprint, self.bob)
        self.assertEqual(msgs[0].encrypted_payload, b"Secret rendezvous details from Bob")

        # Mallory cannot consume Alice's messages
        with self.assertRaises(OneSenderLockedViolation):
            self.box.consume_messages(self.mallory)

    def test_self_destruct_zeroes_memory(self) -> None:
        self.box.post_message(self.bob, b"TOP_SECRET_COORDINATES_35.6585_139.7454")
        self.assertEqual(len(self.box.messages), 1)

        # Self-destruct triggers
        self.box.self_destruct()
        self.assertEqual(self.box.status, ChannelStatus.SELF_DESTRUCTED)
        self.assertEqual(len(self.box.messages), 0)
        self.assertIsNone(self.box.locked_peer_fingerprint)

        # Writing after self-destruct is rejected
        with self.assertRaises(RuntimeError):
            self.box.post_message(self.bob, b"New message")


class TestEphemeralMailboxHub(unittest.TestCase):

    def test_hub_lifecycle(self) -> None:
        hub = EphemeralMailboxHub("shrine-01")
        channel = hub.create_channel("alice_id", prefix_token="abc1")
        self.assertIsNotNone(hub.get_channel("enishi://shrine-01/eph-abc1"))

        # Prune
        channel.self_destruct()
        pruned_count = hub.prune_expired()
        self.assertEqual(pruned_count, 1)
        self.assertIsNone(hub.get_channel("enishi://shrine-01/eph-abc1"))


if __name__ == "__main__":
    unittest.main()
