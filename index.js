const fs = require('fs');
const EventEmitter = require('events');
const WebSocket = require('ws');

const INTENT = {
	GUILDS: 1 << 0,
	GUILD_MEMBERS: 1 << 1,
	GUILD_BANS: 1 << 2,
	GUILD_EMOJIS: 1 << 3,
	GUILD_INTEGRATIONS: 1 << 4,
	GUILD_WEBHOOKS: 1<<5,
	GUILD_INVITES: 1 << 6,
	GUILD_VOICE_STATES: 1 << 7,
	GUILD_PRESENCES: 1 << 8,
	GUILD_MESSAGES: 1 << 9,
	GUILD_MESSAGE_REACTIONS: 1 << 10,
	GUILD_MESSAGE_TYPING: 1 << 11,
	DIRECT_MESSAGES: 1 << 12,
	DIRECT_MESSAGE_REACTIONS: 1 << 13,
	DIRECT_MESSAGE_TYPING: 1 << 14
};

const OPCODE = {
	EVENT: 0,
	HEARTBEAT: 1,
	IDENTIFY: 2,
	RESUME: 6,
	HELLO: 10
};

const EVENT = {
	READY: 'READY'
}

class GatewayConnection extends EventEmitter {
	static GatewayURL = "wss://gateway.discord.gg/"

	constructor() {
		super()
		this.sequence = null;
		this.hheartbeat = undefined;
	}

	connect(opts) {
		this.socket = new WebSocket(GatewayConnection.GatewayURL);
		this.token = opts.token;

		this.socket.on('message', (data) => {
			data = JSON.parse(data);
			this.sequence = data.s || this.sequence; // update sequence for heartbeat.
			if (data.op == OPCODE.EVENT) {
				this.emit(data.t, data)
			}
			else if (data.op == OPCODE.HELLO) {// helo from gateway 
				this.hheartbeat = setInterval(this.heartbeat.bind(this), data.d.heartbeat_interval);
				if (!opts.session) {
					this.identify({
						token: this.token,
						intents: 0 | INTENT.GUILD_MESSAGES | INTENT.GUILD_MESSAGE_REACTIONS | INTENT.GUILD_MESSAGE_TYPING | INTENT.DIRECT_MESSAGES | INTENT.DIRECT_MESSAGE_REACTIONS | INTENT.DIRECT_MESSAGE_TYPING | INTENT.GUILD_EMOJIS | INTENT.GUILD_BANS,
					})
				}
				else {
					this.resume({
						token: this.token,
						seq: opts.sequence,
						sid: opts.session
					})
				}
			}
			console.debug(data);
		});
		
		this.socket.on('error', (err) => {
			console.debug(err);
		});

		this.socket.on('close', (code, reason) => {
			console.debug(`CLOSE: ${reason} (${code})`)
			this.emit('close');
		});
	}

	heartbeat() {
		this.socket.send(JSON.stringify({
			op:OPCODE.HEARTBEAT, // HEARTBEAT
			d: this.sequence
		}))
	}

	identify(opts) {
		this.socket.send(JSON.stringify({
			op:OPCODE.IDENTIFY, // IDENTIFY
			d: {
				token: opts.token,
				intents: opts.intents,
				properties: opts.properties || {

				}
			}
		}))
	}

	resume(opts) {
		this.socket.send(JSON.stringify({
			op:OPCODE.RESUME,
			d: {
				token: opts.token,
				session_id: opts.sid,
				seq: opts.seq
			}
		}))
	}
	// Gateway event classes.
}

class User {
	username; discriminator;
	
	static parseJSON(obj) {
		let u = new User();
		u.username = obj.username;
		u.discriminator = obj.discriminator;
		return u
	}

	get tag() {
		return `${this.username}#${this.discriminator}`
	}
}

class Message {
	static parseJSON(obj) {
		let m = new Message();
		m.IsDM = (obj.guild_id == undefined)
		m.content = obj.content;
		m.author = User.parseJSON(obj.author);
		m.channel = obj.channel_id;
		return m;
	}
}

class Client extends EventEmitter {
	constructor() {
		super();
	}

	GWConnect(opts) {
		return new Promise((res,rej) => {
			function loginCallback(data) {
				console.debug(data)
				res(data.d.session_id);
			}

			this.gateway = new GatewayConnection()
			this.gateway.on('close', ()=>{console.log("connection closed")});
			this.gateway.once('READY', loginCallback);
			this.gateway.on('MESSAGE_CREATE', (m) => {
				this.emit('message',Message.parseJSON(m.d));
			})
			this.gateway.connect(opts);
		});
	}

	async login(opts) {
		if (opts.token) {
			this.token = opts.token;
			console.log (opts)
			if (opts.session) {
				this.session = await this.GWConnect({token: this.token, sequence: opts.sequence, session:opts.session})
			}
			else this.session = await this.GWConnect({token:this.token});
			return this.session;
		}
	}
}

async function main() {
	// Config file
	let config;
	if (fs.existsSync("./config.json")) {
		config = JSON.parse(fs.readFileSync('./config.json'))
	}
	else {
		config = {}
	}
	console.debug(config)

	let client = new Client();
	// Login
	if (fs.existsSync('./session')&&false) {
		let sd = JSON.parse(fs.readFileSync('./session'));
		console.log(sd)
		sid = await client.login({token:config.token, session: sd.sid, sequence: sd.seq})
		console.log(sid)
		fs.writeFileSync('./session', JSON.stringify({sid: sid, seq:0}));
	}
	if (config.token && !client.session) {
		sid = await client.login({token:config.token});
		fs.writeFileSync('./session', JSON.stringify({sid: sid, seq: 0}));
	}

	setInterval(() => {
		fs.writeFileSync('./session', JSON.stringify({sid: sid, seq: client.gateway.sequence}))
	}, 1000);

	client.on('message', (m) => {
		console.log(`${m.IsDM ? '[#DM] ':`[#${m.channel}]`}<${m.author.tag}> ${m.content}`);
	})
}
console.debug = () => {}
console.log(process.stdout.setEn)
main();