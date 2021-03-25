const EventEmitter = require('events');

class GatewayPayload {
	opcode;
	data;
	sequence;
	name;
	constructor() {

	}

	prepare() {
		let p = {};
		p.op = this.opcode;
		p.d  = this.data;
		if (this.sequence) 
		p.s  = this.sequence;
		if (this.name)
		p.t  = this.name;
		return p 
	}
}

class Gateway extends EventEmitter {
	static gatewayURL = "";

	socket;

	constructor() {

	}

	async connect() {
		
	}
}

class Client {
	constructor(opts) {
		this.gateway = new Gateway();
	}

	async login(opts) {
		this.gateway.connect()
	}
}

module.exports = {Client:Client}