from copy import deepcopy


# =========================================================
# ROTATE TILE
# =========================================================


def rotate_tile(x, y, rotation):

    # 0
    if rotation == 0:
        return x, y

    # 90
    if rotation == 90:
        return -y, x

    # 180
    if rotation == 180:
        return -x, -y

    # 270
    if rotation == 270:
        return y, -x

    return x, y


# =========================================================
# WORLD POSITION
# =========================================================


def world_pos(
    building,
    x,
    y
):

    rx, ry = rotate_tile(
        x,
        y,
        building.get(
            "rotation",
            0
        )
    )

    return (
        building["x"] + rx,
        building["y"] + ry
    )


# =========================================================
# INSTANTIATE FLOORPLAN
# =========================================================


def instantiate_floorplan(

    building,

    floorplan
):

    result = {

        "building_id": building["id"],

        "tiles": [],

        "rooms": [],

        "doors": [],

        "windows": [],

        "navigation": {}
    }

    # =====================================
    # TILES
    # =====================================

    for key, tile in floorplan.get(
        "tiles",
        {}
    ).items():

        tx = tile["x"]
        ty = tile["y"]

        wx, wy = world_pos(
            building,
            tx,
            ty
        )

        projected = deepcopy(tile)

        projected["x"] = wx
        projected["y"] = wy

        result["tiles"].append(
            projected
        )

    # =====================================
    # ROOMS
    # =====================================

    for room in floorplan.get(
        "rooms",
        []
    ):

        projected_room = deepcopy(room)

        projected_tiles = []

        for tile in room.get(
            "tiles",
            []
        ):

            wx, wy = world_pos(
                building,
                tile["x"],
                tile["y"]
            )

            projected_tiles.append({
                "x": wx,
                "y": wy
            })

        projected_room[
            "tiles"
        ] = projected_tiles

        result["rooms"].append(
            projected_room
        )

    # =====================================
    # DOORS
    # =====================================

    for door in floorplan.get(
        "doors",
        []
    ):

        projected = deepcopy(door)

        wx, wy = world_pos(
            building,
            door["x"],
            door["y"]
        )

        projected["x"] = wx
        projected["y"] = wy

        result["doors"].append(
            projected
        )

    # =====================================
    # WINDOWS
    # =====================================

    for window in floorplan.get(
        "windows",
        []
    ):

        projected = deepcopy(window)

        wx, wy = world_pos(
            building,
            window["x"],
            window["y"]
        )

        projected["x"] = wx
        projected["y"] = wy

        result["windows"].append(
            projected
        )

    return result