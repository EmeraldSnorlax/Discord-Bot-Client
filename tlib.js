
const char   = {
	ESC: '\x1B'
}

const CSI    = '\x1B\x9B'//`${char.ESC}\x9B`

function getCursorPos() {
	return new Promise((res,rej) => {
		let p = 0; // init;init2;row;col;end
		let s = {row:0,col:0}
		let datahandler = (c) => {
			let b = c.split('')
			while(true) {
				if (p==0) {
					if (b.shift()==char.ESC) {
						p = 1
					}
					else break;
				}
				else if (p==1) {
					if (b.shift()=='[') {
						p = 2
					}
					else break;
				}
				else if (p==2) {
					let a = b.shift();
					if (/[0-9]/.test(a)) {
						s.row = s.row + a;
					}
					else if (a==';') {
						p=3;
					}
					else break;
				}
				else if (p==3) {
					let a = b.shift();
					if (/[0-9]/.test(a)) {
						s.col = s.col + a;
					}
					else if (a=='R') {
						process.stdin.removeListener('data',datahandler);
						s.row = Number.parseInt(s.row)
						s.col = Number.parseInt(s.col)
						res(s)
					}
					else break;
				}
			}
		}
		process.stdin.on('data',datahandler)
		process.stdout.write(`${CSI}6n`)
	})
}

function setCursorPos(x,y) {
	process.stdout.write(`${CSI}${x};${y}H`)
}

function getSize() {
	return new Promise(async (res,rej) => {
		setCursorPos(1,1)
		let w = 1;
		let h = 1;
		let sw= 0;
		while (true) {
			process.stdout.write(sw?'b':'a')
			sw=!sw
			let pos = await getCursorPos();
			if (pos.col < w) {
				break;
			}
			else w = pos.col
		}
		while (true) {
			process.stdout.write(sw?'b\n':'a\n')
			sw=!sw
			let pos = await getCursorPos();
			if (pos.row == h) {
				break;
			}
			else h = pos.row
		}
		res({width:w, height:h})
	})
}

function saveCursorPos() {
	process.stdout.write(`${CSI}s`)
}

function restoreCursorPos() {
	process.stdout.write(`${CSI}u`)
}

module.exports = {
	getCursorPos: getCursorPos,
	setCursorPos: setCursorPos,
	saveCursorPos:saveCursorPos,
	restoreCursorPos: restoreCursorPos,
	getSize: getSize,
	CSI: '\x1b[',
}