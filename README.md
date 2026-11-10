# TeremNyilvantarto

Egyetemi Kulcs- és Teremnyilvántartó Rendszer a Projektlabor tárgyhoz.

 Komponens       Technológia       
 
 Architektúra    Webes kliens-szerver: A rendszer webes kliens-szerver architektúrát használ. A felhasználói felület böngészőből érhető el, így nincs szükség külön kliensprogram telepítésére, a rendszer pedig központi adatbázissal működik.  
 
 Frontend        React     
 
 Backend         Python: Egyszerű és könnyen fejleszthető.
 
 Backend API     REST API                   
 
 Autentikáció    JWT                      
 
 Adatbázis       Microsoft SQL Server (MSSQL) 
 
 Verziókezelés   Git                          
 
 CI/CD           GitHub Actions               
 
 Konténerizáció  Docker         

 Plusz funkció: Értesítő rendszer. A tanár és a portás kap egy értesítést, nemsokból az óra vége előtt, hogy a kulcsot vissza kell vinni

 Docker futtatása a *docker compose up --build* parancsal lehetséges a program főkönyvtárából.

 Portok:
    Backend:8000
    Frontend:5173
    Database:1433


Teszt felhasználók
        Név: "Oktató"
        Email: "oktato@test.com"
        Jelszó: "Teszt123"
        Szerepkör: "Oktató"

        Név: "Portás"
        Email: "portas@test.com"
        Jelszó: "Teszt1234"
        Szerepkör: "Portás"

        "nev": "Admin"
        Email: "admin@test.com"
        Jelszó: "Teszt123"
        Szerepkör: "Admin"

        Név "Üzemeltetési Igazgató"
        Email: "igazgato@test.com"
        Jelszó: "Teszt123"
        Szerepkör: "Igazgató"