process.stdin.setRawMode(true);
process.stdin.resume()
process.stdin.setEncoding('utf8')

const fs = require('fs');
const tlib=require('./tlib')
const SETTINGSPATH = "./config.json"; //TODO: This should go somewhere in ~ when finished, A way to configure this would also be pretty neat, but I'm not sure how that would work
const limit = 2000; // shitcords character limit.

let termsize;

function fill(x1,y1,x2,y2,i) {
	let c = i.char || ' ';
	tlib.setCursorPos(x1,y1);
	for (let i=x1; i<=x2; i++) {
		for (let ii=y1; ii<=y2; ii++) {
			process.stdout.write(c)
		}
		tlib.setCursorPos(i,y1)
	}
}

// User input component. Needed to prevent user input from being mixed with app output (which will be in its own component above the input)
class UInput {
	sh;
	sw;
	x;
	y;
	inputbuffer;
	len;
	pos;
	constructor(opts) {
		this.sw = opts.width  || 20;
		this.sh = opts.height ||  1;
		this.x  = opts.x      ||  1;
		this.y  = opts.y      ||  1;

		this.buf = opts.buf || Buffer.alloc(limit);
		
		this.len = 0;
		this.pos = 0;
	}

	resize(opts) {
		this.sw = opts.width || this.sw
		this.sh = opts.height|| this.sh
	}

	move(opts) {
		this.x=opts.x || this.x
		this.y=opts.y || this.y
	}

	putchar(c) {
		this.buf.copy(this.buf,this.pos+1,this.pos)
		this.buf.write(c,this.pos)
		this.len++
		this.pos++
	}

	handleBackspace() {
		this.buf.write('\x00',this.pos-1)
		this.buf.copy(this.buf,this.pos-1,this.pos)
		this.pos--
		this.len--
	}

	handleUp() {
		if ((this.pos-this.sw)<=0) return
		this.pos += this.sw
	}

	handleDown() {
		if ((this.pos+this.sw)>=this.len) return
		this.pos += this.sw;
	}

	handleRight() {
		if (this.pos>=this.len) return
		this.pos++
	}

	handleLeft() {
		if (this.pos<=0) return
		this.pos--
	}

	draw() {
		fill(this.x,this.y,this.x+this.sh-1,this.y+this.sw-1, {
			char: "#"
		})
		process.stdout.write(this.buf.toString(
			'utf8',
			0,
			this.len))
	}
}

function login() {
  
}

function getConfig() {
  if (fs.existsSync(SETTINGSPATH)) {
		return JSON.parse(fs.readFileSync(SETTINGSPATH));
	}
	else return {}
}

async function main() {
	//console.log("Discord CLI v0.0.1");
  let config = getConfig(); // get user config
  let running= 1;

	if (!config['termsize']) {
		termsize = await tlib.getSize();
	}
	else {
		termsize = config.termsize;
	}
	
	let uinput = new UInput({
		height: 1,
		width:  termsize.width,
		x:      termsize.height,
		y:      1
	})
	uinput.draw();

	process.stdin.on('data', (c) => {
		//console.log([c,tlib.CSI]) 
		//console.log(c==`${tlib.CSI}A`)
		if (c.charCodeAt(0)==127) {
			uinput.handleBackspace()
		}
		else if (c == `${tlib.CSI}A`) {
			uinput.handleUp()
		}
		else if (c == `${tlib.CSI}B`) {
			uinput.handleDown()
		}
		else if (c == `${tlib.CSI}C`) {
			uinput.handleRight()
		}
		else if (c == `${tlib.CSI}D`) {
			uinput.handleLeft()
		}
		else {
			uinput.putchar(c)
		}
		uinput.draw()
	})
}

main()