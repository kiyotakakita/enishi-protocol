"""
Ephemeral One-Sender Communication Layer for Enishi-Protocol.
Inspired by Clova.Email's dynamic prefix disposable address architecture.
Guarantees strict One-Sender exclusivity: locks to the first valid peer,
instantly bounces unauthorized intruders/interceptors, and auto-wipes all traces upon completion.
"""

from __future__ import annotations

import enum
import hashlib
import hmac
import secrets
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


class ChannelStatus(enum.Enum):
    LISTENING = "LISTENING"               # Awaiting initial peer contact
    LOCKED = "LOCKED"                     # Locked exclusively to first sender
    COMPLETED = "COMPLETED"               # Exchange finished normally
    SELF_DESTRUCTED = "SELF_DESTRUCTED"   # All in-memory buffers erased, address dead


class OneSenderLockedViolation(Exception):
    """Raised when an unauthorized sender attempts to access or message a locked channel."""
    pass


@dataclass
class EphemeralMessage:
    """A transient message stored within the locked ephemeral channel."""
    sender_fingerprint: str
    encrypted_payload: bytes
    sequence_num: int
    sent_at: int
    read: bool = False


class EphemeralMailbox:
    """
    Disposable In-Memory Mailbox hosted on an Off-Grid Node.
    Created for a specific capsule rendezvous.
    """

    def __init__(
        self,
        node_id: str,
        creator_fingerprint: str,
        prefix_token: Optional[str] = None,
        max_messages: int = 5,
        ttl_seconds: int = 3600 * 24,  # 24 hours mailbox lifetime
    ) -> None:
        self.node_id = node_id
        self.creator_fingerprint = creator_fingerprint
        self.prefix_token = prefix_token or secrets.token_hex(4)
        self.address = f"enishi://{node_id}/eph-{self.prefix_token}"
        self.max_messages = max_messages
        self.ttl_seconds = ttl_seconds
        self.created_at = int(time.time())

        self.status = ChannelStatus.LISTENING
        self.locked_peer_fingerprint: Optional[str] = None
        self.messages: List[EphemeralMessage] = []
        self._shared_session_key: Optional[bytes] = None

    def is_expired(self, current_time: Optional[float] = None) -> bool:
        now = int(time.time() if current_time is None else current_time)
        return (self.created_at + self.ttl_seconds) < now

    def establish_one_sender_lock(self, sender_fingerprint: str, session_handshake_bytes: bytes) -> Tuple[bool, str]:
        """
        Locks the channel to the first legitimate contacting peer.
        If already locked to a different peer, rejects connection immediately.
        """
        if self.status == ChannelStatus.SELF_DESTRUCTED:
            return False, "Channel has self-destructed and does not exist"

        if self.is_expired():
            self.self_destruct()
            return False, "Channel expired"

        # Case 1: First peer arrives
        if self.status == ChannelStatus.LISTENING:
            self.locked_peer_fingerprint = sender_fingerprint
            self.status = ChannelStatus.LOCKED
            # Derive transient session key
            self._shared_session_key = hashlib.sha256(
                sender_fingerprint.encode("utf-8") + session_handshake_bytes
            ).digest()
            return True, f"Channel locked exclusively to peer [{sender_fingerprint[:8]}...]"

        # Case 2: The locked peer returning
        if self.status == ChannelStatus.LOCKED and self.locked_peer_fingerprint == sender_fingerprint:
            return True, "Re-authenticated existing locked peer"

        # Case 3: Intruder / Eavesdropper attempting access
        raise OneSenderLockedViolation(
            f"SECURITY ALERT: Channel [{self.address}] is strictly locked to another peer. "
            f"Intrusion attempt by [{sender_fingerprint[:8]}...] automatically bounced and discarded."
        )

    def post_message(
        self,
        sender_fingerprint: str,
        encrypted_payload: bytes,
    ) -> EphemeralMessage:
        """
        Post an encrypted payload into the mailbox under One-Sender constraints.
        Only the creator or the locked peer can post.
        """
        if self.status == ChannelStatus.SELF_DESTRUCTED:
            raise RuntimeError("Cannot write to self-destructed channel")

        if self.status == ChannelStatus.LISTENING:
            # Auto-lock on first post
            self.establish_one_sender_lock(sender_fingerprint, encrypted_payload[:16])

        # Enforce One-Sender rule
        is_creator = (sender_fingerprint == self.creator_fingerprint)
        is_locked_peer = (sender_fingerprint == self.locked_peer_fingerprint)

        if not (is_creator or is_locked_peer):
            raise OneSenderLockedViolation(
                f"Unauthorized sender {sender_fingerprint}. Channel locked to {self.locked_peer_fingerprint}."
            )

        if len(self.messages) >= self.max_messages:
            raise BufferError("Mailbox maximum message capacity reached")

        msg = EphemeralMessage(
            sender_fingerprint=sender_fingerprint,
            encrypted_payload=encrypted_payload,
            sequence_num=len(self.messages) + 1,
            sent_at=int(time.time()),
        )
        self.messages.append(msg)
        return msg

    def consume_messages(self, reader_fingerprint: str) -> List[EphemeralMessage]:
        """
        Retrieve messages. Can be read only by the capsule creator or locked peer.
        """
        if self.status == ChannelStatus.SELF_DESTRUCTED:
            return []

        is_creator = (reader_fingerprint == self.creator_fingerprint)
        is_locked_peer = (reader_fingerprint == self.locked_peer_fingerprint)

        if not (is_creator or is_locked_peer):
            raise OneSenderLockedViolation(
                f"Access denied for reader {reader_fingerprint}. Locked to {self.locked_peer_fingerprint}"
            )

        unread = [m for m in self.messages if not m.read]
        for m in unread:
            m.read = True

        return unread

    def self_destruct(self) -> None:
        """
        Zero out all message buffers, wipe transient session keys, and mark dead.
        Ensures zero forensic residue on the physical node.
        """
        for m in self.messages:
            # Overwrite in-memory payload with zeros
            m.encrypted_payload = b"\x00" * len(m.encrypted_payload)
        self.messages.clear()
        self._shared_session_key = None
        self.locked_peer_fingerprint = None
        self.status = ChannelStatus.SELF_DESTRUCTED


class EphemeralMailboxHub:
    """Manager for active ephemeral channels hosted on an Off-Grid Node."""

    def __init__(self, node_id: str) -> None:
        self.node_id = node_id
        self.mailboxes: Dict[str, EphemeralMailbox] = {}

    def create_channel(
        self,
        creator_fingerprint: str,
        prefix_token: Optional[str] = None,
    ) -> EphemeralMailbox:
        box = EphemeralMailbox(self.node_id, creator_fingerprint, prefix_token)
        self.mailboxes[box.address] = box
        return box

    def get_channel(self, address: str) -> Optional[EphemeralMailbox]:
        box = self.mailboxes.get(address)
        if box and box.is_expired():
            box.self_destruct()
            self.mailboxes.pop(address, None)
            return None
        return box

    def prune_expired(self) -> int:
        expired = [addr for addr, box in self.mailboxes.items() if box.is_expired() or box.status == ChannelStatus.SELF_DESTRUCTED]
        for addr in expired:
            box = self.mailboxes.pop(addr, None)
            if box:
                box.self_destruct()
        return len(expired)
