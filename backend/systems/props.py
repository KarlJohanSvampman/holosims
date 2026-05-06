def get_prop_by_id(world, prop_id):
    for p in world.get("props", []):
        if p.get("id") == prop_id:
            return p
    return None


def find_nearest_anchor(c, world, interaction):
    best = None
    best_dist = 999999

    for p in world.get("props", []):
        for a in p.get("anchors", []):

            if a.get("interaction") != interaction:
                continue

            if a.get("occupied_by"):
                continue

            dist = abs(a["x"] - c["x"]) + abs(a["y"] - c["y"])

            if dist < best_dist:
                best = (p, a)
                best_dist = dist

    return best  # (prop, anchor)