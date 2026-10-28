import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_PATH = PROJECT_ROOT / "Backend"
sys.path.insert(0, str(BACKEND_PATH))

from app.database import get_db
from app.models import Base
from app.main import app


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

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
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
    }

    felhasznalo = {
        "nev": "Tej Szerető János",
        "email": "tejesember@tejes.com",
        "szerepkor": "Oktató",
        "is_mesterkulcs": False,
    }

    terem_response = client.post("/termek", json=terem)
    felhasznalo_response = client.post(
        "/felhasznalok", json=felhasznalo
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
    }

    response = client.post("/termek", json=terem)

    assert response.status_code == 200
    assert response.json()["id"] == "T101"
    assert response.json()["ferohely"] == 30


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
