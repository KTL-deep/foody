from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# --- Схемы для Пользователей (Users) ---
class UserBase(BaseModel):
    name: str
    target_calories: float = 2000.0
    target_proteins: float = 100.0
    target_fats: float = 60.0
    target_carbs: float = 250.0

class UserCreate(UserBase):
    password: Optional[str] = None

class UserRegister(UserBase):
    password: str

class UserLogin(BaseModel):
    name: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "User"

class UserUpdate(BaseModel):
    name: Optional[str] = None
    target_calories: Optional[float] = None
    target_proteins: Optional[float] = None
    target_fats: Optional[float] = None
    target_carbs: Optional[float] = None
    password: Optional[str] = None

class User(UserBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class UserStats(BaseModel):
    user_name: str
    targets: UserBase
    consumed: dict
    remaining: dict

# --- Схемы для Блюд (Dishes) ---
class DishBase(BaseModel):
    name: str
    description: Optional[str] = None
    recipe: Optional[str] = None
    ingredients: Optional[str] = None # Новое: список продуктов
    category: str
    calories: float = 0.0
    proteins: float = 0.0
    fats: float = 0.0
    carbs: float = 0.0
    prep_time: int = 0
    image_url: Optional[str] = None

class DishCreate(DishBase):
    pass

class DishUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    recipe: Optional[str] = None
    ingredients: Optional[str] = None
    category: Optional[str] = None
    calories: Optional[float] = None
    proteins: Optional[float] = None
    fats: Optional[float] = None
    carbs: Optional[float] = None
    prep_time: Optional[int] = None
    image_url: Optional[str] = None
    is_archived: Optional[bool] = None

class Dish(DishBase):
    id: int
    is_archived: bool

    model_config = ConfigDict(from_attributes=True)


# --- Схемы для Заказов (Orders) ---
class OrderBase(BaseModel):
    dish_id: int
    user_id: Optional[int] = None # Новое
    ordered_by: str
    order_for_date: str
    order_for_time: str
    note: Optional[str] = None

class OrderCreate(OrderBase):
    pass

class OrderUpdate(BaseModel):
    status: str # pending, accepted, completed, cancelled

class Order(OrderBase):
    id: int
    status: str
    created_at: datetime
    dish: Dish

    model_config = ConfigDict(from_attributes=True)
