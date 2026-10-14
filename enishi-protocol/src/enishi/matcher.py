"""
Semantic Matching Layer for Enishi-Protocol.
Evaluates Give & Want resource/skill complementarity across asynchronous mesh capsules.
Designed with a modular scoring engine supporting local rule analysis and pluggable LLM embeddings.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple

from .capsule import Capsule, CapsuleCategory


@dataclass
class MatchResult:
    """Detailed score and rationale for a capsule pairing."""
    target_capsule_id: str
    query_capsule_id: str
    overall_score: float             # [0.0 - 1.0]
    give_to_want_score: float        # Query Give -> Target Want
    want_to_give_score: float        # Query Want -> Target Give
    category_overlap: List[str]
    mutual_aid: bool                 # True if bidirectional match exceeds threshold
    rationale: str


class SemanticMatcher:
    """
    Offline Rule & Keyword Semantic Matching Engine.
    Employs token n-grams, category bitmask affinity, and synonym dictionaries.
    Provides fallback/pluggable hook for local lightweight language models (e.g. Gemini Nano).
    """

    # Domain vocabulary thesaurus for offline mesh nodes
    SYNONYM_MAP: Dict[str, Set[str]] = {
        "solar": {"solar", "photovoltaic", "pv", "panel", "battery", "inverter", "off-grid", "electricity", "power"},
        "power": {"electricity", "generator", "battery", "solar", "energy", "charge", "inverter"},
        "seed": {"seed", "seedling", "organic", "vegetable", "tomato", "crop", "grain", "agriculture", "harvest", "sprout"},
        "water": {"water", "purification", "filter", "filtration", "well", "rain", "clean water", "drinking"},
        "repair": {"repair", "fix", "soldering", "welding", "maintenance", "mechanic", "tool", "bike", "bicycle"},
        "bike": {"bike", "bicycle", "cargo", "transport", "tire", "chain", "gear"},
        "medical": {"medical", "first aid", "bandage", "antibiotic", "herb", "tincture", "health", "nurse"},
        "shelter": {"tarp", "tent", "insulation", "wood", "carpentry", "roof", "timber", "shelter"},
    }

    def __init__(self, mutual_threshold: float = 0.55) -> None:
        self.mutual_threshold = mutual_threshold

    def _tokenize(self, text: str) -> Set[str]:
        """Normalize and tokenize text into keywords with synonym expansion."""
        clean = re.sub(r"[^\w\s]", " ", text.lower())
        tokens = {t for t in clean.split() if len(t) > 2}

        # Expand with synonyms
        expanded: Set[str] = set(tokens)
        for token in tokens:
            for root, syns in self.SYNONYM_MAP.items():
                if token in syns:
                    expanded.update(syns)
        return expanded

    def compute_text_affinity(self, source_text: str, dest_text: str) -> float:
        """Calculate Jaccard-like affinity with weighted overlap between source and dest text."""
        src_tokens = self._tokenize(source_text)
        dst_tokens = self._tokenize(dest_text)

        if not src_tokens or not dst_tokens:
            return 0.0

        intersection = src_tokens.intersection(dst_tokens)
        union = src_tokens.union(dst_tokens)

        # Base similarity
        jaccard = len(intersection) / len(union)

        # Precision boost: How well does source satisfy dest?
        coverage = len(intersection) / len(dst_tokens)

        score = (jaccard * 0.4) + (coverage * 0.6)
        return min(1.0, round(score, 3))

    def evaluate_pair(self, my_capsule: Capsule, target_capsule: Capsule) -> MatchResult:
        """
        Evaluate bidirectional complementarity between two capsules.
        A perfect mutual aid occurs when:
        my_capsule.give satisfies target_capsule.want AND target_capsule.give satisfies my_capsule.want.
        """
        # Direction 1: My Give satisfies Target Want
        give_to_want = self.compute_text_affinity(my_capsule.give_text, target_capsule.want_text)

        # Direction 2: Target Give satisfies My Want
        want_to_give = self.compute_text_affinity(target_capsule.give_text, my_capsule.want_text)

        # Category bitmask intersection
        shared_mask = my_capsule.category_mask & target_capsule.category_mask
        cat_names = [
            c.name for c in CapsuleCategory
            if c.value > 0 and (shared_mask & c.value) == c.value
        ]
        cat_boost = 0.15 if cat_names else 0.0

        # Weighted aggregate score
        bidirectional_base = (give_to_want * 0.45) + (want_to_give * 0.45) + cat_boost
        overall = min(1.0, round(bidirectional_base, 3))

        mutual = (give_to_want >= 0.35 and want_to_give >= 0.35) or overall >= self.mutual_threshold

        # Rationale builder
        if mutual:
            rationale = (
                f"High-affinity mutual aid pairing: "
                f"Your give matches their request ({give_to_want:.2f}) & "
                f"their give satisfies your want ({want_to_give:.2f})."
            )
        elif give_to_want >= 0.4:
            rationale = f"Partial match: You can fulfill their need ({give_to_want:.2f})."
        elif want_to_give >= 0.4:
            rationale = f"Partial match: They have resources you requested ({want_to_give:.2f})."
        else:
            rationale = "Low semantic correlation."

        return MatchResult(
            target_capsule_id=target_capsule.capsule_id.hex(),
            query_capsule_id=my_capsule.capsule_id.hex(),
            overall_score=overall,
            give_to_want_score=give_to_want,
            want_to_give_score=want_to_give,
            category_overlap=cat_names,
            mutual_aid=mutual,
            rationale=rationale,
        )

    def find_matches(
        self,
        query_capsule: Capsule,
        candidate_capsules: List[Capsule],
        min_score: float = 0.25,
    ) -> List[Tuple[Capsule, MatchResult]]:
        """Search and rank all available capsules in the node's local storage against a query."""
        results: List[Tuple[Capsule, MatchResult]] = []

        for candidate in candidate_capsules:
            if candidate.capsule_id == query_capsule.capsule_id:
                continue
            if candidate.is_expired():
                continue

            match_res = self.evaluate_pair(query_capsule, candidate)
            if match_res.overall_score >= min_score:
                results.append((candidate, match_res))

        # Rank by overall score descending
        results.sort(key=lambda x: x[1].overall_score, reverse=True)
        return results
