from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models, schemas
from datetime import date

from app.auth import get_password_hash

# --- Операции с Пользователями (Users CRUD) ---

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_name(db: Session, name: str):
    return db.query(models.User).filter(models.User.name == name).first()

def get_users(db: Session):
    return db.query(models.User).all()

def create_user(db: Session, user: schemas.UserCreate):
    user_data = user.model_dump()
    password = user_data.pop("password", None)
    hashed_password = get_password_hash(password) if password else None
    db_user = models.User(**user_data, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    update_data = user_update.model_dump(exclude_unset=True)
    if "password" in update_data:
        password = update_data.pop("password")
        if password:
            db_user.hashed_password = get_password_hash(password)
    for key, value in update_data.items():
        setattr(db_user, key, value)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_daily_stats(db: Session, user_id: int, target_date: str):
    # Получаем завершенные заказы за дату
    completed_orders = db.query(models.Order).join(models.Dish).filter(
        models.Order.user_id == user_id,
        models.Order.order_for_date == target_date,
        models.Order.status == "completed"
    ).all()
    
    totals = {
        "calories": sum(o.dish.calories for o in completed_orders),
        "proteins": sum(o.dish.proteins for o in completed_orders),
        "fats": sum(o.dish.fats for o in completed_orders),
        "carbs": sum(o.dish.carbs for o in completed_orders)
    }
    return totals

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

def delete_dish(db: Session, dish_id: int):
    db_dish = get_dish(db, dish_id)
    if not db_dish:
        return False
    # Удаляем также зависимые заказы или отвязываем
    db.query(models.Order).filter(models.Order.dish_id == dish_id).delete(synchronize_session=False)
    db.delete(db_dish)
    db.commit()
    return True

def toggle_archive_dish(db: Session, dish_id: int):
    db_dish = get_dish(db, dish_id)
    if not db_dish:
        return None
    db_dish.is_archived = not db_dish.is_archived
    db.commit()
    db.refresh(db_dish)
    return db_dish

def get_user_period_stats(db: Session, user_id: int, period: str = "day", target_date: str = None):
    if not target_date:
        target_date = date.today().isoformat()
    
    query = db.query(models.Order).join(models.Dish).filter(
        models.Order.user_id == user_id,
        models.Order.status == "completed"
    )

    if period == "month":
        year_month = target_date[:7] # YYYY-MM
        query = query.filter(models.Order.order_for_date.like(f"{year_month}-%"))
    elif period == "year":
        year = target_date[:4] # YYYY
        query = query.filter(models.Order.order_for_date.like(f"{year}-%"))
    else: # day
        query = query.filter(models.Order.order_for_date == target_date)
    
    completed_orders = query.all()
    
    totals = {
        "calories": sum(o.dish.calories for o in completed_orders),
        "proteins": sum(o.dish.proteins for o in completed_orders),
        "fats": sum(o.dish.fats for o in completed_orders),
        "carbs": sum(o.dish.carbs for o in completed_orders)
    }

    unique_dates = len(set(o.order_for_date for o in completed_orders)) or 1
    
    averages = {
        "calories": round(totals["calories"] / unique_dates, 1),
        "proteins": round(totals["proteins"] / unique_dates, 1),
        "fats": round(totals["fats"] / unique_dates, 1),
        "carbs": round(totals["carbs"] / unique_dates, 1)
    }

    return {
        "period": period,
        "date": target_date,
        "orders_count": len(completed_orders),
        "active_days_count": unique_dates if period != "day" else 1,
        "totals": totals,
        "averages": averages
    }


# --- Операции с Заказами (Orders CRUD) ---

def get_order(db: Session, order_id: int):
    return db.query(models.Order).filter(models.Order.id == order_id).first()

def get_orders(db: Session, skip: int = 0, limit: int = 100):
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

def get_grocery_list_data(db: Session, start_date: str, end_date: str):
    orders = db.query(models.Order).join(models.Dish).filter(
        models.Order.order_for_date >= start_date,
        models.Order.order_for_date <= end_date,
        models.Order.status != "cancelled"
    ).all()
    
    ingredients = []
    for o in orders:
        if o.dish.ingredients:
            items = [i.strip() for i in o.dish.ingredients.split(",") if i.strip()]
            ingredients.extend(items)
    return sorted(list(set(ingredients)))
