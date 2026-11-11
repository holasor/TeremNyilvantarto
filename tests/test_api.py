import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_PATH = PROJECT_ROOT / "Backend"
sys.path.insert(0, str(BACKEND_PATH))

from app.database import get_db
from app.models import Base, FelhasznaloModel
from app import main as main_module
from app.main import app, hash_password

@asynccontextmanager
async def disabled_lifespan(app):
    yield


app.router.lifespan_context = disabled_lifespan
@pytest.fixture()
def client():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine,
    )

    Base.metadata.create_all(bind=test_engine)
    test_db = TestingSessionLocal()
    test_db.add(
        FelhasznaloModel(
            nev="Teszt admin",
            email="admin@example.com",
            hashed_password=hash_password("admin-password"),
            szerepkor="Admin",
            is_mesterkulcs=False,
        )
    )
    test_db.commit()
    test_db.close()

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        login = test_client.post(
            "/api/login",
            json={"username": "admin@example.com", "password": "admin-password"},
        )
        assert login.status_code == 200, login.text
        test_client.headers["Authorization"] = (
            f"Bearer {login.json()['access_token']}"
        )
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()


@pytest.fixture()
def alapadatok(client):
    terem = {
        "id": "T101",
        "teremszam": "101",
        "ferohely": 30,
        "epulet": "A",
        "felszereles": "projektor, labor",
    }

    felhasznalo = {
        "nev": "Tej Szerető János",
        "email": "tejesember@tejes.com",
        "password": "TesztJelszo123!",
        "szerepkor": "Oktató",
        "is_mesterkulcs": False,
    }

    terem_response = client.post("/termek", json=terem)
    felhasznalo_response = client.post(
        "/api/register", json=felhasznalo
    )

    assert terem_response.status_code == 200
    assert felhasznalo_response.status_code == 200

    return {
        "terem": terem_response.json(),
        "felhasznalo": felhasznalo_response.json(),
    }

# Alapvető végpontok

def test_kezdooldal(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "message": "TeremNyilvantarto API működik"
    }


def test_adatbazis_kapcsolat(client):
    response = client.get("/test-db")

    assert response.status_code == 200
    assert response.json()["result"] == 1


# Termek

def test_termek_listazasa(client):
    response = client.get("/termek")

    assert response.status_code == 200
    assert response.json() == []


def test_terem_letrehozasa(client):
    terem = {
        "id": "T101",
        "teremszam": "101",
        "ferohely": 30,
        "epulet": "A",
        "felszereles": "projektor, labor",
    }

    response = client.post("/termek", json=terem)

    assert response.status_code == 200
    assert response.json()["id"] == "T101"
    assert response.json()["ferohely"] == 30
    assert response.json()["felszereles"] == "projektor, labor"
    filtered = client.get("/termek?minimum_ferohely=25&felszereles=projektor")
    assert [room["id"] for room in filtered.json()] == ["T101"]


def test_letezo_terem_szerkesztese(client, alapadatok):
    response = client.put(
        "/termek/T101",
        json={
            "teremszam": "101A",
            "ferohely": 36,
            "epulet": "B",
            "felszereles": "projektor, tábla",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": "T101",
        "teremszam": "101A",
        "ferohely": 36,
        "epulet": "B",
        "felszereles": "projektor, tábla",
    }


def test_nem_letezo_terem_szerkesztese_404(client):
    response = client.put(
        "/termek/NINCS",
        json={
            "teremszam": "1",
            "ferohely": 1,
            "epulet": "A",
            "felszereles": "",
        },
    )

    assert response.status_code == 404


def test_terem_duplikalt_id(client, alapadatok):
    terem = {
        "id": "T101",
        "teremszam": "101",
        "ferohely": 30,
        "epulet": "A",
    }

    response = client.post("/termek", json=terem)

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "Ilyen ID-jú terem már létezik."
    )


def test_terem_torlese(client, alapadatok):
    response = client.delete("/termek/T101")

    assert response.status_code == 200
    assert response.json()["message"] == "Terem sikeresen törölve."


def test_nem_letezo_terem_torlese(client):
    response = client.delete("/termek/NINCS")

    assert response.status_code == 404


def test_felhasznaloi_nevjegy_nem_adja_vissza_az_emailcimeket(client, alapadatok):
    response = client.get("/felhasznalok")

    assert response.status_code == 200
    assert response.json()[0].keys() == {"id", "nev"}


def test_vedett_vegponthoz_bejelentkezes_szukseges(client):
    del client.headers["Authorization"]

    response = client.get("/termek")

    assert response.status_code == 401


def test_swagger_vedett_vegponthoz_bearer_token_szukseges(client):
    schema = client.get("/openapi.json").json()

    assert schema["components"]["securitySchemes"]["HTTPBearer"] == {
        "type": "http",
        "scheme": "bearer",
    }
    assert schema["paths"]["/kulcsok"]["get"]["security"] == [
        {"HTTPBearer": []}
    ]


def test_regisztracio_nem_ad_admin_jogot(client):
    response = client.post(
        "/api/register",
        json={
            "nev": "Nem admin",
            "email": "not-admin@example.com",
            "password": "TesztJelszo123!",
            "szerepkor": "Admin",
            "is_mesterkulcs": True,
        },
    )

    assert response.status_code == 200
    assert response.json()["szerepkor"] == "Oktató"
    assert response.json()["is_mesterkulcs"] is False


def test_oktato_nem_hozhat_letre_termet(client):
    client.post(
        "/api/register",
        json={
            "nev": "Oktató",
            "email": "teacher@example.com",
            "password": "TesztJelszo123!",
            "szerepkor": "Oktató",
        },
    )
    login = client.post(
        "/api/login",
        json={"username": "teacher@example.com", "password": "TesztJelszo123!"},
    )

    response = client.post(
        "/termek",
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
        json={
            "id": "T202",
            "teremszam": "202",
            "ferohely": 20,
            "epulet": "A",
        },
    )

    assert response.status_code == 403


def test_foglalasi_utkozes_es_egymas_utani_idosav(client, alapadatok):
    start = datetime.now(timezone.utc) + timedelta(days=2)
    end = start + timedelta(hours=1)
    payload = {
        "felhasznaloid": alapadatok["felhasznalo"]["id"],
        "teremid": alapadatok["terem"]["id"],
        "kezdet": start.isoformat(),
        "veg": end.isoformat(),
        "specialis_igeny": "projektor",
    }

    first = client.post("/foglalasok", json=payload)
    collision = client.post(
        "/foglalasok",
        json={**payload, "kezdet": (start + timedelta(minutes=30)).isoformat()},
    )
    adjacent = client.post(
        "/foglalasok",
        json={
            **payload,
            "kezdet": end.isoformat(),
            "veg": (end + timedelta(hours=1)).isoformat(),
        },
    )

    assert first.status_code == 200
    assert first.json()["statusz"] == "aktiv"
    assert first.json()["specialis_igeny"] == "projektor"
    assert collision.status_code == 409
    assert adjacent.status_code == 200


def test_karbantartas_alatt_nem_lehet_foglalni(client, alapadatok):
    start = datetime.now(timezone.utc) + timedelta(days=3)
    end = start + timedelta(hours=1)
    maintenance = client.post(
        "/karbantartas",
        json={
            "teremid": alapadatok["terem"]["id"],
            "kezdet": start.isoformat(),
            "veg": end.isoformat(),
            "leiras": "Teszt karbantartás",
        },
    )
    booking = client.post(
        "/foglalasok",
        json={
            "felhasznaloid": alapadatok["felhasznalo"]["id"],
            "teremid": alapadatok["terem"]["id"],
            "kezdet": start.isoformat(),
            "veg": end.isoformat(),
        },
    )

    assert maintenance.status_code == 200
    assert booking.status_code == 409


def test_karbantartas_felsorolja_az_erintett_foglalasokat(client, alapadatok):
    start = datetime.now(timezone.utc) + timedelta(days=4)
    end = start + timedelta(hours=1)
    booking = client.post(
        "/foglalasok",
        json={
            "felhasznaloid": alapadatok["felhasznalo"]["id"],
            "teremid": alapadatok["terem"]["id"],
            "kezdet": start.isoformat(),
            "veg": end.isoformat(),
        },
    )

    maintenance = client.post(
        "/karbantartas",
        json={
            "teremid": alapadatok["terem"]["id"],
            "kezdet": start.isoformat(),
            "veg": end.isoformat(),
            "leiras": "Sürgős javítás",
        },
    )

    assert maintenance.status_code == 409
    assert maintenance.json()["detail"]["foglalas_idk"] == [booking.json()["id"]]


def test_kulcsmozgas_idobelyeg_szerveroldali_es_visszavetel(client, alapadatok):
    key = client.post(
        "/kulcsok",
        json={"teremid": alapadatok["terem"]["id"], "statusz": "Elérhető"},
    )
    movement = client.post(
        "/kulcsmozgasok",
        json={
            "kulcsid": key.json()["id"],
            "felhasznaloid": alapadatok["felhasznalo"]["id"],
            "kiadasideje": "2000-01-01T00:00:00",
        },
    )
    returned = client.post(
        f"/kulcsmozgasok/{movement.json()['id']}/visszavetel"
    )

    assert movement.status_code == 200
    assert movement.json()["visszaadva"] is False
    assert movement.json()["kiadasideje"].startswith(
        datetime.now(timezone.utc).strftime("%Y-%m-%d")
    )
    assert returned.status_code == 200
    assert returned.json()["visszavetelideje"] is not None
    assert returned.json()["visszaadva"] is True


def test_lejart_foglalas_no_show_allapotot_kap(client, alapadatok):
    start = datetime.now(timezone.utc) - timedelta(minutes=20)
    booking = client.post(
        "/foglalasok",
        json={
            "felhasznaloid": alapadatok["felhasznalo"]["id"],
            "teremid": alapadatok["terem"]["id"],
            "kezdet": start.isoformat(),
            "veg": (start + timedelta(hours=1)).isoformat(),
        },
    )

    listed = client.get("/foglalasok")
    updated = next(
        item for item in listed.json() if item["id"] == booking.json()["id"]
    )
    replacement = client.post(
        "/foglalasok",
        json={
            "felhasznaloid": alapadatok["felhasznalo"]["id"],
            "teremid": alapadatok["terem"]["id"],
            "kezdet": (start + timedelta(minutes=5)).isoformat(),
            "veg": (start + timedelta(minutes=30)).isoformat(),
        },
    )

    assert updated["statusz"] == "no_show"
    assert replacement.status_code == 200


def test_foglalas_kulcsfelvetel_nelkul_is_aktiv_a_turelmi_ido_vegeig(
    client, alapadatok, monkeypatch
):
    monkeypatch.setattr(main_module, "NO_SHOW_GRACE_MINUTES", 15)
    start = datetime.now(timezone.utc) + timedelta(minutes=5)
    booking = client.post(
        "/foglalasok",
        json={
            "felhasznaloid": alapadatok["felhasznalo"]["id"],
            "teremid": alapadatok["terem"]["id"],
            "kezdet": start.isoformat(),
            "veg": (start + timedelta(hours=1)).isoformat(),
        },
    )

    listed = client.get("/foglalasok")
    current = next(
        item for item in listed.json() if item["id"] == booking.json()["id"]
    )

    assert current["statusz"] == "aktiv"


def test_kesesben_levo_kulcs_lekerdezese(client, alapadatok, monkeypatch):
    monkeypatch.setattr(main_module, "KEY_OVERDUE_HOURS", 0)
    key = client.post(
        "/kulcsok",
        json={"teremid": alapadatok["terem"]["id"], "statusz": "Elérhető"},
    )
    movement = client.post(
        "/kulcsmozgasok",
        json={
            "kulcsid": key.json()["id"],
            "felhasznaloid": alapadatok["felhasznalo"]["id"],
            "kiadasideje": "2000-01-01T00:00:00",
        },
    )

    overdue = client.get("/kulcsmozgasok/kesesben")

    assert movement.status_code == 200
    assert [item["id"] for item in overdue.json()] == [movement.json()["id"]]


def test_admin_ki_es_visszavonhat_mesterkulcs_jogosultsagot(client, alapadatok):
    user_id = alapadatok["felhasznalo"]["id"]

    granted = client.put(f"/mesterkulcs-jogosultsagok/{user_id}")
    revoked = client.delete(f"/mesterkulcs-jogosultsagok/{user_id}")

    assert granted.status_code == 200
    assert granted.json()["felhasznaloid"] == user_id
    assert revoked.status_code == 200


def test_audit_log_csak_igazgatonak_elerheto(client):
    response = client.get("/audit-log")

    assert response.status_code == 403
