var gateway_seq = null
var gatewayHandlers = [];
var guildListC = {}
var userInfoE;
var guilds = {};
var activeGuildChannels = {};

var channelList

const INTENT = {
    GUILDS: 1 << 0
};

const OPCODE = {
    HEARTBEAT: 1,
    IDENTIFY: 2,
    RESUME: 6,
    INVALID_SESSION: 9,
    HELLO: 10
}

const CHANNEL_TYPE = {
    GUILD_TEXT: 0,
    DM: 1,
    GUILD_VOICE: 2,
    GROUP_DM: 3,
    GUILD_CATEGORY: 4,
    GUILD_NEWS: 5,
    GUILD_STORE: 6
}

const BASEURL          = 'https://discord.com/api/v8'
const UPDATEGATEWAYURL = `${BASEURL}/gateway`
const CDNURL           = 'https://cdn.discordapp.com'

class GuildButton {
    constructor(opts) {
        this.rootDiv = document.createElement("div")
        this.imgbtn = document.createElement("img")
        
        if (opts.obj.unavailable) {
            this.outageindicator = document.createElement("img")
            this.rootDiv.appendChild(this.outageindicator)
        }

        this.rootDiv.className = "guildbtn"
        this.rootDiv.appendChild(this.imgbtn)
        this.rootDiv.setAttribute('id', opts.obj.id) // Not required, but helpful in identifying guilds in the html
        opts.parent.appendChild(this.rootDiv)

        let activate = (e) => {
            setActiveGuild(opts.obj.id);
        }
        this.rootDiv.addEventListener("click", activate)
    }
}

class GuildTextChannel {
    static rootClass = "channel-item"
    static unreadIndicatorClass = "unread-indicator"
    static contentClass = "channel-item-content"
    static iconContainerClass = "channel-icon-container"
    static iconClass = "channel-icon"
    static nameClass = "channel-name"
    static channelNameClass = "channel-name-inner"

    constructor(opts) {
        this.displayed = opts.displayed || false;
        this.type      = opts.type      || CHANNEL_TYPE.GUILD_TEXT;
        this.name      = opts.name

        this.item      = document.createElement("div");

        let unreadIndicator = document.createElement("div");
        let content = document.createElement("div");
        let iconContainer = document.createElement("div");
        let icon = document.createElement("img");
        let name = document.createElement("div");
        let channelName = document.createElement("div");

        this.item.appendChild(unreadIndicator);
        this.item.appendChild(content);
        content.appendChild(iconContainer)
        content.appendChild(name)
        iconContainer.appendChild(icon)
        name.appendChild(channelName)

        this.item.className = GuildTextChannel.rootClass;
        unreadIndicator.className = GuildTextChannel.unreadIndicatorClass;
        content.className = GuildTextChannel.contentClass;
        iconContainer.className = GuildTextChannel.iconContainerClass;
        icon.className = GuildTextChannel.iconClass;
        name.className = GuildTextChannel.nameClass;
        channelName.className = GuildTextChannel.channelNameClass;

        channelName.textContent = this.name;
    }
}

function addChannelToList(obj) {
    switch (obj.type) {
        case CHANNEL_TYPE.GUILD_TEXT: {
            let c = new GuildTextChannel({
                displayed: 1,
                type: CHANNEL_TYPE.GUILD_TEXT,
                name: obj.name
            })
            activeGuildChannels[obj.id] = c;
            break;
        }

        default:
            console.warn("invalid channel: ", obj)
    }
}

function removeChannelFromList(id) {

}

function redrawChannelList() {
    let v
    for (v of Object.keys(activeGuildChannels)) {
        channelList.appendChild(activeGuildChannels[v].item)
    }

}

function clearChannelList() {
    let v
    for (v of Object.keys(activeGuildChannels)) {
        channelList.removeChild(activeGuildChannels[v].item)
    }
    activeGuildChannels = {}
}

function setActiveGuild(id) {
    let c = guilds[id];
    console.log(c);
    
    clearChannelList()

    c.channels.forEach((c) => {
        addChannelToList(c)
    })

    redrawChannelList()
}

function setActiveChannel(id) {

}

function mkavatarurl(id, av, q) {
    return `${CDNURL}/${id}/${av}${q?``:q}`
}

async function updateGatewayCache() {
    let res = await fetch(UPDATEGATEWAYURL)
    let r   = await res.json()
    localStorage.setItem('GATEWAY_URL', r.url);
    return r.url;
}

async function sendHeartbeat() {
    window.gateway.send(JSON.stringify({
        op: OPCODE.HEARTBEAT,
        d: gateway_seq
    }))
}

async function handleGateway(ev) {
    let p = JSON.parse(ev.data)
    if (p.s) {
        gateway_seq = p.s;
        localStorage.setItem('gateway_seq', p.s);
    }
    dispatchEvent(new CustomEvent('any', {detail:p}))
    if (p.op == 0) {
        dispatchEvent(new CustomEvent(p.t, {detail:p.d}))
    }
    else if (p.op == OPCODE.HELLO) {
        dispatchEvent(new CustomEvent('hello',{detail:p.d}))
    }
}

async function initGateway() {
    let wsurl = localStorage.getItem('GATEWAY_URL');
    if (!wsurl) wsurl = await updateGatewayCache();
    addEventListener('hello', (e) => {
        console.log(e)
        window.gatewayHeartbeat = setInterval(sendHeartbeat,e.detail.heartbeat_interval)
    })
    let gateway = new WebSocket(`${wsurl}?v=8`)
    gateway.onmessage = handleGateway
    window.gateway = gateway
}

async function sessionResume(tkn,sid,seq) {
    return new Promise((res,rej) => {
        let check;
        check = (e) => {
            if (e.detail.op != OPCODE.INVALID_SESSION) {
                removeEventListener('any', check)
                res(true);
            }
            else {
                removeEventListener('any', check)
                res(false)
            }
        }
        console.log(sid)
        addEventListener('any', check)
        gateway.send(JSON.stringify({
            op: OPCODE.RESUME,
            d: {
                token: tkn,
                session_id: sid,
                seq: seq
            }
        }))
        
    })
}

async function handleGuildC(e) {
    if (e.detail.icon != null) {
        guildListC[e.detail.id].imgbtn.src = `${CDNURL}/icons/${e.detail.id}/${e.detail.icon}.png`
        guildListC[e.detail.id].imgbtn.width=42
        guildListC[e.detail.id].imgbtn.height=42;
    }
    guilds[e.detail.id] = e.detail
}

async function handleReady(e) {
    localStorage.setItem('session', e.detail.session_id);

    addEventListener("GUILD_CREATE", handleGuildC)    
    e.detail.guilds.forEach((g) => {
        let d = new GuildButton({parent: document.getElementById('guildlist'),obj:g})
        guildListC[g.id] = d
        guilds[g.id] = g
    })

    let uinfo = document.getElementById('userinfo')
    let avatardiv = document.createElement("div")
    let avatarimg = document.createElement("img")
    let textdiv = document.createElement("div")
    let username = document.createElement("a")
    let secondline = document.createElement("a")
    
    uinfo.appendChild(avatardiv)
    avatardiv.appendChild(avatarimg)
    uinfo.appendChild(textdiv)
    textdiv.appendChild(username)
    textdiv.appendChild(secondline)

    avatardiv.className = 'avatarcontainer'
    
    avatarimg.className = 'avatar'
    avatarimg.src       = `${CDNURL}/avatars/${e.detail.user.id}/${e.detail.user.avatar}?size=256`
    textdiv.className   = 'nametag'
    
    username.className  = 'username'
    username.innerText  = e.detail.user.username
    username.onmouseenter=() => {secondline.innerText=`#${e.detail.user.discriminator}`}
    username.onmouseleave=() => {secondline.innerText=""}

    secondline.className= 'extratxt'
}

async function login() {
    channelList = document.getElementById("channels");
    let token = document.getElementById('token-input-box').value;
    if (token == "") {
        token = localStorage.getItem(token)
    }

    /*let session = localStorage.getItem('session')
    let seq     = localStorage.getItem('gateway_seq')
    if (session != undefined) {
        if (await sessionResume(token, session, seq)) {
            return true;
        }
    }*/

    addEventListener('READY', handleReady)
    window.gateway.send(JSON.stringify(
        {
            op: OPCODE.IDENTIFY,
            d: {
                token: token,
                intents: INTENT.GUILDS,
                properties: {

                }
            }
        }
    ))
    console.log(token)
}

async function main() {
    await initGateway();
}

main()