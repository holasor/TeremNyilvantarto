from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr

# --- FELHASZNÁLÓ ---
class FelhasznaloBase(BaseModel):
    nev: str
    email: EmailStr
    szerepkor: str
    is_mesterkulcs: bool = False

class FelhasznaloCreate(FelhasznaloBase):
    pass

class FelhasznaloResponse(FelhasznaloBase):
    id: int

    class Config:
        from_attributes = True


# --- TEREM ---
class TeremBase(BaseModel):
    id: str
    teremszam: str
    ferohely: int
    epulet: str

class TeremCreate(TeremBase):
    pass

class TeremResponse(TeremBase):
    class Config:
        from_attributes = True


# --- KULCS ---
class KulcsBase(BaseModel):
    teremid: str
    statusz: str

class KulcsCreate(KulcsBase):
    pass

class KulcsResponse(KulcsBase):
    id: int

    class Config:
        from_attributes = True


# --- FOGLALÁS ---
class FoglalasBase(BaseModel):
    felhasznaloid: int
    teremid: str
    kezdet: datetime
    veg: datetime

class FoglalasCreate(FoglalasBase):
    pass

class FoglalasResponse(FoglalasBase):
    id: int

    class Config:
        from_attributes = True


# --- KULCSMOZGÁS ---
class KulcsMozgasBase(BaseModel):
    kulcsid: int
    felhasznaloid: int
    visszavetelideje: Optional[datetime] = None

class KulcsMozgasCreate(KulcsMozgasBase):
    kiadasideje: datetime

class KulcsMozgasResponse(KulcsMozgasBase):
    id: int
    kiadasideje: datetime

    class Config:
        from_attributes = True


# --- HIBAJEGY ---
class HibajegyBase(BaseModel):
    felhasznaloid: int
    teremid: str
    leiras: str
    statusz: str

class HibajegyCreate(HibajegyBase):
    pass

class HibajegyResponse(HibajegyBase):
    id: int

    class Config:
        from_attributes = True


# --- AUDIT LOG ---
class AuditLogBase(BaseModel):
    felhasznaloid: int
    muvelet: str

class AuditLogCreate(AuditLogBase):
    idobelyeg: datetime

class AuditLogResponse(AuditLogBase):
    id: int
    idobelyeg: datetime

    class Config:
        from_attributes = True


# --- KARBANTARTÁSI IDŐSÁV ---
class KarbantartasiIdosavBase(BaseModel):
    teremid: str
    kezdet: datetime
    veg: datetime
    leiras: str

class KarbantartasiIdosavCreate(KarbantartasiIdosavBase):
    pass

class KarbantartasiIdosavResponse(KarbantartasiIdosavBase):
    id: int

    class Config:
        from_attributes = True


# --- MESTERKULCS JOGOSULTSÁG ---
class MesterkulcsJogosultsagBase(BaseModel):
    felhasznaloid: int

class MesterkulcsJogosultsagCreate(MesterkulcsJogosultsagBase):
    pass

class MesterkulcsJogosultsagResponse(MesterkulcsJogosultsagBase):
    id: int

    class Config:
        from_attributes = True