def get_prop_template(world, prop):

    tid = prop.get("template")

    return (
        world
        .get("definitions", {})
        .get("prop_templates", {})
        .get(tid)
    )