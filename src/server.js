const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const index = fs.readFileSync(`${__dirname}/../client/client.html`);

const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
};

const app = http.createServer(onRequest).listen(port);

console.log(`Listening on 127.0.0.1: ${port}`);

const io = socketio(app);

const users = {};
const muted = {};
const fight = {
  name: '',
  id: '',
};

const onJoined = (sock) => {
  const socket = sock;
  socket.on('join', (data) => {
    socket.name = data.name;
    users[socket.name] = socket.name;

    const joinMsg = {
      name: 'server',
      msg: `There are ${Object.keys(users).length} users online`,
    };
    socket.emit('msg', joinMsg);

    socket.join('room1');

    const response = {
      name: 'server',
      msg: `${socket.name} has joined the room.`,
    };
    socket.broadcast.to('room1').emit('msg', response);

    console.log(`${data.name} joined`);
    socket.emit('msg', { name: 'server', msg: 'You joined the room' });
    socket.emit('msg', { name: 'server', msg: 'type /help to view commands' });
  });
};

const onMsg = (sock) => {
  const socket = sock;

  // help command
  socket.on('help', (data) => {
    if (!muted[data.name]) {
      io.sockets.in('room1').emit('msg', { name: 'server', msg: '--help--' });
      io.sockets.in('room1').emit('msg', { name: 'server', msg: '/help' });
      io.sockets.in('room1').emit('msg', { name: 'server', msg: '/mute <name>' });
      io.sockets.in('room1').emit('msg', { name: 'server', msg: '/rock' });
      io.sockets.in('room1').emit('msg', { name: 'server', msg: '/paper' });
      io.sockets.in('room1').emit('msg', { name: 'server', msg: '/scissors' });
    }
  });

  // mute command
  socket.on('mute', (data) => {
    if (!muted[socket.name]) {
      muted[data.name] = data.name;
      io.sockets.in('room1').emit('msg', { name: 'server', msg: `${data.name} was muted` });
    }
  });

  // rock-paper-scissors commands
  socket.on('fight', (data) => {
    if (!muted[socket.name]) {
      if (fight.name === '') {
        fight.name = data.name;
        fight.id = data.id;
        io.sockets.in('room1').emit('msg', { name: 'server', msg: `${data.name} has thrown rock, paper, or scissors` });
      } else {
        if ((data.id === 'rock' && fight.id === 'paper') ||
            (data.id === 'paper' && fight.id === 'scissors') ||
            (data.id === 'scissors' && fight.id === 'rock')) {
          io.sockets.in('room1').emit('msg', { name: 'server', msg: `${data.name}'s ${data.id} was beaten by ${fight.name}'s ${fight.id}.` });
        } else if (data.id === fight.id ||
                   data.id === fight.id ||
                   data.id === fight.id) {
          io.sockets.in('room1').emit('msg', { name: 'server', msg: `${data.name}'s ${data.id} tied with ${fight.name}'s ${fight.id}.` });
        } else {
          io.sockets.in('room1').emit('msg', { name: 'server', msg: `${fight.name}'s ${fight.id} was beaten by ${data.name}'s ${data.id}.` });
        }
        fight.name = '';
      }
    }
  });

  // message to server
  socket.on('msgToServer', (data) => {
    if (!muted[data.name]) {
      io.sockets.in('room1').emit('msg', { name: data.name, msg: data.msg });
    }
  });
};

const onDisconnect = (sock) => {
  const socket = sock;

  socket.on('disconnect', () => {
    const response = {
      name: 'server',
      msg: `${socket.name} has left the room.`,
    };
    socket.broadcast.to('room1').emit('msg', response);
    socket.leave('room1');

    delete users[socket.name];
  });
};

io.sockets.on('connection', (socket) => {

  onJoined(socket);
  onMsg(socket);
  onDisconnect(socket);
});

console.log('Websocket server started');
