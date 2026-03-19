from uuid import uuid4

from flask import g, request


def register_request_context(app):
    @app.before_request
    def _attach_request_id():
        incoming = (request.headers.get("X-Request-Id") or "").strip()
        g.request_id = incoming or uuid4().hex
        return None

    @app.after_request
    def _write_request_id_header(response):
        request_id = (getattr(g, "request_id", "") or "").strip()
        if request_id:
            response.headers["X-Request-Id"] = request_id
        return response

    return app