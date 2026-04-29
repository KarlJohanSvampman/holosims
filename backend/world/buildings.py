# Rooms are rectangles; doors connect rooms; walls can block LoS.

def make_room(id, x1, y1, x2, y2, building_id):
    return {
        "id": id,
        "building_id": building_id,
        "bounds": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
        "tiles": []  # optional cache
    }

def make_door(id, x, y, room_a, room_b, is_open=True):
    return {
        "id": id,
        "type": "door",
        "x": x,
        "y": y,
        "connects": [room_a, room_b],
        "is_open": is_open,
        "blocks_los": not is_open,  # closed door blocks LoS
        "walkable": True
    }

def in_room(room, x, y):
    b = room["bounds"]
    return b["x1"] <= x <= b["x2"] and b["y1"] <= y <= b["y2"]