from systems.navigation import (
    get_room_at_position
)


# =========================================================
# ASSIGN SINGLE PROP
# =========================================================

def assign_prop_room(

    floorplan,

    prop
):

    floorplan_id = floorplan["id"]

    room_id = get_room_at_position(

        floorplan_id,

        prop["x"],

        prop["y"]
    )

    prop["room_id"] = room_id

    return room_id


# =========================================================
# ASSIGN ALL
# =========================================================

def assign_prop_rooms(

    floorplan,

    props
):

    for prop in props:

        assign_prop_room(
            floorplan,
            prop
        )