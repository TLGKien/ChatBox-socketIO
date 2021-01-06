var express = require("express");
var app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "./views"); 
var server = require("http").Server(app);
var io = require("socket.io")(server);
server.listen(3000,'127.0.0.1');

var arrUsersOnline = []; // để chứa các userName online (all)
var arrRoomsOnline = []; // để chứa các [tên phòng + danh sach trong phong]

// khi có người kết nối
io.on("connection", function(socket) { 
    
    // khi co nguoi ngat ket noi
    socket.on("disconnect", function() {    
        
        // xoa nguoi dung trong mang arrUserOnline
        for (var i = 0; i < arrUsersOnline.length; i++) {
            if (arrUsersOnline[i] == socket.Username)
                arrUsersOnline.splice(i, 1);
        }

        // Xoa nguoi dung trong Room
        for (var i = 0; i < arrRoomsOnline.length; i++) {
            for (var j = 0; j < arrRoomsOnline[i].length; j++)
                if(arrRoomsOnline[i][j] == socket.Username)
                    arrRoomsOnline[i].splice(j,1);
        }

        // xoa phong neu trong phong khong co ai
        for (var i = 0; i < arrRoomsOnline.length; i++) {
            if(arrRoomsOnline[i].length == 1)
                arrRoomsOnline.splice(i,1);
        }

		// thong bao cac thanh vien trong Room: nguoi dung ten {socket.userName} da offline
        for (var i = 0; i < arrRoomsOnline.length; i++) {
            if(arrRoomsOnline[i][0] == socket.Roomname)
                io.sockets.in(socket.Roomname).emit("user_offline",arrRoomsOnline[i] ,socket.Username);
        }
        // gửi tất cả danh sách phòng đang online (cập nhật danh sách phòng nếu có phòng bị xoá)
        io.sockets.emit("server_send_signed_success1", arrRoomsOnline);

    });
  
    // khach hang gui userName dang ki (userName = data)
    socket.on("client_send_username", function(data) { 

        // neu userName da ton tai, thong bao ve client: dang ki that bai
        if (arrUsersOnline.indexOf(data) >= 0)
            socket.emit("server_send_signed_failure", data); 

        // neu chua ton tai thi them vao danh sach nhung nguoi online, set userName cho socket = data
        // thông báo user đăng kí thành công + gửi về danh sách phòng đang online
        else{ 
            arrUsersOnline.push(data);
            socket.Username = data;
            io.sockets.emit("server_send_signed_success1", arrRoomsOnline);
            socket.emit("server_send_signed_success_simple");
        }
    });

    // khi khach hang dang ki tham gia hoac tao phong (room Name = data)
    socket.on("client_send_roomname", function(data) { 
        socket.join(data);
        // kiem tra phong da ton tai chua
        var check = false;
        for (var i = 0; i < arrRoomsOnline.length; i++) {
            if (arrRoomsOnline[i][0] == data) 
                check = true;
        }
        // neu phong chua ton tai thi them phong vao arrRoomOnline
        if(check == false)
        {
            var room = [];
            room.push(data);
            arrRoomsOnline.push(room);
        }
        // Thêm người dùng vào arrRoomOnline
        // Thông báo cho những người trong phòng Danh sách những người đang online trong phòng
        socket.Roomname = data;
        for (var i = 0; i < arrRoomsOnline.length; i++) {
            if(arrRoomsOnline[i][0] == data)
            {
                arrRoomsOnline[i].push(socket.Username);
                io.sockets.in(socket.Roomname).emit("server_send_user_online",arrRoomsOnline[i]);
            }
        }

        // cập nhật lại danh sách phòng (nếu có phòng mới được tạo ra thì sẽ cập nhật)
        io.sockets.emit("server_send_signed_success1", arrRoomsOnline);
        //gửi về user thông tin về tên phòng và tên đăng kí
        socket.emit("server_send_signed_success_simple1", {Room : socket.Roomname, Name : socket.Username});
    });

    // khách hàng gửi tin nhắn, thông báo tin nhắn đó về cho tất cả các thành viên trong phòng
    socket.on ("client_send_message", function (data) {
        io.sockets.in(socket.Roomname).emit("server_send_message", {Username:socket.Username, msg:data});
    });

    socket.on ("client_send_icon1", function () {
        io.sockets.in(socket.Roomname).emit("server_send_icon1", socket.Username);
    });

    socket.on ("client_send_icon2", function () {
        io.sockets.in(socket.Roomname).emit("server_send_icon2", socket.Username);
    });
});

// khi truy cập local host, server trả về cho khách hàng trang "homePage.ejs"
app.get ("/", function (req, res) {
    res.render ("homePage");
});