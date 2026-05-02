def get_prop_by_id(world, prop_id):
    for p in world.get("props", []):
        if p.get("id") == prop_id:
            return p
    return None


def find_nearest_prop(c, world, prop_type):
    best = None
    best_dist = 999999

    for p in world.get("props", []):
        if p.get("type") != prop_type:
            continue

        dist = abs(p["x"] - c["x"]) + abs(p["y"] - c["y"])

        if dist < best_dist:
            best = p
            best_dist = dist

    return best