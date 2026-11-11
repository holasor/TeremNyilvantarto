import os
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from . import models, schemas
from .database import (
    Base,
    SessionLocal,
    create_database_if_not_exists,
    engine,
    get_db,
)


TOKEN_LIFETIME = timedelta(hours=8)
TOKEN_SECRET = os.getenv("TOKEN_SECRET") or secrets.token_urlsafe(32)
NO_SHOW_GRACE_MINUTES = int(os.getenv("NO_SHOW_GRACE_MINUTES", "15"))
KEY_OVERDUE_HOURS = int(os.getenv("KEY_OVERDUE_HOURS", "24"))
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _encode_token(user: models.FelhasznaloModel) -> str:
    return jwt.encode(
        {
            "sub": str(user.id),
            "exp": datetime.now(timezone.utc) + TOKEN_LIFETIME,
        },
        TOKEN_SECRET,
        algorithm="HS256",
    )


def _decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, TOKEN_SECRET, algorithms=["HS256"])
        return int(payload["sub"])
    except (JWTError, KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Érvénytelen vagy lejárt hozzáférési token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def _to_utc_naive(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _audit(db: Session, user_id: int, operation: str) -> None:
    db.add(
        models.AuditLogModel(
            felhasznaloid=user_id,
            idobelyeg=_utcnow_naive(),
            muvelet=operation,
        )
    )
    db.commit()


def _refresh_no_shows(db: Session) -> None:
    now = _utcnow_naive()
    cutoff = now - timedelta(minutes=NO_SHOW_GRACE_MINUTES)
    bookings = (
        db.query(models.FoglalasModel)
        .filter(
            models.FoglalasModel.statusz == "aktiv",
            models.FoglalasModel.kezdet <= cutoff,
        )
        .all()
    )
    updated = False
    for booking in bookings:
        key_ids = [
            key.id
            for key in db.query(models.KulcsModel.id)
            .filter(models.KulcsModel.teremid == booking.teremid)
            .all()
        ]
        if not key_ids:
            booking.statusz = "no_show"
            updated = True
            continue
        checkout = (
            db.query(models.KulcsMozgasModel.id)
            .filter(
                models.KulcsMozgasModel.kulcsid.in_(key_ids),
                models.KulcsMozgasModel.felhasznaloid == booking.felhasznaloid,
                models.KulcsMozgasModel.kiadasideje >= booking.kezdet,
                models.KulcsMozgasModel.kiadasideje
                <= booking.kezdet + timedelta(minutes=NO_SHOW_GRACE_MINUTES),
            )
            .first()
        )
        if not checkout:
            booking.statusz = "no_show"
            updated = True
    if updated:
        db.commit()


def create_test_users() -> None:
    users = [
        ("Oktató", "oktato@test.com", "Teszt123"),
        ("Portás", "portas@test.com", "Teszt1234"),
        ("Admin", "admin@test.com", "Teszt123"),
        ("Üzemeltetési Igazgató", "igazgato@test.com", "Teszt123"),
    ]
    with SessionLocal() as db:
        for name, email, password in users:
            if db.query(models.FelhasznaloModel).filter_by(email=email).first():
                continue
            role = "Igazgató" if email.startswith("igazgato") else name
            db.add(
                models.FelhasznaloModel(
                    nev=name,
                    email=email,
                    hashed_password=hash_password(password),
                    szerepkor=role,
                    is_mesterkulcs=False,
                )
            )
        db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_database_if_not_exists()
    Base.metadata.create_all(bind=engine)
    for foreign_key in inspect(engine).get_foreign_keys("AUDIT_LOG"):
        if foreign_key["constrained_columns"] == ["felhasznaloid"]:
            constraint = engine.dialect.identifier_preparer.quote(
                foreign_key["name"]
            )
            with engine.begin() as connection:
                connection.execute(
                    text(f"ALTER TABLE AUDIT_LOG DROP CONSTRAINT {constraint}")
                )
    existing_columns = {
        table: {column["name"] for column in inspect(engine).get_columns(table)}
        for table in ("FOGLALAS", "TEREM", "KULCSMOZGAS")
    }
    new_columns = {
        ("FOGLALAS", "statusz"): "VARCHAR(30) NOT NULL DEFAULT 'aktiv'",
        ("FOGLALAS", "specialis_igeny"): "VARCHAR(1000) NOT NULL DEFAULT ''",
        ("TEREM", "felszereles"): "VARCHAR(1000) NOT NULL DEFAULT ''",
        ("KULCSMOZGAS", "visszaadva"): "BIT NOT NULL DEFAULT 0",
    }
    for (table, column), definition in new_columns.items():
        if column not in existing_columns[table]:
            with engine.begin() as connection:
                connection.execute(
                    text(f"ALTER TABLE {table} ADD {column} {definition}")
                )
    if "visszaadva" not in existing_columns["KULCSMOZGAS"]:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "UPDATE KULCSMOZGAS SET visszaadva = 1 "
                    "WHERE visszavetelideje IS NOT NULL"
                )
            )
    if os.getenv("SEED_TEST_USERS", "false").lower() == "true":
        create_test_users()
    yield


app = FastAPI(title="Terem- és Kulcsnyilvántartó Rendszer", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.FelhasznaloModel:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bejelentkezés szükséges.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = _decode_token(credentials.credentials)
    user = db.query(models.FelhasznaloModel).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A felhasználó már nem létezik.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    _audit(db, user.id, "API művelet")
    return user


def require_roles(*roles: str):
    def role_dependency(
        user: models.FelhasznaloModel = Depends(current_user),
    ) -> models.FelhasznaloModel:
        if user.szerepkor not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Nincs jogosultságod ehhez a művelethez.",
            )
        return user

    return role_dependency


admin_user = Depends(require_roles("Admin"))
key_staff = Depends(require_roles("Portás", "Admin"))
report_reader = Depends(require_roles("Portás", "Admin", "Igazgató"))


@app.get("/")
def read_root():
    return {"message": "TeremNyilvantarto API működik"}


@app.get("/test-db")
def test_db_connection(
    db: Session = Depends(get_db),
    _user: models.FelhasznaloModel = Depends(current_user),
):
    result = db.execute(text("SELECT 1")).fetchone()
    return {"status": "Sikeres adatbázis kapcsolat!", "result": result[0]}


@app.post("/api/register", response_model=schemas.FelhasznaloResponse)
def register_user(user: schemas.FelhasznaloCreate, db: Session = Depends(get_db)):
    if db.query(models.FelhasznaloModel).filter_by(email=user.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ez az email cím már regisztrálva van.",
        )
    db_user = models.FelhasznaloModel(
        nev=user.nev,
        email=user.email,
        hashed_password=hash_password(user.password),
        szerepkor="Oktató",
        is_mesterkulcs=False,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    _audit(db, db_user.id, "Felhasználó regisztráció")
    return db_user


@app.post("/api/login", response_model=schemas.TokenResponse)
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.FelhasznaloModel).filter_by(email=user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Helytelen email cím vagy jelszó.",
        )
    _audit(db, db_user.id, "Bejelentkezés")
    return {
        "access_token": _encode_token(db_user),
        "user": db_user,
    }


@app.get("/termek", response_model=list[schemas.TeremResponse])
def get_termek(
    minimum_ferohely: int | None = None,
    felszereles: str | None = None,
    db: Session = Depends(get_db),
    _user: models.FelhasznaloModel = Depends(current_user),
):
    rooms = db.query(models.TeremModel)
    if minimum_ferohely is not None:
        rooms = rooms.filter(models.TeremModel.ferohely >= minimum_ferohely)
    if felszereles:
        rooms = rooms.filter(models.TeremModel.felszereles.ilike(f"%{felszereles}%"))
    return rooms.order_by(
        models.TeremModel.ferohely, models.TeremModel.teremszam
    ).all()


@app.post("/termek", response_model=schemas.TeremResponse)
def create_terem(
    terem: schemas.TeremCreate,
    db: Session = Depends(get_db),
    user: models.FelhasznaloModel = admin_user,
):
    if db.query(models.TeremModel).filter_by(id=terem.id).first():
        raise HTTPException(status_code=400, detail="Ilyen ID-jú terem már létezik.")
    db_terem = models.TeremModel(**terem.model_dump())
    db.add(db_terem)
    db.commit()
    db.refresh(db_terem)
    _audit(db, user.id, f"Terem létrehozása: {terem.id}")
    return db_terem


@app.put("/termek/{terem_id}", response_model=schemas.TeremResponse)
def update_terem(
    terem_id: str,
    terem: schemas.TeremUpdate,
    db: Session = Depends(get_db),
    user: models.FelhasznaloModel = admin_user,
):
    db_terem = db.query(models.TeremModel).filter_by(id=terem_id).first()
    if not db_terem:
        raise HTTPException(status_code=404, detail="A terem nem található.")
    for field, value in terem.model_dump().items():
        setattr(db_terem, field, value)
    db.commit()
    db.refresh(db_terem)
    _audit(db, user.id, f"Terem módosítása: {terem_id}")
    return db_terem


@app.delete("/termek/{terem_id}")
def delete_terem(
    terem_id: str,
    db: Session = Depends(get_db),
    user: models.FelhasznaloModel = admin_user,
):
    terem = db.query(models.TeremModel).filter_by(id=terem_id).first()
    if not terem:
        raise HTTPException(status_code=404, detail="A terem nem található.")
    if (
        db.query(models.FoglalasModel).filter_by(teremid=terem_id).first()
        or db.query(models.KulcsModel).filter_by(teremid=terem_id).first()
        or db.query(models.HibajegyModel).filter_by(teremid=terem_id).first()
        or db.query(models.KarbantartasiIdosavModel)
        .filter_by(teremid=terem_id)
        .first()
    ):
        raise HTTPException(status_code=409, detail="A terem még hivatkozásokkal rendelkezik.")
    db.delete(terem)
    db.commit()
    _audit(db, user.id, f"Terem törlése: {terem_id}")
    return {"message": "Terem sikeresen törölve."}


@app.get("/felhasznalok", response_model=list[schemas.FelhasznaloKonyvtarResponse])
def get_felhasznalok(
    db: Session = Depends(get_db),
    _user: models.FelhasznaloModel = Depends(current_user),
):
    return db.query(models.FelhasznaloModel).all()


@app.delete("/felhasznalok/{felhasznalo_id}")
def delete_felhasznalo(
    felhasznalo_id: int,
    db: Session = Depends(get_db),
    user: models.FelhasznaloModel = admin_user,
):
    felhasznalo = db.query(models.FelhasznaloModel).filter_by(id=felhasznalo_id).first()
    if not felhasznalo:
        raise HTTPException(status_code=404, detail="A felhasználó nem található.")
    if (
        db.query(models.FoglalasModel).filter_by(felhasznaloid=felhasznalo_id).first()
        or db.query(models.KulcsMozgasModel)
        .filter_by(felhasznaloid=felhasznalo_id)
        .first()
        or db.query(models.HibajegyModel).filter_by(felhasznaloid=felhasznalo_id).first()
        or db.query(models.MesterkulcsJogosultsagModel)
        .filter_by(felhasznaloid=felhasznalo_id)
        .first()
    ):
        raise HTTPException(status_code=409, detail="A felhasználóhoz előzmények vagy jogosultságok tartoznak.")
    db.delete(felhasznalo)
    db.commit()
    _audit(db, user.id, f"Felhasználó törlése: {felhasznalo_id}")
    return {"message": "Felhasználó sikeresen törölve."}


@app.get("/kulcsok", response_model=list[schemas.KulcsResponse])
def get_kulcsok(
    db: Session = Depends(get_db),
    _user: models.FelhasznaloModel = Depends(current_user),
):
    return db.query(models.KulcsModel).all()


@app.post("/kulcsok", response_model=schemas.KulcsResponse)
def create_kulcs(
    kulcs: schemas.KulcsCreate,
    db: Session = Depends(get_db),
    user: models.FelhasznaloModel = admin_user,
):
    if not db.query(models.TeremModel).filter_by(id=kulcs.teremid).first():
        raise HTTPException(status_code=404, detail="A megadott terem nem létezik.")
    db_kulcs = models.KulcsModel(**kulcs.model_dump())
    db.add(db_kulcs)
    db.commit()
    db.refresh(db_kulcs)
    _audit(db, user.id, f"Kulcs létrehozása: {db_kulcs.id}")
    return db_kulcs


@app.delete("/kulcsok/{kulcs_id}")
def delete_kulcs(
    kulcs_id: int,
    db: Session = Depends(get_db),
    user: models.FelhasznaloModel = admin_user,
):
    kulcs = db.query(models.KulcsModel).filter_by(id=kulcs_id).first()
    if not kulcs:
        raise HTTPException(status_code=404, detail="A kulcs nem található.")
    if db.query(models.KulcsMozgasModel).filter_by(kulcsid=kulcs_id).first():
        raise HTTPException(status_code=409, detail="A kulcshoz mozgás tartozik.")
    db.delete(kulcs)
    db.commit()
    _audit(db, user.id, f"Kulcs törlése: {kulcs_id}")
    return {"message": "Kulcs sikeresen törölve."}


@app.get("/kulcsmozgasok", response_model=list[schemas.KulcsMozgasResponse])
def get_kulcsmozgasok(
    db: Session = Depends(get_db),
    user: models.FelhasznaloModel = Depends(current_user),
):
    movements = db.query(models.KulcsMozgasModel)
    if user.szerepkor == "Oktató":
        movements = movements.filter_by(felhasznaloid=user.id)
    return movements.all()


@app.get("/kulcsmozgasok/kesesben", response_model=list[schemas.KulcsMozgasResponse])
def get_overdue_key_movements(
    db: Session = Depends(get_db),
    _user: models.FelhasznaloModel = key_staff,
):
    cutoff = _utcnow_naive() - timedelta(hours=KEY_OVERDUE_HOURS)
    return (
        db.query(models.KulcsMozgasModel)
        .filter(
            models.KulcsMozgasModel.visszavetelideje.is_(None),
            models.KulcsMozgasModel.kiadasideje <= cutoff,
        )
        .order_by(models.KulcsMozgasModel.kiadasideje)
        .all()
    )


@app.post("/kulcsmozgasok", response_model=schemas.KulcsMozgasResponse)
def create_kulcsmozgas(
    mozgas: schemas.KulcsMozgasCreate,
    db: Session = Depends(get_db),
    user: models.FelhasznaloModel = key_staff,
):
    if not db.query(models.KulcsModel).filter_by(id=mozgas.kulcsid).first():
        raise HTTPException(status_code=404, detail="A megadott kulcs nem található.")
    if not db.query(models.FelhasznaloModel).filter_by(id=mozgas.felhasznaloid).first():
        raise HTTPException(status_code=404, detail="A megadott felhasználó nem található.")
    active = (
        db.query(models.KulcsMozgasModel)
        .filter_by(kulcsid=mozgas.kulcsid, visszavetelideje=None)
        .first()
    )
    if active:
        raise HTTPException(status_code=409, detail="A kulcs már ki van adva.")
    db_mozgas = models.KulcsMozgasModel(
        kulcsid=mozgas.kulcsid,
        felhasznaloid=mozgas.felhasznaloid,
        kiadasideje=_utcnow_naive(),
        visszavetelideje=None,
        visszaadva=False,
    )
    db.add(db_mozgas)
    db.commit()
    db.refresh(db_mozgas)
    _audit(db, user.id, f"Kulcs kiadása: {mozgas.kulcsid}")
    return db_mozgas


@app.post("/kulcsmozgasok/{mozgas_id}/visszavetel", response_model=schemas.KulcsMozgasResponse)
def return_key(
    mozgas_id: int,
    db: Session = Depends(get_db),
    user: models.FelhasznaloModel = key_staff,
):
    mozgas = db.query(models.KulcsMozgasModel).filter_by(id=mozgas_id).first()
    if not mozgas:
        raise HTTPException(status_code=404, detail="A kulcsmozgás nem található.")
    if mozgas.visszavetelideje:
        raise HTTPException(status_code=409, detail="A kulcsot már visszavették.")
    mozgas.visszavetelideje = _utcnow_naive()
    mozgas.visszaadva = True
    db.commit()
    db.refresh(mozgas)
    _audit(db, user.id, f"Kulcs visszavétele: {mozgas.kulcsid}")
    return mozgas


@app.get("/foglalasok", response_model=list[schemas.FoglalasResponse])
def get_foglalasok(
    db: Session = Depends(get_db),
    _user: models.FelhasznaloModel = Depends(current_user),
):
    _refresh_no_shows(db)
    return db.query(models.FoglalasModel).all()


@app.post("/foglalasok", response_model=schemas.FoglalasResponse)
def create_foglalas(
    foglalas: schemas.FoglalasCreate,
    db: Session = Depends(get_db),
    user: models.FelhasznaloModel = Depends(require_roles("Oktató", "Admin")),
):
    start = _to_utc_naive(foglalas.kezdet)
    end = _to_utc_naive(foglalas.veg)
    if end <= start:
        raise HTTPException(status_code=400, detail="A foglalás végének későbbinek kell lennie.")
    if user.szerepkor != "Admin" and foglalas.felhasznaloid != user.id:
        raise HTTPException(status_code=403, detail="Csak saját nevedben foglalhatsz.")
    if not db.query(models.FelhasznaloModel).filter_by(id=foglalas.felhasznaloid).first():
        raise HTTPException(status_code=404, detail="A megadott felhasználó nem található.")
    if not db.query(models.TeremModel).filter_by(id=foglalas.teremid).first():
        raise HTTPException(status_code=404, detail="A megadott terem nem található.")
    _refresh_no_shows(db)
    collision = (
        db.query(models.FoglalasModel)
        .filter(
            models.FoglalasModel.teremid == foglalas.teremid,
            models.FoglalasModel.statusz == "aktiv",
            models.FoglalasModel.kezdet < end,
            models.FoglalasModel.veg > start,
        )
        .first()
    )
    maintenance = (
        db.query(models.KarbantartasiIdosavModel)
        .filter(
            models.KarbantartasiIdosavModel.teremid == foglalas.teremid,
            models.KarbantartasiIdosavModel.kezdet < end,
            models.KarbantartasiIdosavModel.veg > start,
        )
        .first()
    )
    if collision:
        raise HTTPException(status_code=409, detail="A terem ebben az időszakban már foglalt.")
    if maintenance:
        raise HTTPException(status_code=409, detail="A terem karbantartás miatt nem foglalható.")
    db_foglalas = models.FoglalasModel(
        felhasznaloid=foglalas.felhasznaloid,
        teremid=foglalas.teremid,
        kezdet=start,
        veg=end,
        specialis_igeny=foglalas.specialis_igeny,
        statusz="aktiv",
    )
    db.add(db_foglalas)
    db.commit()
    db.refresh(db_foglalas)
    _audit(db, user.id, f"Foglalás létrehozása: {db_foglalas.id}")
    return db_foglalas


@app.delete("/foglalasok/{foglalas_id}")
def delete_foglalas(
    foglalas_id: int,
    db: Session = Depends(get_db),
    user: models.FelhasznaloModel = Depends(current_user),
):
    foglalas = db.query(models.FoglalasModel).filter_by(id=foglalas_id).first()
    if not foglalas:
        raise HTTPException(status_code=404, detail="A foglalás nem található.")
    if user.szerepkor not in {"Admin", "Oktató"} or (
        user.szerepkor != "Admin" and foglalas.felhasznaloid != user.id
    ):
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a foglalás törléséhez.")
    db.delete(foglalas)
    db.commit()
    _audit(db, user.id, f"Foglalás törlése: {foglalas_id}")
    return {"message": "Foglalás sikeresen törölve."}


@app.get("/hibajegyek", response_model=list[schemas.HibajegyResponse])
def get_hibajegyek(
    db: Session = Depends(get_db),
    _user: models.FelhasznaloModel = report_reader,
):
    return db.query(models.HibajegyModel).all()


@app.post("/hibajegyek", response_model=schemas.HibajegyResponse)
def create_hibajegy(
    hibajegy: schemas.HibajegyCreate,
    db: Session = Depends(get_db),
    user: models.FelhasznaloModel = Depends(
        require_roles("Oktató", "Portás", "Admin")
    ),
):
    if user.szerepkor != "Admin" and hibajegy.felhasznaloid != user.id:
        raise HTTPException(status_code=403, detail="Csak saját nevedben adhatsz le hibajegyet.")
    if not db.query(models.TeremModel).filter_by(id=hibajegy.teremid).first():
        raise HTTPException(status_code=404, detail="A megadott terem nem található.")
    hibajegy_db = models.HibajegyModel(**hibajegy.model_dump())
    db.add(hibajegy_db)
    db.commit()
    db.refresh(hibajegy_db)
    _audit(db, user.id, f"Hibajegy létrehozása: {hibajegy_db.id}")
    return hibajegy_db


@app.delete("/hibajegyek/{hibajegy_id}")
def delete_hibajegy(
    hibajegy_id: int,
    db: Session = Depends(get_db),
    user: models.FelhasznaloModel = admin_user,
):
    hibajegy = db.query(models.HibajegyModel).filter_by(id=hibajegy_id).first()
    if not hibajegy:
        raise HTTPException(status_code=404, detail="A hibajegy nem található.")
    db.delete(hibajegy)
    db.commit()
    _audit(db, user.id, f"Hibajegy törlése: {hibajegy_id}")
    return {"message": "Hibajegy sikeresen törölve."}


@app.get("/karbantartas", response_model=list[schemas.KarbantartasiIdosavResponse])
def get_karbantartas(
    db: Session = Depends(get_db),
    _user: models.FelhasznaloModel = Depends(current_user),
):
    return db.query(models.KarbantartasiIdosavModel).all()


@app.post("/karbantartas", response_model=schemas.KarbantartasiIdosavResponse)
def create_karbantartas(
    idosav: schemas.KarbantartasiIdosavCreate,
    db: Session = Depends(get_db),
    user: models.FelhasznaloModel = admin_user,
):
    start = _to_utc_naive(idosav.kezdet)
    end = _to_utc_naive(idosav.veg)
    if end <= start:
        raise HTTPException(status_code=400, detail="A karbantartás végének későbbinek kell lennie.")
    if not db.query(models.TeremModel).filter_by(id=idosav.teremid).first():
        raise HTTPException(status_code=404, detail="A megadott terem nem található.")
    active_bookings = (
        db.query(models.FoglalasModel)
        .filter(
            models.FoglalasModel.teremid == idosav.teremid,
            models.FoglalasModel.statusz == "aktiv",
            models.FoglalasModel.kezdet < end,
            models.FoglalasModel.veg > start,
        )
        .all()
    )
    if active_bookings:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "A kijelölt karbantartás aktív foglalásokat érint; előbb töröld vagy helyezd át őket.",
                "foglalas_idk": [booking.id for booking in active_bookings],
            },
        )
    entry = models.KarbantartasiIdosavModel(
        teremid=idosav.teremid,
        kezdet=start,
        veg=end,
        leiras=idosav.leiras,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    _audit(db, user.id, f"Karbantartási időszak kijelölése: {entry.id}")
    return entry


@app.delete("/karbantartas/{idosav_id}")
def delete_karbantartas(
    idosav_id: int,
    db: Session = Depends(get_db),
    user: models.FelhasznaloModel = admin_user,
):
    entry = db.query(models.KarbantartasiIdosavModel).filter_by(id=idosav_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="A karbantartási időszak nem található.")
    db.delete(entry)
    db.commit()
    _audit(db, user.id, f"Karbantartási időszak törlése: {idosav_id}")
    return {"message": "Karbantartási időszak törölve."}


@app.get("/mesterkulcs-jogosultsagok", response_model=list[schemas.MesterkulcsJogosultsagResponse])
def get_mesterkulcs_jogosultsagok(
    db: Session = Depends(get_db),
    _user: models.FelhasznaloModel = admin_user,
):
    return db.query(models.MesterkulcsJogosultsagModel).all()


@app.put("/mesterkulcs-jogosultsagok/{felhasznalo_id}", response_model=schemas.MesterkulcsJogosultsagResponse)
def grant_master_key(
    felhasznalo_id: int,
    db: Session = Depends(get_db),
    user: models.FelhasznaloModel = admin_user,
):
    target = db.query(models.FelhasznaloModel).filter_by(id=felhasznalo_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="A felhasználó nem található.")
    grant = (
        db.query(models.MesterkulcsJogosultsagModel)
        .filter_by(felhasznaloid=felhasznalo_id)
        .first()
    )
    if not grant:
        grant = models.MesterkulcsJogosultsagModel(felhasznaloid=felhasznalo_id)
        db.add(grant)
    target.is_mesterkulcs = True
    db.commit()
    db.refresh(grant)
    _audit(db, user.id, f"Mesterkulcs-jogosultság kiadása: {felhasznalo_id}")
    return grant


@app.delete("/mesterkulcs-jogosultsagok/{felhasznalo_id}")
def revoke_master_key(
    felhasznalo_id: int,
    db: Session = Depends(get_db),
    user: models.FelhasznaloModel = admin_user,
):
    grant = (
        db.query(models.MesterkulcsJogosultsagModel)
        .filter_by(felhasznaloid=felhasznalo_id)
        .first()
    )
    if not grant:
        raise HTTPException(status_code=404, detail="A mesterkulcs-jogosultság nem található.")
    target = db.query(models.FelhasznaloModel).filter_by(id=felhasznalo_id).first()
    if target:
        target.is_mesterkulcs = False
    db.delete(grant)
    db.commit()
    _audit(db, user.id, f"Mesterkulcs-jogosultság visszavonása: {felhasznalo_id}")
    return {"message": "Mesterkulcs-jogosultság visszavonva."}


@app.get("/audit-log", response_model=list[schemas.AuditLogResponse])
def get_audit_log(
    db: Session = Depends(get_db),
    _user: models.FelhasznaloModel = Depends(require_roles("Igazgató")),
):
    return db.query(models.AuditLogModel).order_by(models.AuditLogModel.id.desc()).all()
