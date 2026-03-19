import os

import pytest

from backend.edge_api.app import app


@pytest.fixture()
def client(monkeypatch):
    app.config["TESTING"] = True

    # Avoid network/database calls from auth middleware.
    monkeypatch.setattr(
        "backend.edge_api.middleware.auth_guard.verify_access_token",
        lambda _token: {"id": "user-1", "email": "user@example.com"},
    )
    monkeypatch.setattr("backend.edge_api.middleware.auth_guard.upsert_user", lambda **_kwargs: {"ok": True})

    with app.test_client() as c:
        yield c


def _auth_header():
    return {"Authorization": "Bearer test-token"}


def test_health_includes_request_id(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers.get("X-Request-Id")
    payload = response.get_json()
    assert payload["ok"] is True


def test_auth_login_smoke(client, monkeypatch):
    monkeypatch.setattr(
        "backend.edge_api.routes.auth_routes.login",
        lambda email, password: {"access_token": "token-1", "user": {"email": email}},
    )

    response = client.post("/auth/login", json={"email": "u@example.com", "password": "pw"})
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["success"] is True
    assert payload["access_token"] == "token-1"


def test_cases_create_and_list_smoke(client, monkeypatch):
    monkeypatch.setattr(
        "backend.edge_api.routes.case_routes.create_case",
        lambda **_kwargs: {"case_id": "case-1", "title": "Test", "user_id": "user-1"},
    )
    monkeypatch.setattr(
        "backend.edge_api.routes.case_routes.list_cases",
        lambda **_kwargs: [{"case_id": "case-1", "title": "Test", "user_id": "user-1"}],
    )

    create_resp = client.post("/cases/create", json={"title": "Test"}, headers=_auth_header())
    assert create_resp.status_code == 201
    assert create_resp.get_json()["success"] is True

    list_resp = client.get("/cases/list", headers=_auth_header())
    assert list_resp.status_code == 200
    payload = list_resp.get_json()
    assert payload["success"] is True
    assert len(payload["cases"]) == 1


def test_generate_and_refine_smoke(client, monkeypatch):
    monkeypatch.setattr("backend.edge_api.routes.generation_routes.get_case", lambda **_kwargs: {"case_id": "case-1"})
    monkeypatch.setattr(
        "backend.edge_api.routes.generation_routes._resolve_image_generation",
        lambda **_kwargs: {"sketch_b64": "ZHVtbXk=", "final_prompt": "prompt", "pencil_only": True},
    )
    monkeypatch.setattr(
        "backend.edge_api.routes.generation_routes._upload_case_artifact",
        lambda **_kwargs: {
            "storage_path": "cases/case-1/sketches/sketch_1.png",
            "signed_image_url": "https://example.com/signed",
        },
    )
    monkeypatch.setattr(
        "backend.edge_api.routes.generation_routes.create_sketch",
        lambda **_kwargs: {"sketch_id": "sk-1", "version": 1},
    )
    monkeypatch.setattr(
        "backend.edge_api.routes.generation_routes.create_refinement",
        lambda **_kwargs: {"refine_id": "ref-1", "attribute_type": "nose"},
    )
    monkeypatch.setattr("backend.edge_api.routes.generation_routes._next_case_version", lambda _case_id: 1)

    gen_resp = client.post(
        "/sketch/generate",
        json={"case_id": "case-1", "description": "desc"},
        headers=_auth_header(),
    )
    assert gen_resp.status_code == 200
    gen_payload = gen_resp.get_json()
    assert gen_payload["success"] is True
    assert gen_payload["signed_image_url"]

    ref_resp = client.post(
        "/refine/add",
        json={"case_id": "case-1", "description": "desc", "refinement": "smaller nose"},
        headers=_auth_header(),
    )
    assert ref_resp.status_code == 200
    ref_payload = ref_resp.get_json()
    assert ref_payload["success"] is True
    assert ref_payload["refinement_record"]["refine_id"] == "ref-1"


def test_rate_limit_on_expensive_endpoint(client, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_PATHS", "/sketch/generate")
    monkeypatch.setenv("RATE_LIMIT_MAX_REQUESTS", "1")
    monkeypatch.setenv("RATE_LIMIT_WINDOW_SECONDS", "60")

    # Clear module cache to isolate this test.
    from backend.edge_api.middleware import rate_limit as rate_limit_module

    rate_limit_module._HITS.clear()

    monkeypatch.setattr("backend.edge_api.routes.generation_routes.get_case", lambda **_kwargs: {"case_id": "case-1"})
    monkeypatch.setattr(
        "backend.edge_api.routes.generation_routes._resolve_image_generation",
        lambda **_kwargs: {"sketch_b64": "ZHVtbXk=", "final_prompt": "prompt", "pencil_only": True},
    )
    monkeypatch.setattr(
        "backend.edge_api.routes.generation_routes._upload_case_artifact",
        lambda **_kwargs: {
            "storage_path": "cases/case-1/sketches/sketch_1.png",
            "signed_image_url": "https://example.com/signed",
        },
    )
    monkeypatch.setattr(
        "backend.edge_api.routes.generation_routes.create_sketch",
        lambda **_kwargs: {"sketch_id": "sk-1", "version": 1},
    )
    monkeypatch.setattr("backend.edge_api.routes.generation_routes._next_case_version", lambda _case_id: 1)

    first = client.post(
        "/sketch/generate",
        json={"case_id": "case-1", "description": "desc"},
        headers=_auth_header(),
    )
    assert first.status_code == 200

    second = client.post(
        "/sketch/generate",
        json={"case_id": "case-1", "description": "desc"},
        headers=_auth_header(),
    )
    assert second.status_code == 429
    payload = second.get_json()
    assert payload["success"] is False
    assert payload["error_model"]["code"] == "RATE_LIMIT_EXCEEDED"