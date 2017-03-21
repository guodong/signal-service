const WebSocket = require('ws')
const Url = require('url');

const wss = new WebSocket.Server({ port: 8088 });

var pairs = [];

function Peer(ws) {
  this.ws = ws;
}

function Pair(id) {
  this.id = id;
  this.peer0 = null;
  this.peer1 = null;
  this.ready = false; // peers ready flag
}

Pair.prototype = {
  addPeer: function(peer) {
    var me = this;
    if (this.peer0 && this.peer1) { // peers already set
      return;
    }
    if (!this.peer0) {
      this.peer0 = peer;
      return;
    }
    this.peer1 = peer;

    /** if peer closed, clean pair **/
    peer.ws.on('close', function() {
      for (var i in pairs) {
        if (pairs[i] == me) {
          pairs.splice(i, 1);
          break;
        }
      }
    });
  },
  checkReady: function() {
    var me = this;
    if (this.ready) { // already checked
      return;
    }
    if (this.peer0 && this.peer1) {
      this.ready = true;
      this.peer0.ws.on('message', function(msg) {
        console.log(msg);
        me.peer1.ws.send(msg);
      });
      this.peer1.ws.on('message', function(msg) {
        console.log(msg);
        me.peer0.ws.send(msg);
      });

    }

    /** send ready to peers **/
    if (this.ready) {
      this.peer0.ws.send('ready');
      this.peer1.ws.send('ready');
    }
    return this.ready;
  }
};

function findPairById(id) {
  var pair = null;
  for (var i in pairs) {
    if (pairs[i].id == id) {
      pair = pairs[i];
      break;
    }
  }
  return pair;
}

wss.on('connection', function connection(ws) {
  var info = Url.parse(ws.upgradeReq.url, true);
  var id = info.pathname;
  var pair = findPairById(id);
  if (!pair) {
    pair = new Pair(id);
    pairs.push(pair);
  }
  var peer = new Peer(ws);
  pair.addPeer(peer);
  pair.checkReady();
});