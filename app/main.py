from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import os
import shutil
import uuid
from datetime import date

from app import models, schemas, crud
from app.database import engine, get_db
from app.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    require_current_user,
)

from sqlalchemy import text

# Создание таблиц и легкая авто-миграция для SQLite
models.Base.metadata.create_all(bind=engine)

def auto_migrate():
    with engine.connect() as conn:
        try:
            result = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            columns = [row[1] for row in result]
            if "hashed_password" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN hashed_password VARCHAR"))
                conn.commit()
        except Exception as e:
            print(f"Auto-migration note: {e}")

auto_migrate()

app = FastAPI(title="Семейное Кафе 🍳")

# Инициализация начальных данных (Seed Data)
def seed_data(db: Session):
    if db.query(models.Dish).count() == 0:
        initial_dishes = [
            models.Dish(
                name="Сырники домашние",
                description="Нежные сырники из фермерского творога с ванилью. Идеально со сметаной или джемом.",
                recipe="1. Смешать творог (500г), 1 яйцо, 2 ст. ложки сахара и 3 ст. ложки муки.\n2. Сформировать круглые сырники и обвалять в муке.\n3. Обжарить на среднем огне с двух сторон до золотистой корочки.\n4. Подавать теплыми.",
                ingredients="Творог, Яйца, Сахар, Мука, Сметана",
                category="Завтрак",
                calories=220.0,
                proteins=16.0,
                fats=8.0,
                carbs=20.0,
                prep_time=20,
                image_url="https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=500&auto=format&fit=crop&q=60"
            ),
            models.Dish(
                name="Французский круассан",
                description="Классический слоеный круассан на сливочном масле. Хрустящий снаружи, мягкий внутри.",
                recipe="1. Подготовить слоеное дрожжевое тесто на качественном сливочном масле.\n2. Нарезать тесто на треугольники и свернуть в рулетики.\n3. Дать расстояться в теплом месте 1-1.5 часа.\n4. Выпекать в духовке при 180 градусах около 20 минут до румяной корочки.",
                ingredients="Мука, Сливочное масло, Дрожжи, Сахар, Молоко",
                category="Выпечка",
                calories=406.0,
                proteins=8.2,
                fats=21.5,
                carbs=45.8,
                prep_time=120,
                image_url="https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=60"
            ),
            models.Dish(
                name="Овсяная каша с лесной черникой",
                description="Полезная овсянка на кокосовом молоке с добавлением свежих лесных ягод и сиропа топинамбура.",
                recipe="1. Довести до кипения 200мл кокосового молока и 100мл воды.\n2. Всыпать 50г овсяных хлопьев монастырского помола.\n3. Варить на медленном огне 15 минут, постоянно помешивая.\n4. Выложить в тарелку, добавить горсть черники и полить сиропом.",
                ingredients="Овсяные хлопья, Кокосовое молоко, Черника, Сироп топинамбура",
                category="Завтрак",
                calories=135.0,
                proteins=3.5,
                fats=4.2,
                carbs=21.0,
                prep_time=15,
                image_url="https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=500&auto=format&fit=crop&q=60"
            ),
            models.Dish(
                name="Паста Карбонара",
                description="Традиционная итальянская паста с гуанчиале (или панчеттой), желтками и выдержанным сыром пекорино.",
                recipe="1. Отварить спагетти в подсоленной воде до состояния аль денте.\n2. Нарезать и обжарить грудинку на сухой сковороде до хруста.\n3. Смешать 2 желтка с тертым пармезаном и черным перцем.\n4. Слить воду с пасты, добавить грудинку и яично-сырный соус, быстро перемешивая, чтобы яйцо не свернулось.",
                ingredients="Спагетти, Бекон, Яйца, Сыр Пармезан, Черный перец",
                category="Обед",
                calories=380.0,
                proteins=14.5,
                fats=18.0,
                carbs=40.0,
                prep_time=25,
                image_url="https://images.unsplash.com/photo-1612874742237-6526221588e3?w=500&auto=format&fit=crop&q=60"
            ),
            models.Dish(
                name="Салат Цезарь с цыпленком",
                description="Классический салат с сочным куриным филе гриль, хрустящими листьями ромэна, гренками и фирменной заправкой.",
                recipe="1. Обжарить куриное филе на гриле со специями, нарезать тонкими ломтиками.\n2. Сделать сухарики из белого хлеба с чесночным маслом.\n3. Приготовить заправку: смешать майонез, пармезан, немного лимонного сока, чеснок и капельку горчицы.\n4. Смешать ромэн с заправкой, выложить гренки, курицу и посыпать пармезаном.",
                ingredients="Куриное филе, Листья Ромэн, Гренки, Соус Цезарь, Пармезан",
                category="Ужин",
                calories=210.0,
                proteins=18.0,
                fats=13.0,
                carbs=6.5,
                prep_time=20,
                image_url="https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=500&auto=format&fit=crop&q=60"
            )
        ]
        db.add_all(initial_dishes)
        db.commit()
    
    if db.query(models.User).count() == 0:
        default_user = models.User(
            name="Кирилл",
            target_calories=2200.0,
            target_proteins=120.0,
            target_fats=70.0,
            target_carbs=280.0
        )
        db.add(default_user)
        db.commit()

# Вызов инициализации данных при запуске
db = Session(bind=engine)
seed_data(db)
db.close()

# --- API Endpoints ---

# Аутентификация и Авторизация
@app.post("/api/auth/register", response_model=schemas.Token)
def register(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_name(db, name=user_data.name)
    if db_user:
        raise HTTPException(status_code=400, detail="Пользователь с таким именем уже существует")
    
    new_user = crud.create_user(db=db, user=schemas.UserCreate(**user_data.model_dump()))
    access_token = create_access_token(data={"sub": new_user.id})
    return {"access_token": access_token, "token_type": "bearer", "user": new_user}

@app.post("/api/auth/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.get_user_by_name(db, name=credentials.name)
    if not user:
        raise HTTPException(status_code=400, detail="Неверное имя пользователя или пароль")
    
    if user.hashed_password:
        if not verify_password(credentials.password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Неверное имя пользователя или пароль")
    else:
        # Автоматическая привязка пароля для старого аккаунта при первом входе
        user.hashed_password = get_password_hash(credentials.password)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@app.get("/api/auth/me", response_model=schemas.User)
def get_me(current_user: models.User = Depends(require_current_user)):
    return current_user

# Пользователи
@app.get("/api/users", response_model=list[schemas.User])
def read_users(db: Session = Depends(get_db)):
    return crud.get_users(db)

@app.post("/api/users", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_name(db, name=user.name)
    if db_user:
        raise HTTPException(status_code=400, detail="User already exists")
    return crud.create_user(db=db, user=user)

@app.get("/api/users/{user_id}/stats", response_model=schemas.UserStats)
def get_user_stats(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    today_str = date.today().isoformat()
    consumed = crud.get_user_daily_stats(db, user_id=user_id, target_date=today_str)
    
    targets = {
        "name": user.name,
        "target_calories": user.target_calories,
        "target_proteins": user.target_proteins,
        "target_fats": user.target_fats,
        "target_carbs": user.target_carbs
    }
    
    remaining = {
        "calories": max(0, user.target_calories - consumed["calories"]),
        "proteins": max(0, user.target_proteins - consumed["proteins"]),
        "fats": max(0, user.target_fats - consumed["fats"]),
        "carbs": max(0, user.target_carbs - consumed["carbs"])
    }
    
    return {
        "user_name": user.name,
        "targets": targets,
        "consumed": consumed,
        "remaining": remaining
    }

# Блюда
@app.get("/api/dishes", response_model=list[schemas.Dish])
def read_dishes(category: Optional[str] = None, include_archived: bool = False, db: Session = Depends(get_db)):
    if category:
        return crud.get_dishes_by_category(db, category=category, include_archived=include_archived)
    return crud.get_dishes(db, include_archived=include_archived)

@app.post("/api/dishes", response_model=schemas.Dish)
def create_dish(dish: schemas.DishCreate, db: Session = Depends(get_db)):
    return crud.create_dish(db=db, dish=dish)

# Загрузка фото
@app.post("/api/upload-photo")
async def upload_photo(file: UploadFile = File(...)):
    file_extension = file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_extension}"
    
    static_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
    upload_dir = os.path.join(static_path, "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"image_url": f"/static/uploads/{file_name}"}

# Список продуктов
@app.get("/api/grocery-list")
def get_grocery_list(start_date: str, end_date: str, db: Session = Depends(get_db)):
    items = crud.get_grocery_list_data(db, start_date=start_date, end_date=end_date)
    return {"grocery_list": items}

# Заказы
@app.get("/api/orders", response_model=list[schemas.Order])
def read_orders(db: Session = Depends(get_db)):
    return crud.get_orders(db)

@app.post("/api/orders", response_model=schemas.Order)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    dish = crud.get_dish(db, dish_id=order.dish_id)
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found")
    return crud.create_order(db=db, order=order)

@app.patch("/api/orders/{order_id}/status", response_model=schemas.Order)
def update_order_status(order_id: int, status_update: schemas.OrderUpdate, db: Session = Depends(get_db)):
    db_order = crud.update_order_status(db=db, order_id=order_id, status=status_update.status)
    if db_order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return db_order

# --- Static Files ---
static_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
app.mount("/static", StaticFiles(directory=static_path), name="static")

@app.get("/")
def read_root():
    index_file = os.path.join(static_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Welcome to Family Cafe!"}
