/*
 * Node js CHAT
 * Author: Mihiran Rupasinghe
 */

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('mysql');
var qs = require('querystring');
var key = 'h6Fhg9873J84gJkj03hKj';

var pool = mysql.createPool({
    connectionLimit: 100, //important
    host: '148.72.232.144',
    user: 'victoriya',
    password: 'va)SQ5]Jyp!n',
    database: 'chatmango',
    debug: false
});

//5 minutes
var interval = setInterval(function() {
    delete_inactive_random_users();
}, 1000 * 60 * 5);

io.on('connection', function(socket) {
    socket.id = socket.handshake.query.uq;
    insert_random_user(socket.id, socket.handshake.query.name, 1);
    console.log('a user connected: ' + socket.id +"\n");

    socket.on('disconnect', function() {
        delete_random_user(socket.id);
        console.log('user disconnected: ' + socket.id+"\n");
    });

    socket.on('in message', function(data) {
        data.from = socket.id;
        insert_chat(data);
        io.emit('out message', data);
    });
    
    socket.on('typing message', function(data) {
        socket.broadcast.emit('show typing', data);
    });
    
    socket.on('save avatar', function(data) {
        save_avatar(data);
    });
    
    socket.on('save name', function(data) {
        save_name(data);
    });

});

http.listen(80, function() {
    console.log('listening on :80\n');
});

function insert_random_user(uq, name, avatar) {
    pool.getConnection(function(err, connection) {
        if (err) {
            return;
        }
        var record = {unique_id: uq, display_name: name};
        connection.query('INSERT INTO cm_users SET ?', record, function(err2, row) {
            connection.release();
            if (!err2) {
                console.log('Last record insert id:', row.insertId+"\n");
            }
            else {
				//console.log(err2.code);
                pool.getConnection(function(err, connection) {
                    if (err) {
                        return;
                    }
                    connection.query('UPDATE cm_users SET is_active = 1 WHERE unique_id = ?', [uq], function(err2, row) {
                        connection.release();
                        if (!err2) {
                            console.log('User Reconnected:', row.affectedRows+"\n");
                        }
                        else {
                            console.log('Error reconnect:', err2.code+"\n");
                        }
                    });
                });
            }
        });
    });
}

function delete_random_user(uq) {
    pool.getConnection(function(err, connection) {
        if (err) {
            return;
        }
        connection.query('UPDATE cm_users SET is_active = 0 WHERE unique_id = ?', [uq], function(err2, row) {
            connection.release();
            if (!err2) {
                console.log('User(s) Inactivated:', row.affectedRows+"\n");
            }
            else {
                console.log('Error deleting:', err2.code+"\n");
            }
        });
    });
}

function save_avatar(data) {
    pool.getConnection(function(err, connection) {
        if (err) {
            return;
        }
        connection.query('UPDATE cm_users SET profile_image = ? WHERE unique_id = ?', [data.avatar,data.user], function(err2, row) {
            connection.release();
            if (!err2) {
                console.log('User Avatar Changed:', data.user+"\n");
            }
            else {
                console.log('Error changing:', err2.code+"\n");
            }
        });
    });
}

function save_name(data) {
    pool.getConnection(function(err, connection) {
        if (err) {
            return;
        }
        connection.query('UPDATE cm_users SET display_name = ? WHERE unique_id = ?', [data.name,data.user], function(err2, row) {
            connection.release();
            if (!err2) {
                console.log('User Name Changed:', data.user+"\n");
            }
            else {
                console.log('Error changing:', err2.code+"\n");
            }
        });
    });
}

function delete_inactive_random_users() {
    pool.getConnection(function(err, connection) {
        if (err) {
            return;
        }
        connection.query('DELETE FROM cm_users WHERE temp_user = 1 AND is_active = 0', function(err2, row) {
            connection.release();
            if (!err2) {
                console.log('Inactive Delete:', row.affectedRows+"\n");
            }
            else {
                console.log('Error deleting:', err2.code+"\n");
            }
        });
    });
}

function insert_chat(data) {
    pool.getConnection(function(err, connection) {
        if (err) {
            return;
        }
        var record = {from_id: data.from, chat_message: data.msg, from_name: data.name, from_avatar:data.avatar};
        connection.query('INSERT INTO cm_chats SET ?', record, function(err2, row) {
            connection.release();
            if (!err2) {
                console.log('Last record insert id:', row.insertId+"\n");
            }
            else {
                console.log('Error inserting chat:', err2.code+"\n");
            }
        });
    });
}
