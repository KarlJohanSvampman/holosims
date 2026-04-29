def build_blocked_set(world):

    blocked = set()

    # -----------------
    # PROPS (walls etc.)
    # -----------------
    for p in world.get("props", []):
        if not p.get("walkable", True):
            blocked.add((p["x"], p["y"]))

    # -----------------
    # DOORS
    # -----------------
    for b in world.get("buildings", []):
        for d in b.get("doors", []):
            if not d.get("is_open", True):
                blocked.add((d["x"], d["y"]))

    return blocked


def is_walkable(x, y, blocked):
    return (x, y) not in blocked