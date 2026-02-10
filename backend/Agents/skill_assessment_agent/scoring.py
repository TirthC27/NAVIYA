"""
Pure-logic scoring engine.
No LLM needed — compares user actions against loaded rule packs.
"""

from typing import List, Dict, Any


def score_actions(
    user_actions: List[Dict],
    scenario: Dict,
    core_rules: List[Dict],
    domain_rules: List[Dict],
    time_taken_seconds: int = 0
) -> Dict[str, Any]:
    """
    Score user actions against rule packs.

    user_actions: [{ "action_id": "...", "timestamp": 1234, "order": 1 }, ...]
    scenario: full scenario dict with available_actions, optimal_order, rule_mappings
    core_rules + domain_rules: loaded rule dicts with id, label, weight, category

    Returns:
    {
        "decision_quality": { "score": 0-100, "max": ..., "details": [...] },
        "risk_awareness":   { "score": 0-100, ... },
        "communication":    { "score": 0-100, ... },
        "ethical_reasoning": { "score": 0-100, ... },
        "stress_behavior":  { "score": 0-100, ... },
        "total":            0-100,
        "grade":            "A" / "B" / "C" / "D" / "F",
        "breakdown":        [ ... per-action feedback ]
    }
    """
    all_rules = {r["id"]: r for r in core_rules + domain_rules}
    rule_mappings = scenario.get("rule_mappings", {})
    optimal_order = scenario.get("optimal_order", [])
    available_actions = {a["id"]: a for a in scenario.get("available_actions", [])}
    time_limit = scenario.get("time_limit_seconds", 120)

    # Category accumulators: { category: { earned, possible, details } }
    categories = {
        "decision_quality":  {"earned": 0, "possible": 0, "details": []},
        "risk_awareness":    {"earned": 0, "possible": 0, "details": []},
        "communication":     {"earned": 0, "possible": 0, "details": []},
        "ethical_reasoning":  {"earned": 0, "possible": 0, "details": []},
    }

    action_ids = [a["action_id"] for a in user_actions]
    breakdown = []

    # ---------- per-action scoring ----------
    for action in user_actions:
        aid = action["action_id"]
        mapping = rule_mappings.get(aid, {})
        action_info = available_actions.get(aid, {})

        rules_followed = mapping.get("rules_followed", [])
        rules_violated = mapping.get("rules_violated", [])

        action_result = {
            "action_id": aid,
            "label": action_info.get("label", aid),
            "followed": [],
            "violated": [],
        }

        for rid in rules_followed:
            rule = all_rules.get(rid)
            if not rule:
                continue
            cat = rule.get("category", "decision_quality")
            weight = rule.get("weight", 1.0)
            categories[cat]["earned"] += weight
            categories[cat]["possible"] += weight
            action_result["followed"].append({"rule": rule["label"], "points": weight})

        for rid in rules_violated:
            rule = all_rules.get(rid)
            if not rule:
                continue
            cat = rule.get("category", "decision_quality")
            weight = rule.get("weight", 1.0)
            categories[cat]["possible"] += weight
            categories[cat]["details"].append(
                f"[ERR] Violated: {rule['label']} (action: {action_info.get('label', aid)})"
            )
            action_result["violated"].append({"rule": rule["label"], "penalty": weight})

        breakdown.append(action_result)

    # ---------- ORDER bonus ----------
    order_bonus = 0
    order_max = 3.0  # max bonus points for order
    if optimal_order:
        correct_positions = 0
        for i, expected_id in enumerate(optimal_order):
            if i < len(action_ids) and action_ids[i] == expected_id:
                correct_positions += 1
        order_ratio = correct_positions / len(optimal_order) if optimal_order else 0
        order_bonus = order_ratio * order_max
    categories["decision_quality"]["earned"] += order_bonus
    categories["decision_quality"]["possible"] += order_max

    # ---------- SKIPPED critical actions ----------
    critical_actions = scenario.get("critical_actions", [])
    for cid in critical_actions:
        if cid not in action_ids:
            categories["risk_awareness"]["possible"] += 2.0
            categories["risk_awareness"]["details"].append(
                f"[WARN] Skipped critical action: {available_actions.get(cid, {}).get('label', cid)}"
            )

    # ---------- STRESS / TIME scoring ----------
    stress_score = 100
    if time_limit > 0 and time_taken_seconds > 0:
        ratio = time_taken_seconds / time_limit
        if ratio > 1.5:
            stress_score = 30   # way too slow
        elif ratio > 1.0:
            stress_score = 60   # over time
        elif ratio < 0.2:
            stress_score = 50   # suspiciously fast / reckless
        else:
            stress_score = 100 - max(0, int((ratio - 0.5) * 40))

    # ---------- compute category scores ----------
    results = {}
    for cat, data in categories.items():
        if data["possible"] > 0:
            results[cat] = {
                "score": round(min(100, (data["earned"] / data["possible"]) * 100)),
                "earned": round(data["earned"], 1),
                "possible": round(data["possible"], 1),
                "details": data["details"],
            }
        else:
            results[cat] = {"score": 75, "earned": 0, "possible": 0, "details": ["No rules tested"]}

    results["stress_behavior"] = {
        "score": stress_score,
        "time_taken": time_taken_seconds,
        "time_limit": time_limit,
        "details": [],
    }

    # ---------- total ----------
    weights = {
        "decision_quality": 0.30,
        "risk_awareness": 0.25,
        "ethical_reasoning": 0.25,
        "communication": 0.10,
        "stress_behavior": 0.10,
    }
    total = sum(results[c]["score"] * weights[c] for c in weights)
    total = round(min(100, total))

    grade = (
        "A" if total >= 85 else
        "B" if total >= 70 else
        "C" if total >= 55 else
        "D" if total >= 40 else "F"
    )

    return {
        **results,
        "total": total,
        "grade": grade,
        "breakdown": breakdown,
        "actions_taken": len(action_ids),
        "actions_available": len(available_actions),
    }
