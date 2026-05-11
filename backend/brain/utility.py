def score_goal(c, goal, world):

    needs = c.get("needs", {})
    traits = c.get("traits", [])

    score = 0

    # -----------------
    # EAT
    # -----------------
    if goal == "eat":

        hunger = needs.get("hunger", 0)

        score += hunger * 1.5

        if "glutton" in traits:
            score *= 1.3

        if "disciplined" in traits:
            score *= 0.9

    # -----------------
    # SLEEP
    # -----------------
    elif goal == "sleep":

        energy = needs.get("energy", 100)

        score += (100 - energy) * 1.8

        hour = world["calendar"]["hour"]

        # stronger at night
        if hour >= 22:
            score *= 1.5

    # -----------------
    # SOCIALIZE
    # -----------------
    elif goal == "socialize":

        social = needs.get("social", 100)

        score += (100 - social)

        if "extrovert" in traits:
            score *= 1.5

        if "introvert" in traits:
            score *= 0.5

    return score