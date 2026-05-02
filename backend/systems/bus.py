def update_buses(world):

    for e in world.get("entities", {}).values():

        bus = e["components"].get("bus")
        pos = e["components"].get("position")
        move = e["components"].get("movement")

        if not bus or not move:
            continue

        path = move["path"]
        idx = move["index"]

        # move
        next_pos = path[idx]
        pos["x"], pos["y"] = next_pos

        move["index"] = (idx + 1) % len(path)

        # check stop
        for stop in world.get("bus_stops", []):
            if pos["x"] == stop["x"] and pos["y"] == stop["y"]:
                bus["state"] = "stopped"
                return