from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from .database import Base

class FelhasznaloModel(Base):
    __tablename__ = "FELHASZNALO"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nev = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    szerepkor = Column(String(50), nullable=False)
    is_mesterkulcs = Column(Boolean, nullable=False, default=False)

class TeremModel(Base):
    __tablename__ = "TEREM"

    id = Column(String(50), primary_key=True, index=True)
    teremszam = Column(String(50), nullable=False)
    ferohely = Column(Integer, nullable=False)
    epulet = Column(String(100), nullable=False)

class KulcsModel(Base):
    __tablename__ = "KULCS"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    teremid = Column(String(50), ForeignKey("TEREM.id"), nullable=False)
    statusz = Column(String(50), nullable=False)

class FoglalasModel(Base):
    __tablename__ = "FOGLALAS"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    felhasznaloid = Column(Integer, ForeignKey("FELHASZNALO.id"), nullable=False)
    teremid = Column(String(50), ForeignKey("TEREM.id"), nullable=False)
    kezdet = Column(DateTime, nullable=False)
    veg = Column(DateTime, nullable=False)

class KulcsMozgasModel(Base):
    __tablename__ = "KULCSMOZGAS"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    kulcsid = Column(Integer, ForeignKey("KULCS.id"), nullable=False)
    felhasznaloid = Column(Integer, ForeignKey("FELHASZNALO.id"), nullable=False)
    kiadasideje = Column(DateTime, nullable=False)
    visszavetelideje = Column(DateTime, nullable=True)

class HibajegyModel(Base):
    __tablename__ = "HIBAJEGY"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    felhasznaloid = Column(Integer, ForeignKey("FELHASZNALO.id"), nullable=False)
    teremid = Column(String(50), ForeignKey("TEREM.id"), nullable=False)
    leiras = Column(Text, nullable=False)
    statusz = Column(String(50), nullable=False)

class AuditLogModel(Base):
    __tablename__ = "AUDIT_LOG"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    felhasznaloid = Column(Integer, ForeignKey("FELHASZNALO.id"), nullable=False)
    idobelyeg = Column(DateTime, nullable=False)
    muvelet = Column(String(255), nullable=False)

class KarbantartasiIdosavModel(Base):
    __tablename__ = "KARBANTARTASI_IDOSAV"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    teremid = Column(String(50), ForeignKey("TEREM.id"), nullable=False)
    kezdet = Column(DateTime, nullable=False)
    veg = Column(DateTime, nullable=False)
    leiras = Column(Text, nullable=False)

class MesterkulcsJogosultsagModel(Base):
    __tablename__ = "MESTERKULCS_JOGOSULTSAG"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    felhasznaloid = Column(Integer, ForeignKey("FELHASZNALO.id"), nullable=False)