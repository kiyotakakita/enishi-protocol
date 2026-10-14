"""
Web of Trust (WoT) calculation and physical node authorization for Enishi-Protocol.
Evaluates trust scores of physical fixed waypoints (Off-Grid Nodes / 祠)
using anchored graph propagation and sybil-resistant damping factors.
Prevents malicious rogue nodes from intercepting capsules or poisoning the mesh.
"""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple


@dataclass
class NodeTrustProfile:
    """Represents a physical waypoint node in the local mesh Web of Trust."""
    node_id: str
    public_key_hex: str
    location_label: str
    is_seed_anchor: bool = False
    trust_score: float = 0.0
    direct_endorsements: Dict[str, float] = field(default_factory=dict)  # target_node_id -> weight [0.0 - 1.0]
    last_verified: int = 0


class WebOfTrust:
    """
    Sybil-resistant Web of Trust engine.
    Calculates dynamic trust scores across mesh nodes using an anchored power iteration
    with strict dampening (PageRank/EigenTrust variant).
    """

    def __init__(
        self,
        default_threshold: float = 0.35,
        damping_factor: float = 0.85,
        max_iterations: int = 20,
    ) -> None:
        self.nodes: Dict[str, NodeTrustProfile] = {}
        self.default_threshold = default_threshold
        self.damping_factor = damping_factor
        self.max_iterations = max_iterations

    def add_node(
        self,
        node_id: str,
        public_key_hex: str,
        location_label: str,
        is_seed_anchor: bool = False,
    ) -> NodeTrustProfile:
        """Register a node into the Web of Trust graph."""
        profile = NodeTrustProfile(
            node_id=node_id,
            public_key_hex=public_key_hex,
            location_label=location_label,
            is_seed_anchor=is_seed_anchor,
            trust_score=1.0 if is_seed_anchor else 0.0,
            last_verified=int(time.time()),
        )
        self.nodes[node_id] = profile
        return profile

    def endorse_node(
        self,
        endorser_id: str,
        target_id: str,
        weight: float = 1.0,
    ) -> None:
        """Add a directional endorsement from endorser to target node."""
        if endorser_id not in self.nodes:
            raise KeyError(f"Endorser node {endorser_id} not in trust graph")
        if target_id not in self.nodes:
            raise KeyError(f"Target node {target_id} not in trust graph")
        clamped_weight = max(0.0, min(1.0, weight))
        self.nodes[endorser_id].direct_endorsements[target_id] = clamped_weight

    def recalculate_trust_scores(self) -> Dict[str, float]:
        """
        Compute trust scores using anchored power iteration.
        Seed anchors inject baseline trust. Rogue clusters without paths from anchors decay to 0.
        """
        all_node_ids = list(self.nodes.keys())
        if not all_node_ids:
            return {}

        seed_nodes = [nid for nid, n in self.nodes.items() if n.is_seed_anchor]
        if not seed_nodes:
            # Fallback if no explicit seed: uniform distribution
            seed_weight = 1.0 / len(all_node_ids)
            seed_vector = {nid: seed_weight for nid in all_node_ids}
        else:
            seed_weight = 1.0 / len(seed_nodes)
            seed_vector = {nid: (seed_weight if nid in seed_nodes else 0.0) for nid in all_node_ids}

        # Initialize scores with seed vector
        scores = dict(seed_vector)

        for _ in range(self.max_iterations):
            next_scores = {nid: (1.0 - self.damping_factor) * seed_vector[nid] for nid in all_node_ids}

            for src_id, profile in self.nodes.items():
                endorsements = profile.direct_endorsements
                if not endorsements:
                    # Distribute score back to seed anchors (teleportation)
                    for nid in all_node_ids:
                        next_scores[nid] += self.damping_factor * scores[src_id] * seed_vector[nid]
                else:
                    total_weight = sum(endorsements.values())
                    if total_weight > 0:
                        for target_id, w in endorsements.items():
                            if target_id in next_scores:
                                transfer = self.damping_factor * scores[src_id] * (w / total_weight)
                                next_scores[target_id] += transfer

            # Normalize to sum = 1.0 (or max = 1.0 relative)
            total = sum(next_scores.values())
            if total > 0:
                scores = {nid: val / total for nid, val in next_scores.items()}
            else:
                scores = next_scores

        # Scale relative to max anchor score for human intuitive [0.0 - 1.0] scale
        max_score = max(scores.values()) if scores and max(scores.values()) > 0 else 1.0
        normalized_scores = {nid: round(val / max_score, 4) for nid, val in scores.items()}

        for nid, norm_score in normalized_scores.items():
            self.nodes[nid].trust_score = norm_score

        return normalized_scores

    def is_trusted(self, node_id: str, threshold: Optional[float] = None) -> bool:
        """
        Check if a node meets the minimum trust threshold for mesh sync and packet relay.
        """
        if node_id not in self.nodes:
            return False
        thresh = self.default_threshold if threshold is None else threshold
        node = self.nodes[node_id]
        if node.is_seed_anchor:
            return True
        return node.trust_score >= thresh

    def evaluate_peering_request(self, requester_node_id: str) -> Tuple[bool, float, str]:
        """
        Evaluate an incoming peering connection from a neighboring physical node.
        Returns (is_accepted, score, reason).
        """
        if requester_node_id not in self.nodes:
            return False, 0.0, "Node not found in local Web of Trust graph (Untrusted Unknown Node)"

        node = self.nodes[requester_node_id]
        if node.is_seed_anchor:
            return True, 1.0, "Accepted: Recognized Seed Anchor Node"

        if node.trust_score < self.default_threshold:
            return False, node.trust_score, (
                f"Connection Rejected: Trust score ({node.trust_score:.2f}) "
                f"below safety threshold ({self.default_threshold:.2f}). Rogue / Sybil risk."
            )

        return True, node.trust_score, f"Accepted: Verified Mesh Node (Score {node.trust_score:.2f})"
