def generate_intentions(c, world):

    intents = []

    hour = world["calendar"]["hour"]

    # -----------------
    # sleep planning
    # -----------------
    if hour >= 20:

        intents.append({
            "id": f"sleep_{world['tick']}",

            "goal": "sleep",

            "start_after": world["tick"] + 300,
            "deadline": world["tick"] + 2000,

            "priority": 90,

            "target": {
                "prop_type": "bed"
            },

            "status": "planned"
        })

    return intents


def choose_intention(c, world):

    intents = c.get("intentions", [])

    now = world["tick"]

    valid = [
        i for i in intents
        if i["status"] == "planned"
        and i["start_after"] <= now
    ]

    if not valid:
        return None

    valid.sort(key=lambda i: i["priority"], reverse=True)

    return valid[0]