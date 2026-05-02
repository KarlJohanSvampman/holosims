def check_phone(c, world):

    phone = c.get("phone", {})

    if not phone.get("inbox"):
        return None

    msg = phone["inbox"].pop(0)

    return {
        "name": "reply_sms",
        "target": msg["from"],
        "text": f"Reply to: {msg['text']}"
    }