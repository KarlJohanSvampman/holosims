import random


def choose_intention(c, world):

    needs = c.get("needs", {})

    if needs.get("energy", 1) < 0.3:
        return {"type": "rest"}

    if needs.get("hunger", 1) < 0.4:
        return {"type": "eat"}

    return {
        "type": random.choice([
            "wander",
            "socialize",
            "watch_tv"
        ])
    }