# =====================================================
# GENERIC TEMPLATE LOOKUP
# =====================================================

def get_template(
    world,
    category,
    template_id
):

    return (
        world
        .get("definitions", {})
        .get(category, {})
        .get(template_id)
    )


# =====================================================
# PROP TEMPLATES
# =====================================================

def get_prop_template(world, prop):

    return get_template(
        world,
        "prop_templates",
        prop.get("template")
    )


# =====================================================
# ITEM TEMPLATES
# =====================================================

def get_item_template(world, item):

    return get_template(
        world,
        "item_templates",
        item.get("template")
    )


# =====================================================
# CHARACTER TEMPLATES
# =====================================================

def get_character_template(world, character):

    return get_template(
        world,
        "character_templates",
        character.get("template")
    )


# =====================================================
# INTERACTION TEMPLATES
# =====================================================

def get_interaction_template(
    world,
    interaction_name
):

    return get_template(
        world,
        "interaction_templates",
        interaction_name
    )


# =====================================================
# ACTIVITY TEMPLATES
# =====================================================

def get_activity_template(
    world,
    activity_name
):

    return get_template(
        world,
        "activity_templates",
        activity_name
    )


# =====================================================
# TILE TEMPLATES
# =====================================================

def get_tile_template(
    world,
    tile_name
):

    return get_template(
        world,
        "tile_templates",
        tile_name
    )