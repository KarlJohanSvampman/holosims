def find_free_anchor(prop, action_name):

    anchors = prop.get("interaction", {}).get("anchors", [])

    for a in anchors:
        if a["name"] == action_name and not a.get("occupied_by"):
            return a

    return None


def reserve_anchor(c, prop, anchor):

    anchor["occupied_by"] = c["id"]

    c["occupying"] = {
        "prop_id": prop["id"],
        "anchor_name": anchor["name"]
    }


def release_anchor(c, world):

    occ = c.get("occupying")
    if not occ:
        return

    prop_id = occ["prop_id"]
    anchor_name = occ["anchor_name"]

    for p in world.get("props", []):
        if p["id"] != prop_id:
            continue

        for a in p.get("interaction", {}).get("anchors", []):
            if a["name"] == anchor_name and a.get("occupied_by") == c["id"]:
                a["occupied_by"] = None

    c["occupying"] = None