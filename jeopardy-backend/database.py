# database.py - Quản lý SQLite cho Jeopardy
import sqlalchemy
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
import datetime
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'jeopardy.db')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    questions = relationship("Question", back_populates="category", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    points = Column(Integer, nullable=False)
    question = Column(String, nullable=False)
    answer = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    category = relationship("Category", back_populates="questions")

# Xóa tất cả bảng cũ và tạo mới
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

print("✅ Database đã được tạo mới hoàn toàn")

# Helper functions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_sample_data():
    """Khởi tạo dữ liệu mẫu nếu database trống"""
    db = SessionLocal()
    try:
        # Kiểm tra xem đã có dữ liệu chưa
        existing_count = db.query(Category).count()
        if existing_count > 0:
            print(f"✅ Database đã có {existing_count} lĩnh vực, bỏ qua khởi tạo")
            return
        
        print("📝 Đang khởi tạo dữ liệu mẫu...")
        
        sample_data = {
            "LỊCH SỬ": {
                100: [{"question": "Ai là vị vua đầu tiên của nhà Trần?", "answer": "Trần Thái Tông"}],
                200: [{"question": "Chiến thắng Điện Biên Phủ diễn ra năm nào?", "answer": "1954"}],
                300: [{"question": "Kinh đô đầu tiên thời Ngô Quyền đặt ở đâu?", "answer": "Cổ Loa"}],
                400: [{"question": "Vua nào dời đô từ Hoa Lư về Thăng Long?", "answer": "Lý Công Uẩn"}],
                500: [{"question": "Triều đại phong kiến cuối cùng của Việt Nam?", "answer": "Nhà Nguyễn"}]
            },
            "ĐỊA LÝ": {
                100: [{"question": "Thủ đô của Việt Nam là gì?", "answer": "Hà Nội"}],
                200: [{"question": "Tỉnh nào có diện tích lớn nhất Việt Nam?", "answer": "Nghệ An"}],
                300: [{"question": "Vịnh nào được UNESCO công nhận di sản thiên nhiên?", "answer": "Vịnh Hạ Long"}],
                400: [{"question": "Sông Mê Kông chảy qua bao nhiêu quốc gia?", "answer": "6"}],
                500: [{"question": "Quần đảo Hoàng Sa thuộc tỉnh nào?", "answer": "Đà Nẵng"}]
            },
            "KHOA HỌC": {
                100: [{"question": "Nước có công thức hóa học là gì?", "answer": "H2O"}],
                200: [{"question": "Hành tinh nào gần Mặt Trời nhất?", "answer": "Sao Thủy"}],
                300: [{"question": "Đơn vị đo cường độ dòng điện là gì?", "answer": "Ampe"}],
                400: [{"question": "Ai phát minh ra bóng đèn điện?", "answer": "Thomas Edison"}],
                500: [{"question": "Tốc độ ánh sáng trong chân không là bao nhiêu?", "answer": "300.000 km/s"}]
            },
            "VĂN HỌC": {
                100: [{"question": "Tác giả Truyện Kiều là ai?", "answer": "Nguyễn Du"}],
                200: [{"question": "Tác phẩm nào của Nam Cao nổi tiếng nhất?", "answer": "Chí Phèo"}],
                300: [{"question": "Ai viết 'Nhật ký trong tù'?", "answer": "Hồ Chí Minh"}],
                400: [{"question": "Tác giả 'Tắt đèn' là ai?", "answer": "Ngô Tất Tố"}],
                500: [{"question": "Bình Ngô đại cáo do ai sáng tác?", "answer": "Nguyễn Trãi"}]
            },
            "THỂ THAO": {
                100: [{"question": "Môn thể thao vua là môn gì?", "answer": "Bóng đá"}],
                200: [{"question": "SEA Games viết tắt của từ gì?", "answer": "Southeast Asian Games"}],
                300: [{"question": "Vận động viên điền kinh nhanh nhất thế giới?", "answer": "Usain Bolt"}],
                400: [{"question": "World Cup được tổ chức mấy năm một lần?", "answer": "4"}],
                500: [{"question": "Olympic đầu tiên được tổ chức ở đâu?", "answer": "Hy Lạp cổ đại"}]
            },
            "GIẢI TRÍ": {
                100: [{"question": "Phim hoạt hình nổi tiếng của Disney có nàng công chúa ngủ trong rừng?", "answer": "Sleeping Beauty"}],
                200: [{"question": "Ban nhạc huyền thoại The Beatles đến từ nước nào?", "answer": "Anh"}],
                300: [{"question": "Bộ phim nào đạt doanh thu cao nhất mọi thời đại?", "answer": "Avatar"}],
                400: [{"question": "Giải Oscar được tổ chức lần đầu năm nào?", "answer": "1929"}],
                500: [{"question": "Ai là người sáng lập ra Microsoft?", "answer": "Bill Gates"}]
            }
        }
        
        for cat_name, questions_dict in sample_data.items():
            category = Category(name=cat_name)
            db.add(category)
            db.flush()  # Lấy ID của category
            
            for points, q_list in questions_dict.items():
                for q_data in q_list:
                    question = Question(
                        category_id=category.id,
                        points=points,
                        question=q_data["question"],
                        answer=q_data["answer"],
                        is_active=True
                    )
                    db.add(question)
        
        db.commit()
        print(f"✅ Đã khởi tạo {len(sample_data)} lĩnh vực với đầy đủ câu hỏi")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi khởi tạo dữ liệu: {e}")
        raise e
    finally:
        db.close()

def load_questions_from_db():
    """Load câu hỏi từ database cho game"""
    db = SessionLocal()
    try:
        categories = db.query(Category).all()
        
        if not categories:
            print("⚠️ Database không có lĩnh vực nào!")
            return []
        
        result = []
        for cat in categories:
            questions = db.query(Question).filter(
                Question.category_id == cat.id,
                Question.is_active == True
            ).all()
            
            # Nhóm câu hỏi theo điểm
            question_pool = {}
            for q in questions:
                points_key = str(q.points)
                if points_key not in question_pool:
                    question_pool[points_key] = []
                question_pool[points_key].append({
                    "question": q.question,
                    "answer": q.answer,
                    "id": q.id
                })
            
            # Kiểm tra xem có đủ 5 mức điểm không
            if len(question_pool) >= 3:  # Ít nhất 3 mức điểm
                result.append({
                    "name": cat.name,
                    "id": cat.id,
                    "question_pool": question_pool
                })
        
        print(f"✅ Load được {len(result)} lĩnh vực từ database")
        return result
        
    except Exception as e:
        print(f"❌ Lỗi load câu hỏi: {e}")
        return []
    finally:
        db.close()

# Chỉ khởi tạo dữ liệu mẫu khi chạy trực tiếp
if __name__ == "__main__":
    init_sample_data()
    print("✅ Database đã sẵn sàng")