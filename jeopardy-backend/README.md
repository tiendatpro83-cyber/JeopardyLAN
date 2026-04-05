Jeopardy LAN Gameshow - Local Judge Version

Hệ thống trò chơi Jeopardy tương tác thời gian thực dành cho mạng nội bộ (LAN). Hệ thống tập trung vào độ trễ thấp và sự ổn định tuyệt đối trong môi trường offline.

🚀 Tính năng nổi bật

Real-time Synchronization: Sử dụng Socket.io để đồng bộ hóa trạng thái bấm chuông và câu hỏi giữa Host và các Player.

High Performance: Phản hồi ngay lập tức (< 1ms) nhờ xử lý nội bộ.

Smart Local Judge: Thuật toán chấm điểm tự động dựa trên:

So khớp từ khóa (Keyword Matching).

Chuẩn hóa Tiếng Việt (Xóa dấu tự động) giúp người chơi dễ dàng trả lời trên nhiều thiết bị.

Zero Dependency: Không cần API Key, không phụ thuộc internet.

🛠 Công nghệ

Backend: Python, FastAPI, Socket.io, Uvicorn.

Frontend: React (Đang triển khai).

Data: JSON Schema.

💻 Cài đặt và Chạy

Clone repository:

git clone [https://github.com/your-username/jeopardy-lan-local.git](https://github.com/your-username/jeopardy-lan-local.git)


Cài đặt thư viện:

pip install fastapi uvicorn python-socketio


Khởi chạy Server:

python main.py


Thực hiện: Lê Tiến Đạt (SAMI - HUST)
