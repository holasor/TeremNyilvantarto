from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from passlib.context import CryptContext
from .database import get_db, engine
from . import models
from . import schemas

app = FastAPI(title="Terem- és Kulcsnyilvántartó Rendszer")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # vagy ["*"] a teljes engedélyezéshez fejlesztés alatt
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "TeremNyilvantarto API működik"}

@app.get("/test-db")
def test_db_connection(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT 1")).fetchone()
        return {"status": "Sikeres adatbázis kapcsolat!", "result": result[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Adatbázis hiba: {str(e)}")

@app.post("/api/register", response_model=schemas.FelhasznaloResponse)
def register_user(user: schemas.FelhasznaloCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.FelhasznaloModel).filter(models.FelhasznaloModel.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ez az email cím már regisztrálva van."
        )
    
    hashed_pwd = hash_password(user.password)

    db_felhasznalo = models.FelhasznaloModel(
        nev=user.nev,
        email=user.email,
        hashed_password=hashed_pwd,
        szerepkor=user.szerepkor,
        is_mesterkulcs=user.is_mesterkulcs
    )
    db.add(db_felhasznalo)
    db.commit()
    db.refresh(db_felhasznalo)
    return db_felhasznalo

@app.post("/api/login")
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.FelhasznaloModel).filter(models.FelhasznaloModel.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Helytelen email cím vagy jelszó."
        )
    
    return {
        "message": "Sikeres bejelentkezés",
        "user": {
            "id": db_user.id,
            "nev": db_user.nev,
            "email": db_user.email,
            "szerepkor": db_user.szerepkor,
            "is_mesterkulcs": db_user.is_mesterkulcs
        }
    }

@app.get("/termek", response_model=list[schemas.TeremResponse])
def get_termek(db: Session = Depends(get_db)):
    termek = db.query(models.TeremModel).all()
    return termek

@app.post("/termek", response_model=schemas.TeremResponse)
def create_terem(terem: schemas.TeremCreate, db: Session = Depends(get_db)):
    letezo_terem = db.query(models.TeremModel).filter(models.TeremModel.id == terem.id).first()
    if letezo_terem:
        raise HTTPException(status_code=400, detail="Ilyen ID-jú terem már létezik.")
    
    db_terem = models.TeremModel(
        id=terem.id,
        teremszam=terem.teremszam,
        ferohely=terem.ferohely,
        epulet=terem.epulet
    )
    db.add(db_terem)
    db.commit()
    db.refresh(db_terem)
    return db_terem

@app.delete("/termek/{terem_id}")
def delete_terem(terem_id: str, db: Session = Depends(get_db)):
    terem = db.query(models.TeremModel).filter(models.TeremModel.id == terem_id).first()
    if not terem:
        raise HTTPException(status_code=404, detail="A terem nem található.")
    db.delete(terem)
    db.commit()
    return {"message": "Terem sikeresen törölve."}

@app.get("/felhasznalok", response_model=list[schemas.FelhasznaloResponse])
def get_felhasznalok(db: Session = Depends(get_db)):
    felhasznalok = db.query(models.FelhasznaloModel).all()
    return felhasznalok

@app.delete("/felhasznalok/{felhasznalo_id}")
def delete_felhasznalo(felhasznalo_id: int, db: Session = Depends(get_db)):
    felhasznalo = db.query(models.FelhasznaloModel).filter(models.FelhasznaloModel.id == felhasznalo_id).first()
    if not felhasznalo:
        raise HTTPException(status_code=404, detail="A felhasználó nem található.")
    db.delete(felhasznalo)
    db.commit()
    return {"message": "Felhasználó sikeresen törölve."}

@app.get("/kulcsok", response_model=list[schemas.KulcsResponse])
def get_kulcsok(db: Session = Depends(get_db)):
    kulcsok = db.query(models.KulcsModel).all()
    return kulcsok

@app.post("/kulcsok", response_model=schemas.KulcsResponse)
def create_kulcs(kulcs: schemas.KulcsCreate, db: Session = Depends(get_db)):
    letezo_terem = db.query(models.TeremModel).filter(models.TeremModel.id == kulcs.teremid).first()
    if not letezo_terem:
        raise HTTPException(status_code=404, detail="A megadott terem nem létezik.")
    
    db_kulcs = models.KulcsModel(
        teremid=kulcs.teremid,
        statusz=kulcs.statusz
    )
    db.add(db_kulcs)
    db.commit()
    db.refresh(db_kulcs)
    return db_kulcs

@app.delete("/kulcsok/{kulcs_id}")
def delete_kulcs(kulcs_id: int, db: Session = Depends(get_db)):
    kulcs = db.query(models.KulcsModel).filter(models.KulcsModel.id == kulcs_id).first()
    if not kulcs:
        raise HTTPException(status_code=404, detail="A kulcs nem található.")
    db.delete(kulcs)
    db.commit()
    return {"message": "Kulcs sikeresen törölve."}

@app.get("/kulcsmozgasok", response_model=list[schemas.KulcsMozgasResponse])
def get_kulcsmozgasok(db: Session = Depends(get_db)):
    mozgasok = db.query(models.KulcsMozgasModel).all()
    return mozgasok

@app.post("/kulcsmozgasok", response_model=schemas.KulcsMozgasResponse)
def create_kulcsmozgas(mozgas: schemas.KulcsMozgasCreate, db: Session = Depends(get_db)):
    letezo_kulcs = db.query(models.KulcsModel).filter(models.KulcsModel.id == mozgas.kulcsid).first()
    if not letezo_kulcs:
        raise HTTPException(status_code=404, detail="A megadott kulcs nem található.")
    
    letezo_felhasznalo = db.query(models.FelhasznaloModel).filter(models.FelhasznaloModel.id == mozgas.felhasznaloid).first()
    if not letezo_felhasznalo:
        raise HTTPException(status_code=404, detail="A megadott felhasználó nem található.")
    
    db_mozgas = models.KulcsMozgasModel(
        kulcsid=mozgas.kulcsid,
        felhasznaloid=mozgas.felhasznaloid,
        kiadasideje=mozgas.kiadasideje,
        visszavetelideje=mozgas.visszavetelideje
    )
    db.add(db_mozgas)
    db.commit()
    db.refresh(db_mozgas)
    return db_mozgas

@app.get("/foglalasok", response_model=list[schemas.FoglalasResponse])
def get_foglalasok(db: Session = Depends(get_db)):
    foglalasok = db.query(models.FoglalasModel).all()
    return foglalasok

@app.post("/foglalasok", response_model=schemas.FoglalasResponse)
def create_foglalas(foglalas: schemas.FoglalasCreate, db: Session = Depends(get_db)):
    letezo_felhasznalo = db.query(models.FelhasznaloModel).filter(models.FelhasznaloModel.id == foglalas.felhasznaloid).first()
    if not letezo_felhasznalo:
        raise HTTPException(status_code=404, detail="A megadott felhasználó nem található.")
    
    letezo_terem = db.query(models.TeremModel).filter(models.TeremModel.id == foglalas.teremid).first()
    if not letezo_terem:
        raise HTTPException(status_code=404, detail="A megadott terem nem található.")
    
    db_foglalas = models.FoglalasModel(
        felhasznaloid=foglalas.felhasznaloid,
        teremid=foglalas.teremid,
        kezdet=foglalas.kezdet,
        veg=foglalas.veg
    )
    db.add(db_foglalas)
    db.commit()
    db.refresh(db_foglalas)
    return db_foglalas

@app.delete("/foglalasok/{foglalas_id}")
def delete_foglalas(foglalas_id: int, db: Session = Depends(get_db)):
    foglalas = db.query(models.FoglalasModel).filter(models.FoglalasModel.id == foglalas_id).first()
    if not foglalas:
        raise HTTPException(status_code=404, detail="A foglalás nem található.")
    db.delete(foglalas)
    db.commit()
    return {"message": "Foglalás sikeresen törölve."}

@app.get("/hibajegyek", response_model=list[schemas.HibajegyResponse])
def get_hibajegyek(db: Session = Depends(get_db)):
    hibajegyek = db.query(models.HibajegyModel).all()
    return hibajegyek

@app.post("/hibajegyek", response_model=schemas.HibajegyResponse)
def create_hibajegy(hibajegy: schemas.HibajegyCreate, db: Session = Depends(get_db)):
    letezo_terem = db.query(models.TeremModel).filter(models.TeremModel.id == hibajegy.teremid).first()
    if not letezo_terem:
        raise HTTPException(status_code=404, detail="A megadott terem nem található.")
    
    letezo_felhasznalo = db.query(models.FelhasznaloModel).filter(models.FelhasznaloModel.id == hibajegy.felhasznaloid).first()
    if not letezo_felhasznalo:
        raise HTTPException(status_code=404, detail="A megadott felhasználó nem található.")
    
    db_hibajegy = models.HibajegyModel(
        teremid=hibajegy.teremid,
        felhasznaloid=hibajegy.felhasznaloid,
        leiras=hibajegy.leiras,
        statusz=hibajegy.statusz
    )
    db.add(db_hibajegy)
    db.commit()
    db.refresh(db_hibajegy)
    return db_hibajegy

@app.delete("/hibajegyek/{hibajegy_id}")
def delete_hibajegy(hibajegy_id: int, db: Session = Depends(get_db)):
    hibajegy = db.query(models.HibajegyModel).filter(models.HibajegyModel.id == hibajegy_id).first()
    if not hibajegy:
        raise HTTPException(status_code=404, detail="A hibajegy nem található.")
    db.delete(hibajegy)
    db.commit()
    return {"message": "Hibajegy sikeresen törölve."}