from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
import datetime

from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    # Цели по КБЖУ для члена семьи
    target_calories = Column(Float, default=2000.0)
    target_proteins = Column(Float, default=100.0)
    target_fats = Column(Float, default=60.0)
    target_carbs = Column(Float, default=250.0)

    orders = relationship("Order", back_populates="user")


class Dish(Base):
    __tablename__ = "dishes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    recipe = Column(Text, nullable=True)
    ingredients = Column(Text, nullable=True) # Список ингредиентов через запятую
    category = Column(String, nullable=False) # e.g., 'Завтрак', 'Обед', 'Ужин', 'Десерт', 'Выпечка'
    calories = Column(Float, default=0.0)      # на 100г или на порцию
    proteins = Column(Float, default=0.0)
    fats = Column(Float, default=0.0)
    carbs = Column(Float, default=0.0)
    prep_time = Column(Integer, default=0)    # в минутах
    image_url = Column(String, nullable=True)
    is_archived = Column(Boolean, default=False)

    orders = relationship("Order", back_populates="dish")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    dish_id = Column(Integer, ForeignKey("dishes.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Ссылка на пользователя
    ordered_by = Column(String, nullable=False) # Имя для совместимости
    order_for_date = Column(String, nullable=False) # Дата (ГГГГ-ММ-ДД)
    order_for_time = Column(String, nullable=False) # Время/прием пищи
    status = Column(String, default="pending")  # pending, accepted, completed, cancelled
    note = Column(String, nullable=True)        # Пожелания
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    dish = relationship("Dish", back_populates="orders")
    user = relationship("User", back_populates="orders")
