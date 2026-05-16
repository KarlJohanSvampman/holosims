from systems.prop_index import (
    find_props_by_tag
)

from systems.navigation import (
    build_multi_room_path
)

from systems.navigation_cache import (
    NAV_CACHE
) 

# =========================================================
# GET ROOM BY ID
# =========================================================

def get_room_by_id(
    floorplan,
    room_id
):

    for room in floorplan.get(
        "rooms",
        []
    ):

        if room["id"] == room_id:
            return room

    return None
# =========================================================
# FILTER ROOM TYPES
# =========================================================

def filter_props_by_room_type(

    floorplan,

    props,

    preferred_room_types
):

    if not preferred_room_types:

        return props

    results = []

    for p in props:

        room_id = p.get("room_id")

        if not room_id:
            continue

        room = get_room_by_id(

            floorplan,

            room_id
        )

        if not room:
            continue

        room_type = room.get("type")

        if room_type in preferred_room_types:

            results.append(p)

    return results
# =========================================================
# FILTER ACCESSIBLE
# =========================================================

def filter_accessible_props(

    props,

    character
):

    results = []

    for p in props:

        # later:
        # ownership
        # reservations
        # locked rooms
        # etc

        results.append(p)

    return results


# =========================================================
# SORT BY DISTANCE
# =========================================================

def sort_props_by_distance(

    props,

    x,

    y
):

    return sorted(

        props,

        key=lambda p:

        abs(p["x"] - x)
        +
        abs(p["y"] - y)
    )

# =========================================================
# FIND BEST PROP
# =========================================================

def find_best_prop(

    sim_id,

    floorplan,

    character,

    tag,

    preferred_room_types=None
):

    # =====================================
    # FIND TAGGED PROPS
    # =====================================

    props = find_props_by_tag(

        sim_id,

        tag
    )

    if not props:
        return None

    # =====================================
    # ROOM TYPE FILTER
    # =====================================

    props = filter_props_by_room_type(

        floorplan,

        props,

        preferred_room_types
    )

    if not props:
        return None

    # =====================================
    # ACCESS FILTER
    # =====================================

    props = filter_accessible_props(

        props,

        character
    )

    if not props:
        return None

    # =====================================
    # DISTANCE SORT
    # =====================================

    props = sort_props_by_distance(

        props,

        character["x"],

        character["y"]
    )

    return props[0]


# =========================================================
# BUILD ROUTE TO PROP
# =========================================================

def build_path_to_prop(

    floorplan,

    character,

    prop
):

    return build_multi_room_path(

        floorplan,

        (
            character["x"],
            character["y"]
        ),

        (
            prop["x"],
            prop["y"]
        )
    )