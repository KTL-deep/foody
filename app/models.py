from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
import datetime

from app.database import Base

class Dish(Base):
    __tablename__ = "dishes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    recipe = Column(String, nullable=True)
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
    ordered_by = Column(String, nullable=False) # Имя члена семьи (Кирилл, Маша и др.)
    order_for_date = Column(String, nullable=False) # Дата (ГГГГ-ММ-ДД)
    order_for_time = Column(String, nullable=False) # Время/прием пищи (Завтрак, Обед, Ужин, или конкретное время)
    status = Column(String, default="pending")  # pending, accepted, completed, cancelled
    note = Column(String, nullable=True)        # Пожелания (например, "без сахара")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    dish = relationship("Dish", back_populates="orders")
