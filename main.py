from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from contextlib import asynccontextmanager
from database import Base, engine
from routers import items, users


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # create tables automatically
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

app = FastAPI(lifespan=lifespan)

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(items.router, prefix="/api/items", tags=["Items"])


@app.get("/", include_in_schema=False)
@app.get("/vault", include_in_schema=False)
def vault_page(request: Request):
    return templates.TemplateResponse("items/vault.html", {"request": request, "title": "My Vault"})


@app.get("/register", include_in_schema=False)
def register_page(request: Request):
    return templates.TemplateResponse("users/register.html", {"request": request, "title": "Register"})


@app.get("/login", include_in_schema=False)
def login_page(request: Request):
    return templates.TemplateResponse("users/login.html", {"request": request, "title": "Login"})


@app.get("/2fa_verification", include_in_schema=False)
def two_factor_verification_page(request: Request):
    return templates.TemplateResponse("users/2fa_verification.html", {"request": request, "title": "2FA Verification"})


@app.get("/checkup", include_in_schema=False)
def checkup_page(request: Request):
    return templates.TemplateResponse("items/checkup.html", {"request": request, "title": "Checkup"})


@app.get("/import", include_in_schema=False)
def import_data_page(request: Request):
    return templates.TemplateResponse("items/import_data.html", {"request": request, "title": "Import Data"})


@app.get("/account", include_in_schema=False)
def account_page(request: Request):
    return templates.TemplateResponse("users/account.html", {"request": request, "title": "Account"})
