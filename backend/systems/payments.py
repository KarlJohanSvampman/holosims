def attempt_pay_bills(c, world):

    hid = c.get("household_id")
    if not hid:
        return

    household = world["households"].get(hid)
    if not household:
        return

    for bill in household.get("bills_due", []):

        if bill["remaining"] <= 0:
            continue

        wealth = c.get("wealth", 0)
        if wealth <= 0:
            continue

        # simple share logic
        members = household.get("members", [])
        share = bill["amount"] / max(1, len(members))

        contribution = min(share, wealth, bill["remaining"])

        c["wealth"] -= contribution
        bill["remaining"] -= contribution

        bill.setdefault("contributors", {})
        bill["contributors"][c["id"]] = bill["contributors"].get(c["id"], 0) + contribution