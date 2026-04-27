# cms_routes.py - API quản lý câu hỏi
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from database import SessionLocal, Category, Question
from sqlalchemy.orm import Session

router = APIRouter(prefix="/cms", tags=["CMS"])

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models
class QuestionCreate(BaseModel):
    category_id: int
    points: int
    question: str
    answer: str

class QuestionUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    points: Optional[int] = None
    is_active: Optional[bool] = None

class CategoryCreate(BaseModel):
    name: str

class CategoryResponse(BaseModel):
    id: int
    name: str
    question_count: int

class QuestionResponse(BaseModel):
    id: int
    category_id: int
    points: int
    question: str
    answer: str
    is_active: bool

# Routes
@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    result = []
    for cat in categories:
        q_count = db.query(Question).filter(Question.category_id == cat.id).count()
        result.append(CategoryResponse(
            id=cat.id,
            name=cat.name,
            question_count=q_count
        ))
    return result

@router.post("/categories")
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    existing = db.query(Category).filter(Category.name == category.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    new_category = Category(name=category.name)
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return {"id": new_category.id, "name": new_category.name, "message": "Created successfully"}

@router.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(category)
    db.commit()
    return {"message": f"Category '{category.name}' deleted"}

@router.get("/questions", response_model=List[QuestionResponse])
def get_questions(
    category_id: Optional[int] = None,
    points: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Question)
    if category_id:
        query = query.filter(Question.category_id == category_id)
    if points:
        query = query.filter(Question.points == points)
    
    return query.all()

@router.post("/questions")
def create_question(question: QuestionCreate, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == question.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    new_question = Question(
        category_id=question.category_id,
        points=question.points,
        question=question.question,
        answer=question.answer
    )
    db.add(new_question)
    db.commit()
    db.refresh(new_question)
    return {"id": new_question.id, "message": "Question created successfully"}

@router.put("/questions/{question_id}")
def update_question(question_id: int, question_update: QuestionUpdate, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    if question_update.question is not None:
        question.question = question_update.question
    if question_update.answer is not None:
        question.answer = question_update.answer
    if question_update.points is not None:
        question.points = question_update.points
    if question_update.is_active is not None:
        question.is_active = question_update.is_active
    
    db.commit()
    return {"message": "Question updated successfully"}

@router.delete("/questions/{question_id}")
def delete_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    db.delete(question)
    db.commit()
    return {"message": "Question deleted successfully"}

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_categories = db.query(Category).count()
    total_questions = db.query(Question).count()
    active_questions = db.query(Question).filter(Question.is_active == True).count()
    
    points_distribution = {}
    for points in [100, 200, 300, 400, 500]:
        count = db.query(Question).filter(Question.points == points, Question.is_active == True).count()
        points_distribution[points] = count
    
    return {
        "total_categories": total_categories,
        "total_questions": total_questions,
        "active_questions": active_questions,
        "points_distribution": points_distribution
    }