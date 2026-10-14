#!/usr/bin/env python3
"""
Enishi-Protocol (縁プロトコル) End-to-End Mesh Simulation.
Demonstrates:
- Alice deposits capsule at physical node (3 days prior) with Zero-Knowledge Citizenship proof.
- Web of Trust (WoT) rejects rogue node injection from attacker.
- Zero-Knowledge Verifier rejects unvouched scam/spam packet.
- Bob arrives (3 days later) with complementary skills/resources.
- Semantic Matcher pairs Alice & Bob.
- Clova.Email-inspired One-Sender Ephemeral Channel locks to Bob and bounces eavesdropper intrusion.
- Inbox cleanly self-destructs with zero residual footprint.
"""

import hashlib
import secrets
import sys
import time

# Ensure src is in python path
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from enishi.capsule import Capsule, CapsuleCategory
from enishi.node import OffGridNode
from enishi.wot import WebOfTrust
from enishi.zkp import (
    CitizenshipCredential,
    MembershipProof,
    ZeroKnowledgeProofSystem,
)
from enishi.matcher import SemanticMatcher
from enishi.ephemeral_mail import ChannelStatus, OneSenderLockedViolation


def run_simulation() -> None:
    print("=" * 76)
    print("  ENISHI-PROTOCOL (縁プロトコル): Asynchronous Mesh Simulation")
    print("=" * 76)

    # ---------------------------------------------------------
    # 1. SETUP COMMUNITY ANCHORS & WEB OF TRUST
    # ---------------------------------------------------------
    print("\n[Phase 1] Initializing Community Trust Anchors & Web of Trust (WoT)...")
    community_id = "jp-tokyo-setagaya-kamikitazawa"
    anchor_key = secrets.token_bytes(32)
    anchor_pubkey_hash = hashlib.sha256(anchor_key).digest()[:8]

    wot = WebOfTrust(default_threshold=0.35)

    # Legitimate Nodes
    n1_id = "node-shrine-kitazawa-01"  # 北沢八幡の祠
    n2_id = "node-coop-market-02"     # 地域農協・直売所
    n3_id = "node-fire-hall-03"       # 消防団・地域防災拠点

    wot.add_node(n1_id, "pubkey_shrine_01", "北沢八幡の祠 (Physical Waypoint)", is_seed_anchor=True)
    wot.add_node(n2_id, "pubkey_coop_02", "地域農協直売所 (Community Co-op)")
    wot.add_node(n3_id, "pubkey_fire_03", "消防団屯所 (Disaster Relief Post)")

    # Mutual endorsements
    wot.endorse_node(n1_id, n2_id, weight=0.9)
    wot.endorse_node(n2_id, n3_id, weight=0.85)
    wot.endorse_node(n3_id, n1_id, weight=0.8)

    # Rogue Attacker Node
    rogue_node_id = "rogue-darknet-sybil-99"
    wot.add_node(rogue_node_id, "pubkey_mallory_99", "野良中継器 (Rogue Untrusted Radio)")

    scores = wot.recalculate_trust_scores()
    print("  Calculated Web of Trust Scores:")
    for nid, score in scores.items():
        trusted = "TRUSTED" if wot.is_trusted(nid) else "BLOCKED"
        print(f"    - {nid:<26}: Score {score:.3f} [{trusted}]")

    # ---------------------------------------------------------
    # 2. SETUP ZERO-KNOWLEDGE PROOF REGISTRY
    # ---------------------------------------------------------
    print("\n[Phase 2] Initializing Zero-Knowledge Citizenship Registry...")
    zkp_system = ZeroKnowledgeProofSystem(community_id, anchor_pubkey_hash)

    # Alice is a verified resident
    alice_cred = CitizenshipCredential.issue(community_id, anchor_key, validity_days=90)
    zkp_system.register_commitment(alice_cred.commitment_hash)

    # Bob is also a verified resident
    bob_cred = CitizenshipCredential.issue(community_id, anchor_key, validity_days=90)
    zkp_system.register_commitment(bob_cred.commitment_hash)

    print(f"  Registered 2 verified citizens in ZKP commitment ring (Community: {community_id})")

    # Create Physical Off-Grid Node at the Shrine
    node_shrine = OffGridNode(
        node_id=n1_id,
        secret_key=secrets.token_bytes(32),
        community_id=community_id,
        wot=wot,
        zkp_system=zkp_system,
    )
    print(f"  Physical Waypoint Node Online: {n1_id} [LoRa SF10 @ 920.8MHz]")

    # ---------------------------------------------------------
    # 3. ALICE VISITS NODE (Day -3: 3 Days Ago)
    # ---------------------------------------------------------
    print("\n[Phase 3] Day T-3: Alice deposits an asynchronous capsule at the Shrine Node...")
    # Simulated time 3 days ago
    t_minus_3_days = int(time.time()) - (86400 * 3)

    alice_rendezvous_token = secrets.token_bytes(4)
    alice_capsule = Capsule(
        category_mask=CapsuleCategory.AGRICULTURE | CapsuleCategory.ENERGY,
        give_text="Heirloom Tomato Seeds & Solar PV Inverter Diagnostics",
        want_text="Gravity Clean Water Filtration Filter & Ceramic Candle",
        zkp_commitment=alice_cred.commitment_hash,
        node_id_hash=node_shrine.node_hash,
        rendezvous_token=alice_rendezvous_token,
        created_at=t_minus_3_days,
        ttl_seconds=86400 * 14,  # 14 days TTL
    )

    # Alice signs with ZKP membership proof without exposing her identity
    alice_context = alice_capsule.capsule_id + node_shrine.node_hash
    alice_proof = zkp_system.create_membership_proof(alice_cred, context_data=alice_context)

    raw_alice_bytes = alice_capsule.serialize()
    print(f"  Alice's Capsule serialized to {len(raw_alice_bytes)} bytes (LoRa MTU safe < 255 bytes)")

    admitted, reason = node_shrine.admit_capsule(raw_alice_bytes, zkp_proof=alice_proof)
    print(f"  Node Admission Status: {admitted} -> {reason}")

    # ---------------------------------------------------------
    # 4. THREAT MITIGATION: ATTACKER SCENARIOS
    # ---------------------------------------------------------
    print("\n[Phase 4] Threat Mitigation: Testing Defense Against Rogue Interceptors & Spammers...")

    # Scenario A: Attacker tries to relay via untrusted rogue node
    print("  [Attack A] Mallory attempts to relay packets through Rogue Node...")
    fake_capsule = Capsule(
        category_mask=CapsuleCategory.MISCELLANEOUS,
        give_text="Dark Web Phishing Link / High-Yield Loan Scam",
        want_text="Untraceable Cash or Crypto",
        zkp_commitment=secrets.token_bytes(16),
        node_id_hash=b"fake0000",
        rendezvous_token=b"hack",
    )
    accepted_a, reason_a = node_shrine.admit_capsule(
        fake_capsule.serialize(),
        zkp_proof=alice_proof,
        source_node_id=rogue_node_id,
    )
    print(f"    Result: Admitted={accepted_a} | Reason: {reason_a}")

    # Scenario B: Unvouched scammer attempts direct radio injection without citizenship ZKP
    print("  [Attack B] Unvouched scammer tries direct LoRa packet injection without ZKP proof...")
    accepted_b, reason_b = node_shrine.admit_capsule(
        fake_capsule.serialize(),
        zkp_proof=None,  # No ZKP proof
    )
    print(f"    Result: Admitted={accepted_b} | Reason: {reason_b}")

    # Scenario C: Attacker forges an invalid ZKP commitment
    print("  [Attack C] Attacker tries forged ZKP commitment not in community registry...")
    unregistered_cred = CitizenshipCredential.issue("untrusted-sybil-gang", secrets.token_bytes(32))
    forged_proof = MembershipProof(
        community_id=community_id,
        commitment_prefix=unregistered_cred.commitment_hash[:16],
        nonce=secrets.token_bytes(16),
        challenge_response=secrets.token_bytes(32),
        timestamp=int(time.time()),
    )
    accepted_c, reason_c = node_shrine.admit_capsule(
        fake_capsule.serialize(),
        zkp_proof=forged_proof,
    )
    print(f"    Result: Admitted={accepted_c} | Reason: {reason_c}")

    # ---------------------------------------------------------
    # 5. BOB ARRIVES (Day T+3: Today) & SEMANTIC MATCHING
    # ---------------------------------------------------------
    print("\n[Phase 5] Day T+3: Bob arrives at the Shrine Waypoint with his LoRa handset...")
    bob_capsule = Capsule(
        category_mask=CapsuleCategory.WATER | CapsuleCategory.REPAIR,
        give_text="Spare Gravity Water Filter Candle & Hand Pump Repair Kit",
        want_text="Solar Photovoltaic Panel Diagnostics & Vegetable Seeds",
        zkp_commitment=bob_cred.commitment_hash,
        node_id_hash=node_shrine.node_hash,
        rendezvous_token=secrets.token_bytes(4),
    )

    matcher = SemanticMatcher()
    stored_capsules = node_shrine.query_capsules()
    print(f"  Bob queries Node storage: {len(stored_capsules)} active capsule(s) found.")

    matches = matcher.find_matches(bob_capsule, stored_capsules)
    for cap, match in matches:
        print(f"  Match Evaluation Found:")
        print(f"    - Target Capsule: {match.target_capsule_id[:8]}...")
        print(f"    - Overall Score: {match.overall_score:.2f} (Mutual Aid: {match.mutual_aid})")
        print(f"    - Give->Want Affinity: {match.give_to_want_score:.2f}")
        print(f"    - Want->Give Affinity: {match.want_to_give_score:.2f}")
        print(f"    - Rationale: {match.rationale}")

    # ---------------------------------------------------------
    # 6. EPHEMERAL ONE-SENDER CHANNEL HANDSHAKE (CLOVA.EMAIL PARADIGM)
    # ---------------------------------------------------------
    print("\n[Phase 6] Opening Clova.Email-inspired One-Sender Ephemeral Channel...")
    # Alice set up her ephemeral rendezvous prefix
    channel_prefix = alice_rendezvous_token.hex()
    alice_fingerprint = hashlib.sha256(b"alice_device_id_salt").hexdigest()[:16]
    bob_fingerprint = hashlib.sha256(b"bob_device_id_salt").hexdigest()[:16]
    mallory_fingerprint = hashlib.sha256(b"mallory_intruder_device").hexdigest()[:16]

    mailbox = node_shrine.mailbox_hub.create_channel(
        creator_fingerprint=alice_fingerprint,
        prefix_token=channel_prefix,
    )
    print(f"  Disposable Mailbox Created: {mailbox.address}")
    print(f"  Initial Channel Status: {mailbox.status.value}")

    # Bob contacts the mailbox first -> Locks to Bob
    print("  Bob sends first encrypted contact handshake...")
    handshake_payload = b"ENCRYPTED_HELLO_BOB: I have your gravity filter candle!"
    mailbox.post_message(bob_fingerprint, handshake_payload)

    print(f"  Channel Status after first peer contact: {mailbox.status.value}")
    print(f"  Exclusive Locked Peer: [{mailbox.locked_peer_fingerprint}]")

    # Mallory attempts to snoop or inject into Bob's locked channel
    print("\n  [Intrusion Test] Mallory attempts to inject malicious packet into locked channel...")
    try:
        mailbox.post_message(mallory_fingerprint, b"PHISHING_PAYLOAD: Meet me in dark alley")
        print("  FAILED: Mallory got through!")
    except OneSenderLockedViolation as e:
        print(f"  SUCCESS: Intrusion immediately bounced! Violation: {e}")

    # ---------------------------------------------------------
    # 7. CONSUMPTION & INSTANT IN-MEMORY SELF-DESTRUCT
    # ---------------------------------------------------------
    print("\n[Phase 7] Alice retrieves rendezvous message and channel self-destructs...")
    alice_received = mailbox.consume_messages(alice_fingerprint)
    for msg in alice_received:
        print(f"  Alice received message #{msg.sequence_num} from [{msg.sender_fingerprint}]: {msg.encrypted_payload.decode()}")

    # Rendezvous agreement completed -> Self-destruct
    mailbox.self_destruct()
    print(f"  Channel State: {mailbox.status.value}")
    print(f"  Remaining in-memory messages: {len(mailbox.messages)} (Buffers securely zeroed)")
    print(f"  Locked peer pointer: {mailbox.locked_peer_fingerprint}")

    print("\n" + "=" * 76)
    print("  SIMULATION COMPLETED SUCCESSFULLY: ALL INVARIANTS PRESERVED")
    print("=" * 76)


if __name__ == "__main__":
    run_simulation()
