from sqlalchemy.orm import Session
from app import models, schemas

# --- Операции с Блюдами (Dishes CRUD) ---

def get_dish(db: Session, dish_id: int):
    return db.query(models.Dish).filter(models.Dish.id == dish_id).first()

def get_dishes(db: Session, skip: int = 0, limit: int = 100, include_archived: bool = False):
    query = db.query(models.Dish)
    if not include_archived:
        query = query.filter(models.Dish.is_archived == False)
    return query.offset(skip).limit(limit).all()

def get_dishes_by_category(db: Session, category: str, include_archived: bool = False):
    query = db.query(models.Dish).filter(models.Dish.category == category)
    if not include_archived:
        query = query.filter(models.Dish.is_archived == False)
    return query.all()

def create_dish(db: Session, dish: schemas.DishCreate):
    db_dish = models.Dish(**dish.model_dump())
    db.add(db_dish)
    db.commit()
    db.refresh(db_dish)
    return db_dish

def update_dish(db: Session, dish_id: int, dish_update: schemas.DishUpdate):
    db_dish = get_dish(db, dish_id)
    if not db_dish:
        return None
    for key, value in dish_update.model_dump(exclude_unset=True).items():
        setattr(db_dish, key, value)
    db.commit()
    db.refresh(db_dish)
    return db_dish


# --- Операции с Заказами (Orders CRUD) ---

def get_order(db: Session, order_id: int):
    return db.query(models.Order).filter(models.Order.id == order_id).first()

def get_orders(db: Session, skip: int = 0, limit: int = 100):
    # Возвращаем заказы, сортируя по дате/времени или созданию
    return db.query(models.Order).order_by(models.Order.created_at.desc()).offset(skip).limit(limit).all()

def create_order(db: Session, order: schemas.OrderCreate):
    db_order = models.Order(**order.model_dump())
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

def update_order_status(db: Session, order_id: int, status: str):
    db_order = get_order(db, order_id)
    if not db_order:
        return None
    db_order.status = status
    db.commit()
    db.refresh(db_order)
    return db_order
