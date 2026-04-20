🌿 OrchidLab Mobile - Hệ thống Quản lý Phòng Thí Nghiệm Hoa Lan
📖 Giới thiệu Dự án
OrchidLab Mobile là ứng dụng di động nằm trong hệ sinh thái Orchid Research & Lab Management System. Ứng dụng được thiết kế chuyên biệt để hỗ trợ các Nhà nghiên cứu (Researcher) và Kỹ thuật viên (Technician) thực hiện các nghiệp vụ ngay tại hiện trường phòng thí nghiệm và khu vực nhà kính.

Điểm đột phá của ứng dụng là việc tích hợp sức mạnh của Trí tuệ Nhân tạo (YOLOv8), giúp phân tích và nhận diện bệnh hại trên hoa lan thông qua camera điện thoại một cách nhanh chóng và chính xác ngay tại thời gian thực.

✨ Tính năng Nổi bật (Core Features)
🔐 Xác thực & Phân quyền: Đăng nhập an toàn, điều hướng thông minh dựa trên vai trò (Admin, Researcher, Technician).

📸 AI Nhận diện Bệnh hại (YOLOv8): Chụp ảnh lá/cây hoa lan trực tiếp từ app, gửi lên server để AI phân tích và trả về kết quả bệnh kèm mức độ tin cậy.

🧪 Quản lý Lô cấy mô & Cây giống: Theo dõi tình trạng phát triển, thông số và lịch sử chăm sóc của từng lô cấy mô.

📝 Nhật ký Thí nghiệm (Experiment Logs): Ghi chép dữ liệu đo đạc, upload hình ảnh quá trình thí nghiệm ngay tại phòng Lab mà không cần mở laptop.

📋 Quản lý Công việc (Task Management): Giao việc, nhận việc và cập nhật tiến độ công việc theo thời gian thực giữa Researcher và Technician.

🔔 Thông báo Push (Notifee): Nhận cảnh báo tức thời từ hệ thống (kết quả AI, task mới, nhắc nhở) với hiệu ứng Pop-up native mượt mà.

🛠️ Công nghệ Sử dụng (Tech Stack)
Dự án được xây dựng trên kiến trúc React Native CLI thuần (Bare Workflow), không phụ thuộc vào Expo, nhằm tối ưu hiệu năng và khả năng can thiệp sâu vào Native C++/Java cho các tác vụ Camera và AI.

Frontend (Mobile App):

Core: React Native (v0.85.1) & TypeScript

State Management: Zustand (Quản lý global state siêu nhẹ)

Navigation: React Navigation v7 (Native Stack & Bottom Tabs)

Network/API: Axios (Custom Instance tự động đính kèm Bearer Token)

UI & Animations: React Native Reanimated v4, Lucide React Native (Icons)

Native Modules: @notifee/react-native (Thông báo), react-native-image-picker (Camera)

Backend & Hệ sinh thái (Tích hợp):

API Server: C# ASP.NET Core & Python Flask

Database: PostgreSQL

Cloud & Storage: Digital Ocean Droplet, Cloudinary

🚀 Hướng dẫn Cài đặt & Chạy Dự án

1. Yêu cầu hệ thống (Prerequisites)
   Node.js: Phiên bản >= 22.11.0

Java Development Kit (JDK): JDK 17 (Microsoft OpenJDK hoặc Eclipse Temurin)

Môi trường Android: Android SDK hoặc giả lập LDPlayer/NoxPlayer.

2. Cài đặt mã nguồn
   Clone dự án về máy tính và cài đặt các thư viện:

Bash
git clone https://github.com/your-org/orchid-lab-mobile.git
cd orchid-lab-mobile

# Cài đặt thư viện (Sử dụng --legacy-peer-deps để tránh xung đột phiên bản)

npm install --legacy-peer-deps 3. Khởi chạy Ứng dụng (Android)
Mở 2 cửa sổ Terminal độc lập trong VS Code:

Terminal 1: Chạy máy chủ Metro (Bundler)

Bash
npx react-native start --reset-cache
Terminal 2: Biên dịch và cài đặt APK lên máy ảo

Bash

# Dọn dẹp bộ nhớ đệm Gradle (Khuyên dùng cho lần build đầu tiên)

cd android && ./gradlew clean && cd ..

# Tiến hành Build ứng dụng

npx react-native run-android
📏 Quy chuẩn Code (Coding Conventions)
Dự án tuân thủ nghiêm ngặt các quy tắc quản lý chất lượng (PMP):

Component Files: Sử dụng PascalCase (VD: LoginScreen.tsx).

Các file thông thường (Services, Utils): Sử dụng kebab-case hoặc lowerCamelCase (VD: notification.service.ts, apiClient.ts).

Tên Hàm & Biến: Sử dụng lowerCamelCase (VD: handleLogin, userData).

Format: Giới hạn 80 ký tự/dòng. Bắt buộc dùng dấu ngoặc nhọn {} cho mọi cấu trúc điều khiển luồng (if, for).
