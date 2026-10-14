"""
Enishi-Protocol (縁プロトコル)
Asynchronous Physical Mesh Protocol with Zero-Knowledge Trust & Ephemeral One-Sender Channels
"""

from .capsule import Capsule, CapsuleCategory
from .node import OffGridNode, RadioPacket
from .wot import WebOfTrust, NodeTrustProfile
from .zkp import ZeroKnowledgeProofSystem, CitizenshipCredential, MembershipProof
from .ephemeral_mail import EphemeralMailbox, OneSenderLockedViolation, ChannelStatus
from .matcher import SemanticMatcher, MatchResult

__version__ = "0.2.0"
__all__ = [
    "Capsule",
    "CapsuleCategory",
    "OffGridNode",
    "RadioPacket",
    "WebOfTrust",
    "NodeTrustProfile",
    "ZeroKnowledgeProofSystem",
    "CitizenshipCredential",
    "MembershipProof",
    "EphemeralMailbox",
    "OneSenderLockedViolation",
    "ChannelStatus",
    "SemanticMatcher",
    "MatchResult",
]
