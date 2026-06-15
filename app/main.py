from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os

from app import models, schemas, crud
from app.database import engine, get_db

# Создание таблиц при запуске
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Семейное Кафе 🍳")

# Инициализация начальных данных (Seed Data)
def seed_data(db: Session):
    if db.query(models.Dish).count() == 0:
        initial_dishes = [
            models.Dish(
                name="Сырники домашние",
                description="Нежные сырники из фермерского творога с ванилью. Идеально со сметаной или джемом.",
                recipe="1. Смешать творог (500г), 1 яйцо, 2 ст. ложки сахара и 3 ст. ложки муки.\n2. Сформировать круглые сырники и обвалять в муке.\n3. Обжарить на среднем огне с двух сторон до золотистой корочки.\n4. Подавать теплыми.",
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

# Вызов инициализации данных при запуске
db = Session(bind=engine)
seed_data(db)
db.close()

# --- API Endpoints ---

# Блюда
@app.get("/api/dishes", response_model=list[schemas.Dish])
def read_dishes(category: Optional[str] = None, include_archived: bool = False, db: Session = Depends(get_db)):
    if category:
        return crud.get_dishes_by_category(db, category=category, include_archived=include_archived)
    return crud.get_dishes(db, include_archived=include_archived)

@app.post("/api/dishes", response_model=schemas.Dish)
def create_dish(dish: schemas.DishCreate, db: Session = Depends(get_db)):
    return crud.create_dish(db=db, dish=dish)

@app.patch("/api/dishes/{dish_id}", response_model=schemas.Dish)
def update_dish(dish_id: int, dish_update: schemas.DishUpdate, db: Session = Depends(get_db)):
    db_dish = crud.update_dish(db=db, dish_id=dish_id, dish_update=dish_update)
    if db_dish is None:
        raise HTTPException(status_code=404, detail="Dish not found")
    return db_dish

# Заказы
@app.get("/api/orders", response_model=list[schemas.Order])
def read_orders(db: Session = Depends(get_db)):
    return crud.get_orders(db)

@app.post("/api/orders", response_model=schemas.Order)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    # Проверка существования блюда
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

# --- Static Files and Frontend Delivery ---
# Подключение статических файлов (css, js, images)
static_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if not os.path.exists(static_path):
    os.makedirs(static_path)
    os.makedirs(os.path.join(static_path, "css"))
    os.makedirs(os.path.join(static_path, "js"))
    os.makedirs(os.path.join(static_path, "images"))

app.mount("/static", StaticFiles(directory=static_path), name="static")

@app.get("/")
def read_root():
    index_file = os.path.join(static_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Welcome to Family Cafe! Please create index.html in the static directory."}
